import { ConvexError } from "convex/values";

export const MAX_ASSESSMENT_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_ASSESSMENT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_ASSESSMENT_AUDIO_DURATION_MS = 15 * 60 * 1_000;

export type AssessmentMediaPurpose =
  | "assessment-audio"
  | "assessment-image";

export type AssessmentMediaContentType =
  | "audio/mpeg"
  | "audio/mp4"
  | "audio/ogg"
  | "audio/webm"
  | "image/avif"
  | "image/jpeg"
  | "image/png"
  | "image/webp";

const extensions: Record<AssessmentMediaContentType, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function cleanLine(value: string, field: string, min: number, max: number) {
  const result = value.trim().replace(/\s+/g, " ");
  if (
    result.length < min ||
    result.length > max ||
    /[\u0000-\u001f\u007f]/.test(result)
  ) {
    throw new ConvexError({ code: "INVALID_ASSESSMENT_MEDIA" as const, field });
  }
  return result;
}

export function normalizeAssessmentMediaInput(args: {
  purpose: AssessmentMediaPurpose;
  contentType: AssessmentMediaContentType;
  byteSize: number;
  originalName: string;
  alt: string;
  checksumSha256: string;
  durationMs?: number;
}) {
  const isAudio = args.purpose === "assessment-audio";
  const contentTypeMatches = isAudio
    ? args.contentType.startsWith("audio/")
    : args.contentType.startsWith("image/");
  const maxBytes = isAudio
    ? MAX_ASSESSMENT_AUDIO_BYTES
    : MAX_ASSESSMENT_IMAGE_BYTES;
  if (
    !contentTypeMatches ||
    !Number.isInteger(args.byteSize) ||
    args.byteSize < 1 ||
    args.byteSize > maxBytes ||
    !/^[a-f0-9]{64}$/.test(args.checksumSha256) ||
    (isAudio &&
      (!Number.isInteger(args.durationMs) ||
        args.durationMs === undefined ||
        args.durationMs < 1 ||
        args.durationMs > MAX_ASSESSMENT_AUDIO_DURATION_MS)) ||
    (!isAudio && args.durationMs !== undefined)
  ) {
    throw new ConvexError({ code: "INVALID_ASSESSMENT_MEDIA" as const });
  }
  return {
    purpose: args.purpose,
    contentType: args.contentType,
    byteSize: args.byteSize,
    originalName: cleanLine(args.originalName, "originalName", 1, 180),
    alt: cleanLine(args.alt, "alt", 3, 500),
    checksumSha256: args.checksumSha256,
    ...(args.durationMs === undefined ? {} : { durationMs: args.durationMs }),
    extension: extensions[args.contentType],
  };
}

function encodedIdSegment(value: string) {
  if (value.length < 3 || value.length > 128) {
    throw new ConvexError({ code: "INVALID_ASSESSMENT_MEDIA_KEY" as const });
  }
  return Array.from(value)
    .map((character) => character.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("");
}

export function privateAssessmentMediaKey(args: {
  definitionId: string;
  versionId: string;
  mediaId: string;
  extension: string;
}) {
  if (!/^[a-z0-9]{2,8}$/.test(args.extension)) {
    throw new ConvexError({ code: "INVALID_ASSESSMENT_MEDIA_KEY" as const });
  }
  return `assessment-drafts/${encodedIdSegment(args.definitionId)}/${encodedIdSegment(args.versionId)}/${encodedIdSegment(args.mediaId)}/source.${args.extension}`;
}

export function publicAssessmentDerivativeKey(args: {
  versionId: string;
  checksumSha256: string;
  extension: string;
}) {
  if (!/^[a-f0-9]{64}$/.test(args.checksumSha256)) {
    throw new ConvexError({ code: "INVALID_ASSESSMENT_MEDIA_KEY" as const });
  }
  if (!/^[a-z0-9]{2,8}$/.test(args.extension)) {
    throw new ConvexError({ code: "INVALID_ASSESSMENT_MEDIA_KEY" as const });
  }
  return `assessments/${encodedIdSegment(args.versionId)}/${args.checksumSha256}.${args.extension}`;
}
