import { describeGoogleError } from "@/lib/google-errors";
import { NextRequest, NextResponse } from "next/server";
import {
  deletePartner,
  PartnerValidationError,
  getPartner,
  updatePartner,
  validatePartnerDraft,
} from "@/lib/partners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MUTABLE_FIELDS = [
  "name",
  "initials",
  "relationship",
  "bio",
  "birthday",
  "color",
  "momentIds",
] as const;

type MemberRouteContext = { params: Promise<{ id: string }> };

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? describeGoogleError(error) : fallback;
}

async function routeId(context: MemberRouteContext): Promise<string | null> {
  const { id } = await context.params;
  return /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : null;
}

export async function GET(
  _request: NextRequest,
  context: MemberRouteContext
) {
  const id = await routeId(context);
  if (!id) {
    return NextResponse.json(
      { error: "ID anggota tidak valid." },
      { status: 400 }
    );
  }
  try {
    const member = await getPartner(id);
    if (!member) {
      return NextResponse.json(
        { error: "Anggota tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json({ member });
  } catch (error) {
    return NextResponse.json(
      { error: message(error, "Gagal membaca profil.") },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: MemberRouteContext
) {
  const id = await routeId(context);
  if (!id) {
    return NextResponse.json(
      { error: "ID anggota tidak valid." },
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

  const input = payload as Record<string, unknown>;
  const requestedFields = MUTABLE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(input, field)
  );
  if (!requestedFields.length) {
    return NextResponse.json(
      { error: "Tidak ada perubahan yang dapat disimpan." },
      { status: 400 }
    );
  }

  try {
    const existing = await getPartner(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Anggota tidak ditemukan." },
        { status: 404 }
      );
    }
    const merged: Record<string, unknown> = {
      name: existing.name,
      initials: existing.initials,
      relationship: existing.relationship,
      bio: existing.bio,
      birthday: existing.birthday,
      color: existing.color,
      momentIds: existing.momentIds,
    };
    for (const field of requestedFields) merged[field] = input[field];
    const draft = validatePartnerDraft(merged);
    const member = await updatePartner(id, draft);
    if (!member) {
      return NextResponse.json(
        { error: "Anggota tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof PartnerValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: message(error, "Gagal memperbarui profil.") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: MemberRouteContext
) {
  const id = await routeId(context);
  if (!id) {
    return NextResponse.json(
      { error: "ID anggota tidak valid." },
      { status: 400 }
    );
  }
  try {
    const deleted = await deletePartner(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Anggota tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: message(error, "Gagal menghapus profil.") },
      { status: 500 }
    );
  }
}

