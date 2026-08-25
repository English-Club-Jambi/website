import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AssessmentQuestionPoolManager } from "@/components/admin/assessments/assessment-question-pool-manager";

const useQueryMock = vi.fn();
const mutationMock = vi.fn();

vi.mock("convex/react", async () => {
  const actual = await vi.importActual<typeof import("convex/react")>("convex/react");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
    useMutation: () => mutationMock,
  };
});

const overview = {
  definition: {
    definitionId: "definition-reading",
    title: "Quick Reading: Text in Context",
    slug: "quick-reading-text-in-context",
    profile: "ec-ibt-style-2026-v1",
    visibility: "published",
  },
  version: {
    versionId: "version-reading-2",
    source: "working",
    status: "draft",
    contentRevision: 4,
    mutable: true,
  },
  sections: [
    {
      sectionId: "section-reading",
      skill: "reading",
      title: "Reading",
      requiredCount: 8,
      allowedCount: 9,
      disabledCount: 1,
      spareCount: 1,
      deliveryMode: "random-bank",
    },
  ],
  questions: [
    {
      bankQuestionId: "bank-one",
      skill: "reading",
      taskFamily: "read-daily-life",
      difficulty: "developing",
      status: "ready",
      prompt: "Which notice best explains when the library desk closes?",
      itemType: "single-choice",
      sourceTitle: "Question Bank authoring ledger",
      allowedByDefault: true,
      ruleState: "inherit",
      effectiveAllowed: true,
      flagSignal: {
        activeCount: 1,
        totalEvents: 3,
        lastFlaggedAt: Date.UTC(2026, 7, 26, 4, 30),
        reviewStatus: "open",
        reviewedAt: null,
      },
    },
    {
      bankQuestionId: "bank-two",
      skill: "reading",
      taskFamily: "read-academic-passage",
      difficulty: "advanced",
      status: "ready",
      prompt: "What is the writer's main reason for comparing the two studies?",
      itemType: "single-choice",
      sourceTitle: "Quick Reading source",
      allowedByDefault: false,
      ruleState: "inherit",
      effectiveAllowed: false,
      flagSignal: null,
    },
  ],
};

beforeEach(() => {
  useQueryMock.mockReturnValue(overview);
  mutationMock.mockReset();
  mutationMock.mockResolvedValue({
    ok: true,
    changed: true,
    contentRevision: 5,
  });
});

afterEach(cleanup);

describe("AssessmentQuestionPoolManager", () => {
  it("explains fixed structured selection and exposes only aggregate flag signals", async () => {
    const user = userEvent.setup();
    render(
      <AssessmentQuestionPoolManager
        definitionId="definition-reading"
        canEdit
        canReview
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Questions allowed in this format" }),
    ).toBeVisible();
    expect(screen.getByText("Format rules")).toBeVisible();
    expect(screen.getByText("Allowed pool")).toBeVisible();
    expect(screen.getByText("Pinned attempt")).toBeVisible();
    expect(
      screen.getByText((_, element) => element?.textContent === "9 / 8 needed"),
    ).toBeVisible();
    expect(screen.getByText("1 active · 3 total")).toBeVisible();
    expect(
      screen.getByText(/never reveals a participant, attempt, or response/i),
    ).toBeVisible();
    expect(screen.queryByText(/student@example|attempt-owner|correctChoiceKey/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Disable" }));
    expect(mutationMock).toHaveBeenCalledWith({
      definitionId: "definition-reading",
      bankQuestionId: "bank-one",
      allowed: false,
      expectedContentRevision: 4,
    });
  });

  it("keeps published eligibility read-only until a next revision exists", () => {
    useQueryMock.mockReturnValue({
      ...overview,
      version: { ...overview.version, source: "published", mutable: false },
    });

    render(
      <AssessmentQuestionPoolManager
        definitionId="definition-reading"
        canEdit
        canReview={false}
      />,
    );

    expect(screen.getByText("Published pool is read-only")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Allow" })).not.toBeInTheDocument();
  });
});
