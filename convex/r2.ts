"use node";

import {
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  env,
  internalAction,
  type ActionCtx,
} from "./_generated/server";
import { adminHasPermission } from "./lib/adminAuth";
import { MAX_ASSESSMENT_AUDIO_DURATION_MS } from "./lib/assessmentMedia";
import {
  mediaContentTypeValidator,
  mediaPurposeValidator,
} from "./validators";

const objectKeyPattern =
  /^(?:brand|images|members|uploads)\/(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_-]*\.(?:avif|jpe?g|png|svg|webp|mp3|m4a|ogg|webm)$/;
const accountIdPattern = /^[a-f0-9]{32}$/;
const bucketNamePattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

const allowedContentTypes = {
  "image/avif": ".avif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/ogg": ".ogg",
  "audio/webm": ".webm",
} as const;

const adminUploadExtensions = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
} as const;

function getR2Config() {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = env.R2_BUCKET_NAME?.trim();
  const endpoint =
    env.R2_API?.trim() ||
    (accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : undefined);

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !endpoint ||
    !accountIdPattern.test(accountId) ||
    !bucketNamePattern.test(bucket)
  ) {
    throw new Error("R2 configuration is incomplete.");
  }

  const endpointUrl = new URL(endpoint);
  if (
    endpointUrl.protocol !== "https:" ||
    endpointUrl.hostname !== `${accountId}.r2.cloudflarestorage.com`
  ) {
    throw new Error("R2_API must use the Cloudflare R2 S3 endpoint.");
  }

  return {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint: endpointUrl.origin,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
  };
}

function validateObjectInput({
  objectKey,
  contentType,
  byteSize,
}: {
  objectKey: string;
  contentType: string;
  byteSize: number;
}) {
  const expectedExtension =
    allowedContentTypes[contentType as keyof typeof allowedContentTypes];

  if (
    !objectKeyPattern.test(objectKey) ||
    expectedExtension === undefined ||
    !objectKey.endsWith(expectedExtension) ||
    !Number.isInteger(byteSize) ||
    byteSize < 1 ||
    byteSize >
      (contentType.startsWith("audio/") ? 25 * 1024 * 1024 : 10 * 1024 * 1024)
  ) {
    throw new Error("R2 object input is invalid.");
  }
}

function cleanUploadText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function validateAdminUploadInput(args: {
  originalName: string;
  alt: string;
  contentType: keyof typeof adminUploadExtensions;
  byteSize: number;
  purpose: string;
  durationMs?: number;
}) {
  const originalName = cleanUploadText(args.originalName);
  const alt = cleanUploadText(args.alt);
  if (
    originalName.length < 1 ||
    originalName.length > 180 ||
    /[\u0000-\u001f\u007f]/.test(originalName) ||
    alt.length < 3 ||
    alt.length > 240 ||
    !Number.isInteger(args.byteSize) ||
    args.byteSize < 1 ||
    args.byteSize >
      (args.contentType.startsWith("audio/")
        ? 25 * 1024 * 1024
        : 10 * 1024 * 1024)
  ) {
    throw new Error("Media upload input is invalid.");
  }
  const isAudio = args.contentType.startsWith("audio/");
  if (
    (isAudio && args.purpose !== "assessment-audio") ||
    (!isAudio && args.purpose === "assessment-audio") ||
    (isAudio &&
      (args.durationMs === undefined ||
        !Number.isInteger(args.durationMs) ||
        args.durationMs < 1 ||
        args.durationMs > MAX_ASSESSMENT_AUDIO_DURATION_MS)) ||
    (!isAudio && args.durationMs !== undefined)
  ) {
    throw new Error("Media upload purpose does not match its file type.");
  }
  return { originalName, alt, durationMs: args.durationMs };
}

async function requireAdminUpload(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Authentication is required.");
  }
  const admin = await ctx.runQuery(internal.adminUsers.getActiveForIdentity, {
    tokenIdentifier: identity.tokenIdentifier,
    subject: identity.subject,
    issuer: identity.issuer,
  });
  if (admin === null || !adminHasPermission(admin, "media:upload")) {
    throw new Error("Admin media permission is required.");
  }
  return admin;
}

function isMissingObjectError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

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

export const checkConnection = internalAction({
  args: {},
  returns: v.object({ ok: v.literal(true) }),
  handler: async () => {
    const { bucket, client } = getR2Config();
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true } as const;
  },
});

