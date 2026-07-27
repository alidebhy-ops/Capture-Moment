/* eslint-disable @next/next/no-img-element -- The login collage uses responsive art-directed crops. */
"use client";

import { ArrowRight, BookHeart, Eye, EyeOff, ImageIcon, LoaderCircle, LockKeyhole, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"password" | "demo" | "">("");

  async function login(payload: { password?: string; demo?: boolean }, kind: "password" | "demo") {
    setLoading(kind);
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Belum bisa membuka ruang kenangan");
      router.push("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak bisa terhubung ke server");
      setLoading("");
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="Cuplikan momen keluarga">
        <div className="login-collage">
          <div className="login-photo tall"><img src="/demo/home.jpg" alt="Keluarga menikmati senja di pantai" /><span><ImageIcon size={14} /> Mei 2026</span></div>
          <div className="login-photo"><img src="/demo/mountain.jpg" alt="Perjalanan ke pegunungan" /></div>
          <div className="login-photo"><img src="/demo/birthday.jpg" alt="Perayaan bersama keluarga" /><span><Play size={13} fill="currentColor" /> 00:24</span></div>
        </div>
        <div className="login-quote">
          <BookHeart size={25} />
          <blockquote>“Suatu hari, hal-hal kecil hari ini akan menjadi cerita yang paling ingin kita ingat.”</blockquote>
          <p>Foto, video, tempat, dan cerita—dalam satu ruang keluarga.</p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel-inner">
          <div className="login-brand"><span className="brand-mark"><BookHeart size={20} /></span><span><strong>Capture</strong>Moment</span></div>
          <div className="login-heading">
            <span className="login-lock"><LockKeyhole size={19} /></span>
            <p className="eyebrow">Ruang pribadi keluarga</p>
            <h1>Selamat datang kembali.</h1>
            <p>Masukkan password keluarga untuk membuka semua kenangan.</p>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); login({ password }, "password"); }} className="login-form">
            <label htmlFor="password">Password keluarga</label>
            <div className="password-input">
              <LockKeyhole size={18} />
              <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan password" required autoFocus />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="primary-button login-submit" disabled={Boolean(loading)}>
              {loading === "password" ? <LoaderCircle size={18} className="spin" /> : <LockKeyhole size={17} />}
              Buka ruang kenangan
            </button>
          </form>

          <div className="demo-divider"><span>atau lihat aplikasi lengkap</span></div>
          <button type="button" className="demo-login-button" onClick={() => login({ demo: true }, "demo")} disabled={Boolean(loading)}>
            <span><span className="demo-pulse" /><strong>Masuk ke preview demo</strong><small>Berisi foto, video, cerita, koleksi, dan peta.</small></span>
            {loading === "demo" ? <LoaderCircle size={19} className="spin" /> : <ArrowRight size={19} />}
          </button>

          <p className="privacy-note"><LockKeyhole size={13} /> Hanya anggota keluarga yang memiliki akses.</p>
        </div>
      </section>
    </main>
  );
}
