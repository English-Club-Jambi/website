import { ConvexError, v } from "convex/values";

import { mediaAccessValidator } from "./assessmentValidators";
import type { Doc } from "./_generated/dataModel";
import {
  env,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { getMutableAssessmentVersion } from "./lib/assessmentAdmin";
import {
  normalizeAssessmentMediaInput,
  privateAssessmentMediaKey,
  publicAssessmentDerivativeKey,
} from "./lib/assessmentMedia";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import { publicR2UrlForKey } from "./lib/media";

const assessmentPurposeValidator = v.union(
  v.literal("assessment-audio"),
  v.literal("assessment-image"),
);

const assessmentContentTypeValidator = v.union(
  v.literal("audio/mpeg"),
  v.literal("audio/mp4"),
  v.literal("audio/ogg"),
  v.literal("audio/webm"),
  v.literal("image/avif"),
  v.literal("image/jpeg"),
  v.literal("image/png"),
  v.literal("image/webp"),
);

const accountIdPattern = /^[a-f0-9]{32}$/;
const bucketNamePattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

function requirePrivateAssessmentR2Config() {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const endpoint = env.R2_API?.trim();
  const bucket = env.R2_ASSESSMENT_BUCKET_NAME?.trim();
  const accessKeyId = env.R2_ASSESSMENT_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_ASSESSMENT_SECRET_ACCESS_KEY?.trim();
  if (
    !accountId ||
    !endpoint ||
    !bucket ||
    !accessKeyId ||
    !secretAccessKey ||
    !accountIdPattern.test(accountId) ||
    !bucketNamePattern.test(bucket)
  ) {
    throw new ConvexError({ code: "ASSESSMENT_PRIVATE_R2_NOT_CONFIGURED" as const });
  }
  const endpointUrl = new URL(endpoint);
  if (
    endpointUrl.protocol !== "https:" ||
    endpointUrl.hostname !== `${accountId}.r2.cloudflarestorage.com`
  ) {
    throw new ConvexError({ code: "ASSESSMENT_PRIVATE_R2_NOT_CONFIGURED" as const });
  }
}

const assessmentMediaInternalValidator = v.object({
  _id: v.id("mediaAssets"),
  objectKey: v.string(),
  purpose: assessmentPurposeValidator,
  contentType: assessmentContentTypeValidator,
  byteSize: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("ready"),
    v.literal("rejected"),
    v.literal("archived"),
  ),
  originalName: v.string(),
  alt: v.string(),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  access: mediaAccessValidator,
  durationMs: v.optional(v.number()),
  checksumSha256: v.string(),
  assessmentVersionId: v.id("assessmentVersions"),
  sourceMediaId: v.optional(v.id("mediaAssets")),
  uploadedBy: v.id("adminUsers"),
  verifiedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function projectAssessmentMedia(media: Doc<"mediaAssets">) {
  if (
    (media.purpose !== "assessment-audio" &&
      media.purpose !== "assessment-image") ||
    (media.contentType !== "audio/mpeg" &&
      media.contentType !== "audio/mp4" &&
      media.contentType !== "audio/ogg" &&
      media.contentType !== "audio/webm" &&
      media.contentType !== "image/avif" &&
      media.contentType !== "image/jpeg" &&
      media.contentType !== "image/png" &&
      media.contentType !== "image/webp") ||
    media.access === undefined ||
    media.checksumSha256 === undefined ||
    media.assessmentVersionId === undefined
  ) {
    return null;
  }
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
    access: media.access,
    ...(media.durationMs === undefined ? {} : { durationMs: media.durationMs }),
    checksumSha256: media.checksumSha256,
    assessmentVersionId: media.assessmentVersionId,
    ...(media.sourceMediaId === undefined
      ? {}
      : { sourceMediaId: media.sourceMediaId }),
    uploadedBy: media.uploadedBy,
    ...(media.verifiedAt === undefined ? {} : { verifiedAt: media.verifiedAt }),
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
  };
}

export const reserveUpload = mutation({
  args: {
    assessmentVersionId: v.id("assessmentVersions"),
    purpose: assessmentPurposeValidator,
    contentType: assessmentContentTypeValidator,
    byteSize: v.number(),
    originalName: v.string(),
    alt: v.string(),
    checksumSha256: v.string(),
    durationMs: v.optional(v.number()),
  },
  returns: v.object({
    mediaId: v.id("mediaAssets"),
    objectKey: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "media:upload");
    await requireAdmin(ctx, "assessment:edit");
    requirePrivateAssessmentR2Config();
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      args.assessmentVersionId,
    );
    const input = normalizeAssessmentMediaInput(args);
    let mediaCount = 0;
    for (const status of ["pending", "ready", "rejected", "archived"] as const) {
      const rows = await ctx.db
        .query("mediaAssets")
        .withIndex(
          "by_assessment_version_id_and_status_and_updated_at",
          (q) =>
            q.eq("assessmentVersionId", version._id).eq("status", status),
        )
        .take(201);
      if (rows.length > 200) {
        throw new ConvexError({ code: "ASSESSMENT_MEDIA_LIMIT" as const });
      }
      mediaCount += rows.length;
    }
    if (mediaCount >= 200) {
      throw new ConvexError({ code: "ASSESSMENT_MEDIA_LIMIT" as const });
    }
    const now = Date.now();
    const mediaId = await ctx.db.insert("mediaAssets", {
      objectKey: "assessment-drafts/reserved",
      purpose: input.purpose,
      contentType: input.contentType,
      byteSize: input.byteSize,
      status: "pending",
      originalName: input.originalName,
      alt: input.alt,
      access: "assessment-private",
      ...(input.durationMs === undefined
        ? {}
        : { durationMs: input.durationMs }),
      checksumSha256: input.checksumSha256,
      assessmentVersionId: version._id,
      uploadedBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
    const objectKey = privateAssessmentMediaKey({
      definitionId: definition._id,
      versionId: version._id,
      mediaId,
      extension: input.extension,
    });
    await ctx.db.patch("mediaAssets", mediaId, { objectKey });
    await writeAuditEvent(ctx, {
      area: "media",
      action: "create",
      resourceType: "assessment-media",
      resourceId: mediaId,
      summary: `${definition.slug} private assessment media reserved`,
      actorId: actor._id,
    });
    return { mediaId, objectKey };
  },
});

export const getInternal = internalQuery({
  args: { mediaId: v.id("mediaAssets") },
  returns: v.union(v.null(), assessmentMediaInternalValidator),
  handler: async (ctx, args) => {
    const media = await ctx.db.get("mediaAssets", args.mediaId);
    return media === null ? null : projectAssessmentMedia(media);
  },
});

export const getDerivativeForSourceInternal = internalQuery({
  args: { sourceMediaId: v.id("mediaAssets") },
  returns: v.union(v.null(), assessmentMediaInternalValidator),
  handler: async (ctx, args) => {
    const media = await ctx.db
      .query("mediaAssets")
      .withIndex("by_source_media_id", (q) =>
        q.eq("sourceMediaId", args.sourceMediaId),
      )
      .unique();
    return media === null ? null : projectAssessmentMedia(media);
  },
});

export const markDraftReadyInternal = internalMutation({
  args: {
    mediaId: v.id("mediaAssets"),
    actorId: v.id("adminUsers"),
    checksumSha256: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const media = await ctx.db.get("mediaAssets", args.mediaId);
    if (
      media === null ||
      media.status !== "pending" ||
      media.access !== "assessment-private" ||
      media.checksumSha256 !== args.checksumSha256 ||
      media.assessmentVersionId === undefined
    ) {
      throw new ConvexError({ code: "ASSESSMENT_MEDIA_NOT_PENDING" as const });
    }
    const isImage = media.purpose === "assessment-image";
    if (
      (isImage &&
        (!Number.isInteger(args.width) ||
          args.width === undefined ||
          args.width < 1 ||
          args.width > 12_000 ||
          !Number.isInteger(args.height) ||
          args.height === undefined ||
          args.height < 1 ||
          args.height > 12_000)) ||
      (!isImage && (args.width !== undefined || args.height !== undefined))
    ) {
      throw new ConvexError({ code: "INVALID_ASSESSMENT_MEDIA_DIMENSIONS" as const });
    }
    const now = Date.now();
    await ctx.db.patch("mediaAssets", media._id, {
      status: "ready",
      ...(args.width === undefined ? {} : { width: args.width }),
      ...(args.height === undefined ? {} : { height: args.height }),
      verifiedAt: now,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "media",
      action: "verify",
      resourceType: "assessment-media",
      resourceId: media._id,
      summary: `${media.originalName} private assessment source verified`,
      actorId: args.actorId,
    });
    return null;
  },
});

export const registerDerivativeInternal = internalMutation({
  args: {
    sourceMediaId: v.id("mediaAssets"),
    actorId: v.id("adminUsers"),
    objectKey: v.string(),
  },
  returns: v.object({
    mediaId: v.id("mediaAssets"),
    publicUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    const source = await ctx.db.get("mediaAssets", args.sourceMediaId);
    if (
      source === null ||
      source.status !== "ready" ||
      source.access !== "assessment-private" ||
      source.assessmentVersionId === undefined ||
      source.checksumSha256 === undefined ||
      (source.purpose !== "assessment-audio" &&
        source.purpose !== "assessment-image")
    ) {
      throw new ConvexError({ code: "ASSESSMENT_MEDIA_SOURCE_INVALID" as const });
    }
    const normalized = normalizeAssessmentMediaInput({
      purpose: source.purpose,
      contentType: source.contentType as
        | "audio/mpeg"
        | "audio/mp4"
        | "audio/ogg"
        | "audio/webm"
        | "image/avif"
        | "image/jpeg"
        | "image/png"
        | "image/webp",
      byteSize: source.byteSize,
      originalName: source.originalName,
      alt: source.alt,
      checksumSha256: source.checksumSha256,
      durationMs: source.durationMs,
    });
    const expectedKey = publicAssessmentDerivativeKey({
      versionId: source.assessmentVersionId,
      checksumSha256: source.checksumSha256,
      extension: normalized.extension,
    });
    if (args.objectKey !== expectedKey) {
      throw new ConvexError({ code: "ASSESSMENT_MEDIA_KEY_MISMATCH" as const });
    }
    const existing = await ctx.db
      .query("mediaAssets")
      .withIndex("by_source_media_id", (q) =>
        q.eq("sourceMediaId", source._id),
      )
      .unique();
    if (existing !== null) {
      if (
        existing.status !== "ready" ||
        existing.access !== "public" ||
        existing.objectKey !== expectedKey
      ) {
        throw new ConvexError({ code: "ASSESSMENT_MEDIA_DERIVATIVE_CONFLICT" as const });
      }
      return {
        mediaId: existing._id,
        publicUrl: publicR2UrlForKey(existing.objectKey),
      };
    }
    const keyCollision = await ctx.db
      .query("mediaAssets")
      .withIndex("by_object_key", (q) => q.eq("objectKey", expectedKey))
      .unique();
    if (keyCollision !== null) {
      throw new ConvexError({ code: "ASSESSMENT_MEDIA_DERIVATIVE_CONFLICT" as const });
    }
    const now = Date.now();
    const mediaId = await ctx.db.insert("mediaAssets", {
      objectKey: expectedKey,
      purpose: source.purpose,
      contentType: source.contentType,
      byteSize: source.byteSize,
      status: "ready",
      originalName: source.originalName,
      alt: source.alt,
      ...(source.width === undefined ? {} : { width: source.width }),
      ...(source.height === undefined ? {} : { height: source.height }),
      access: "public",
      ...(source.durationMs === undefined ? {} : { durationMs: source.durationMs }),
      checksumSha256: source.checksumSha256,
      assessmentVersionId: source.assessmentVersionId,
      sourceMediaId: source._id,
      uploadedBy: source.uploadedBy,
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "media",
      action: "publish",
      resourceType: "assessment-media",
      resourceId: mediaId,
      summary: `${source.originalName} public assessment derivative registered`,
      actorId: args.actorId,
    });
    return { mediaId, publicUrl: publicR2UrlForKey(expectedKey) };
  },
});
