export type MediaType = "image" | "video";

export type MediaItem = {
  id: string;
  type: MediaType;
  src?: string;
  poster?: string;
  alt?: string;
};

export type Moment = {
  id: string;
  title: string;
  story: string;
  date: string;
  lat: number | null;
  lng: number | null;
  locationName: string;
  media: MediaItem[];
  coverPhotoId: string;
  collection: string;
  tags: string[];
  mood: string;
  favorite: boolean;
  createdAt: string;
  /**
   * These fields are optional so rows created with the original 15-column
   * spreadsheet schema and existing demo fixtures remain valid.
   */
  updatedAt?: string;
  deletedAt?: string;
  authorId?: string;
  peopleIds?: string[];
};

export type MomentDraft = Omit<
  Moment,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

export type MomentUpdate = Partial<
  Pick<
    Moment,
    | "title"
    | "story"
    | "date"
    | "lat"
    | "lng"
    | "locationName"
    | "media"
    | "coverPhotoId"
    | "collection"
    | "tags"
    | "mood"
    | "favorite"
    | "authorId"
    | "peopleIds"
    | "deletedAt"
  >
>;

export const PLAN_STATUSES = [
  "wishlist",
  "planning",
  "ready",
  "completed",
] as const;

export const PLAN_PRIORITIES = ["low", "medium", "high"] as const;

export const PLAN_CATEGORIES = [
  "Perjalanan",
  "Perayaan",
  "Kencan",
  "Proyek",
  "Kuliner",
] as const;

export type PlanStatus = (typeof PLAN_STATUSES)[number];
export type PlanPriority = (typeof PLAN_PRIORITIES)[number];
export type PlanCategory = (typeof PLAN_CATEGORIES)[number];

export type PlanChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type Plan = {
  id: string;
  title: string;
  description: string;
  category: PlanCategory;
  status: PlanStatus;
  priority: PlanPriority;
  targetDate: string;
  locationName: string;
  lat: number | null;
  lng: number | null;
  estimatedBudget: number;
  savedAmount: number;
  participants: string[];
  checklist: PlanChecklistItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PlanDraft = Omit<Plan, "id" | "createdAt" | "updatedAt">;
export type PlanUpdate = Partial<PlanDraft>;
