"use client";

import Image from "next/image";
import {
  CalendarDays,
  Check,
  Heart,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useTheme } from "./ThemeProvider";
import {
  getThemeAccent,
  themeAccents,
  type ThemeMode,
} from "@/lib/theme";

const modeOptions = [
  {
    id: "system",
    label: "Ikuti perangkat",
    description: "Berubah otomatis mengikuti pengaturan perangkat.",
    icon: Monitor,
  },
  {
    id: "light",
    label: "Mode terang",
    description: "Tampilan hangat dan terang untuk digunakan siang hari.",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Mode gelap",
    description: "Lebih nyaman untuk membaca cerita pada malam hari.",
    icon: Moon,
  },
] as const;

type PaletteStyle = CSSProperties & {
  "--palette-accent": string;
  "--palette-deep": string;
  "--palette-soft": string;
};

export default function ThemeSettings() {
  const {
    mode,
    accent,
    resolvedTheme,
    setMode,
    setAccent,
    resetTheme,
  } = useTheme();
  const activeAccent = getThemeAccent(accent);
  const activeMode =
    modeOptions.find((option) => option.id === mode) ?? modeOptions[0];

  return (
    <section className="theme-settings-page">
      <header className="page-header-row theme-settings-header">
        <div>
          <p className="eyebrow">Personalisasi ruang keluarga</p>
          <h1>Tampilan yang terasa milikmu.</h1>
          <p>
            Pilih pencahayaan dan warna aksen. Perubahan diterapkan langsung
            ke seluruh halaman dan tetap tersimpan saat kamu kembali.
          </p>
        </div>
        <span className="page-header-icon" aria-hidden="true">
          <Palette size={24} />
        </span>
      </header>

      <div className="theme-settings-layout">
        <div className="theme-settings-controls">
          <section className="theme-setting-card">
            <div className="theme-setting-heading">
              <div>
                <span>01</span>
                <div>
                  <h2>Pencahayaan</h2>
                  <p>Sesuaikan dengan waktu dan kebiasaan membaca.</p>
                </div>
              </div>
              <span className="theme-current-pill">
                {mode === "system" ? (
                  <Monitor size={14} />
                ) : resolvedTheme === "dark" ? (
                  <Moon size={14} />
                ) : (
                  <Sun size={14} />
                )}
                {mode === "system"
                  ? "Mengikuti perangkat"
                  : resolvedTheme === "dark"
                    ? "Gelap aktif"
                    : "Terang aktif"}
              </span>
            </div>

            <div
              className="theme-mode-options"
              role="group"
              aria-label="Pilih mode tampilan"
            >
              {modeOptions.map(
                ({ id, label, description, icon: ModeIcon }) => {
                  const selected = mode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={selected ? "is-selected" : ""}
                      aria-pressed={selected}
                      onClick={() => setMode(id as ThemeMode)}
                    >
                      <span
                        className={`theme-mode-illustration theme-mode-${id}`}
                        aria-hidden="true"
                      >
                        <span />
                        <span>
                          <i />
                          <i />
                        </span>
                      </span>
                      <span className="theme-option-copy">
                        <span>
                          <ModeIcon size={16} />
                          <strong>{label}</strong>
                        </span>
                        <small>{description}</small>
                      </span>
                      <span className="theme-option-check" aria-hidden="true">
                        {selected && <Check size={14} />}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          <section className="theme-setting-card">
            <div className="theme-setting-heading">
              <div>
                <span>02</span>
                <div>
                  <h2>Warna aksen</h2>
                  <p>Memberi karakter pada tombol, tautan, dan penanda.</p>
                </div>
              </div>
              <span className="theme-current-pill">
                <span
                  className="theme-current-dot"
                  style={{ background: activeAccent.colors.accent }}
                />
                {activeAccent.label}
              </span>
            </div>

            <div
              className="theme-accent-options"
              role="group"
              aria-label="Pilih warna aksen"
            >
              {themeAccents.map((option) => {
                const selected = accent === option.id;
                const paletteStyle: PaletteStyle = {
                  "--palette-accent": option.colors.accent,
                  "--palette-deep": option.colors.deep,
                  "--palette-soft": option.colors.soft,
                };

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={selected ? "is-selected" : ""}
                    aria-pressed={selected}
                    onClick={() => setAccent(option.id)}
                    style={paletteStyle}
                  >
                    <span className="theme-palette-swatches" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className="theme-option-check" aria-hidden="true">
                      {selected && <Check size={14} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            className="theme-reset-button"
            onClick={resetTheme}
          >
            <RotateCcw size={16} />
            Kembalikan ke tema bawaan
          </button>
        </div>

        <aside className="theme-live-panel">
          <div className="theme-live-heading">
            <div>
              <p className="eyebrow">Preview langsung</p>
              <h2>Begini ceritamu akan terlihat</h2>
            </div>
            <Sparkles size={19} aria-hidden="true" />
          </div>

          <div className="theme-live-window">
            <div className="theme-live-window-bar" aria-hidden="true">
              <span />
              <span />
              <span />
              <i />
            </div>
            <div className="theme-live-content">
              <div className="theme-live-greeting">
                <div>
                  <small>Sabtu, 18 Juli 2026</small>
                  <strong>Kenangan hari ini</strong>
                </div>
                <span>MA</span>
              </div>

              <article className="theme-memory-preview">
                <Image
                  src="/demo/family.jpg"
                  alt="Keluarga menikmati waktu bersama"
                  fill
                  sizes="(max-width: 760px) 90vw, 420px"
                />
                <span className="theme-memory-shade" />
                <div>
                  <span>
                    <Heart size={12} fill="currentColor" />
                    Favorit keluarga
                  </span>
                  <h3>Piknik kecil di tepi danau</h3>
                  <p>
                    Sore yang sederhana, bekal buatan rumah, dan banyak tawa.
                  </p>
                </div>
              </article>

              <div className="theme-preview-agenda">
                <span>
                  <CalendarDays size={17} />
                </span>
                <div>
                  <small>Rencana berikutnya</small>
                  <strong>Liburan keluarga ke Bira</strong>
                </div>
                <b>12 hari</b>
              </div>
            </div>
          </div>

          <p className="theme-live-status" aria-live="polite">
            Tema <strong>{activeMode.label.toLowerCase()}</strong> dengan
            aksen <strong>{activeAccent.label}</strong> sedang digunakan.
          </p>
        </aside>
      </div>
    </section>
  );
}
