import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mediaAccessValidator } from "./assessmentValidators";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import { publicR2UrlForKey } from "./lib/media";
import {
  mediaContentTypeValidator,
  mediaPurposeValidator,
  mediaStatusValidator,
} from "./validators";

const mediaViewValidator = v.object({
  _id: v.id("mediaAssets"),
  objectKey: v.string(),
  purpose: mediaPurposeValidator,
  contentType: mediaContentTypeValidator,
  byteSize: v.number(),
  status: mediaStatusValidator,
  originalName: v.string(),
  alt: v.string(),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  access: v.optional(mediaAccessValidator),
  durationMs: v.optional(v.number()),
  checksumSha256: v.optional(v.string()),
  assessmentVersionId: v.optional(v.id("assessmentVersions")),
  sourceMediaId: v.optional(v.id("mediaAssets")),
  uploadedBy: v.id("adminUsers"),
  verifiedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
  publicUrl: v.optional(v.string()),
});

function toMediaView(media: Doc<"mediaAssets">) {
  return {
    _id: media._id,
    objectKey: media.objectKey,
    purpose: media.purpose,
    contentType: media.contentType,
    byteSize: media.byteSize,
    status: media.status,
    originalName: media.originalName,
    alt: media.alt,
    ...(media.width === undefined ? {} : { width: media.width }),
    ...(media.height === undefined ? {} : { height: media.height }),
    ...(media.access === undefined ? {} : { access: media.access }),
    ...(media.durationMs === undefined
      ? {}
      : { durationMs: media.durationMs }),
    ...(media.checksumSha256 === undefined
      ? {}
      : { checksumSha256: media.checksumSha256 }),
    ...(media.assessmentVersionId === undefined
      ? {}
      : { assessmentVersionId: media.assessmentVersionId }),
    ...(media.sourceMediaId === undefined
      ? {}
      : { sourceMediaId: media.sourceMediaId }),
    uploadedBy: media.uploadedBy,
    ...(media.verifiedAt === undefined
      ? {}
      : { verifiedAt: media.verifiedAt }),
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
    ...(media.status === "ready" && (media.access ?? "public") === "public"
      ? { publicUrl: publicR2UrlForKey(media.objectKey) }
      : {}),
  };
}

export const getInternal = internalQuery({
  args: { mediaId: v.id("mediaAssets") },
  returns: v.union(v.null(), mediaViewValidator),
  handler: async (ctx, args) => {
    const media = await ctx.db.get("mediaAssets", args.mediaId);
    return media === null ? null : toMediaView(media);
  },
});

export const createPending = internalMutation({
  args: {
    objectKey: v.string(),
    purpose: mediaPurposeValidator,
    contentType: mediaContentTypeValidator,
    byteSize: v.number(),
    originalName: v.string(),
    alt: v.string(),
    uploadedBy: v.id("adminUsers"),
  },
  returns: v.id("mediaAssets"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mediaAssets")
      .withIndex("by_object_key", (q) => q.eq("objectKey", args.objectKey))
      .unique();
    if (existing !== null) {
      throw new Error("Media object key is already registered.");
    }
    const now = Date.now();
    return await ctx.db.insert("mediaAssets", {
      ...args,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markReady = internalMutation({
  args: {
    mediaId: v.id("mediaAssets"),
    width: v.number(),
    height: v.number(),
    actorId: v.id("adminUsers"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const media = await ctx.db.get("mediaAssets", args.mediaId);
    if (media === null || media.status !== "pending") {
      throw new Error("Pending media asset was not found.");
    }
    if (
      !Number.isInteger(args.width) ||
      args.width < 1 ||
      args.width > 12_000 ||
      !Number.isInteger(args.height) ||
      args.height < 1 ||
      args.height > 12_000
    ) {
      throw new Error("Media dimensions are invalid.");
    }
    const now = Date.now();
    await ctx.db.patch("mediaAssets", media._id, {
      status: "ready",
      width: args.width,
      height: args.height,
      verifiedAt: now,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "media",
      action: "verify",
      resourceType: "media-asset",
      resourceId: media._id,
      summary: `${media.originalName} verified`,
      actorId: args.actorId,
    });
    return publicR2UrlForKey(media.objectKey);
  },
});

export const listPage = query({
  args: {
    purpose: v.optional(mediaPurposeValidator),
    status: mediaStatusValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(mediaViewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "media:read");
    if (
      args.paginationOpts.numItems !== 24 ||
      (args.paginationOpts.maximumRowsRead !== undefined &&
        args.paginationOpts.maximumRowsRead > 24)
    ) {
      throw new Error("Media page size is invalid.");
    }
    const result =
      args.purpose === undefined
        ? await ctx.db
            .query("mediaAssets")
            .withIndex("by_status_and_updated_at", (q) =>
              q.eq("status", args.status),
            )
            .order("desc")
            .paginate({ ...args.paginationOpts, maximumRowsRead: 24 })
        : await ctx.db
            .query("mediaAssets")
            .withIndex("by_purpose_and_status_and_updated_at", (q) =>
              q.eq("purpose", args.purpose!).eq("status", args.status),
            )
            .order("desc")
            .paginate({ ...args.paginationOpts, maximumRowsRead: 24 });
    return { ...result, page: result.page.map(toMediaView) };
  },
});

export const listAssessmentPage = query({
  args: {
    assessmentVersionId: v.id("assessmentVersions"),
    access: mediaAccessValidator,
    purpose: v.optional(
      v.union(
        v.literal("assessment-audio"),
        v.literal("assessment-image"),
      ),
    ),
    status: mediaStatusValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(mediaViewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "assessment:read");
    await requireAdmin(ctx, "media:read");
    if (
      args.paginationOpts.numItems !== 24 ||
      (args.paginationOpts.maximumRowsRead !== undefined &&
        args.paginationOpts.maximumRowsRead > 24)
    ) {
      throw new Error("Assessment media page size is invalid.");
    }
    const result =
      args.purpose === undefined
        ? await ctx.db
            .query("mediaAssets")
            .withIndex(
              "by_version_access_status_updated",
              (q) =>
                q
                  .eq("assessmentVersionId", args.assessmentVersionId)
                  .eq("access", args.access)
                  .eq("status", args.status),
            )
            .order("desc")
            .paginate({ ...args.paginationOpts, maximumRowsRead: 24 })
        : await ctx.db
            .query("mediaAssets")
            .withIndex(
              "by_version_access_purpose_status_updated",
              (q) =>
                q
                  .eq("assessmentVersionId", args.assessmentVersionId)
                  .eq("access", args.access)
                  .eq("purpose", args.purpose!)
                  .eq("status", args.status),
            )
            .order("desc")
            .paginate({ ...args.paginationOpts, maximumRowsRead: 24 });
    return { ...result, page: result.page.map(toMediaView) };
  },
});

export const archive = mutation({
  args: { mediaId: v.id("mediaAssets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "media:upload");
    const media = await ctx.db.get("mediaAssets", args.mediaId);
    if (media === null) {
      throw new Error("Media asset was not found.");
    }
    await ctx.db.patch("mediaAssets", media._id, {
      status: "archived",
      updatedAt: Date.now(),
    });
    await writeAuditEvent(ctx, {
      area: "media",
      action: "archive",
      resourceType: "media-asset",
      resourceId: media._id,
      summary: `${media.originalName} archived`,
      actorId: actor._id,
    });
    return null;
  },
});
