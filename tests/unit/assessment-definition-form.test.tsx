import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AssessmentDefinitionForm } from "@/components/admin/assessments/assessment-definition-form";

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

describe("AssessmentDefinitionForm", () => {
  it("normalizes the slug and submits the supported private assessment contract", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <AssessmentDefinitionForm pending={false} onCreate={onCreate} />,
    );

    fireEvent.change(screen.getByLabelText("Internal title"), {
      target: { value: "Reading Practice Set" },
    });
    expect(screen.getByLabelText("Route slug")).toHaveValue(
      "reading-practice-set",
    );
    expect(screen.getByLabelText("Content profile")).toHaveValue(
      "Four-skill iBT-style practice, 2026 blueprint",
    );
    expect(
      screen.queryByRole("option", { name: "Home programme quiz" }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Learner-facing title"), {
      target: { value: "Reading practice for careful readers" },
    });
    fireEvent.change(screen.getByLabelText("Summary"), {
      target: {
        value: "A short reading practice built from original English Club material.",
      },
    });
    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: {
        value: "Read each passage carefully, then choose the strongest answer.",
      },
    });

    await user.click(screen.getByRole("button", { name: "Create private draft" }));
    expect(onCreate).toHaveBeenCalledWith({
      adminTitle: "Reading Practice Set",
      slug: "reading-practice-set",
      kind: "skill-quiz",
      profile: "ec-ibt-style-2026-v1",
      title: "Reading practice for careful readers",
      summary: "A short reading practice built from original English Club material.",
      instructions: "Read each passage carefully, then choose the strongest answer.",
      locale: "en",
      timePolicy: "untimed",
      allowResume: true,
      reviewPolicy: "after-submit",
      scorePolicy: "practice-estimate-v1",
      defaultTimingMode: "standard",
      defaultListeningMode: "transcript-supported",
      maxAttemptsPerDay: 3,
    });
  });
});
