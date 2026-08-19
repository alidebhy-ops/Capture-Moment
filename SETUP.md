# Panduan Setup CaptureMoment

Ikuti langkah ini sekali saja. Setelah selesai, app langsung bisa dipakai di lokal maupun di Vercel.

Yang dibutuhkan: 1 akun Google (gratis, tanpa kartu kredit).

---

## Langkah 1 — Buat project di Google Cloud Console

1. Buka https://console.cloud.google.com/ dan login dengan akun Google kamu.
2. Klik dropdown project di kiri atas → **New Project** → beri nama `CaptureMoment` → **Create**.
3. Pastikan project `CaptureMoment` yang terpilih.

## Langkah 2 — Aktifkan API & buat credential

1. Buka **APIs & Services → Library**, cari dan **Enable**:
   - **Google Drive API**
   - **Google Sheets API**

   Keduanya wajib; melewatkan salah satu membuat penyimpanan momen gagal dengan pesan yang membingungkan. Tunggu 1-2 menit setelah Enable agar menyebar.
2. Buka **APIs & Services → OAuth consent screen**:
   - Pilih audience **External** → isi nama app `CaptureMoment` + email kamu → simpan.
   - Di bagian **Test users**, tambahkan alamat Gmail kamu sendiri.
   - (Biarkan status "Testing" — tidak perlu verifikasi Google karena hanya kamu penggunanya.)
3. Buka **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**:
   - Application type: **Desktop app**
   - Nama bebas, misal `capturemoment-desktop`.
4. Salin **Client ID** dan **Client Secret** yang muncul.
5. Di folder project ini, salin `.env.example` menjadi `.env.local`, lalu isi:
   ```
   GOOGLE_CLIENT_ID=<client id kamu>
   GOOGLE_CLIENT_SECRET=<client secret kamu>
   ```

> Catatan: app ini hanya meminta scope `drive.file` (akses file yang dibuat app ini saja, bukan seluruh Drive kamu) dan `spreadsheets`.

## Langkah 3 — Dapatkan refresh token

1. Di terminal, jalankan dari folder project:
   ```
   node scripts/get-refresh-token.mjs
   ```
2. Buka URL yang muncul di terminal → login dengan akun Google kamu → izinkan akses.
   (Kalau muncul peringatan "Google hasn't verified this app", klik **Continue** — ini app milikmu sendiri.)
3. Terminal akan menampilkan `GOOGLE_REFRESH_TOKEN=...` → salin baris itu ke `.env.local`.

## Langkah 4 — Buat spreadsheet & folder Drive

1. Buka https://sheets.new → beri nama `CaptureMoment DB`.
   - Salin **ID spreadsheet** dari URL: `https://docs.google.com/spreadsheets/d/`**`<INI_ID-NYA>`**`/edit`
   - Isi ke `.env.local` sebagai `SHEET_ID=...`
   - Tidak perlu bikin header — app akan menulis header otomatis saat momen pertama disimpan.
   - Aplikasi akan otomatis membuat tab `Plans`, `TimeCapsules`, `Members`, dan `Community` saat fiturnya pertama kali dipakai; tidak perlu membuat header atau tab secara manual.
2. Buka https://drive.google.com → buat folder baru `CaptureMoment Photos`.
   - Buka foldernya, salin **ID folder** dari URL: `https://drive.google.com/drive/folders/`**`<INI_ID-NYA>`**
   - Isi ke `.env.local` sebagai `DRIVE_FOLDER_ID=...`

## Langkah 5 — Password & secret

Isi dua nilai terakhir di `.env.local`:

```
APP_PASSWORD=passwordkeluarga     # password untuk membuka album
AUTH_SECRET=<string acak panjang> # bebas, minimal 32 karakter
```

Cara cepat bikin AUTH_SECRET acak (jalankan di terminal):

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Langkah 6 — Jalankan di lokal

```
npm run dev
```

Periksa dulu sambungannya dengan `npm run doctor`, lalu buka http://localhost:3000 → login dengan `APP_PASSWORD` → tambah momen pertama. Cek: baris baru muncul di spreadsheet, foto muncul di folder Drive.

## Langkah 7 — Deploy ke Vercel

1. Push project ini ke GitHub (repo **private** disarankan).
2. Buka https://vercel.com → **Add New Project** → import repo ini (framework terdeteksi otomatis: Next.js).
3. Di halaman konfigurasi, buka **Environment Variables** dan isi SEMUA variabel dari `.env.local`:
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `SHEET_ID`, `DRIVE_FOLDER_ID`, `APP_PASSWORD`, `AUTH_SECRET`
   - Untuk deployment preview yang sengaja memakai data contoh, isi `DEMO_MODE=true`. Production tidak otomatis masuk mode demo ketika credential kosong.
4. **Deploy** → selesai. Bagikan URL + password ke keluarga.

---

## Langkah 8 (opsional) — Bot Telegram

Setelah aktif, kirim foto + caption ke bot dan momen langsung masuk album. Lewati langkah ini jika belum diperlukan.

