import { cache } from "react";
import { demoFamilyMembers } from "./demo-family";
import { isDemoMode } from "./demo";
import {
  type FamilyMember,
  type FamilyMemberDraft,
  type FamilyMemberUpdate,
} from "./family-types";
import { getSheetId, getSheets } from "./google";

// Kolom keempat dulu menyimpan peran anggota. Konsep peran sudah dibuang, tetapi
// kolomnya dipertahankan agar baris lama tidak bergeser posisinya.
const LEGACY_ROLE_CELL = "-";
import { ensureTabOnce } from "./sheet-setup";

export type {
  FamilyMember,
  FamilyMemberDraft,
  FamilyMemberUpdate,
} from "./family-types";

const SHEET_TITLE = "Members";
const RANGE = `${SHEET_TITLE}!A:L`;
const HEADER = [
  "id",
  "name",
  "initials",
  "relationship",
  "role",
  "bio",
  "birthday",
  "color",
  "momentIds",
  "createdAt",
  "updatedAt",
  "schemaVersion",
] as const;

const DEFAULT_AVATAR_COLOR = "#a8573d";

export class FamilyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FamilyValidationError";
  }
}

function textField(
  value: unknown,
  label: string,
  maxLength: number,
  fallback = ""
): string {
  const result = value === undefined ? fallback : String(value ?? "").trim();
  if (result.length > maxLength) {
    throw new FamilyValidationError(
      `${label} maksimal ${maxLength.toLocaleString("id-ID")} karakter.`
    );
  }
  return result;
}

function dateField(value: unknown): string {
  const date = textField(value, "Tanggal lahir", 10);
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new FamilyValidationError("Tanggal lahir tidak valid.");
  }
  return date;
}

function avatarColorField(value: unknown): string {
  const color = textField(
    value,
    "Warna avatar",
    7,
    DEFAULT_AVATAR_COLOR
  ).toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(color)) {
    throw new FamilyValidationError("Warna avatar harus berupa kode warna hex.");
  }
  return color;
}

function momentIdsField(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  const ids = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;
  if (!ids) {
    throw new FamilyValidationError("Daftar momen anggota tidak valid.");
  }
  if (ids.length > 500) {
    throw new FamilyValidationError("Momen anggota maksimal 500 item.");
  }
  const normalized = ids
    .map((id) => {
      if (typeof id !== "string") {
        throw new FamilyValidationError("ID momen tidak valid.");
      }
      const result = id.trim();
      if (
        result &&
        (!/^[A-Za-z0-9_-]{1,80}$/.test(result) || result.length > 80)
      ) {
        throw new FamilyValidationError("ID momen tidak valid.");
      }
      return result;
    })
    .filter(Boolean);
  return [...new Set(normalized)];
}

export function validateFamilyMemberDraft(
  payload: Record<string, unknown>
): FamilyMemberDraft {
  const name = textField(payload.name, "Nama", 80);
  if (!name) {
    throw new FamilyValidationError("Nama anggota wajib diisi.");
  }
  const requestedInitials = textField(payload.initials, "Inisial", 4);
  if (requestedInitials && !/^[\p{L}\p{N}]{1,4}$/u.test(requestedInitials)) {
    throw new FamilyValidationError(
      "Inisial hanya boleh berisi 1–4 huruf atau angka."
    );
  }

  return {
    name,
    initials:
      requestedInitials.toLocaleUpperCase("id-ID") ||
      name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toLocaleUpperCase("id-ID") ?? "")
        .join(""),
    relationship: textField(
      payload.relationship ?? payload.relation,
      "Panggilan",
      80
    ),
    bio: textField(payload.bio, "Cerita singkat", 600),
    birthday: dateField(payload.birthday),
    color: avatarColorField(payload.color ?? payload.avatarColor),
    momentIds: momentIdsField(payload.momentIds),
  };
}

declare global {
  var captureMomentDemoFamilyMembers: FamilyMember[] | undefined;
}

function demoStore(): FamilyMember[] {
  if (!globalThis.captureMomentDemoFamilyMembers) {
    globalThis.captureMomentDemoFamilyMembers =
      structuredClone(demoFamilyMembers);
  }
  return globalThis.captureMomentDemoFamilyMembers;
}

function cell(row: unknown[], index: number): string {
  return String(row[index] ?? "").trim();
}

function rowToMember(row: unknown[]): FamilyMember | null {
  const id = cell(row, 0);
  if (!id || id === "id") return null;
  return {
    id,
    name: cell(row, 1),
    initials: cell(row, 2),
    relationship: cell(row, 3),
    bio: cell(row, 5),
    birthday: cell(row, 6),
    color: /^#[0-9a-f]{6}$/i.test(cell(row, 7))
      ? cell(row, 7)
      : DEFAULT_AVATAR_COLOR,
    momentIds: cell(row, 8)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    createdAt: cell(row, 9),
    updatedAt: cell(row, 10),
  };
}

