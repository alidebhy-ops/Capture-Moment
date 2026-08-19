// Google's API errors surface as short machine strings like "invalid_grant",
// which tell the person staring at the screen nothing about what to do. Each
// case below maps to the one action that actually fixes it.

type GoogleErrorShape = {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  response?: { status?: unknown; data?: unknown };
};

function collectText(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "");

  const shaped = error as GoogleErrorShape;
  const parts = [
    typeof shaped.message === "string" ? shaped.message : "",
    typeof shaped.code === "string" ? shaped.code : "",
  ];

  const data = shaped.response?.data;
  if (typeof data === "string") parts.push(data);
  else if (data && typeof data === "object") {
    const shapedData = data as { error?: unknown; error_description?: unknown };
    if (typeof shapedData.error === "string") parts.push(shapedData.error);
    if (typeof shapedData.error_description === "string") {
      parts.push(shapedData.error_description);
    }
  }

  return parts.filter(Boolean).join(" ").toLowerCase();
}

function statusOf(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const shaped = error as GoogleErrorShape;
  const candidate = shaped.status ?? shaped.code ?? shaped.response?.status;
  return typeof candidate === "number" ? candidate : null;
}

export function describeGoogleError(error: unknown): string {
  const text = collectText(error);
  const status = statusOf(error);

  if (text.includes("invalid_grant")) {
    return [
      "Koneksi ke Google Drive kedaluwarsa atau ditolak (invalid_grant).",
      "Jalankan `node scripts/get-refresh-token.mjs` untuk menghubungkan ulang.",
      "Jika ini terjadi setiap beberapa hari, buka OAuth consent screen di Google Cloud Console lalu klik Publish app.",
    ].join(" ");
  }

  if (text.includes("invalid_client") || text.includes("unauthorized_client")) {
    return "GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET tidak cocok dengan yang terdaftar di Google Cloud Console. Periksa kembali kedua nilainya.";
  }

  if (text.includes("accessnotconfigured") || text.includes("has not been used in project")) {
    return "Google Drive API atau Google Sheets API belum diaktifkan di project Google Cloud kamu. Aktifkan keduanya lewat APIs & Services → Library.";
  }

  if (status === 404 || text.includes("requested entity was not found")) {
    return "Spreadsheet atau folder Drive tidak ditemukan. Periksa nilai SHEET_ID dan DRIVE_FOLDER_ID.";
  }

  if (status === 403 && text.includes("permission")) {
    return "Akun Google yang terhubung tidak punya akses ke spreadsheet atau folder tersebut. Pastikan keduanya dibuat dengan akun yang sama.";
  }

  if (status === 429 || text.includes("quota") || text.includes("rate limit")) {
    return "Kuota Google API sedang penuh. Tunggu satu menit lalu coba lagi.";
  }

  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan saat menghubungi Google.";
}
