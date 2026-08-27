import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  PracticeBriefing,
  PracticeUnavailable,
} from "@/components/practice/practice-briefing";
import { getPracticeSkill, type PracticeSkill } from "@/content/assessment";
import { getQuickPracticeAssessment } from "@/lib/assessment";
import { getPublicPageContent } from "@/lib/public-content";
import { buildPageMetadata } from "@/lib/seo";

function getSkillCopy(
  skill: PracticeSkill,
  copy: Awaited<ReturnType<typeof getPublicPageContent<"practice">>>,
) {
  return {
    listening: {
      title: copy.quickListeningTitle,
      summary: copy.quickListeningSummary,
    },
    structure: {
      title: copy.quickStructureTitle,
      summary: copy.quickStructureSummary,
    },
    reading: {
      title: copy.quickReadingTitle,
      summary: copy.quickReadingSummary,
    },
  }[skill];
}

type QuickPracticeProps = {
  params: Promise<{ skill: string }>;
};

export async function generateMetadata({
  params,
}: QuickPracticeProps): Promise<Metadata> {
  const { skill: value } = await params;
  const skill = getPracticeSkill(value);
  const copy = await getPublicPageContent("practice");

  if (skill === undefined) {
    return {
      title: copy.metadataTitle,
      robots: { index: false, follow: false },
    };
  }

  const skillCopy = getSkillCopy(skill.key, copy);
  return buildPageMetadata({
    title: skillCopy.title,
    description: skillCopy.summary,
    path: skill.href,
  });
}

export const dynamic = "force-dynamic";

export default async function QuickPracticePage({ params }: QuickPracticeProps) {
  const { skill: value } = await params;
  const skill = getPracticeSkill(value);

  if (skill === undefined) {
    notFound();
  }

  const [result, copy] = await Promise.all([
    getQuickPracticeAssessment(skill.key),
    getPublicPageContent("practice"),
  ]);
  const skillCopy = getSkillCopy(skill.key, copy);

  if (result.data === null) {
    return (
      <PracticeUnavailable
        title={skillCopy.title}
        message={copy.noQuick}
        connectionUnavailable={result.state === "unavailable"}
        copy={copy}
      />
    );
  }

  return <PracticeBriefing assessment={result.data} copy={copy} />;
}
