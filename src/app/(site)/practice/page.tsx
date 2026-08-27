import type { Metadata } from "next";

import { PracticeOverview } from "@/components/practice/practice-overview";
import { getAssessmentCatalog } from "@/lib/assessment";
import { getPublicPageContent } from "@/lib/public-content";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("practice");
  return buildPageMetadata({
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    path: "/practice",
  });
}

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const [catalog, copy] = await Promise.all([
    getAssessmentCatalog(),
    getPublicPageContent("practice"),
  ]);
  return <PracticeOverview catalog={catalog} copy={copy} />;
}
