import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfigStatus: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useAction: () => mocks.getConfigStatus,
}));

import { useAssessmentMediaConfig } from "@/components/admin/assessments/use-assessment-media-config";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assessment R2 configuration gate", () => {
  it("blocks confidential upload without hiding public derivative readiness", async () => {
    mocks.getConfigStatus.mockResolvedValue({
      privateDraftReady: false,
      publicDerivativeReady: true,
      confidentialUploadsBlocked: true,
    });
    const { result } = renderHook(() => useAssessmentMediaConfig());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toEqual({
      privateDraftReady: false,
      publicDerivativeReady: true,
      confidentialUploadsBlocked: true,
    });
    expect(result.current.error).toBeNull();
  });
});
