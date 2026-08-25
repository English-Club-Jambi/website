import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  PracticeBriefing,
  PracticeUnavailable,
} from "@/components/practice/practice-briefing";
import { getPracticeSkill, type PracticeSkill } from "@/content/assessment";
import { getQuickPracticeAssessment } from "@/lib/assessment";
import { getPublicPageContent } from "@/lib/public-content";

function getSkillCopy(
  skill: PracticeSkill,
  copy: Awaited<ReturnType<typeof getPublicPageContent<"practice">>>,
) {
  return {
    listening: {
      title: copy.quickListeningTitle,
      summary: copy.quickListeningSummary,
    },
    reading: {
      title: copy.quickReadingTitle,
      summary: copy.quickReadingSummary,
    },
    writing: {
      title: copy.quickWritingTitle,
      summary: copy.quickWritingSummary,
    },
    speaking: {
      title: copy.quickSpeakingTitle,
      summary: copy.quickSpeakingSummary,
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
    return { title: copy.metadataTitle };
  }

  const skillCopy = getSkillCopy(skill.key, copy);
  return {
    title: skillCopy.title,
    description: skillCopy.summary,
    alternates: { canonical: skill.href },
  };
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
