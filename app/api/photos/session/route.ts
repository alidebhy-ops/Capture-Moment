import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo";
import {
  createPickerSession,
  deletePickerSession,
  getPickerSession,
} from "@/lib/photos-picker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function demoUnavailable() {
  return NextResponse.json(
    { error: "Impor dari Google Photos tidak tersedia di mode demo." },
    { status: 400 }
  );
}

function failure(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Google Photos sedang tidak dapat dihubungi.",
    },
    { status: 502 }
  );
}

export async function POST() {
  if (isDemoMode()) return demoUnavailable();
  try {
    return NextResponse.json({ session: await createPickerSession() });
  } catch (error) {
    return failure(error);
  }
}

// Dipanggil berulang oleh klien sampai pengguna selesai memilih di Google.
export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoUnavailable();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID sesi tidak ada" }, { status: 400 });
  }

  try {
    return NextResponse.json({ session: await getPickerSession(id) });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (id && !isDemoMode()) await deletePickerSession(id);
  return NextResponse.json({ ok: true });
}
