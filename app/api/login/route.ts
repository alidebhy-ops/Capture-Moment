import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";

export const runtime = "nodejs";

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;

type LoginAttempt = { count: number; resetAt: number };

declare global {
  var captureMomentLoginAttempts: Map<string, LoginAttempt> | undefined;
}

function attemptsStore(): Map<string, LoginAttempt> {
  if (!globalThis.captureMomentLoginAttempts) {
    globalThis.captureMomentLoginAttempts = new Map();
  }
  return globalThis.captureMomentLoginAttempts;
}

// Proxies append to x-forwarded-for, so the last entry is the one written by the
// hop closest to us; the earlier entries are whatever the caller chose to send.
// This is still best-effort — the real brake on guessing is the deliberately
// slow password derivation in verifyPassword, which survives both header
// spoofing and the cold starts that wipe this in-memory map.
function clientKey(request: NextRequest): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const candidate =
    forwarded?.[forwarded.length - 1] ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return candidate.slice(0, 120);
}

function activeAttempt(key: string, now = Date.now()): LoginAttempt | null {
  const store = attemptsStore();
  const attempt = store.get(key);
  if (!attempt) return null;
  if (attempt.resetAt <= now) {
    store.delete(key);
    return null;
  }
  return attempt;
}

function recordFailure(key: string, now = Date.now()): void {
  const store = attemptsStore();
  const current = activeAttempt(key, now);
  store.set(key, {
    count: (current?.count ?? 0) + 1,
    resetAt: current?.resetAt ?? now + LOGIN_WINDOW_MS,
  });

  // The map is only ever touched by login attempts, but an attacker rotating
  // the forwarded header could otherwise grow it without bound.
  if (store.size > 5_000) {
    for (const [entryKey, entry] of store) {
      if (entry.resetAt <= now) store.delete(entryKey);
    }
  }
}

export async function POST(request: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;
  const loginKey = clientKey(request);

  let password = "";
  let demo = false;
  try {
    const body = await request.json();
    password = String(body.password ?? "");
    demo = body.demo === true;
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }

  const attempt = !demo ? activeAttempt(loginKey) : null;
  if (attempt && attempt.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfter = Math.max(
      1,
      Math.ceil((attempt.resetAt - Date.now()) / 1000)
    );
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba kembali beberapa saat lagi." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  if (!demo) {
    if (!appPassword) {
      return NextResponse.json(
        { error: "APP_PASSWORD belum diisi di environment (lihat SETUP.md)" },
        { status: 500 }
      );
    }
    if (!(await verifyPassword(password, appPassword))) {
      recordFailure(loginKey);
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }
  }

  if (demo && !isDemoMode()) {
    return NextResponse.json(
      {
        error:
          "Preview demo hanya tersedia saat penyimpanan Google belum dihubungkan",
      },
      { status: 403 }
    );
  }

  attemptsStore().delete(loginKey);
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
