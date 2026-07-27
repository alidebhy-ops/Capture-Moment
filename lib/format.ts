export function formatDateID(iso: string): string {
  const calendarDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = calendarDate
    ? new Date(Date.UTC(Number(calendarDate[1]), Number(calendarDate[2]) - 1, Number(calendarDate[3])))
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(calendarDate ? { timeZone: "UTC" } : {}),
  });
}

export function todayISOInTimeZone(
  timeZone = "Asia/Jakarta",
  now = new Date()
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
