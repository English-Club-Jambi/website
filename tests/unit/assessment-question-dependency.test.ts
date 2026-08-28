import { describe, expect, it } from "vitest";

import { selectStructuredQuestionBankRows } from "../../convex/lib/assessmentQuestionBank";
import type { Id } from "../../convex/_generated/dataModel";

type Row = {
  _id: Id<"assessmentQuestionBank">;
  dependencyGroupKey?: string;
  dependencyRole?: "anchor" | "follow-up";
  parentBankQuestionId?: Id<"assessmentQuestionBank">;
};

function id(value: string) {
  return value as Id<"assessmentQuestionBank">;
}

function row(value: string, dependency: Partial<Row> = {}): Row {
  return { _id: id(value), ...dependency };
}

function fixedRandom(...values: number[]) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe("structured Question Bank selection", () => {
  it("keeps independent questions compatible with exact quotas", () => {
    const result = selectStructuredQuestionBankRows(
      [row("a"), row("b"), row("c")],
      2,
      fixedRandom(0.9, 0.9),
    );
    expect(result).toHaveLength(2);
    expect(new Set(result.map((entry) => entry._id)).size).toBe(2);
  });

  it("inserts an anchor before a selected follow-up", () => {
    const anchor = row("anchor", {
      dependencyGroupKey: "room-acoustics",
      dependencyRole: "anchor",
    });
    const followUp = row("follow-up", {
      dependencyGroupKey: "room-acoustics",
      dependencyRole: "follow-up",
      parentBankQuestionId: anchor._id,
    });
    const result = selectStructuredQuestionBankRows(
      [anchor, followUp],
      2,
      fixedRandom(0),
    );
    expect(result.map((entry) => entry._id)).toEqual([
      anchor._id,
      followUp._id,
    ]);
  });

  it("keeps selected set members contiguous while sampling children", () => {
    const anchor = row("anchor", {
      dependencyGroupKey: "oral-history",
      dependencyRole: "anchor",
    });
    const childA = row("child-a", {
      dependencyGroupKey: "oral-history",
      dependencyRole: "follow-up",
      parentBankQuestionId: anchor._id,
    });
    const childB = row("child-b", {
      dependencyGroupKey: "oral-history",
      dependencyRole: "follow-up",
      parentBankQuestionId: anchor._id,
    });
    const independent = row("independent");
    const result = selectStructuredQuestionBankRows(
      [anchor, childA, independent, childB],
      3,
      fixedRandom(0.99, 0, 0),
    );
    const anchorIndex = result.findIndex((entry) => entry._id === anchor._id);
    const childIndexes = result
      .map((entry, index) =>
        entry.dependencyRole === "follow-up" ? index : -1,
      )
      .filter((index) => index >= 0);
    expect(anchorIndex).toBeGreaterThanOrEqual(0);
    expect(childIndexes).toHaveLength(1);
    expect(childIndexes[0]).toBe(anchorIndex + 1);
    expect(result).toHaveLength(3);
  });

  it("does not orphan a follow-up when only one slot remains", () => {
    const anchor = row("anchor", {
      dependencyGroupKey: "room-acoustics",
      dependencyRole: "anchor",
    });
    const followUp = row("follow-up", {
      dependencyGroupKey: "room-acoustics",
      dependencyRole: "follow-up",
      parentBankQuestionId: anchor._id,
    });
    const independent = row("independent");
    const result = selectStructuredQuestionBankRows(
      [anchor, independent, followUp],
      2,
      fixedRandom(0, 0),
    );
    expect(result).toHaveLength(2);
    const followUpIndex = result.findIndex(
      (entry) => entry._id === followUp._id,
    );
    if (followUpIndex >= 0) {
      expect(result[followUpIndex - 1]?._id).toBe(anchor._id);
    }
  });

  it("ignores a malformed follow-up whose parent is unavailable", () => {
    const result = selectStructuredQuestionBankRows(
      [
        row("orphan", {
          dependencyGroupKey: "missing-parent",
          dependencyRole: "follow-up",
          parentBankQuestionId: id("not-in-pool"),
        }),
        row("independent"),
      ],
      1,
      fixedRandom(0),
    );
    expect(result.map((entry) => entry._id)).toEqual([id("independent")]);
  });
});
