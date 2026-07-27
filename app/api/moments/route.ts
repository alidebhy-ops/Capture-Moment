import { NextRequest, NextResponse } from "next/server";
import { addMoment, listMoments } from "@/lib/moments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_PATTERN = /^[\w-]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export async function GET(request: NextRequest) {
  try {
    const includeDeleted =
      request.nextUrl.searchParams.get("includeDeleted") === "true";
    const moments = await listMoments({ includeDeleted });
    return NextResponse.json({ moments });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal membaca data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid JSON object");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const story = String(body.story ?? "").trim();
  const date = String(body.date ?? "").trim();
  const locationName = String(body.locationName ?? "").trim();
  const mediaIds = Array.isArray(body.mediaIds)
    ? body.mediaIds.map(String).map((id) => id.trim()).filter(Boolean)
    : Array.isArray(body.photoIds)
      ? body.photoIds.map(String).map((id) => id.trim()).filter(Boolean)
    : [];
  const rawMediaTypes = Array.isArray(body.mediaTypes)
    ? body.mediaTypes.map(String)
    : [];
  const media = mediaIds.map((id, index) => ({
    id,
    type: rawMediaTypes[index] === "video" ? ("video" as const) : ("image" as const),
  }));
  const tags = Array.isArray(body.tags)
    ? body.tags.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 8)
    : String(body.tags ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8);
  const lat = body.lat === null || body.lat === undefined || body.lat === "" ? null : Number(body.lat);
  const lng = body.lng === null || body.lng === undefined || body.lng === "" ? null : Number(body.lng);
  const authorId = String(body.authorId ?? "").trim();
  const peopleIds = Array.isArray(body.peopleIds)
    ? body.peopleIds
        .map(String)
        .map((personId) => personId.trim())
        .filter(Boolean)
        .slice(0, 50)
    : [];
  const coverPhotoId = String(body.coverPhotoId ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
  }
  if (title.length > 160) {
    return NextResponse.json({ error: "Judul terlalu panjang" }, { status: 400 });
  }
  if (story.length > 20_000) {
    return NextResponse.json({ error: "Cerita terlalu panjang" }, { status: 400 });
  }
  if (!date || !isValidDate(date)) {
    return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
  }
  if (locationName.length > 200) {
    return NextResponse.json({ error: "Nama lokasi terlalu panjang" }, { status: 400 });
  }
  if (
    (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
    (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180))
  ) {
    return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
  }
  if (
    mediaIds.length > 30 ||
    mediaIds.some((id) => !ID_PATTERN.test(id)) ||
    (coverPhotoId && !ID_PATTERN.test(coverPhotoId))
  ) {
    return NextResponse.json({ error: "Media tidak valid" }, { status: 400 });
  }
  if (
    authorId.length > 100 ||
    (authorId && !ID_PATTERN.test(authorId)) ||
    peopleIds.some((personId) => !ID_PATTERN.test(personId))
  ) {
    return NextResponse.json({ error: "Data anggota tidak valid" }, { status: 400 });
  }

  try {
    const moment = await addMoment({
      title,
      story,
      date,
      lat,
      lng,
      locationName,
      media,
      coverPhotoId:
        coverPhotoId ||
        media.find((item) => item.type === "image")?.id ||
        mediaIds[0] ||
        "",
      collection:
        String(body.collection ?? "Cerita Sehari-hari")
          .trim()
          .slice(0, 80) || "Cerita Sehari-hari",
      tags,
      mood: String(body.mood ?? "").trim().slice(0, 50),
      favorite: body.favorite === true,
      authorId,
      peopleIds,
    });
    return NextResponse.json({ moment });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal menyimpan momen" },
      { status: 500 }
    );
  }
}
