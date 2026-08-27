export const CAPSULE_THEMES = [
  "surat",
  "harapan",
  "perayaan",
  "janji",
] as const;

export type CapsuleTheme = (typeof CAPSULE_THEMES)[number];

export type TimeCapsuleRecord = {
  id: string;
  title: string;
  message: string;
  unlockAt: string;
  recipientMemberIds: string[];
  creatorLabel: string;
  theme: CapsuleTheme;
  createdAt: string;
  updatedAt: string;
};

export type TimeCapsule = Omit<TimeCapsuleRecord, "message"> & {
  isUnlocked: boolean;
  /**
   * Hanya disertakan oleh server setelah unlockAt terlewati. Properti ini
   * sengaja opsional agar isi kapsul terkunci tidak pernah masuk payload.
   */
  message?: string;
};

export type TimeCapsuleDraft = Omit<
  TimeCapsuleRecord,
  "id" | "createdAt" | "updatedAt"
>;

export type TimeCapsuleUpdate = Partial<TimeCapsuleDraft>;

export type SharedCalendarEventKind = "moment" | "plan" | "capsule";

export type SharedCalendarEvent = {
  id: string;
  kind: SharedCalendarEventKind;
  date: string;
  title: string;
  subtitle: string;
  href: string;
  isComplete?: boolean;
  isUnlocked?: boolean;
};
