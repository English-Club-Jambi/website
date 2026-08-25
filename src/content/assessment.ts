import type { ActivityTheme } from "./site-copy";

export type PracticeSkill = "listening" | "structure" | "reading";

export const practiceSkills: ReadonlyArray<{
  key: PracticeSkill;
  backendSkill: "listening" | "structure" | "reading";
  href: `/practice/quick/${PracticeSkill}`;
}> = [
  {
    key: "listening",
    backendSkill: "listening",
    href: "/practice/quick/listening",
  },
  {
    key: "structure",
    backendSkill: "structure",
    href: "/practice/quick/structure",
  },
  {
    key: "reading",
    backendSkill: "reading",
    href: "/practice/quick/reading",
  },
] as const;

export function getPracticeSkill(value: string) {
  return practiceSkills.find((skill) => skill.key === value);
}

export type ProgrammeQuizQuestion = Readonly<{
  id: string;
  prompt: string;
  options: ReadonlyArray<Readonly<{ id: string; label: string }>>;
  correctOptionId: string;
  explanation: string;
  link: Readonly<{ href: "/activities"; label: string }>;
}>;

const activityOptionOrder = ["speak", "exchange", "make", "room"] as const;

/**
 * Builds an orientation quiz only from the activity copy already published by
 * the site. The function adds no schedule, outcome, or membership claim.
 */
export function buildProgrammeQuiz(
  themes: ReadonlyArray<ActivityTheme>,
  caution: { body: string; linkLabel: string },
  prompts: {
    speak: string;
    exchange: string;
    make: string;
    schedule: string;
    scheduleYes: string;
    scheduleNo: string;
  },
): ProgrammeQuizQuestion[] {
  const byId = new Map(themes.map((theme) => [theme.id, theme]));
  const options = activityOptionOrder.flatMap((id) => {
    const theme = byId.get(id);
    return theme === undefined ? [] : [{ id, label: theme.verb }];
  });

  const speak = byId.get("speak");
  const exchange = byId.get("exchange");
  const make = byId.get("make");

  if (speak === undefined || exchange === undefined || make === undefined) {
    return [];
  }

  const activityLink = { href: "/activities" as const, label: caution.linkLabel };

  return [
    {
      id: "speak-without-script",
      prompt: prompts.speak,
      options,
      correctOptionId: speak.id,
      explanation: speak.description,
      link: activityLink,
    },
    {
      id: "exchange-perspectives",
      prompt: prompts.exchange,
      options,
      correctOptionId: exchange.id,
      explanation: exchange.description,
      link: activityLink,
    },
    {
      id: "make-shared-task",
      prompt: prompts.make,
      options,
      correctOptionId: make.id,
      explanation: make.description,
      link: activityLink,
    },
    {
      id: "themes-not-timetable",
      prompt: prompts.schedule,
      options: [
        { id: "fixed", label: prompts.scheduleYes },
        { id: "descriptive", label: prompts.scheduleNo },
      ],
      correctOptionId: "descriptive",
      explanation: caution.body,
      link: activityLink,
    },
  ];
}
