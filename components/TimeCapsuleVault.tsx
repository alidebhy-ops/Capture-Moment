"use client";

import {
  CalendarDays,
  Clock3,
  Gift,
  Heart,
  Lock,
  Mail,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CAPSULE_THEMES,
  type CapsuleTheme,
  type TimeCapsule,
} from "@/lib/experience-types";

type TimeCapsuleVaultProps = {
  initialCapsules: TimeCapsule[];
  nowIso: string;
};

type CapsuleFormState = {
  title: string;
  message: string;
  unlockAt: string;
  recipients: string;
  creatorLabel: string;
  theme: CapsuleTheme;
};

type CapsuleDialog =
  | { mode: "create" }
  | { mode: "edit"; capsule: TimeCapsule };

const THEME_META: Record<
  CapsuleTheme,
  { label: string; description: string; icon: ReactNode }
> = {
  surat: {
    label: "Surat",
    description: "Pesan untuk dibaca kemudian",
    icon: <Mail size={18} />,
  },
  harapan: {
    label: "Harapan",
    description: "Doa dan mimpi keluarga",
    icon: <Sparkles size={18} />,
  },
  perayaan: {
    label: "Perayaan",
    description: "Kejutan untuk hari istimewa",
    icon: <Gift size={18} />,
  },
  warisan: {
    label: "Warisan",
    description: "Nilai dan cerita lintas generasi",
    icon: <Heart size={18} />,
  },
};

