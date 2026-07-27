import { google } from "googleapis";

type OAuthClient = InstanceType<typeof google.auth.OAuth2>;
type DriveClient = ReturnType<typeof google.drive>;
type SheetsClient = ReturnType<typeof google.sheets>;

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

  const client = new google.auth.OAuth2(
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

  const drive = google.drive({ version: "v3", auth: oauthClient() });
  globalThis.captureMomentDrive = drive;
  return drive;
}

export function getSheets(): SheetsClient {
  const existing = globalThis.captureMomentSheets;
  if (existing) return existing;

  const sheets = google.sheets({ version: "v4", auth: oauthClient() });
  globalThis.captureMomentSheets = sheets;
  return sheets;
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
