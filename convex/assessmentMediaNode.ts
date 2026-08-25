"use node";

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, env, type ActionCtx } from "./_generated/server";
import {
  normalizeAssessmentMediaInput,
  publicAssessmentDerivativeKey,
} from "./lib/assessmentMedia";
import { adminHasPermission, type AdminPermission } from "./lib/adminAuth";
import { publicR2UrlForKey } from "./lib/media";

const accountIdPattern = /^[a-f0-9]{32}$/;
const bucketNamePattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const privateCacheControl = "private, no-store";
const publicCacheControl = "public, max-age=31536000, immutable";

type ActiveAdminView = {
  _id: Id<"adminUsers">;
  role: "owner" | "publisher" | "editor";
  status: "active" | "disabled";
};

type AssessmentMediaView = {
  _id: Id<"mediaAssets">;
  objectKey: string;
  purpose: "assessment-audio" | "assessment-image";
  contentType:
    | "audio/mpeg"
    | "audio/mp4"
    | "audio/ogg"
    | "audio/webm"
    | "image/avif"
    | "image/jpeg"
    | "image/png"
    | "image/webp";
  byteSize: number;
  status: "pending" | "ready" | "rejected" | "archived";
  originalName: string;
  alt: string;
  width?: number;
  height?: number;
  access: "public" | "assessment-private";
  durationMs?: number;
  checksumSha256: string;
  assessmentVersionId: Id<"assessmentVersions">;
  sourceMediaId?: Id<"mediaAssets">;
  uploadedBy: Id<"adminUsers">;
  verifiedAt?: number;
  createdAt: number;
  updatedAt: number;
};

function getEndpoint() {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const endpoint =
    env.R2_API?.trim() ||
    (accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : undefined);
  if (!accountId || !endpoint || !accountIdPattern.test(accountId)) {
    throw new Error("R2 account configuration is incomplete.");
  }
  const endpointUrl = new URL(endpoint);
  if (
    endpointUrl.protocol !== "https:" ||
    endpointUrl.hostname !== `${accountId}.r2.cloudflarestorage.com`
  ) {
    throw new Error("R2_API must use the Cloudflare R2 S3 endpoint.");
  }
  return endpointUrl.origin;
}

function getAssessmentR2Config() {
  const bucket = env.R2_ASSESSMENT_BUCKET_NAME?.trim();
  const accessKeyId = env.R2_ASSESSMENT_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_ASSESSMENT_SECRET_ACCESS_KEY?.trim();
  if (
    !bucket ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketNamePattern.test(bucket)
  ) {
    throw new Error("Private assessment R2 configuration is incomplete.");
  }
  return {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint: getEndpoint(),
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

function getPublicR2Config() {
  const bucket = env.R2_BUCKET_NAME?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  if (
    !bucket ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketNamePattern.test(bucket)
  ) {
    throw new Error("Public R2 configuration is incomplete.");
  }
  return {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint: getEndpoint(),
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

async function requireAssessmentMediaAdmin(
  ctx: ActionCtx,
  permissions: AdminPermission[],
): Promise<ActiveAdminView> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) throw new Error("Authentication is required.");
  const admin: ActiveAdminView | null = await ctx.runQuery(
    internal.adminUsers.getActiveForIdentity,
    {
      tokenIdentifier: identity.tokenIdentifier,
      subject: identity.subject,
      issuer: identity.issuer,
    },
  );
  if (
    admin === null ||
    !adminHasPermission(admin, "media:upload") ||
    permissions.some((permission) => !adminHasPermission(admin, permission))
  ) {
    throw new Error("Assessment media permission is required.");
  }
  return admin;
}

function checksumBase64(checksumSha256: string) {
  if (!/^[a-f0-9]{64}$/.test(checksumSha256)) {
    throw new Error("Assessment media checksum is invalid.");
  }
  return Buffer.from(checksumSha256, "hex").toString("base64");
}

function isMissingObjectError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.name === "NoSuchKey" ||
    candidate.name === "NotFound"
  );
}

function hasValidEndpoint() {
  try {
    getEndpoint();
    return true;
  } catch {
    return false;
  }
}

export const getConfigStatus = action({
  args: {},
  returns: v.object({
    privateDraftReady: v.boolean(),
    publicDerivativeReady: v.boolean(),
    confidentialUploadsBlocked: v.boolean(),
  }),
  handler: async (ctx): Promise<{
    privateDraftReady: boolean;
    publicDerivativeReady: boolean;
    confidentialUploadsBlocked: boolean;
  }> => {
    await requireAssessmentMediaAdmin(ctx, ["assessment:read"]);
    const endpointReady = hasValidEndpoint();
    const privateDraftReady =
      endpointReady &&
      bucketNamePattern.test(env.R2_ASSESSMENT_BUCKET_NAME?.trim() ?? "") &&
      Boolean(env.R2_ASSESSMENT_ACCESS_KEY_ID?.trim()) &&
      Boolean(env.R2_ASSESSMENT_SECRET_ACCESS_KEY?.trim());
    const publicDerivativeReady =
      endpointReady &&
      bucketNamePattern.test(env.R2_BUCKET_NAME?.trim() ?? "") &&
      Boolean(env.R2_ACCESS_KEY_ID?.trim()) &&
      Boolean(env.R2_SECRET_ACCESS_KEY?.trim());
    return {
      privateDraftReady,
      publicDerivativeReady,
      confidentialUploadsBlocked: !privateDraftReady,
    };
  },
});

