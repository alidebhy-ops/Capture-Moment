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
import {
  averagePoint,
  clusterPlaces,
  groupKeysByDateAndPlace,
  type Point,
} from "@/lib/geo";

type InboxItem = {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
  date: string;
  lat: number | null;
  lng: number | null;
  place: number | null;
  portrait: boolean;
  uploaded?: { id: string; type: "image" | "video" };
};

type InboxGroup = {
  key: string;
  date: string;
  place: number | null;
  center: Point | null;
  files: InboxItem[];
};

type ImportState =
  | { kind: "idle" }
  | { kind: "importing"; groupKey: string; done: number; total: number }
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

// Nama berkas tidak bisa dipercaya: foto yang sama diekspor ulang sering
// berganti nama. Membandingkan isinya membuat salinan tetap terdeteksi.
async function fingerprint(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Orientasi dibaca dari gambar aslinya supaya foto potret tidak dipajang
// terpotong dalam bingkai lanskap.
function readOrientation(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalHeight > image.naturalWidth);
    image.onerror = () => resolve(false);
    image.src = url;
  });
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
  // Bertahan walau item sudah diimpor dan dibuang dari daftar, sehingga mengirim
  // ulang berkas yang sama dalam sesi ini tetap terdeteksi sebagai salinan.
  const seenHashes = useRef<Set<string>>(new Set());
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

  // Satu momen = satu tanggal di satu tempat. Foto pada hari yang sama tetapi
  // di tempat berbeda dipisah, begitu pula tempat yang sama pada hari berbeda.
  const groups = useMemo<InboxGroup[]>(() => {
    const keys = groupKeysByDateAndPlace(items);
    const map = new Map<string, InboxGroup>();

    for (const [index, item] of items.entries()) {
      const key = keys[index];
      const existing = map.get(key);
      if (existing) {
        existing.files.push(item);
        continue;
      }
      map.set(key, {
        key,
        date: item.date,
        place: item.place,
        center: null,
        files: [item],
      });
    }

    return [...map.values()]
      .map((group) => {
        const points = group.files
          .filter((item) => item.lat !== null && item.lng !== null)
          .map((item) => ({ lat: item.lat as number, lng: item.lng as number }));
        return { ...group, center: points.length ? averagePoint(points) : null };
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          String(a.place ?? "").localeCompare(String(b.place ?? ""))
      );
  }, [items]);

  const [skippedDuplicates, setSkippedDuplicates] = useState(0);
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

    const known = new Set(seenHashes.current);
    const next: InboxItem[] = [];
    let duplicates = 0;

    for (const file of accepted) {
      const key = await fingerprint(file);
      // Salinan langsung dibuang, tidak lagi ditandai lalu menunggu dibersihkan
      // manual. Yang diambil hanya berkas yang benar-benar berbeda isinya.
      if (known.has(key)) {
        duplicates += 1;
        continue;
      }
      known.add(key);
      seenHashes.current.add(key);
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

      const preview = URL.createObjectURL(file);
      next.push({
        id: crypto.randomUUID(),
        file,
        preview,
        type: file.type.startsWith("video/") ? "video" : "image",
        date: isoDate(capturedAt),
        lat,
        lng,
        place: null,
        portrait: file.type.startsWith("image/")
          ? await readOrientation(preview)
          : false,
      });
    }

    setSkippedDuplicates((current) => current + duplicates);

    setItems((current) => {
      const combined = [...current, ...next];
      // Tempat dihitung ulang atas seluruh isi kotak masuk, supaya foto yang
      // ditambahkan belakangan tetap menyatu dengan tempat yang sudah ada.
      const places = clusterPlaces(
        combined.map((item) =>
          item.lat !== null && item.lng !== null
            ? { lat: item.lat, lng: item.lng }
            : null
        )
      );
      return combined.map((item, index) => ({ ...item, place: places[index] }));
    });
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

  async function importGroup(group: InboxGroup): Promise<boolean> {
    const { key, date, files } = group;
    setError("");
    setState({ kind: "importing", groupKey: key, done: 0, total: files.length });
    try {
      const media: { id: string; type: "image" | "video" }[] = [];
      for (const [index, inboxItem] of files.entries()) {
        setState({ kind: "importing", groupKey: key, done: index, total: files.length });
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

      const title = titles[key]?.trim() || `Kenangan ${dateLabel(date)}`;
      const response = await fetch("/api/moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          story:
            "Momen ini dikumpulkan melalui Smart Memory Inbox. Tambahkan cerita kecil yang membuat hari ini layak dikenang.",
          date,
          locationName: group.center ? "Lokasi dari metadata foto" : "",
          lat: group.center?.lat ?? null,
          lng: group.center?.lng ?? null,
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
          .filter((item) => importedIds.has(item.id))
          .forEach((item) => URL.revokeObjectURL(item.preview));
        return current.filter((item) => !importedIds.has(item.id));
      });
      setState({ kind: "success", message: `“${title}” sudah masuk ke ruang kenangan.` });
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impor belum berhasil.");
      setState({ kind: "idle" });
      return false;
    }
  }

  // Semua kelompok sekaligus. Dijalankan berurutan supaya unggahannya tidak
  // saling berebut, dan berhenti begitu ada yang gagal agar pesan errornya
  // tidak tertimpa kelompok berikutnya.
  async function importAll() {
    const queue = [...groups];
    let done = 0;

    for (const group of queue) {
      const ok = await importGroup(group);
      if (!ok) return;
      done += 1;
    }

    setState({
      kind: "success",
      message:
        done === 1
          ? "1 momen tersimpan."
          : `${done} momen tersimpan, dipisah menurut tanggal dan tempat.`,
    });
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
            <div><strong>{items.length}</strong><span>media siap</span></div>
            <div><strong>{skippedDuplicates}</strong><span>duplikat dilewati</span></div>
            <div className="inbox-summary-actions">
              <button type="button" className="secondary-button" onClick={() => pickerRef.current?.click()} disabled={busy}>
                <ImagePlus size={16} /> Tambah media
              </button>
              <button type="button" className="primary-button" onClick={() => void importAll()} disabled={busy || groups.length === 0}>
                {busy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
                {groups.length > 1 ? `Jadikan ${groups.length} momen` : "Jadikan momen"}
              </button>
            </div>
          </div>

          {missingAllLocations && (
            <div className="inbox-location-note">
              <MapPin size={16} />
              <span>
                Tidak ada foto yang membawa data lokasi. iPhone membuangnya
                kecuali kamu menyalakan <strong>Location</strong> lewat{" "}
                <strong>Options</strong> di pojok kiri bawah layar pemilih foto
                — dan tombol itu hanya ada di iOS 17 ke atas.
              </span>
            </div>
          )}

          {skippedDuplicates > 0 && (
            <div className="inbox-duplicate-note">
              <Check size={16} />
              <span>
                {skippedDuplicates} berkas dilewati karena isinya sama persis
                dengan foto yang sudah dipilih.
              </span>
            </div>
          )}

          <div className="inbox-group-list">
            {groups.map((group) => {
              const importing = state.kind === "importing" && state.groupKey === group.key;
              const gpsCount = group.files.filter((item) => item.lat !== null).length;
              return (
                <article className="inbox-group-card" key={group.key}>
                  <div className="inbox-group-heading">
                    <div>
                      <span><CalendarDays size={15} /> {dateLabel(group.date)}</span>
                      <input
                        value={titles[group.key] ?? ""}
                        onChange={(event) => setTitles((current) => ({ ...current, [group.key]: event.target.value }))}
                        placeholder={`Kenangan ${dateLabel(group.date)}`}
                        aria-label={`Judul momen ${dateLabel(group.date)}`}
                      />
                    </div>
                    <div className="inbox-group-meta">
                      <span>{group.files.length} media</span>
                      {group.center ? (
                        <span>
                          <MapPin size={13} /> Tempat {(group.place ?? 0) + 1} · GPS {gpsCount}
                        </span>
                      ) : (
                        <span><MapPin size={13} /> Tanpa lokasi</span>
                      )}
                    </div>
                  </div>
                  <div className="inbox-file-strip">
                    {group.files.map((item) => (
                      <div
                        key={item.id}
                        className={item.portrait ? "is-portrait" : undefined}
                      >
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
                    <button type="button" className="primary-button" onClick={() => void importGroup(group)} disabled={busy}>
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
