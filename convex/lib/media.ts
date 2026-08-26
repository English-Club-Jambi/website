import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { MAX_ASSESSMENT_AUDIO_DURATION_MS } from "./assessmentMedia";

type MediaReadCtx = Pick<QueryCtx | MutationCtx, "db">;

export function publicR2UrlForKey(objectKey: string) {
  return `https://r2.mukhtada.my.id/${objectKey
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function publicAssessmentR2UrlForMedia(
  asset: Doc<"mediaAssets"> | null,
  assessmentVersionId: Id<"assessmentVersions">,
  stimulusKind: Doc<"assessmentStimuli">["kind"],
) {
  if (
    asset === null ||
    asset.status !== "ready" ||
    asset.access !== "public" ||
    asset.assessmentVersionId !== assessmentVersionId ||
    !/^assessments\/[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9._-]*)+$/.test(
      asset.objectKey,
    ) ||
    asset.objectKey
      .split("/")
      .some((segment) => segment === "." || segment === "..")
  ) {
    return null;
  }
  if (
    stimulusKind === "audio" &&
    asset.purpose === "assessment-audio" &&
    asset.contentType.startsWith("audio/")
  ) {
    return publicR2UrlForKey(asset.objectKey);
  }
  if (
    stimulusKind === "image" &&
    asset.purpose === "assessment-image" &&
    asset.contentType.startsWith("image/")
  ) {
    return publicR2UrlForKey(asset.objectKey);
  }
  return null;
}

function toReadyMediaProjection(asset: Doc<"mediaAssets"> | null) {
  if (
    asset === null ||
    asset.width === undefined ||
    !Number.isInteger(asset.width) ||
    asset.width < 1 ||
    asset.height === undefined ||
    !Number.isInteger(asset.height) ||
    asset.height < 1
  ) {
    return null;
  }
  return {
    mediaId: asset._id,
    publicUrl: publicR2UrlForKey(asset.objectKey),
    alt: asset.alt,
    width: asset.width,
    height: asset.height,
  };
}

export async function projectReadyJournalCover(
  ctx: QueryCtx,
  mediaId: Id<"mediaAssets"> | undefined,
) {
  if (mediaId === undefined) {
    return null;
  }
  const asset = await ctx.db.get("mediaAssets", mediaId);
  if (
    asset === null ||
    asset.status !== "ready" ||
    (asset.purpose !== "journal-cover" && asset.purpose !== "page-image")
  ) {
    return null;
  }
  return toReadyMediaProjection(asset);
}

export async function projectReadyJournalMedia(
  ctx: QueryCtx,
  mediaIdValues: string[],
) {
  if (mediaIdValues.length > 40) {
    throw new Error("Journal media projection exceeds its read bound.");
  }
  const media = await Promise.all(
    mediaIdValues.map(async (mediaIdValue) => {
      const mediaId = ctx.db.normalizeId("mediaAssets", mediaIdValue);
      if (mediaId === null) {
        return null;
      }
      const asset = await ctx.db.get("mediaAssets", mediaId);
      if (
        asset === null ||
        asset.status !== "ready" ||
        (asset.purpose !== "journal-inline" &&
          asset.purpose !== "page-image")
      ) {
        return null;
      }
      return toReadyMediaProjection(asset);
    }),
  );
  return media.flatMap((asset) => (asset === null ? [] : [asset]));
}

export async function projectReadyQuestionIllustration(
  ctx: MediaReadCtx,
  mediaId: Id<"mediaAssets"> | undefined,
) {
  if (mediaId === undefined) return null;
  const asset = await ctx.db.get("mediaAssets", mediaId);
  if (
    asset === null ||
    asset.status !== "ready" ||
    (asset.access ?? "public") !== "public" ||
    asset.purpose !== "assessment-image" ||
    !asset.contentType.startsWith("image/")
  ) {
    return null;
  }
  return toReadyMediaProjection(asset);
}

function publicMediaObjectKeyIsSafe(objectKey: string) {
  const segments = objectKey.split("/");
  return (
    objectKey.length >= 3 &&
    objectKey.length <= 1_024 &&
    segments.length >= 2 &&
    segments.every(
      (segment) =>
        segment.length > 0 &&
        segment !== "." &&
        segment !== ".." &&
        !/[\u0000-\u001f\u007f]/.test(segment),
    )
  );
}

export async function projectReadyQuestionAudio(
  ctx: MediaReadCtx,
  mediaId: Id<"mediaAssets"> | undefined,
  expectedAssessmentVersionId?: Id<"assessmentVersions">,
) {
  if (mediaId === undefined) return null;
  const asset = await ctx.db.get("mediaAssets", mediaId);
  if (
    asset === null ||
    asset.status !== "ready" ||
    (asset.access ?? "public") !== "public" ||
    asset.purpose !== "assessment-audio" ||
    !asset.contentType.startsWith("audio/") ||
    asset.durationMs === undefined ||
    !Number.isInteger(asset.durationMs) ||
    asset.durationMs < 1 ||
    asset.durationMs > MAX_ASSESSMENT_AUDIO_DURATION_MS ||
    (expectedAssessmentVersionId !== undefined &&
      asset.assessmentVersionId !== expectedAssessmentVersionId) ||
    !publicMediaObjectKeyIsSafe(asset.objectKey)
  ) {
    return null;
  }
  return {
    mediaId: asset._id,
    publicUrl: publicR2UrlForKey(asset.objectKey),
    contentType: asset.contentType,
    durationMs: asset.durationMs,
    description: asset.alt,
  };
}