function assertPrivateMedia(
  media: AssessmentMediaView | null,
): asserts media is AssessmentMediaView & { access: "assessment-private" } {
  if (
    media === null ||
    typeof media !== "object" ||
    !("access" in media) ||
    media.access !== "assessment-private"
  ) {
    throw new Error("Private assessment media was not found.");
  }
}

export const createUploadUrl = action({
  args: { mediaId: v.id("mediaAssets") },
  returns: v.object({
    uploadUrl: v.string(),
    expiresAt: v.number(),
    requiredHeaders: v.object({
      contentType: v.string(),
      cacheControl: v.string(),
      checksumSha256: v.string(),
      metadataChecksumSha256: v.string(),
      metadataDurationMs: v.union(v.string(), v.null()),
    }),
  }),
  handler: async (ctx, args): Promise<{
    uploadUrl: string;
    expiresAt: number;
    requiredHeaders: {
      contentType: string;
      cacheControl: string;
      checksumSha256: string;
      metadataChecksumSha256: string;
      metadataDurationMs: string | null;
    };
  }> => {
    await requireAssessmentMediaAdmin(ctx, ["assessment:edit"]);
    const media: AssessmentMediaView | null = await ctx.runQuery(
      internal.assessmentMedia.getInternal,
      args,
    );
    assertPrivateMedia(media);
    if (media.status !== "pending") {
      throw new Error("Pending assessment media was not found.");
    }
    const { bucket, client } = getAssessmentR2Config();
    const checksumSha256 = checksumBase64(media.checksumSha256);
    const metadata = {
      "checksum-sha256": media.checksumSha256,
      ...(media.durationMs === undefined
        ? {}
        : { "duration-ms": String(media.durationMs) }),
    };
    const expiresIn = 300;
    const uploadUrl: string = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: media.objectKey,
        ContentType: media.contentType,
        ContentLength: media.byteSize,
        CacheControl: privateCacheControl,
        ChecksumSHA256: checksumSha256,
        Metadata: metadata,
      }),
      { expiresIn },
    );
    return {
      uploadUrl,
      expiresAt: Date.now() + expiresIn * 1_000,
      requiredHeaders: {
        contentType: media.contentType,
        cacheControl: privateCacheControl,
        checksumSha256,
        metadataChecksumSha256: media.checksumSha256,
        metadataDurationMs:
          media.durationMs === undefined ? null : String(media.durationMs),
      },
    };
  },
});

export const createPreviewUrl = action({
  args: { mediaId: v.id("mediaAssets") },
  returns: v.object({ previewUrl: v.string(), expiresAt: v.number() }),
  handler: async (ctx, args): Promise<{
    previewUrl: string;
    expiresAt: number;
  }> => {
    await requireAssessmentMediaAdmin(ctx, ["assessment:read"]);
    const media: AssessmentMediaView | null = await ctx.runQuery(
      internal.assessmentMedia.getInternal,
      args,
    );
    assertPrivateMedia(media);
    if (media.status !== "ready") {
      throw new Error("Ready private assessment media was not found.");
    }
    const { bucket, client } = getAssessmentR2Config();
    const expiresIn = 180;
    const previewUrl: string = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: media.objectKey }),
      { expiresIn },
    );
    return { previewUrl, expiresAt: Date.now() + expiresIn * 1_000 };
  },
});

export const verifyUpload = action({
  args: {
    mediaId: v.id("mediaAssets"),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const admin = await requireAssessmentMediaAdmin(ctx, ["assessment:edit"]);
    const media: AssessmentMediaView | null = await ctx.runQuery(
      internal.assessmentMedia.getInternal,
      { mediaId: args.mediaId },
    );
    assertPrivateMedia(media);
    if (media.status !== "pending") {
      throw new Error("Pending assessment media was not found.");
    }
    const { bucket, client } = getAssessmentR2Config();
    const object = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: media.objectKey,
        ChecksumMode: "ENABLED",
      }),
    );
    const expectedChecksum = checksumBase64(media.checksumSha256);
    if (
      object.ContentType !== media.contentType ||
      object.ContentLength !== media.byteSize ||
      object.CacheControl !== privateCacheControl ||
      object.ChecksumSHA256 !== expectedChecksum ||
      object.Metadata?.["checksum-sha256"] !== media.checksumSha256 ||
      (media.durationMs === undefined
        ? object.Metadata?.["duration-ms"] !== undefined
        : object.Metadata?.["duration-ms"] !== String(media.durationMs))
    ) {
      throw new Error("Private assessment media metadata does not match the reservation.");
    }
    await ctx.runMutation(internal.assessmentMedia.markDraftReadyInternal, {
      mediaId: media._id,
      actorId: admin._id,
      checksumSha256: media.checksumSha256,
      ...(args.width === undefined ? {} : { width: args.width }),
      ...(args.height === undefined ? {} : { height: args.height }),
    });
    return { ok: true as const };
  },
});

