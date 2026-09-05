/* eslint-disable @next/next/no-img-element -- Blob previews cannot use the Next image optimizer. */
"use client";

import { useRouter } from "next/navigation";
import {
  ArchiveRestore,
  CalendarDays,
  Check,
  CircleStop,
  FileImage,
  Film,
  ImagePlus,
  Lightbulb,
  LoaderCircle,
  MapPin,
  Mic,
  PenLine,
  Sparkles,
  Trash2,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Partner } from "@/lib/partner-types";
import { mediaSrc } from "@/lib/media";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, oversizedMediaMessage } from "@/lib/upload-limits";
import type { Moment, Plan } from "@/lib/types";
import LocationPickerLazy from "./LocationPickerLazy";

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; done: number; total: number }
  | { kind: "saving" };

type Preview = { src: string; type: "image" | "video" };

type DraftPayload = {
  title: string;
  story: string;
  date: string;
  locationName: string;
  lat: number | null;
  lng: number | null;
  collection: string;
  mood: string;
  tags: string;
  authorId: string;
  peopleIds: string[];
  savedAt: string;
};

type DraftFields = Omit<DraftPayload, "savedAt">;

type SpeechResultEvent = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function todayISO() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const collections = ["Cerita Sehari-hari", "Perjalanan", "Liburan Berdua", "Perayaan", "Hari Istimewa"];
const moods = ["Hangat", "Gembira", "Tenang", "Takjub", "Seru", "Damai"];
const storyPrompts = [
  "Siapa saja yang ada di sana?",
  "Hal kecil apa yang paling ingin kamu ingat?",
  "Apa yang paling membuat semua orang tertawa?",
  "Seperti apa suasana, cuaca, atau aroma hari itu?",
];
const emptyPartners: Partner[] = [];

function collectionForPlan(plan?: Plan) {
  if (!plan) return collections[0];
  if (plan.category === "Perjalanan") return "Perjalanan";
  if (plan.category === "Perayaan") return "Perayaan";
  if (plan.category === "Kencan") return "Liburan Berdua";
  return "Cerita Sehari-hari";
}

function storyForPlan(plan?: Plan) {
  if (!plan) return "";
  const opening = plan.description.trim();
  return `${opening}${opening ? "\n\n" : ""}Catatan setelah rencana ini terwujud:\n`;
}

function initialDraftFields(
  initialPlan: Plan | undefined,
  initialMoment: Moment | undefined,
  members: Partner[]
): DraftFields {
  return {
    title: initialMoment?.title ?? initialPlan?.title ?? "",
    story: initialMoment?.story ?? storyForPlan(initialPlan),
    date: initialMoment?.date ?? initialPlan?.targetDate ?? todayISO(),
    locationName:
      initialMoment?.locationName ?? initialPlan?.locationName ?? "",
    lat: initialMoment?.lat ?? initialPlan?.lat ?? null,
    lng: initialMoment?.lng ?? initialPlan?.lng ?? null,
    collection:
      initialMoment?.collection ?? collectionForPlan(initialPlan),
    mood: initialMoment?.mood ?? moods[0],
    tags:
      initialMoment?.tags.join(", ") ??
      (initialPlan
        ? `rencana terwujud, ${initialPlan.category.toLowerCase()}`
        : ""),
    authorId:
      initialMoment?.authorId ??
      members[0]?.id ??
      "",
    peopleIds: initialMoment?.peopleIds ?? [],
  };
}

function draftDiffersFrom(
  draft: DraftFields,
  baseline: DraftFields
): boolean {
  return (
    draft.title !== baseline.title ||
    draft.story !== baseline.story ||
    draft.date !== baseline.date ||
    draft.locationName !== baseline.locationName ||
    draft.lat !== baseline.lat ||
    draft.lng !== baseline.lng ||
    draft.collection !== baseline.collection ||
    draft.mood !== baseline.mood ||
    draft.tags !== baseline.tags ||
    draft.authorId !== baseline.authorId ||
    draft.peopleIds.join("\u0000") !== baseline.peopleIds.join("\u0000")
  );
}

