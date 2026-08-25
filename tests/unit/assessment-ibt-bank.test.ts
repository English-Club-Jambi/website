import { describe, expect, it } from "vitest";

import {
  ibtPracticeBank,
  inspectIbtPracticeBank,
} from "../../content/assessment-ibt-bank";

describe("original four-skill practice bank", () => {
  it("matches the declared full-form counts and point maxima", () => {
    const inspection = inspectIbtPracticeBank();
    expect(inspection.errors).toEqual([]);
    expect(inspection.definitions).toBe(5);
    expect(inspection.counts).toEqual({
      reading: 50,
      listening: 47,
      writing: 12,
      speaking: 11,
    });
    expect(inspection.points.reading).toBeCloseTo(35, 8);
    expect(inspection.points.listening).toBeCloseTo(35, 8);
    expect(inspection.points.writing).toBe(20);
    expect(inspection.points.speaking).toBe(55);
  });

  it("keeps each quick form bounded and single-skill", () => {
    const quick = ibtPracticeBank.filter((entry) => entry.kind === "skill-quiz");
    expect(quick).toHaveLength(4);
    for (const definition of quick) {
      expect(definition.sections).toHaveLength(1);
      expect(definition.sections[0].items.length).toBeGreaterThanOrEqual(3);
      expect(definition.sections[0].items.length).toBeLessThanOrEqual(12);
    }
  });

  it("contains only original-bank provenance and no ETS question import marker", () => {
    const serialized = JSON.stringify(ibtPracticeBank);
    expect(serialized).not.toMatch(/official question|copied from|released test/i);
    expect(serialized).toMatch(/English Club Four-Skill Practice Form 1/);
  });
});
