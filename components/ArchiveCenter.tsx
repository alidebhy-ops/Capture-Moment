"use client";

import {
  ArchiveRestore,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Download,
  FileJson2,
  FileSpreadsheet,
  HardDrive,
  Heart,
  Images,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FamilyMember } from "@/lib/family-types";
import { formatDateID } from "@/lib/format";
import type { Moment, Plan } from "@/lib/types";

type ArchiveCenterProps = {
  initialMoments: Moment[];
  plans: Plan[];
  members: FamilyMember[];
  dataError?: string;
};

export default function ArchiveCenter({
  initialMoments,
  plans,
  members,
  dataError,
}: ArchiveCenterProps) {
  const router = useRouter();
  const [moments, setMoments] = useState(initialMoments);
  const [restoringIds, setRestoringIds] = useState<string[]>([]);
  const [restoreError, setRestoreError] = useState("");

  const activeMoments = useMemo(
    () => moments.filter((moment) => !moment.deletedAt),
    [moments]
  );
  const deletedMoments = useMemo(
    () => moments.filter((moment) => Boolean(moment.deletedAt)),
    [moments]
  );
  const favoriteMoments = useMemo(
    () => activeMoments.filter((moment) => moment.favorite),
    [activeMoments]
  );
  const mediaReferences = useMemo(
    () =>
      activeMoments.reduce(
        (total, moment) => total + moment.media.length,
        0
      ),
    [activeMoments]
  );
  const completeMoments = useMemo(
    () =>
      activeMoments.filter(
        (moment) =>
          moment.title &&
          moment.story &&
          moment.date &&
          moment.media.length > 0
      ).length,
    [activeMoments]
  );
  const completeness = activeMoments.length
    ? Math.round((completeMoments / activeMoments.length) * 100)
    : 100;
  const activePlans = plans.filter((plan) => plan.status !== "completed");

  async function restoreMoment(moment: Moment) {
    if (restoringIds.includes(moment.id)) return;
    const previousDeletedAt = moment.deletedAt || new Date().toISOString();

    setRestoreError("");
    setRestoringIds((current) => [...current, moment.id]);
    setMoments((current) =>
      current.map((item) =>
        item.id === moment.id ? { ...item, deletedAt: "" } : item
      )
    );

    try {
      const response = await fetch(`/api/moments/${moment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deletedAt: "" }),
      });
      const payload = (await response.json().catch(() => null)) as {
        moment?: Moment;
        error?: string;
      } | null;
      if (!response.ok || !payload?.moment) {
        throw new Error(payload?.error || "Momen belum dapat dipulihkan.");
      }
      setMoments((current) =>
        current.map((item) =>
          item.id === moment.id ? payload.moment! : item
        )
      );
      router.refresh();
    } catch (error) {
      setMoments((current) =>
        current.map((item) =>
          item.id === moment.id
            ? { ...item, deletedAt: previousDeletedAt }
            : item
        )
      );
      setRestoreError(
        error instanceof Error
          ? error.message
          : "Momen belum dapat dipulihkan."
      );
    } finally {
      setRestoringIds((current) =>
        current.filter((id) => id !== moment.id)
      );
    }
  }

  async function purgeMoment(moment: Moment) {
    if (restoringIds.includes(moment.id)) return;
    const confirmed = window.confirm(
      `Hapus permanen "${moment.title}"?\n\nCerita ini dan ${moment.media.length} media di Google Drive akan dihapus dan tidak bisa dipulihkan.`
    );
    if (!confirmed) return;

    setRestoreError("");
    setRestoringIds((current) => [...current, moment.id]);

    try {
      const response = await fetch(
        `/api/moments/${moment.id}?permanent=true`,
        { method: "DELETE" }
      );
      const payload = (await response.json().catch(() => null)) as {
        moment?: Moment;
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Momen belum dapat dihapus permanen.");
      }
      setMoments((current) =>
        current.filter((item) => item.id !== moment.id)
      );
      router.refresh();
    } catch (error) {
      setRestoreError(
        error instanceof Error
          ? error.message
          : "Momen belum dapat dihapus permanen."
      );
    } finally {
      setRestoringIds((current) => current.filter((id) => id !== moment.id));
    }
  }

  function renderMomentList(
    list: Moment[],
    emptyMessage: string,
    restore = false
  ) {
    if (list.length === 0) {
      return <p className="archive-empty">{emptyMessage}</p>;
    }

    return (
      <div className="archive-moment-list">
        {list.map((moment) => (
          <article className="archive-moment-row" key={moment.id}>
            <div
              className={`archive-moment-symbol${moment.favorite ? " archive-is-favorite" : ""}`}
              aria-hidden="true"
            >
              {restore ? (
                <Trash2 size={17} />
              ) : moment.favorite ? (
                <Heart size={17} fill="currentColor" />
              ) : (
                <Images size={17} />
              )}
            </div>
            <div className="archive-moment-copy">
              <strong>{moment.title}</strong>
              <span>
                {formatDateID(moment.date)}
                {moment.locationName ? ` · ${moment.locationName}` : ""}
              </span>
            </div>
            {restore ? (
              <div className="archive-trash-actions">
                <button
                  type="button"
                  className="archive-restore-button"
                  onClick={() => restoreMoment(moment)}
                  disabled={restoringIds.includes(moment.id)}
                >
                  <RefreshCcw
                    size={15}
                    className={
                      restoringIds.includes(moment.id)
                        ? "archive-is-spinning"
                        : undefined
                    }
                  />
                  {restoringIds.includes(moment.id)
                    ? "Memulihkan"
                    : "Pulihkan"}
                </button>
                <button
                  type="button"
                  className="archive-purge-button"
                  onClick={() => purgeMoment(moment)}
                  disabled={restoringIds.includes(moment.id)}
                >
                  <Trash2 size={15} />
                  Hapus permanen
                </button>
              </div>
            ) : (
              <Link
                href={`/moment/${moment.id}`}
                className="archive-row-link"
                aria-label={`Buka ${moment.title}`}
              >
                <ArrowRight size={17} />
              </Link>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="archive-page">
      <header className="archive-hero">
        <div className="archive-hero-copy">
          <p className="archive-eyebrow">
            <ArchiveRestore size={15} />
            Pusat arsip keluarga
          </p>
          <h1>Jaga cerita tetap utuh, mudah ditemukan, dan bisa dibawa.</h1>
          <p>
            Pantau kesehatan arsip, unduh salinan data, dan pulihkan momen
            yang belum siap dilepas.
          </p>
        </div>
        <div className="archive-hero-seal" aria-label="Status arsip sehat">
          <ShieldCheck size={29} />
          <span>
            <strong>{completeness}%</strong>
            cerita lengkap
          </span>
        </div>
      </header>

      {(dataError || restoreError) && (
        <div className="archive-alert" role="alert">
          {restoreError || dataError}
        </div>
      )}

      <section className="archive-stat-grid" aria-label="Ringkasan arsip">
        <article className="archive-stat-card">
          <span className="archive-stat-icon">
            <BookOpenText size={19} />
          </span>
          <div>
            <strong>{activeMoments.length}</strong>
            <p>Momen aktif</p>
          </div>
        </article>
        <article className="archive-stat-card">
          <span className="archive-stat-icon">
            <Heart size={19} />
          </span>
          <div>
            <strong>{favoriteMoments.length}</strong>
            <p>Cerita favorit</p>
          </div>
        </article>
        <article className="archive-stat-card">
          <span className="archive-stat-icon">
            <Images size={19} />
          </span>
          <div>
            <strong>{mediaReferences}</strong>
            <p>Referensi media</p>
          </div>
        </article>
        <article className="archive-stat-card">
          <span className="archive-stat-icon">
            <Trash2 size={19} />
          </span>
          <div>
            <strong>{deletedMoments.length}</strong>
            <p>Di tempat sampah</p>
          </div>
        </article>
      </section>

      <section className="backup-panel">
        <div className="backup-heading">
          <div>
            <p className="archive-eyebrow">
              <Download size={15} />
              Backup mandiri
            </p>
            <h2>Bawa pulang salinan data keluarga</h2>
          </div>
          <span className="backup-ready">
            <CheckCircle2 size={15} />
            Siap diunduh
          </span>
        </div>

        <div className="backup-action-grid">
          <a
            className="backup-action"
            href="/api/export?format=json"
            download
          >
            <span className="backup-action-icon">
              <FileJson2 size={24} />
            </span>
            <span>
              <strong>Backup JSON</strong>
              <small>
                Momen, sampah, rencana, profil, kapsul tersanitasi, komentar,
                dan reaksi.
              </small>
            </span>
            <Download size={18} />
          </a>
          <a
            className="backup-action"
            href="/api/export?format=csv"
            download
          >
            <span className="backup-action-icon">
              <FileSpreadsheet size={24} />
            </span>
            <span>
              <strong>Daftar momen CSV</strong>
              <small>
                Metadata momen siap dibuka di Excel atau Google Sheets.
              </small>
            </span>
            <Download size={18} />
          </a>
          <Link className="backup-action" href="/photobook">
            <span className="backup-action-icon">
              <BookOpenText size={24} />
            </span>
            <span>
              <strong>Buat photobook</strong>
              <small>
                Susun semua momen dari tahun pilihan menjadi buku siap cetak.
              </small>
            </span>
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="backup-drive-note">
          <HardDrive size={19} />
          <p>
            <strong>Foto dan video tidak disalin ke file backup.</strong>{" "}
            Ekspor menyimpan ID referensi media; berkas aslinya tetap berada
            di Google Drive. Simpan backup Drive secara terpisah untuk salinan
            media yang benar-benar lengkap. Pesan kapsul yang masih tersegel
            juga tetap dirahasiakan sampai tanggal buka.
          </p>
        </div>
      </section>

      <section className="archive-health-grid">
        <article className="archive-health-card">
          <span>
            <CalendarDays size={18} />
            Aktivitas
          </span>
          <strong>{activePlans.length} rencana aktif</strong>
          <p>
            {plans.length - activePlans.length} rencana telah selesai dan
            tersimpan sebagai bagian perjalanan keluarga.
          </p>
        </article>
        <article className="archive-health-card">
          <span>
            <Users size={18} />
            Keluarga
          </span>
          <strong>{members.length} profil anggota</strong>
          <p>
            Identitas penulis dan orang di dalam cerita ikut tersimpan pada
            backup terstruktur.
          </p>
        </article>
        <article className="archive-health-card">
          <span>
            <ShieldCheck size={18} />
            Kelengkapan
          </span>
          <strong>
            {completeMoments} dari {activeMoments.length} momen lengkap
          </strong>
          <p>
            Lengkap berarti memiliki judul, cerita, tanggal, dan sedikitnya
            satu referensi foto atau video.
          </p>
        </article>
      </section>

      <div className="archive-list-grid">
        <section className="archive-list-card">
          <div className="archive-list-heading">
            <div>
              <p className="archive-eyebrow">Perpustakaan</p>
              <h2>Momen aktif</h2>
            </div>
            <span>{activeMoments.length}</span>
          </div>
          {renderMomentList(
            activeMoments,
            "Belum ada momen aktif di arsip."
          )}
        </section>

        <section className="archive-list-card">
          <div className="archive-list-heading">
            <div>
              <p className="archive-eyebrow">Pilihan keluarga</p>
              <h2>Favorit</h2>
            </div>
            <span>{favoriteMoments.length}</span>
          </div>
          {renderMomentList(
            favoriteMoments,
            "Belum ada momen yang ditandai sebagai favorit."
          )}
        </section>

        <section className="archive-list-card archive-trash-card">
          <div className="archive-list-heading">
            <div>
              <p className="archive-eyebrow">Dapat dipulihkan</p>
              <h2>Tempat sampah</h2>
            </div>
            <span>{deletedMoments.length}</span>
          </div>
          {renderMomentList(
            deletedMoments,
            "Tempat sampah kosong. Semua cerita aman di perpustakaan.",
            true
          )}
        </section>
      </div>

      <style jsx global>{`
        .archive-page {
          width: min(100%, 1220px);
          margin: 0 auto;
        }
        .archive-hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 38px;
          padding: clamp(28px, 5vw, 56px);
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 28px;
          background:
            radial-gradient(circle at 88% 8%, rgba(var(--accent-rgb), 0.19), transparent 31%),
            linear-gradient(135deg, var(--warning-soft) 0%, var(--surface-muted) 100%);
          box-shadow: var(--shadow-md);
        }
        .archive-hero-copy {
          max-width: 760px;
        }
        .archive-eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0 0 9px;
          color: var(--accent-deep);
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .archive-hero h1 {
          max-width: 760px;
          margin: 0;
          font-family: var(--font-display), serif;
          font-size: clamp(2.2rem, 5.2vw, 4.65rem);
          font-weight: 560;
          line-height: 1.02;
          letter-spacing: -0.035em;
        }
        .archive-hero-copy > p:last-child {
          max-width: 640px;
          margin: 20px 0 0;
          color: var(--ink-soft);
          font-size: 0.9rem;
          line-height: 1.75;
        }
        .archive-hero-seal {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 12px;
          min-width: 176px;
          padding: 17px 19px;
          border: 1px solid color-mix(in srgb, var(--success) 30%, var(--line));
          border-radius: 18px;
          background: color-mix(in srgb, var(--success-soft) 82%, transparent);
          color: var(--success-ink);
          box-shadow: var(--shadow-sm);
          backdrop-filter: blur(8px);
        }
        .archive-hero-seal span {
          display: grid;
          gap: 2px;
          font-size: 0.66rem;
        }
        .archive-hero-seal strong {
          font-family: var(--font-display), serif;
          font-size: 1.45rem;
          line-height: 1;
        }
        .archive-alert {
          margin-top: 16px;
          padding: 13px 15px;
          border: 1px solid color-mix(in srgb, var(--danger) 42%, var(--line));
          border-radius: 12px;
          background: var(--danger-soft);
          color: var(--danger);
          font-size: 0.72rem;
        }
        .archive-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }
        .archive-stat-card {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 17px;
          border: 1px solid var(--line);
          border-radius: 17px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }
        .archive-stat-icon {
          display: grid;
          flex: 0 0 42px;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 13px;
          background: var(--accent-soft);
          color: var(--accent-deep);
        }
        .archive-stat-card strong {
          display: block;
          font-family: var(--font-display), serif;
          font-size: 1.55rem;
          font-weight: 600;
          line-height: 1;
        }
        .archive-stat-card p {
          margin: 5px 0 0;
          color: var(--ink-soft);
          font-size: 0.67rem;
        }
        .backup-panel {
          margin-top: 48px;
          padding: clamp(22px, 4vw, 38px);
          border: 1px solid var(--line);
          border-radius: 24px;
          background: var(--surface);
          box-shadow: var(--shadow-md);
        }
        .backup-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }
        .backup-heading h2,
        .archive-list-heading h2 {
          margin: 0;
          font-family: var(--font-display), serif;
          font-size: clamp(1.45rem, 2.6vw, 2.05rem);
          font-weight: 570;
        }
        .backup-ready {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 999px;
          background: var(--success-soft);
          color: var(--success-ink);
          font-size: 0.65rem;
          font-weight: 750;
        }
        .backup-action-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 13px;
        }
        .backup-action {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          min-height: 102px;
          padding: 16px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--surface);
          color: var(--ink);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease;
        }
        .backup-action:hover {
          transform: translateY(-2px);
          border-color: var(--accent);
          box-shadow: var(--shadow-sm);
        }
        .backup-action-icon {
          display: grid;
          width: 45px;
          height: 45px;
          place-items: center;
          border-radius: 14px;
          background: var(--accent-soft);
          color: var(--accent-deep);
        }
        .backup-action strong {
          display: block;
          margin-bottom: 5px;
          font-size: 0.77rem;
        }
        .backup-action small {
          display: block;
          color: var(--ink-soft);
          font-size: 0.62rem;
          line-height: 1.5;
        }
        .backup-action > svg {
          color: var(--accent);
        }
        .backup-drive-note {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-top: 17px;
          padding: 14px 16px;
          border-radius: 14px;
          background: var(--surface-muted);
          color: var(--ink-soft);
        }
        .backup-drive-note > svg {
          flex: 0 0 auto;
          color: var(--sage);
        }
        .backup-drive-note p {
          margin: 0;
          font-size: 0.67rem;
          line-height: 1.6;
        }
        .backup-drive-note strong {
          color: var(--ink);
        }
        .archive-health-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }
        .archive-health-card {
          padding: 19px;
          border: 1px solid var(--line);
          border-radius: 17px;
          background: var(--surface-muted);
        }
        .archive-health-card > span {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 13px;
          color: var(--accent-deep);
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
        }
        .archive-health-card strong {
          display: block;
          font-size: 0.85rem;
        }
        .archive-health-card p {
          margin: 7px 0 0;
          color: var(--ink-soft);
          font-size: 0.66rem;
          line-height: 1.55;
        }
        .archive-list-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-top: 48px;
        }
        .archive-list-card {
          padding: 22px;
          border: 1px solid var(--line);
          border-radius: 20px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }
        .archive-trash-card {
          grid-column: 1 / -1;
        }
        .archive-list-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 17px;
          border-bottom: 1px solid var(--line);
        }
        .archive-list-heading > span {
          display: grid;
          width: 32px;
          height: 32px;
          place-items: center;
          border-radius: 10px;
          background: var(--accent-soft);
          color: var(--accent-deep);
          font-size: 0.68rem;
          font-weight: 800;
        }
        .archive-moment-list {
          display: grid;
        }
        .archive-moment-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 11px;
          padding: 13px 0;
          border-bottom: 1px solid var(--line);
        }
        .archive-moment-row:last-child {
          border-bottom: 0;
        }
        .archive-moment-symbol {
          display: grid;
          width: 37px;
          height: 37px;
          place-items: center;
          border-radius: 12px;
          background: var(--surface-muted);
          color: var(--ink-soft);
        }
        .archive-moment-symbol.archive-is-favorite {
          background: var(--accent-soft);
          color: var(--accent);
        }
        .archive-moment-copy {
          min-width: 0;
        }
        .archive-moment-copy strong,
        .archive-moment-copy span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .archive-moment-copy strong {
          font-size: 0.73rem;
        }
        .archive-moment-copy span {
          margin-top: 4px;
          color: var(--ink-soft);
          font-size: 0.61rem;
        }
        .archive-row-link,
        .archive-restore-button,
        .archive-purge-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 35px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: var(--surface);
          color: var(--accent-deep);
        }
        .archive-row-link {
          width: 35px;
        }
        .archive-restore-button,
        .archive-purge-button {
          padding: 0 11px;
          font-size: 0.63rem;
          font-weight: 750;
        }
        .archive-trash-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .archive-purge-button {
          color: var(--danger, #a32d2d);
        }
        .archive-purge-button:hover:not(:disabled) {
          border-color: var(--danger, #a32d2d);
        }
        .archive-restore-button:disabled,
        .archive-purge-button:disabled {
          cursor: wait;
          opacity: 0.62;
        }
        .archive-empty {
          margin: 0;
          padding: 27px 10px 8px;
          color: var(--ink-soft);
          font-size: 0.68rem;
          text-align: center;
        }
        .archive-is-spinning {
          animation: archive-spin 0.8s linear infinite;
        }
        @keyframes archive-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 980px) {
          .archive-stat-grid,
          .backup-action-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .backup-action:last-child {
            grid-column: 1 / -1;
          }
          .archive-health-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 760px) {
          .archive-hero {
            display: grid;
            padding: 27px 22px;
            border-radius: 21px;
          }
          .archive-hero-seal {
            width: 100%;
          }
          .archive-stat-grid,
          .archive-list-grid {
            grid-template-columns: 1fr;
          }
          .archive-trash-card {
            grid-column: auto;
          }
          .backup-panel {
            margin-top: 34px;
            border-radius: 20px;
          }
          .backup-heading {
            align-items: flex-start;
          }
          .archive-list-grid {
            margin-top: 34px;
          }
        }
        @media (max-width: 520px) {
          .archive-stat-grid,
          .backup-action-grid {
            grid-template-columns: 1fr;
          }
          .backup-action:last-child {
            grid-column: auto;
          }
          .backup-ready {
            display: none;
          }
          .archive-list-card {
            padding: 18px 15px;
          }
          .archive-restore-button {
            width: 35px;
            padding: 0;
            font-size: 0;
          }
        }
      `}</style>
    </div>
  );
}
