/* eslint-disable @next/next/no-img-element -- Demo and Drive-backed covers are dynamic. */
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  ChevronRight,
  Clock3,
  FolderHeart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getFamilyMember } from "@/lib/family";
import { formatDateID } from "@/lib/format";
import { coverSrc } from "@/lib/media";
import { listMoments } from "@/lib/moments";

export const dynamic = "force-dynamic";

const ROLE_LABELS = {
  admin: "Pengelola keluarga",
  contributor: "Pencerita keluarga",
  viewer: "Pembaca keluarga",
} as const;

function yearsBetween(start: string, end: string): number {
  const first = Number(start.slice(0, 4));
  const last = Number(end.slice(0, 4));
  return Number.isFinite(first) && Number.isFinite(last)
    ? Math.max(0, last - first)
    : 0;
}

export default async function PersonTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [member, allMoments] = await Promise.all([
    getFamilyMember(id).catch(() => null),
    listMoments().catch(() => []),
  ]);
  if (!member) notFound();

  const moments = allMoments
    .filter(
      (moment) =>
        member.momentIds.includes(moment.id) ||
        moment.peopleIds?.includes(member.id)
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const collections = Array.from(
    new Set(moments.map((moment) => moment.collection))
  );
  const first = moments.at(-1);
  const latest = moments[0];
  const span =
    first && latest ? yearsBetween(first.date, latest.date) : 0;

  return (
    <article className="people-timeline-page">
      <Link href="/people" className="people-back-link">
        <ArrowLeft size={17} />
        Semua anggota
      </Link>

      <header
        className="people-profile-hero"
        style={{ "--people-color": member.color } as React.CSSProperties}
      >
        <span className="people-profile-avatar" aria-hidden="true">
          {member.initials}
        </span>
        <div className="people-profile-copy">
          <div className="people-profile-kicker">
            <span>{member.relationship || "Anggota keluarga"}</span>
            <span>
              {member.role === "admin" && <ShieldCheck size={13} />}
              {ROLE_LABELS[member.role]}
            </span>
          </div>
          <h1>{member.name}</h1>
          <p>
            {member.bio ||
              "Setiap momen bersama adalah satu halaman kecil dalam sejarah keluarga."}
          </p>
        </div>
        <dl className="people-profile-facts">
          <div>
            <dt>
              <Camera size={16} /> Momen
            </dt>
            <dd>{moments.length}</dd>
          </div>
          <div>
            <dt>
              <FolderHeart size={16} /> Koleksi
            </dt>
            <dd>{collections.length}</dd>
          </div>
          <div>
            <dt>
              <CalendarDays size={16} /> Ulang tahun
            </dt>
            <dd>{member.birthday ? formatDateID(member.birthday) : "Belum dicatat"}</dd>
          </div>
        </dl>
      </header>

      <section
        className="people-timeline-section"
        aria-labelledby="people-timeline-title"
      >
        <div className="people-timeline-heading">
          <div>
            <p>Jejak kehidupan</p>
            <h2 id="people-timeline-title">Linimasa bersama {member.name}</h2>
          </div>
          {moments.length > 0 && (
            <div className="people-timeline-range">
              <Clock3 size={16} />
              <span>
                {span > 0
                  ? `${span} tahun cerita`
                  : `${moments.length} bab berharga`}
              </span>
            </div>
          )}
        </div>

        {moments.length ? (
          <div className="people-timeline">
            {moments.map((moment, index) => {
              const cover = coverSrc(moment);
              return (
                <article className="people-timeline-item" key={moment.id}>
                  <div className="people-timeline-date">
                    <strong>{moment.date.slice(0, 4)}</strong>
                    <span>{formatDateID(moment.date)}</span>
                  </div>
                  <span className="people-timeline-dot" aria-hidden="true">
                    {index === 0 ? <Sparkles size={13} /> : null}
                  </span>
                  <Link
                    href={`/moment/${moment.id}`}
                    className="people-memory-card"
                  >
                    <div className="people-memory-cover">
                      {cover ? (
                        <img src={cover} alt="" loading="lazy" />
                      ) : (
                        <span>{moment.title.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="people-memory-copy">
                      <span>{moment.collection}</span>
                      <h3>{moment.title}</h3>
                      <p>
                        {moment.story.replace(/\s+/g, " ").trim().slice(0, 155)}
                        {moment.story.length > 155 ? "…" : ""}
                      </p>
                      <div>
                        {moment.tags.slice(0, 3).map((tag) => (
                          <small key={tag}>#{tag}</small>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={18} />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="people-timeline-empty">
            <Camera size={28} />
            <h3>Linimasa masih menunggu cerita pertama</h3>
            <p>
              Edit profil {member.name} dan hubungkan satu atau beberapa momen
              yang sudah tersimpan.
            </p>
            <Link href="/people">
              Kelola profil <ChevronRight size={16} />
            </Link>
          </div>
        )}
      </section>
    </article>
  );
}
