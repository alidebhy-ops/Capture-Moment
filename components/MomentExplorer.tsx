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
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { formatDateID } from "@/lib/format";
import { coverThumbSrc } from "@/lib/media";
import type { Moment } from "@/lib/types";

function excerpt(value: string, length = 130) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length).trim()}…` : clean;
}

function MomentCard({
  moment,
  listView,
  favorite,
  pending,
  onToggleFavorite,
  activeTag,
  onSelectTag,
}: {
  moment: Moment;
  listView: boolean;
  favorite: boolean;
  pending: boolean;
  onToggleFavorite: (moment: Moment, next: boolean) => void;
  activeTag: string | null;
  onSelectTag: (tag: string) => void;
}) {
  const cover = coverThumbSrc(moment, 400);
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
          aria-label={favorite ? "Hapus dari favorit" : "Simpan ke favorit"}
          aria-pressed={favorite}
          disabled={pending}
          onClick={(event) => {
            event.preventDefault();
            onToggleFavorite(moment, !favorite);
          }}
        >
          <Bookmark size={17} fill={favorite ? "currentColor" : "none"} />
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
          {moment.tags.slice(0, 3).map((tag) => (
            <button
              key={tag}
              type="button"
              className={activeTag === tag ? "tag-chip active" : "tag-chip"}
              aria-pressed={activeTag === tag}
              onClick={() => onSelectTag(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function MomentExplorer({ moments, initialCollection = "Semua" }: { moments: Moment[]; initialCollection?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState(initialCollection);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [listView, setListView] = useState(false);
  // Favorites toggled from the grid are held here until the server confirms, so
  // the card reflects the click immediately and rolls back if the save fails.
  // basedOn records what the server said at the time, which is how the override
  // knows when it has been superseded.
  const [favoriteOverrides, setFavoriteOverrides] = useState<
    Record<string, { value: boolean; basedOn: boolean }>
  >({});
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null);

  const collections = useMemo(
    () => ["Semua", "Favorit", ...Array.from(new Set(moments.map((moment) => moment.collection)))],
    [moments]
  );

  // Derived rather than synced: an override applies only while the server still
  // reports the value it was based on. The moment fresh props disagree with
  // that baseline the server has spoken — either confirming this toggle or
  // carrying a change from another device — and the override steps aside.
  const isFavorite = useCallback(
    (moment: Moment) => {
      const override = favoriteOverrides[moment.id];
      if (!override) return moment.favorite;
      if (moment.favorite !== override.basedOn) return moment.favorite;
      return override.value;
    },
    [favoriteOverrides]
  );

  const toggleFavorite = useCallback(
    async (moment: Moment, next: boolean) => {
      setPendingFavorite(moment.id);
      setFavoriteOverrides((current) => ({
        ...current,
        [moment.id]: { value: next, basedOn: moment.favorite },
      }));
      try {
        const response = await fetch(`/api/moments/${moment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ favorite: next }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Favorit belum dapat disimpan.");
        }
        // The override stays until the refreshed props catch up; clearing it
        // here would flash the old value for as long as the refresh takes.
        router.refresh();
      } catch (error) {
        setFavoriteOverrides((current) => {
          const rolledBack = { ...current };
          delete rolledBack[moment.id];
          return rolledBack;
        });
        window.alert(error instanceof Error ? error.message : "Favorit belum dapat disimpan.");
      } finally {
        setPendingFavorite((current) => (current === moment.id ? null : current));
      }
    },
    [router]
  );

  const selectTag = useCallback((tag: string) => {
    setActiveTag((current) => (current === tag ? null : tag));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id");
    return moments.filter((moment) => {
      const sameCollection =
        collection === "Semua" ||
        (collection === "Favorit"
          ? isFavorite(moment)
          : moment.collection === collection);
      const matchesTag = !activeTag || moment.tags.includes(activeTag);
      const haystack = [moment.title, moment.story, moment.locationName, ...moment.tags]
        .join(" ")
        .toLocaleLowerCase("id");
      return sameCollection && matchesTag && (!needle || haystack.includes(needle));
    });
  }, [activeTag, collection, isFavorite, moments, query]);

  return (
    <section className="explorer-section" aria-labelledby="all-memories-heading">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Arsip kita</p>
          <h2 id="all-memories-heading">Semua momen</h2>
          <p>{filtered.length} cerita ditemukan</p>
        </div>
        <div className="view-switcher" aria-label="Pilihan tampilan">
          <button type="button" className={!listView ? "active" : ""} onClick={() => setListView(false)} aria-label="Tampilan kartu" aria-pressed={!listView}>
            <Grid2X2 size={17} />
          </button>
          <button type="button" className={listView ? "active" : ""} onClick={() => setListView(true)} aria-label="Tampilan daftar" aria-pressed={listView}>
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
              aria-pressed={collection === item}
              onClick={() => setCollection(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {activeTag && (
        <div className="active-tag-row">
          <span>Menampilkan momen bertag #{activeTag}</span>
          <button type="button" onClick={() => setActiveTag(null)}>
            Hapus filter tag
          </button>
        </div>
      )}

      {filtered.length ? (
        <div className={listView ? "moments-grid list" : "moments-grid"}>
          {filtered.map((moment) => (
            <MomentCard
              key={moment.id}
              moment={moment}
              listView={listView}
              favorite={isFavorite(moment)}
              pending={pendingFavorite === moment.id}
              onToggleFavorite={toggleFavorite}
              activeTag={activeTag}
              onSelectTag={selectTag}
            />
          ))}
        </div>
      ) : (
        <div className="empty-search">
          <Search size={28} />
          <h3>Belum menemukan momen itu</h3>
          <p>Coba kata lain atau pilih koleksi yang berbeda.</p>
          <button type="button" onClick={() => { setQuery(""); setCollection("Semua"); setActiveTag(null); }}>
            Hapus filter
          </button>
        </div>
      )}
    </section>
  );
}