export default function NewMomentForm({
  initialPlan,
  initialMoment,
  members = emptyPartners,
}: {
  initialPlan?: Plan;
  initialMoment?: Moment;
  members?: Partner[];
}) {
  const router = useRouter();
  const baselineDraft = initialDraftFields(initialPlan, initialMoment, members);
  const [title, setTitle] = useState(baselineDraft.title);
  const [story, setStory] = useState(baselineDraft.story);
  const [date, setDate] = useState(baselineDraft.date);
  const [locationName, setLocationName] = useState(baselineDraft.locationName);
  const [lat, setLat] = useState<number | null>(baselineDraft.lat);
  const [lng, setLng] = useState<number | null>(baselineDraft.lng);
  const [collection, setCollection] = useState(baselineDraft.collection);
  const [mood, setMood] = useState(baselineDraft.mood);
  const [tags, setTags] = useState(baselineDraft.tags);
  const [authorId, setAuthorId] = useState(baselineDraft.authorId);
  const [peopleIds, setPeopleIds] = useState<string[]>(baselineDraft.peopleIds);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [existingMedia, setExistingMedia] = useState(initialMoment?.media ?? []);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [error, setError] = useState("");
  const [exifNote, setExifNote] = useState("");
  const [exifHint, setExifHint] = useState(false);
  const [draftCandidate, setDraftCandidate] = useState<DraftPayload | null>(null);
  const [lastDraftAt, setLastDraftAt] = useState("");
  const [listening, setListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<Preview[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const draftKey = `capturemoment:draft:${initialMoment?.id ?? initialPlan?.id ?? "new"}`;

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => () => previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.src)), []);

  useEffect(() => {
    let timer: number | undefined;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DraftPayload;
      if (
        parsed?.savedAt &&
        draftDiffersFrom(
          parsed,
          initialDraftFields(initialPlan, initialMoment, members)
        )
      ) {
        timer = window.setTimeout(() => setDraftCandidate(parsed), 0);
      } else {
        window.localStorage.removeItem(draftKey);
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [draftKey, initialMoment, initialPlan, members]);

  useEffect(() => {
    if (draftCandidate || status.kind !== "idle") return;
    const timer = window.setTimeout(() => {
      const fields: DraftFields = {
        title,
        story,
        date,
        locationName,
        lat,
        lng,
        collection,
        mood,
        tags,
        authorId,
        peopleIds,
      };
      if (
        !draftDiffersFrom(
          fields,
          initialDraftFields(initialPlan, initialMoment, members)
        )
      ) {
        window.localStorage.removeItem(draftKey);
        return;
      }
      const payload: DraftPayload = {
        ...fields,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(draftKey, JSON.stringify(payload));
      setLastDraftAt(payload.savedAt);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [
    authorId,
    collection,
    date,
    draftCandidate,
    draftKey,
    initialMoment,
    initialPlan,
    lat,
    lng,
    locationName,
    mood,
    members,
    peopleIds,
    status.kind,
    story,
    tags,
    title,
  ]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    []
  );

  function restoreDraft() {
    if (!draftCandidate) return;
    setTitle(draftCandidate.title);
    setStory(draftCandidate.story);
    setDate(draftCandidate.date);
    setLocationName(draftCandidate.locationName);
    setLat(draftCandidate.lat);
    setLng(draftCandidate.lng);
    setCollection(draftCandidate.collection);
    setMood(draftCandidate.mood);
    setTags(draftCandidate.tags);
    setAuthorId(draftCandidate.authorId);
    setPeopleIds(draftCandidate.peopleIds);
    setLastDraftAt(draftCandidate.savedAt);
    setDraftCandidate(null);
  }

  function discardDraft() {
    window.localStorage.removeItem(draftKey);
    setDraftCandidate(null);
  }

  function togglePerson(memberId: string) {
    setPeopleIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    );
  }

  function addPrompt(prompt: string) {
    setStory((current) => `${current}${current.trim() ? "\n\n" : ""}${prompt}\n`);
  }

  function toggleDictation() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Dikte suara belum didukung browser ini. Kamu tetap dapat merekam video atau menulis cerita.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        setStory((current) => `${current}${current.trim() ? " " : ""}${transcript}`);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError("Dikte suara berhenti. Coba lagi atau lanjutkan dengan mengetik.");
    };
    recognitionRef.current = recognition;
    setError("");
    setListening(true);
    recognition.start();
  }

  async function onFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).slice(
      0,
      Math.max(0, 12 - files.length - existingMedia.length)
    );
    if (!selected.length) return;
    setFiles((current) => [...current, ...selected]);
    setPreviews((current) => [
      ...current,
      ...selected.map((file) => ({
        src: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? ("video" as const) : ("image" as const),
      })),
    ]);

    if (lat === null) {
      const images = selected.filter((item) => item.type.startsWith("image/"));
      let found = false;
      try {
        const exifr = (await import("exifr")).default;
        for (const file of images) {
          const gps = await exifr.gps(file).catch(() => undefined);
          const gpsLatitude = gps?.latitude;
          const gpsLongitude = gps?.longitude;
          if (
            typeof gpsLatitude === "number" &&
            Number.isFinite(gpsLatitude) &&
            typeof gpsLongitude === "number" &&
            Number.isFinite(gpsLongitude)
          ) {
            setLat(Number(gpsLatitude.toFixed(6)));
            setLng(Number(gpsLongitude.toFixed(6)));
            setExifNote("Lokasi ditemukan otomatis dari foto");
            found = true;
            break;
          }
        }
      } catch {
        // Pengguna tetap dapat menentukan titik secara manual.
      }

      // Diam saja saat lokasi tidak ketemu membuat orang mengira fiturnya rusak.
      // Penyebabnya hampir selalu sama: iOS membuang koordinat kecuali
      // "Options -> Location" dinyalakan saat memilih foto.
      if (!found && images.length > 0) {
        setExifHint(true);
      }
    }
    event.target.value = "";
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index].src);
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function removeExistingMedia(id: string) {
    setExistingMedia((current) => current.filter((item) => item.id !== id));
  }

  function fillExample() {
    setTitle("Piknik kecil di taman kota");
    setDate("2026-07-19");
    setLocationName("Taman Kota, Bandung");
    setCollection("Cerita Sehari-hari");
    setMood("Hangat");
    setTags("berdua, piknik, akhir pekan");
    setStory("Minggu pagi yang awalnya biasa berubah jadi piknik dadakan. Kami membawa roti, buah, dan satu permainan kartu yang membuat semua tertawa lebih keras dari seharusnya.\n\nTidak ada agenda besar—hanya waktu yang benar-benar kami habiskan bersama.");
    setLat(-6.9175);
    setLng(107.6191);
    if (members[0]) setAuthorId(members[0].id);
    setPeopleIds(members.map((member) => member.id));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!title.trim() || !date) {
      setError("Judul dan tanggal wajib diisi.");
      return;
    }

    try {
      const mediaIds: string[] = existingMedia.map((item) => item.id);
      const mediaTypes: ("image" | "video")[] = existingMedia.map((item) =>
        item.type === "video" ? "video" : "image"
      );
      for (let index = 0; index < files.length; index += 1) {
        setStatus({ kind: "uploading", done: index, total: files.length });
        const original = files[index];
        let uploadFile = original;
        if (original.type.startsWith("image/")) {
          const imageCompression = (await import("browser-image-compression")).default;
          const compressed = await imageCompression(original, {
            maxSizeMB: 1.4,
            maxWidthOrHeight: 2200,
            useWebWorker: true,
            initialQuality: 0.86,
          });
          uploadFile = new File([compressed], original.name, { type: compressed.type || original.type });
        }
        // Checked here rather than only on the server: the platform rejects an
        // oversized body before our handler runs, so the API's own message
        // would never reach the user.
        if (uploadFile.size > MAX_UPLOAD_BYTES) {
          throw new Error(oversizedMediaMessage(original.name, uploadFile.size));
        }
        const formData = new FormData();
        formData.append("file", uploadFile);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.id) throw new Error(data.error || `Media ke-${index + 1} gagal diunggah`);
        mediaIds.push(data.id);
        mediaTypes.push(data.type === "video" ? "video" : "image");
      }

      setStatus({ kind: "saving" });
      const existingCoverStillPresent =
        initialMoment?.coverPhotoId &&
        mediaIds.includes(initialMoment.coverPhotoId)
          ? initialMoment.coverPhotoId
          : "";
      const coverPhotoId =
        existingCoverStillPresent ||
        mediaIds[mediaTypes.findIndex((type) => type === "image")] ||
        mediaIds[0] ||
        "";
      const response = await fetch(
        initialMoment ? `/api/moments/${encodeURIComponent(initialMoment.id)}` : "/api/moments",
        {
        method: initialMoment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, story, date, locationName, lat, lng, collection, mood,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          mediaIds, mediaTypes, coverPhotoId, authorId, peopleIds,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.moment) throw new Error(data.error || "Momen gagal disimpan");

      if (initialPlan?.id && initialPlan.status !== "completed") {
        await fetch(`/api/plans/${initialPlan.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        }).catch(() => undefined);
      }
      window.localStorage.removeItem(draftKey);
      router.push(`/moment/${data.moment.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Terjadi kesalahan saat menyimpan");
      setStatus({ kind: "idle" });
    }
  }

  const busy = status.kind !== "idle";

  return (
    <form onSubmit={submit} className="new-moment-layout">
      <div className="form-main">
        {draftCandidate && (
          <div className="draft-restore-card">
            <span><ArchiveRestore size={19} /></span>
            <div>
              <strong>Draft dari perangkat ini ditemukan</strong>
              <p>Disimpan {new Date(draftCandidate.savedAt).toLocaleString("id-ID")} · “{draftCandidate.title || "Belum berjudul"}”</p>
            </div>
            <button type="button" onClick={restoreDraft}>Pulihkan</button>
            <button type="button" onClick={discardDraft}>Abaikan</button>
          </div>
        )}
        {initialPlan && (
          <div className="plan-prefill-note">
            <span><Check size={17} /></span>
            <div>
              <strong>Rencana siap dijadikan kenangan</strong>
              <p>Detail dari “{initialPlan.title}” sudah diisikan. Tambahkan cerita dan media setelah momen ini terwujud.</p>
            </div>
          </div>
        )}
        <section className="form-section">
          <div className="form-section-heading"><span>01</span><div><h2>Mulai dari ceritanya</h2><p>Beri nama dan konteks agar mudah ditemukan kembali.</p></div></div>
          <div className="field-grid">
            <label className="field full"><span>Judul momen <b>*</b></span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Pagi pertama di Bromo" required /></label>
            <label className="field"><span><CalendarDays size={15} /> Tanggal <b>*</b></span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
            <label className="field"><span>Koleksi</span><select value={collection} onChange={(event) => setCollection(event.target.value)}>{collections.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field"><span>Suasana</span><select value={mood} onChange={(event) => setMood(event.target.value)}>{moods.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field"><span>Tag</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="berdua, liburan, sunrise" /></label>
            <label className="field full">
              <span>Cerita</span>
              <textarea value={story} onChange={(event) => setStory(event.target.value)} rows={8} placeholder="Apa yang terjadi? Siapa yang ada di sana? Hal kecil apa yang paling kamu ingat?" />
              <small>{story.length} karakter {lastDraftAt ? "· draft tersimpan otomatis" : ""}</small>
            </label>
            <div className="story-studio-tools field full">
              <div className="story-studio-heading">
                <span><PenLine size={15} /> Pemantik cerita</span>
                <button type="button" className={listening ? "is-listening" : ""} onClick={toggleDictation}>
                  {listening ? <CircleStop size={15} /> : <Mic size={15} />}
                  {listening ? "Hentikan dikte" : "Dikte suara"}
                </button>
              </div>
              <div className="story-prompt-list">
                {storyPrompts.map((prompt) => (
                  <button type="button" key={prompt} onClick={() => addPrompt(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>
            {members.length > 0 && (
              <>
                <label className="field">
                  <span>Diceritakan oleh</span>
                  <select value={authorId} onChange={(event) => setAuthorId(event.target.value)}>
                    <option value="">Pilih penulis</option>
                    {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                </label>
                <fieldset className="story-people-field field">
                  <legend>Siapa yang hadir?</legend>
                  <div>
                    {members.map((member) => (
                      <label key={member.id} className={peopleIds.includes(member.id) ? "selected" : ""}>
                        <input type="checkbox" checked={peopleIds.includes(member.id)} onChange={() => togglePerson(member.id)} />
                        <span style={{ background: member.color }}>{member.initials}</span>
                        {member.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading"><span>02</span><div><h2>Tambahkan foto &amp; video</h2><p>Gabungkan visual dan cerita menjadi kenangan yang utuh.</p></div></div>
          {existingMedia.length > 0 && (
            <div className="existing-media-block">
              <p>Media tersimpan</p>
              <div className="media-previews">
                {existingMedia.map((media, index) => (
                  <div className="media-preview" key={media.id}>
                    {media.type === "video" ? <video src={mediaSrc(media)} muted /> : <img src={mediaSrc(media)} alt={`Media tersimpan ${index + 1}`} />}
                    <span className="media-type-badge">{media.id === initialMoment?.coverPhotoId ? "Cover" : media.type === "video" ? "Video" : "Foto"}</span>
                    <button type="button" onClick={() => removeExistingMedia(media.id)} aria-label={`Hapus media tersimpan ${index + 1}`}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={onFilesChange} hidden />
          <button type="button" className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
            <span className="upload-icon"><UploadCloud size={27} /></span>
            <strong>Pilih foto atau video</strong>
            <p>JPG, PNG, HEIC, MP4, atau MOV · maksimal 12 media</p>
            <p className="upload-hint">Foto dikompres otomatis. Video maksimal {MAX_UPLOAD_MB} MB.</p>
            <span className="upload-browse">Telusuri media</span>
          </button>
          {previews.length > 0 && (
            <div className="media-previews">
              {previews.map((preview, index) => (
                <div className="media-preview" key={preview.src}>
                  {preview.type === "video" ? <video src={preview.src} muted /> : <img src={preview.src} alt={`Pratinjau ${index + 1}`} />}
                  <span className="media-type-badge">{preview.type === "video" ? <Film size={13} /> : <FileImage size={13} />}{preview.type === "video" ? "Video" : index === 0 ? "Cover" : "Foto"}</span>
                  <button type="button" onClick={() => removeFile(index)} aria-label={`Hapus media ${index + 1}`}><Trash2 size={15} /></button>
                </div>
              ))}
              {previews.length + existingMedia.length < 12 && <button type="button" className="add-more-media" onClick={() => fileInputRef.current?.click()}><ImagePlus size={22} /><span>Tambah lagi</span></button>}
            </div>
          )}
        </section>

        <section className="form-section">
          <div className="form-section-heading"><span>03</span><div><h2>Tandai lokasinya</h2><p>Foto dengan GPS dapat mengisi lokasi secara otomatis.</p></div></div>
          <label className="field"><span><MapPin size={15} /> Nama tempat</span><input value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="Contoh: Gunung Bromo, Jawa Timur" /></label>
          {exifNote && <p className="exif-note"><Check size={15} />{exifNote}</p>}
          {exifHint && !exifNote && (
            <p className="exif-hint">
              <MapPin size={15} />
              <span>
                Foto ini tidak membawa data lokasi. iPhone membuangnya kecuali
                kamu menyalakan <strong>Location</strong> lewat{" "}
                <strong>Options</strong> di pojok kiri bawah layar pemilih foto
                (hanya ada di iOS 17 ke atas). Kalau tidak ketemu, tandai saja
                sendiri di peta bawah ini.
              </span>
            </p>
          )}
          <div className="location-picker-wrap">
            <LocationPickerLazy lat={lat} lng={lng} onChange={(nextLat, nextLng) => { setLat(nextLat); setLng(nextLng); setExifNote(""); }} />
            {lat !== null && lng !== null && <div className="coordinates"><MapPin size={14} /> {lat}, {lng}<button type="button" onClick={() => { setLat(null); setLng(null); }}>Hapus titik</button></div>}
          </div>
        </section>

        {error && <div className="form-error">{error}</div>}
        <div className="form-submit-row">
          {!initialMoment && (
            <button type="button" className="secondary-button" onClick={fillExample} disabled={busy}><WandSparkles size={17} /> Isi data contoh</button>
          )}
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? <LoaderCircle size={18} className="spin" /> : <Sparkles size={17} />}
            {status.kind === "uploading" ? `Mengunggah ${status.done + 1}/${status.total}` : status.kind === "saving" ? "Menyimpan…" : initialMoment ? "Simpan perubahan" : "Simpan momen"}
          </button>
        </div>
      </div>

      <aside className="form-aside">
        <div className="form-tip-card"><span><Lightbulb size={20} /></span><h3>Cerita yang terasa hidup</h3><p>Tulis hal kecil: lelucon yang muncul, aroma makanan, cuaca, atau kalimat yang ingin selalu diingat.</p></div>
        <div className="form-progress-card"><p>Isi momen</p><div><span className={title ? "done" : ""}><Check size={13} />Judul</span><span className={story.length > 40 ? "done" : ""}><Check size={13} />Cerita</span><span className={files.length || existingMedia.length ? "done" : ""}><Check size={13} />Media</span><span className={lat !== null ? "done" : ""}><Check size={13} />Lokasi</span></div></div>
      </aside>
    </form>
  );
}
