import type { Metadata } from "next";

import { AttemptRunner } from "@/components/practice/attempt-runner";
import { getPublicPageContent } from "@/lib/public-content";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("practice");
  return {
    title: copy.title,
    description: copy.limit,
    robots: { index: false, follow: false },
  };
}

export default async function PracticeAttemptPage({
  params,
}: PageProps<"/practice/attempt/[attemptId]">) {
  const { attemptId } = await params;
  return <AttemptRunner attemptId={attemptId} />;
}
