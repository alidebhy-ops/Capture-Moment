"use client";

import { RefreshCcw, TriangleAlert } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="state-card">
      <TriangleAlert size={28} />
      <h1>Halaman ini belum bisa dimuat</h1>
      <p>
        Biasanya ini karena koneksi ke Google Sheets atau Drive sedang
        terganggu. Coba muat ulang sebentar lagi — tidak ada kenangan yang
        hilang.
      </p>
      {error.digest && (
        <p className="state-card-detail">Kode kesalahan: {error.digest}</p>
      )}
      <button type="button" className="primary-button" onClick={reset}>
        <RefreshCcw size={17} /> Coba lagi
      </button>
    </div>
  );
}
