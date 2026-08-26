import { describe, expect, it } from "vitest";

import {
  paperPracticeBank,
  inspectPaperPracticeBank,
} from "../../content/assessment-paper-bank";

describe("original paper-based practice bank", () => {
  it("matches the declared full-form counts and point maxima", () => {
    const inspection = inspectPaperPracticeBank();
    expect(inspection.errors).toEqual([]);
    expect(inspection.definitions).toBe(4);
    expect(inspection.counts).toEqual({
      listening: 50,
      structure: 40,
      reading: 50,
    });
    expect(inspection.points.listening).toBe(50);
    expect(inspection.points.structure).toBe(40);
    expect(inspection.points.reading).toBe(50);
  });

  it("keeps each quick form bounded and single-skill", () => {
    const quick = paperPracticeBank.filter((entry) => entry.kind === "skill-quiz");
    expect(quick).toHaveLength(3);
    for (const definition of quick) {
      expect(definition.sections).toHaveLength(1);
      expect(definition.sections[0].items.length).toBeGreaterThanOrEqual(3);
      expect(definition.sections[0].items.length).toBeLessThanOrEqual(12);
    }
  });

  it("contains only original-bank provenance and no ETS question import marker", () => {
    const serialized = JSON.stringify(paperPracticeBank);
    expect(serialized).not.toMatch(/official question|copied from|released test/i);
    expect(serialized).toMatch(/English Club Paper-Based Practice Form 1/);
    expect(serialized).not.toMatch(/Speaking Sprint|Writing Sprint/);
  });
});
