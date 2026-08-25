"use client";

import { useAction } from "convex/react";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

export type AdminMediaPurpose =
  | "journal-cover"
  | "journal-inline"
  | "member-photo"
  | "page-image"
  | "brand";

export type UploadedAdminMedia = {
  mediaId: Id<"mediaAssets">;
  objectKey: string;
  publicUrl: string;
  width: number;
  height: number;
};

const allowedContentTypes = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
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

export function useAdminMediaUpload() {
  const createUploadUrl = useAction(api.r2.createAdminUploadUrl);
  const verifyUpload = useAction(api.r2.verifyAdminUpload);

  return async function uploadAdminMedia({
    file,
    alt,
    purpose,
  }: {
    file: File;
    alt: string;
    purpose: AdminMediaPurpose;
  }): Promise<UploadedAdminMedia> {
    if (!allowedContentTypes.has(file.type)) {
      throw new Error("Use an AVIF, JPEG, PNG, or WebP image.");
    }
    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      throw new Error("Images must be no larger than 10 MB.");
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

    const dimensions = await readImageDimensions(file);
    const upload = await createUploadUrl({
      purpose,
      contentType: file.type as "image/avif" | "image/jpeg" | "image/png" | "image/webp",
      byteSize: file.size,
      originalName: file.name,
      alt: cleanAlt,
    });

    const response = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": upload.requiredHeaders.contentType,
        "Cache-Control": upload.requiredHeaders.cacheControl,
      },
      body: file,
    });
    if (!response.ok) {
      throw new Error(`R2 rejected the upload with status ${response.status}.`);
    }

    const verified = await verifyUpload({
      mediaId: upload.mediaId,
      width: dimensions.width,
      height: dimensions.height,
    });

    return {
      mediaId: upload.mediaId,
      objectKey: upload.objectKey,
      publicUrl: verified.publicUrl,
      ...dimensions,
    };
  };
}
