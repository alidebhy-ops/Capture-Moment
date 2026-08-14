import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth";
import { listTimeCapsules } from "@/lib/capsules";
import { listAllCommunity } from "@/lib/community";
import { listFamilyMembers } from "@/lib/family";
import { listAllMoments } from "@/lib/moments";
import { listPlans } from "@/lib/plans";
import type { Moment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Pulls five datasets and, on a cold start, sets up their tabs first.
export const maxDuration = 60;

function csvCell(value: unknown): string {
  let text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  if (/^[=+\-@]/.test(text.trimStart())) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

function momentsCsv(moments: Moment[]): string {
  const header = [
    "id",
    "title",
    "story",
    "date",
    "latitude",
    "longitude",
    "locationName",
    "mediaIds",
    "mediaTypes",
    "coverPhotoId",
    "collection",
    "tags",
    "mood",
    "favorite",
    "authorId",
    "peopleIds",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ];
  const rows = moments.map((moment) => [
    moment.id,
    moment.title,
    moment.story,
    moment.date,
    moment.lat,
    moment.lng,
    moment.locationName,
    moment.media.map((item) => item.id).join(","),
    moment.media.map((item) => item.type).join(","),
    moment.coverPhotoId,
    moment.collection,
    moment.tags.join(","),
    moment.mood,
    moment.favorite,
    moment.authorId ?? "",
    (moment.peopleIds ?? []).join(","),
    moment.createdAt,
    moment.updatedAt ?? moment.createdAt,
    moment.deletedAt ?? "",
  ]);
  return [
    header.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
}

function downloadHeaders(
  contentType: string,
  filename: string
): HeadersInit {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
  };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv") {
    return NextResponse.json(
      { error: "Format ekspor harus json atau csv" },
      { status: 400 }
    );
  }

  try {
    const [moments, plans, familyMembers, timeCapsules, community] = await Promise.all([
      listAllMoments(),
      listPlans(),
      listFamilyMembers(),
      listTimeCapsules(),
      listAllCommunity(),
    ]);
    const exportedAt = new Date().toISOString();
    const dateStamp = exportedAt.slice(0, 10);

    if (format === "csv") {
      return new Response(`\uFEFF${momentsCsv(moments)}`, {
        headers: downloadHeaders(
          "text/csv; charset=utf-8",
          `capturemoment-moments-${dateStamp}.csv`
        ),
      });
    }

    const activeMoments = moments.filter((moment) => !moment.deletedAt);
    const backup = {
      schemaVersion: 1,
      app: "CaptureMoment",
      exportedAt,
      summary: {
        moments: moments.length,
        activeMoments: activeMoments.length,
        deletedMoments: moments.length - activeMoments.length,
        favoriteMoments: activeMoments.filter((moment) => moment.favorite)
          .length,
        mediaReferences: moments.reduce(
          (total, moment) => total + moment.media.length,
          0
        ),
        plans: plans.length,
        familyMembers: familyMembers.length,
        timeCapsules: timeCapsules.length,
        comments: community.comments.length,
        reactions: community.reactions.length,
      },
      storageNotice: {
        includesMediaFiles: false,
        includesLockedCapsuleMessages: false,
        message:
          "Backup ini berisi data terstruktur dan referensi ID media. Berkas foto/video asli tetap berada di Google Drive. Isi pesan kapsul yang masih tersegel juga tidak disertakan agar tidak dapat dibuka lebih awal.",
      },
      moments,
      plans,
      familyMembers,
      timeCapsules,
      community,
    };

    return new Response(JSON.stringify(backup, null, 2), {
      headers: downloadHeaders(
        "application/json; charset=utf-8",
        `capturemoment-backup-${dateStamp}.json`
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Backup belum dapat dibuat",
      },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
}
