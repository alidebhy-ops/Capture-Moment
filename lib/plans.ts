import { demoPlans } from "./demo-plans";
import { isDemoMode } from "./demo";
import { getSheetId, getSheets } from "./google";
import {
  PLAN_CATEGORIES,
  PLAN_PRIORITIES,
  PLAN_STATUSES,
  type Plan,
  type PlanCategory,
  type PlanChecklistItem,
  type PlanDraft,
  type PlanPriority,
  type PlanStatus,
  type PlanUpdate,
} from "./types";

export type {
  Plan,
  PlanCategory,
  PlanChecklistItem,
  PlanDraft,
  PlanPriority,
  PlanStatus,
  PlanUpdate,
} from "./types";

const SHEET_TITLE = "Plans";
const RANGE = `${SHEET_TITLE}!A:Q`;
const HEADER = [
  "id",
  "title",
  "description",
  "category",
  "status",
  "priority",
  "targetDate",
  "locationName",
  "lat",
  "lng",
  "estimatedBudget",
  "savedAmount",
  "participants",
  "checklist",
  "notes",
  "createdAt",
  "updatedAt",
] as const;

export class PlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanValidationError";
  }
}

function textField(
  value: unknown,
  label: string,
  maxLength: number,
  fallback = ""
): string {
  const text = value === undefined ? fallback : String(value ?? "").trim();
  if (text.length > maxLength) {
    throw new PlanValidationError(
      `${label} maksimal ${maxLength.toLocaleString("id-ID")} karakter.`
    );
  }
  return text;
}

function enumField<T extends readonly string[]>(
  value: unknown,
  label: string,
  choices: T,
  fallback: T[number]
): T[number] {
  const normalized = String(value ?? fallback).trim();
  if (!(choices as readonly string[]).includes(normalized)) {
    throw new PlanValidationError(`${label} tidak valid.`);
  }
  return normalized as T[number];
}

function moneyField(value: unknown, label: string): number {
  if (value === undefined || value === null || value === "") return 0;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000_000) {
    throw new PlanValidationError(
      `${label} harus berupa angka positif yang valid.`
    );
  }
  return Math.round(amount);
}

function coordinateField(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number
): number | null {
  if (value === undefined || value === null || value === "") return null;
  const coordinate = Number(value);
  if (
    !Number.isFinite(coordinate) ||
    coordinate < minimum ||
    coordinate > maximum
  ) {
    throw new PlanValidationError(`${label} tidak valid.`);
  }
  return coordinate;
}

function dateField(value: unknown): string {
  const date = textField(value, "Tanggal target", 10);
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new PlanValidationError("Tanggal target tidak valid.");
  }
  return date;
}

function participantsField(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;
  if (!values) {
    throw new PlanValidationError("Daftar peserta tidak valid.");
  }
  if (values.length > 20) {
    throw new PlanValidationError("Peserta maksimal 20 orang.");
  }
  const participants = values
    .map((participant) => {
      if (typeof participant !== "string") {
        throw new PlanValidationError("Nama peserta tidak valid.");
      }
      return participant.trim();
    })
    .filter(Boolean);
  if (participants.some((participant) => participant.length > 80)) {
    throw new PlanValidationError("Nama peserta maksimal 80 karakter.");
  }
  return [...new Set(participants)];
}

function checklistField(value: unknown): PlanChecklistItem[] {
  if (value === undefined || value === null || value === "") return [];
  const items =
    typeof value === "string"
      ? value
          .split("\n")
          .map((label) => label.trim())
          .filter(Boolean)
      : value;
  if (!Array.isArray(items)) {
    throw new PlanValidationError("Checklist tidak valid.");
  }
  if (items.length > 30) {
    throw new PlanValidationError("Checklist maksimal 30 item.");
  }
  return items.map((item, index) => {
    if (typeof item === "string") {
      const label = item.trim();
      if (!label || label.length > 140) {
        throw new PlanValidationError(
          `Checklist nomor ${index + 1} harus berisi 1–140 karakter.`
        );
      }
      return {
        id: `check-${crypto.randomUUID().slice(0, 8)}`,
        label,
        done: false,
      };
    }
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new PlanValidationError(`Checklist nomor ${index + 1} tidak valid.`);
    }
    const record = item as Record<string, unknown>;
    const label = String(record.label ?? "").trim();
    if (!label || label.length > 140) {
      throw new PlanValidationError(
        `Checklist nomor ${index + 1} harus berisi 1–140 karakter.`
      );
    }
    const requestedId = String(record.id ?? "").trim();
    if (
      requestedId &&
      (!/^[A-Za-z0-9_-]+$/.test(requestedId) || requestedId.length > 80)
    ) {
      throw new PlanValidationError(`ID checklist nomor ${index + 1} tidak valid.`);
    }
    if (record.done !== undefined && typeof record.done !== "boolean") {
      throw new PlanValidationError(
        `Status checklist nomor ${index + 1} tidak valid.`
      );
    }
    return {
      id: requestedId || `check-${crypto.randomUUID().slice(0, 8)}`,
      label,
      done: record.done === true,
    };
  });
}

