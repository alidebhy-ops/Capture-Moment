"use client";

/* eslint-disable @next/next/no-img-element -- Demo and Drive-backed covers are dynamic. */
import Link from "next/link";
import {
  CalendarDays,
  Camera,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatDateID } from "@/lib/format";
import { coverThumbSrc } from "@/lib/media";
import {
  type Partner,
  type PartnerDraft,
} from "@/lib/partner-types";
import type { Moment } from "@/lib/types";

type PartnerDirectoryProps = {
  initialMembers: Partner[];
  moments: Moment[];
};

type MemberForm = PartnerDraft;

const AVATAR_COLORS = [
  "#a8573d",
  "#788c79",
  "#c38a48",
  "#667f91",
  "#8f6f83",
  "#8a7354",
];

function initialsFor(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("id-ID") ?? "")
    .join("");
}

function emptyForm(): MemberForm {
  return {
    name: "",
    initials: "",
    relationship: "",
    bio: "",
    birthday: "",
    color: AVATAR_COLORS[0],
    momentIds: [],
  };
}

function formFromMember(member: Partner): MemberForm {
  return {
    name: member.name,
    initials: member.initials,
    relationship: member.relationship,
    bio: member.bio,
    birthday: member.birthday,
    color: member.color,
    momentIds: [...member.momentIds],
  };
}

