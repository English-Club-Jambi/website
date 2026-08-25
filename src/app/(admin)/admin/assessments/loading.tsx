import { AdminLoadingRows, AdminPageHeading, AdminSection } from "@/components/admin/admin-ui";

export default function AdminAssessmentsLoading() {
  return (
    <>
      <AdminPageHeading
        title="Practice Builder"
        description="Loading formats and question-selection rules."
      />
      <AdminSection title="Practice formats">
        <AdminLoadingRows label="Loading practice formats" />
      </AdminSection>
    </>
  );
}
