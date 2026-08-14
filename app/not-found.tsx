import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="state-card-page">
      <div className="state-card">
        <Compass size={28} />
        <h1>Halaman ini tidak ditemukan</h1>
        <p>
          Mungkin momennya sudah dipindahkan ke tempat sampah, atau tautannya
          tidak lagi berlaku.
        </p>
        <Link href="/" className="primary-button">
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
