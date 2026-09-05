import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { describeGoogleError } from "@/lib/google-errors";
import { getDrive, getDriveFolderId } from "@/lib/google";
import { isDemoMode } from "@/lib/demo";
import { saveDemoUpload } from "@/lib/demo-uploads";
import {
  INGEST_COLLECTION,
  isIngestConfigured,
  isValidIngestToken,
  parseCaptureDate,
  parseCoordinate,
} from "@/lib/ingest";
import { isSupportedMedia, isVideoMime, signatureMatches } from "@/lib/media-validation";
import { addMoment, listMoments, updateMoment } from "@/lib/moments";
import { runSerialized } from "@/lib/serialize";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/upload-limits";
import type { MediaItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Foto dari hari yang sama digabung ke satu momen. Kalau momennya sudah lama
// dibuat, kiriman baru memulai momen baru daripada menempel ke cerita yang
// mungkin sudah diberi judul dan selesai.
const GROUPING_WINDOW_MS = 12 * 60 * 60 * 1000;

async function storeMedia(
  buffer: Buffer,
  mimeType: string,
  name: string
): Promise<MediaItem | null> {
  const type = isVideoMime(mimeType) ? "video" : "image";

  if (isDemoMode()) {
    return { id: saveDemoUpload({ buffer, mimeType, name }), type };
  }

  const created = await getDrive().files.create({
    requestBody: {
      name: `${Date.now()}-${name}`,
      parents: [getDriveFolderId()],
    },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id",
  });

  return created.data.id ? { id: created.data.id, type } : null;
}

async function attachToDay(
  captureDate: string,
  media: MediaItem,
  lat: number | null,
  lng: number | null,
  caption: string
): Promise<{ momentId: string; created: boolean }> {
  const moments = await listMoments();
  const cutoff = Date.now() - GROUPING_WINDOW_MS;

  const existing = moments.find(
    (moment) =>
      moment.date === captureDate &&
      moment.collection === INGEST_COLLECTION &&
      new Date(moment.createdAt).getTime() >= cutoff
  );

  if (existing) {
    await updateMoment(existing.id, {
      media: [...existing.media, media],
      // Koordinat pertama yang tersedia dipakai untuk seluruh hari itu.
      ...(existing.lat === null && lat !== null ? { lat, lng } : {}),
    });
    return { momentId: existing.id, created: false };
  }

  const moment = await addMoment({
    title: caption || `Foto ${captureDate}`,
    story: "",
    date: captureDate,
    lat,
    lng,
    locationName: "",
    media: [media],
    coverPhotoId: media.id,
    collection: INGEST_COLLECTION,
    tags: [],
    mood: "",
    favorite: false,
    authorId: "",
    peopleIds: [],
  });

  return { momentId: moment.id, created: true };
}

export async function POST(request: NextRequest) {
  if (!isIngestConfigured()) {
    return NextResponse.json(
      { error: "INGEST_TOKEN belum diisi di environment." },
      { status: 503 }
    );
  }
  if (!isValidIngestToken(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Token tidak berlaku" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form tidak valid" }, { status: 400 });
  }

  const entry = form.get("file");
  if (!(entry instanceof File)) {
    return NextResponse.json({ error: "Berkas tidak ada" }, { status: 400 });
  }

  const mimeType = entry.type.toLowerCase();
  if (!isSupportedMedia(mimeType)) {
    return NextResponse.json(
      { error: `Format ${mimeType || "tidak dikenal"} tidak didukung.` },
      { status: 400 }
    );
  }
  if (entry.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `Berkas melebihi ${MAX_UPLOAD_MB} MB. Tambahkan langkah Resize Image di Shortcut sebelum mengirim.`,
      },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await entry.arrayBuffer());
  if (!signatureMatches(buffer, mimeType)) {
    return NextResponse.json(
      { error: "Isi berkas tidak sesuai formatnya." },
      { status: 400 }
    );
  }

  const captureDate = parseCaptureDate(
    String(form.get("takenAt") ?? ""),
    new Date()
  );
  const lat = parseCoordinate(String(form.get("lat") ?? ""), -90, 90);
  const lng = parseCoordinate(String(form.get("lng") ?? ""), -180, 180);
  const caption = String(form.get("caption") ?? "").trim().slice(0, 160);

  try {
    const media = await storeMedia(
      buffer,
      mimeType,
      entry.name || `iphone-${captureDate}`
    );
    if (!media) {
      return NextResponse.json(
        { error: "Media gagal disimpan ke Drive." },
        { status: 502 }
      );
    }

    // Shortcut mengirim foto satu per satu. Tanpa antrean, dua kiriman untuk
    // tanggal yang sama bisa sama-sama membuat momen baru, atau saling menimpa
    // saat menambahkan media.
    const result = await runSerialized(`ingest:${captureDate}`, () =>
      attachToDay(
        captureDate,
        media,
        lat && lng ? lat : null,
        lat && lng ? lng : null,
        caption
      )
    );

    return NextResponse.json({
      ok: true,
      momentId: result.momentId,
      created: result.created,
      date: captureDate,
      located: lat !== null && lng !== null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: describeGoogleError(error) },
      { status: 502 }
    );
  }
}
