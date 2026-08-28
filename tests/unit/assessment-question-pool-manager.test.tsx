import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AssessmentQuestionPoolManager } from "@/components/admin/assessments/assessment-question-pool-manager";

const useQueryMock = vi.fn();
const mutationMock = vi.fn();

vi.mock("convex/react", async () => {
  const actual =
    await vi.importActual<typeof import("convex/react")>("convex/react");
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
      dependency: null,
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
      dependency: null,
      flagSignal: null,
    },
  ],
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

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
    expect(
      screen.queryByText(/student@example|attempt-owner|correctChoiceKey/i),
    ).not.toBeInTheDocument();

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
    expect(
      screen.queryByRole("button", { name: "Disable" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Allow" }),
    ).not.toBeInTheDocument();
  });

  it("opens a complete review and plays Listening audio only on demand", async () => {
    const user = userEvent.setup();
    const listeningOverview = {
      ...overview,
      sections: [
        {
          ...overview.sections[0],
          skill: "listening",
          title: "Listening",
        },
      ],
      questions: [
        {
          ...overview.questions[0],
          bankQuestionId: "bank-listening",
          skill: "listening",
          taskFamily: "listen-conversation",
          prompt: "What should the student bring to collect the field kit?",
          sourceTitle: "Question Bank original",
        },
      ],
    };
    const review = {
      bankQuestionId: "bank-listening",
      bankKey: "manual/listening-field-kit",
      skill: "listening",
      taskFamily: "listen-conversation",
      difficulty: "developing",
      status: "ready",
      profile: "ec-ibt-style-2026-v1",
      fullPracticeEligible: true,
      origin: "bank-authored",
      tags: ["campus", "conversation"],
      content: {
        type: "single-choice",
        prompt: "What should the student bring to collect the field kit?",
        options: [
          { key: "a", label: "A student card and signed form" },
          { key: "b", label: "The whole project group" },
          { key: "c", label: "A replacement battery" },
        ],
        correctChoiceKey: "a",
        explanation: "The technician names both items in the recording.",
      },
      source: {
        title: "Question Bank original",
        visibility: "draft",
        versionStatus: "ready",
        sectionTitle: "Listening authoring ledger",
        itemKey: "listening-field-kit",
      },
      stimulus: {
        kind: "audio",
        title: "Collecting a field kit",
        body: null,
        transcript:
          "Student: What should I bring? Technician: Your student card and signed form.",
        alt: "A campus equipment desk conversation",
        image: null,
      },
      illustration: null,
      audio: {
        mediaId: "audio-field-kit",
        publicUrl:
          "https://r2.mukhtada.my.id/uploads/assessment-audio/field-kit.mp3",
        contentType: "audio/mpeg",
        durationMs: 18_400,
        description: "A campus equipment desk conversation",
      },
      dependency: null,
      updatedAt: Date.UTC(2026, 7, 28, 12),
    };
    useQueryMock.mockImplementation((_reference, args) =>
      args && typeof args === "object" && "bankQuestionId" in args
        ? review
        : listeningOverview,
    );

    render(
      <AssessmentQuestionPoolManager
        definitionId="definition-reading"
        canEdit
        canReview
      />,
    );

    expect(
      useQueryMock.mock.calls.some(
        ([, args]) =>
          args && typeof args === "object" && "bankQuestionId" in args,
      ),
    ).toBe(false);
    const trigger = screen.getByRole("button", {
      name: "Review question 1: What should the student bring to collect the field kit?",
    });
    await user.click(trigger);
    expect(
      useQueryMock.mock.calls.some(
        ([, args]) =>
          args && typeof args === "object" && "bankQuestionId" in args,
      ),
    ).toBe(true);
    expect(
      screen.getByRole("dialog", { name: "Review question" }),
    ).toHaveAttribute("open");
    expect(screen.getByText("A student card and signed form")).toBeVisible();
    expect(screen.getByText("Correct answer")).toBeVisible();
    expect(
      screen.getByText("The technician names both items in the recording."),
    ).toBeVisible();
    expect(screen.getByText("Read transcript")).toBeVisible();

    const audio = screen.getByLabelText(
      /play the reviewed audio for what should the student bring/i,
    ) as HTMLAudioElement;
    expect(audio).toHaveAttribute("controls");
    expect(audio).toHaveAttribute("preload", "metadata");
    expect(audio.autoplay).toBe(false);

    await user.click(
      screen.getByRole("button", { name: "Close question review" }),
    );
    expect(trigger).toHaveFocus();
  });

  it("shows every writing constraint and names absent timers honestly", async () => {
    const user = userEvent.setup();
    const writingQuestion = {
      ...overview.questions[0],
      bankQuestionId: "bank-writing",
      skill: "writing",
      taskFamily: "write-email",
      itemType: "constructed-response",
      prompt: "Write a short email asking to move a study-group meeting.",
    };
    const writingOverview = {
      ...overview,
      sections: [
        {
          ...overview.sections[0],
          skill: "writing",
          title: "Writing",
        },
      ],
      questions: [writingQuestion],
    };
    const review = {
      bankQuestionId: "bank-writing",
      bankKey: "manual/writing-study-group",
      skill: "writing",
      taskFamily: "write-email",
      difficulty: "developing",
      status: "ready",
      profile: "ec-ibt-style-2026-v1",
      fullPracticeEligible: true,
      origin: "bank-authored",
      tags: ["writing", "email"],
      content: {
        type: "constructed-response",
        prompt: writingQuestion.prompt,
        explanation:
          "The response should make the request and propose a new time.",
        responseMode: "writing",
        minimumWords: 60,
        recommendedWords: 100,
        maximumCharacters: 4_000,
        preparationSeconds: null,
        responseSeconds: null,
        rubric: {
          maxPoints: 5,
          minimumWords: 40,
          targetTerms: ["request", "schedule"],
          sampleResponse:
            "Could we move our study-group meeting to Friday afternoon?",
        },
      },
      source: {
        title: "Question Bank original",
        visibility: "draft",
        versionStatus: "ready",
        sectionTitle: "Writing authoring ledger",
        itemKey: "writing-study-group",
      },
      stimulus: null,
      illustration: null,
      audio: null,
      dependency: null,
      updatedAt: Date.UTC(2026, 7, 28, 12),
    };
    useQueryMock.mockImplementation((_reference, args) =>
      args && typeof args === "object" && "bankQuestionId" in args
        ? review
        : writingOverview,
    );

    render(
      <AssessmentQuestionPoolManager
        definitionId="definition-reading"
        canEdit
        canReview
      />,
    );
    await user.click(
      screen.getByRole("button", {
        name: `Review question 1: ${writingQuestion.prompt}`,
      }),
    );

    const fact = (label: string) => {
      const row = screen.getByText(label).closest("div");
      if (row === null) throw new Error(`Missing review fact: ${label}`);
      return within(row);
    };
    expect(fact("Response mode").getByText("Writing")).toBeVisible();
    expect(fact("Response minimum").getByText("60 words")).toBeVisible();
    expect(fact("Recommended length").getByText("100 words")).toBeVisible();
    expect(fact("Maximum length").getByText("4000 characters")).toBeVisible();
    expect(fact("Preparation time").getByText("Not set")).toBeVisible();
    expect(fact("Response time").getByText("Not timed")).toBeVisible();
    expect(fact("Rubric minimum").getByText("40 words")).toBeVisible();
    expect(fact("Rubric value").getByText("5 points")).toBeVisible();
  });

  it("shows explicit speaking timers and preserves a zero-word minimum as unset", async () => {
    const user = userEvent.setup();
    const speakingQuestion = {
      ...overview.questions[0],
      bankQuestionId: "bank-speaking",
      skill: "speaking",
      taskFamily: "speaking-response",
      itemType: "constructed-response",
      prompt: "Explain which campus service is most useful to new students.",
    };
    const speakingOverview = {
      ...overview,
      sections: [
        {
          ...overview.sections[0],
          skill: "speaking",
          title: "Speaking",
        },
      ],
      questions: [speakingQuestion],
    };
    const review = {
      bankQuestionId: "bank-speaking",
      bankKey: "manual/speaking-campus-service",
      skill: "speaking",
      taskFamily: "speaking-response",
      difficulty: "developing",
      status: "ready",
      profile: "ec-ibt-style-2026-v1",
      fullPracticeEligible: true,
      origin: "bank-authored",
      tags: ["speaking", "campus"],
      content: {
        type: "constructed-response",
        prompt: speakingQuestion.prompt,
        explanation: null,
        responseMode: "speaking",
        minimumWords: 0,
        recommendedWords: 80,
        maximumCharacters: 2_000,
        preparationSeconds: 30,
        responseSeconds: 90,
        rubric: {
          maxPoints: 4,
          minimumWords: 0,
          targetTerms: [],
          sampleResponse:
            "The library help desk gives new students one clear place to begin.",
        },
      },
      source: {
        title: "Question Bank original",
        visibility: "draft",
        versionStatus: "ready",
        sectionTitle: "Speaking authoring ledger",
        itemKey: "speaking-campus-service",
      },
      stimulus: null,
      illustration: null,
      audio: null,
      dependency: null,
      updatedAt: Date.UTC(2026, 7, 28, 12),
    };
    useQueryMock.mockImplementation((_reference, args) =>
      args && typeof args === "object" && "bankQuestionId" in args
        ? review
        : speakingOverview,
    );

    render(
      <AssessmentQuestionPoolManager
        definitionId="definition-reading"
        canEdit
        canReview
      />,
    );
    await user.click(
      screen.getByRole("button", {
        name: `Review question 1: ${speakingQuestion.prompt}`,
      }),
    );

    const fact = (label: string) => {
      const row = screen.getByText(label).closest("div");
      if (row === null) throw new Error(`Missing review fact: ${label}`);
      return within(row);
    };
    expect(fact("Response minimum").getByText("Not set")).toBeVisible();
    expect(fact("Preparation time").getByText("30 seconds")).toBeVisible();
    expect(fact("Response time").getByText("90 seconds")).toBeVisible();
    expect(fact("Rubric minimum").getByText("Not set")).toBeVisible();
  });
});
