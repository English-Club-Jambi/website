import type { Metadata } from "next";

import { ResultView } from "@/components/practice/result-view";
import { getPublicPageContent } from "@/lib/public-content";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("practice");
  return {
    title: copy.resultTitle,
    description: copy.limit,
    robots: { index: false, follow: false },
  };
}

export default async function PracticeResultPage({
  params,
}: PageProps<"/practice/result/[attemptId]">) {
  const { attemptId } = await params;
  return <ResultView attemptId={attemptId} />;
}
