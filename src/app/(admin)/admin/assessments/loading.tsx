import { AdminLoadingRows, AdminPageHeading, AdminSection } from "@/components/admin/admin-ui";

export default function AdminAssessmentsLoading() {
  return (
    <>
      <AdminPageHeading
        title="Assessment Lab"
        description="Loading the private authoring workspace."
      />
      <AdminSection title="Assessment definitions">
        <AdminLoadingRows label="Loading assessment workspace" />
      </AdminSection>
    </>
  );
}
