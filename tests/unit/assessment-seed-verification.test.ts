import { describe, expect, it } from "vitest";

import {
  questionBankVerificationIssues,
  type QuestionBankVerification,
} from "../../scripts/lib/assessment-seed-verification";

function verification(
  overrides: Partial<QuestionBankVerification> = {},
): QuestionBankVerification {
  return {
    total: 164,
    ready: 164,
    eligible: 140,
    randomSections: 6,
    bySkill: [
      { skill: "listening", ready: 58, eligible: 50 },
      { skill: "structure", ready: 48, eligible: 40 },
      { skill: "reading", ready: 58, eligible: 50 },
    ],
    ...overrides,
  };
}

describe("assessment seed Question Bank verification", () => {
  it("accepts the pristine seeded catalogue", () => {
    expect(questionBankVerificationIssues(verification())).toEqual([]);
  });

  it("accepts reviewed capacity above the fixed 140-task form quota", () => {
    expect(
      questionBankVerificationIssues(
        verification({
          total: 165,
          ready: 165,
          eligible: 141,
          bySkill: [
            { skill: "reading", ready: 59, eligible: 51 },
            { skill: "listening", ready: 58, eligible: 50 },
            { skill: "structure", ready: 48, eligible: 40 },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("rejects the obsolete eight-section expectation", () => {
    expect(
      questionBankVerificationIssues(verification({ randomSections: 4 })),
    ).toContain("random sections are 4/6");
  });

  it("rejects a skill shortage even when another skill masks the total", () => {
    const issues = questionBankVerificationIssues(
      verification({
        eligible: 140,
        bySkill: [
          { skill: "reading", ready: 59, eligible: 51 },
          { skill: "listening", ready: 58, eligible: 49 },
          { skill: "structure", ready: 48, eligible: 40 },
        ],
      }),
    );
    expect(issues).toContain("listening capacity is 49/50");
  });
});
