const GOOGLE_KEYS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "SHEET_ID",
  "DRIVE_FOLDER_ID",
] as const;

export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.NODE_ENV === "production") return false;
  return GOOGLE_KEYS.some((key) => !process.env[key]?.trim());
}
