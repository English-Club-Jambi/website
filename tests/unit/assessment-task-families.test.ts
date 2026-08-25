import { describe, expect, it } from "vitest";

import {
  assessmentTaskFamilyGroups,
  assessmentTaskFamilyLabelByValue,
  isTaskFamilyForSkill,
  taskFamilySelectGroupsForSkill,
} from "@content/assessment-task-families";

describe("assessment task-family catalogue", () => {
  it("assigns every task family to exactly one labelled skill group", () => {
    const values = assessmentTaskFamilyGroups.flatMap((group) =>
      group.options.map((option) => option.value),
    );

    expect(assessmentTaskFamilyGroups.map((group) => group.label)).toEqual([
      "Reading",
      "Listening",
      "Writing",
      "Speaking",
    ]);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toHaveLength(12);
    expect(
      values.every((value) => assessmentTaskFamilyLabelByValue[value].length > 0),
    ).toBe(true);
  });

  it("keeps other skill groups visible but unavailable in a row editor", () => {
    const groups = taskFamilySelectGroupsForSkill("reading");

    expect(
      groups.find((group) => group.label === "Reading")?.options.every(
        (option) => !option.disabled,
      ),
    ).toBe(true);
    expect(
      groups
        .filter((group) => group.label !== "Reading")
        .flatMap((group) => group.options)
        .every((option) => option.disabled),
    ).toBe(true);
    expect(isTaskFamilyForSkill("reading", "complete-words")).toBe(true);
    expect(isTaskFamilyForSkill("reading", "listen-conversation")).toBe(false);
  });
});
