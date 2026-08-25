export type AssessmentMediaPurpose = "assessment-audio" | "assessment-image";
export type AssessmentMediaContentType =
  | "audio/mpeg"
  | "audio/mp4"
  | "audio/ogg"
  | "audio/webm"
  | "image/avif"
  | "image/jpeg"
  | "image/png"
  | "image/webp";

export type AssessmentFileInspection = {
  purpose: AssessmentMediaPurpose;
  width?: number;
  height?: number;
  durationMs?: number;
};

export type AssessmentUploadHeaders = {
  contentType: string;
  cacheControl: string;
  checksumSha256: string;
  metadataChecksumSha256: string;
  metadataDurationMs: string | null;
};

export type AssessmentUploadStep =
  | "inspecting"
  | "reserving"
  | "uploading"
  | "verifying";

type AssessmentUploadReservation<VersionId extends string> = {
  assessmentVersionId: VersionId;
  purpose: AssessmentMediaPurpose;
  contentType: AssessmentMediaContentType;
  byteSize: number;
  originalName: string;
  alt: string;
  checksumSha256: string;
  durationMs?: number;
};

type AssessmentSignedUpload<MediaId extends string> = {
  uploadUrl: string;
  requiredHeaders: AssessmentUploadHeaders;
  mediaId?: MediaId;
};

const allowedTypes = new Set<AssessmentMediaContentType>([
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function assessmentContentType(file: File): AssessmentMediaContentType {
  if (!allowedTypes.has(file.type as AssessmentMediaContentType)) {
    throw new Error("Choose an MP3, M4A, OGG, WebM, AVIF, JPEG, PNG, or WebP file.");
  }
  return file.type as AssessmentMediaContentType;
}

export async function sha256Hex(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function inspectAudio(file: File): Promise<AssessmentFileInspection> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    const clean = () => {
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const durationMs = Math.round(audio.duration * 1000);
      clean();
      if (!Number.isInteger(durationMs) || durationMs < 1) {
        reject(new Error("The audio duration could not be read."));
        return;
      }
      resolve({ purpose: "assessment-audio", durationMs });
    };
    audio.onerror = () => {
      clean();
      reject(new Error("The audio metadata could not be read."));
    };
    audio.src = url;
  });
}

async function inspectImage(file: File): Promise<AssessmentFileInspection> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const result = {
      purpose: "assessment-image" as const,
      width: bitmap.width,
      height: bitmap.height,
    };
    bitmap.close();
    return result;
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const result = {
        purpose: "assessment-image" as const,
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      URL.revokeObjectURL(url);
      resolve(result);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The image dimensions could not be read."));
    };
    image.src = url;
  });
}

export async function inspectAssessmentFile(file: File) {
  const contentType = assessmentContentType(file);
  return contentType.startsWith("audio/")
    ? await inspectAudio(file)
    : await inspectImage(file);
}

export function assessmentUploadHeaderRecord(
  headers: AssessmentUploadHeaders,
): Record<string, string> {
  return {
    "Content-Type": headers.contentType,
    "Cache-Control": headers.cacheControl,
    "x-amz-checksum-sha256": headers.checksumSha256,
    "x-amz-meta-checksum-sha256": headers.metadataChecksumSha256,
    ...(headers.metadataDurationMs === null
      ? {}
      : { "x-amz-meta-duration-ms": headers.metadataDurationMs }),
  };
}

export async function putAssessmentMediaFile(args: {
  uploadUrl: string;
  file: File;
  requiredHeaders: AssessmentUploadHeaders;
}) {
  const response = await fetch(args.uploadUrl, {
    method: "PUT",
    headers: assessmentUploadHeaderRecord(args.requiredHeaders),
    body: args.file,
  });
  if (!response.ok) {
    throw new Error(`R2 rejected the private upload with status ${response.status}.`);
  }
}

/**
 * Executes the private-source upload contract in its required order. Keeping the
 * orchestration independent from React makes retries and contract tests deterministic.
 */
export async function executeAssessmentMediaUpload<
  VersionId extends string,
  MediaId extends string,
>(args: {
  versionId: VersionId;
  file: File;
  alt: string;
  reserveUpload: (
    input: AssessmentUploadReservation<VersionId>,
  ) => Promise<{ mediaId: MediaId }>;
  createUploadUrl: (input: { mediaId: MediaId }) => Promise<AssessmentSignedUpload<MediaId>>;
  verifyUpload: (input: {
    mediaId: MediaId;
    width?: number;
    height?: number;
  }) => Promise<unknown>;
  onStep?: (step: AssessmentUploadStep) => void;
  inspectFile?: (file: File) => Promise<AssessmentFileInspection>;
  checksumFile?: (file: File) => Promise<string>;
  uploadFile?: typeof putAssessmentMediaFile;
}) {
  args.onStep?.("inspecting");
  const contentType = assessmentContentType(args.file);
  const [inspection, checksumSha256] = await Promise.all([
    (args.inspectFile ?? inspectAssessmentFile)(args.file),
    (args.checksumFile ?? sha256Hex)(args.file),
  ]);
  args.onStep?.("reserving");
  const reservation = await args.reserveUpload({
    assessmentVersionId: args.versionId,
    purpose: inspection.purpose,
    contentType,
    byteSize: args.file.size,
    originalName: args.file.name,
    alt: args.alt.trim(),
    checksumSha256,
    ...(inspection.durationMs === undefined
      ? {}
      : { durationMs: inspection.durationMs }),
  });
  const signed = await args.createUploadUrl({ mediaId: reservation.mediaId });
  args.onStep?.("uploading");
  await (args.uploadFile ?? putAssessmentMediaFile)({
    uploadUrl: signed.uploadUrl,
    file: args.file,
    requiredHeaders: signed.requiredHeaders,
  });
  args.onStep?.("verifying");
  await args.verifyUpload({
    mediaId: reservation.mediaId,
    ...(inspection.width === undefined ? {} : { width: inspection.width }),
    ...(inspection.height === undefined ? {} : { height: inspection.height }),
  });
  return reservation.mediaId;
}

export function assessmentPublicMediaQueryArgs<VersionId extends string>(
  assessmentVersionId: VersionId,
  purpose: AssessmentMediaPurpose,
) {
  return {
    assessmentVersionId,
    access: "public" as const,
    purpose,
    status: "ready" as const,
    paginationOpts: {
      cursor: null,
      numItems: 24,
      maximumRowsRead: 24,
    },
  };
}
