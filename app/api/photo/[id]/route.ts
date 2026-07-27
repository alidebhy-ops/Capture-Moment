import { NextRequest, NextResponse } from "next/server";
import { getDrive } from "@/lib/google";
import { getDemoUpload } from "@/lib/demo-uploads";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const demoUpload = getDemoUpload(id);
  if (demoUpload) {
    const range = request.headers.get("range");
    const match = range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = match ? Number(match[1]) : 0;
    const requestedEnd = match?.[2] ? Number(match[2]) : demoUpload.buffer.byteLength - 1;
    const end = Math.min(requestedEnd, demoUpload.buffer.byteLength - 1);
    if (start >= demoUpload.buffer.byteLength || end < start) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${demoUpload.buffer.byteLength}` },
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
        ...(match ? { "Content-Range": `bytes ${start}-${end}/${demoUpload.buffer.byteLength}` } : {}),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  try {
    const drive = getDrive();
    const range = request.headers.get("range");
    const [meta, media] = await Promise.all([
      drive.files.get({ fileId: id, fields: "mimeType,size" }),
      drive.files.get(
        { fileId: id, alt: "media" },
        { responseType: "arraybuffer", headers: range ? { Range: range } : undefined }
      ),
    ]);
    const source = Buffer.from(media.data as ArrayBuffer);
    const bytes = new Uint8Array(source.byteLength);
    bytes.set(source);
    const contentRange = media.headers["content-range"];
    return new NextResponse(bytes.buffer, {
      status: media.status === 206 || contentRange ? 206 : 200,
      headers: {
        "Content-Type": meta.data.mimeType ?? "image/jpeg",
        "Content-Length": String(source.byteLength),
        "Accept-Ranges": "bytes",
        ...(contentRange ? { "Content-Range": String(contentRange) } : {}),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Foto tidak ditemukan" },
      { status: 404 }
    );
  }
}
