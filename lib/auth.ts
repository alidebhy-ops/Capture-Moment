const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const SESSION_COOKIE = "cm_session";

declare global {
  var captureMomentDevSecret: string | undefined;
}

// Local development should work without any configuration, but a secret baked
// into the source would let anyone forge a session on a dev server that is
// reachable over the network. A per-process random value keeps setup-free local
// runs working while staying unguessable; restarting the server simply logs you
// out again.
function getSecret(): string {
  const configured = process.env.AUTH_SECRET;
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET belum diisi di environment");
  }

  if (!globalThis.captureMomentDevSecret) {
    globalThis.captureMomentDevSecret = crypto.randomUUID() + crypto.randomUUID();
  }
  return globalThis.captureMomentDevSecret;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return toHex(new Uint8Array(digest));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Mixing a fingerprint of the current password into the signed payload means
// rotating APP_PASSWORD invalidates every existing cookie, which is what people
// expect when they change a shared password after it leaks.
async function passwordFingerprint(): Promise<string> {
  const password = process.env.APP_PASSWORD;
  if (!password) return "no-password";
  return (await sha256Hex(password)).slice(0, 16);
}

async function hmacHex(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toHex(new Uint8Array(sig));
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${expiresAt}:${await passwordFingerprint()}`;
  const sig = await hmacHex(payload, getSecret());
  return `${expiresAt}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;

  const [expiresAt, sig] = token.split(".");
  if (!expiresAt || !sig) return false;
  if (!/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) < Math.floor(Date.now() / 1000)) return false;

  const payload = `${expiresAt}:${await passwordFingerprint()}`;
  const expected = await hmacHex(payload, getSecret());
  return timingSafeEqual(sig, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < b.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Deliberately slow. A shared password is short and guessable, and an
// in-memory rate limiter cannot span serverless instances, so making each guess
// cost real CPU is the defense that survives a cold start.
const PASSWORD_ITERATIONS = 150_000;

async function derivePassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode("capturemoment-login"),
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256
  );
  return toHex(new Uint8Array(bits));
}

export async function verifyPassword(
  candidate: string,
  expected: string
): Promise<boolean> {
  const [candidateHash, expectedHash] = await Promise.all([
    derivePassword(candidate),
    derivePassword(expected),
  ]);
  return timingSafeEqual(candidateHash, expectedHash);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
