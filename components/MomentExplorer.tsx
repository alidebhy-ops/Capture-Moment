"use client";

import Link from "next/link";
import {
  Bookmark,
  CalendarDays,
  Grid2X2,
  List,
  MapPin,
  Play,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatDateID } from "@/lib/format";
import { coverSrc } from "@/lib/media";
import type { Moment } from "@/lib/types";

function excerpt(value: string, length = 130) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length).trim()}…` : clean;
}

function MomentCard({ moment, listView }: { moment: Moment; listView: boolean }) {
  const cover = coverSrc(moment);
  const hasVideo = moment.media.some((item) => item.type === "video");

  return (
    <article className={listView ? "moment-card list-view" : "moment-card"}>
      <Link href={`/moment/${moment.id}`} className="moment-cover" aria-label={`Buka ${moment.title}`}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" />
        ) : (
          <span className="cover-placeholder">{moment.title.slice(0, 1).toUpperCase()}</span>
        )}
        <span className="cover-shade" />
        <span className="collection-pill">{moment.collection}</span>
        {hasVideo && <span className="video-pill"><Play size={12} fill="currentColor" /> Video</span>}
        <button
          type="button"
          className="bookmark-button"
          aria-label={moment.favorite ? "Hapus dari favorit" : "Simpan ke favorit"}
          onClick={(event) => event.preventDefault()}
        >
          <Bookmark size={17} fill={moment.favorite ? "currentColor" : "none"} />
        </button>
      </Link>
      <div className="moment-card-body">
        <div className="moment-meta">
          <span><CalendarDays size={14} />{formatDateID(moment.date)}</span>
          {moment.locationName && <span><MapPin size={14} />{moment.locationName}</span>}
        </div>
        <Link href={`/moment/${moment.id}`}>
          <h3>{moment.title}</h3>
        </Link>
        <p>{excerpt(moment.story)}</p>
        <div className="tag-row">
          {moment.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
      </div>
    </article>
  );
}

export default function MomentExplorer({ moments, initialCollection = "Semua" }: { moments: Moment[]; initialCollection?: string }) {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState(initialCollection);
  const [listView, setListView] = useState(false);
  const collections = useMemo(
    () => ["Semua", "Favorit", ...Array.from(new Set(moments.map((moment) => moment.collection)))],
    [moments]
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id");
    return moments.filter((moment) => {
      const sameCollection =
        collection === "Semua" ||
        (collection === "Favorit" ? moment.favorite : moment.collection === collection);
      const haystack = [moment.title, moment.story, moment.locationName, ...moment.tags]
        .join(" ")
        .toLocaleLowerCase("id");
      return sameCollection && (!needle || haystack.includes(needle));
    });
  }, [collection, moments, query]);

  return (
    <section className="explorer-section" aria-labelledby="all-memories-heading">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Arsip keluarga</p>
          <h2 id="all-memories-heading">Semua momen</h2>
          <p>{filtered.length} cerita ditemukan</p>
        </div>
        <div className="view-switcher" aria-label="Pilihan tampilan">
          <button type="button" className={!listView ? "active" : ""} onClick={() => setListView(false)} aria-label="Tampilan kartu">
            <Grid2X2 size={17} />
          </button>
          <button type="button" className={listView ? "active" : ""} onClick={() => setListView(true)} aria-label="Tampilan daftar">
            <List size={18} />
          </button>
        </div>
      </div>

      <div className="explorer-tools">
        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">Cari momen</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari cerita, tempat, atau tag…"
          />
        </label>
        <div className="collection-filters" aria-label="Filter koleksi">
          <SlidersHorizontal size={16} aria-hidden="true" />
          {collections.map((item) => (
            <button
              key={item}
              type="button"
              className={collection === item ? "active" : ""}
              onClick={() => setCollection(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className={listView ? "moments-grid list" : "moments-grid"}>
          {filtered.map((moment) => <MomentCard key={moment.id} moment={moment} listView={listView} />)}
        </div>
      ) : (
        <div className="empty-search">
          <Search size={28} />
          <h3>Belum menemukan momen itu</h3>
          <p>Coba kata lain atau pilih koleksi yang berbeda.</p>
          <button type="button" onClick={() => { setQuery(""); setCollection("Semua"); }}>
            Hapus filter
          </button>
        </div>
      )}
    </section>
  );
}
