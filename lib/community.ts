import {
  demoCommunityComments,
  demoCommunityReactions,
} from "./demo-family";
import { isDemoMode } from "./demo";
import {
  COMMUNITY_REACTIONS,
  type CommunityComment,
  type CommunityReaction,
  type CommunityReactionKind,
  type MomentCommunity,
} from "./family-types";
import { getSheetId, getSheets } from "./google";

export type {
  CommunityComment,
  CommunityReaction,
  CommunityReactionKind,
  MomentCommunity,
} from "./family-types";

const SHEET_TITLE = "Community";
const RANGE = `${SHEET_TITLE}!A:I`;
const HEADER = [
  "id",
  "momentId",
  "type",
  "authorId",
  "body",
  "reaction",
  "createdAt",
  "updatedAt",
  "schemaVersion",
] as const;

type CommunityRowType = "comment" | "reaction";
type StoredCommunity = {
  rowNumber: number;
  type: CommunityRowType;
  comment?: CommunityComment;
  reaction?: CommunityReaction;
};

export class CommunityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommunityValidationError";
  }
}

export function validateCommunityId(value: unknown, label = "ID"): string {
  const id = String(value ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) {
    throw new CommunityValidationError(`${label} tidak valid.`);
  }
  return id;
}

export function validateCommentBody(value: unknown): string {
  const body = String(value ?? "").trim();
  if (!body) {
    throw new CommunityValidationError("Komentar tidak boleh kosong.");
  }
  if (body.length > 1_200) {
    throw new CommunityValidationError("Komentar maksimal 1.200 karakter.");
  }
  return body;
}

export function validateReactionKind(
  value: unknown
): CommunityReactionKind {
  const reaction = String(value ?? "").trim();
  if (!(COMMUNITY_REACTIONS as readonly string[]).includes(reaction)) {
    throw new CommunityValidationError("Reaksi tidak valid.");
  }
  return reaction as CommunityReactionKind;
}

declare global {
  var captureMomentDemoCommunity:
    | {
        comments: CommunityComment[];
        reactions: CommunityReaction[];
      }
    | undefined;
}

function demoStore(): MomentCommunity {
  if (!globalThis.captureMomentDemoCommunity) {
    globalThis.captureMomentDemoCommunity = {
      comments: structuredClone(demoCommunityComments),
      reactions: structuredClone(demoCommunityReactions),
    };
  }
  return globalThis.captureMomentDemoCommunity;
}

function cell(row: unknown[], index: number): string {
  return String(row[index] ?? "").trim();
}

function isReactionKind(value: string): value is CommunityReactionKind {
  return (COMMUNITY_REACTIONS as readonly string[]).includes(value);
}

function rowToStored(
  row: unknown[],
  rowNumber: number
): StoredCommunity | null {
  const id = cell(row, 0);
  const momentId = cell(row, 1);
  const type = cell(row, 2);
  const authorId = cell(row, 3);
  const createdAt = cell(row, 6);
  if (!id || !momentId || !authorId) return null;

  if (type === "comment") {
    const body = cell(row, 4);
    if (!body) return null;
    return {
      rowNumber,
      type,
      comment: {
        id,
        momentId,
        authorId,
        body,
        createdAt,
        updatedAt: cell(row, 7) || createdAt,
      },
    };
  }

  if (type === "reaction") {
    const reaction = cell(row, 5);
    if (!isReactionKind(reaction)) return null;
    return {
      rowNumber,
      type,
      reaction: { id, momentId, authorId, reaction, createdAt },
    };
  }

  return null;
}

function commentToRow(comment: CommunityComment): string[] {
  return [
    comment.id,
    comment.momentId,
    "comment",
    comment.authorId,
    comment.body,
    "",
    comment.createdAt,
    comment.updatedAt,
    "1",
  ];
}

function reactionToRow(reaction: CommunityReaction): string[] {
  return [
    reaction.id,
    reaction.momentId,
    "reaction",
    reaction.authorId,
    "",
    reaction.reaction,
    reaction.createdAt,
    "",
    "1",
  ];
}

async function findCommunitySheet() {
  const sheets = getSheets();
  const result = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields: "sheets.properties(sheetId,title)",
  });
  return result.data.sheets?.find(
    (sheet) => sheet.properties?.title === SHEET_TITLE
  )?.properties;
}

async function ensureCommunitySheet(): Promise<number> {
  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  let properties = await findCommunitySheet();

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
      properties = await findCommunitySheet();
      if (!properties) throw error;
    }
  }

  if (properties?.sheetId === undefined || properties.sheetId === null) {
    throw new Error("Tab Community tidak dapat dibuat di Google Sheets.");
  }

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TITLE}!A1:I1`,
  });
  const row = (current.data.values?.[0] ?? []).map(String);
  if (!HEADER.every((header, index) => row[index] === header)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_TITLE}!A1:I1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...HEADER]] },
    });
  }
  return properties.sheetId;
}

async function readStoredCommunity(): Promise<{
  sheetId: number;
  entries: StoredCommunity[];
}> {
  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const sheetId = await ensureCommunitySheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TITLE}!A2:I`,
  });
  const rows = (result.data.values ?? []) as unknown[][];
  return {
    sheetId,
    entries: rows
      .map((row, index) => rowToStored(row, index + 2))
      .filter((entry): entry is StoredCommunity => entry !== null),
  };
}