export const publishDerivative = action({
  args: { sourceMediaId: v.id("mediaAssets") },
  returns: v.object({
    mediaId: v.id("mediaAssets"),
    publicUrl: v.string(),
  }),
  handler: async (ctx, args): Promise<{
    mediaId: Id<"mediaAssets">;
    publicUrl: string;
  }> => {
    const admin: ActiveAdminView = await requireAssessmentMediaAdmin(ctx, [
      "assessment:publish",
    ]);
    const existing: AssessmentMediaView | null = await ctx.runQuery(
      internal.assessmentMedia.getDerivativeForSourceInternal,
      args,
    );
    if (
      existing !== null &&
      existing.status === "ready" &&
      existing.access === "public"
    ) {
      return {
        mediaId: existing._id,
        publicUrl: publicR2UrlForKey(existing.objectKey),
      };
    }
    const source: AssessmentMediaView | null = await ctx.runQuery(
      internal.assessmentMedia.getInternal,
      { mediaId: args.sourceMediaId },
    );
    assertPrivateMedia(source);
    if (source.status !== "ready") {
      throw new Error("Verified private assessment media was not found.");
    }
    const normalized = normalizeAssessmentMediaInput({
      purpose: source.purpose,
      contentType: source.contentType,
      byteSize: source.byteSize,
      originalName: source.originalName,
      alt: source.alt,
      checksumSha256: source.checksumSha256,
      durationMs: source.durationMs,
    });
    const objectKey = publicAssessmentDerivativeKey({
      versionId: source.assessmentVersionId,
      checksumSha256: source.checksumSha256,
      extension: normalized.extension,
    });
    const privateR2 = getAssessmentR2Config();
    const publicR2 = getPublicR2Config();
    const expectedChecksum = checksumBase64(source.checksumSha256);
    const privateHead = await privateR2.client.send(
      new HeadObjectCommand({
        Bucket: privateR2.bucket,
        Key: source.objectKey,
        ChecksumMode: "ENABLED",
      }),
    );
    if (
      privateHead.ContentType !== source.contentType ||
      privateHead.ContentLength !== source.byteSize ||
      privateHead.ChecksumSHA256 !== expectedChecksum
    ) {
      throw new Error("Verified private media changed after review.");
    }
    let publicExists = false;
    try {
      const publicHead = await publicR2.client.send(
        new HeadObjectCommand({
          Bucket: publicR2.bucket,
          Key: objectKey,
          ChecksumMode: "ENABLED",
        }),
      );
      if (
        publicHead.ContentType !== source.contentType ||
        publicHead.ContentLength !== source.byteSize ||
        publicHead.ChecksumSHA256 !== expectedChecksum ||
        publicHead.CacheControl !== publicCacheControl
      ) {
        throw new Error("Public assessment derivative key is occupied by different bytes.");
      }
      publicExists = true;
    } catch (error) {
      if (!isMissingObjectError(error)) throw error;
    }
    if (!publicExists) {
      const object = await privateR2.client.send(
        new GetObjectCommand({
          Bucket: privateR2.bucket,
          Key: source.objectKey,
          ChecksumMode: "ENABLED",
        }),
      );
      if (object.Body === undefined) {
        throw new Error("Private assessment media body is unavailable.");
      }
      await publicR2.client.send(
        new PutObjectCommand({
          Bucket: publicR2.bucket,
          Key: objectKey,
          Body: object.Body,
          ContentType: source.contentType,
          ContentLength: source.byteSize,
          CacheControl: publicCacheControl,
          ChecksumSHA256: expectedChecksum,
          Metadata: {
            "checksum-sha256": source.checksumSha256,
            ...(source.durationMs === undefined
              ? {}
              : { "duration-ms": String(source.durationMs) }),
          },
        }),
      );
      const publishedHead = await publicR2.client.send(
        new HeadObjectCommand({
          Bucket: publicR2.bucket,
          Key: objectKey,
          ChecksumMode: "ENABLED",
        }),
      );
      if (
        publishedHead.ContentType !== source.contentType ||
        publishedHead.ContentLength !== source.byteSize ||
        publishedHead.ChecksumSHA256 !== expectedChecksum ||
        publishedHead.CacheControl !== publicCacheControl
      ) {
        throw new Error("Public assessment derivative verification failed.");
      }
    }
    const registered: {
      mediaId: Id<"mediaAssets">;
      publicUrl: string;
    } = await ctx.runMutation(
      internal.assessmentMedia.registerDerivativeInternal,
      {
        sourceMediaId: source._id,
        actorId: admin._id,
        objectKey,
      },
    );
    return registered;
  },
});
