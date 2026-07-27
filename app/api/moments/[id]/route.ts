import { NextRequest, NextResponse } from "next/server";
import {
  getMoment,
  softDeleteMoment,
  updateMoment,
} from "@/lib/moments";
import type { MediaItem, MomentUpdate } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_PATTERN = /^[\w-]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatchResult =
  | { updates: MomentUpdate }
  | { error: string };

function hasOwn(
  value: Record<string, unknown>,
  key: string
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function boundedText(
  value: unknown,
  maxLength: number
): string | null {
  const text = String(value ?? "").trim();
  return text.length <= maxLength ? text : null;
}

function parsePatch(body: Record<string, unknown>): PatchResult {
  const updates: MomentUpdate = {};

  if (hasOwn(body, "title")) {
    const title = boundedText(body.title, 160);
    if (!title) return { error: "Judul wajib diisi dan maksimal 160 karakter" };
    updates.title = title;
  }

  if (hasOwn(body, "story")) {
    const story = boundedText(body.story, 20_000);
    if (story === null) return { error: "Cerita terlalu panjang" };
    updates.story = story;
  }

  if (hasOwn(body, "date")) {
    const date = String(body.date ?? "").trim();
    if (!isValidDate(date)) return { error: "Tanggal tidak valid" };
    updates.date = date;
  }

  if (hasOwn(body, "locationName")) {
    const locationName = boundedText(body.locationName, 200);
    if (locationName === null) return { error: "Nama lokasi terlalu panjang" };
    updates.locationName = locationName;
  }

  if (hasOwn(body, "lat")) {
    const lat =
      body.lat === null || body.lat === "" ? null : Number(body.lat);
    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      return { error: "Latitude tidak valid" };
    }
    updates.lat = lat;
  }

  if (hasOwn(body, "lng")) {
    const lng =
      body.lng === null || body.lng === "" ? null : Number(body.lng);
    if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      return { error: "Longitude tidak valid" };
    }
    updates.lng = lng;
  }

  if (hasOwn(body, "collection")) {
    const collection = boundedText(body.collection, 80);
    if (!collection) return { error: "Koleksi wajib diisi dan maksimal 80 karakter" };
    updates.collection = collection;
  }

  if (hasOwn(body, "mood")) {
    const mood = boundedText(body.mood, 50);
    if (mood === null) return { error: "Suasana terlalu panjang" };
    updates.mood = mood;
  }

  if (hasOwn(body, "tags")) {
    const tags = Array.isArray(body.tags)
      ? body.tags.map(String)
      : String(body.tags ?? "").split(",");
    const normalizedTags = tags
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (
      normalizedTags.length > 8 ||
      normalizedTags.some((tag) => tag.length > 40)
    ) {
      return { error: "Maksimal 8 tag, masing-masing 40 karakter" };
    }
    updates.tags = normalizedTags;
  }

  if (hasOwn(body, "favorite")) {
    if (typeof body.favorite !== "boolean") {
      return { error: "Nilai favorit tidak valid" };
    }
    updates.favorite = body.favorite;
  }

  const hasMediaIds = hasOwn(body, "mediaIds") || hasOwn(body, "photoIds");
  if (hasMediaIds) {
    const rawIds = hasOwn(body, "mediaIds") ? body.mediaIds : body.photoIds;
    if (!Array.isArray(rawIds)) return { error: "Daftar media tidak valid" };
    const mediaIds = rawIds
      .map(String)
      .map((id) => id.trim())
      .filter(Boolean);
    const mediaTypes = Array.isArray(body.mediaTypes)
      ? body.mediaTypes.map(String)
      : [];
    if (
      mediaIds.length > 30 ||
      mediaIds.some((id) => !ID_PATTERN.test(id)) ||
      mediaTypes.some((type) => type !== "image" && type !== "video")
    ) {
      return { error: "Media tidak valid" };
    }
    updates.media = mediaIds.map<MediaItem>((id, index) => ({
      id,
      type: mediaTypes[index] === "video" ? "video" : "image",
    }));
  } else if (hasOwn(body, "mediaTypes")) {
    return { error: "mediaTypes harus dikirim bersama mediaIds" };
  }

  if (hasOwn(body, "coverPhotoId")) {
    const coverPhotoId = String(body.coverPhotoId ?? "").trim();
    if (coverPhotoId && !ID_PATTERN.test(coverPhotoId)) {
      return { error: "Media sampul tidak valid" };
    }
    updates.coverPhotoId = coverPhotoId;
  }

  if (hasOwn(body, "authorId")) {
    const authorId = boundedText(body.authorId, 100);
    if (
      authorId === null ||
      (authorId.length > 0 && !ID_PATTERN.test(authorId))
    ) {
      return { error: "Penulis tidak valid" };
    }
    updates.authorId = authorId;
  }

  if (hasOwn(body, "peopleIds")) {
    if (!Array.isArray(body.peopleIds)) {
      return { error: "Daftar anggota tidak valid" };
    }
    const peopleIds = body.peopleIds
      .map(String)
      .map((personId) => personId.trim())
      .filter(Boolean);
    if (
      peopleIds.length > 50 ||
      peopleIds.some((personId) => !ID_PATTERN.test(personId))
    ) {
      return { error: "Daftar anggota tidak valid" };
    }
    updates.peopleIds = [...new Set(peopleIds)];
  }

  if (hasOwn(body, "deletedAt")) {
    if (body.deletedAt !== "" && body.deletedAt !== null) {
      return {
        error: "Gunakan DELETE untuk memindahkan momen ke tempat sampah",
      };
    }
    updates.deletedAt = "";
  }

  if (Object.keys(updates).length === 0) {
    return { error: "Tidak ada perubahan yang dapat disimpan" };
  }

  return { updates };
}

function invalidIdResponse() {
  return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return invalidIdResponse();

  try {
    const moment = await getMoment(id);
    if (!moment) {
      return NextResponse.json(
        { error: "Momen tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ moment });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal membaca momen",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return invalidIdResponse();

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid JSON object");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Request tidak valid" },
      { status: 400 }
    );
  }

  const parsed = parsePatch(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const moment = await updateMoment(id, parsed.updates);
    if (!moment) {
      return NextResponse.json(
        { error: "Momen tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ moment });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal memperbarui momen",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return invalidIdResponse();

  try {
    const moment = await softDeleteMoment(id);
    if (!moment) {
      return NextResponse.json(
        { error: "Momen tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ moment });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menghapus momen",
      },
      { status: 500 }
    );
  }
}
