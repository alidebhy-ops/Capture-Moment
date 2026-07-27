import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnvLocal();
const token = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const secret = env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = process.argv[2] || env.APP_URL || process.env.APP_URL;

if (!token || !secret) {
  console.error(
    "TELEGRAM_BOT_TOKEN dan TELEGRAM_WEBHOOK_SECRET harus ada di .env.local.\n" +
      "Lihat SETUP.md bagian bot Telegram."
  );
  process.exit(1);
}

if (!appUrl) {
  console.error(
    "Alamat aplikasi belum diberikan.\n\n" +
      "  node scripts/setup-telegram.mjs https://album-kamu.vercel.app\n"
  );
  process.exit(1);
}

const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram`;

async function call(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  return response.json();
}

const result = await call("setWebhook", {
  url: webhookUrl,
  secret_token: secret,
  allowed_updates: ["message", "channel_post"],
  drop_pending_updates: true,
});

if (!result.ok) {
  console.error("Gagal mendaftarkan webhook:", result.description ?? result);
  process.exit(1);
}

const me = await call("getMe");
const info = await call("getWebhookInfo");

console.log("\nWebhook aktif.\n");
console.log(`  Bot      : @${me.result?.username ?? "(tidak diketahui)"}`);
console.log(`  Webhook  : ${info.result?.url ?? webhookUrl}`);
console.log("\nLangkah terakhir: kirim pesan apa pun ke bot dari chat keluarga.");
console.log("Bot akan membalas dengan ID chat — salin ID itu ke TELEGRAM_ALLOWED_CHAT_IDS,");
console.log("lalu deploy ulang agar chat tersebut diizinkan menyimpan momen.\n");
