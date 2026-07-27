import { NextRequest, NextResponse } from "next/server";
import {
  deletePlan,
  getPlan,
  PlanValidationError,
  updatePlan,
  validatePlanDraft,
} from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MUTABLE_FIELDS = [
  "title",
  "description",
  "category",
  "status",
  "priority",
  "targetDate",
  "locationName",
  "lat",
  "lng",
  "estimatedBudget",
  "savedAmount",
  "participants",
  "checklist",
  "notes",
] as const;

type RouteContext = { params: Promise<{ id: string }> };

function validId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,80}$/.test(id);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function routeId(context: RouteContext): Promise<string | null> {
  const { id } = await context.params;
  return validId(id) ? id : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const id = await routeId(context);
  if (!id) {
    return NextResponse.json({ error: "ID rencana tidak valid" }, { status: 400 });
  }

  try {
    const plan = await getPlan(id);
    if (!plan) {
      return NextResponse.json(
        { error: "Rencana tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Gagal membaca rencana") },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const id = await routeId(context);
  if (!id) {
    return NextResponse.json({ error: "ID rencana tidak valid" }, { status: 400 });
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

  const record = payload as Record<string, unknown>;
  const requestedFields = MUTABLE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(record, field)
  );
  if (requestedFields.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada perubahan yang dapat disimpan" },
      { status: 400 }
    );
  }

  try {
    const existing = await getPlan(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Rencana tidak ditemukan" },
        { status: 404 }
      );
    }

    const merged: Record<string, unknown> = {
      title: existing.title,
      description: existing.description,
      category: existing.category,
      status: existing.status,
      priority: existing.priority,
      targetDate: existing.targetDate,
      locationName: existing.locationName,
      lat: existing.lat,
      lng: existing.lng,
      estimatedBudget: existing.estimatedBudget,
      savedAmount: existing.savedAmount,
      participants: existing.participants,
      checklist: existing.checklist,
      notes: existing.notes,
    };
    for (const field of requestedFields) merged[field] = record[field];

    const validated = validatePlanDraft(merged);
    const plan = await updatePlan(id, validated);
    if (!plan) {
      return NextResponse.json(
        { error: "Rencana tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof PlanValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: errorMessage(error, "Gagal memperbarui rencana") },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const id = await routeId(context);
  if (!id) {
    return NextResponse.json({ error: "ID rencana tidak valid" }, { status: 400 });
  }

  try {
    const deleted = await deletePlan(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Rencana tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Gagal menghapus rencana") },
      { status: 500 }
    );
  }
}
