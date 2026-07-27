import "server-only";

import { demoCapsules } from "./demo-capsules";
import { isDemoMode } from "./demo";
import {
  CAPSULE_THEMES,
  type CapsuleTheme,
  type TimeCapsule,
  type TimeCapsuleDraft,
  type TimeCapsuleRecord,
  type TimeCapsuleUpdate,
} from "./experience-types";
import { getSheetId, getSheets } from "./google";

export type {
  CapsuleTheme,
  TimeCapsule,
  TimeCapsuleDraft,
  TimeCapsuleUpdate,
} from "./experience-types";

const SHEET_TITLE = "TimeCapsules";
const RANGE = `${SHEET_TITLE}!A:I`;
const HEADER = [
  "id",
  "title",
  "message",
  "unlockAt",
  "recipientMemberIds",
  "creatorLabel",
  "theme",
  "createdAt",
  "updatedAt",
] as const;

export class CapsuleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapsuleValidationError";
  }
}

function textField(
  value: unknown,
  label: string,
  maxLength: number,
  options: { required?: boolean; fallback?: string } = {}
): string {
  const text =
    value === undefined
      ? options.fallback ?? ""
      : String(value ?? "").trim();
  if (options.required && !text) {
    throw new CapsuleValidationError(`${label} wajib diisi.`);
  }
  if (text.length > maxLength) {
    throw new CapsuleValidationError(
      `${label} maksimal ${maxLength.toLocaleString("id-ID")} karakter.`
    );
  }
  return text;
}

function dateTimeField(value: unknown, label = "Tanggal buka"): string {
  const raw = textField(value, label, 40, { required: true });
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new CapsuleValidationError(`${label} tidak valid.`);
  }
  return date.toISOString();
}

function recipientsField(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;
  if (!values) {
    throw new CapsuleValidationError("Daftar penerima tidak valid.");
  }
  if (values.length > 20) {
    throw new CapsuleValidationError("Penerima maksimal 20 orang.");
  }
  const recipients = values
    .map((recipient) => {
      if (typeof recipient !== "string") {
        throw new CapsuleValidationError("Nama penerima tidak valid.");
      }
      return recipient.trim();
    })
    .filter(Boolean);
  if (recipients.some((recipient) => recipient.length > 80)) {
    throw new CapsuleValidationError("Nama penerima maksimal 80 karakter.");
  }
  return [...new Set(recipients)];
}

function themeField(value: unknown): CapsuleTheme {
  const theme = String(value ?? "surat").trim();
  if (!(CAPSULE_THEMES as readonly string[]).includes(theme)) {
    throw new CapsuleValidationError("Tema kapsul tidak valid.");
  }
  return theme as CapsuleTheme;
}

export function validateCapsuleDraft(
  payload: Record<string, unknown>
): TimeCapsuleDraft {
  const unlockAt = dateTimeField(payload.unlockAt);
  if (new Date(unlockAt).getTime() <= Date.now()) {
    throw new CapsuleValidationError(
      "Kapsul baru harus memiliki waktu buka di masa depan."
    );
  }
  return {
    title: textField(payload.title, "Judul", 120, { required: true }),
    message: textField(payload.message, "Pesan", 10_000, { required: true }),
    unlockAt,
    recipientMemberIds: recipientsField(payload.recipientMemberIds),
    creatorLabel: textField(payload.creatorLabel, "Pembuat", 80, {
      fallback: "Akbar",
    }),
    theme: themeField(payload.theme),
  };
}

export function validateCapsuleUpdate(
  payload: Record<string, unknown>
): TimeCapsuleUpdate {
  const update: TimeCapsuleUpdate = {};
  if (Object.prototype.hasOwnProperty.call(payload, "title")) {
    update.title = textField(payload.title, "Judul", 120, { required: true });
  }
  if (Object.prototype.hasOwnProperty.call(payload, "message")) {
    update.message = textField(payload.message, "Pesan", 10_000, {
      required: true,
    });
  }
  if (Object.prototype.hasOwnProperty.call(payload, "unlockAt")) {
    update.unlockAt = dateTimeField(payload.unlockAt);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "recipientMemberIds")) {
    update.recipientMemberIds = recipientsField(payload.recipientMemberIds);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "creatorLabel")) {
    update.creatorLabel = textField(payload.creatorLabel, "Pembuat", 80, {
      required: true,
    });
  }
  if (Object.prototype.hasOwnProperty.call(payload, "theme")) {
    update.theme = themeField(payload.theme);
  }
  if (Object.keys(update).length === 0) {
    throw new CapsuleValidationError(
      "Tidak ada perubahan yang dapat disimpan."
    );
  }
  return update;
}