function memberToRow(member: FamilyMember): string[] {
  return [
    member.id,
    member.name,
    member.initials,
    member.relationship,
    LEGACY_ROLE_CELL,
    member.bio,
    member.birthday,
    member.color,
    member.momentIds.join(","),
    member.createdAt,
    member.updatedAt,
    "1",
  ];
}

function sortMembers(members: FamilyMember[]): FamilyMember[] {
  return members.sort((a, b) => a.name.localeCompare(b.name, "id-ID"));
}

async function findMembersSheet() {
  const sheets = getSheets();
  const result = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields: "sheets.properties(sheetId,title)",
  });
  return result.data.sheets?.find(
    (sheet) => sheet.properties?.title === SHEET_TITLE
  )?.properties;
}

function ensureMembersSheet(): Promise<number> {
  return ensureTabOnce(SHEET_TITLE, setUpMembersSheet);
}

async function setUpMembersSheet(): Promise<number> {
  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  let properties = await findMembersSheet();

  if (!properties) {
    try {
      const result = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEET_TITLE } } }],
        },
      });
      properties = result.data.replies?.[0]?.addSheet?.properties;
    } catch (error) {
      properties = await findMembersSheet();
      if (!properties) throw error;
    }
  }

  if (properties?.sheetId === undefined || properties.sheetId === null) {
    throw new Error("Tab Members tidak dapat dibuat di Google Sheets.");
  }

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TITLE}!A1:L1`,
  });
  const row = (current.data.values?.[0] ?? []).map(String);
  if (!HEADER.every((header, index) => row[index] === header)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_TITLE}!A1:L1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...HEADER]] },
    });
  }
  return properties.sheetId;
}

type StoredMember = { member: FamilyMember; rowNumber: number };

async function readStoredMembers(): Promise<{
  sheetId: number;
  members: StoredMember[];
}> {
  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const sheetId = await ensureMembersSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TITLE}!A2:L`,
  });
  const rows = (result.data.values ?? []) as unknown[][];
  return {
    sheetId,
    members: rows
      .map((row, index) => {
        const member = rowToMember(row);
        return member ? { member, rowNumber: index + 2 } : null;
      })
      .filter((item): item is StoredMember => item !== null),
  };
}

// Read paths share one download per request; writes use the uncached reader so
// they never compute a row number from a stale snapshot.
const cachedReadStoredMembers = cache(readStoredMembers);

export async function listFamilyMembers(): Promise<FamilyMember[]> {
  if (isDemoMode()) return sortMembers(structuredClone(demoStore()));
  const { members } = await cachedReadStoredMembers();
  return sortMembers(members.map(({ member }) => member));
}

export async function getFamilyMember(
  id: string
): Promise<FamilyMember | null> {
  if (isDemoMode()) {
    const member = demoStore().find((item) => item.id === id);
    return member ? structuredClone(member) : null;
  }
  const { members } = await cachedReadStoredMembers();
  return members.find(({ member }) => member.id === id)?.member ?? null;
}

export async function addFamilyMember(
  draft: FamilyMemberDraft
): Promise<FamilyMember> {
  const now = new Date().toISOString();
  const member: FamilyMember = {
    ...structuredClone(draft),
    id: `member-${crypto.randomUUID().slice(0, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  if (isDemoMode()) {
    demoStore().push(structuredClone(member));
    return structuredClone(member);
  }

  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  await ensureMembersSheet();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: RANGE,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [memberToRow(member)] },
  });
  return member;
}

export async function updateFamilyMember(
  id: string,
  updates: FamilyMemberUpdate
): Promise<FamilyMember | null> {
  if (isDemoMode()) {
    const store = demoStore();
    const index = store.findIndex((member) => member.id === id);
    if (index < 0) return null;
    const updated: FamilyMember = {
      ...store[index],
      ...structuredClone(updates),
      id: store[index].id,
      createdAt: store[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    store[index] = updated;
    return structuredClone(updated);
  }

  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const { members } = await readStoredMembers();
  const stored = members.find(({ member }) => member.id === id);
  if (!stored) return null;
  const updated: FamilyMember = {
    ...stored.member,
    ...updates,
    id: stored.member.id,
    createdAt: stored.member.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_TITLE}!A${stored.rowNumber}:L${stored.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [memberToRow(updated)] },
  });
  return updated;
}

export async function deleteFamilyMember(id: string): Promise<boolean> {
  if (isDemoMode()) {
    const store = demoStore();
    const index = store.findIndex((member) => member.id === id);
    if (index < 0) return false;
    store.splice(index, 1);
    return true;
  }

  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const { sheetId, members } = await readStoredMembers();
  const stored = members.find(({ member }) => member.id === id);
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
