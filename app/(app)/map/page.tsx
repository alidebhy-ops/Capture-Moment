/* eslint-disable @next/next/no-img-element -- Map thumbnails can be authenticated Drive streams. */
import Link from "next/link";
import { ArrowRight, MapPin, Navigation, Route } from "lucide-react";
import MomentsMapLazy from "@/components/MomentsMapLazy";
import { formatDateID } from "@/lib/format";
import { coverThumbSrc } from "@/lib/media";
import { listMoments, type Moment } from "@/lib/moments";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const moments = await listMoments().catch(() => [] as Moment[]);
  const located = moments.filter(
    (moment): moment is Moment & { lat: number; lng: number } => moment.lat !== null && moment.lng !== null
  );

  return (
    <div className="map-page">
      <header className="page-header-row">
        <div>
          <p className="eyebrow">Peta perjalanan kita</p>
          <h1>Setiap tempat punya cerita.</h1>
          <p>{located.length} momen tersebar dari perjalanan jauh hingga sudut kota yang dekat.</p>
        </div>
        <div className="map-summary"><Route size={20} /><span><strong>{located.length}</strong> tempat dikenang</span></div>
      </header>

      <div className="map-layout">
        <div className="map-canvas-card">
          <MomentsMapLazy
            moments={located.map((moment) => ({
              id: moment.id,
              title: moment.title,
              date: moment.date,
              lat: moment.lat,
              lng: moment.lng,
              locationName: moment.locationName,
              coverSrc: coverThumbSrc(moment, 200),
            }))}
            height="min(70vh, 720px)"
          />
          <div className="map-legend"><Navigation size={14} fill="currentColor" /> Klik pin untuk membuka cerita</div>
        </div>

        <aside className="place-list">
          <div className="place-list-header"><div><span>Jejak terbaru</span><h2>Tempat tersimpan</h2></div><MapPin size={20} /></div>
          <div className="place-list-scroll">
            {located.map((moment, index) => (
              <Link href={`/moment/${moment.id}`} className="place-item" key={moment.id}>
                <span className="place-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="place-thumb"><img src={coverThumbSrc(moment, 200)} alt="" loading="lazy" /></span>
                <span className="place-copy"><small>{formatDateID(moment.date)}</small><strong>{moment.title}</strong><span>{moment.locationName}</span></span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
