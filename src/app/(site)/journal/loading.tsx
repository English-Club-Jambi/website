import { PageContainer } from "@/components/ui";

export default function JournalLoading() {
  return (
    <div className="route-loading" aria-live="polite" aria-busy="true">
      <PageContainer>
        <p>Opening the journal…</p>
        <div className="loading-line loading-line-wide" />
        <div className="loading-line" />
      </PageContainer>
    </div>
  );
}
