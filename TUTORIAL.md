# Tutorial CaptureMoment — dari nol sampai online

Panduan lengkap untuk orang yang belum pernah men-deploy apa pun. Kalau kamu sudah terbiasa dengan Node dan Google Cloud, langsung saja ke [SETUP.md](./SETUP.md) yang lebih ringkas.

**Perkiraan waktu:** 45–60 menit, sekali seumur hidup project ini.

---

## Bagian 0 — Apakah semuanya benar-benar gratis?

Ya, dan tanpa kartu kredit sama sekali. Tapi "gratis" punya batas, dan lebih baik kamu tahu batasnya sekarang daripada kaget nanti.

| Yang dipakai | Biaya | Batas yang perlu diingat |
|---|---|---|
| Akun Google | Gratis | Penyimpanan 15 GB dipakai bersama Gmail, Drive, dan Google Photos |
| Google Drive API | Gratis | Tidak perlu billing account |
| Google Sheets API | Gratis | 60 permintaan baca per menit per pengguna |
| Vercel (hosting) | Gratis | 100 GB bandwidth &amp; 1 juta pemanggilan fungsi per bulan |
| GitHub (repo privat) | Gratis | — |
| Peta OpenStreetMap | Gratis | — |
| Bot Telegram | Gratis | Bot hanya bisa mengunduh berkas sampai 20 MB |
| Domain `.vercel.app` | Gratis | Domain sendiri (`albumkeluarga.com`) berbayar, dan sepenuhnya opsional |

### Empat catatan jujur

**Penyimpanan 15 GB itu dibagi bersama.** Kuota Google kamu dipakai berbarengan oleh Gmail, Drive, dan Google Photos. Kalau Gmail kamu sudah memakai 10 GB, album cuma kebagian sisanya. Karena itu saya sarankan **membuat akun Google baru khusus untuk album ini** — selain kuotanya utuh, foto keluarga juga terpisah dari email pribadi.

**Akun Google baru di 2026 hanya dapat 5 GB.** Google mengubah kebijakannya: akun baru mulai dari 5 GB, dan naik ke 15 GB setelah kamu memverifikasi nomor HP. Jadi siapkan nomor HP saat membuat akunnya.

**Vercel gratis hanya untuk keperluan non-komersial.** Album keluarga jelas memenuhi syarat. Kalau suatu hari project ini dikomersialkan, kamu wajib pindah ke paket berbayar. Kabar baiknya: kalau batas bulanan terlampaui, Vercel **menghentikan sementara** project-nya, bukan mengirim tagihan. Tidak ada risiko tagihan mengejutkan.

**Google berencana menagih kelebihan kuota API "nanti di 2026".** Ini tertulis di dokumentasi resmi mereka. Yang ditagih hanya pemakaian **di atas** kuota gratis, dan Google berjanji memberi tahu minimal 90 hari sebelumnya. Pemakaian satu keluarga tidak akan mendekati batas itu — ini disebutkan supaya kamu tidak kaget kalau membaca beritanya.

### Berapa besar sebenarnya pemakaian keluarga?

Foto dikompres otomatis jadi sekitar 1 MB. Artinya 15 GB ≈ **15.000 foto**. Kalau keluargamu menyimpan 5 foto sehari, itu cukup untuk **8 tahun**. Bandwidth Vercel 100 GB per bulan juga jauh di atas kebutuhan: browser menyimpan foto di cache, jadi foto yang sama tidak diunduh berulang kali.

---

## Bagian 1 — Yang perlu disiapkan sebelum mulai

Siapkan semuanya dulu, supaya nanti tidak terputus di tengah jalan.

### Yang wajib