declare global {
  var captureMomentDemoCapsules: TimeCapsuleRecord[] | undefined;
}

function demoStore(): TimeCapsuleRecord[] {
  if (!globalThis.captureMomentDemoCapsules) {
    globalThis.captureMomentDemoCapsules = structuredClone(demoCapsules);
  }
  return globalThis.captureMomentDemoCapsules;
}

function isCapsuleTheme(value: string): value is CapsuleTheme {
  return (CAPSULE_THEMES as readonly string[]).includes(value);
}

function cell(row: unknown[], index: number): string {
  return String(row[index] ?? "").trim();
}

function parseRecipients(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((recipient): recipient is string => typeof recipient === "string")
      .map((recipient) => recipient.trim())
      .filter(Boolean)
      .slice(0, 20);
  } catch {
    return raw
      .split(",")
      .map((recipient) => recipient.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
}

function rowToRecord(row: unknown[]): TimeCapsuleRecord | null {
  const id = cell(row, 0);
  if (!id || id === "id") return null;
  const theme = cell(row, 6);
  return {
    id,
    title: cell(row, 1),
    message: cell(row, 2),
    unlockAt: cell(row, 3),
    recipientMemberIds: parseRecipients(cell(row, 4)),
    creatorLabel: cell(row, 5),
    theme: isCapsuleTheme(theme) ? theme : "surat",
    createdAt: cell(row, 7),
    updatedAt: cell(row, 8),
  };
}

function recordToRow(record: TimeCapsuleRecord): string[] {
  return [
    record.id,
    record.title,
    record.message,
    record.unlockAt,
    JSON.stringify(record.recipientMemberIds),
    record.creatorLabel,
    record.theme,
    record.createdAt,
    record.updatedAt,
  ];
}

function toPublicCapsule(
  record: TimeCapsuleRecord,
  now = new Date()
): TimeCapsule {
  const isUnlocked =
    Number.isFinite(new Date(record.unlockAt).getTime()) &&
    new Date(record.unlockAt).getTime() <= now.getTime();
  const common = {
    id: record.id,
    title: record.title,
    unlockAt: record.unlockAt,
    recipientMemberIds: [...record.recipientMemberIds],
    creatorLabel: record.creatorLabel,
    theme: record.theme,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    isUnlocked,
  };
  return isUnlocked ? { ...common, message: record.message } : common;
}

function sortRecords(
  capsules: TimeCapsule[],
  now = new Date()
): TimeCapsule[] {
  return capsules.sort((a, b) => {
    if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? 1 : -1;
    if (!a.isUnlocked && !b.isUnlocked) {
      return a.unlockAt.localeCompare(b.unlockAt);
    }
    const aDistance = Math.abs(
      now.getTime() - new Date(a.unlockAt).getTime()
    );
    const bDistance = Math.abs(
      now.getTime() - new Date(b.unlockAt).getTime()
    );
    return aDistance - bDistance;
  });
}

function preventEarlyUnlock(
  current: TimeCapsuleRecord,
  updates: TimeCapsuleUpdate,
  now: Date
): void {
  const isCurrentlyLocked =
    new Date(current.unlockAt).getTime() > now.getTime();
  if (
    isCurrentlyLocked &&
    updates.unlockAt &&
    new Date(updates.unlockAt).getTime() <= now.getTime()
  ) {
    throw new CapsuleValidationError(
      "Tanggal buka kapsul yang masih tersegel harus tetap berada di masa depan."
    );
  }
}

async function findCapsulesSheet() {
  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const result = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  return result.data.sheets?.find(
    (sheet) => sheet.properties?.title === SHEET_TITLE
  )?.properties;
}

async function ensureCapsulesSheet(): Promise<number> {
  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  let properties = await findCapsulesSheet();

  if (!properties) {
    try {
      const created = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEET_TITLE } } }],
        },
      });
      properties = created.data.replies?.[0]?.addSheet?.properties;
    } catch (error) {
      properties = await findCapsulesSheet();
      if (!properties) throw error;
    }
  }

  if (properties?.sheetId === undefined || properties.sheetId === null) {
    throw new Error("Tab TimeCapsules tidak dapat dibuat di Google Sheets.");
  }

  const headerResult = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TITLE}!A1:I1`,
  });
  const currentHeader = (headerResult.data.values?.[0] ?? []).map(String);
  const headerMatches = HEADER.every(
    (header, index) => currentHeader[index] === header
  );
  if (!headerMatches) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_TITLE}!A1:I1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...HEADER]] },
    });
  }
  return properties.sheetId;
}

type StoredCapsule = { record: TimeCapsuleRecord; rowNumber: number };

async function readStoredCapsules(): Promise<{
  sheetId: number;
  capsules: StoredCapsule[];
}> {
  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const sheetId = await ensureCapsulesSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TITLE}!A2:I`,
  });
  const rows = (result.data.values ?? []) as unknown[][];
  const capsules = rows
    .map((row, index) => {
      const record = rowToRecord(row);
      return record ? { record, rowNumber: index + 2 } : null;
    })
    .filter((entry): entry is StoredCapsule => entry !== null);
  return { sheetId, capsules };
}

