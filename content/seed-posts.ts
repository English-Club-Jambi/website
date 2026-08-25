export type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  authorName: string;
  coverKey?: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
};

const editorialDay = Date.UTC(2026, 7, 25, 5, 0, 0);

export const seedPosts: SeedPost[] = [
  {
    slug: "leeds-the-way-bridging-england-and-indonesia",
    title: "Leeds the Way: Bridging England and Indonesia",
    excerpt:
      "A photographed panel brings English practice into a room shaped by questions, listening, and exchange.",
    body: `The club archive records a panel with the title **Leeds the Way: Bridging England and Indonesia** visible on the screen. Speakers sit together at the front of an auditorium while participants listen from the room.

The photographs support a simple point: language changes when it has a real person on the other side. A question has to be understood. An answer has to make room for a different accent, reference, or way of putting things.

## Listening is part of speaking

A useful exchange is not a contest for the fastest sentence. It asks people to listen for meaning, check what they heard, and try another phrase when the first one does not land.

That is the kind of practice an English club can make possible. The room gives a learner a reason to speak, but it also gives them company while they search for the words.

## What the record can say

The images show a titled discussion, speakers, and a large group in the auditorium. They do not establish a recurring programme, formal partnership, or measured result. This story keeps that boundary visible while preserving the value of the encounter itself.`,
    category: "Exchange",
    authorName: "English Club",
    coverKey: "leeds-panel",
    status: "published",
    featured: true,
    publishedAt: editorialDay,
    createdAt: editorialDay,
    updatedAt: editorialDay,
  },
  {
    slug: "a-room-made-for-trying-again",
    title: "A room made for trying again",
    excerpt:
      "Before anyone takes the microphone, a good session starts with open laptops, nearby friends, and permission to pause.",
    body: `A set of club-room photographs shows people close together around low tables. Laptops are open. Notes, drinks, books, and a microphone share the space. The room looks used rather than arranged for a brochure.

That everyday quality matters. Speaking practice can feel harder when every sentence is treated as a performance. A shared room changes the terms: someone can pause, ask for a word, laugh at a tangle, then start the sentence again.

## Keep the conversation moving

Helpful partners do not correct every sound in real time. They listen first. If meaning gets lost, they can ask a short question or offer one word that lets the speaker continue.

The goal is not a perfect transcript. It is a conversation that survives a mistake.

## Leave room for different speeds

Some people think aloud. Others need a moment before they speak. A club room works best when both rhythms have space and no one has to earn the right to join in.`,
    category: "Club life",
    authorName: "English Club",
    coverKey: "club-room-wide",
    status: "published",
    featured: false,
    publishedAt: editorialDay - 86_400_000,
    createdAt: editorialDay - 86_400_000,
    updatedAt: editorialDay - 86_400_000,
  },
  {
    slug: "notes-from-a-shared-project",
    title: "Notes from a shared project",
    excerpt:
      "Making something together gives a conversation a subject, a pace, and a reason to ask for help.",
    body: `Several archive photographs show members working in small groups around tables. A laptop sits between people rather than in front of a single presenter. The visible task is shared, even when the exact brief is not recorded.

A shared project can make language practice less abstract. People need to compare an idea, choose a direction, explain a change, or ask what happens next. The work supplies the vocabulary with a purpose.

## Use the task as a prompt

One person can summarise what the group has decided. Another can ask the next question. Someone else can write down useful phrases that appeared naturally during the work.

Roles should stay light. They are there to widen participation, not to turn a conversation into a test.

## Record only what helps

A short note after the activity can keep one phrase, one question, and one thing the group wants to try next. That is enough to give the following session a place to begin.`,
    category: "Practice notes",
    authorName: "English Club",
    coverKey: "shared-work",
    status: "published",
    featured: false,
    publishedAt: editorialDay - 172_800_000,
    createdAt: editorialDay - 172_800_000,
    updatedAt: editorialDay - 172_800_000,
  },
];
