import { auth } from "@googleapis/drive";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
];

const ENV_FILE = path.join(process.cwd(), ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const env = {};
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

// Written straight into .env.local rather than printed for copying. Pasting a
// whole "GOOGLE_REFRESH_TOKEN=..." line into a file that already has that line
// leaves the variable name in the value, and Google rejects it with a bare
// "invalid_grant" that explains nothing.
function writeEnvValue(key, value) {
  if (!fs.existsSync(ENV_FILE)) return false;

  try {
    const original = fs.readFileSync(ENV_FILE, "utf8");
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^[ \t]*${key}[ \t]*=.*$`, "m");
    const updated = pattern.test(original)
      ? original.replace(pattern, line)
      : `${original.replace(/\s*$/, "")}\n${line}\n`;

    fs.writeFileSync(ENV_FILE, updated, "utf8");
    return true;
  } catch {
    return false;
  }
}

const env = loadEnvLocal();
const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const clientSecret = env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET belum ada.\n" +
      "Isi dulu di file .env.local (lihat SETUP.md langkah 2), lalu jalankan lagi:\n" +
      "  node scripts/get-refresh-token.mjs"
  );
  process.exit(1);
}

const oauth2 = new auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error || !code) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h2>Login dibatalkan. Tutup tab ini dan coba lagi.</h2>");
    console.error("Login gagal/dibatalkan:", error);
    server.close();
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h2>Berhasil! Kembali ke terminal untuk melihat hasilnya. Tab ini boleh ditutup.</h2>"
    );

    if (!tokens.refresh_token) {
      console.log("\nGoogle tidak mengirim refresh token.");
      console.log(
        "Cabut akses app di https://myaccount.google.com/permissions lalu jalankan script ini lagi."
      );
      return;
    }

    console.log("\n=== BERHASIL ===\n");
    if (writeEnvValue("GOOGLE_REFRESH_TOKEN", tokens.refresh_token)) {
      console.log("GOOGLE_REFRESH_TOKEN sudah ditulis langsung ke .env.local.");
      console.log("Tidak ada yang perlu disalin — lanjut ke langkah berikutnya.\n");
    } else {
      console.log(
        "File .env.local belum ada. Buat dulu (salin dari .env.example), lalu isi baris ini"
      );
      console.log("— tulis nama variabelnya SEKALI saja:\n");
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    }
  } catch (e) {
    console.error("Gagal menukar code menjadi token:", e.message);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(PORT, () => {
  console.log("Buka URL berikut di browser, lalu login dengan akun Google kamu:\n");
  console.log(authUrl + "\n");
  console.log("(Menunggu login selesai...)");
});
