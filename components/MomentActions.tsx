"use client";

import {
  Bookmark,
  Check,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type MomentActionsProps = {
  title: string;
  initialFavorite: boolean;
};

export default function MomentActions({
  title,
  initialFavorite,
}: MomentActionsProps) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<"favorite" | "delete" | null>(null);
  const momentId = params.id;

  async function responseError(response: Response): Promise<string> {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return payload?.error || "Terjadi kesalahan. Silakan coba lagi.";
  }

  async function toggleFavorite() {
    if (!momentId || pending) return;
    const nextFavorite = !favorite;
    setFavorite(nextFavorite);
    setPending("favorite");

    try {
      const response = await fetch(`/api/moments/${momentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: nextFavorite }),
      });
      if (!response.ok) throw new Error(await responseError(response));

      const payload = (await response.json()) as {
        moment?: { favorite?: boolean };
      };
      setFavorite(payload.moment?.favorite ?? nextFavorite);
      router.refresh();
    } catch (error) {
      setFavorite(!nextFavorite);
      window.alert(
        error instanceof Error
          ? error.message
          : "Favorit belum dapat disimpan."
      );
    } finally {
      setPending(null);
    }
  }

  async function share() {
    const data = {
      title,
      text: `Lihat cerita “${title}” di CaptureMoment`,
      url: window.location.href,
    };
    if (navigator.share) {
      await navigator.share(data).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function removeMoment() {
    if (!momentId || pending) return;
    const confirmed = window.confirm(
      `Pindahkan “${title}” ke tempat sampah? Momen masih dapat dipulihkan nanti.`
    );
    if (!confirmed) return;

    setPending("delete");
    try {
      const response = await fetch(`/api/moments/${momentId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await responseError(response));
      router.replace("/");
      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Momen belum dapat dihapus."
      );
      setPending(null);
    }
  }

  return (
    <div className="moment-actions">
      <button
        type="button"
        onClick={toggleFavorite}
        className={favorite ? "active" : ""}
        aria-pressed={favorite}
        disabled={pending !== null}
      >
        <Bookmark size={17} fill={favorite ? "currentColor" : "none"} />
        {pending === "favorite"
          ? "Menyimpan"
          : favorite
            ? "Tersimpan"
            : "Simpan"}
      </button>
      <Link
        href={`/moment/${momentId}/edit`}
        aria-label="Edit momen"
        title="Edit momen"
        className="secondary-button"
        style={{ width: 38, minHeight: 38, padding: 0, borderRadius: 10 }}
      >
        <Pencil size={17} />
        <span className="sr-only">Edit momen</span>
      </Link>
      <button type="button" onClick={share}>
        {copied ? <Check size={17} /> : <Share2 size={17} />}
        {copied ? "Tautan disalin" : "Bagikan"}
      </button>
      <button
        type="button"
        onClick={removeMoment}
        disabled={pending !== null}
        aria-label="Pindahkan momen ke tempat sampah"
        title="Pindahkan ke tempat sampah"
      >
        <Trash2 size={17} />
        {pending === "delete" ? "Menghapus" : "Hapus"}
      </button>
    </div>
  );
}
