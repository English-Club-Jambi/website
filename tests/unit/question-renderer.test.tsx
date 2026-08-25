import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getPublicContentDefaults } from "@content/public-content";
import {
  QuestionRenderer,
  type PublicAssessmentItem,
} from "@/components/practice/question-renderer";
import type { Id } from "../../convex/_generated/dataModel";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: () => false,
  });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: () => undefined,
  });
});

afterEach(cleanup);

const copy = getPublicContentDefaults("practice");

describe("QuestionRenderer", () => {
  it("renders a semantic Answer Line choice without moving focus", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const item = {
      id: "assessmentitem00000000000001" as Id<"assessmentItems">,
      type: "single-choice",
      prompt: "Which sentence is complete?",
      required: true,
      options: [
        { key: "a", label: "The group meets." },
        { key: "b", label: "Because the group." },
      ],
    } satisfies PublicAssessmentItem;

    render(
      <QuestionRenderer
        item={item}
        response={{ kind: "choice" }}
        copy={copy}
        onChange={onChange}
      />,
    );

    const answer = screen.getByRole("radio", { name: "The group meets." });
    await user.click(answer);
    expect(answer).toHaveFocus();
    expect(onChange).toHaveBeenCalledWith({
      kind: "choice",
      selectedChoiceKey: "a",
    });
  });

  it("offers button-based sentence ordering instead of a drag-only control", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const item = {
      id: "assessmentitem00000000000002" as Id<"assessmentItems">,
      type: "sentence-build",
      prompt: "Build the sentence.",
      required: true,
      tokens: [
        { key: "one", label: "The club" },
        { key: "two", label: "meets here" },
      ],
    } satisfies PublicAssessmentItem;

    render(
      <QuestionRenderer
        item={item}
        response={{ kind: "token-order", tokenOrder: [] }}
        copy={copy}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "The club" }));
    expect(onChange).toHaveBeenCalledWith({
      kind: "token-order",
      tokenOrder: ["one"],
    });
    expect(screen.queryByText(/drag/i)).toBeNull();
  });

  it("keeps a cloze choice at word level inside the sentence", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const item = {
      id: "assessmentitem00000000000004" as Id<"assessmentItems">,
      type: "cloze-select",
      prompt: "Complete the missing word.",
      required: true,
      stemParts: ["migr", " birds return to the wetland each spring."],
      gaps: [
        {
          key: "suffix",
          options: [
            { key: "atory", label: "atory" },
            { key: "ation", label: "ation" },
          ],
        },
      ],
    } satisfies PublicAssessmentItem;

    render(
      <QuestionRenderer
        item={item}
        response={{ kind: "cloze", gapAnswers: [] }}
        copy={copy}
        onChange={onChange}
      />,
    );

    const select = screen.getByRole("combobox", { name: `${copy.blank} 1` });
    expect(select).toHaveAttribute("data-variant", "inline");
    const wordUnit = select.closest("[data-cloze-word]");
    expect(wordUnit).toHaveTextContent("migr");
    expect(screen.getByLabelText(copy.completeBlanks)).toHaveTextContent(
      "birds return to the wetland each spring.",
    );

    await user.click(select);
    await user.click(screen.getByRole("option", { name: "atory" }));
    expect(onChange).toHaveBeenCalledWith({
      kind: "cloze",
      gapAnswers: [{ gapKey: "suffix", choiceKey: "atory" }],
    });
  });

  it("captures a bounded constructed response and keeps speaking rehearsal local", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const item = {
      id: "assessmentitem00000000000003" as Id<"assessmentItems">,
      type: "constructed-response",
      prompt: "Describe a place where you can focus.",
      required: true,
      responseMode: "speaking-interview",
      minimumWords: 25,
      recommendedWords: 45,
      maximumCharacters: 1_500,
      preparationSeconds: 20,
      responseSeconds: 60,
    } satisfies PublicAssessmentItem;

    render(
      <QuestionRenderer
        item={item}
        response={{ kind: "text", text: "" }}
        copy={copy}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: copy.startRecording }));
    expect(screen.getByText(copy.recordingUnavailable)).toBeVisible();
    const response = screen.getByRole("textbox", { name: copy.responseLabel });
    fireEvent.change(response, {
      target: { value: "The quiet corner of the library helps me focus." },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      kind: "text",
      text: "The quiet corner of the library helps me focus.",
    });
    expect(screen.getByText(copy.recordingUnavailable)).toBeVisible();
  });
});
