import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

// Exact paths rather than prefixes: an earlier "login|offline" alternation also
// matched /login-history and friends, so any future route sharing a prefix
// would have silently lost its auth gate. Logging out stays public so an
// expired session can still clear its cookie instead of getting a 401.
const PUBLIC_PATHS = new Set([
  "/login",
  "/offline",
  "/api/login",
  "/api/logout",
  // Telegram has no session cookie; the route authenticates itself with the
  // secret token Telegram echoes back on every webhook call.
  "/api/telegram",
  "/manifest.webmanifest",
  "/sw.js",
  "/favicon.ico",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;

  // Assets served straight out of /public — icons, demo fixtures. API routes are
  // explicitly excluded so an endpoint whose path happens to end in .png or .mp4
  // can never be mistaken for a static file.
  if (pathname.startsWith("/api/")) return false;
  return /\.[a-z0-9]+$/i.test(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Build output has to stay reachable for the login page itself to render.
  matcher: ["/((?!_next/static).*)"],
};