export function validatePlanDraft(payload: Record<string, unknown>): PlanDraft {
  const title = textField(payload.title, "Judul", 120);
  if (!title) throw new PlanValidationError("Judul rencana wajib diisi.");

  const lat = coordinateField(payload.lat, "Latitude", -90, 90);
  const lng = coordinateField(payload.lng, "Longitude", -180, 180);
  if ((lat === null) !== (lng === null)) {
    throw new PlanValidationError(
      "Latitude dan longitude harus diisi berpasangan."
    );
  }

  return {
    title,
    description: textField(payload.description, "Deskripsi", 3_000),
    category: enumField(
      payload.category,
      "Kategori",
      PLAN_CATEGORIES,
      "Perjalanan"
    ),
    status: enumField(payload.status, "Status", PLAN_STATUSES, "wishlist"),
    priority: enumField(
      payload.priority,
      "Prioritas",
      PLAN_PRIORITIES,
      "medium"
    ),
    targetDate: dateField(payload.targetDate),
    locationName: textField(payload.locationName, "Lokasi", 180),
    lat,
    lng,
    estimatedBudget: moneyField(payload.estimatedBudget, "Estimasi anggaran"),
    savedAmount: moneyField(payload.savedAmount, "Dana terkumpul"),
    participants: participantsField(payload.participants),
    checklist: checklistField(payload.checklist),
    notes: textField(payload.notes, "Catatan", 5_000),
  };
}

declare global {
  var captureMomentDemoPlans: Plan[] | undefined;
}

function demoStore(): Plan[] {
  if (!globalThis.captureMomentDemoPlans) {
    globalThis.captureMomentDemoPlans = structuredClone(demoPlans);
  }
  return globalThis.captureMomentDemoPlans;
}

function isPlanCategory(value: string): value is PlanCategory {
  return (PLAN_CATEGORIES as readonly string[]).includes(value);
}

function isPlanStatus(value: string): value is PlanStatus {
  return (PLAN_STATUSES as readonly string[]).includes(value);
}

function isPlanPriority(value: string): value is PlanPriority {
  return (PLAN_PRIORITIES as readonly string[]).includes(value);
}

function cell(row: unknown[], index: number): string {
  return String(row[index] ?? "").trim();
}

function numberCell(row: unknown[], index: number, fallback = 0): number {
  const value = Number(row[index]);
  return Number.isFinite(value) ? value : fallback;
}

function coordinateCell(row: unknown[], index: number): number | null {
  const raw = cell(row, index);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseChecklist(raw: string): PlanChecklistItem[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item)
      )
      .map((item) => ({
        id: String(item.id ?? "").trim(),
        label: String(item.label ?? "").trim(),
        done: item.done === true,
      }))
      .filter((item) => item.id && item.label)
      .slice(0, 30);
  } catch {
    return [];
  }
}

function rowToPlan(row: unknown[]): Plan | null {
  const id = cell(row, 0);
  if (!id || id === "id") return null;

  const category = cell(row, 3);
  const status = cell(row, 4);
  const priority = cell(row, 5);

  return {
    id,
    title: cell(row, 1),
    description: cell(row, 2),
    category: isPlanCategory(category) ? category : "Perjalanan",
    status: isPlanStatus(status) ? status : "wishlist",
    priority: isPlanPriority(priority) ? priority : "medium",
    targetDate: cell(row, 6),
    locationName: cell(row, 7),
    lat: coordinateCell(row, 8),
    lng: coordinateCell(row, 9),
    estimatedBudget: Math.max(0, numberCell(row, 10)),
    savedAmount: Math.max(0, numberCell(row, 11)),
    participants: cell(row, 12)
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
    checklist: parseChecklist(cell(row, 13)),
    notes: cell(row, 14),
    createdAt: cell(row, 15),
    updatedAt: cell(row, 16),
  };
}

