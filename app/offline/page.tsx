import Link from "next/link";
import { BookHeart, RefreshCw, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <Link href="/" className="brand-lockup">
        <span className="brand-mark"><BookHeart size={20} /></span>
        <span><strong>Capture</strong>Moment</span>
      </Link>
      <section>
        <span><WifiOff size={28} /></span>
        <p className="eyebrow">Capture Pocket</p>
        <h1>Koneksi sedang beristirahat.</h1>
        <p>
          Draft ceritamu tetap aman di perangkat. Sambungkan internet untuk
          membuka arsip kita atau mengunggah media.
        </p>
        <Link href="/" className="primary-button"><RefreshCw size={17} /> Coba lagi</Link>
      </section>
    </main>
  );
}
