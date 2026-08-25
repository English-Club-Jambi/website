import { JournalWorkspace } from "@/components/admin/journal-workspace";

export default async function AdminJournalEditorPage({
  params,
}: PageProps<"/admin/journal/[postId]">) {
  const { postId } = await params;
  return <JournalWorkspace postId={postId} />;
}
