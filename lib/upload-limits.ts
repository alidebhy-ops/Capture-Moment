// Vercel rejects request bodies larger than 4.5 MB before the function runs, so
// media has to be checked against that ceiling in the browser — otherwise the
// upload fails with an opaque platform error the app cannot catch or explain.
export const MAX_UPLOAD_MB = 4;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");
}

export function oversizedMediaMessage(name: string, bytes: number): string {
  return `${name} berukuran ${formatMegabytes(bytes)} MB, melebihi batas ${MAX_UPLOAD_MB} MB per berkas. Foto dikompres otomatis, tetapi video berukuran besar perlu diunggah langsung ke folder Google Drive album.`;
}
