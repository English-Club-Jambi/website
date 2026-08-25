import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import { validateEditorDocument } from "./lib/editorDocument";
import { projectReadyJournalMedia } from "./lib/media";
import {
  postStatusValidator,
  publicInlineMediaValidator,
} from "./validators";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const postSummaryValidator = v.object({
  _id: v.id("posts"),
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  category: v.string(),
  authorName: v.string(),
  status: postStatusValidator,
  featured: v.boolean(),
  publishedAt: v.optional(v.number()),
  updatedAt: v.number(),
  hasDraft: v.boolean(),
});

const revisionSummaryValidator = v.object({
  _id: v.id("postRevisions"),
  revision: v.number(),
  slug: v.string(),
  title: v.string(),
  createdAt: v.number(),
});

const revisionViewValidator = v.object({
  ...revisionSummaryValidator.fields,
  excerpt: v.string(),
  category: v.string(),
  authorName: v.string(),
  featured: v.boolean(),
  coverMediaId: v.optional(v.id("mediaAssets")),
  editorJson: v.string(),
  plainText: v.string(),
  inlineMedia: v.array(publicInlineMediaValidator),
});

const workspaceValidator = v.object({
  post: postSummaryValidator,
  draft: v.union(v.null(), revisionViewValidator),
  published: v.union(v.null(), revisionViewValidator),
});

function cleanLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function validateMetadata(input: {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  authorName: string;
}) {
  if (
    !slugPattern.test(input.slug) ||
    input.slug.length < 3 ||
    input.slug.length > 96 ||
    input.title.length < 5 ||
    input.title.length > 180 ||
    input.excerpt.length < 20 ||
    input.excerpt.length > 360 ||
    input.category.length < 2 ||
    input.category.length > 80 ||
    input.authorName.length < 2 ||
    input.authorName.length > 100
  ) {
    throw new Error("Journal metadata is invalid.");
  }
}

function toSummary(post: Doc<"posts">) {
  return {
    _id: post._id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    authorName: post.authorName,
    status: post.status,
    featured: post.featured,
    ...(post.publishedAt === undefined ? {} : { publishedAt: post.publishedAt }),
    updatedAt: post.updatedAt,
    hasDraft: post.draftRevisionId !== undefined,
  };
}

function toRevisionSummary(revision: Doc<"postRevisions">) {
  return {
    _id: revision._id,
    revision: revision.revision,
    slug: revision.slug,
    title: revision.title,
    createdAt: revision.createdAt,
  };
}

async function toRevisionView(
  ctx: QueryCtx,
  revision: Doc<"postRevisions">,
) {
  const document = validateEditorDocument(revision.editorJson);
  const inlineMedia = await projectReadyJournalMedia(ctx, document.mediaIds);
  return {
    ...toRevisionSummary(revision),
    excerpt: revision.excerpt,
    category: revision.category,
    authorName: revision.authorName,
    featured: revision.featured,
    ...(revision.coverMediaId === undefined
      ? {}
      : { coverMediaId: revision.coverMediaId }),
    editorJson: revision.editorJson,
    plainText: revision.plainText,
    inlineMedia,
  };
}

async function requireReadyMedia(
  ctx: Parameters<typeof requireAdmin>[0],
  mediaId: Id<"mediaAssets">,
) {
  const media = await ctx.db.get("mediaAssets", mediaId);
  if (media === null || media.status !== "ready") {
    throw new Error("A referenced media asset is not ready.");
  }
  return media;
}

export const listPage = query({
  args: {
    status: v.optional(postStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(postSummaryValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "journal:read");
    if (args.paginationOpts.numItems !== 12) {
      throw new Error("Journal admin page size is invalid.");
    }
    const result =
      args.status === undefined
        ? await ctx.db
            .query("posts")
            .withIndex("by_updated_at")
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("posts")
            .withIndex("by_status_updated_at", (q) =>
              q.eq("status", args.status!),
            )
            .order("desc")
            .paginate(args.paginationOpts);
    return { ...result, page: result.page.map(toSummary) };
  },
});

export const getWorkspace = query({
  args: { postId: v.id("posts") },
  returns: v.union(v.null(), workspaceValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "journal:read");
    const post = await ctx.db.get("posts", args.postId);
    if (post === null) {
      return null;
    }
    const [draft, published] = await Promise.all([
      post.draftRevisionId === undefined
        ? null
        : ctx.db.get("postRevisions", post.draftRevisionId),
      post.publishedRevisionId === undefined
        ? null
        : ctx.db.get("postRevisions", post.publishedRevisionId),
    ]);
    const [draftView, publishedView] = await Promise.all([
      draft === null || draft.postId !== post._id
        ? null
        : toRevisionView(ctx, draft),
      published === null || published.postId !== post._id
        ? null
        : toRevisionView(ctx, published),
    ]);
    return {
      post: toSummary(post),
      draft: draftView,
      published: publishedView,
    };
  },
});

