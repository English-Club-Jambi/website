import type { Metadata } from "next";

import {
  PracticeBriefing,
  PracticeUnavailable,
} from "@/components/practice/practice-briefing";
import type { PracticeSkill } from "@/content/assessment";
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

export async function buildQuickPracticeMetadata(
  skill: PracticeSkill,
): Promise<Metadata> {
  const copy = await getPublicPageContent("practice");
  const skillCopy = getSkillCopy(skill, copy);

  return buildPageMetadata({
    title: skillCopy.title,
    description: skillCopy.summary,
    path: `/practice/quick/${skill}`,
  });
}

export async function QuickPracticeRoute({ skill }: { skill: PracticeSkill }) {
  const [result, copy] = await Promise.all([
    getQuickPracticeAssessment(skill),
    getPublicPageContent("practice"),
  ]);
  const skillCopy = getSkillCopy(skill, copy);

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
