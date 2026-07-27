import { google } from "googleapis";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} belum diisi. Ikuti panduan SETUP.md untuk menghubungkan akun Google.`
    );
  }
  return value;
}

function oauthClient() {
  const client = new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET")
  );
  client.setCredentials({ refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN") });
  return client;
}

export function getDrive() {
  return google.drive({ version: "v3", auth: oauthClient() });
}

export function getSheets() {
  return google.sheets({ version: "v4", auth: oauthClient() });
}

export function getSheetId(): string {
  return requireEnv("SHEET_ID");
}

export function getDriveFolderId(): string {
  return requireEnv("DRIVE_FOLDER_ID");
}
