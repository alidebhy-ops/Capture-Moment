import "server-only";

import { getAccessToken } from "./google";

// API lama Google Photos sudah dicabut: scope photoslibrary.readonly berhenti
// bekerja pada 31 Maret 2025, sehingga memindai album secara otomatis tidak
// mungkin lagi. Picker adalah jalur resmi penggantinya — pengguna memilih foto
// di dalam antarmuka milik Google, lalu aplikasi menyalin yang dipilih saja.
const PICKER_API = "https://photospicker.googleapis.com/v1";

export type PickerSession = {
  id: string;
  pickerUri: string;
  mediaItemsSet: boolean;
  pollIntervalMs: number;
};

export type PickedItem = {
  id: string;
  filename: string;
  mimeType: string;
  baseUrl: string;
  createTime: string;
};

type RawSession = {
  id?: string;
  pickerUri?: string;
  mediaItemsSet?: boolean;
  pollingConfig?: { pollInterval?: string };
};

type RawPickedItem = {
  id?: string;
  createTime?: string;
  mediaFile?: {
    baseUrl?: string;
    mimeType?: string;
    filename?: string;
  };
};

async function pickerFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error("Tidak dapat mengambil token Google.");

  return fetch(`${PICKER_API}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

function describePickerFailure(status: number, body: string): string {
  if (status === 403 && body.includes("photospicker")) {
    return "Google Photos Picker API belum diaktifkan, atau izinnya belum diberikan. Aktifkan di Google Cloud Console lalu jalankan ulang `node scripts/get-refresh-token.mjs`.";
  }
  if (status === 401 || status === 403) {
    return "Akun Google belum memberi izin untuk memilih foto. Jalankan ulang `node scripts/get-refresh-token.mjs` agar izin barunya ikut terpasang.";
  }
  return "Google Photos sedang tidak dapat dihubungi. Coba lagi sebentar lagi.";
}

// "3s" -> 3000. Google mengirim interval polling sebagai durasi berakhiran "s".
function parseSeconds(value: string | undefined, fallback: number): number {
  const seconds = Number(String(value ?? "").replace("s", ""));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : fallback;
}

function toSession(raw: RawSession): PickerSession {
  if (!raw.id || !raw.pickerUri) {
    throw new Error("Google Photos tidak mengembalikan sesi yang valid.");
  }
  return {
    id: raw.id,
    pickerUri: raw.pickerUri,
    mediaItemsSet: raw.mediaItemsSet === true,
    pollIntervalMs: parseSeconds(raw.pollingConfig?.pollInterval, 3000),
  };
}

export async function createPickerSession(): Promise<PickerSession> {
  const response = await pickerFetch("/sessions", { method: "POST", body: "{}" });
  if (!response.ok) {
    throw new Error(describePickerFailure(response.status, await response.text()));
  }
  return toSession((await response.json()) as RawSession);
}

export async function getPickerSession(id: string): Promise<PickerSession> {
  const response = await pickerFetch(`/sessions/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error(describePickerFailure(response.status, await response.text()));
  }
  return toSession((await response.json()) as RawSession);
}

export async function deletePickerSession(id: string): Promise<void> {
  await pickerFetch(`/sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => undefined);
}

export async function listPickedItems(sessionId: string): Promise<PickedItem[]> {
  const items: PickedItem[] = [];
  let pageToken = "";

  do {
    const query = new URLSearchParams({ sessionId, pageSize: "100" });
    if (pageToken) query.set("pageToken", pageToken);

    const response = await pickerFetch(`/mediaItems?${query}`);
    if (!response.ok) {
      throw new Error(describePickerFailure(response.status, await response.text()));
    }

    const payload = (await response.json()) as {
      mediaItems?: RawPickedItem[];
      nextPageToken?: string;
    };

    for (const raw of payload.mediaItems ?? []) {
      const file = raw.mediaFile;
      if (!raw.id || !file?.baseUrl) continue;
      items.push({
        id: raw.id,
        filename: file.filename || "google-photos",
        mimeType: file.mimeType || "image/jpeg",
        baseUrl: file.baseUrl,
        createTime: raw.createTime ?? "",
      });
    }

    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return items;
}

// baseUrl hanya berlaku sekitar 60 menit dan wajib membawa bearer token, jadi
// byte-nya harus diambil dan disalin dalam sesi yang sama.
export async function downloadPickedItem(
  item: PickedItem
): Promise<Buffer | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const separator = item.baseUrl.includes("?") ? "&" : "?";
  const response = await fetch(`${item.baseUrl}${separator}d`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;

  return Buffer.from(await response.arrayBuffer());
}