export const listRevisions = query({
  args: { postId: v.id("posts"), limit: v.optional(v.number()) },
  returns: v.array(revisionSummaryValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "journal:read");
    const post = await ctx.db.get("posts", args.postId);
    if (post === null) {
      return [];
    }
    const limit = Math.min(30, Math.max(1, Math.floor(args.limit ?? 20)));
    const rows = await ctx.db
      .query("postRevisions")
      .withIndex("by_post_id_and_revision", (q) => q.eq("postId", post._id))
      .order("desc")
      .take(limit);
    return rows.map(toRevisionSummary);
  },
});

export const getRevision = query({
  args: {
    postId: v.id("posts"),
    revisionId: v.id("postRevisions"),
  },
  returns: v.union(v.null(), revisionViewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "journal:read");
    const [post, revision] = await Promise.all([
      ctx.db.get("posts", args.postId),
      ctx.db.get("postRevisions", args.revisionId),
    ]);
    if (post === null || revision === null || revision.postId !== post._id) {
      return null;
    }
    return await toRevisionView(ctx, revision);
  },
});

export const saveDraft = mutation({
  args: {
    postId: v.optional(v.id("posts")),
    expectedRevision: v.number(),
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    category: v.string(),
    authorName: v.string(),
    featured: v.boolean(),
    coverMediaId: v.optional(v.union(v.id("mediaAssets"), v.null())),
    editorJson: v.string(),
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      postId: v.id("posts"),
      revisionId: v.id("postRevisions"),
      revision: v.number(),
    }),
    v.object({
      ok: v.literal(false),
      code: v.literal("conflict"),
      currentRevision: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "journal:edit");
    const slug = args.slug.trim().toLowerCase();
    const metadata = {
      slug,
      title: cleanLine(args.title),
      excerpt: cleanLine(args.excerpt),
      category: cleanLine(args.category),
      authorName: cleanLine(args.authorName),
    };
    validateMetadata(metadata);
    if (!Number.isInteger(args.expectedRevision) || args.expectedRevision < 0) {
      throw new Error("Expected journal revision is invalid.");
    }

    const document = validateEditorDocument(args.editorJson);
    const post =
      args.postId === undefined ? null : await ctx.db.get("posts", args.postId);
    if (args.postId !== undefined && post === null) {
      throw new Error("Journal post was not found.");
    }
    const currentDraft =
      post?.draftRevisionId === undefined
        ? null
        : await ctx.db.get("postRevisions", post.draftRevisionId);
    const currentRevision = currentDraft?.revision ?? 0;
    if (currentRevision !== args.expectedRevision) {
      return { ok: false, code: "conflict", currentRevision } as const;
    }

    const slugOwner = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (slugOwner !== null && slugOwner._id !== post?._id) {
      throw new Error("Journal slug is already in use.");
    }

    const coverMediaId =
      args.coverMediaId === undefined
        ? currentDraft?.coverMediaId ?? post?.coverMediaId
        : args.coverMediaId === null
          ? undefined
          : args.coverMediaId;
    if (coverMediaId !== undefined) {
      const cover = await requireReadyMedia(ctx, coverMediaId);
      if (cover.purpose !== "journal-cover" && cover.purpose !== "page-image") {
        throw new Error("Selected media is not a journal cover.");
      }
    }
    for (const mediaIdValue of document.mediaIds) {
      const mediaId = ctx.db.normalizeId("mediaAssets", mediaIdValue);
      if (mediaId === null) {
        throw new Error("Editor media reference is invalid.");
      }
      const media = await requireReadyMedia(ctx, mediaId);
      if (
        media.purpose !== "journal-inline" &&
        media.purpose !== "page-image"
      ) {
        throw new Error("Editor image is not journal media.");
      }
    }

    const now = Date.now();
    const nextRevision = currentRevision + 1;
    const postId =
      post === null
        ? await ctx.db.insert("posts", {
            ...metadata,
            body: document.plainText,
            status: "draft",
            featured: args.featured,
            ...(coverMediaId === undefined ? {} : { coverMediaId }),
            createdAt: now,
            updatedAt: now,
            nextRevision: nextRevision + 1,
            createdBy: actor._id,
            updatedBy: actor._id,
          })
        : post._id;
    const revisionId = await ctx.db.insert("postRevisions", {
      postId,
      revision: nextRevision,
      ...metadata,
      featured: args.featured,
      ...(coverMediaId === undefined ? {} : { coverMediaId }),
      editorJson: document.editorJson,
      plainText: document.plainText,
      createdBy: actor._id,
      createdAt: now,
    });
    await ctx.db.patch("posts", postId, {
      draftRevisionId: revisionId,
      nextRevision: nextRevision + 1,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "journal",
      action: post === null ? "create" : "update",
      resourceType: "post",
      resourceId: postId,
      summary: `${metadata.title} draft saved`,
      actorId: actor._id,
    });
    return { ok: true, postId, revisionId, revision: nextRevision } as const;
  },
});

