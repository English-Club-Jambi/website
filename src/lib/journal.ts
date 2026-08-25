import { fetchQuery } from "convex/nextjs";

import { api } from "../../convex/_generated/api";
import { getConvexDeploymentUrl } from "@/lib/convex";

export type PublicJournalMedia = {
  mediaId: string;
  publicUrl: string;
  alt: string;
  width: number;
  height: number;
};

export type PublicPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  editorJson?: string;
  inlineMedia?: PublicJournalMedia[];
  category: string;
  authorName: string;
  coverKey?: string;
  coverMedia?: PublicJournalMedia;
  publishedAt: number;
  updatedAt: number;
  featured: boolean;
};

export type PublicPostSummary = Omit<
  PublicPost,
  "body" | "editorJson" | "inlineMedia"
>;

export type JournalArchivePage =
  | {
      state: "ready";
      posts: PublicPostSummary[];
      isDone: boolean;
      continueCursor: string | null;
    }
  | {
      state: "unavailable";
      posts: [];
      isDone: true;
      continueCursor: null;
    };

export const journalPageSize = 6;
const maximumCursorLength = 2_048;

export function parseJournalCursor(value: string | string[] | undefined) {
  if (value === undefined) {
    return { state: "first" } as const;
  }

  if (
    Array.isArray(value) ||
    value.length === 0 ||
    value.length > maximumCursorLength ||
    value !== value.trim() ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return { state: "invalid" } as const;
  }

  return { state: "cursor", cursor: value } as const;
}

function reportUnavailable(operation: string, error?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[journal] ${operation} is unavailable; no local content was substituted.`,
      error instanceof Error ? error.message : error ?? "Convex URL is not set.",
    );
  }
}

export async function getPublishedPosts(limit = 6): Promise<PublicPost[]> {
  const boundedLimit = Math.min(12, Math.max(1, Math.floor(limit)));
  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    reportUnavailable("listPublished");
    return [];
  }

  try {
    return await fetchQuery(
      api.posts.listPublished,
      { limit: boundedLimit },
      { url: convexUrl },
    );
  } catch (error) {
    reportUnavailable("listPublished", error);
    return [];
  }
}

export async function getPublishedPostsPage(
  cursor?: string,
): Promise<JournalArchivePage> {
  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    reportUnavailable("listPublishedPage");
    return {
      state: "unavailable",
      posts: [],
      isDone: true,
      continueCursor: null,
    };
  }

  try {
    const result = await fetchQuery(
      api.posts.listPublishedPage,
      {
        paginationOpts: {
          numItems: journalPageSize,
          cursor: cursor ?? null,
          maximumRowsRead: journalPageSize,
        },
      },
      { url: convexUrl },
    );

    return {
      state: "ready",
      posts: result.page,
      isDone: result.isDone,
      continueCursor: result.isDone ? null : result.continueCursor,
    };
  } catch (error) {
    reportUnavailable("listPublishedPage", error);
    return {
      state: "unavailable",
      posts: [],
      isDone: true,
      continueCursor: null,
    };
  }
}

export async function getPublishedPost(slug: string): Promise<PublicPost | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    reportUnavailable("getPublishedBySlug");
    return null;
  }

  try {
    return await fetchQuery(
      api.posts.getPublishedBySlug,
      { slug: normalizedSlug },
      { url: convexUrl },
    );
  } catch (error) {
    reportUnavailable("getPublishedBySlug", error);
    return null;
  }
}

export async function getSitemapPosts() {
  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    reportUnavailable("listSitemapEntries");
    return [];
  }

  try {
    return await fetchQuery(
      api.posts.listSitemapEntries,
      {},
      { url: convexUrl },
    );
  } catch (error) {
    reportUnavailable("listSitemapEntries", error);
    return [];
  }
}

export function formatPublishedDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(timestamp);
}
