// Dipakai bersama oleh unggahan lewat web dan lewat iPhone. Jenis berkas tidak
// cukup dipercaya dari header Content-Type saja — nilainya dikirim klien dan
// bisa dikarang, jadi isi berkasnya ikut diperiksa.

export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

export function isSupportedMedia(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.has(mimeType) || VIDEO_MIME_TYPES.has(mimeType);
}

export function isVideoMime(mimeType: string): boolean {
  return VIDEO_MIME_TYPES.has(mimeType);
}

function hasBytes(buffer: Buffer, offset: number, expected: number[]): boolean {
  return expected.every((value, index) => buffer[offset + index] === value);
}

function hasAscii(buffer: Buffer, offset: number, value: string): boolean {
  return (
    buffer.subarray(offset, offset + value.length).toString("ascii") === value
  );
}

export function signatureMatches(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return hasBytes(buffer, 0, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/png") {
    return hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (mimeType === "image/webp") {
    return hasAscii(buffer, 0, "RIFF") && hasAscii(buffer, 8, "WEBP");
  }
  if (mimeType === "image/gif") {
    return hasAscii(buffer, 0, "GIF87a") || hasAscii(buffer, 0, "GIF89a");
  }
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return hasAscii(buffer, 4, "ftyp");
  }
  if (
    mimeType === "video/mp4" ||
    mimeType === "video/quicktime" ||
    mimeType === "video/x-m4v"
  ) {
    return hasAscii(buffer, 4, "ftyp");
  }
  if (mimeType === "video/webm") {
    return hasBytes(buffer, 0, [0x1a, 0x45, 0xdf, 0xa3]);
  }
  return false;
}
