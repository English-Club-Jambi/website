import { describe, expect, it } from "vitest";

import {
  questionBankVerificationIssues,
  type QuestionBankVerification,
} from "../../scripts/lib/assessment-seed-verification";

function verification(
  overrides: Partial<QuestionBankVerification> = {},
): QuestionBankVerification {
  return {
    total: 145,
    ready: 145,
    eligible: 120,
    randomSections: 8,
    bySkill: [
      { skill: "reading", ready: 58, eligible: 50 },
      { skill: "listening", ready: 55, eligible: 47 },
      { skill: "writing", ready: 17, eligible: 12 },
      { skill: "speaking", ready: 15, eligible: 11 },
    ],
    ...overrides,
  };
}

describe("assessment seed Question Bank verification", () => {
  it("accepts the pristine seeded catalogue", () => {
    expect(questionBankVerificationIssues(verification())).toEqual([]);
  });

  it("accepts reviewed capacity above the fixed 120-task form quota", () => {
    expect(
      questionBankVerificationIssues(
        verification({
          total: 146,
          ready: 146,
          eligible: 121,
          bySkill: [
            { skill: "reading", ready: 59, eligible: 51 },
            { skill: "listening", ready: 55, eligible: 47 },
            { skill: "writing", ready: 17, eligible: 12 },
            { skill: "speaking", ready: 15, eligible: 11 },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("rejects the obsolete four-section expectation", () => {
    expect(
      questionBankVerificationIssues(verification({ randomSections: 4 })),
    ).toContain("random sections are 4/8");
  });

  it("rejects a skill shortage even when another skill masks the total", () => {
    const issues = questionBankVerificationIssues(
      verification({
        eligible: 120,
        bySkill: [
          { skill: "reading", ready: 59, eligible: 51 },
          { skill: "listening", ready: 55, eligible: 46 },
          { skill: "writing", ready: 17, eligible: 12 },
          { skill: "speaking", ready: 15, eligible: 11 },
        ],
      }),
    );
    expect(issues).toContain("listening capacity is 46/47");
  });
});
