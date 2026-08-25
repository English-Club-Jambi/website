import { fetchQuery } from "convex/nextjs";

import { api } from "../../convex/_generated/api";
import { seedPosts } from "@content/seed-posts";
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
      state: "ready" | "fallback";
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

function toPostSummary(post: PublicPost): PublicPostSummary {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    authorName: post.authorName,
    ...(post.coverKey === undefined ? {} : { coverKey: post.coverKey }),
    ...(post.coverMedia === undefined ? {} : { coverMedia: post.coverMedia }),
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    featured: post.featured,
  };
}

export function getLocalPublishedPosts(limit = 12): PublicPost[] {
  const boundedLimit = Math.min(12, Math.max(1, Math.floor(limit)));

  return seedPosts
    .filter(
      (post): post is typeof post & { publishedAt: number } =>
        post.status === "published" && post.publishedAt !== undefined,
    )
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      category: post.category,
      authorName: post.authorName,
      ...(post.coverKey === undefined ? {} : { coverKey: post.coverKey }),
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      featured: post.featured,
    }))
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, boundedLimit);
}

export function getLocalPublishedPostSummaries(
  limit = journalPageSize,
): PublicPostSummary[] {
  const boundedLimit = Math.min(
    journalPageSize,
    Math.max(1, Math.floor(limit)),
  );
  return getLocalPublishedPosts(boundedLimit).map(toPostSummary);
}

function reportFallback(operation: string, error?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[journal] ${operation} is using the local seed fallback.`,
      error instanceof Error ? error.message : error ?? "Convex URL is not set.",
    );
  }
}

export async function getPublishedPosts(limit = 6): Promise<PublicPost[]> {
  const boundedLimit = Math.min(12, Math.max(1, Math.floor(limit)));
  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    reportFallback("listPublished");
    return getLocalPublishedPosts(boundedLimit);
  }

  try {
    return await fetchQuery(
      api.posts.listPublished,
      { limit: boundedLimit },
      { url: convexUrl },
    );
  } catch (error) {
    reportFallback("listPublished", error);
    return getLocalPublishedPosts(boundedLimit);
  }
}

export async function getPublishedPostsPage(
  cursor?: string,
): Promise<JournalArchivePage> {
  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    reportFallback("listPublishedPage");
    return cursor === undefined
      ? {
          state: "fallback",
          posts: getLocalPublishedPostSummaries(),
          isDone: true,
          continueCursor: null,
        }
      : {
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
    reportFallback("listPublishedPage", error);
    return cursor === undefined
      ? {
          state: "fallback",
          posts: getLocalPublishedPostSummaries(),
          isDone: true,
          continueCursor: null,
        }
      : {
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
    reportFallback("getPublishedBySlug");
    return (
      getLocalPublishedPosts().find((post) => post.slug === normalizedSlug) ?? null
    );
  }

  try {
    return await fetchQuery(
      api.posts.getPublishedBySlug,
      { slug: normalizedSlug },
      { url: convexUrl },
    );
  } catch (error) {
    reportFallback("getPublishedBySlug", error);
    return (
      getLocalPublishedPosts().find((post) => post.slug === normalizedSlug) ?? null
    );
  }
}

export async function getSitemapPosts() {
  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    reportFallback("listSitemapEntries");
    return getLocalPublishedPosts().map(({ slug, updatedAt }) => ({
      slug,
      updatedAt,
    }));
  }

  try {
    return await fetchQuery(
      api.posts.listSitemapEntries,
      {},
      { url: convexUrl },
    );
  } catch (error) {
    reportFallback("listSitemapEntries", error);
    return getLocalPublishedPosts().map(({ slug, updatedAt }) => ({
      slug,
      updatedAt,
    }));
  }
}

export function getLocalPostSlugs() {
  return getLocalPublishedPosts().map(({ slug }) => ({ slug }));
}

export function formatPublishedDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(timestamp);
}
