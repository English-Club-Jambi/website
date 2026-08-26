import { ConvexError } from "convex/values";

export type PaperEstimateSkill = "listening" | "structure" | "reading";

const sectionContract: Record<
  PaperEstimateSkill,
  { questions: number; minimum: number; maximum: number }
> = {
  listening: { questions: 50, minimum: 31, maximum: 68 },
  structure: { questions: 40, minimum: 31, maximum: 68 },
  reading: { questions: 50, minimum: 31, maximum: 67 },
};

export function estimatePaperSectionScore(args: {
  skill: PaperEstimateSkill;
  correct: number;
  possible: number;
}) {
  const contract = sectionContract[args.skill];
  if (
    !Number.isInteger(args.correct) ||
    !Number.isInteger(args.possible) ||
    args.possible !== contract.questions ||
    args.correct < 0 ||
    args.correct > args.possible
  ) {
    throw new ConvexError({
      code: "PAPER_SCORE_INPUT_INVALID" as const,
      skill: args.skill,
    });
  }
  return Math.min(
    contract.maximum,
    contract.minimum +
      Math.round(
        (args.correct / contract.questions) *
          (contract.maximum - contract.minimum),
      ),
  );
}

export function estimatePaperTotal(
  sections: ReadonlyArray<{
    skill: PaperEstimateSkill;
    score: number;
  }>,
) {
  if (sections.length !== 3) {
    throw new ConvexError({ code: "PAPER_SCORE_SECTIONS_INVALID" as const });
  }
  const bySkill = new Map(sections.map((section) => [section.skill, section.score]));
  const ordered = (["listening", "structure", "reading"] as const).map(
    (skill) => {
      const score = bySkill.get(skill);
      const contract = sectionContract[skill];
      if (
        score === undefined ||
        !Number.isInteger(score) ||
        score < contract.minimum ||
        score > contract.maximum
      ) {
        throw new ConvexError({ code: "PAPER_SCORE_SECTIONS_INVALID" as const });
      }
      return score;
    },
  );
  return Math.min(
    677,
    Math.max(310, Math.round((ordered.reduce((sum, score) => sum + score, 0) * 10) / 3)),
  );
}
