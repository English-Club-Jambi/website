import { describe, expect, it } from "vitest";

import {
  assessmentContentType,
  assessmentPublicMediaQueryArgs,
  assessmentUploadHeaderRecord,
  sha256Hex,
} from "@/components/admin/assessments/assessment-media-client";

describe("assessment media client contract", () => {
  it("computes the lowercase SHA-256 used by the reservation mutation", async () => {
    const file = {
      arrayBuffer: async () => new TextEncoder().encode("English Club").buffer,
    } as File;

    await expect(sha256Hex(file)).resolves.toBe(
      "0b8fdecc9cca6a0ab8a1d61f9531b03a537a2803aa5847a2613a1f26f0d06ffc",
    );
  });

  it("sends exactly the signed R2 checksum and metadata headers", () => {
    expect(
      assessmentUploadHeaderRecord({
        contentType: "audio/mpeg",
        cacheControl: "private, no-store",
        checksumSha256: "base64-checksum",
        metadataChecksumSha256: "hex-checksum",
        metadataDurationMs: "92000",
      }),
    ).toEqual({
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, no-store",
      "x-amz-checksum-sha256": "base64-checksum",
      "x-amz-meta-checksum-sha256": "hex-checksum",
      "x-amz-meta-duration-ms": "92000",
    });
  });

  it("rejects file types outside the backend assessment media allowlist", () => {
    expect(() =>
      assessmentContentType({ type: "image/svg+xml" } as File),
    ).toThrow(/choose an mp3/i);
  });

  it("pins stimulus media reads to one version and public derivatives", () => {
    expect(
      assessmentPublicMediaQueryArgs("version-target", "assessment-audio"),
    ).toEqual({
      assessmentVersionId: "version-target",
      access: "public",
      purpose: "assessment-audio",
      status: "ready",
      paginationOpts: {
        cursor: null,
        numItems: 24,
        maximumRowsRead: 24,
      },
    });
  });
});