function futureInput(nowIso: string): string {
  const date = new Date(nowIso);
  date.setUTCDate(date.getUTCDate() + 30);
  date.setUTCHours(9, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function localDateTimeInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptyForm(nowIso: string): CapsuleFormState {
  return {
    title: "",
    message: "",
    unlockAt: futureInput(nowIso),
    recipients: "",
    creatorLabel: "Akbar",
    theme: "surat",
  };
}

function editForm(capsule: TimeCapsule): CapsuleFormState {
  return {
    title: capsule.title,
    message: capsule.isUnlocked ? capsule.message ?? "" : "",
    unlockAt: localDateTimeInput(capsule.unlockAt),
    recipients: capsule.recipientMemberIds.join(", "),
    creatorLabel: capsule.creatorLabel,
    theme: capsule.theme,
  };
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function countdown(unlockAt: string, now: number): string {
  const distance = new Date(unlockAt).getTime() - now;
  if (!Number.isFinite(distance) || distance <= 0) return "Siap dibuka";
  const days = Math.floor(distance / 86_400_000);
  const hours = Math.floor((distance % 86_400_000) / 3_600_000);
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    return `${years} tahun ${remainingMonths} bulan lagi`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months} bulan ${days % 30} hari lagi`;
  }
  if (days > 0) return `${days} hari ${hours} jam lagi`;
  const minutes = Math.max(1, Math.ceil(distance / 60_000));
  return `${hours} jam ${minutes % 60} menit lagi`;
}

async function readResponse<T>(
  response: Response,
  fallback: string
): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(payload?.error || fallback);
  }
  if (!payload) throw new Error(fallback);
  return payload;
}

function sortCapsules(capsules: TimeCapsule[]): TimeCapsule[] {
  return [...capsules].sort((a, b) => {
    if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? 1 : -1;
    return a.unlockAt.localeCompare(b.unlockAt);
  });
}

export default function TimeCapsuleVault({
  initialCapsules,
  nowIso,
}: TimeCapsuleVaultProps) {
  const [capsules, setCapsules] = useState(() =>
    sortCapsules(initialCapsules)
  );
  const [dialog, setDialog] = useState<CapsuleDialog | null>(null);
  const [form, setForm] = useState<CapsuleFormState>(() =>
    emptyForm(nowIso)
  );
  const [openedCapsule, setOpenedCapsule] =
    useState<TimeCapsule | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openingId, setOpeningId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [clock, setClock] = useState(() => new Date(nowIso).getTime());

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!dialog && !openedCapsule) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (openedCapsule) setOpenedCapsule(null);
        else setDialog(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [dialog, openedCapsule]);

  const stats = useMemo(() => {
    const locked = capsules.filter((capsule) => !capsule.isUnlocked);
    return {
      locked: locked.length,
      unlocked: capsules.length - locked.length,
      next: locked[0],
    };
  }, [capsules]);

  function openCreateDialog() {
    setError("");
    setNotice("");
    setForm(emptyForm(new Date(clock).toISOString()));
    setDialog({ mode: "create" });
  }

  function openEditDialog(capsule: TimeCapsule) {
    setError("");
    setNotice("");
    setForm(editForm(capsule));
    setDialog({ mode: "edit", capsule });
  }

  async function submitCapsule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    setSubmitting(true);
    setError("");
    const isEdit = dialog.mode === "edit";
    const parsedUnlockAt = new Date(form.unlockAt);
    const payload: Record<string, unknown> = {
      title: form.title,
      unlockAt: Number.isNaN(parsedUnlockAt.getTime())
        ? form.unlockAt
        : parsedUnlockAt.toISOString(),
      recipientMemberIds: form.recipients
        .split(",")
        .map((recipient) => recipient.trim())
        .filter(Boolean),
      creatorLabel: form.creatorLabel,
      theme: form.theme,
    };
    if (!isEdit || form.message.trim()) {
      payload.message = form.message;
    }

    try {
      const response = await fetch(
        isEdit ? `/api/capsules/${dialog.capsule.id}` : "/api/capsules",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await readResponse<{ capsule: TimeCapsule }>(
        response,
        isEdit
          ? "Kapsul belum dapat diperbarui."
          : "Kapsul belum dapat disimpan."
      );
      setCapsules((current) =>
        sortCapsules(
          isEdit
            ? current.map((capsule) =>
                capsule.id === result.capsule.id
                  ? result.capsule
                  : capsule
              )
            : [result.capsule, ...current]
        )
      );
      setDialog(null);
      setNotice(
        isEdit
          ? "Perubahan kapsul berhasil disimpan."
          : "Kapsul ditutup rapat dan mulai menghitung waktu."
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Terjadi kesalahan."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function openCapsule(capsule: TimeCapsule) {
    setOpeningId(capsule.id);
    setError("");
    try {
      const response = await fetch(`/api/capsules/${capsule.id}`, {
        cache: "no-store",
      });
      const result = await readResponse<{ capsule: TimeCapsule }>(
        response,
        "Kapsul belum dapat dibuka."
      );
      setCapsules((current) =>
        sortCapsules(
          current.map((item) =>
            item.id === result.capsule.id ? result.capsule : item
          )
        )
      );
      setOpenedCapsule(result.capsule);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Terjadi kesalahan."
      );
    } finally {
      setOpeningId("");
    }
  }

  async function deleteCapsule(capsule: TimeCapsule) {
    const confirmed = window.confirm(
      `Hapus kapsul “${capsule.title}”? Pesan di dalamnya tidak dapat dipulihkan.`
    );
    if (!confirmed) return;
    setDeletingId(capsule.id);
    setError("");
    try {
      const response = await fetch(`/api/capsules/${capsule.id}`, {
        method: "DELETE",
      });
      await readResponse<{ success: true }>(
        response,
        "Kapsul belum dapat dihapus."
      );
      setCapsules((current) =>
        current.filter((item) => item.id !== capsule.id)
      );
      setNotice("Kapsul waktu telah dihapus.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Terjadi kesalahan."
      );
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="capsule-page">
      <header className="capsule-hero">
        <div className="capsule-hero-copy">
          <p className="capsule-eyebrow">
            <Sparkles size={14} /> Kapsul waktu keluarga
          </p>
          <h1>Titipkan pesan kepada masa depan.</h1>
          <p>
            Simpan kata-kata yang belum waktunya dibaca. CaptureMoment akan
            menjaganya tetap tersegel sampai hari yang kamu pilih.
          </p>
          <button
            type="button"
            className="capsule-primary-action"
            onClick={openCreateDialog}
          >
            <Plus size={18} /> Buat kapsul baru
          </button>
        </div>
        <div className="capsule-hero-seal" aria-hidden="true">
          <span>
            <Lock size={31} />
          </span>
          <strong>DISEGEL</strong>
          <small>untuk masa depan</small>
        </div>
      </header>

      <section className="capsule-stats" aria-label="Ringkasan kapsul waktu">
        <div>
          <span className="capsule-stat-icon">
            <Lock size={19} />
          </span>
          <strong>{stats.locked}</strong>
          <small>masih tersegel</small>
        </div>
        <div>
          <span className="capsule-stat-icon">
            <Unlock size={19} />
          </span>
          <strong>{stats.unlocked}</strong>
          <small>sudah dapat dibuka</small>
        </div>
        <div className="capsule-stat-next">
          <span className="capsule-stat-icon">
            <Clock3 size={19} />
          </span>
          <strong>
            {stats.next
              ? countdown(stats.next.unlockAt, clock)
              : "Belum ada"}
          </strong>
          <small>
            {stats.next?.title ?? "Buat kapsul pertama untuk keluarga"}
          </small>
        </div>
      </section>

      {(notice || error) && (
        <div
          className={`capsule-notice ${error ? "capsule-notice-error" : ""}`}
          role="status"
        >
          {error ? <Lock size={17} /> : <Sparkles size={17} />}
          <span>{error || notice}</span>
          <button
            type="button"
            aria-label="Tutup pemberitahuan"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <section className="capsule-vault" aria-labelledby="capsule-vault-title">
        <div className="capsule-section-heading">
          <div>
            <p className="capsule-eyebrow">Brankas keluarga</p>
            <h2 id="capsule-vault-title">Pesan yang sedang menunggu.</h2>
          </div>
          <span>{capsules.length} kapsul</span>
        </div>

        {capsules.length ? (
          <div className="capsule-grid">
            {capsules.map((capsule) => {
              const theme = THEME_META[capsule.theme];
              return (
                <article
                  key={capsule.id}
                  className={`capsule-card capsule-theme-${capsule.theme} ${
                    capsule.isUnlocked ? "is-unlocked" : "is-locked"
                  }`}
                >
                  <div className="capsule-card-top">
                    <span className="capsule-theme-icon">{theme.icon}</span>
                    <span className="capsule-status">
                      {capsule.isUnlocked ? (
                        <Unlock size={13} />
                      ) : (
                        <Lock size={13} />
                      )}
                      {capsule.isUnlocked ? "Siap dibuka" : "Tersegel"}
                    </span>
                    <div className="capsule-card-menu">
                      <button
                        type="button"
                        aria-label={`Edit ${capsule.title}`}
                        onClick={() => openEditDialog(capsule)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Hapus ${capsule.title}`}
                        disabled={deletingId === capsule.id}
                        onClick={() => deleteCapsule(capsule)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="capsule-card-body">
                    <small>{theme.label}</small>
                    <h3>{capsule.title}</h3>
                    <p>{theme.description}</p>
                    <dl>
                      <div>
                        <dt>
                          <CalendarDays size={14} /> Buka pada
                        </dt>
                        <dd>{formatDateTime(capsule.unlockAt)}</dd>
                      </div>
                      <div>
                        <dt>
                          <Users size={14} /> Untuk
                        </dt>
                        <dd>
                          {capsule.recipientMemberIds.join(", ") ||
                            "Seluruh keluarga"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="capsule-card-footer">
                    <div>
                      <span>
                        {capsule.isUnlocked
                          ? "Pesan sudah menunggumu"
                          : countdown(capsule.unlockAt, clock)}
                      </span>
                      <small>Dari {capsule.creatorLabel}</small>
                    </div>
                    <button
                      type="button"
                      disabled={openingId === capsule.id}
                      onClick={() => openCapsule(capsule)}
                    >
                      {capsule.isUnlocked ? (
                        <Unlock size={16} />
                      ) : (
                        <Lock size={16} />
                      )}
                      {openingId === capsule.id
                        ? "Membuka…"
                        : capsule.isUnlocked
                          ? "Baca pesan"
                          : "Lihat segel"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="capsule-empty">
            <span>
              <Mail size={26} />
            </span>
            <h3>Brankasnya masih kosong.</h3>
            <p>
              Tulis pesan pertama untuk ulang tahun, kelulusan, atau hari
              sederhana yang ingin dikenang nanti.
            </p>
            <button type="button" onClick={openCreateDialog}>
              <Plus size={17} /> Buat kapsul
            </button>
          </div>
        )}
      </section>

      {dialog && (
        <div
          className="capsule-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialog(null);
          }}
        >
          <section
            className="capsule-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="capsule-dialog-title"
          >
            <header className="capsule-dialog-header">
              <div>
                <p className="capsule-eyebrow">
                  {dialog.mode === "create"
                    ? "Pesan untuk masa depan"
                    : "Perbarui kapsul"}
                </p>
                <h2 id="capsule-dialog-title">
                  {dialog.mode === "create"
                    ? "Buat kapsul waktu"
                    : dialog.capsule.title}
                </h2>
              </div>
              <button
                type="button"
                className="capsule-dialog-close"
                aria-label="Tutup formulir"
                onClick={() => setDialog(null)}
              >
                <X size={18} />
              </button>
            </header>

            <form className="capsule-form" onSubmit={submitCapsule}>
              <div className="capsule-form-grid">
                <label className="capsule-field capsule-field-wide">
                  <span>Judul kapsul</span>
                  <input
                    required
                    maxLength={120}
                    value={form.title}
                    placeholder="Contoh: Untuk Nara di ulang tahun ke-18"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="capsule-field capsule-field-wide">
                  <span>
                    Isi pesan
                    {dialog.mode === "edit" &&
                      !dialog.capsule.isUnlocked && (
                        <small>
                          Kosongkan untuk mempertahankan pesan yang tersegel
                        </small>
                      )}
                  </span>
                  <textarea
                    required={dialog.mode === "create"}
                    maxLength={10_000}
                    rows={7}
                    value={form.message}
                    placeholder={
                      dialog.mode === "edit" &&
                      !dialog.capsule.isUnlocked
                        ? "Isi lama tetap aman dan tidak ditampilkan. Tulis di sini hanya jika ingin menggantinya."
                        : "Tuliskan hal yang ingin mereka dengar saat waktunya tiba…"
                    }
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        message: event.target.value,
                      }))
                    }
                  />
                  <small className="capsule-field-hint">
                    <Lock size={12} /> Isi tidak dikirim ke browser sebelum
                    tanggal buka.
                  </small>
                </label>

                <label className="capsule-field">
                  <span>Tanggal &amp; waktu buka</span>
                  <input
                    required
                    type="datetime-local"
                    value={form.unlockAt}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        unlockAt: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="capsule-field">
                  <span>Pembuat</span>
                  <input
                    required
                    maxLength={80}
                    value={form.creatorLabel}
                    placeholder="Nama atau panggilan"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        creatorLabel: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="capsule-field capsule-field-wide">
                  <span>
                    Penerima
                    <small>Pisahkan dengan koma</small>
                  </span>
                  <input
                    maxLength={1_600}
                    value={form.recipients}
                    placeholder="Nara, Kakak, Seluruh keluarga"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        recipients: event.target.value,
                      }))
                    }
                  />
                </label>

                <fieldset className="capsule-theme-picker capsule-field-wide">
                  <legend>Tema kapsul</legend>
                  <div>
                    {CAPSULE_THEMES.map((theme) => (
                      <label
                        key={theme}
                        className={form.theme === theme ? "is-selected" : ""}
                      >
                        <input
                          type="radio"
                          name="capsule-theme"
                          value={theme}
                          checked={form.theme === theme}
                          onChange={() =>
                            setForm((current) => ({
                              ...current,
                              theme,
                            }))
                          }
                        />
                        <span>{THEME_META[theme].icon}</span>
                        <strong>{THEME_META[theme].label}</strong>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              {error && <p className="capsule-form-error">{error}</p>}

              <footer className="capsule-dialog-actions">
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button type="submit" disabled={submitting}>
                  {dialog.mode === "create" ? (
                    <Send size={16} />
                  ) : (
                    <Pencil size={16} />
                  )}
                  {submitting
                    ? "Menyimpan…"
                    : dialog.mode === "create"
                      ? "Segel kapsul"
                      : "Simpan perubahan"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {openedCapsule && (
        <div
          className="capsule-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpenedCapsule(null);
          }}
        >
          <article
            className={`capsule-open-dialog ${
              openedCapsule.isUnlocked ? "is-unlocked" : "is-locked"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="capsule-open-title"
          >
            <button
              type="button"
              className="capsule-open-close"
              aria-label="Tutup kapsul"
              onClick={() => setOpenedCapsule(null)}
            >
              <X size={18} />
            </button>
            <span className="capsule-open-icon">
              {openedCapsule.isUnlocked ? (
                <Unlock size={30} />
              ) : (
                <Lock size={30} />
              )}
            </span>
            <p className="capsule-eyebrow">
              {openedCapsule.isUnlocked
                ? "Pesan dari masa lalu"
                : "Kapsul masih tersegel"}
            </p>
            <h2 id="capsule-open-title">{openedCapsule.title}</h2>

            {openedCapsule.isUnlocked ? (
              <>
                <div className="capsule-letter">
                  <p>{openedCapsule.message}</p>
                  <footer>
                    Dengan hangat,
                    <strong>{openedCapsule.creatorLabel}</strong>
                  </footer>
                </div>
                <small className="capsule-open-date">
                  Dibuka setelah {formatDateTime(openedCapsule.unlockAt)}
                </small>
              </>
            ) : (
              <>
                <p className="capsule-locked-copy">
                  Isi pesan tidak akan ditampilkan sampai waktu yang sudah
                  ditentukan. Bahkan halaman ini tidak menerima isi rahasianya.
                </p>
                <div className="capsule-countdown">
                  <Clock3 size={19} />
                  <span>
                    <small>Dapat dibuka dalam</small>
                    <strong>
                      {countdown(openedCapsule.unlockAt, clock)}
                    </strong>
                  </span>
                </div>
                <small className="capsule-open-date">
                  {formatDateTime(openedCapsule.unlockAt)}
                </small>
              </>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