1. Buka [@BotFather](https://t.me/BotFather) di Telegram → kirim `/newbot` → ikuti instruksinya.
   Salin token yang diberikan ke `.env.local` sebagai `TELEGRAM_BOT_TOKEN`.
2. Buat secret acak untuk webhook:
   ```
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
   Isi hasilnya sebagai `TELEGRAM_WEBHOOK_SECRET`.
3. Deploy dulu ke Vercel (Langkah 7) dengan kedua variabel di atas terisi, lalu daftarkan webhook:
   ```
   node scripts/setup-telegram.mjs https://album-kamu.vercel.app
   ```
4. Kirim pesan apa pun ke bot. Karena chat-mu belum diizinkan, bot membalas dengan ID chat.
   Salin ID itu ke `TELEGRAM_ALLOWED_CHAT_IDS` (pisah koma jika lebih dari satu), lalu deploy ulang.
5. Selesai. Cara pakainya:
   - Kirim foto/video dengan caption — baris pertama jadi judul, sisanya jadi cerita.
   - Kirim beberapa foto sekaligus (album) — semuanya masuk ke satu momen.
   - Kirim lokasi setelah foto — lokasi menempel ke momen terakhir dari Telegram.

Momen dari bot masuk ke koleksi **Dari Telegram** sehingga mudah dirapikan belakangan.

Batasan: bot Telegram hanya dapat mengunduh berkas hingga 20MB. Video lebih besar tetap perlu diunggah lewat web.

---

## Catatan & batasan

- **Kuota gratis**: penyimpanan mengikuti kuota akun Google kamu (dipakai bersama Gmail/Drive). Foto dikompres otomatis di browser (~maks 1,4MB per foto) sehingga hampir selalu lolos.
- **Batas ukuran unggahan 4 MB per berkas**: Vercel menolak body request di atas 4,5MB sebelum kode aplikasi sempat berjalan, dan seluruh unggahan saat ini melewati server aplikasi. Foto aman karena dikompres dulu; video yang lebih besar akan ditolak dengan pesan yang jelas. Untuk video besar, unggah langsung ke folder Google Drive album, atau lanjutkan arsitektur ke resumable upload langsung dari browser ke Drive.
- **Refresh token kedaluwarsa tiap 7 hari** selama OAuth consent screen berstatus **Testing**. Solusi: di halaman OAuth consent screen, klik **Publish app** (status "In production"). Tidak perlu proses verifikasi Google untuk scope yang dipakai app ini — cukup abaikan peringatannya. Setelah itu refresh token berlaku permanen (sampai dicabut manual).
- **Foto HEIC dari iPhone** kadang gagal dikompres di browser tertentu. Kalau bermasalah, ubah setelan kamera iPhone ke "Most Compatible" (JPEG).
- **Keamanan**: `.env.local` tidak boleh di-commit (sudah otomatis di-ignore oleh git).
- **Rotasi sesi**: mengganti `APP_PASSWORD` otomatis membatalkan semua cookie login yang lama, karena sidik jari password ikut ditandatangani ke dalam token sesi. Semua perangkat akan diminta login ulang.
- **Rate limit login**: pembatas percobaan login disimpan di memori proses, sehingga tidak berlaku lintas instance serverless dan hilang saat cold start. Pertahanan utamanya adalah perhitungan password yang sengaja lambat (PBKDF2), yang tetap berlaku di kondisi apa pun.
- **`AUTH_SECRET` di lokal**: kalau kosong saat pengembangan, aplikasi membuat secret acak baru setiap kali server dijalankan. Aman, tapi berarti kamu logout setiap restart. Isi `AUTH_SECRET` di `.env.local` jika ingin sesi bertahan.
- **Cache media**: foto dan video disajikan dengan header cache permanen milik browser (`private, immutable`) karena isi sebuah ID file Drive tidak pernah berubah. Mengganti foto berarti mengunggah file baru, bukan menimpa yang lama.
- **Hapus permanen**: mengosongkan momen dari tempat sampah menghapus barisnya dari spreadsheet sekaligus file medianya di Google Drive, dan tidak dapat dibatalkan.

## Fitur yang memakai penyimpanan lokal perangkat

- Draf Story Studio disimpan sementara di browser agar tulisan tidak hilang saat tab tertutup.
- Pilihan mode tampilan dan warna aksen disimpan sebagai cookie preferensi pada perangkat.
- Smart Inbox membaca metadata dan menyiapkan media di browser sebelum diunggah.
- PWA menyimpan shell aplikasi dan halaman offline, tetapi tidak menyimpan respons API privat.

## Backup

Halaman `/archive` menyediakan:

- ekspor JSON untuk momen, rencana, anggota, kapsul waktu yang sudah disanitasi, komentar, dan reaksi;
- ekspor CSV metadata momen;
- trash dan pemulihan momen;
- photobook yang dapat dicetak atau disimpan sebagai PDF.

File JSON berisi referensi ID media. Foto/video asli tetap berada di Google Drive dan tidak disalin ke file backup.
