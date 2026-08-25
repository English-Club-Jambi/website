import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicContentDefaults } from "@content/public-content";
import {
  QuestionRenderer,
  type PublicAssessmentItem,
} from "@/components/practice/question-renderer";
import type { Id } from "../../convex/_generated/dataModel";

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
