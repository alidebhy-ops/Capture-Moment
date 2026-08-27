import { describeGoogleError } from "@/lib/google-errors";
import { NextRequest, NextResponse } from "next/server";
import {
  addPartner,
  PartnerValidationError,
  listPartners,
  validatePartnerDraft,
} from "@/lib/partners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? describeGoogleError(error) : fallback;
}

export async function GET() {
  try {
    return NextResponse.json({ members: await listPartners() });
  } catch (error) {
    return NextResponse.json(
      { error: message(error, "Gagal membaca profil.") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const draft = validatePartnerDraft(
      payload as Record<string, unknown>
    );
    const member = await addPartner(draft);
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error instanceof PartnerValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: message(error, "Gagal menambahkan profil.") },
      { status: 500 }
    );
  }
}

