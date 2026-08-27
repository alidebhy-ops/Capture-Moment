export type FamilyMember = {
  id: string;
  name: string;
  initials: string;
  relationship: string;
  bio: string;
  birthday: string;
  color: string;
  momentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type FamilyMemberDraft = Omit<
  FamilyMember,
  "id" | "createdAt" | "updatedAt"
>;

export type FamilyMemberUpdate = Partial<FamilyMemberDraft>;

export const COMMUNITY_REACTIONS = [
  "heart",
  "laugh",
  "tears",
  "applause",
] as const;

export type CommunityReactionKind = (typeof COMMUNITY_REACTIONS)[number];

export type CommunityComment = {
  id: string;
  momentId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type CommunityReaction = {
  id: string;
  momentId: string;
  authorId: string;
  reaction: CommunityReactionKind;
  createdAt: string;
};

export type MomentCommunity = {
  comments: CommunityComment[];
  reactions: CommunityReaction[];
};
