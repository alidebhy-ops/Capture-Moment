// Deliberately the scoped packages rather than the umbrella "googleapis": that
// one eagerly re-exports all 300+ Google APIs and produced a ~12 MB server
// chunk that every cold start had to parse, for the sake of exactly two APIs.
import { auth, drive } from "@googleapis/drive";
import { sheets } from "@googleapis/sheets";

type OAuthClient = InstanceType<typeof auth.OAuth2>;
type DriveClient = ReturnType<typeof drive>;
type SheetsClient = ReturnType<typeof sheets>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} belum diisi. Ikuti panduan SETUP.md untuk menghubungkan akun Google.`
    );
  }
  return value;
}

declare global {
  var captureMomentOAuthClient: OAuthClient | undefined;
  var captureMomentDrive: DriveClient | undefined;
  var captureMomentSheets: SheetsClient | undefined;
}

// One shared client per process. google-auth-library caches the access token on
// the client and refreshes it only when it expires, so reusing the client
// removes a token round-trip from every Sheets and Drive call.
function oauthClient(): OAuthClient {
  const existing = globalThis.captureMomentOAuthClient;
  if (existing) return existing;

  const client = new auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET")
  );
  client.setCredentials({ refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN") });
  globalThis.captureMomentOAuthClient = client;
  return client;
}

export function getDrive(): DriveClient {
  const existing = globalThis.captureMomentDrive;
  if (existing) return existing;

  const client = drive({ version: "v3", auth: oauthClient() });
  globalThis.captureMomentDrive = client;
  return client;
}

export function getSheets(): SheetsClient {
  const existing = globalThis.captureMomentSheets;
  if (existing) return existing;

  const client = sheets({ version: "v4", auth: oauthClient() });
  globalThis.captureMomentSheets = client;
  return client;
}

// Drive's thumbnailLink points at googleusercontent, which needs a bearer token
// for private files. Reusing the shared client means this is normally served
// from its cached token rather than a fresh refresh.
export async function getAccessToken(): Promise<string | null> {
  const { token } = await oauthClient().getAccessToken();
  return token ?? null;
}

export function getSheetId(): string {
  return requireEnv("SHEET_ID");
}

export function getDriveFolderId(): string {
  return requireEnv("DRIVE_FOLDER_ID");
}
