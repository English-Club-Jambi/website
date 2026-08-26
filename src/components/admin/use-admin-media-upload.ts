"use client";

import { useAction } from "convex/react";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { relayAdminMediaUpload } from "./admin-media-upload-relay";

export type AdminMediaPurpose =
  | "journal-cover"
  | "journal-inline"
  | "member-photo"
  | "page-image"
  | "brand"
  | "assessment-image"
  | "assessment-audio";

type AdminImagePurpose = Exclude<AdminMediaPurpose, "assessment-audio">;

type UploadedAdminMediaBase = {
  mediaId: Id<"mediaAssets">;
  objectKey: string;
  publicUrl: string;
};

export type UploadedAdminImage = UploadedAdminMediaBase & {
  width: number;
  height: number;
};

export type UploadedAdminAudio = UploadedAdminMediaBase & {
  durationMs: number;
};

export type UploadedAdminMedia = UploadedAdminImage | UploadedAdminAudio;

const allowedImageTypes = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const allowedAudioTypes = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
]);

async function readImageDimensions(file: File) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("The selected image could not be read."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function readAudioDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    const clean = () => {
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(objectUrl);
    };
    audio.preload = "metadata";
    audio.addEventListener(
      "loadedmetadata",
      () => {
        const durationMs = Math.round(audio.duration * 1_000);
        clean();
        if (
          !Number.isInteger(durationMs) ||
          durationMs < 1 ||
          durationMs > 15 * 60 * 1_000
        ) {
          reject(new Error("Audio must be no longer than 15 minutes."));
          return;
        }
        resolve(durationMs);
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        clean();
        reject(new Error("The selected audio file could not be read."));
      },
      { once: true },
    );
    audio.src = objectUrl;
  });
}

type UploadAdminMedia = {
  (args: {
    file: File;
    alt: string;
    purpose: AdminImagePurpose;
  }): Promise<UploadedAdminImage>;
  (args: {
    file: File;
    alt: string;
    purpose: "assessment-audio";
  }): Promise<UploadedAdminAudio>;
  (args: {
    file: File;
    alt: string;
    purpose: AdminMediaPurpose;
  }): Promise<UploadedAdminMedia>;
};

export function useAdminMediaUpload() {
  const createUploadUrl = useAction(api.r2.createAdminUploadUrl);
  const verifyUpload = useAction(api.r2.verifyAdminUpload);

  const uploadAdminMedia = async function uploadAdminMedia({
    file,
    alt,
    purpose,
  }: {
    file: File;
    alt: string;
    purpose: AdminMediaPurpose;
  }): Promise<UploadedAdminMedia> {
    const audio = purpose === "assessment-audio";
    const allowed = audio
      ? allowedAudioTypes.has(file.type)
      : allowedImageTypes.has(file.type);
    if (!allowed) {
      throw new Error(
        audio
          ? "Use an MP3, M4A, OGG, or WebM audio file."
          : "Use an AVIF, JPEG, PNG, or WebP image.",
      );
    }
    const maximumBytes = audio ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size < 1 || file.size > maximumBytes) {
      throw new Error(
        audio
          ? "Audio must be no larger than 25 MB."
          : "Images must be no larger than 10 MB.",
      );
    }
    const cleanAlt = alt.trim().replace(/\s+/g, " ");
    if (cleanAlt.length < 3 || cleanAlt.length > 240) {
      throw new Error("Alternative text must contain 3-240 characters.");
    }
    if (
      purpose === "member-photo" &&
      file.type !== "image/avif" &&
      file.type !== "image/webp"
    ) {
      throw new Error("Member portraits must be AVIF or WebP.");
    }

    const durationMs = audio ? await readAudioDuration(file) : undefined;
    const dimensions = audio ? undefined : await readImageDimensions(file);
    const upload = await createUploadUrl({
      purpose,
      contentType: file.type as
        | "image/avif"
        | "image/jpeg"
        | "image/png"
        | "image/webp"
        | "audio/mpeg"
        | "audio/mp4"
        | "audio/ogg"
        | "audio/webm",
      byteSize: file.size,
      originalName: file.name,
      alt: cleanAlt,
      ...(durationMs === undefined ? {} : { durationMs }),
    });

    await relayAdminMediaUpload({
      uploadUrl: upload.uploadUrl,
      file,
      requiredHeaders: upload.requiredHeaders,
    });

    const verified = await verifyUpload({
      mediaId: upload.mediaId,
      ...(durationMs === undefined
        ? { width: dimensions!.width, height: dimensions!.height }
        : { durationMs }),
    });

    return {
      mediaId: upload.mediaId,
      objectKey: upload.objectKey,
      publicUrl: verified.publicUrl,
      ...(durationMs === undefined
        ? { width: dimensions!.width, height: dimensions!.height }
        : { durationMs }),
    };
  };

  return uploadAdminMedia as UploadAdminMedia;
}
