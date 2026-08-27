import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BookHeart,
  CalendarDays,
  Camera,
  History,
  Image as ImageIcon,
  Inbox,
  ListTodo,
  LockKeyhole,
  MapPin,
  MessageCircleHeart,
  Send,
  Trash2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Panduan",
};

const halaman = [
  {
    icon: <History size={20} />,
    nama: "Kilas balik",
    isi: "Menunjukkan momen yang terjadi di tanggal yang sama tahun-tahun sebelumnya. Ada juga tombol acak kalau ingin dikejutkan.",
  },
  {
    icon: <CalendarDays size={20} />,
    nama: "Kalender",
    isi: "Semua momen, rencana, dan surat yang akan terbuka, disusun per tanggal.",
  },
  {
    icon: <ListTodo size={20} />,
    nama: "Rencana",
    isi: "Hal-hal yang ingin kita lakukan nanti. Bisa diisi perkiraan biaya dan daftar persiapan.",
  },
  {
    icon: <LockKeyhole size={20} />,
    nama: "Surat untuk nanti",
    isi: "Tulis pesan yang baru bisa dibuka pada tanggal tertentu. Sebelum tanggalnya tiba, isinya benar-benar tidak bisa dibaca siapa pun.",
  },
  {
    icon: <MapPin size={20} />,
    nama: "Peta momen",
    isi: "Semua tempat yang pernah kita datangi, ditandai di peta. Klik pin untuk membuka ceritanya.",
  },
  {
    icon: <Inbox size={20} />,
    nama: "Smart Inbox",
    isi: "Untuk memasukkan banyak foto sekaligus. Tanggal dan lokasinya dibaca otomatis dari foto.",
  },
];

export default function PanduanPage() {
  return (
    <div className="guide-page">
      <header className="page-header-row">
        <div>
          <p className="eyebrow">Selamat datang</p>
          <h1>Cara memakai ruang ini.</h1>
          <p>
            Tidak ada yang bisa kamu rusak di sini. Semua yang terhapus masih
            bisa dikembalikan, jadi santai saja mencoba.
          </p>
        </div>
        <span className="page-header-icon"><BookHeart size={23} /></span>
      </header>

      <section className="guide-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Paling sering dipakai</p>
            <h2>Menyimpan satu momen</h2>
          </div>
        </div>
        <ol className="guide-steps">
          <li>
            <span className="guide-step-number">1</span>
            <div>
              <strong>Tekan &ldquo;Buat cerita&rdquo;</strong>
              <p>Tombolnya ada di bagian bawah menu kiri, atau di kanan atas kalau kamu membuka dari HP.</p>
            </div>
          </li>
          <li>
            <span className="guide-step-number">2</span>
            <div>
              <strong>Pilih fotonya</strong>
              <p>Boleh lebih dari satu. Foto besar dikecilkan otomatis, jadi tidak perlu diedit dulu.</p>
            </div>
          </li>
          <li>
            <span className="guide-step-number">3</span>
            <div>
              <strong>Tulis judul dan ceritanya</strong>
              <p>Tidak harus panjang. Satu kalimat tentang hal kecil yang ingin diingat sudah cukup.</p>
            </div>
          </li>
          <li>
            <span className="guide-step-number">4</span>
            <div>
              <strong>Tekan &ldquo;Simpan momen&rdquo;</strong>
              <p>Selesai. Momennya langsung muncul di beranda dan bisa dibuka kapan saja.</p>
            </div>
          </li>
        </ol>
        <Link href="/new" className="primary-button">
          <Camera size={18} /> Coba sekarang
        </Link>
      </section>

      <section className="guide-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Khusus pengguna iPhone</p>
            <h2>Supaya lokasinya ikut tersimpan</h2>
          </div>
        </div>
        <div className="guide-callout">
          <span className="guide-callout-icon"><MapPin size={20} /></span>
          <div>
            <p>
              iPhone menghapus informasi lokasi dari foto kecuali kamu
              mengizinkannya. Kalau lokasinya tidak terisi sendiri, ini
              penyebabnya.
            </p>
            <p>
              Saat memilih foto, cari tulisan <strong>Options</strong> di pojok
              kiri atas layar pemilih foto, ketuk, lalu nyalakan{" "}
              <strong>Location</strong>. Setelah itu pilih fotonya seperti biasa.
            </p>
            <p className="guide-callout-note">
              Foto yang dipotret langsung dari dalam aplikasi tidak pernah punya
              lokasi. Pilih dari galeri kalau ingin lokasinya ikut.
            </p>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Kalau sedang malas buka aplikasi</p>
            <h2>Kirim lewat Telegram</h2>
          </div>
        </div>
        <div className="guide-callout">
          <span className="guide-callout-icon"><Send size={20} /></span>
          <div>
            <p>
              Kirim foto ke bot yang sudah disiapkan, beri caption, dan momennya
              langsung masuk ke album.
            </p>
            <p>
              Baris pertama caption jadi judul, sisanya jadi cerita. Kirim
              beberapa foto sekaligus untuk menggabungkannya jadi satu momen,
              lalu kirim lokasi kalau ingin menandai tempatnya.
            </p>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Isi tiap halaman</p>
            <h2>Kalau penasaran menu lainnya</h2>
          </div>
        </div>
        <div className="guide-grid">
          {halaman.map((item) => (
            <article className="guide-card" key={item.nama}>
              <span>{item.icon}</span>
              <div>
                <strong>{item.nama}</strong>
                <p>{item.isi}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Hal-hal kecil</p>
            <h2>Yang sering ditanyakan</h2>
          </div>
        </div>
        <div className="guide-faq">
          <article>
            <span><Trash2 size={18} /></span>
            <div>
              <strong>Aku tidak sengaja menghapus momen</strong>
              <p>
                Tidak hilang. Buka <Link href="/archive">Arsip &amp; backup</Link>,
                momennya ada di bagian tempat sampah dan bisa dipulihkan.
              </p>
            </div>
          </article>
          <article>
            <span><MessageCircleHeart size={18} /></span>
            <div>
              <strong>Bisa saling komentar?</strong>
              <p>
                Bisa. Di bawah setiap cerita ada tempat komentar dan reaksi.
                Pilih dulu kamu yang mana, nanti diingat sendiri.
              </p>
            </div>
          </article>
          <article>
            <span><ImageIcon size={18} /></span>
            <div>
              <strong>Fotonya disimpan di mana?</strong>
              <p>
                Di Google Drive pribadi, bukan di layanan pihak ketiga. Hanya
                bisa dibuka lewat ruang ini.
              </p>
            </div>
          </article>
          <article>
            <span><LockKeyhole size={18} /></span>
            <div>
              <strong>Ada yang bisa lihat selain kita?</strong>
              <p>
                Tidak. Ruang ini terkunci password dan sengaja disembunyikan
                dari mesin pencari.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="guide-closing">
        <p>
          Sudah paham garis besarnya. Sisanya paling enak dipelajari sambil
          jalan.
        </p>
        <Link href="/" className="text-button">
          Mulai dari beranda <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