function normalizedCommunity(
  momentId: string,
  comments: CommunityComment[],
  reactions: CommunityReaction[]
): MomentCommunity {
  return {
    comments: comments
      .filter((comment) => comment.momentId === momentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    reactions: reactions
      .filter((reaction) => reaction.momentId === momentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

export async function getMomentCommunity(
  momentId: string
): Promise<MomentCommunity> {
  if (isDemoMode()) {
    const store = demoStore();
    return structuredClone(
      normalizedCommunity(momentId, store.comments, store.reactions)
    );
  }
  const { entries } = await readStoredCommunity();
  return normalizedCommunity(
    momentId,
    entries
      .map((entry) => entry.comment)
      .filter((item): item is CommunityComment => item !== undefined),
    entries
      .map((entry) => entry.reaction)
      .filter((item): item is CommunityReaction => item !== undefined)
  );
}

export async function listAllCommunity(): Promise<MomentCommunity> {
  if (isDemoMode()) {
    const store = demoStore();
    return structuredClone({
      comments: [...store.comments].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      ),
      reactions: [...store.reactions].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      ),
    });
  }

  const { entries } = await readStoredCommunity();
  return {
    comments: entries
      .map((entry) => entry.comment)
      .filter((item): item is CommunityComment => item !== undefined)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    reactions: entries
      .map((entry) => entry.reaction)
      .filter((item): item is CommunityReaction => item !== undefined)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

export async function addCommunityComment(input: {
  momentId: string;
  authorId: string;
  body: string;
}): Promise<CommunityComment> {
  const now = new Date().toISOString();
  const comment: CommunityComment = {
    id: `comment-${crypto.randomUUID().slice(0, 8)}`,
    momentId: input.momentId,
    authorId: input.authorId,
    body: input.body,
    createdAt: now,
    updatedAt: now,
  };

  if (isDemoMode()) {
    demoStore().comments.push(structuredClone(comment));
    return structuredClone(comment);
  }
  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  await ensureCommunitySheet();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: RANGE,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [commentToRow(comment)] },
  });
  return comment;
}

export async function toggleCommunityReaction(input: {
  momentId: string;
  authorId: string;
  reaction: CommunityReactionKind;
}): Promise<{ active: boolean; reaction: CommunityReaction | null }> {
  if (isDemoMode()) {
    const store = demoStore();
    const index = store.reactions.findIndex(
      (item) =>
        item.momentId === input.momentId &&
        item.authorId === input.authorId &&
        item.reaction === input.reaction
    );
    if (index >= 0) {
      store.reactions.splice(index, 1);
      return { active: false, reaction: null };
    }
    const reaction: CommunityReaction = {
      id: `reaction-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      createdAt: new Date().toISOString(),
    };
    store.reactions.push(reaction);
    return { active: true, reaction: structuredClone(reaction) };
  }

  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const { sheetId, entries } = await readStoredCommunity();
  const existing = entries.find(
    (entry) =>
      entry.reaction?.momentId === input.momentId &&
      entry.reaction.authorId === input.authorId &&
      entry.reaction.reaction === input.reaction
  );
  if (existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: existing.rowNumber - 1,
                endIndex: existing.rowNumber,
              },
            },
          },
        ],
      },
    });
    return { active: false, reaction: null };
  }

  const reaction: CommunityReaction = {
    id: `reaction-${crypto.randomUUID().slice(0, 8)}`,
    ...input,
    createdAt: new Date().toISOString(),
  };
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: RANGE,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [reactionToRow(reaction)] },
  });
  return { active: true, reaction };
}

export async function deleteCommunityComment(input: {
  momentId: string;
  authorId: string;
  commentId: string;
}): Promise<boolean> {
  if (isDemoMode()) {
    const store = demoStore();
    const index = store.comments.findIndex(
      (comment) =>
        comment.id === input.commentId &&
        comment.momentId === input.momentId &&
        comment.authorId === input.authorId
    );
    if (index < 0) return false;
    store.comments.splice(index, 1);
    return true;
  }

  const sheets = getSheets();
  const spreadsheetId = getSheetId();
  const { sheetId, entries } = await readStoredCommunity();
  const stored = entries.find(
    (entry) =>
      entry.comment?.id === input.commentId &&
      entry.comment.momentId === input.momentId &&
      entry.comment.authorId === input.authorId
  );
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
