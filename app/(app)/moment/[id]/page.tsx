/* eslint-disable @next/next/no-img-element -- Related covers can be authenticated Drive streams. */
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  FolderHeart,
  MapPin,
  Smile,
  Users,
} from "lucide-react";
import CommunityPanel from "@/components/CommunityPanel";
import MediaGallery from "@/components/MediaGallery";
import MomentActions from "@/components/MomentActions";
import MomentsMapLazy from "@/components/MomentsMapLazy";
import { getMomentCommunity } from "@/lib/community";
import { listFamilyMembers } from "@/lib/family";
import { formatDateID } from "@/lib/format";
import { coverSrc } from "@/lib/media";
import { getMoment, listMoments } from "@/lib/moments";

export const dynamic = "force-dynamic";

export default async function MomentDetailPage({ params }: PageProps<"/moment/[id]">) {
  const { id } = await params;
  const [moment, allMoments, members, community] = await Promise.all([
    getMoment(id).catch(() => null),
    listMoments().catch(() => []),
    listFamilyMembers().catch(() => []),
    getMomentCommunity(id).catch(() => ({ comments: [], reactions: [] })),
  ]);
  if (!moment) notFound();

  const related = allMoments
    .filter((item) => item.id !== moment.id && (item.collection === moment.collection || item.tags.some((tag) => moment.tags.includes(tag))))
    .slice(0, 2);
  const hasLocation = moment.lat !== null && moment.lng !== null;
  const author =
    members.find((member) => member.id === moment.authorId) ||
    members.find((member) => member.role === "admin");
  const people = members.filter(
    (member) =>
      moment.peopleIds?.includes(member.id) ||
      member.momentIds.includes(moment.id)
  );

  return (
    <article className="detail-page">
      <div className="detail-topbar">
        <Link href="/" className="back-link"><ArrowLeft size={17} /> Kembali ke beranda</Link>
        <MomentActions title={moment.title} initialFavorite={moment.favorite} />
      </div>

      <header className="detail-header">
        <span className="collection-label">{moment.collection}</span>
        <h1>{moment.title}</h1>
        <div className="detail-meta">
          <span><CalendarDays size={16} />{formatDateID(moment.date)}</span>
          {moment.locationName && <span><MapPin size={16} />{moment.locationName}</span>}
        </div>
      </header>

      <MediaGallery media={moment.media} title={moment.title} />

      <div className="story-layout">
        <div className="story-content">
          <div className="story-heading">
            <span>Catatan dari hari itu</span>
            <h2>Cerita di balik momen</h2>
          </div>
          <div className="story-prose">
            {moment.story.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
          <div className="detail-tags">
            {moment.tags.map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
        </div>

        <aside className="memory-facts">
          <p className="eyebrow">Tentang momen ini</p>
          <dl>
            <div><dt><FolderHeart size={17} />Koleksi</dt><dd>{moment.collection}</dd></div>
            <div><dt><Smile size={17} />Suasana</dt><dd>{moment.mood || "Penuh cerita"}</dd></div>
            <div><dt><CalendarDays size={17} />Diabadikan</dt><dd>{formatDateID(moment.date)}</dd></div>
            {people.length > 0 && (
              <div>
                <dt><Users size={17} />Bersama</dt>
                <dd>{people.map((member) => member.name).join(", ")}</dd>
              </div>
            )}
          </dl>
          <div className="author-note">
            <span className="author-avatar" style={author ? { background: author.color } : undefined}>{author?.initials || "MA"}</span>
            <div>
              <strong>Diceritakan oleh {author?.name || "Akbar"}</strong>
              <p>{author?.relationship || "Untuk keluarga, selamanya."}</p>
            </div>
          </div>
        </aside>
      </div>

      {hasLocation && (
        <section className="detail-map-section">
          <div className="section-heading-row compact">
            <div><p className="eyebrow">Jejak perjalanan</p><h2>Tempat cerita ini terjadi</h2></div>
          </div>
          <MomentsMapLazy
            moments={[{
              id: moment.id,
              title: moment.title,
              date: moment.date,
              lat: moment.lat!,
              lng: moment.lng!,
              locationName: moment.locationName,
              coverSrc: coverSrc(moment),
            }]}
            height="340px"
            withPopupLink={false}
          />
        </section>
      )}

      <section className="detail-community-section">
        <CommunityPanel
          momentId={moment.id}
          initialCommunity={community}
          members={members}
        />
      </section>

      {related.length > 0 && (
        <section className="related-section">
          <div className="section-heading-row compact">
            <div><p className="eyebrow">Masih satu cerita</p><h2>Kenangan terkait</h2></div>
            <Link href="/" className="text-button">Lihat semua <ChevronRight size={16} /></Link>
          </div>
          <div className="related-grid">
            {related.map((item) => (
              <Link href={`/moment/${item.id}`} key={item.id} className="related-card">
                {coverSrc(item) && <img src={coverSrc(item)} alt="" />}
                <div><span>{item.collection}</span><h3>{item.title}</h3><p>{formatDateID(item.date)}</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
