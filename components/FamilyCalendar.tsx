"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  Image as ImageIcon,
  ListTodo,
  Lock,
  MapPin,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  FamilyCalendarEvent,
  FamilyCalendarEventKind,
  TimeCapsule,
} from "@/lib/experience-types";
import type { Moment, Plan } from "@/lib/types";

type FamilyCalendarProps = {
  moments: Moment[];
  plans: Plan[];
  capsules: TimeCapsule[];
  nowIso: string;
};

const DAY_NAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const KIND_LABELS: Record<FamilyCalendarEventKind, string> = {
  moment: "Kenangan",
  plan: "Rencana",
  capsule: "Kapsul",
};

function simpleDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateInJakarta(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dateFromKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

function longDate(value: string): string {
  const date = dateFromKey(value);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function buildCalendarEvents(
  moments: Moment[],
  plans: Plan[],
  capsules: TimeCapsule[]
): FamilyCalendarEvent[] {
  const events: FamilyCalendarEvent[] = [];
  for (const moment of moments) {
    const date = simpleDate(moment.date);
    if (!date) continue;
    events.push({
      id: `moment-${moment.id}`,
      kind: "moment",
      date,
      title: moment.title,
      subtitle:
        moment.locationName || `${moment.media.length} foto & video`,
      href: `/moment/${moment.id}`,
    });
  }
  for (const plan of plans) {
    const date = simpleDate(plan.targetDate);
    if (!date) continue;
    events.push({
      id: `plan-${plan.id}`,
      kind: "plan",
      date,
      title: plan.title,
      subtitle: plan.locationName || plan.category,
      href: "/plans",
      isComplete: plan.status === "completed",
    });
  }
  for (const capsule of capsules) {
    const date = dateInJakarta(capsule.unlockAt);
    if (!date) continue;
    events.push({
      id: `capsule-${capsule.id}`,
      kind: "capsule",
      date,
      title: capsule.title,
      subtitle: capsule.isUnlocked
        ? `Terbuka · dari ${capsule.creatorLabel}`
        : `Akan dibuka · untuk ${capsule.recipientMemberIds.join(", ") || "keluarga"}`,
      href: "/capsules",
      isUnlocked: capsule.isUnlocked,
    });
  }
  return events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.title.localeCompare(b.title, "id-ID");
  });
}

function EventIcon({ kind }: { kind: FamilyCalendarEventKind }) {
  if (kind === "moment") return <ImageIcon size={15} />;
  if (kind === "plan") return <ListTodo size={15} />;
  return <Lock size={15} />;
}

