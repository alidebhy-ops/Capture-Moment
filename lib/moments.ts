import { getSheets, getSheetId } from "./google";
import { isDemoMode } from "./demo";
import { demoMoments } from "./demo-data";
import type {
  MediaItem,
  MediaType,
  Moment,
  MomentDraft,
  MomentUpdate,
} from "./types";

export type {
  MediaItem,
  MediaType,
  Moment,
  MomentDraft,
  MomentUpdate,
} from "./types";

const HEADER = [
  "id",
  "title",
  "story",
  "date",
  "lat",
  "lng",
  "locationName",
  "photoIds",
  "coverPhotoId",
  "createdAt",
  "mediaTypes",
  "tags",
  "mood",
  "collection",
  "favorite",
  "updatedAt",
  "deletedAt",
  "authorId",
  "peopleIds",
];

const RANGE = "A:S";
const HEADER_RANGE = "A1:S1";
const LEGACY_COLUMN_COUNT = 15;
const DEMO_FIXTURE_VERSION = 2;

export type ListMomentsOptions = {
  includeDeleted?: boolean;
};

declare global {
  var captureMomentDemoMoments: Moment[] | undefined;
  var captureMomentDemoMomentsVersion: number | undefined;
}

function demoStore(): Moment[] {
  if (
    !globalThis.captureMomentDemoMoments ||
    globalThis.captureMomentDemoMomentsVersion !== DEMO_FIXTURE_VERSION
  ) {
    globalThis.captureMomentDemoMoments = structuredClone(demoMoments);
    globalThis.captureMomentDemoMomentsVersion = DEMO_FIXTURE_VERSION;
  }
  return globalThis.captureMomentDemoMoments;
}

function parseCoordinate(value: string | undefined): number | null {
  if (!value) return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function normalizeMoment(moment: Moment): Moment {
  return {
    ...moment,
    media: moment.media.map((item) => ({ ...item })),
    tags: [...moment.tags],
    updatedAt: moment.updatedAt || moment.createdAt,
    deletedAt: moment.deletedAt || "",
    authorId: moment.authorId || "",
    peopleIds: [...(moment.peopleIds ?? [])],
  };
}

function rowToMoment(row: string[]): Moment | null {
  if (!row[0]) return null;
  const mediaIds = (row[7] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const mediaTypes = (row[10] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is MediaType => value === "image" || value === "video");
  const media: MediaItem[] = mediaIds.map((id, index) => ({
    id,
    type: mediaTypes[index] || "image",
  }));
  return {
    id: row[0],
    title: row[1] ?? "",
    story: row[2] ?? "",
    date: row[3] ?? "",
    lat: parseCoordinate(row[4]),
    lng: parseCoordinate(row[5]),
    locationName: row[6] ?? "",
    media,
    coverPhotoId: row[8] || media.find((item) => item.type === "image")?.id || mediaIds[0] || "",
    createdAt: row[9] ?? "",
    tags: (row[11] ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
    mood: row[12] ?? "",
    collection: row[13] ?? "Cerita Sehari-hari",
    favorite: row[14] === "true",
    updatedAt: row[15] || row[9] || "",
    deletedAt: row[16] ?? "",
    authorId: row[17] ?? "",
    peopleIds: (row[18] ?? "")
      .split(",")
      .map((personId) => personId.trim())
      .filter(Boolean),
  };
}

function momentToRow(moment: Moment): Array<string | number> {
  return [
    moment.id,
    moment.title,
    moment.story,
    moment.date,
    moment.lat ?? "",
    moment.lng ?? "",
    moment.locationName,
    moment.media.map((item) => item.id).join(","),
    moment.coverPhotoId,
    moment.createdAt,
    moment.media.map((item) => item.type).join(","),
    moment.tags.join(","),
    moment.mood,
    moment.collection,
    String(moment.favorite),
    moment.updatedAt || moment.createdAt,
    moment.deletedAt || "",
    moment.authorId || "",
    (moment.peopleIds ?? []).join(","),
  ];
}

function mergeMomentUpdate(
  current: Moment,
  updates: MomentUpdate
): MomentUpdate {
  if (!updates.media) return updates;
  return {
    ...updates,
    media: updates.media.map((item) => {
      const existing = current.media.find(
        (currentItem) => currentItem.id === item.id
      );
      return existing ? { ...existing, ...item } : item;
    }),
  };
}

async function ensureMomentHeader(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: HEADER_RANGE,
  });
  const currentHeader = (response.data.values?.[0] ?? []) as string[];
  const expandedHeader = HEADER.map(
    (expected, index) =>
      index < LEGACY_COLUMN_COUNT
        ? currentHeader[index] || expected
        : expected
  );
  const needsExpansion = expandedHeader.some(
    (value, index) => currentHeader[index] !== value
  );

  if (needsExpansion) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: HEADER_RANGE,
      valueInputOption: "RAW",
      requestBody: { values: [expandedHeader] },
    });
  }
}

