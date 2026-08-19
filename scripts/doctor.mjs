// Memeriksa setiap sambungan ke Google satu per satu dan menyebut langkah
// perbaikannya. Dibuat setelah satu sesi debugging panjang yang penyebabnya
// ternyata dua hal sepele: nama variabel tersalin dua kali, dan satu API yang
// belum diaktifkan.
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { auth, drive as driveApi } from "@googleapis/drive";
import { sheets as sheetsApi } from "@googleapis/sheets";

const ENV_FILE = path.join(process.cwd(), ".env.local");
const REQUIRED = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "SHEET_ID",
  "DRIVE_FOLDER_ID",
  "APP_PASSWORD",
  "AUTH_SECRET",
];

let problems = 0;
const ok = (label, detail = "") => console.log(`  OK    ${label}${detail ? " — " + detail : ""}`);
const bad = (label, fix) => { problems++; console.log(`  GAGAL ${label}\n        → ${fix}`); };

if (!fs.existsSync(ENV_FILE)) {
  console.log("\n.env.local tidak ditemukan.");
  console.log("→ Salin .env.example menjadi .env.local lalu isi (lihat TUTORIAL.md bagian 3).\n");
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

console.log("\n[1/4] Isi file .env.local");
for (const key of REQUIRED) {
  const value = env[key];
  if (!value) { bad(key, `Belum diisi di .env.local.`); continue; }
  if (value.startsWith(key)) {
    bad(key, `Nama variabel ikut tersalin ke dalam nilainya. Hapus "${key}=" yang kedua.`);
    continue;
  }
  ok(key, `${value.length} karakter`);
}

if (env.GOOGLE_REFRESH_TOKEN && !env.GOOGLE_REFRESH_TOKEN.startsWith("1//")) {
  bad("Bentuk GOOGLE_REFRESH_TOKEN", "Refresh token Google selalu diawali \"1//\". Jalankan: node scripts/get-refresh-token.mjs");
}

console.log("\n[2/4] Izin akun Google");
const client = new auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
client.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });

let tokenOk = false;
try {
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("kosong");
  tokenOk = true;
  ok("Refresh token diterima Google");
} catch (e) {
  const text = String(e?.message ?? e);
  if (text.includes("invalid_grant")) {
    bad("Refresh token ditolak (invalid_grant)", "Jalankan: node scripts/get-refresh-token.mjs — lalu publikasikan OAuth consent screen agar tidak kedaluwarsa tiap 7 hari.");
  } else if (text.includes("invalid_client")) {
    bad("Client ID / secret tidak cocok", "Periksa GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di Google Cloud Console → Credentials.");
  } else {
    bad("Gagal menukar refresh token", text);
  }
}

console.log("\n[3/4] Google Sheets");
if (!tokenOk) {
  console.log("  (dilewati, token belum valid)");
} else {
  try {
    const sheets = sheetsApi({ version: "v4", auth: client });
    const res = await sheets.spreadsheets.get({
      spreadsheetId: env.SHEET_ID,
      fields: "properties.title",
    });
    ok("Spreadsheet terbaca", `"${res.data.properties?.title}"`);
  } catch (e) {
    const text = String(e?.message ?? e);
    if (text.includes("has not been used in project") || text.includes("disabled")) {
      bad("Google Sheets API belum diaktifkan", "Buka Google Cloud Console → APIs & Services → Library → cari \"Google Sheets API\" → Enable. Tunggu 1-2 menit lalu ulangi.");
    } else if (text.includes("not found")) {
      bad("Spreadsheet tidak ditemukan", "Periksa SHEET_ID. Ambil dari URL: docs.google.com/spreadsheets/d/<ID>/edit");
    } else {
      bad("Gagal membaca spreadsheet", text);
    }
  }
}

console.log("\n[4/4] Google Drive");
if (!tokenOk) {
  console.log("  (dilewati, token belum valid)");
} else {
  // Scope drive.file tidak mengizinkan membaca metadata folder yang dibuat
  // manual, jadi satu-satunya cara menguji folder tujuan adalah mencoba
  // mengunggah ke dalamnya lalu menghapusnya lagi.
  const jpeg = Buffer.from([
    0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,
    0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0xff,0xd9,
  ]);
  try {
    const drive = driveApi({ version: "v3", auth: client });
    const created = await drive.files.create({
      requestBody: { name: "capturemoment-uji-koneksi.jpg", parents: [env.DRIVE_FOLDER_ID] },
      media: { mimeType: "image/jpeg", body: Readable.from(jpeg) },
      fields: "id",
    });
    await drive.files.delete({ fileId: created.data.id }).catch(() => {});
    ok("Folder Drive dapat menerima unggahan");
  } catch (e) {
    const text = String(e?.message ?? e);
    if (text.includes("has not been used in project") || text.includes("disabled")) {
      bad("Google Drive API belum diaktifkan", "Buka Google Cloud Console → APIs & Services → Library → cari \"Google Drive API\" → Enable.");
    } else if (text.includes("not found") || text.includes("notFound")) {
      bad("Folder Drive tidak ditemukan", "Periksa DRIVE_FOLDER_ID. Ambil dari URL: drive.google.com/drive/folders/<ID>");
    } else {
      bad("Gagal mengunggah ke folder Drive", text);
    }
  }
}

console.log(
  problems === 0
    ? "\nSemua sambungan sehat. Jalankan `npm run dev` dan album siap dipakai.\n"
    : `\n${problems} masalah ditemukan. Perbaiki sesuai petunjuk di atas, lalu jalankan lagi: npm run doctor\n`
);
process.exit(problems === 0 ? 0 : 1);
