import { NextRequest, NextResponse } from "next/server";
import {
  addTimeCapsule,
  CapsuleValidationError,
  listTimeCapsules,
  validateCapsuleDraft,
} from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function GET() {
  try {
    const capsules = await listTimeCapsules();
    return NextResponse.json({ capsules });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Gagal membaca kapsul waktu") },
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
    const draft = validateCapsuleDraft(payload as Record<string, unknown>);
    const capsule = await addTimeCapsule(draft);
    return NextResponse.json({ capsule }, { status: 201 });
  } catch (error) {
    if (error instanceof CapsuleValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: errorMessage(error, "Gagal menyimpan kapsul waktu") },
      { status: 500 }
    );
  }
}
