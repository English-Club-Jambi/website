export type QuestionBankVerification = {
  total: number;
  ready: number;
  eligible: number;
  randomSections: number;
  bySkill: Array<{
    skill: string;
    ready: number;
    eligible: number;
  }>;
};

export const FULL_FORM_SKILL_QUOTAS = {
  listening: 50,
  structure: 40,
  reading: 50,
} as const;

export const FULL_FORM_TASK_COUNT = Object.values(
  FULL_FORM_SKILL_QUOTAS,
).reduce((total, count) => total + count, 0);

export const SEEDED_QUESTION_BANK_RECORDS = 164;
export const SEEDED_RANDOM_SECTIONS = 6;

/**
 * The paper seed owns 164 source rows and six random-bank sections, while the
 * reusable bank may legitimately contain additional reviewed questions. The
 * release gate therefore verifies the installed floor and each skill quota,
 * rather than requiring the catalogue to remain identical to its first seed.
 */
export function questionBankVerificationIssues(
  verification: QuestionBankVerification,
) {
  const issues: string[] = [];
  if (verification.total < SEEDED_QUESTION_BANK_RECORDS) {
    issues.push(
      `catalogue has ${verification.total}/${SEEDED_QUESTION_BANK_RECORDS} seeded records`,
    );
  }
  if (verification.ready > verification.total) {
    issues.push("ready count exceeds the catalogue count");
  }
  if (verification.eligible > verification.ready) {
    issues.push("eligible fingerprint count exceeds ready records");
  }
  if (verification.randomSections !== SEEDED_RANDOM_SECTIONS) {
    issues.push(
      `random sections are ${verification.randomSections}/${SEEDED_RANDOM_SECTIONS}`,
    );
  }

  let skillEligibleTotal = 0;
  for (const [skill, quota] of Object.entries(FULL_FORM_SKILL_QUOTAS)) {
    const matches = verification.bySkill.filter((entry) => entry.skill === skill);
    if (matches.length !== 1) {
      issues.push(`${skill} has ${matches.length} verification rows`);
      continue;
    }
    const entry = matches[0];
    skillEligibleTotal += entry.eligible;
    if (entry.ready < entry.eligible) {
      issues.push(`${skill} eligible count exceeds ready records`);
    }
    if (entry.eligible < quota) {
      issues.push(`${skill} capacity is ${entry.eligible}/${quota}`);
    }
  }
  if (verification.eligible !== skillEligibleTotal) {
    issues.push(
      `eligible total ${verification.eligible} does not match skill total ${skillEligibleTotal}`,
    );
  }
  if (verification.eligible < FULL_FORM_TASK_COUNT) {
    issues.push(
      `full-form capacity is ${verification.eligible}/${FULL_FORM_TASK_COUNT}`,
    );
  }
  return issues;
}
