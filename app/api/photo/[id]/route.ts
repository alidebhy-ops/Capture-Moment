import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getDrive, getDriveFolderId } from "@/lib/google";
import { getDemoUpload } from "@/lib/demo-uploads";
import { isDemoMode } from "@/lib/demo";

export const runtime = "nodejs";

// Drive file ids are content-addressed: the bytes behind an id never change, so
// the browser may keep them forever. "private" keeps family media out of shared
// caches while still ending the re-download on every navigation.
const IMMUTABLE_MEDIA_CACHE = "private, max-age=31536000, immutable";

const THUMBNAIL_WIDTHS = [200, 400, 800] as const;

function requestedThumbnailWidth(request: NextRequest): number | null {
  const raw = request.nextUrl.searchParams.get("w");
  if (!raw) return null;
  const width = Number(raw);
  return THUMBNAIL_WIDTHS.includes(width as (typeof THUMBNAIL_WIDTHS)[number])
    ? width
    : null;
}

function demoResponse(
  demoUpload: NonNullable<ReturnType<typeof getDemoUpload>>,
  request: NextRequest
): NextResponse {
  const total = demoUpload.buffer.byteLength;
  const range = request.headers.get("range");
  const match = range?.match(/^bytes=(\d+)-(\d*)$/);
  const start = match ? Number(match[1]) : 0;
  const requestedEnd = match?.[2] ? Number(match[2]) : total - 1;
  const end = Math.min(requestedEnd, total - 1);

  if (start >= total || end < start) {
    return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    });
  }

  const part = demoUpload.buffer.subarray(start, end + 1);
  const bytes = new Uint8Array(part.byteLength);
  bytes.set(part);

  return new NextResponse(bytes.buffer, {
    status: match ? 206 : 200,
    headers: {
      "Content-Type": demoUpload.mimeType,
      "Content-Length": String(part.byteLength),
      "Accept-Ranges": "bytes",
      ...(match ? { "Content-Range": `bytes ${start}-${end}/${total}` } : {}),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const demoUpload = getDemoUpload(id);
  if (demoUpload) return demoResponse(demoUpload, request);

  // Without this, a demo deployment that still holds Google credentials would
  // hand real family media to visitors who signed in without a password.
  if (isDemoMode()) {
    return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 404 });
  }

  try {
    const drive = getDrive();
    const meta = await drive.files.get({
      fileId: id,
      fields: "mimeType,size,parents,thumbnailLink,trashed",
    });

    // The app's OAuth scope is drive.file, so it can only reach files this app
    // created — but that still spans every upload ever made. Requiring the file
    // to live in the configured folder keeps an arbitrary id from being probed.
    const parents = meta.data.parents ?? [];
    if (meta.data.trashed || !parents.includes(getDriveFolderId())) {
      return NextResponse.json(
        { error: "Foto tidak ditemukan" },
        { status: 404 }
      );
    }

    const mimeType = meta.data.mimeType ?? "image/jpeg";
    const width = requestedThumbnailWidth(request);

    if (width && meta.data.thumbnailLink && mimeType.startsWith("image/")) {
      const thumbnail = await fetchThumbnail(meta.data.thumbnailLink, width);
      if (thumbnail) return thumbnail;
      // Fall through to the original when the thumbnail is unavailable.
    }

    const range = request.headers.get("range");
    const media = await drive.files.get(
      { fileId: id, alt: "media" },
      {
        responseType: "stream",
        headers: range ? { Range: range } : undefined,
      }
    );

    const contentRange = media.headers["content-range"];
    const contentLength = media.headers["content-length"];
    const body = Readable.toWeb(
      media.data as unknown as Readable
    ) as ReadableStream<Uint8Array>;

    return new NextResponse(body, {
      status: media.status === 206 || contentRange ? 206 : 200,
      headers: {
        "Content-Type": mimeType,
        ...(contentLength ? { "Content-Length": String(contentLength) } : {}),
        "Accept-Ranges": "bytes",
        ...(contentRange ? { "Content-Range": String(contentRange) } : {}),
        "Cache-Control": IMMUTABLE_MEDIA_CACHE,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 404 });
  }
}

async function fetchThumbnail(
  thumbnailLink: string,
  width: number
): Promise<NextResponse | null> {
  const token = await getAccessToken();
  if (!token) return null;

  // Drive returns a link ending in a size hint such as "=s220"; swapping it
  // asks googleusercontent for the width we actually render at.
  const sized = thumbnailLink.replace(/=s\d+(-c)?$/, `=s${width}`);
  const response = await fetch(sized, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok || !response.body) return null;

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": IMMUTABLE_MEDIA_CACHE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
