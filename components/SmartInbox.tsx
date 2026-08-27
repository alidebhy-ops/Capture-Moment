/* eslint-disable @next/next/no-img-element -- Local previews use blob URLs. */
"use client";

import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Camera,
  Check,
  FileSearch,
  FolderInput,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Sparkles,
  Trash2,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_UPLOAD_BYTES, oversizedMediaMessage } from "@/lib/upload-limits";

type InboxItem = {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
  date: string;
  lat: number | null;
  lng: number | null;
  duplicate: boolean;
  uploaded?: { id: string; type: "image" | "video" };
};

type ImportState =
  | { kind: "idle" }
  | { kind: "importing"; groupDate: string; done: number; total: number }
  | { kind: "success"; message: string };

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function isoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

function fingerprint(file: File) {
  return `${file.name.toLocaleLowerCase("id")}:${file.size}:${file.lastModified}`;
}

const sampleGroups = [
  { title: "Pagi di tepi pantai", meta: "8 foto · GPS ditemukan", image: "/demo/beach.jpg" },
  { title: "Malam ulang tahun", meta: "6 foto · 1 video", image: "/demo/birthday.jpg" },
  { title: "Perjalanan ke Bromo", meta: "12 foto · tanggal EXIF", image: "/demo/bromo.jpg" },
];