export async function listTimeCapsules(
  now = new Date()
): Promise<TimeCapsule[]> {
  const records = isDemoMode()
    ? structuredClone(demoStore())
    : (await readStoredCapsules()).capsules.map(({ record }) => record);
  return sortRecords(records.map((record) => toPublicCapsule(record, now)), now);
}

export async function getTimeCapsule(
  id: string,
  now = new Date()
): Promise<TimeCapsule | null> {
  const record = isDemoMode()
    ? demoStore().find((item) => item.id === id)
    : (await readStoredCapsules()).capsules.find(
        (item) => item.record.id === id
      )?.record;
  return record ? toPublicCapsule(record, now) : null;
}

export async function addTimeCapsule(
  draft: TimeCapsuleDraft,
  now = new Date()
): Promise<TimeCapsule> {
  const timestamp = now.toISOString();
  const record: TimeCapsuleRecord = {
    ...structuredClone(draft),
    id: `capsule-${crypto.randomUUID().slice(0, 8)}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (isDemoMode()) {
    demoStore().unshift(record);
    return toPublicCapsule(record, now);
  }

  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  await ensureCapsulesSheet();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: RANGE,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [recordToRow(record)] },
  });
  return toPublicCapsule(record, now);
}

export async function updateTimeCapsule(
  id: string,
  updates: TimeCapsuleUpdate,
  now = new Date()
): Promise<TimeCapsule | null> {
  if (isDemoMode()) {
    const store = demoStore();
    const index = store.findIndex((capsule) => capsule.id === id);
    if (index < 0) return null;
    preventEarlyUnlock(store[index], updates, now);
    const updated: TimeCapsuleRecord = {
      ...store[index],
      ...structuredClone(updates),
      id: store[index].id,
      createdAt: store[index].createdAt,
      updatedAt: now.toISOString(),
    };
    store[index] = updated;
    return toPublicCapsule(updated, now);
  }

  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const { capsules } = await readStoredCapsules();
  const stored = capsules.find(({ record }) => record.id === id);
  if (!stored) return null;
  preventEarlyUnlock(stored.record, updates, now);
  const updated: TimeCapsuleRecord = {
    ...stored.record,
    ...updates,
    id: stored.record.id,
    createdAt: stored.record.createdAt,
    updatedAt: now.toISOString(),
  };
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_TITLE}!A${stored.rowNumber}:I${stored.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [recordToRow(updated)] },
  });
  return toPublicCapsule(updated, now);
}

export async function deleteTimeCapsule(id: string): Promise<boolean> {
  if (isDemoMode()) {
    const store = demoStore();
    const index = store.findIndex((capsule) => capsule.id === id);
    if (index < 0) return false;
    store.splice(index, 1);
    return true;
  }

  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const { sheetId, capsules } = await readStoredCapsules();
  const stored = capsules.find(({ record }) => record.id === id);
  if (!stored) return false;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: stored.rowNumber - 1,
              endIndex: stored.rowNumber,
            },
          },
        },
      ],
    },
  });
  return true;
}
