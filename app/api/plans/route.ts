import { NextRequest, NextResponse } from "next/server";
import {
  addPlan,
  listPlans,
  PlanValidationError,
  validatePlanDraft,
} from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function GET() {
  try {
    const plans = await listPlans();
    return NextResponse.json({ plans });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Gagal membaca rencana") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const draft = validatePlanDraft(payload as Record<string, unknown>);
    const plan = await addPlan(draft);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    if (error instanceof PlanValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: errorMessage(error, "Gagal menyimpan rencana") },
      { status: 500 }
    );
  }
}
