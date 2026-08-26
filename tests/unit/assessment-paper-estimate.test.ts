import { describe, expect, it } from "vitest";

import {
  estimatePaperSectionScore,
  estimatePaperTotal,
} from "../../convex/lib/assessmentPaperEstimate";

describe("paper practice estimate", () => {
  it("maps the published endpoints to 310 and 677", () => {
    const minimum = [
      { skill: "listening" as const, score: estimatePaperSectionScore({ skill: "listening", correct: 0, possible: 50 }) },
      { skill: "structure" as const, score: estimatePaperSectionScore({ skill: "structure", correct: 0, possible: 40 }) },
      { skill: "reading" as const, score: estimatePaperSectionScore({ skill: "reading", correct: 0, possible: 50 }) },
    ];
    const maximum = [
      { skill: "listening" as const, score: estimatePaperSectionScore({ skill: "listening", correct: 50, possible: 50 }) },
      { skill: "structure" as const, score: estimatePaperSectionScore({ skill: "structure", correct: 40, possible: 40 }) },
      { skill: "reading" as const, score: estimatePaperSectionScore({ skill: "reading", correct: 50, possible: 50 }) },
    ];
    expect(minimum.map((entry) => entry.score)).toEqual([31, 31, 31]);
    expect(estimatePaperTotal(minimum)).toBe(310);
    expect(maximum.map((entry) => entry.score)).toEqual([68, 68, 67]);
    expect(estimatePaperTotal(maximum)).toBe(677);
  });

  it("uses the three scaled sections and rejects malformed forms", () => {
    expect(estimatePaperSectionScore({ skill: "listening", correct: 25, possible: 50 })).toBe(50);
    expect(estimatePaperSectionScore({ skill: "structure", correct: 20, possible: 40 })).toBe(50);
    expect(estimatePaperSectionScore({ skill: "reading", correct: 25, possible: 50 })).toBe(49);
    expect(estimatePaperTotal([
      { skill: "reading", score: 49 },
      { skill: "listening", score: 50 },
      { skill: "structure", score: 50 },
    ])).toBe(497);
    expect(() => estimatePaperSectionScore({ skill: "structure", correct: 20, possible: 50 })).toThrow();
    expect(() => estimatePaperTotal([
      { skill: "reading", score: 49 },
      { skill: "listening", score: 50 },
    ])).toThrow();
  });

  it("keeps every possible full-form estimate inside 310–677", () => {
    const listening = Array.from({ length: 51 }, (_, correct) =>
      estimatePaperSectionScore({ skill: "listening", correct, possible: 50 }),
    );
    const structure = Array.from({ length: 41 }, (_, correct) =>
      estimatePaperSectionScore({ skill: "structure", correct, possible: 40 }),
    );
    const reading = Array.from({ length: 51 }, (_, correct) =>
      estimatePaperSectionScore({ skill: "reading", correct, possible: 50 }),
    );
    for (const listeningScore of listening) {
      for (const structureScore of structure) {
        for (const readingScore of reading) {
          const total = estimatePaperTotal([
            { skill: "listening", score: listeningScore },
            { skill: "structure", score: structureScore },
            { skill: "reading", score: readingScore },
          ]);
          expect(total).toBeGreaterThanOrEqual(310);
          expect(total).toBeLessThanOrEqual(677);
        }
      }
    }
  });
});