1. **Akun Google** — sangat disarankan membuat yang baru khusus album ini. Siapkan nomor HP untuk verifikasi agar dapat 15 GB penuh.
2. **Akun GitHub** — daftar gratis di [github.com](https://github.com). Cukup email dan password.
3. **Akun Vercel** — daftar di [vercel.com](https://vercel.com), pilih **Continue with GitHub**. Tidak perlu isi apa pun lagi.
4. **Node.js versi 20.9 atau lebih baru** — unduh versi **LTS** dari [nodejs.org](https://nodejs.org). Jalankan installer-nya, klik Next sampai selesai.
5. **Git** — unduh dari [git-scm.com](https://git-scm.com/downloads). Klik Next sampai selesai; pengaturan bawaannya sudah benar.

### Cara memastikan Node dan Git sudah terpasang

Buka terminal (di Windows: tekan `Win`, ketik `powershell`, Enter), lalu jalankan:

```bash
node --version
```

Harus muncul `v20.9.0` atau lebih tinggi. Lalu:

```bash
git --version
```

Kalau keduanya menampilkan nomor versi, kamu siap. Kalau muncul "not recognized", installer-nya belum selesai atau terminal perlu ditutup dan dibuka ulang.

### Yang opsional

6. **Akun Telegram** — hanya kalau kamu ingin mengirim momen lewat chat. Bisa ditambahkan kapan saja setelah album jadi.

---

## Bagian 2 — Menyiapkan kode di komputer

Kalau kode CaptureMoment sudah ada di komputermu, lewati ke Bagian 3.

Buka terminal di folder tempat kamu ingin menyimpan project, lalu:

```bash
npm install
```

Perintah ini mengunduh semua library yang dibutuhkan. Butuh 1–3 menit dan hanya dilakukan sekali.

---

## Bagian 3 — Menghubungkan ke Google

Bagian ini yang paling banyak klik-nya, tapi hanya sekali seumur hidup project.

### 3.1 Buat project di Google Cloud

1. Buka [console.cloud.google.com](https://console.cloud.google.com/) dan login dengan akun Google album.
2. Kalau ini pertama kali, kamu akan diminta menyetujui Terms of Service. Setujui.
3. Klik dropdown project di kiri atas → **New Project**.
4. Beri nama `CaptureMoment` → **Create**.
5. Tunggu beberapa detik, lalu pastikan project `CaptureMoment` yang terpilih di dropdown.

> Meskipun namanya "Cloud Console" dan terdengar berbayar, membuat project dan memakai Drive serta Sheets API tidak dipungut biaya dan tidak meminta kartu kredit.

### 3.2 Aktifkan dua API

1. Di menu kiri, buka **APIs &amp; Services → Library**.
2. Cari `Google Drive API` → klik hasilnya → **Enable**.
3. Kembali ke Library, cari `Google Sheets API` → klik → **Enable**.

### 3.3 Atur OAuth consent screen

Ini layar izin yang muncul saat kamu menghubungkan akun.

1. Buka **APIs &amp; Services → OAuth consent screen**.
2. Pilih **External** → **Create**.
3. Isi yang wajib saja: nama app `CaptureMoment`, email support (email kamu), email developer (email kamu). **Save and Continue**.
4. Di halaman Scopes, langsung **Save and Continue**.
5. Di halaman **Test users**, klik **Add Users**, masukkan alamat Gmail kamu sendiri, lalu **Save and Continue**.

**Penting — lakukan ini agar tidak perlu login ulang tiap minggu:** kembali ke halaman OAuth consent screen, cari tombol **Publish app**, klik, lalu konfirmasi. Statusnya berubah menjadi "In production".

Kenapa? Selama status masih "Testing", token akses kedaluwarsa setiap 7 hari dan album akan berhenti bekerja sampai kamu menghubungkan ulang. Setelah dipublikasikan, token berlaku sampai kamu mencabutnya sendiri. Kamu tidak perlu proses verifikasi Google — abaikan saja peringatannya, karena aplikasi ini hanya meminta akses ke berkas yang dibuatnya sendiri.

### 3.4 Buat OAuth Client ID

1. Buka **APIs &amp; Services → Credentials**.
2. **Create Credentials → OAuth client ID**.
3. Application type: **Desktop app**. Nama bebas, misal `capturemoment-desktop`. **Create**.
4. Muncul jendela berisi **Client ID** dan **Client Secret**. Biarkan terbuka, sebentar lagi dipakai.

### 3.5 Isi file konfigurasi

1. Di folder project, salin `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

2. Buka `.env.local` dengan Notepad atau editor apa pun, lalu isi dua baris pertama dengan nilai dari langkah 3.4:

```
GOOGLE_CLIENT_ID=angka-panjang.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
```

> File `.env.local` berisi kunci rahasia dan sudah otomatis dikecualikan dari git, jadi tidak akan ikut ter-upload ke GitHub.

### 3.6 Ambil refresh token

```bash
node scripts/get-refresh-token.mjs
```

Terminal menampilkan sebuah URL. Buka URL itu di browser, login dengan akun Google album, lalu izinkan aksesnya.

Kalau muncul layar **"Google hasn't verified this app"**, klik **Advanced** → **Go to CaptureMoment (unsafe)**. Ini aman: aplikasinya milikmu sendiri, dan peringatan itu muncul karena kamu belum membayar proses verifikasi Google yang memang tidak dibutuhkan di sini.

Setelah berhasil, terminal menampilkan satu baris `GOOGLE_REFRESH_TOKEN=...`. Salin baris itu ke `.env.local`.

### 3.7 Buat spreadsheet dan folder Drive

**Spreadsheet:**

1. Buka [sheets.new](https://sheets.new) — langsung terbuat spreadsheet kosong.
2. Beri nama `CaptureMoment DB`.
3. Lihat URL-nya:
   `https://docs.google.com/spreadsheets/d/`**`1AbCdEfGhIjK...`**`/edit`
   Bagian yang ditebalkan itu ID-nya. Salin ke `.env.local` sebagai `SHEET_ID=`.

Tidak perlu membuat kolom atau tab apa pun — aplikasi mengisinya sendiri saat momen pertama disimpan.

**Folder Drive:**

1. Buka [drive.google.com](https://drive.google.com) → **New → New folder** → beri nama `CaptureMoment Photos`.
2. Buka folder itu (klik dua kali). Lihat URL-nya:
   `https://drive.google.com/drive/folders/`**`1XyZaBcDeF...`**
   Salin bagian yang ditebalkan ke `.env.local` sebagai `DRIVE_FOLDER_ID=`.

### 3.8 Password keluarga dan kunci sesi

Dua baris terakhir di `.env.local`.

`APP_PASSWORD` adalah password yang akan kamu bagikan ke keluarga. Pilih yang mudah diucapkan lewat telepon tapi tidak mudah ditebak — misalnya tiga kata acak yang digabung.

`AUTH_SECRET` adalah kunci acak untuk menandatangani cookie login. Jangan dikarang sendiri, buat dengan perintah ini:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Salin hasilnya. Hasil akhir `.env.local` kira-kira seperti ini:

```
GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-rahasia
GOOGLE_REFRESH_TOKEN=1//0gPanjangSekali
SHEET_ID=1AbCdEfGhIjK
DRIVE_FOLDER_ID=1XyZaBcDeF
APP_PASSWORD=kopi-hujan-sepeda
AUTH_SECRET=8f3a2b1c...64karakter
DEMO_MODE=false
```

---

## Bagian 4 — Coba dulu di komputer sendiri

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Masuk dengan `APP_PASSWORD` kamu, lalu **tambahkan satu momen** lengkap dengan foto.

Lalu buktikan datanya benar-benar tersimpan:

- Buka spreadsheet `CaptureMoment DB` — harus ada baris baru berisi judul dan cerita momenmu.
- Buka folder `CaptureMoment Photos` di Drive — harus ada file fotonya.

Kalau keduanya ada, koneksi Google sudah benar. Hentikan server dengan `Ctrl+C`.

**Kalau muncul error:** biasanya salah satu nilai di `.env.local` tertukar atau ada spasi berlebih. Pesan errornya menyebutkan variabel mana yang bermasalah.

---

## Bagian 5 — Online-kan di Vercel

### 5.1 Unggah kode ke GitHub

1. Buka [github.com/new](https://github.com/new).
2. Nama repository: `capturemoment`. Pilih **Private** — ini penting, kode dan konfigurasimu tidak perlu dilihat publik.
3. **Jangan** centang "Add a README file". Klik **Create repository**.
4. GitHub menampilkan beberapa perintah. Yang kamu butuhkan:

```bash
git remote add origin https://github.com/USERNAME-KAMU/capturemoment.git
```

Ganti `USERNAME-KAMU` dengan username GitHub-mu.

5. Cek dulu nama branch aktif kamu, karena ini menentukan perintah berikutnya:

```bash
git branch --show-current
```

6. Kirim branch itu ke GitHub. Ganti `NAMA-BRANCH` dengan hasil perintah di atas:

```bash
git push -u origin NAMA-BRANCH
```

Kalau diminta login, ikuti petunjuk di layar.

> File `.env.local` tidak ikut terkirim. Rahasianya nanti diisi langsung di Vercel.

> **Pastikan branch yang kamu kirim berisi versi terbaru.** Kalau kamu mengerjakan perbaikan di branch terpisah, gabungkan dulu ke branch utama sebelum deploy, atau pilih branch tersebut sebagai Production Branch di pengaturan Vercel.

### 5.2 Deploy

1. Buka [vercel.com/new](https://vercel.com/new).
2. Pilih repository `capturemoment` → **Import**.
3. Vercel otomatis mengenali ini project Next.js. Jangan ubah apa pun di bagian Build.
4. Buka bagian **Environment Variables**. Masukkan **7 variabel** ini satu per satu, nilainya sama persis dengan `.env.local`:

   `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_REFRESH_TOKEN` · `SHEET_ID` · `DRIVE_FOLDER_ID` · `APP_PASSWORD` · `AUTH_SECRET`

5. Klik **Deploy** dan tunggu 1–2 menit.

Selesai. Album kamu online di `https://capturemoment-xxxx.vercel.app`.

> **Jangan mengisi `DEMO_MODE=true` di Vercel.** Kombinasi mode demo dengan kredensial Google yang aktif membuat siapa pun bisa masuk tanpa password.

### 5.3 Uji hasil deploy

Buka URL-nya, login, lalu tambahkan satu momen. Kalau muncul di album dan datanya masuk ke spreadsheet, semuanya beres.

Bagikan URL dan password ke keluarga. Di HP, buka URL-nya lalu pilih **"Add to Home Screen"** agar album muncul seperti aplikasi biasa.

---

## Bagian 6 (opsional) — Bot Telegram

Setelah aktif, kirim foto + caption ke bot dan momen langsung masuk album. Langkah lengkapnya ada di [SETUP.md bagian Langkah 8](./SETUP.md).

Ringkasnya: buat bot lewat [@BotFather](https://t.me/BotFather), simpan token dan secret ke Environment Variables di Vercel, jalankan `node scripts/setup-telegram.mjs https://url-kamu.vercel.app`, lalu kirim pesan ke bot untuk mendapatkan ID chat yang perlu didaftarkan.

---

## Perawatan rutin

Hampir tidak ada. Beberapa hal yang mungkin muncul seiring waktu:

**Kalau password bocor.** Ubah `APP_PASSWORD` di Environment Variables Vercel, lalu deploy ulang. Semua perangkat otomatis logout dan harus login dengan password baru.

**Kalau penyimpanan hampir penuh.** Buka `/archive` di album untuk melihat pemakaian, dan kosongkan tempat sampah. Kalau tetap kurang, Google One paket 100 GB harganya sekitar Rp 30.000-an per bulan (cek harga terkini di [one.google.com](https://one.google.com)) — tapi dengan kompresi otomatis, 15 GB seharusnya bertahan bertahun-tahun.

**Backup.** Halaman `/archive` bisa mengekspor semua cerita ke file JSON dan CSV. Simpan sesekali. Foto aslinya sendiri sudah aman di Google Drive, jadi tidak ikut dalam file ekspor.

**Memperbarui kode.** Setiap kali kamu `git push`, Vercel otomatis men-deploy versi terbaru. Tidak ada langkah tambahan.

---

## Kalau ada yang tidak beres

| Gejala | Penyebab tersering |
|---|---|
| "GOOGLE_CLIENT_ID belum diisi" | Ada variabel yang belum diisi di Vercel, atau namanya salah ketik |
| Album kosong padahal sudah menambah momen | `SHEET_ID` menunjuk spreadsheet yang berbeda |
| Foto tidak muncul, hanya kotak kosong | `DRIVE_FOLDER_ID` salah, atau foto dipindah keluar dari folder itu |
| Tiba-tiba diminta login terus | OAuth consent screen masih berstatus "Testing" — publikasikan (langkah 3.3) |
| Video gagal diunggah | Melebihi 4 MB. Unggah video besar langsung ke folder Drive album |
| Halaman putih dengan tulisan error | Cek tab **Logs** di dashboard Vercel untuk melihat penyebabnya |

---

## Ringkasan biaya

Nol rupiah. Tanpa kartu kredit, tanpa masa percobaan, tanpa tagihan mengejutkan — karena Vercel menghentikan sementara alih-alih menagih, dan Google API tidak meminta billing account.

Satu-satunya pengeluaran yang mungkin muncul suatu hari: Google One kalau penyimpanan penuh (bertahun-tahun lagi), atau domain sendiri kalau kamu bosan dengan alamat `.vercel.app`. Keduanya sepenuhnya opsional.
