import type { Metadata } from "next";

import {
  PracticeBriefing,
  PracticeUnavailable,
} from "@/components/practice/practice-briefing";
import { getFullPracticeAssessment } from "@/lib/assessment";
import { getPublicPageContent } from "@/lib/public-content";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("practice");
  return {
    title: copy.fullTitle,
    description: copy.fullSummary,
    alternates: { canonical: "/practice/full" },
  };
}

export const dynamic = "force-dynamic";

export default async function FullPracticePage() {
  const [result, copy] = await Promise.all([
    getFullPracticeAssessment(),
    getPublicPageContent("practice"),
  ]);

  if (result.data === null) {
    return (
      <PracticeUnavailable
        title={copy.fullTitle}
        message={copy.noFull}
        connectionUnavailable={result.state === "unavailable"}
        copy={copy}
      />
    );
  }

  return <PracticeBriefing assessment={result.data} copy={copy} />;
}
