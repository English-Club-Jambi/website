export type AssessmentAdminRole = "editor" | "publisher" | "owner";

export type AssessmentAdminCapabilities = {
  canRead: true;
  canEdit: boolean;
  canReview: boolean;
  canPublish: boolean;
};

export function getAssessmentAdminCapabilities(
  role: AssessmentAdminRole,
): AssessmentAdminCapabilities {
  if (role === "owner") {
    return {
      canRead: true,
      canEdit: true,
      canReview: true,
      canPublish: true,
    };
  }
  if (role === "publisher") {
    return {
      canRead: true,
      canEdit: false,
      canReview: true,
      canPublish: true,
    };
  }
  return {
    canRead: true,
    canEdit: true,
    canReview: false,
    canPublish: false,
  };
}