export const createReviewedImageUploadUrl = internalAction({
  args: {
    objectKey: v.string(),
    contentType: v.string(),
    byteSize: v.number(),
  },
  returns: v.object({
    objectKey: v.string(),
    uploadUrl: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (_ctx, args) => {
    validateObjectInput(args);
    const { bucket, client } = getR2Config();
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: args.objectKey }),
      );
      throw new Error(
        "R2 object key already exists. Use a new versioned object key.",
      );
    } catch (error) {
      if (!isMissingObjectError(error)) {
        throw error;
      }
    }

    const expiresIn = 300;
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: args.objectKey,
        ContentType: args.contentType,
        ContentLength: args.byteSize,
        CacheControl: "public, max-age=31536000, immutable",
      }),
      {
        expiresIn,
        signableHeaders: new Set([
          "cache-control",
          "content-length",
          "content-type",
        ]),
      },
    );

    return {
      objectKey: args.objectKey,
      uploadUrl,
      expiresAt: Date.now() + expiresIn * 1_000,
    };
  },
});

export const verifyReviewedImage = internalAction({
  args: {
    objectKey: v.string(),
    contentType: v.string(),
    byteSize: v.number(),
  },
  returns: v.object({
    ok: v.literal(true),
    objectKey: v.string(),
    contentType: v.string(),
    byteSize: v.number(),
  }),
  handler: async (_ctx, args) => {
    validateObjectInput(args);
    const { bucket, client } = getR2Config();
    const object = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: args.objectKey }),
    );

    if (
      object.ContentType !== args.contentType ||
      object.ContentLength !== args.byteSize
    ) {
      throw new Error("R2 object metadata does not match the reviewed upload.");
    }

    return {
      ok: true,
      objectKey: args.objectKey,
      contentType: args.contentType,
      byteSize: args.byteSize,
    } as const;
  },
});

export const createAdminUploadUrl = action({
  args: {
    purpose: mediaPurposeValidator,
    contentType: mediaContentTypeValidator,
    byteSize: v.number(),
    originalName: v.string(),
    alt: v.string(),
    durationMs: v.optional(v.number()),
  },
  returns: v.object({
    mediaId: v.id("mediaAssets"),
    objectKey: v.string(),
    uploadUrl: v.string(),
    expiresAt: v.number(),
    requiredHeaders: v.object({
      contentType: v.string(),
      cacheControl: v.string(),
    }),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdminUpload(ctx);
    const contentType = args.contentType as keyof typeof adminUploadExtensions;
    const { originalName, alt, durationMs } = validateAdminUploadInput({
      ...args,
      contentType,
    });
    const extension = adminUploadExtensions[contentType];
    if (
      args.purpose === "member-photo" &&
      contentType !== "image/avif" &&
      contentType !== "image/webp"
    ) {
      throw new Error("Member portraits must be AVIF or WebP.");
    }
    const objectKey =
      args.purpose === "member-photo"
        ? `members/profiles/${randomUUID()}.${extension}`
        : `uploads/${args.purpose}/${randomUUID()}.${extension}`;
    const cacheControl = "public, max-age=31536000, immutable";
    validateObjectInput({
      objectKey,
      contentType,
      byteSize: args.byteSize,
    });
    const { bucket, client } = getR2Config();
    const expiresIn = 300;
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType,
        ContentLength: args.byteSize,
        CacheControl: cacheControl,
      }),
      {
        expiresIn,
        signableHeaders: new Set([
          "cache-control",
          "content-length",
          "content-type",
        ]),
      },
    );
    const mediaId: Id<"mediaAssets"> = await ctx.runMutation(
      internal.adminMedia.createPending,
      {
        objectKey,
        purpose: args.purpose,
        contentType,
        byteSize: args.byteSize,
        originalName,
        alt,
        ...(durationMs === undefined ? {} : { durationMs }),
        uploadedBy: admin._id,
      },
    );
    return {
      mediaId,
      objectKey,
      uploadUrl,
      expiresAt: Date.now() + expiresIn * 1_000,
      requiredHeaders: { contentType, cacheControl },
    };
  },
});

export const verifyAdminUpload = action({
  args: {
    mediaId: v.id("mediaAssets"),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  },
  returns: v.object({
    ok: v.literal(true),
    publicUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdminUpload(ctx);
    const media = await ctx.runQuery(internal.adminMedia.getInternal, {
      mediaId: args.mediaId,
    });
    if (media === null || media.status !== "pending") {
      throw new Error("Pending media upload was not found.");
    }
    const { bucket, client } = getR2Config();
    const object = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: media.objectKey }),
    );
    if (
      object.ContentType !== media.contentType ||
      object.ContentLength !== media.byteSize ||
      object.CacheControl !== "public, max-age=31536000, immutable"
    ) {
      throw new Error("R2 object metadata does not match the pending upload.");
    }
    const publicUrl: string = await ctx.runMutation(
      internal.adminMedia.markReady,
      {
        mediaId: media._id,
        ...(args.width === undefined ? {} : { width: args.width }),
        ...(args.height === undefined ? {} : { height: args.height }),
        ...(args.durationMs === undefined ? {} : { durationMs: args.durationMs }),
        actorId: admin._id,
      },
    );
    return { ok: true, publicUrl } as const;
  },
});
