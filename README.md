# CaptureMoment

CaptureMoment adalah ruang kenangan keluarga: foto, video, cerita, orang, tempat, dan rencana hidup bersama dalam satu pengalaman yang hangat. Aplikasi langsung berisi data demo realistis ketika credential Google belum diisi.

## Fitur utama

- **Album cerita** — foto/video, cerita panjang, koleksi, tag, suasana, lokasi, favorit, edit, soft-delete, dan pemulihan.
- **Hari Ini di Masa Lalu** — kilas balik berdasarkan tanggal, memory roulette, recap bulanan, dan recap tahunan.
- **Kalender keluarga** — menggabungkan momen, rencana, dan jadwal terbukanya kapsul waktu.
- **Kapsul waktu** — pesan terkunci untuk masa depan; isi tidak dikirim ke browser sebelum tanggal buka.
- **Profil keluarga & People Timeline** — profil anggota serta semua momen yang berkaitan dengan mereka.
- **Cerita kolaboratif** — penulis, orang yang hadir, komentar, dan reaksi pada detail momen.
- **Story Studio** — prompt penulisan, dikte suara, autosave draf lokal, preview media, dan mode edit.
- **Smart Inbox** — impor massal, pembacaan tanggal/GPS EXIF, deteksi duplikat, dan pengelompokan media.
- **Arsip & backup** — health check, trash/restore, ekspor JSON/CSV, serta photobook siap cetak/PDF.
- **Capture Pocket (PWA)** — dapat dipasang di perangkat, shortcut cepat, capture kamera, dan halaman offline.
- **Wishlist & planner** — anggaran, tabungan, checklist, target waktu, dan konversi rencana menjadi momen.
- **Peta perjalanan** — visualisasi seluruh momen berlokasi dengan Leaflet + OpenStreetMap.
- **Bot Telegram** — kirim foto, caption, dan lokasi ke bot; momen langsung masuk album.
- **Tema personal** — mode terang, gelap, otomatis mengikuti perangkat, serta lima pilihan warna aksen yang tersimpan.

## Dokumentasi

- [TUTORIAL.md](./TUTORIAL.md) — panduan lengkap dari nol, termasuk rincian biaya dan persiapan. Mulai dari sini kalau baru pertama kali.
- [SETUP.md](./SETUP.md) — langkah teknis yang ringkas, untuk yang sudah terbiasa.

## Mulai

1. Jalankan `npm install`.
2. Jalankan `npm run dev`.
3. Buka [http://localhost:3000](http://localhost:3000).
4. Pilih **Masuk ke preview demo** untuk menjelajahi semua fitur dan data contoh.

Untuk menyimpan data nyata di Google Drive dan Google Sheets, ikuti [SETUP.md](./SETUP.md).

## Halaman

| Rute | Isi |
|---|---|
| `/` | Beranda, sorotan, statistik, launcher fitur, pencarian, filter, dan linimasa |
| `/memories` | Hari Ini di Masa Lalu, memory roulette, recap bulan/tahun |
| `/calendar` | Kalender gabungan momen, rencana, dan kapsul |
| `/plans` | Wishlist, planner, anggaran, checklist, dan target waktu |
| `/people` | Direktori profil anggota keluarga |
| `/people/[id]` | People Timeline dan semua cerita terkait |
| `/capsules` | Kapsul waktu dan pesan masa depan |
| `/inbox` | Smart Inbox untuk impor media massal |
| `/collections` | Koleksi tematik dan momen favorit |
| `/map` | Peta semua momen dan daftar tempat |
| `/moment/[id]` | Galeri, artikel, orang terkait, komentar, reaksi, dan peta |
| `/moment/[id]/edit` | Edit cerita, media, orang, dan metadata momen |
| `/new` | Story Studio untuk membuat cerita baru |
| `/archive` | Backup, trash, restore, dan pintasan photobook |
| `/photobook` | Album keluarga siap cetak atau simpan sebagai PDF |
| `/settings` | Pengaturan mode tampilan dan warna aksen |
| `/offline` | Pengalaman fallback ketika PWA sedang offline |
| `/login` | Gerbang password keluarga dan akses preview demo |

Endpoint `POST /api/telegram` menerima webhook bot Telegram. Endpoint ini berada di luar gerbang password karena Telegram tidak membawa cookie; keasliannya diverifikasi lewat secret token yang dikirim Telegram di setiap panggilan, ditambah daftar ID chat yang diizinkan.

## Penyimpanan

- Media asli tersimpan di Google Drive.
- Momen dan metadata tersimpan di sheet utama.
- `Plans`, `TimeCapsules`, `Members`, dan `Community` dibuat otomatis sebagai tab tambahan.
- Draf Story Studio tersimpan lokal di perangkat. Smart Inbox membaca dan mengelompokkan media di browser, lalu mengunggahnya saat pengguna memilih **Jadikan momen**.
- Mode demo menggunakan data contoh dan tidak membutuhkan layanan eksternal.

Backup JSON sengaja tidak menyertakan file media asli maupun isi pesan kapsul yang masih tersegel. Media tetap berada di Google Drive dan pesan kapsul baru masuk payload setelah tanggal bukanya.

Profil anggota saat ini adalah identitas di dalam satu ruang keluarga yang memakai password bersama, bukan akun login terpisah. Jika aplikasi akan dipakai banyak keluarga atau membutuhkan izin individual, tambahkan autentikasi per anggota dan database transaksional.

## Validasi

```bash
npm run check
```

Menjalankan lint, typecheck, dan build secara berurutan. Masing-masing juga tersedia sebagai `npm run lint`, `npm run typecheck`, dan `npm run build`.

Untuk memeriksa sambungan ke Google (isi `.env.local`, token, spreadsheet, folder Drive):

```bash
npm run doctor
```

## Teknologi

Next.js 16 (App Router), React 19, TypeScript, Google Drive & Sheets API, Leaflet, EXIF, browser image compression, dan Progressive Web App.
