import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { describeGoogleError } from "@/lib/google-errors";
import { getDrive, getDriveFolderId } from "@/lib/google";
import { isDemoMode } from "@/lib/demo";
import { saveDemoUpload } from "@/lib/demo-uploads";
import {
  addMoment,
  listMoments,
  updateMoment,
  type Moment,
} from "@/lib/moments";
import {
  downloadFile,
  isAllowedChat,
  isTelegramConfigured,
  isValidWebhookSecret,
  recallMediaGroup,
  rememberMediaGroup,
  sendMessage,
  withMediaGroupLock,
  type TelegramMessage,
  type TelegramUpdate,
} from "@/lib/telegram";
import type { MediaItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Downloading up to 20MB from Telegram and pushing it to Drive can outlast the
// default budget. A platform timeout would make Telegram retry the update and
// save the same moment twice, which the always-200 reply below cannot prevent.
export const maxDuration = 60;

// A location arrives as its own message right after the photo. Anything older
// than this is treated as a new thought rather than a late attachment.
const LOCATION_ATTACH_WINDOW_MS = 20 * 60 * 1000;

const HELP_TEXT = [
  "<b>CaptureMoment</b>",
  "",
  "Kirim foto atau video dengan caption, dan momen langsung tersimpan di album keluarga.",
  "",
  "• Baris pertama caption menjadi judul, sisanya menjadi cerita.",
  "• Kirim beberapa foto sekaligus untuk menggabungkannya jadi satu momen.",
  "• Kirim lokasi setelah foto untuk menandai tempatnya di peta.",
].join("\n");

function todayISO(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10);
}

function parseCaption(caption: string): { title: string; story: string } {
  const clean = caption.trim();
  if (!clean) {
    return { title: "Momen dari Telegram", story: "" };
  }

  const [firstLine, ...rest] = clean.split("\n");
  const title = firstLine.trim().slice(0, 120);
  const story = rest.join("\n").trim();

  // A single long line reads better as the story, with a short title derived
  // from its opening words.
  if (!story && title.length > 80) {
    return { title: `${title.slice(0, 60).trim()}…`, story: clean };
  }
  return { title, story };
}

async function storeMedia(
  buffer: Buffer,
  mimeType: string,
  name: string
): Promise<MediaItem | null> {
  const type = mimeType.startsWith("video/") ? "video" : "image";

  if (isDemoMode()) {
    const id = saveDemoUpload({ buffer, mimeType, name });
    return { id, type };
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

async function handleMedia(message: TelegramMessage): Promise<string> {
  const largestPhoto = message.photo?.[message.photo.length - 1];
  const fileId = largestPhoto?.file_id ?? message.video?.file_id;
  if (!fileId) return "";

  const file = await downloadFile(fileId);
  if (!file) {
    return "Media itu terlalu besar untuk diambil lewat bot (batas Telegram 20MB). Coba unggah lewat web.";
  }

  const media = await storeMedia(
    file.buffer,
    message.video?.mime_type ?? file.mimeType,
    file.name
  );
  if (!media) return "Media gagal disimpan ke Google Drive. Coba lagi sebentar lagi.";

  const groupId = message.media_group_id;

  // Photos sent as one album should land in one moment. The download and upload
  // above run in parallel across the album; only this part is serialized, so
  // the first photo creates the moment and the rest attach to it.
  const save = async (): Promise<string> => {
    const existingId = groupId ? recallMediaGroup(groupId) : null;
    if (existingId && (await appendMedia(existingId, media))) return "";

    const { title, story } = parseCaption(message.caption ?? "");
    const moment = await addMoment({
      title,
      story,
      date: todayISO(message.date),
      lat: null,
      lng: null,
      locationName: "",
      media: [media],
      coverPhotoId: media.id,
      collection: "Dari Telegram",
      tags: [],
      mood: "",
      favorite: false,
      authorId: "",
      peopleIds: [],
    });

    if (groupId) rememberMediaGroup(groupId, moment.id);

    return [
      `Tersimpan: <b>${escapeHtml(moment.title)}</b>`,
      "Kirim lokasi sekarang untuk menandai tempatnya di peta.",
    ].join("\n");
  };

  return groupId ? withMediaGroupLock(groupId, save) : save();
}

async function appendMedia(
  momentId: string,
  media: MediaItem
): Promise<Moment | null> {
  const moments = await listMoments();
  const moment = moments.find((item) => item.id === momentId);
  if (!moment) return null;

  return updateMoment(momentId, {
    media: [...moment.media, media],
  });
}

async function handleLocation(message: TelegramMessage): Promise<string> {
  const location = message.location ?? message.venue?.location;
  if (!location) return "";

  const moments = await listMoments();
  const cutoff = Date.now() - LOCATION_ATTACH_WINDOW_MS;
  const recent = moments.find((moment) => {
    if (moment.collection !== "Dari Telegram") return false;
    if (moment.lat !== null) return false;
    return new Date(moment.createdAt).getTime() >= cutoff;
  });

  if (!recent) {
    return "Belum ada momen baru dari Telegram untuk ditandai. Kirim fotonya dulu, lalu lokasinya.";
  }

  await updateMoment(recent.id, {
    lat: location.latitude,
    lng: location.longitude,
    locationName: message.venue?.title || message.venue?.address || "",
  });

  return `Lokasi ditambahkan ke <b>${escapeHtml(recent.title)}</b>.`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(request: NextRequest) {
  if (!isTelegramConfigured()) {
    return NextResponse.json({ ok: true });
  }
  if (
    !isValidWebhookSecret(
      request.headers.get("x-telegram-bot-api-secret-token")
    )
  ) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message ?? update.channel_post;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  if (!isAllowedChat(chatId)) {
    await sendMessage(
      chatId,
      `Bot ini khusus untuk album keluarga. ID chat kamu: <code>${chatId}</code>`
    ).catch(() => undefined);
    return NextResponse.json({ ok: true });
  }

  try {
    let reply = "";
    if (message.photo?.length || message.video) {
      reply = await handleMedia(message);
    } else if (message.location || message.venue) {
      reply = await handleLocation(message);
    } else {
      reply = HELP_TEXT;
    }

    if (reply) await sendMessage(chatId, reply);
  } catch (error) {
    await sendMessage(
      chatId,
      `Gagal menyimpan momen: ${escapeHtml(
        describeGoogleError(error)
      )}`
    ).catch(() => undefined);
  }

  // Always 200: a non-2xx makes Telegram retry the same update, which would
  // duplicate a moment that was in fact saved.
  return NextResponse.json({ ok: true });
}
