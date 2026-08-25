import { describe, expect, it } from "vitest";

import {
  formatElapsed,
  reviewResponseText,
} from "@/components/practice/result-view";
import type { PublicAssessmentItem } from "@/components/practice/question-renderer";
import type { Id } from "../../convex/_generated/dataModel";

describe("practice result formatting", () => {
  it("keeps a full-form duration readable after one hour", () => {
    expect(formatElapsed(6_900)).toBe("1:55:00");
    expect(formatElapsed(359)).toBe("5:59");
  });

  it("renders review answers as authored labels rather than internal keys", () => {
    const item = {
      id: "assessmentitem00000000000003" as Id<"assessmentItems">,
      type: "single-choice",
      prompt: "Choose the sentence.",
      required: true,
      options: [
        { key: "internal-a", label: "They practise together." },
        { key: "internal-b", label: "They together practise." },
      ],
    } satisfies PublicAssessmentItem;

    expect(
      reviewResponseText(
        item,
        { kind: "choice", selectedChoiceKey: "internal-a" },
        "Not answered",
      ),
    ).toBe("They practise together.");
    expect(reviewResponseText(item, null, "Not answered")).toBe("Not answered");
  });
});
