import { describe, expect, it } from "vitest";

import { getAssessmentAdminCapabilities } from "@/components/admin/assessments/assessment-admin-permissions";

describe("assessment admin permissions", () => {
  it("keeps authoring and approval duties separate for editor and publisher roles", () => {
    expect(getAssessmentAdminCapabilities("editor")).toEqual({
      canRead: true,
      canEdit: true,
      canReview: false,
      canPublish: false,
    });
    expect(getAssessmentAdminCapabilities("publisher")).toEqual({
      canRead: true,
      canEdit: false,
      canReview: true,
      canPublish: true,
    });
    expect(getAssessmentAdminCapabilities("owner")).toEqual({
      canRead: true,
      canEdit: true,
      canReview: true,
      canPublish: true,
    });
  });
});
