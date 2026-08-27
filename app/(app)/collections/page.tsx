/* eslint-disable @next/next/no-img-element -- Covers can be authenticated Drive streams. */
import Link from "next/link";
import { ArrowRight, Bookmark, FolderHeart, Images } from "lucide-react";
import { coverThumbSrc } from "@/lib/media";
import { listMoments } from "@/lib/moments";
import type { Moment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const moments = await listMoments().catch(() => [] as Moment[]);
  const grouped = Array.from(
    moments.reduce((map, moment) => {
      const group = map.get(moment.collection) || [];
      group.push(moment);
      map.set(moment.collection, group);
      return map;
    }, new Map<string, Moment[]>())
  );
  const favorites = moments.filter((moment) => moment.favorite);

  return (
    <div className="collections-page">
      <header className="page-header-row">
        <div><p className="eyebrow">Dikelompokkan dengan rapi</p><h1>Koleksi kenangan</h1><p>Temukan kembali cerita berdasarkan perjalanan, perayaan, dan keseharian.</p></div>
      </header>

      {favorites.length > 0 && (
        <section className="favorite-banner">
          <div className="favorite-collage">
            {favorites.slice(0, 3).map((moment) => <img key={moment.id} src={coverThumbSrc(moment, 200)} alt="" loading="lazy" />)}
          </div>
          <div className="favorite-banner-copy">
            <span className="soft-pill"><Bookmark size={14} fill="currentColor" /> Pilihan kita</span>
            <h2>Momen favorit</h2>
            <p>{favorites.length} cerita yang selalu ingin dibuka kembali.</p>
            <Link href="/?koleksi=Favorit" className="text-link">Buka favorit <ArrowRight size={16} /></Link>
          </div>
        </section>
      )}

      <section className="collection-list">
        <div className="section-heading-row">
          <div><p className="eyebrow">Album tematik</p><h2>Semua koleksi</h2><p>{grouped.length} koleksi dari seluruh perjalanan waktu.</p></div>
        </div>
        <div className="collection-grid">
          {grouped.map(([name, items]) => (
            <Link href={`/?koleksi=${encodeURIComponent(name)}`} className="collection-card" key={name}>
              <div className="collection-cover">
                {items.slice(0, 3).map((moment, index) => <img key={moment.id} src={coverThumbSrc(moment, 200)} alt="" data-index={index} loading="lazy" />)}
                <span className="collection-icon"><FolderHeart size={19} /></span>
              </div>
              <div className="collection-card-copy">
                <div><h3>{name}</h3><p><Images size={14} /> {items.reduce((sum, item) => sum + item.media.length, 0)} media · {items.length} cerita</p></div>
                <ArrowRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
