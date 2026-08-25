export const assessmentTaskFamilyGroups = [
  {
    skill: "reading",
    label: "Reading",
    options: [
      { value: "complete-words", label: "Complete the words" },
      { value: "read-daily-life", label: "Read in daily life" },
      { value: "read-academic-passage", label: "Read an academic passage" },
    ],
  },
  {
    skill: "listening",
    label: "Listening",
    options: [
      { value: "listen-choose-response", label: "Listen and choose a response" },
      { value: "listen-conversation", label: "Listen to a conversation" },
      { value: "listen-announcement", label: "Listen to an announcement" },
      { value: "listen-academic-talk", label: "Listen to an academic talk" },
    ],
  },
  {
    skill: "writing",
    label: "Writing",
    options: [
      { value: "build-sentence", label: "Build a sentence" },
      { value: "write-email", label: "Write an email" },
      { value: "academic-discussion", label: "Academic discussion" },
    ],
  },
  {
    skill: "speaking",
    label: "Speaking",
    options: [
      { value: "listen-repeat", label: "Listen and repeat" },
      { value: "take-interview", label: "Take an interview" },
    ],
  },
] as const;

export type AssessmentQuestionBankSkill =
  (typeof assessmentTaskFamilyGroups)[number]["skill"];
export type AssessmentTaskFamily =
  (typeof assessmentTaskFamilyGroups)[number]["options"][number]["value"];

export const assessmentTaskFamilyLabelByValue = Object.fromEntries(
  assessmentTaskFamilyGroups.flatMap((group) =>
    group.options.map((option) => [option.value, option.label]),
  ),
) as Record<AssessmentTaskFamily, string>;

export function isTaskFamilyForSkill(
  skill: string,
  taskFamily: string,
): skill is AssessmentQuestionBankSkill {
  return assessmentTaskFamilyGroups.some(
    (group) =>
      group.skill === skill &&
      group.options.some((option) => option.value === taskFamily),
  );
}

export function taskFamilySelectGroupsForSkill(
  skill: string,
) {
  return assessmentTaskFamilyGroups.map((group) => ({
    label: group.label,
    options: group.options.map((option) => ({
      ...option,
      disabled: group.skill !== skill,
    })),
  }));
}
