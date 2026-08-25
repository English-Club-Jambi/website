import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
  reserve: vi.fn(),
  createUploadUrl: vi.fn(),
  verifyUpload: vi.fn(),
  inspect: vi.fn(),
  checksum: vi.fn(),
  put: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useAction: mocks.useAction,
  useMutation: mocks.useMutation,
}));

import { AssessmentMediaUpload } from "@/components/admin/assessments/assessment-media-upload";
import { executeAssessmentMediaUpload } from "@/components/admin/assessments/assessment-media-client";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useMutation.mockReturnValue(mocks.reserve);
  mocks.useAction
    .mockReturnValueOnce(mocks.createUploadUrl)
    .mockReturnValueOnce(mocks.verifyUpload);
  mocks.inspect.mockResolvedValue({
    purpose: "assessment-image",
    width: 1200,
    height: 800,
  });
  mocks.checksum.mockResolvedValue("a".repeat(64));
  mocks.reserve.mockResolvedValue({ mediaId: "media-private", objectKey: "private-key" });
  mocks.createUploadUrl.mockResolvedValue({
    uploadUrl: "https://r2-upload.invalid/signed",
    expiresAt: Date.now() + 300_000,
    requiredHeaders: {
      contentType: "image/png",
      cacheControl: "private, no-store",
      checksumSha256: "base64-checksum",
      metadataChecksumSha256: "a".repeat(64),
      metadataDurationMs: null,
    },
  });
  mocks.put.mockResolvedValue(undefined);
  mocks.verifyUpload.mockResolvedValue({ ok: true });
});

describe("AssessmentMediaUpload", () => {
  it("runs reservation, signed upload, and dimension verification in order", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "reading-chart.png", {
      type: "image/png",
    });
    const steps: string[] = [];
    const mediaId = await executeAssessmentMediaUpload({
      versionId: "version-draft",
      file,
      alt: "A labelled reading chart",
      reserveUpload: mocks.reserve,
      createUploadUrl: mocks.createUploadUrl,
      verifyUpload: mocks.verifyUpload,
      inspectFile: mocks.inspect,
      checksumFile: mocks.checksum,
      uploadFile: mocks.put,
      onStep: (step) => steps.push(step),
    });
    expect(mediaId).toBe("media-private");
    expect(steps).toEqual(["inspecting", "reserving", "uploading", "verifying"]);
    expect(mocks.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentVersionId: "version-draft",
        purpose: "assessment-image",
        contentType: "image/png",
        checksumSha256: "a".repeat(64),
      }),
    );
    expect(mocks.put).toHaveBeenCalledWith(
      expect.objectContaining({ uploadUrl: "https://r2-upload.invalid/signed", file }),
    );
    expect(mocks.verifyUpload).toHaveBeenCalledWith({
      mediaId: "media-private",
      width: 1200,
      height: 800,
    });
  });

  it("stops before signing when reservation fails", async () => {
    mocks.reserve.mockRejectedValue(new Error("Private assessment media limit reached."));
    const file = new File([new Uint8Array([1])], "reading-chart.png", {
      type: "image/png",
    });
    await expect(
      executeAssessmentMediaUpload({
        versionId: "version-draft",
        file,
        alt: "A labelled reading chart",
        reserveUpload: mocks.reserve,
        createUploadUrl: mocks.createUploadUrl,
        verifyUpload: mocks.verifyUpload,
        inspectFile: mocks.inspect,
        checksumFile: mocks.checksum,
        uploadFile: mocks.put,
      }),
    ).rejects.toThrow("Private assessment media limit reached.");
    expect(mocks.createUploadUrl).not.toHaveBeenCalled();
  });

  it("renders explicit accessible labels and a live status", () => {
    render(<AssessmentMediaUpload versionId="version-draft" />);
    expect(screen.getByLabelText("Private source file")).toHaveAttribute(
      "accept",
      expect.stringContaining("audio/mpeg"),
    );
    expect(screen.getByLabelText("Accessible description")).toBeRequired();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Choose an assessment audio or image source.",
    );
  });
});
