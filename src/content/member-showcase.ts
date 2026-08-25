import type { MemberDirectoryResult, PublicMember } from "@/lib/members";

export type ShowcaseMember = PublicMember & {
  showcase: true;
  portraitCell: {
    column: 0 | 1 | 2 | 3;
    row: 0 | 1 | 2 | 3;
  };
};

const showcaseUpdatedAt = 0;

/**
 * Fictional, source-only identities for the organization profile while the
 * consent-reviewed Convex roster is empty. Never write this array to Convex.
 */
export const memberShowcase = [
  {
    slug: "demo-nabila-maheswari",
    displayName: "Nabila Maheswari",
    roleLevel: 0,
    joinedYear: 2026,
    shortBio:
      "Nabila likes low-pressure prompts and often asks a second question when a conversation stalls.",
    sortOrder: 10,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 0, row: 0 },
  },
  {
    slug: "demo-reza-dananjaya",
    displayName: "Reza Dananjaya",
    roleLevel: 0,
    joinedYear: 2024,
    shortBio:
      "Reza brings practical examples to table conversations and helps rephrase an instruction when one word gets in the way.",
    sortOrder: 20,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 1, row: 0 },
  },
  {
    slug: "demo-salsabila-nur-fajri",
    displayName: "Salsabila Nur Fajri",
    roleLevel: 1,
    joinedYear: 2023,
    shortBio:
      "Salsabila helps newcomers find a place in the room and keeps small organising tasks from piling up.",
    sortOrder: 30,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 2, row: 0 },
  },
  {
    slug: "demo-galih-pradipta",
    displayName: "Galih Pradipta",
    roleLevel: 1,
    joinedYear: 2024,
    shortBio:
      "Galih turns new ideas into practical tasks and keeps teams connected between meetings.",
    sortOrder: 35,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 2, row: 3 },
  },
  {
    slug: "demo-dimas-arga-pratama",
    displayName: "Dimas Arga Pratama",
    roleLevel: 2,
    division: "academic",
    joinedYear: 2025,
    shortBio:
      "Dimas turns broad topics into short prompts and discussion notes the room can use.",
    sortOrder: 40,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 3, row: 0 },
  },
  {
    slug: "demo-keisya-maharani",
    displayName: "Keisya Maharani",
    roleLevel: 2,
    division: "art",
    joinedYear: 2025,
    shortBio:
      "Keisya uses drawing and visual prompts to give a conversation another way in.",
    sortOrder: 50,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 0, row: 1 },
  },
  {
    slug: "demo-farhan-rizky-prabowo",
    displayName: "Farhan Rizky Prabowo",
    roleLevel: 2,
    division: "mic",
    joinedYear: 2024,
    shortBio:
      "Farhan writes clear announcements and keeps the club's working media files easy to find.",
    sortOrder: 60,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 1, row: 1 },
  },
  {
    slug: "demo-alya-rahmadani",
    displayName: "Alya Rahmadani",
    roleLevel: 2,
    division: "public-relation",
    joinedYear: 2025,
    shortBio:
      "Alya handles invitations and follow-up in plain language that is easy to reply to.",
    sortOrder: 70,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 2, row: 1 },
  },
  {
    slug: "demo-bagas-aditya-wicaksono",
    displayName: "Bagas Aditya Wicaksono",
    roleLevel: 2,
    division: "human-resource-development",
    joinedYear: 2026,
    shortBio:
      "Bagas pays attention to how work is shared and checks whether new volunteers have enough context to begin.",
    sortOrder: 80,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 3, row: 1 },
  },
  {
    slug: "demo-raka-satrio-nugraha",
    displayName: "Raka Satrio Nugraha",
    roleLevel: 3,
    position: "secretary",
    joinedYear: 2025,
    shortBio:
      "Raka records decisions in plain language, then turns them into notes people can find after the meeting.",
    sortOrder: 90,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 0, row: 2 },
  },
  {
    slug: "demo-citra-larasati",
    displayName: "Citra Larasati",
    roleLevel: 3,
    position: "treasury",
    joinedYear: 2023,
    shortBio:
      "Citra keeps budget notes orderly and explains spending choices without making the numbers feel remote.",
    sortOrder: 100,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 1, row: 2 },
  },
  {
    slug: "demo-nadine-zahra-latifah",
    displayName: "Nadine Zahra Latifah",
    roleLevel: 3,
    position: "vice-president",
    joinedYear: 2024,
    shortBio:
      "Nadine connects the division leads and follows up when a task needs another decision.",
    sortOrder: 110,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 2, row: 2 },
  },
  {
    slug: "demo-muhammad-fikri-aulia",
    displayName: "Muhammad Fikri Aulia",
    roleLevel: 3,
    position: "president",
    joinedYear: 2022,
    shortBio:
      "Fikri keeps meetings focused and makes room for quieter opinions before the club settles on a direction.",
    sortOrder: 120,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 3, row: 2 },
  },
  {
    slug: "demo-mira-ayuningtyas",
    displayName: "Mira Ayuningtyas",
    roleLevel: 4,
    position: "mentor",
    joinedYear: 2022,
    shortBio:
      "Mira asks the questions that make a plan specific enough to run without taking the work away from members.",
    sortOrder: 130,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 0, row: 3 },
  },
  {
    slug: "demo-yusuf-kurniawan",
    displayName: "Yusuf Kurniawan",
    roleLevel: 4,
    position: "head-of-upa",
    joinedYear: 2023,
    shortBio:
      "Yusuf helps the club understand institutional boundaries and which decisions need coordination with UPA.",
    sortOrder: 140,
    updatedAt: showcaseUpdatedAt,
    showcase: true,
    portraitCell: { column: 1, row: 3 },
  },
] as const satisfies ReadonlyArray<ShowcaseMember>;

export const memberShowcasePortraitObjectKey =
  "images/member-directory-portraits-v1.webp";

export function isShowcaseMember(
  member: PublicMember | ShowcaseMember,
): member is ShowcaseMember {
  return "showcase" in member && member.showcase === true;
}

export function getMemberRosterMode(
  directory: MemberDirectoryResult,
): "published" | "showcase" | "unavailable" {
  if (directory.state === "unavailable") {
    return "unavailable";
  }

  return directory.members.length === 0 ? "showcase" : "published";
}
