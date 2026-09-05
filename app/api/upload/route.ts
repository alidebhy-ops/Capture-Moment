import { describeGoogleError } from "@/lib/google-errors";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getDrive, getDriveFolderId } from "@/lib/google";
import { isDemoMode } from "@/lib/demo";
import { saveDemoUpload } from "@/lib/demo-uploads";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/upload-limits";
import {
  isSupportedMedia,
  isVideoMime,
  signatureMatches,
} from "@/lib/media-validation";

export const runtime = "nodejs";



export async function POST(request: NextRequest) {
  // Vercel rejects request bodies over 4.5 MB at the edge, before the function
  // even runs, so anything above that can never reach this handler. Keeping our
  // own limit just under it means the user gets a real explanation instead of
  // an opaque platform error.
  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Form tidak valid" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  const mimeType = file.type.toLowerCase();
  const isVideo = isVideoMime(mimeType);
  if (!isSupportedMedia(mimeType)) {
    return NextResponse.json(
      { error: "Format media tidak didukung. Gunakan JPG, PNG, WebP, GIF, HEIC, MP4, MOV, atau WebM." },
      { status: 400 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `Ukuran media maksimal ${MAX_UPLOAD_MB} MB karena melewati server aplikasi. Untuk video yang lebih besar, unggah langsung ke folder Google Drive album.`,
      },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!signatureMatches(buffer, mimeType)) {
      return NextResponse.json(
        { error: "Isi file tidak sesuai dengan format medianya." },
        { status: 400 }
      );
    }
    if (isDemoMode()) {
      const id = saveDemoUpload({
        buffer,
        mimeType,
        name: file.name || "media",
      });
      return NextResponse.json({ id, type: isVideo ? "video" : "image" });
    }

    const drive = getDrive();
    const res = await drive.files.create({
      requestBody: {
        name: `${Date.now()}-${file.name || "media"}`,
        parents: [getDriveFolderId()],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: "id",
    });
    return NextResponse.json({
      id: res.data.id,
      type: isVideo ? "video" : "image",
    });
  } catch (e) {
    return NextResponse.json(
      { error: describeGoogleError(e) },
      { status: 500 }
    );
  }
}
