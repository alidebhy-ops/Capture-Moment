import "server-only";

// Jalur masuk untuk iOS Shortcuts. Berbeda dari unggahan web, Shortcuts tidak
// membawa cookie sesi, jadi endpoint-nya memakai token sendiri.
//
// Keuntungan utamanya bukan kecepatan, melainkan koordinat: Shortcuts membaca
// lokasi langsung dari pustaka Photos lalu mengirimnya sebagai angka terpisah,
// sehingga tidak terkena penghapusan EXIF yang terjadi kalau foto dipilih lewat
// browser.

export const INGEST_COLLECTION = "Dari iPhone";

export function isIngestConfigured(): boolean {
  return Boolean(process.env.INGEST_TOKEN);
}

export function isValidIngestToken(header: string | null): boolean {
  const expected = process.env.INGEST_TOKEN;
  if (!expected || !header) return false;

  const provided = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : header.trim();

  if (provided.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// Shortcuts mengirim tanggal dalam beberapa bentuk tergantung format yang
// dipilih pengguna. Yang dibutuhkan hanya bagian tanggalnya.
export function parseCaptureDate(value: string, fallback: Date): string {
  const trimmed = value.trim();

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoDate) return isoDate[0].slice(0, 10);

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return fallback.toISOString().slice(0, 10);
}

export function parseCoordinate(
  value: string,
  min: number,
  max: number
): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return Number(parsed.toFixed(6));
}
