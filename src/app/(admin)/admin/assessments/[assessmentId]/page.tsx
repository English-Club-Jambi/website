import { AssessmentWorkspaceManager } from "@/components/admin/assessments/assessment-workspace-manager";

export default async function AdminAssessmentWorkspacePage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  return <AssessmentWorkspaceManager definitionId={assessmentId} />;
}