function apiError(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

function memberStyle(color: string): CSSProperties {
  return { "--partner-color": color } as CSSProperties;
}

export default function PartnerDirectory({
  initialMembers,
  moments,
}: PartnerDirectoryProps) {
  const [members, setMembers] = useState(initialMembers);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");


  const contributions = useMemo(
    () =>
      new Set([
        ...members.flatMap((member) => member.momentIds),
        ...moments
          .filter((moment) =>
            moment.peopleIds?.some((memberId) =>
              members.some((member) => member.id === memberId)
            )
          )
          .map((moment) => moment.id),
      ]).size,
    [members, moments]
  );

  useEffect(() => {
    if (!dialogOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setDialogOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [dialogOpen, saving]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError("");
    setDialogOpen(true);
  }

  function openEdit(member: Partner) {
    setEditing(member);
    setForm(formFromMember(member));
    setError("");
    setDialogOpen(true);
  }

  function updateForm<K extends keyof MemberForm>(
    key: K,
    value: MemberForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");

    const payload: MemberForm = {
      ...form,
      initials: form.initials.trim() || initialsFor(form.name),
    };
    const url = editing ? `/api/members/${editing.id}` : "/api/members";
    try {
      const response = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(apiError(result, "Profil belum dapat disimpan."));
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("member" in result)
      ) {
        throw new Error("Respons profil tidak lengkap.");
      }
      const saved = result.member as Partner;
      setMembers((current) =>
        editing
          ? current.map((member) => (member.id === saved.id ? saved : member))
          : [...current, saved]
      );
      setDialogOpen(false);
      setNotice(
        editing
          ? `Profil ${saved.name} diperbarui.`
          : `${saved.name} bergabung dalam ruang kita.`
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Profil belum dapat disimpan."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(member: Partner) {
    if (
      !window.confirm(
        `Hapus profil ${member.name}? Komentar lama tetap tersimpan sebagai bagian dari arsip.`
      )
    ) {
      return;
    }
    setDeleting(member.id);
    setError("");
    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: "DELETE",
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(apiError(result, "Profil belum dapat dihapus."));
      }
      setMembers((current) =>
        current.filter((item) => item.id !== member.id)
      );
      setNotice(`Profil ${member.name} dihapus.`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Profil belum dapat dihapus."
      );
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="partner-directory" aria-labelledby="partner-directory-title">
      <div className="partner-summary">
        <div className="partner-summary-copy">
          <p className="partner-eyebrow">Lingkaran terdekat</p>
          <h1 id="partner-directory-title">Orang-orang di setiap cerita</h1>
          <p>
            Hubungkan momen dengan profil, lalu lihat perjalanan
            mereka tumbuh menjadi linimasa pribadi.
          </p>
        </div>
        <div className="partner-summary-stats" aria-label="Ringkasan kita">
          <div>
            <UsersRound size={20} />
            <strong>{members.length}</strong>
            <span>anggota</span>
          </div>
          <div>
            <Camera size={20} />
            <strong>{contributions}</strong>
            <span>momen bersama</span>
          </div>
        </div>
      </div>

      <div className="partner-toolbar">
        <button type="button" className="partner-add-button" onClick={openCreate}>
          <Plus size={18} />
          Tambah profil
        </button>
      </div>

      {(notice || error) && (
        <div
          className={error ? "partner-notice partner-notice-error" : "partner-notice"}
          role="status"
        >
          <span>{error || notice}</span>
          <button
            type="button"
            aria-label="Tutup pemberitahuan"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {members.length ? (
        <div className="partner-grid">
          {members.map((member) => {
            const memberMoments = moments
              .filter(
                (moment) =>
                  member.momentIds.includes(moment.id) ||
                  moment.peopleIds?.includes(member.id)
              )
              .sort((a, b) => b.date.localeCompare(a.date));
            const latest = memberMoments[0];
            return (
              <article
                key={member.id}
                className="partner-card-profile"
                style={memberStyle(member.color)}
              >
                <div className="partner-card-head">
                  <span className="partner-avatar" aria-hidden="true">
                    {member.initials || initialsFor(member.name)}
                  </span>
                  <div className="partner-card-identity">
                    <h2>{member.name}</h2>
                    <p>{member.relationship || "Profil kita"}</p>
                  </div>
                </div>

                <p className="partner-card-bio">
                  {member.bio ||
                    "Belum ada catatan singkat. Tambahkan hal kecil yang membuatnya istimewa."}
                </p>

                <div className="partner-timeline-summary">
                  <div>
                    <Camera size={16} />
                    <span>
                      <strong>{memberMoments.length}</strong> momen
                    </span>
                  </div>
                  <div>
                    <CalendarDays size={16} />
                    <span>
                      {latest ? formatDateID(latest.date) : "Belum ada linimasa"}
                    </span>
                  </div>
                </div>

                {memberMoments.length > 0 && (
                  <div className="partner-cover-strip" aria-hidden="true">
                    {memberMoments.slice(0, 3).map((moment) =>
                      coverThumbSrc(moment, 200) ? (
                        <img key={moment.id} src={coverThumbSrc(moment, 200)} alt="" loading="lazy" />
                      ) : (
                        <span key={moment.id}>{moment.title.slice(0, 1)}</span>
                      )
                    )}
                    {memberMoments.length > 3 && (
                      <span>+{memberMoments.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="partner-card-actions">
                  <div>
                    <button
                      type="button"
                      aria-label={`Edit profil ${member.name}`}
                      onClick={() => openEdit(member)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Hapus profil ${member.name}`}
                      disabled={deleting === member.id}
                      onClick={() => removeMember(member)}
                    >
                      {deleting === member.id ? (
                        <LoaderCircle className="partner-spin" size={15} />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                  <Link href={`/people/${member.id}`}>
                    Lihat linimasa <ChevronRight size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="partner-empty">
          <UserRound size={28} />
          <h2>Tidak ada profil yang cocok</h2>
          <p>Ubah kata pencarian atau tambahkan profil baru.</p>
        </div>
      )}

      {dialogOpen && (
        <div
          className="partner-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !saving) {
              setDialogOpen(false);
            }
          }}
        >
          <div
            className="partner-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-dialog-title"
          >
            <header className="partner-dialog-header">
              <div>
                <p className="partner-eyebrow">Profil kita</p>
                <h2 id="partner-dialog-title">
                  {editing ? "Perbarui anggota" : "Tambahkan wajah baru"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                disabled={saving}
                onClick={() => setDialogOpen(false)}
              >
                <X size={19} />
              </button>
            </header>

            <form className="partner-form" onSubmit={saveMember}>
              <div className="partner-form-grid">
                <label className="partner-field">
                  <span>Nama lengkap</span>
                  <input
                    required
                    maxLength={80}
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="Contoh: Aulia Rahma"
                  />
                </label>
                <label className="partner-field">
                  <span>Inisial</span>
                  <input
                    maxLength={4}
                    value={form.initials}
                    onChange={(event) =>
                      updateForm(
                        "initials",
                        event.target.value.toLocaleUpperCase("id-ID")
                      )
                    }
                    placeholder={initialsFor(form.name) || "AR"}
                  />
                </label>
                <label className="partner-field">
                  <span>Hubungan & julukan</span>
                  <input
                    maxLength={80}
                    value={form.relationship}
                    onChange={(event) =>
                      updateForm("relationship", event.target.value)
                    }
                    placeholder="Ibu · Perangkai cerita"
                  />
                </label>
                <label className="partner-field">
                  <span>Tanggal lahir</span>
                  <input
                    type="date"
                    value={form.birthday}
                    onChange={(event) =>
                      updateForm("birthday", event.target.value)
                    }
                  />
                </label>
                <fieldset className="partner-color-field">
                  <legend>Warna profil</legend>
                  <div>
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={form.color === color ? "partner-color-active" : ""}
                        style={{ backgroundColor: color }}
                        aria-label={`Pilih warna ${color}`}
                        aria-pressed={form.color === color}
                        onClick={() => updateForm("color", color)}
                      />
                    ))}
                  </div>
                </fieldset>
                <label className="partner-field partner-field-wide">
                  <span>Cerita singkat</span>
                  <textarea
                    maxLength={600}
                    value={form.bio}
                    onChange={(event) => updateForm("bio", event.target.value)}
                    placeholder="Apa yang membuat dia istimewa buatmu?"
                  />
                </label>
              </div>


              {error && <p className="partner-form-error">{error}</p>}
              <footer className="partner-dialog-actions">
                <button
                  type="button"
                  className="partner-cancel-button"
                  disabled={saving}
                  onClick={() => setDialogOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="partner-save-button"
                  disabled={saving}
                >
                  {saving && <LoaderCircle className="partner-spin" size={17} />}
                  {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Tambah anggota"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
