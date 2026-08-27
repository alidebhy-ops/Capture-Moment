import type {
  CommunityComment,
  CommunityReaction,
  FamilyMember,
} from "./family-types";

export const demoFamilyMembers: FamilyMember[] = [
  {
    id: "member-akbar",
    name: "Muhammad Ali Akbar",
    initials: "MA",
    relationship: "Penjaga arsip",
    bio: "Paling rajin menyimpan foto perjalanan dan menuliskan detail kecil yang sering terlupakan.",
    birthday: "1999-11-08",
    color: "#a8573d",
    momentIds: [
      "roadtrip-bromo",
      "senja-losari",
      "malam-ulang-tahun",
      "gowes-sore",
      "konser-pertama",
      "dieng-berkabut",
    ],
    createdAt: "2025-07-12T08:00:00.000Z",
    updatedAt: "2026-07-10T08:30:00.000Z",
  },
  {
    id: "member-aulia",
    name: "Aulia Rahma",
    initials: "AR",
    relationship: "Perangkai cerita",
    bio: "Selalu ingat siapa mengatakan apa, dan cerita di balik setiap tempat yang kami datangi.",
    birthday: "2000-04-09",
    color: "#788c79",
    momentIds: [
      "roadtrip-bromo",
      "senja-losari",
      "malam-ulang-tahun",
      "konser-pertama",
      "dieng-berkabut",
    ],
    createdAt: "2025-07-12T08:05:00.000Z",
    updatedAt: "2026-07-10T08:35:00.000Z",
  },
];

export const demoCommunityComments: CommunityComment[] = [
  {
    id: "comment-01",
    momentId: "roadtrip-bromo",
    authorId: "member-aulia",
    body: "Aku masih ingat kamu terus mengecek jam supaya kita tidak telat lihat matahari terbitnya.",
    createdAt: "2026-06-29T09:12:00.000Z",
    updatedAt: "2026-06-29T09:12:00.000Z",
  },
  {
    id: "comment-02",
    momentId: "roadtrip-bromo",
    authorId: "member-akbar",
    body: "Dan kamu yang paling dingin tapi paling tidak mau balik ke jeep duluan.",
    createdAt: "2026-06-29T09:40:00.000Z",
    updatedAt: "2026-06-29T09:40:00.000Z",
  },
  {
    id: "comment-03",
    momentId: "senja-losari",
    authorId: "member-aulia",
    body: "Pisang epe tiga porsi itu rekor yang belum kamu akui sampai sekarang.",
    createdAt: "2026-03-22T13:05:00.000Z",
    updatedAt: "2026-03-22T13:05:00.000Z",
  },
  {
    id: "comment-04",
    momentId: "konser-pertama",
    authorId: "member-akbar",
    body: "Suara kita berdua habis keesokan harinya, dan sama sekali tidak menyesal.",
    createdAt: "2026-02-16T08:30:00.000Z",
    updatedAt: "2026-02-16T08:30:00.000Z",
  },
];

export const demoCommunityReactions: CommunityReaction[] = [
  {
    id: "reaction-01",
    momentId: "roadtrip-bromo",
    authorId: "member-akbar",
    reaction: "heart",
    createdAt: "2026-06-29T09:30:00.000Z",
  },
  {
    id: "reaction-02",
    momentId: "roadtrip-bromo",
    authorId: "member-aulia",
    reaction: "heart",
    createdAt: "2026-06-29T09:35:00.000Z",
  },
  {
    id: "reaction-03",
    momentId: "senja-losari",
    authorId: "member-akbar",
    reaction: "laugh",
    createdAt: "2026-03-22T13:20:00.000Z",
  },
  {
    id: "reaction-04",
    momentId: "senja-losari",
    authorId: "member-aulia",
    reaction: "heart",
    createdAt: "2026-03-22T13:25:00.000Z",
  },
  {
    id: "reaction-05",
    momentId: "malam-ulang-tahun",
    authorId: "member-aulia",
    reaction: "tears",
    createdAt: "2026-05-04T04:10:00.000Z",
  },
  {
    id: "reaction-06",
    momentId: "malam-ulang-tahun",
    authorId: "member-akbar",
    reaction: "heart",
    createdAt: "2026-05-04T04:15:00.000Z",
  },
  {
    id: "reaction-07",
    momentId: "konser-pertama",
    authorId: "member-aulia",
    reaction: "applause",
    createdAt: "2026-02-16T08:45:00.000Z",
  },
  {
    id: "reaction-08",
    momentId: "dieng-berkabut",
    authorId: "member-akbar",
    reaction: "heart",
    createdAt: "2026-01-19T10:00:00.000Z",
  },
];
