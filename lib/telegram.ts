import "server-only";

// Telegram's own getFile endpoint refuses anything larger than this, so there is
// no point starting a download we cannot finish.
export const TELEGRAM_MAX_FILE_BYTES = 20 * 1024 * 1024;

export type TelegramPhotoSize = {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
};

export type TelegramVideo = {
  file_id: string;
  mime_type?: string;
  file_size?: number;
};

export type TelegramLocation = {
  latitude: number;
  longitude: number;
};

export type TelegramMessage = {
  message_id: number;
  date: number;
  chat: { id: number; type: string; title?: string; first_name?: string };
  from?: { id: number; first_name?: string; username?: string };
  text?: string;
  caption?: string;
  media_group_id?: string;
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
  location?: TelegramLocation;
  venue?: { location: TelegramLocation; title?: string; address?: string };
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
};

export function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN belum diisi di environment.");
  }
  return token;
}

export function isTelegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET
  );
}

// Telegram sends the configured secret back on every webhook call. Without this
// check the endpoint would accept a moment from anyone who guessed the URL.
export function isValidWebhookSecret(header: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !header) return false;
  if (header.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// A valid secret proves the request came from Telegram, not that the sender is
// family. Anyone can message a bot whose username they know.
export function isAllowedChat(chatId: number): boolean {
  const allowed = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(String(chatId));
}

async function callTelegram<T>(
  method: string,
  payload: Record<string, unknown>
): Promise<T | null> {
  const response = await fetch(
    `https://api.telegram.org/bot${getBotToken()}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const data = (await response.json().catch(() => null)) as {
    ok?: boolean;
    result?: T;
  } | null;
  return data?.ok ? (data.result ?? null) : null;
}

export async function sendMessage(
  chatId: number,
  text: string
): Promise<void> {
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

export async function downloadFile(
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string; name: string } | null> {
  const file = await callTelegram<{ file_path?: string; file_size?: number }>(
    "getFile",
    { file_id: fileId }
  );
  if (!file?.file_path) return null;
  if ((file.file_size ?? 0) > TELEGRAM_MAX_FILE_BYTES) return null;

  const response = await fetch(
    `https://api.telegram.org/file/bot${getBotToken()}/${file.file_path}`
  );
  if (!response.ok) return null;

  const buffer = Buffer.from(await response.arrayBuffer());
  const name = file.file_path.split("/").pop() || "telegram-media";
  return {
    buffer,
    mimeType: mimeFromPath(file.file_path),
    name,
  };
}

function mimeFromPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    default:
      return "image/jpeg";
  }
}

// Telegram splits an album into one webhook call per photo, tied together only
// by media_group_id. Remembering the moment we created for a group lets the rest
// of the album join it instead of creating a moment per photo. A cold start
// between calls just means an extra moment, never lost media.
type MediaGroupEntry = { momentId: string; expiresAt: number };

declare global {
  var captureMomentTelegramGroups: Map<string, MediaGroupEntry> | undefined;
}

const MEDIA_GROUP_TTL_MS = 5 * 60 * 1000;

function groupStore(): Map<string, MediaGroupEntry> {
  if (!globalThis.captureMomentTelegramGroups) {
    globalThis.captureMomentTelegramGroups = new Map();
  }
  return globalThis.captureMomentTelegramGroups;
}

export function rememberMediaGroup(groupId: string, momentId: string): void {
  const store = groupStore();
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  store.set(groupId, { momentId, expiresAt: now + MEDIA_GROUP_TTL_MS });
}

export function recallMediaGroup(groupId: string): string | null {
  const entry = groupStore().get(groupId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    groupStore().delete(groupId);
    return null;
  }
  return entry.momentId;
}
