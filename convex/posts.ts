import { v } from "convex/values";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";

import type { Doc } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { validateEditorDocument } from "./lib/editorDocument";
import {
  projectReadyJournalCover,
  projectReadyJournalMedia,
} from "./lib/media";
import {
  publicPostValidator,
  publicPostSummaryValidator,
  sitemapEntryValidator,
} from "./validators";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function boundedLimit(value: number | undefined, fallback: number, maximum: number) {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(1, Math.floor(value)));
}

function toPublicPost(post: {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  editorJson?: string;
  inlineMedia?: Array<{
    mediaId: Doc<"mediaAssets">["_id"];
    publicUrl: string;
    alt: string;
    width: number;
    height: number;
  }>;
  category: string;
  authorName: string;
  coverKey?: string;
  coverMedia?: {
    mediaId: Doc<"mediaAssets">["_id"];
    publicUrl: string;
    alt: string;
    width: number;
    height: number;
  };
  publishedAt?: number;
  updatedAt: number;
  featured: boolean;
}) {
  if (post.publishedAt === undefined) {
    return null;
  }

  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    ...(post.editorJson === undefined ? {} : { editorJson: post.editorJson }),
    ...(post.inlineMedia === undefined ? {} : { inlineMedia: post.inlineMedia }),
    category: post.category,
    authorName: post.authorName,
    ...(post.coverKey === undefined ? {} : { coverKey: post.coverKey }),
    ...(post.coverMedia === undefined ? {} : { coverMedia: post.coverMedia }),
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    featured: post.featured,
  };
}

async function getPublishedInlineMedia(
  ctx: QueryCtx,
  revision: Doc<"postRevisions">,
) {
  let mediaIds: string[];
  try {
    mediaIds = validateEditorDocument(revision.editorJson).mediaIds;
  } catch {
    return [];
  }
  return await projectReadyJournalMedia(ctx, mediaIds);
}

function toPublicPostSummary(post: Parameters<typeof toPublicPost>[0]) {
  const detail = toPublicPost(post);

  if (detail === null) {
    return null;
  }

  return {
    slug: detail.slug,
    title: detail.title,
    excerpt: detail.excerpt,
    category: detail.category,
    authorName: detail.authorName,
    ...(detail.coverKey === undefined ? {} : { coverKey: detail.coverKey }),
    ...(detail.coverMedia === undefined
      ? {}
      : { coverMedia: detail.coverMedia }),
    publishedAt: detail.publishedAt,
    updatedAt: detail.updatedAt,
    featured: detail.featured,
  };
}

export const listPublished = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(publicPostValidator),
  handler: async (ctx, args) => {
    const limit = boundedLimit(args.limit, 6, 12);
    const rows = await ctx.db
      .query("posts")
      .withIndex("by_status_published_at", (q) =>
        q.eq("status", "published"),
      )
      .order("desc")
      .take(limit);

    const posts = await Promise.all(
      rows.map(async (row) => {
        const coverMedia = await projectReadyJournalCover(
          ctx,
          row.coverMediaId,
        );
        return toPublicPost({
          ...row,
          ...(coverMedia === null ? {} : { coverMedia }),
        });
      }),
    );
    return posts.flatMap((post) => (post === null ? [] : [post]));
  },
});

export const listPublishedPage = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(publicPostSummaryValidator),
  handler: async (ctx, args) => {
    if (
      args.paginationOpts.numItems !== 6 ||
      args.paginationOpts.maximumRowsRead !== 6
    ) {
      throw new Error("Journal page size is invalid.");
    }

    const result = await ctx.db
      .query("posts")
      .withIndex("by_status_published_at", (q) =>
        q.eq("status", "published"),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: (
        await Promise.all(
          result.page.map(async (row) => {
            const coverMedia = await projectReadyJournalCover(
              ctx,
              row.coverMediaId,
            );
            return toPublicPostSummary({
              ...row,
              ...(coverMedia === null ? {} : { coverMedia }),
            });
          }),
        )
      ).flatMap((post) => (post === null ? [] : [post])),
    };
  },
});

export const getFeatured = query({
  args: {},
  returns: v.union(v.null(), publicPostValidator),
  handler: async (ctx) => {
    const row = await ctx.db
      .query("posts")
      .withIndex("by_status_featured_published_at", (q) =>
        q.eq("status", "published").eq("featured", true),
      )
      .order("desc")
      .first();

    if (row === null) {
      return null;
    }
    const coverMedia = await projectReadyJournalCover(ctx, row.coverMediaId);
    return toPublicPost({
      ...row,
      ...(coverMedia === null ? {} : { coverMedia }),
    });
  },
});

export const getPublishedBySlug = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), publicPostValidator),
  handler: async (ctx, args) => {
    const slug = args.slug.trim().toLowerCase();
    if (slug.length < 3 || slug.length > 96 || !slugPattern.test(slug)) {
      return null;
    }

    const row = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (row === null || row.status !== "published") {
      return null;
    }

    const [revision, coverMedia] = await Promise.all([
      row.publishedRevisionId === undefined
        ? null
        : ctx.db.get("postRevisions", row.publishedRevisionId),
      projectReadyJournalCover(ctx, row.coverMediaId),
    ]);
    const inlineMedia =
      revision === null || revision.postId !== row._id
        ? []
        : await getPublishedInlineMedia(ctx, revision);
    return toPublicPost({
      ...row,
      ...(revision === null || revision.postId !== row._id
        ? {}
        : { editorJson: revision.editorJson }),
      ...(coverMedia === null ? {} : { coverMedia }),
      inlineMedia,
    });
  },
});

export const listSitemapEntries = query({
  args: {},
  returns: v.array(sitemapEntryValidator),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("posts")
      .withIndex("by_status_published_at", (q) =>
        q.eq("status", "published"),
      )
      .order("desc")
      .take(100);

    return rows.map(({ slug, updatedAt }) => ({ slug, updatedAt }));
  },
});