export default function SmartInbox() {
  const router = useRouter();
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<InboxItem[]>([]);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [state, setState] = useState<ImportState>({ kind: "idle" });
  const [error, setError] = useState("");

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(
    () => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.preview)),
    []
  );

  const groups = useMemo(() => {
    const map = new Map<string, InboxItem[]>();
    for (const item of items.filter((entry) => !entry.duplicate)) {
      const group = map.get(item.date) ?? [];
      group.push(item);
      map.set(item.date, group);
    }
    return [...map.entries()]
      .map(([date, files]) => ({ date, files }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [items]);

  const duplicateCount = items.filter((item) => item.duplicate).length;
  // Kalau tidak satu pun foto membawa koordinat, penyebabnya hampir selalu iOS
  // yang membuangnya kecuali "Options -> Location" dinyalakan saat memilih.
  const photoCount = items.filter((item) => item.file.type.startsWith("image/")).length;
  const locatedCount = items.filter((item) => item.lat !== null).length;
  const missingAllLocations = photoCount > 0 && locatedCount === 0;

  async function inspectFiles(selected: File[]) {
    setError("");
    const accepted = selected
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .slice(0, Math.max(0, 40 - items.length));
    if (!accepted.length) return;

    const known = new Set(items.map((item) => fingerprint(item.file)));
    const next: InboxItem[] = [];

    for (const file of accepted) {
      const key = fingerprint(file);
      let capturedAt = new Date(file.lastModified || Date.now());
      let lat: number | null = null;
      let lng: number | null = null;

      if (file.type.startsWith("image/")) {
        try {
          const exifr = (await import("exifr")).default;
          const metadata = await exifr
            .parse(file, ["DateTimeOriginal", "CreateDate", "latitude", "longitude"])
            .catch(() => undefined);
          const metadataDate = metadata?.DateTimeOriginal || metadata?.CreateDate;
          if (metadataDate instanceof Date && !Number.isNaN(metadataDate.getTime())) {
            capturedAt = metadataDate;
          }
          const gps = await exifr.gps(file).catch(() => undefined);
          const gpsLatitude = gps?.latitude;
          const gpsLongitude = gps?.longitude;
          if (
            typeof gpsLatitude === "number" &&
            Number.isFinite(gpsLatitude) &&
            typeof gpsLongitude === "number" &&
            Number.isFinite(gpsLongitude)
          ) {
            lat = Number(gpsLatitude.toFixed(6));
            lng = Number(gpsLongitude.toFixed(6));
          }
        } catch {
          // File tetap dikelompokkan memakai tanggal perangkat.
        }
      }

      const duplicate = known.has(key);
      known.add(key);
      next.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" : "image",
        date: isoDate(capturedAt),
        lat,
        lng,
        duplicate,
      });
    }

    setItems((current) => [...current, ...next]);
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    void inspectFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function removeItem(id: string) {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.id !== id);
    });
  }

  function discardDuplicates() {
    setItems((current) => {
      current
        .filter((item) => item.duplicate)
        .forEach((item) => URL.revokeObjectURL(item.preview));
      return current.filter((item) => !item.duplicate);
    });
  }

  async function uploadFile(file: File) {
    let upload = file;
    if (file.type.startsWith("image/")) {
      const imageCompression = (await import("browser-image-compression")).default;
      const compressed = await imageCompression(file, {
        maxSizeMB: 1.4,
        maxWidthOrHeight: 2200,
        useWebWorker: true,
        initialQuality: 0.86,
      });
      upload = new File([compressed], file.name, {
        type: compressed.type || file.type,
      });
    }
    // The platform drops oversized bodies before the API route runs, so the
    // size has to be caught here to say anything useful about it.
    if (upload.size > MAX_UPLOAD_BYTES) {
      throw new Error(oversizedMediaMessage(file.name, upload.size));
    }
    const body = new FormData();
    body.append("file", upload);
    const response = await fetch("/api/upload", { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.id) {
      throw new Error(payload.error || `Gagal mengunggah ${file.name}`);
    }
    const type: "image" | "video" =
      payload.type === "video" ? "video" : "image";
    return { id: String(payload.id), type };
  }

  async function importGroup(date: string, files: InboxItem[]) {
    setError("");
    setState({ kind: "importing", groupDate: date, done: 0, total: files.length });
    try {
      const media: { id: string; type: "image" | "video" }[] = [];
      for (const [index, inboxItem] of files.entries()) {
        setState({ kind: "importing", groupDate: date, done: index, total: files.length });
        const uploaded = inboxItem.uploaded ?? await uploadFile(inboxItem.file);
        media.push(uploaded);
        if (!inboxItem.uploaded) {
          setItems((current) =>
            current.map((item) =>
              item.id === inboxItem.id ? { ...item, uploaded } : item
            )
          );
        }
      }

      const locationItem = files.find((item) => item.lat !== null && item.lng !== null);
      const title = titles[date]?.trim() || `Kenangan ${dateLabel(date)}`;
      const response = await fetch("/api/moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          story:
            "Momen ini dikumpulkan melalui Smart Memory Inbox. Tambahkan cerita kecil yang membuat hari ini layak dikenang.",
          date,
          locationName: locationItem ? "Lokasi ditemukan dari metadata foto" : "",
          lat: locationItem?.lat ?? null,
          lng: locationItem?.lng ?? null,
          collection: "Smart Inbox",
          mood: "Hangat",
          tags: ["impor otomatis", "inbox"],
          mediaIds: media.map((item) => item.id),
          mediaTypes: media.map((item) => item.type),
          coverPhotoId: media.find((item) => item.type === "image")?.id || media[0]?.id || "",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.moment) {
        throw new Error(payload.error || "Grup belum berhasil dijadikan momen.");
      }

      const importedIds = new Set(files.map((item) => item.id));
      setItems((current) => {
        current
          .filter((item) => importedIds.has(item.id) || item.duplicate)
          .forEach((item) => URL.revokeObjectURL(item.preview));
        return current.filter(
          (item) => !importedIds.has(item.id) && !item.duplicate
        );
      });
      setState({ kind: "success", message: `“${title}” sudah masuk ke ruang kenangan.` });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impor belum berhasil.");
      setState({ kind: "idle" });
    }
  }

  const busy = state.kind === "importing";

  return (
    <div className="smart-inbox">
      <section className="inbox-drop-card">
        <div className="inbox-drop-copy">
          <span className="inbox-drop-icon"><FolderInput size={26} /></span>
          <p className="eyebrow">Smart Memory Inbox</p>
          <h2>Masukkan satu folder foto. Biarkan kami merapikannya.</h2>
          <p>
            Foto dikelompokkan berdasarkan tanggal, duplikat ditandai, dan lokasi
            GPS dibaca langsung dari metadata perangkat.
          </p>
          <div className="inbox-drop-actions">
            <button type="button" className="primary-button" onClick={() => pickerRef.current?.click()} disabled={busy}>
              <UploadCloud size={17} /> Pilih foto &amp; video
            </button>
            <button type="button" className="secondary-button" onClick={() => cameraRef.current?.click()} disabled={busy}>
              <Camera size={17} /> Buka kamera
            </button>
          </div>
        </div>
        <div className="inbox-scan-note">
          <FileSearch size={22} />
          <strong>Pemeriksaan lokal</strong>
          <p>Metadata dibaca di perangkat sebelum media diunggah.</p>
        </div>
        <input ref={pickerRef} type="file" accept="image/*,video/*" multiple hidden onChange={onPick} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      </section>

      {items.length === 0 ? (
        <section className="inbox-demo">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Contoh hasil pengelompokan</p>
              <h2>Dari galeri yang ramai menjadi cerita yang rapi.</h2>
              <p>Data contoh berikut memperlihatkan hasil yang akan muncul setelah memilih media.</p>
            </div>
          </div>
          <div className="inbox-demo-grid">
            {sampleGroups.map((group) => (
              <article key={group.title}>
                <img src={group.image} alt="" />
                <span><WandSparkles size={14} /> Grup otomatis</span>
                <h3>{group.title}</h3>
                <p>{group.meta}</p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="inbox-groups">
          <div className="inbox-summary">
            <div><strong>{groups.length}</strong><span>kelompok cerita</span></div>
            <div><strong>{items.length - duplicateCount}</strong><span>media siap</span></div>
            <div><strong>{duplicateCount}</strong><span>duplikat ditahan</span></div>
            <button type="button" className="secondary-button" onClick={() => pickerRef.current?.click()} disabled={busy}>
              <ImagePlus size={16} /> Tambah media
            </button>
          </div>

          {missingAllLocations && (
            <div className="inbox-location-note">
              <MapPin size={16} />
              <span>
                Tidak ada foto yang membawa data lokasi. Di iPhone, ketuk{" "}
                <strong>Options</strong> di layar pemilih foto lalu nyalakan{" "}
                <strong>Location</strong> sebelum memilih.
              </span>
            </div>
          )}

          {duplicateCount > 0 && (
            <div className="inbox-duplicate-note">
              <Check size={16} />
              <span>{duplicateCount} file dengan nama, ukuran, dan waktu yang sama tidak ikut diimpor.</span>
              <button type="button" onClick={discardDuplicates} disabled={busy}>
                Buang duplikat
              </button>
            </div>
          )}

          <div className="inbox-group-list">
            {groups.map((group) => {
              const importing = state.kind === "importing" && state.groupDate === group.date;
              const gpsCount = group.files.filter((item) => item.lat !== null).length;
              return (
                <article className="inbox-group-card" key={group.date}>
                  <div className="inbox-group-heading">
                    <div>
                      <span><CalendarDays size={15} /> {dateLabel(group.date)}</span>
                      <input
                        value={titles[group.date] ?? ""}
                        onChange={(event) => setTitles((current) => ({ ...current, [group.date]: event.target.value }))}
                        placeholder={`Kenangan ${dateLabel(group.date)}`}
                        aria-label={`Judul momen ${dateLabel(group.date)}`}
                      />
                    </div>
                    <div className="inbox-group-meta">
                      <span>{group.files.length} media</span>
                      {gpsCount > 0 && <span><MapPin size={13} /> GPS {gpsCount}</span>}
                    </div>
                  </div>
                  <div className="inbox-file-strip">
                    {group.files.map((item) => (
                      <div key={item.id}>
                        {item.type === "video" ? (
                          <video src={item.preview} muted />
                        ) : (
                          <img src={item.preview} alt={item.file.name} />
                        )}
                        <button type="button" onClick={() => removeItem(item.id)} aria-label={`Hapus ${item.file.name}`} disabled={busy}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="inbox-group-footer">
                    <p>Judul, koleksi, lokasi, dan cerita tetap dapat diedit setelah diimpor.</p>
                    <button type="button" className="primary-button" onClick={() => void importGroup(group.date, group.files)} disabled={busy}>
                      {importing ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={16} />}
                      {importing && state.kind === "importing"
                        ? `Mengimpor ${state.done + 1}/${state.total}`
                        : "Jadikan momen"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {error && <div className="form-error">{error}</div>}
      {state.kind === "success" && <div className="inbox-success"><Check size={17} /> {state.message}</div>}
    </div>
  );
}
