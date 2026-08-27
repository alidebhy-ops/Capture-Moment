import { describeGoogleError } from "@/lib/google-errors";
import { NextRequest, NextResponse } from "next/server";
import {
  addCommunityComment,
  CommunityValidationError,
  deleteCommunityComment,
  getMomentCommunity,
  toggleCommunityReaction,
  validateCommentBody,
  validateCommunityId,
  validateReactionKind,
} from "@/lib/community";
import { getFamilyMember } from "@/lib/family";
import { getMoment } from "@/lib/moments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CommunityRouteContext = { params: Promise<{ id: string }> };

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? describeGoogleError(error) : fallback;
}

async function momentId(
  context: CommunityRouteContext
): Promise<string | null> {
  const { id } = await context.params;
  return /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : null;
}

export async function GET(
  _request: NextRequest,
  context: CommunityRouteContext
) {
  const id = await momentId(context);
  if (!id) {
    return NextResponse.json(
      { error: "ID momen tidak valid." },
      { status: 400 }
    );
  }
  try {
    if (!(await getMoment(id))) {
      return NextResponse.json(
        { error: "Momen tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json({ community: await getMomentCommunity(id) });
  } catch (error) {
    return NextResponse.json(
      { error: message(error, "Gagal membaca percakapan kita.") },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: CommunityRouteContext
) {
  const id = await momentId(context);
  if (!id) {
    return NextResponse.json(
      { error: "ID momen tidak valid." },
      { status: 400 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request tidak valid." },
      { status: 400 }
    );
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return NextResponse.json(
      { error: "Request tidak valid." },
      { status: 400 }
    );
  }

  try {
    const input = payload as Record<string, unknown>;
    const action = String(input.action ?? "").trim();
    const authorId = validateCommunityId(input.authorId, "ID penulis");
    const [moment, author] = await Promise.all([
      getMoment(id),
      getFamilyMember(authorId),
    ]);
    if (!moment) {
      return NextResponse.json(
        { error: "Momen tidak ditemukan." },
        { status: 404 }
      );
    }
    if (!author) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan." },
        { status: 404 }
      );
    }

    if (action === "comment") {
      const comment = await addCommunityComment({
        momentId: id,
        authorId,
        body: validateCommentBody(input.body),
      });
      return NextResponse.json(
        {
          comment,
          community: await getMomentCommunity(id),
        },
        { status: 201 }
      );
    }

    if (action === "reaction") {
      const result = await toggleCommunityReaction({
        momentId: id,
        authorId,
        reaction: validateReactionKind(input.reaction),
      });
      return NextResponse.json({
        ...result,
        community: await getMomentCommunity(id),
      });
    }

    return NextResponse.json(
      { error: "Aksi komunitas tidak dikenal." },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof CommunityValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: message(error, "Gagal menyimpan interaksi.") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: CommunityRouteContext
) {
  const id = await momentId(context);
  if (!id) {
    return NextResponse.json(
      { error: "ID momen tidak valid." },
      { status: 400 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request tidak valid." },
      { status: 400 }
    );
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return NextResponse.json(
      { error: "Request tidak valid." },
      { status: 400 }
    );
  }

  try {
    const input = payload as Record<string, unknown>;
    const authorId = validateCommunityId(input.authorId, "ID penulis");
    const commentId = validateCommunityId(input.commentId, "ID komentar");
    const author = await getFamilyMember(authorId);
    if (!author) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan." },
        { status: 404 }
      );
    }
    const deleted = await deleteCommunityComment({
      momentId: id,
      authorId,
      commentId,
    });
    if (!deleted) {
      return NextResponse.json(
        { error: "Komentar tidak ditemukan atau bukan milik anggota ini." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      community: await getMomentCommunity(id),
    });
  } catch (error) {
    if (error instanceof CommunityValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: message(error, "Gagal menghapus komentar.") },
      { status: 500 }
    );
  }
}