export default function FamilyCalendar({
  moments,
  plans,
  capsules,
  nowIso,
}: FamilyCalendarProps) {
  const todayKey = simpleDate(nowIso) || simpleDate(new Date().toISOString());
  const today = dateFromKey(todayKey);
  const allEvents = useMemo(
    () => buildCalendarEvents(moments, plans, capsules),
    [capsules, moments, plans]
  );
  const initialMonth = monthKey(today);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [activeKind, setActiveKind] = useState<
    FamilyCalendarEventKind | "all"
  >("all");
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const [visibleYear, visibleMonthNumber] = visibleMonth.split("-").map(Number);
  const monthIndex = visibleMonthNumber - 1;
  const filteredEvents = useMemo(
    () =>
      activeKind === "all"
        ? allEvents
        : allEvents.filter((event) => event.kind === activeKind),
    [activeKind, allEvents]
  );
  const monthEvents = useMemo(
    () =>
      filteredEvents.filter(
        (event) => event.date.slice(0, 7) === visibleMonth
      ),
    [filteredEvents, visibleMonth]
  );

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, FamilyCalendarEvent[]>();
    for (const event of monthEvents) {
      const current = grouped.get(event.date) ?? [];
      current.push(event);
      grouped.set(event.date, current);
    }
    return grouped;
  }, [monthEvents]);

  const effectiveSelectedDate =
    selectedDate.slice(0, 7) === visibleMonth
      ? selectedDate
      : visibleMonth === initialMonth
        ? todayKey
        : monthEvents[0]?.date ?? `${visibleMonth}-01`;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(Date.UTC(visibleYear, monthIndex, 1));
    const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setUTCDate(gridStart.getUTCDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setUTCDate(gridStart.getUTCDate() + index);
      return date;
    });
  }, [monthIndex, visibleYear]);

  const selectedEvents = eventsByDate.get(effectiveSelectedDate) ?? [];
  const upcoming = allEvents
    .filter((event) => event.date >= todayKey)
    .slice(0, 5);
  const nextEvent = upcoming[0];

  function moveMonth(offset: number) {
    const date = new Date(Date.UTC(visibleYear, monthIndex + offset, 1));
    setVisibleMonth(monthKey(date));
  }

  function returnToday() {
    setVisibleMonth(initialMonth);
    setSelectedDate(todayKey);
  }

  return (
    <div className="family-calendar-page">
      <header className="family-calendar-header">
        <div>
          <p className="family-calendar-eyebrow">
            <Sparkles size={14} /> Kalender keluarga
          </p>
          <h1>Masa lalu dan rencana, dalam satu garis waktu.</h1>
          <p>
            Lihat hari yang pernah dikenang, rencana yang sedang ditunggu, dan
            kapsul yang sebentar lagi terbuka.
          </p>
        </div>
        {nextEvent && (
          <div className="family-calendar-next">
            <span>
              <Clock3 size={15} /> Berikutnya
            </span>
            <strong>{nextEvent.title}</strong>
            <small>{longDate(nextEvent.date)}</small>
          </div>
        )}
      </header>

      <section
        className="family-calendar-summary"
        aria-label="Ringkasan kalender"
      >
        <div>
          <span className="family-calendar-summary-icon family-calendar-summary-moment">
            <ImageIcon size={19} />
          </span>
          <strong>{moments.length}</strong>
          <small>kenangan bertanggal</small>
        </div>
        <div>
          <span className="family-calendar-summary-icon family-calendar-summary-plan">
            <ListTodo size={19} />
          </span>
          <strong>
            {plans.filter((plan) => plan.status !== "completed").length}
          </strong>
          <small>rencana aktif</small>
        </div>
        <div>
          <span className="family-calendar-summary-icon family-calendar-summary-capsule">
            <Lock size={19} />
          </span>
          <strong>
            {capsules.filter((capsule) => !capsule.isUnlocked).length}
          </strong>
          <small>kapsul menunggu</small>
        </div>
      </section>

      <section className="family-calendar-workspace">
        <div className="family-calendar-main">
          <div className="family-calendar-toolbar">
            <div className="family-calendar-month-controls">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft size={19} />
              </button>
              <h2>{monthTitle(visibleYear, monthIndex)}</h2>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="Bulan berikutnya"
              >
                <ChevronRight size={19} />
              </button>
            </div>
            <button
              type="button"
              className="family-calendar-today-button"
              onClick={returnToday}
            >
              <RotateCcw size={15} /> Hari ini
            </button>
          </div>

          <div
            className="family-calendar-filters"
            aria-label="Filter jenis agenda"
          >
            {(["all", "moment", "plan", "capsule"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                className={activeKind === kind ? "is-active" : ""}
                onClick={() => setActiveKind(kind)}
                aria-pressed={activeKind === kind}
              >
                {kind === "all" ? (
                  <CalendarDays size={15} />
                ) : (
                  <EventIcon kind={kind} />
                )}
                {kind === "all" ? "Semua" : KIND_LABELS[kind]}
              </button>
            ))}
          </div>

          <div className="family-calendar-grid" role="grid">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="family-calendar-weekday"
                role="columnheader"
              >
                {day}
              </div>
            ))}
            {calendarDays.map((date) => {
              const key = dateKey(date);
              const events = eventsByDate.get(key) ?? [];
              const outside = date.getUTCMonth() !== monthIndex;
              const isToday = key === todayKey;
              const isSelected = key === effectiveSelectedDate;
              return (
                <button
                  type="button"
                  role="gridcell"
                  key={key}
                  className={[
                    "family-calendar-day",
                    outside ? "is-outside" : "",
                    isToday ? "is-today" : "",
                    isSelected ? "is-selected" : "",
                    events.length ? "has-events" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (outside) {
                      setVisibleMonth(monthKey(date));
                    }
                    setSelectedDate(key);
                  }}
                  aria-label={`${longDate(key)}, ${events.length} agenda`}
                  aria-selected={isSelected}
                >
                  <span className="family-calendar-day-number">
                    {date.getUTCDate()}
                  </span>
                  <span className="family-calendar-day-events">
                    {events.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={`family-calendar-event-dot family-calendar-event-${event.kind}`}
                        title={event.title}
                      >
                        <EventIcon kind={event.kind} />
                        <b>{event.title}</b>
                      </span>
                    ))}
                    {events.length > 3 && (
                      <small>+{events.length - 3} lagi</small>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="family-calendar-agenda">
          <div className="family-calendar-agenda-heading">
            <p className="family-calendar-eyebrow">Agenda pilihan</p>
            <h2>{longDate(effectiveSelectedDate)}</h2>
          </div>
          {selectedEvents.length ? (
            <div className="family-calendar-agenda-list">
              {selectedEvents.map((event) => (
                <Link
                  href={event.href}
                  key={event.id}
                  className={`family-calendar-agenda-item family-calendar-agenda-${event.kind}`}
                >
                  <span className="family-calendar-agenda-icon">
                    <EventIcon kind={event.kind} />
                  </span>
                  <span>
                    <small>{KIND_LABELS[event.kind]}</small>
                    <strong>{event.title}</strong>
                    <em>{event.subtitle}</em>
                  </span>
                  {event.isComplete || event.isUnlocked ? (
                    <CircleCheckBig size={16} />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="family-calendar-agenda-empty">
              <CalendarDays size={24} />
              <strong>Hari yang masih lapang.</strong>
              <p>
                Belum ada kenangan, rencana, atau kapsul pada tanggal ini.
              </p>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="family-calendar-upcoming">
              <h3>Yang akan datang</h3>
              {upcoming.map((event) => (
                <Link href={event.href} key={`upcoming-${event.id}`}>
                  <span>{dateFromKey(event.date).getUTCDate()}</span>
                  <div>
                    <small>
                      {new Intl.DateTimeFormat("id-ID", {
                        month: "short",
                        timeZone: "UTC",
                      }).format(dateFromKey(event.date))}
                    </small>
                    <strong>{event.title}</strong>
                  </div>
                  {event.kind === "moment" && <MapPin size={14} />}
                  {event.kind !== "moment" && (
                    <EventIcon kind={event.kind} />
                  )}
                </Link>
              ))}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
