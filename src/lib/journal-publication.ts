export function isCurrentJournalRevisionPublished({
  currentRevision,
  publishedRevision,
  confirmedPublishedRevision,
}: {
  currentRevision: number;
  publishedRevision?: number;
  confirmedPublishedRevision?: number | null;
}) {
  if (currentRevision < 1) return false;

  return (
    currentRevision ===
    Math.max(publishedRevision ?? 0, confirmedPublishedRevision ?? 0)
  );
}
