"use client";

/* eslint-disable @next/next/no-img-element -- Media dapat berasal dari stream Drive yang terautentikasi. */

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Clock3,
  FolderHeart,
  MapPin,
  Plus,
  Shuffle,
  Sparkles,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatDateID } from "@/lib/format";
import { coverSrc, coverThumbSrc } from "@/lib/media";
import type { Moment } from "@/lib/types";

type MemoryRewindProps = {
  moments: Moment[];
  nowIso: string;
};

type CalendarParts = {
  year: number;
  month: number;
  day: number;
};

function calendarParts(value: string): CalendarParts | null {
  const simple = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (simple) {
    const year = Number(simple[1]);
    const month = Number(simple[2]);
    const day = Number(simple[3]);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (
      check.getUTCFullYear() === year &&
      check.getUTCMonth() + 1 === month &&
      check.getUTCDate() === day
    ) {
      return { year, month, day };
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function anniversaryDistance(
  moment: Moment,
  nowParts: CalendarParts
): number {
  const parts = calendarParts(moment.date);
  if (!parts) return Number.POSITIVE_INFINITY;
  const current = Date.UTC(2000, nowParts.month - 1, nowParts.day);
  const anniversary = Date.UTC(2000, parts.month - 1, parts.day);
  const direct = Math.abs(current - anniversary) / 86_400_000;
  return Math.min(direct, 366 - direct);
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function storyExcerpt(story: string, limit = 170): string {
  const clean = story.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit).trimEnd()}…`;
}

function memoryAge(moment: Moment, currentYear: number): string {
  const year = calendarParts(moment.date)?.year;
  if (!year) return "Kenangan tersimpan";
  const age = currentYear - year;
  if (age <= 0) return "Dari tahun ini";
  return `${age} tahun lalu`;
}

export default function MemoryRewind({
  moments,
  nowIso,
}: MemoryRewindProps) {
  const nowParts = useMemo(
    () =>
      calendarParts(nowIso) ?? {
        year: 2026,
        month: 1,
        day: 1,
      },
    [nowIso]
  );
  const sortedMoments = useMemo(
    () => [...moments].sort((a, b) => b.date.localeCompare(a.date)),
    [moments]
  );
  const exactToday = useMemo(
    () =>
      sortedMoments.filter((moment) => {
        const parts = calendarParts(moment.date);
        return (
          parts?.month === nowParts.month &&
          parts.day === nowParts.day
        );
      }),
    [nowParts.day, nowParts.month, sortedMoments]
  );
  const closestMemory = useMemo(
    () =>
      [...sortedMoments].sort(
        (a, b) =>
          anniversaryDistance(a, nowParts) -
          anniversaryDistance(b, nowParts)
      )[0],
    [nowParts, sortedMoments]
  );
  const todayMemory = exactToday[0] ?? closestMemory;

  const monthlySelection = useMemo(() => {
    const current = sortedMoments.filter((moment) => {
      const parts = calendarParts(moment.date);
      return (
        parts?.year === nowParts.year &&
        parts.month === nowParts.month
      );
    });
    if (current.length) {
      return {
        moments: current,
        year: nowParts.year,
        month: nowParts.month,
        isFallback: false,
      };
    }
    const latestParts = calendarParts(sortedMoments[0]?.date ?? "");
    if (!latestParts) {
      return {
        moments: [] as Moment[],
        year: nowParts.year,
        month: nowParts.month,
        isFallback: false,
      };
    }
    return {
      moments: sortedMoments.filter((moment) => {
        const parts = calendarParts(moment.date);
        return (
          parts?.year === latestParts.year &&
          parts.month === latestParts.month
        );
      }),
      year: latestParts.year,
      month: latestParts.month,
      isFallback: true,
    };
  }, [nowParts.month, nowParts.year, sortedMoments]);

  const yearlySelection = useMemo(() => {
    const current = sortedMoments.filter(
      (moment) => calendarParts(moment.date)?.year === nowParts.year
    );
    if (current.length) {
      return { moments: current, year: nowParts.year, isFallback: false };
    }
    const latestYear = calendarParts(sortedMoments[0]?.date ?? "")?.year;
    if (!latestYear) {
      return {
        moments: [] as Moment[],
        year: nowParts.year,
        isFallback: false,
      };
    }
    return {
      moments: sortedMoments.filter(
        (moment) => calendarParts(moment.date)?.year === latestYear
      ),
      year: latestYear,
      isFallback: true,
    };
  }, [nowParts.year, sortedMoments]);

  const [rouletteId, setRouletteId] = useState(
    todayMemory?.id ?? sortedMoments[0]?.id ?? ""
  );
  const [shuffleCount, setShuffleCount] = useState(0);
  const rouletteMoment =
    sortedMoments.find((moment) => moment.id === rouletteId) ??
    sortedMoments[0];

  function shuffleMemory() {
    if (!sortedMoments.length) return;
    if (sortedMoments.length === 1) {
      setShuffleCount((count) => count + 1);
      return;
    }
    const currentIndex = sortedMoments.findIndex(
      (moment) => moment.id === rouletteMoment?.id
    );
    let nextIndex = Math.floor(Math.random() * sortedMoments.length);
    if (nextIndex === currentIndex) {
      nextIndex = (nextIndex + 1) % sortedMoments.length;
    }
    setRouletteId(sortedMoments[nextIndex].id);
    setShuffleCount((count) => count + 1);
  }

  if (!sortedMoments.length) {
    return (
      <div className="rewind-empty">
        <span className="rewind-empty-icon">
          <Clock3 size={27} />
        </span>
        <p className="rewind-eyebrow">Hari ini di masa lalu</p>
        <h1>Mesin waktumu menunggu cerita pertama.</h1>
        <p>
          Setelah momen disimpan, CaptureMoment akan membawanya kembali pada
          tanggal yang tepat dan menyusun kilas balik bulanan serta tahunan.
        </p>
        <Link href="/new" className="rewind-primary-action">
          <Plus size={18} /> Abadikan momen pertama
        </Link>
      </div>
    );
  }

  const monthlyMediaCount = monthlySelection.moments.reduce(
    (total, moment) => total + moment.media.length,
    0
  );
  const yearlyMediaCount = yearlySelection.moments.reduce(
    (total, moment) => total + moment.media.length,
    0
  );
  const yearlyPlaces = new Set(
    yearlySelection.moments
      .map((moment) => moment.locationName)
      .filter(Boolean)
  ).size;
  const yearlyCollections = new Set(
    yearlySelection.moments.map((moment) => moment.collection)
  ).size;
  const yearlyFavorite = yearlySelection.moments.filter(
    (moment) => moment.favorite
  ).length;

  return (
    <div className="rewind-page">
      <header className="rewind-header">
        <div>
          <p className="rewind-eyebrow">
            <Sparkles size={14} /> Kilas balik keluarga
          </p>
          <h1>Hari ini di masa lalu.</h1>
          <p>
            Cerita lama hadir kembali tepat waktu, supaya kenangan tidak hanya
            tersimpan, tetapi juga hidup lagi.
          </p>
        </div>
        <div className="rewind-date-stamp" aria-label={formatDateID(nowIso)}>
          <strong>{String(nowParts.day).padStart(2, "0")}</strong>
          <span>
            {new Intl.DateTimeFormat("id-ID", {
              month: "short",
              timeZone: "UTC",
            }).format(new Date(Date.UTC(2000, nowParts.month - 1, 1)))}
          </span>
        </div>
      </header>

      {todayMemory && (
        <section className="rewind-today" aria-labelledby="rewind-today-title">
          <div className="rewind-today-cover">
            {coverSrc(todayMemory) ? (
              <img src={coverSrc(todayMemory)} alt="" />
            ) : (
              <span>{todayMemory.title.slice(0, 1).toUpperCase()}</span>
            )}
            <span className="rewind-today-shade" />
            <div className="rewind-today-badge">
              <CalendarDays size={15} />
              {exactToday.length
                ? memoryAge(todayMemory, nowParts.year)
                : "Kenangan terdekat"}
            </div>
          </div>
          <div className="rewind-today-copy">
            <p className="rewind-eyebrow">
              {exactToday.length
                ? `${exactToday.length} cerita pada tanggal ini`
                : "Belum ada cerita tepat di tanggal ini"}
            </p>
            <h2 id="rewind-today-title">{todayMemory.title}</h2>
            <div className="rewind-today-meta">
              <span>
                <CalendarDays size={15} />
                {formatDateID(todayMemory.date)}
              </span>
              {todayMemory.locationName && (
                <span>
                  <MapPin size={15} />
                  {todayMemory.locationName}
                </span>
              )}
            </div>
            <p>{storyExcerpt(todayMemory.story, 230)}</p>
            {!exactToday.length && (
              <small className="rewind-fallback-note">
                Kami memilih tanggal terdekat dari arsipmu. Saat ada momen di
                tanggal ini, cerita itu akan muncul otomatis.
              </small>
            )}
            <Link
              href={`/moment/${todayMemory.id}`}
              className="rewind-text-action"
            >
              Buka cerita lengkap <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      )}

      <section
        className="rewind-roulette"
        aria-labelledby="rewind-roulette-title"
      >
        <div className="rewind-section-heading">
          <div>
            <p className="rewind-eyebrow">Memory roulette</p>
            <h2 id="rewind-roulette-title">Biarkan arsip memilih cerita.</h2>
          </div>
          <button
            type="button"
            className="rewind-shuffle-button"
            onClick={shuffleMemory}
          >
            <Shuffle size={17} />
            Acak kenangan
          </button>
        </div>
        {rouletteMoment && (
          <article
            className="rewind-roulette-card"
            key={`${rouletteMoment.id}-${shuffleCount}`}
          >
            <div className="rewind-roulette-cover">
              {coverSrc(rouletteMoment) ? (
                <img src={coverSrc(rouletteMoment)} alt="" />
              ) : (
                <span>{rouletteMoment.title.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="rewind-roulette-copy">
              <span className="rewind-collection-pill">
                {rouletteMoment.collection}
              </span>
              <h3>{rouletteMoment.title}</h3>
              <p>{storyExcerpt(rouletteMoment.story)}</p>
              <div className="rewind-roulette-footer">
                <span>{formatDateID(rouletteMoment.date)}</span>
                <Link href={`/moment/${rouletteMoment.id}`}>
                  Baca lagi <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </article>
        )}
      </section>

      <section className="rewind-recaps" aria-label="Ringkasan arsip">
        <article className="rewind-recap-card rewind-recap-month">
          <div className="rewind-recap-heading">
            <div>
              <p className="rewind-eyebrow">
                {monthlySelection.isFallback
                  ? "Bulan terakhir yang terekam"
                  : "Bulan ini"}
              </p>
              <h2>
                {monthLabel(monthlySelection.year, monthlySelection.month)}
              </h2>
            </div>
            <span className="rewind-recap-icon">
              <CalendarDays size={21} />
            </span>
          </div>
          <div className="rewind-recap-collage">
            {monthlySelection.moments.slice(0, 3).map((moment) => (
              <Link
                href={`/moment/${moment.id}`}
                key={moment.id}
                aria-label={`Buka ${moment.title}`}
              >
                {coverThumbSrc(moment, 200) ? (
                  <img src={coverThumbSrc(moment, 200)} alt="" loading="lazy" />
                ) : (
                  <span>{moment.title.slice(0, 1)}</span>
                )}
              </Link>
            ))}
            {!monthlySelection.moments.length && (
              <span className="rewind-recap-no-media">
                Belum ada foto bulan ini
              </span>
            )}
          </div>
          <div className="rewind-recap-stats">
            <span>
              <strong>{monthlySelection.moments.length}</strong>
              cerita
            </span>
            <span>
              <strong>{monthlyMediaCount}</strong>
              media
            </span>
            <span>
              <strong>
                {
                  new Set(
                    monthlySelection.moments.map(
                      (moment) => moment.collection
                    )
                  ).size
                }
              </strong>
              koleksi
            </span>
          </div>
        </article>

        <article className="rewind-recap-card rewind-recap-year">
          <div className="rewind-recap-heading">
            <div>
              <p className="rewind-eyebrow">
                {yearlySelection.isFallback
                  ? "Tahun terakhir yang terekam"
                  : "Sepanjang tahun ini"}
              </p>
              <h2>Recap {yearlySelection.year}</h2>
            </div>
            <span className="rewind-recap-icon">
              <Star size={21} />
            </span>
          </div>
          <div className="rewind-year-grid">
            <div>
              <Camera size={18} />
              <strong>{yearlyMediaCount}</strong>
              <span>foto &amp; video</span>
            </div>
            <div>
              <MapPin size={18} />
              <strong>{yearlyPlaces}</strong>
              <span>tempat dikenang</span>
            </div>
            <div>
              <FolderHeart size={18} />
              <strong>{yearlyCollections}</strong>
              <span>koleksi cerita</span>
            </div>
            <div>
              <Star size={18} />
              <strong>{yearlyFavorite}</strong>
              <span>momen favorit</span>
            </div>
          </div>
          <p className="rewind-year-note">
            {yearlySelection.moments.length
              ? `${yearlySelection.moments.length} cerita membentuk jejak keluarga di ${yearlySelection.year}.`
              : "Belum ada cerita untuk dirangkum pada periode ini."}
          </p>
        </article>
      </section>
    </div>
  );
}