function planToRow(plan: Plan): Array<string | number> {
  return [
    plan.id,
    plan.title,
    plan.description,
    plan.category,
    plan.status,
    plan.priority,
    plan.targetDate,
    plan.locationName,
    plan.lat ?? "",
    plan.lng ?? "",
    plan.estimatedBudget,
    plan.savedAmount,
    plan.participants.join(", "),
    JSON.stringify(plan.checklist),
    plan.notes,
    plan.createdAt,
    plan.updatedAt,
  ];
}

function sortPlans(plans: Plan[]): Plan[] {
  return plans.sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    if (a.targetDate && b.targetDate && a.targetDate !== b.targetDate) {
      return a.targetDate.localeCompare(b.targetDate);
    }
    if (a.targetDate && !b.targetDate) return -1;
    if (!a.targetDate && b.targetDate) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

async function findPlansSheet() {
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

async function ensurePlansSheet(): Promise<number> {
  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  let properties = await findPlansSheet();

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
      // Dua request pertama dapat mencoba membuat tab bersamaan. Jika tab sudah
      // terbentuk oleh request lain, gunakan tab itu; selain itu teruskan error.
      properties = await findPlansSheet();
      if (!properties) throw error;
    }
  }

  if (properties?.sheetId === undefined || properties.sheetId === null) {
    throw new Error("Tab Plans tidak dapat dibuat di Google Sheets.");
  }

  const headerResult = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TITLE}!A1:Q1`,
  });
  const currentHeader = (headerResult.data.values?.[0] ?? []).map(String);
  const headerMatches = HEADER.every(
    (header, index) => currentHeader[index] === header
  );
  if (!headerMatches) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_TITLE}!A1:Q1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...HEADER]] },
    });
  }

  return properties.sheetId;
}

type StoredPlan = { plan: Plan; rowNumber: number };

async function readStoredPlans(): Promise<{
  sheetId: number;
  storedPlans: StoredPlan[];
}> {
  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const sheetId = await ensurePlansSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TITLE}!A2:Q`,
  });
  const rows = (result.data.values ?? []) as unknown[][];
  const storedPlans = rows
    .map((row, index) => {
      const plan = rowToPlan(row);
      return plan ? { plan, rowNumber: index + 2 } : null;
    })
    .filter((item): item is StoredPlan => item !== null);
  return { sheetId, storedPlans };
}

export async function listPlans(): Promise<Plan[]> {
  if (isDemoMode()) {
    return sortPlans(structuredClone(demoStore()));
  }
  const { storedPlans } = await readStoredPlans();
  return sortPlans(storedPlans.map(({ plan }) => plan));
}

export async function getPlan(id: string): Promise<Plan | null> {
  if (isDemoMode()) {
    const plan = demoStore().find((item) => item.id === id);
    return plan ? structuredClone(plan) : null;
  }
  const { storedPlans } = await readStoredPlans();
  return storedPlans.find(({ plan }) => plan.id === id)?.plan ?? null;
}

export async function addPlan(draft: PlanDraft): Promise<Plan> {
  const now = new Date().toISOString();
  const plan: Plan = {
    ...draft,
    id: `plan-${crypto.randomUUID().slice(0, 8)}`,
    createdAt: now,
    updatedAt: now,
  };

  if (isDemoMode()) {
    demoStore().unshift(structuredClone(plan));
    return structuredClone(plan);
  }

  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  await ensurePlansSheet();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: RANGE,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [planToRow(plan)] },
  });
  return plan;
}

export async function updatePlan(
  id: string,
  updates: PlanUpdate
): Promise<Plan | null> {
  if (isDemoMode()) {
    const store = demoStore();
    const index = store.findIndex((plan) => plan.id === id);
    if (index < 0) return null;
    const updated: Plan = {
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
  const { storedPlans } = await readStoredPlans();
  const stored = storedPlans.find(({ plan }) => plan.id === id);
  if (!stored) return null;
  const updated: Plan = {
    ...stored.plan,
    ...updates,
    id: stored.plan.id,
    createdAt: stored.plan.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_TITLE}!A${stored.rowNumber}:Q${stored.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [planToRow(updated)] },
  });
  return updated;
}

export async function deletePlan(id: string): Promise<boolean> {
  if (isDemoMode()) {
    const store = demoStore();
    const index = store.findIndex((plan) => plan.id === id);
    if (index < 0) return false;
    store.splice(index, 1);
    return true;
  }

  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const { sheetId, storedPlans } = await readStoredPlans();
  const stored = storedPlans.find(({ plan }) => plan.id === id);
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
