import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getDrive, getDriveFolderId } from "@/lib/google";
import { getDemoUpload } from "@/lib/demo-uploads";
import { isDemoMode } from "@/lib/demo";

export const runtime = "nodejs";
// Video is streamed through this route, so the function stays open for as long
// as the viewer is watching.
export const maxDuration = 60;

// Drive file ids are content-addressed: the bytes behind an id never change, so
// the browser may keep them forever. "private" keeps family media out of shared
// caches while still ending the re-download on every navigation.
const IMMUTABLE_MEDIA_CACHE = "private, max-age=31536000, immutable";

// Drive builds thumbnails asynchronously, so a photo uploaded moments ago has
// none yet and we serve the original instead. Caching that for a year at the
// thumbnail URL would permanently defeat the optimization for the newest
// photos, which are exactly the ones people look at most.
const PENDING_THUMBNAIL_CACHE = "private, max-age=300";

const MAX_FOLDER_DEPTH = 6;

// The googleapis types still describe response headers as a plain object, but
// gaxios 7 hands back a Headers instance at runtime. Reading one as the other
// silently yields undefined — which is how a 206 without Content-Range shipped
// and broke video playback. Handle both shapes rather than trusting either.
function readHeader(headers: unknown, name: string): string | null {
  if (!headers || typeof headers !== "object") return null;

  const getter = (headers as Headers).get;
  if (typeof getter === "function") {
    return (headers as Headers).get(name);
  }

  const value = (headers as Record<string, string | string[] | undefined>)[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === "string" ? value : null;
}

declare global {
  var captureMomentAlbumFolders: Set<string> | undefined;
}

function albumFolderCache(): Set<string> {
  if (!globalThis.captureMomentAlbumFolders) {
    globalThis.captureMomentAlbumFolders = new Set([getDriveFolderId()]);
  }
  return globalThis.captureMomentAlbumFolders;
}

// The drive.file scope already limits us to files this app created, but that
// still spans every upload ever made, so a stray id should not resolve.
//
// Media sitting directly in the album folder is confirmed without any API call.
// Anything deeper is walked upwards, which succeeds only for subfolders the app
// itself created: drive.file cannot read a folder someone made by hand in the
// Drive UI, so hand-built subfolders will not resolve. Visited folders are
// remembered, so a successful walk costs nothing the next time.
async function isInsideAlbumFolder(
  parents: string[] | null | undefined
): Promise<boolean> {
  const known = albumFolderCache();
  const drive = getDrive();
  let frontier = parents ?? [];
  const visited: string[] = [];

  for (let depth = 0; depth < MAX_FOLDER_DEPTH && frontier.length; depth++) {
    if (frontier.some((parent) => known.has(parent))) {
      visited.forEach((folder) => known.add(folder));
      return true;
    }
    visited.push(...frontier);

    const next: string[] = [];
    for (const parent of frontier) {
      const folder = await drive.files
        .get({ fileId: parent, fields: "parents" })
        .catch(() => null);
      next.push(...(folder?.data.parents ?? []));
    }
    frontier = next;
  }

  return false;
}

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

    if (meta.data.trashed || !(await isInsideAlbumFolder(meta.data.parents))) {
      return NextResponse.json(
        { error: "Foto tidak ditemukan" },
        { status: 404 }
      );
    }

    const mimeType = meta.data.mimeType ?? "image/jpeg";
    const width = requestedThumbnailWidth(request);

    const wantsThumbnail = Boolean(width) && mimeType.startsWith("image/");
    if (wantsThumbnail && width && meta.data.thumbnailLink) {
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

    const contentRange = readHeader(media.headers, "content-range");
    const contentLength = readHeader(media.headers, "content-length");
    const isPartial = media.status === 206 && contentRange !== null;
    const body = Readable.toWeb(
      media.data as unknown as Readable
    ) as ReadableStream<Uint8Array>;

    return new NextResponse(body, {
      status: isPartial ? 206 : 200,
      headers: {
        "Content-Type": mimeType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        "Accept-Ranges": "bytes",
        ...(isPartial && contentRange ? { "Content-Range": contentRange } : {}),
        "Cache-Control": wantsThumbnail
          ? PENDING_THUMBNAIL_CACHE
          : IMMUTABLE_MEDIA_CACHE,
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

  // Drive has shipped the size hint in two shapes over the years: a trailing
  // "=s220" on googleusercontent links, and an "&sz=s220" query on the older
  // docs.google.com form. If neither is present we still serve what Drive gave
  // us, but only cache it briefly, since it is not the size that was asked for.
  const sized = thumbnailLink
    .replace(/=s\d+(-c)?$/, `=s${width}`)
    .replace(/([?&]sz=)s?\d+/, `$1s${width}`);
  const resized = sized !== thumbnailLink;

  const response = await fetch(sized, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok || !response.body) return null;

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": resized
        ? IMMUTABLE_MEDIA_CACHE
        : PENDING_THUMBNAIL_CACHE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
