export const programCategoryValues = [
  "learning",
  "competition",
  "exchange",
  "community",
  "milestone",
] as const;

export const programDeliveryStateValues = [
  "completed",
  "ongoing",
  "planned",
] as const;

export type ProgramCategory = (typeof programCategoryValues)[number];
export type ProgramDeliveryState = (typeof programDeliveryStateValues)[number];

export type ProgramRecord = Readonly<{
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: ProgramCategory;
  deliveryState: ProgramDeliveryState;
  audience: string;
  dateLabel?: string;
  startsAt?: number;
  locationLabel?: string;
  communityBenefit: string;
  sourceLabel?: string;
  sourceUrl?: string;
  featured: boolean;
  sortOrder: number;
}>;

/**
 * Source-bounded programme seed catalogue for the development deployment.
 * Public routes read published Convex revisions only. Completed records cite
 * an official UNJA source; mission-backed programme lines never pretend to be
 * dated events or measured outcomes.
 */
export const checkedInPrograms = [
  {
    slug: "sharing-session-university-of-leeds-2025",
    title: "Sharing Session with University of Leeds",
    summary:
      "An open English Club exchange brought three University of Leeds students into conversation with 88 Universitas Jambi students.",
    body:
      "The session made cultural exchange practical: students could listen to different experiences, ask direct questions, and use English with people beyond their usual classroom. The official Universitas Jambi record names Molly Conaghan, Sophie Barclay Smith, and Asha Horbacki as guests.",
    category: "exchange",
    deliveryState: "completed",
    audience: "Universitas Jambi students",
    dateLabel: "20 August 2025",
    startsAt: Date.UTC(2025, 7, 20),
    locationLabel: "4th floor, Hexagonal Building, Universitas Jambi",
    communityBenefit:
      "A campus-wide room for cross-cultural listening, questions, and spoken English practice.",
    sourceLabel: "Universitas Jambi news record",
    sourceUrl:
      "https://www.unja.ac.id/upt-perpustakaan-unja-gelar-kegiatan-sharing-session-hadirkan-3-mahasiswa-university-of-leeds/",
    featured: true,
    sortOrder: 10,
  },
  {
    slug: "english-club-opening-2024",
    title: "English Club Opening Day",
    summary:
      "Universitas Jambi's UPT Library formally established English Club as an inclusive place to practise English through discussion and shared activities.",
    body:
      "The opening set the club's practical direction: group discussion, cultural performance, and language seminars in a space open to students at different levels of English. It is a milestone in the public record, not a claim that every proposed format runs on a fixed schedule.",
    category: "milestone",
    deliveryState: "completed",
    audience: "Universitas Jambi students at every English level",
    dateLabel: "16 May 2024",
    startsAt: Date.UTC(2024, 4, 16),
    locationLabel: "UPT Library auditorium, Universitas Jambi",
    communityBenefit:
      "A shared campus space where confidence can grow through participation rather than proficiency requirements.",
    sourceLabel: "UPT Library Universitas Jambi record",
    sourceUrl:
      "https://librarynew.unja.ac.id/english-club-upt-perpustakaan-resmi-di-bentuk/",
    featured: false,
    sortOrder: 20,
  },
  {
    slug: "english-training-and-workshops",
    title: "English Training & Workshops",
    summary:
      "Focused sessions turn a specific language need into guided practice that members can use in study, organisations, and everyday conversation.",
    body:
      "This programme line can hold speaking clinics, writing practice, presentation preparation, or facilitated discussion. Each published session should name its scope, date, facilitator, and audience rather than imply a permanent weekly timetable.",
    category: "learning",
    deliveryState: "ongoing",
    audience: "English Club members and Universitas Jambi students",
    communityBenefit:
      "Practical language support shaped around a clear need, with room for different starting levels.",
    sourceLabel: "English Club Universitas Jambi mission",
    sourceUrl: "https://englishclub.librarynew.unja.ac.id/about",
    featured: false,
    sortOrder: 30,
  },
  {
    slug: "competition-preparation",
    title: "Competition Preparation",
    summary:
      "Members can prepare together for English competitions through rehearsal, peer response, and review of the format they will face.",
    body:
      "Preparation is useful when it stays specific. A programme entry should identify the competition or skill, the preparation window, and who can take part. Results belong in the public record only after the club verifies them.",
    category: "competition",
    deliveryState: "ongoing",
    audience: "Members preparing for English-language competitions",
    communityBenefit:
      "Shared preparation makes feedback and competition knowledge available beyond one participant.",
    sourceLabel: "English Club Universitas Jambi mission",
    sourceUrl: "https://englishclub.librarynew.unja.ac.id/about",
    featured: false,
    sortOrder: 40,
  },
  {
    slug: "collaborative-language-exchange",
    title: "Collaborative Language Exchange",
    summary:
      "Partnerships with student groups, institutions, and visiting speakers can give English a real audience and a useful subject.",
    body:
      "The format may be a sharing session, joint discussion, cultural exchange, or collaborative workshop. A collaboration is published as completed only when the partner, date, scope, and permission to name the work are confirmed.",
    category: "exchange",
    deliveryState: "ongoing",
    audience: "Students, visiting speakers, organisations, and learning partners",
    communityBenefit:
      "Conversation across institutions and backgrounds, with reciprocal learning rather than one-way presentation.",
    sourceLabel: "English Club Universitas Jambi mission",
    sourceUrl: "https://englishclub.librarynew.unja.ac.id/about",
    featured: false,
    sortOrder: 50,
  },
  {
    slug: "community-english-service",
    title: "Community English Service",
    summary:
      "A programme direction for taking useful English practice beyond the club room with schools, youth groups, and community partners.",
    body:
      "The club can shape a small conversation workshop, learning-material session, or volunteer facilitation around a partner's actual needs. This remains an open programme direction until a scope, partner, safeguarding plan, date, and documentation are reviewed.",
    category: "community",
    deliveryState: "planned",
    audience: "Schools, youth groups, and community learning partners",
    communityBenefit:
      "English support designed with a community partner, not delivered as a generic one-off visit.",
    sourceLabel: "English Club Universitas Jambi mission",
    sourceUrl: "https://englishclub.librarynew.unja.ac.id/about",
    featured: false,
    sortOrder: 60,
  },
] as const satisfies ReadonlyArray<ProgramRecord>;

export const programCategoryLabels: Record<ProgramCategory, string> = {
  learning: "Learning",
  competition: "Competition",
  exchange: "Exchange",
  community: "Community",
  milestone: "Club milestone",
};

export const programDeliveryStateLabels: Record<ProgramDeliveryState, string> = {
  completed: "Documented record",
  ongoing: "Programme line",
  planned: "Open direction",
};