export const publish = mutation({
  args: {
    postId: v.id("posts"),
    expectedRevision: v.number(),
  },
  returns: v.object({ publishedAt: v.number(), revision: v.number() }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "journal:publish");
    const post = await ctx.db.get("posts", args.postId);
    if (post === null || post.draftRevisionId === undefined) {
      throw new Error("Journal draft was not found.");
    }
    const revision = await ctx.db.get("postRevisions", post.draftRevisionId);
    if (
      revision === null ||
      revision.postId !== post._id ||
      revision.revision !== args.expectedRevision
    ) {
      throw new Error("Journal draft changed before publication.");
    }
    if (post.publishedRevisionId === revision._id) {
      throw new Error("This journal revision is already published.");
    }
    if (revision.plainText.length < 80) {
      throw new Error("Journal story is too short to publish.");
    }
    const document = validateEditorDocument(revision.editorJson);
    for (const mediaIdValue of document.mediaIds) {
      const mediaId = ctx.db.normalizeId("mediaAssets", mediaIdValue);
      if (mediaId === null) {
        throw new Error("Editor media reference is invalid.");
      }
      const media = await requireReadyMedia(ctx, mediaId);
      if (
        media.purpose !== "journal-inline" &&
        media.purpose !== "page-image"
      ) {
        throw new Error("Editor image is not journal media.");
      }
    }
    const cover =
      revision.coverMediaId === undefined
        ? null
        : await requireReadyMedia(ctx, revision.coverMediaId);
    const now = Date.now();
    await ctx.db.patch("posts", post._id, {
      slug: revision.slug,
      title: revision.title,
      excerpt: revision.excerpt,
      category: revision.category,
      authorName: revision.authorName,
      featured: revision.featured,
      body: revision.plainText,
      coverMediaId: revision.coverMediaId,
      coverKey: cover?.objectKey,
      status: "published",
      publishedAt: now,
      publishedRevisionId: revision._id,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "journal",
      action: "publish",
      resourceType: "post",
      resourceId: post._id,
      summary: `${revision.title} published`,
      actorId: actor._id,
    });
    return { publishedAt: now, revision: revision.revision };
  },
});

export const archive = mutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "journal:publish");
    const post = await ctx.db.get("posts", args.postId);
    if (post === null) {
      throw new Error("Journal post was not found.");
    }
    await ctx.db.patch("posts", post._id, {
      status: "archived",
      updatedBy: actor._id,
      updatedAt: Date.now(),
    });
    await writeAuditEvent(ctx, {
      area: "journal",
      action: "archive",
      resourceType: "post",
      resourceId: post._id,
      summary: `${post.title} archived`,
      actorId: actor._id,
    });
    return null;
  },
});
