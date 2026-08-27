"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ImageDown, LoaderCircle } from "lucide-react";

// Berhenti menunggu setelah sepuluh menit; sesi Picker juga tidak hidup lama.
const POLL_LIMIT_MS = 10 * 60 * 1000;

type Phase =
  | { kind: "idle" }
  | { kind: "opening" }
  | { kind: "waiting"; pickerUri: string }
  | { kind: "importing" };

type SessionPayload = {
  session?: { id: string; pickerUri: string; mediaItemsSet: boolean; pollIntervalMs: number };
  error?: string;
};

type ImportPayload = {
  media?: { id: string; type: "image" | "video" }[];
  imported?: number;
  skipped?: number;
  remaining?: number;
  error?: string;
};

function todayISO(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function GooglePhotosImport({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const cancelled = useRef(false);

  useEffect(() => () => {
    cancelled.current = true;
  }, []);

  async function start() {
    setError("");
    setNote("");
    setPhase({ kind: "opening" });

    try {
      const response = await fetch("/api/photos/session", { method: "POST" });
      const payload = (await response.json()) as SessionPayload;
      if (!response.ok || !payload.session) {
        throw new Error(payload.error || "Sesi Google Photos gagal dibuat.");
      }

      const { id, pickerUri, pollIntervalMs } = payload.session;
      window.open(pickerUri, "_blank", "noopener,noreferrer");
      setPhase({ kind: "waiting", pickerUri });

      await waitForSelection(id, pollIntervalMs);
    } catch (cause) {
      if (cancelled.current) return;
      setError(cause instanceof Error ? cause.message : "Impor gagal.");
      setPhase({ kind: "idle" });
    }
  }

  // Google tidak memberi tahu saat pengguna selesai memilih, jadi sesinya
  // ditanya berulang sampai mediaItemsSet bernilai true.
  async function waitForSelection(sessionId: string, intervalMs: number) {
    // Dihitung dari jumlah percobaan, bukan jam dinding, supaya fungsinya tetap
    // murni terhadap render.
    const maxAttempts = Math.ceil(POLL_LIMIT_MS / Math.max(intervalMs, 1000));

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      if (cancelled.current) return;

      const response = await fetch(
        `/api/photos/session?id=${encodeURIComponent(sessionId)}`
      );
      const payload = (await response.json()) as SessionPayload;
      if (!response.ok || !payload.session) {
        throw new Error(payload.error || "Sesi Google Photos terputus.");
      }
      if (payload.session.mediaItemsSet) {
        await importPicked(sessionId);
        return;
      }
    }

    throw new Error(
      "Waktu memilih habis. Mulai lagi kalau masih ingin mengimpor."
    );
  }

  async function importPicked(sessionId: string) {
    setPhase({ kind: "importing" });

    const response = await fetch("/api/photos/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const payload = (await response.json()) as ImportPayload;
    if (!response.ok || !payload.media?.length) {
      throw new Error(payload.error || "Tidak ada foto yang berhasil disalin.");
    }

    const moment = await fetch("/api/moments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Dari Google Photos",
        story: "",
        date: todayISO(),
        collection: "Cerita Sehari-hari",
        mediaIds: payload.media.map((item) => item.id),
        mediaTypes: payload.media.map((item) => item.type),
      }),
    });
    const created = (await moment.json()) as {
      moment?: { id: string };
      error?: string;
    };
    if (!moment.ok || !created.moment) {
      throw new Error(created.error || "Momen gagal dibuat.");
    }

    const leftovers = [
      payload.skipped ? `${payload.skipped} gagal disalin` : "",
      payload.remaining ? `${payload.remaining} belum ikut, impor lagi untuk sisanya` : "",
    ].filter(Boolean);
    if (leftovers.length) setNote(leftovers.join(" · "));

    router.push(`/moment/${created.moment.id}/edit`);
    router.refresh();
  }

  if (demoMode) return null;

  const busy = phase.kind !== "idle";

  return (
    <div className="photos-import">
      <div className="photos-import-copy">
        <strong>Ambil dari Google Photos</strong>
        <p>
          Google membuka pemilih fotonya sendiri. Pilih foto di sana, lalu
          salinannya masuk ke album ini. Tanggal ikut terbawa, tetapi lokasinya
          tidak — Google tidak menyertakan koordinat.
        </p>
      </div>

      <button
        type="button"
        className="secondary-button"
        onClick={start}
        disabled={busy}
      >
        {busy ? <LoaderCircle size={16} className="spin" /> : <ImageDown size={16} />}
        {phase.kind === "opening" && "Menyiapkan..."}
        {phase.kind === "waiting" && "Menunggu pilihanmu"}
        {phase.kind === "importing" && "Menyalin..."}
        {phase.kind === "idle" && "Buka Google Photos"}
      </button>

      {phase.kind === "waiting" && (
        <p className="photos-import-status">
          Tab Google Photos sudah terbuka. Setelah selesai memilih di sana,
          halaman ini melanjutkan sendiri.{" "}
          <a href={phase.pickerUri} target="_blank" rel="noopener noreferrer">
            Buka lagi <ExternalLink size={13} />
          </a>
        </p>
      )}

      {note && <p className="photos-import-status">{note}</p>}
      {error && <p className="photos-import-error">{error}</p>}
    </div>
  );
}
