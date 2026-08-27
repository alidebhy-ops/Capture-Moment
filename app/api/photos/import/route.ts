import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { describeGoogleError } from "@/lib/google-errors";
import { getDrive, getDriveFolderId } from "@/lib/google";
import { isDemoMode } from "@/lib/demo";
import {
  deletePickerSession,
  downloadPickedItem,
  listPickedItems,
  type PickedItem,
} from "@/lib/photos-picker";
import type { MediaItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Menyalin beberapa foto dari Google Photos ke Drive dalam satu permintaan.
export const maxDuration = 60;

// baseUrl dari Picker kedaluwarsa sekitar 60 menit, jadi seluruh penyalinan
// harus selesai selagi sesinya masih hidup. Batas ini menjaga satu permintaan
// tetap di bawah anggaran waktu fungsi.
const MAX_ITEMS_PER_IMPORT = 20;

export type ImportedMedia = MediaItem & { capturedAt: string };

async function copyToDrive(item: PickedItem): Promise<ImportedMedia | null> {
  const buffer = await downloadPickedItem(item);
  if (!buffer) return null;

  const created = await getDrive().files.create({
    requestBody: {
      name: `${Date.now()}-${item.filename}`,
      parents: [getDriveFolderId()],
    },
    media: { mimeType: item.mimeType, body: Readable.from(buffer) },
    fields: "id",
  });

  if (!created.data.id) return null;
  return {
    id: created.data.id,
    type: item.mimeType.startsWith("video/") ? "video" : "image",
    capturedAt: item.createTime,
  };
}

export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: "Impor dari Google Photos tidak tersedia di mode demo." },
      { status: 400 }
    );
  }

  let sessionId = "";
  try {
    const body = (await request.json()) as { sessionId?: unknown };
    sessionId = String(body.sessionId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "ID sesi tidak ada" }, { status: 400 });
  }

  try {
    const picked = await listPickedItems(sessionId);
    if (picked.length === 0) {
      return NextResponse.json(
        { error: "Belum ada foto yang dipilih." },
        { status: 400 }
      );
    }

    const selected = picked.slice(0, MAX_ITEMS_PER_IMPORT);
    const media: ImportedMedia[] = [];
    for (const item of selected) {
      const copied = await copyToDrive(item);
      if (copied) media.push(copied);
    }

    // Sesi tidak dipakai lagi setelah byte-nya tersalin.
    await deletePickerSession(sessionId);

    return NextResponse.json({
      media,
      imported: media.length,
      // Dilaporkan apa adanya, supaya tidak terlihat seolah semuanya masuk.
      skipped: selected.length - media.length,
      remaining: picked.length - selected.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: describeGoogleError(error) },
      { status: 502 }
    );
  }
}
