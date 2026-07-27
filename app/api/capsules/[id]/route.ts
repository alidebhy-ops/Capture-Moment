import { NextRequest, NextResponse } from "next/server";
import {
  CapsuleValidationError,
  deleteTimeCapsule,
  getTimeCapsule,
  updateTimeCapsule,
  validateCapsuleUpdate,
} from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CapsuleRouteContext = { params: Promise<{ id: string }> };

function validId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,80}$/.test(id);
}

async function routeId(
  context: CapsuleRouteContext
): Promise<string | null> {
  const { id } = await context.params;
  return validId(id) ? id : null;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(
  _request: NextRequest,
  context: CapsuleRouteContext
) {
  const id = await routeId(context);
  if (!id) {
    return NextResponse.json(
      { error: "ID kapsul tidak valid" },
      { status: 400 }
    );
  }
  try {
    const capsule = await getTimeCapsule(id);
    if (!capsule) {
      return NextResponse.json(
        { error: "Kapsul tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ capsule });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Gagal membaca kapsul waktu") },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: CapsuleRouteContext
) {
  const id = await routeId(context);
  if (!id) {
    return NextResponse.json(
      { error: "ID kapsul tidak valid" },
      { status: 400 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }

  try {
    const updates = validateCapsuleUpdate(
      payload as Record<string, unknown>
    );
    const capsule = await updateTimeCapsule(id, updates);
    if (!capsule) {
      return NextResponse.json(
        { error: "Kapsul tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ capsule });
  } catch (error) {
    if (error instanceof CapsuleValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: errorMessage(error, "Gagal memperbarui kapsul waktu") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: CapsuleRouteContext
) {
  const id = await routeId(context);
  if (!id) {
    return NextResponse.json(
      { error: "ID kapsul tidak valid" },
      { status: 400 }
    );
  }
  try {
    const deleted = await deleteTimeCapsule(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Kapsul tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Gagal menghapus kapsul waktu") },
      { status: 500 }
    );
  }
}
