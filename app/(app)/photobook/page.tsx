import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarDays, MapPin } from "lucide-react";
import PrintButton from "@/components/PrintButton";
import { formatDateID } from "@/lib/format";
import { coverSrc } from "@/lib/media";
import { listMoments, type Moment } from "@/lib/moments";

export const dynamic = "force-dynamic";

function photobookExcerpt(story: string, limit = 850): string {
  const clean = story.trim();
  if (!clean) return "Cerita hari ini masih menunggu untuk dituliskan.";
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit).trimEnd()}…`;
}

export default async function PhotoBookPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  // Every sibling page degrades to an empty state when Sheets is unreachable;
  // without this the photobook was the one route that threw instead.
  const allMoments = await listMoments().catch(() => [] as Moment[]);
  const years = [...new Set(allMoments.map((moment) => moment.date.slice(0, 4)).filter(Boolean))]
    .sort()
    .reverse();
  const selectedYear = year && years.includes(year) ? year : years[0];
  const moments = selectedYear
    ? allMoments.filter((moment) => moment.date.startsWith(selectedYear))
    : allMoments;

  return (
    <div className="photobook-page">
      <header className="photobook-toolbar">
        <div>
          <Link href="/archive" className="back-link"><ArrowLeft size={16} /> Kembali ke pusat arsip</Link>
          <p className="eyebrow">Buku kita siap cetak</p>
          <h1>Photobook {selectedYear || "Keluarga"}</h1>
          <p>{moments.length} cerita disusun menjadi halaman yang nyaman dibaca dan dicetak.</p>
        </div>
        <div className="photobook-actions">
          <form action="/photobook">
            <label>
              <span>Tahun</span>
              <select name="year" defaultValue={selectedYear} aria-label="Pilih tahun photobook">
                {years.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <button type="submit" className="secondary-button">Tampilkan</button>
          </form>
          <PrintButton />
        </div>
      </header>

      <main className="photobook-sheet">
        <section className="photobook-cover">
          <span><BookOpen size={32} /></span>
          <p>CaptureMoment mempersembahkan</p>
          <h2>Cerita Kita<br />{selectedYear}</h2>
          <small>{moments.length} momen · dibuat untuk selalu dibuka kembali</small>
        </section>

        {moments.map((moment, index) => (
          <article className="photobook-spread" key={moment.id}>
            <div className="photobook-photo">
              {coverSrc(moment) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverSrc(moment)} alt="" />
              ) : (
                <span>{String(index + 1).padStart(2, "0")}</span>
              )}
            </div>
            <div className="photobook-copy">
              <span className="photobook-number">{String(index + 1).padStart(2, "0")}</span>
              <p className="eyebrow">{moment.collection}</p>
              <h2>{moment.title}</h2>
              <div className="photobook-meta">
                <span><CalendarDays size={14} /> {formatDateID(moment.date)}</span>
                {moment.locationName && <span><MapPin size={14} /> {moment.locationName}</span>}
              </div>
              <p className="photobook-story">{photobookExcerpt(moment.story)}</p>
              <div className="photobook-tags">{moment.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            </div>
          </article>
        ))}

        <section className="photobook-end">
          <span><BookOpen size={27} /></span>
          <h2>Sampai jumpa di cerita berikutnya.</h2>
          <p>Kenangan tidak berhenti di halaman terakhir.</p>
        </section>
      </main>
    </div>
  );
}
