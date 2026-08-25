import { AssessmentSectionManager } from "@/components/admin/assessments/assessment-section-manager";

export default async function AdminAssessmentSectionPage({
  params,
}: {
  params: Promise<{ assessmentId: string; sectionId: string }>;
}) {
  const { assessmentId, sectionId } = await params;
  return (
    <AssessmentSectionManager
      definitionId={assessmentId}
      sectionId={sectionId}
    />
  );
}