async function sheetRows(): Promise<string[][]> {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: RANGE,
  });
  return (response.data.values ?? []) as string[][];
}

function sortMoments(moments: Moment[]): Moment[] {
  return moments.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export async function listMoments(
  options: ListMomentsOptions = {}
): Promise<Moment[]> {
  const includeDeleted = options.includeDeleted === true;
  const moments = isDemoMode()
    ? demoStore().map((moment) => normalizeMoment(moment))
    : (await sheetRows())
    .filter((row) => row[0] && row[0] !== "id")
    .map((row) => rowToMoment(row))
    .filter((m): m is Moment => m !== null);

  return sortMoments(
    includeDeleted
      ? moments
      : moments.filter((moment) => !moment.deletedAt)
  );
}

export async function listAllMoments(): Promise<Moment[]> {
  return listMoments({ includeDeleted: true });
}

export async function getMoment(id: string): Promise<Moment | null> {
  const moments = await listMoments();
  return moments.find((m) => m.id === id) ?? null;
}

export async function getMomentIncludingDeleted(
  id: string
): Promise<Moment | null> {
  const moments = await listAllMoments();
  return moments.find((moment) => moment.id === id) ?? null;
}

export async function addMoment(
  moment: MomentDraft
): Promise<Moment> {
  const now = new Date().toISOString();
  const full: Moment = normalizeMoment({
    ...moment,
    id: isDemoMode()
      ? `demo-${crypto.randomUUID().slice(0, 8)}`
      : crypto.randomUUID().slice(0, 8),
    createdAt: now,
    updatedAt: now,
    deletedAt: "",
    authorId: moment.authorId || "",
    peopleIds: [...(moment.peopleIds ?? [])],
  });

  if (isDemoMode()) {
    demoStore().unshift(full);
    return full;
  }

  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  await ensureMomentHeader();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: RANGE,
    valueInputOption: "RAW",
    requestBody: {
      values: [momentToRow(full)],
    },
  });

  return full;
}

export async function updateMoment(
  id: string,
  updates: MomentUpdate
): Promise<Moment | null> {
  if (isDemoMode()) {
    const store = demoStore();
    const index = store.findIndex((moment) => moment.id === id);
    if (index < 0) return null;

    const current = normalizeMoment(store[index]);
    const updated = normalizeMoment({
      ...current,
      ...mergeMomentUpdate(current, updates),
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    });
    store[index] = updated;
    return updated;
  }

  await ensureMomentHeader();
  const rows = await sheetRows();
  const rowIndex = rows.findIndex(
    (row, index) => index > 0 && row[0] === id
  );
  if (rowIndex < 0) return null;

  const current = rowToMoment(rows[rowIndex]);
  if (!current) return null;

  const updated = normalizeMoment({
    ...current,
    ...mergeMomentUpdate(current, updates),
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });
  const sheetRow = rowIndex + 1;
  await getSheets().spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `A${sheetRow}:S${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [momentToRow(updated)] },
  });
  return updated;
}

export async function softDeleteMoment(id: string): Promise<Moment | null> {
  const current = await getMomentIncludingDeleted(id);
  if (!current) return null;
  if (current.deletedAt) return current;
  return updateMoment(id, { deletedAt: new Date().toISOString() });
}

export async function restoreMoment(id: string): Promise<Moment | null> {
  return updateMoment(id, { deletedAt: "" });
}
