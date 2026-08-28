import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
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

import { QuestionBankManager } from "@/components/admin/assessments/question-bank-manager";

const useQueryMock = vi.fn();
const mutationMock = vi.fn();
const confirmMock = vi.fn();
let adminRole: "editor" | "publisher" | "owner" = "owner";

vi.mock("convex/react", async () => {
  const actual =
    await vi.importActual<typeof import("convex/react")>("convex/react");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
    useMutation: () => mutationMock,
    useAction: () => mutationMock,
  };
});

vi.mock("@/components/admin/admin-session", () => ({
  useAdminSession: () => ({ role: adminRole }),
}));

vi.mock("@/components/admin/admin-confirm-dialog", () => ({
  useAdminConfirm: () => confirmMock,
}));

const choiceOptions = [
  { key: "a", label: "Before the workshop" },
  { key: "b", label: "After the workshop" },
  { key: "c", label: "During lunch" },
  { key: "d", label: "The next morning" },
];

const baseRow = {
  bankQuestionId: "bank-one",
  bankKey: "seed/bank-one",
  skill: "reading",
  taskFamily: "read-daily-life",
  difficulty: "developing",
  status: "ready",
  profile: "ec-ibt-style-2026-v1",
  fullPracticeEligible: false,
  origin: "assessment-source",
  illustration: null,
  audio: null,
  content: {
    type: "single-choice",
    prompt: "When should members meet outside the language room?",
    explanation: "The notice schedules the meeting after the workshop.",
    options: choiceOptions,
    correctChoiceKey: "b",
  },
  tags: ["campus-life", "original-question"],
  prompt: "When should members meet outside the language room?",
  itemType: "single-choice",
  options: choiceOptions,
  correctChoiceKey: "b",
  explanation: "The notice schedules the meeting after the workshop.",
  points: 1,
  sourceDefinitionId: "definition-one",
  sourceVersionId: "version-one",
  sourceSectionId: "section-one",
  sourceItemId: "item-one",
  sourceTitle: "Quick Reading source",
  sourceVisibility: "published",
  usageCount: 3,
  usageCountCapped: false,
  seedBatch: "development",
  updatedAt: 10,
} as const;

let currentRow: Record<string, unknown> = baseRow;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

function resultForQuery(args: Record<string, unknown> | undefined) {
  if (args?.purpose === "assessment-image") {
    return { page: [], isDone: true, continueCursor: "" };
  }
  if (args?.purpose === "assessment-audio") {
    return {
      page: [
        {
          _id: "audio-one",
          publicUrl: "https://r2.mukhtada.my.id/audio/question-one.mp3",
          alt: "Two students arrange a study meeting after class",
          durationMs: 31_000,
          originalName: "after-class-meeting.mp3",
        },
      ],
      isDone: true,
      continueCursor: "",
    };
  }
  if (args?.status) {
    return {
      page: [currentRow],
      isDone: true,
      continueCursor: "",
    };
  }
  return {
    total: 164,
    capped: false,
    ready: 164,
    eligible: 140,
    bySkill: [
      { skill: "listening", count: 50 },
      { skill: "structure", count: 40 },
      { skill: "reading", count: 50 },
    ],
  };
}

beforeEach(() => {
  adminRole = "owner";
  currentRow = baseRow;
  useQueryMock.mockImplementation(
    (_reference: unknown, args: Record<string, unknown> | undefined) =>
      resultForQuery(args),
  );
  mutationMock.mockReset();
  mutationMock.mockResolvedValue({
    ok: true,
    updatedAt: 11,
    sourceItemId: "item-two",
  });
  confirmMock.mockReset();
  confirmMock.mockImplementation(
    async (_request: unknown, execute?: () => Promise<void>) => {
      await execute?.();
      return true;
    },
  );
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("QuestionBankManager", () => {
  it("lets an owner permanently delete an unused bank entry through the shared confirmation flow", async () => {
    const user = userEvent.setup();
    mutationMock.mockResolvedValueOnce({
      ok: true,
      deletedBankQuestionId: "bank-one",
    });
    render(<QuestionBankManager />);

    await user.click(screen.getByRole("button", { name: "Delete question" }));

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Delete this Question Bank entry?",
        confirmLabel: "Delete question",
        cancelLabel: "Keep question",
      }),
      expect.any(Function),
    );
    expect(mutationMock).toHaveBeenCalledWith({
      bankQuestionId: "bank-one",
      expectedUpdatedAt: 10,
    });
    expect(
      screen.getByText(
        "Deleted “When should members meet outside the language room?” from Question Bank.",
      ),
    ).toBeVisible();
  });

  it("does not expose permanent deletion to editors or publishers", () => {
    adminRole = "publisher";
    render(<QuestionBankManager />);

    expect(
      screen.queryByRole("button", { name: "Delete question" }),
    ).not.toBeInTheDocument();
  });

  it("keeps a protected question and explains why deletion is blocked", async () => {
    const user = userEvent.setup();
    let confirmationError: unknown;
    mutationMock.mockResolvedValueOnce({
      ok: false,
      code: "blocked",
      reason: "attempt_history",
    });
    confirmMock.mockImplementation(
      async (_request: unknown, execute?: () => Promise<void>) => {
        try {
          await execute?.();
        } catch (error) {
          confirmationError = error;
        }
        return false;
      },
    );
    render(<QuestionBankManager />);

    await user.click(screen.getByRole("button", { name: "Delete question" }));

    expect(confirmationError).toEqual(
      new Error(
        "This question has already appeared in a learner attempt. Its audit record must be retained.",
      ),
    );
    expect(
      screen.queryByText(/Deleted “When should members meet/i),
    ).not.toBeInTheDocument();
  });

  it("edits a published-source question directly and keeps format rules explicit", async () => {
    const user = userEvent.setup();
    render(<QuestionBankManager />);

    expect(
      screen.getByText("Ready questions are allowed by default."),
    ).toBeVisible();
    expect(screen.getByText("Format default", { exact: true })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Edit source" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Available to full practice"),
    ).not.toBeInTheDocument();

    const editor = screen.getByLabelText("Selected question editor");
    const prompt = within(editor).getByLabelText("Question prompt");
    await user.clear(prompt);
    await user.type(prompt, "When does the conversation circle begin?");
    await user.click(within(editor).getAllByLabelText("Correct answer")[2]);
    await user.click(
      within(editor).getByRole("button", { name: "Save question revision" }),
    );

    expect(mutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bankQuestionId: "bank-one",
        expectedUpdatedAt: 10,
        content: expect.objectContaining({
          type: "single-choice",
          prompt: "When does the conversation circle begin?",
          correctChoiceKey: "c",
        }),
        illustrationMediaId: null,
        audioMediaId: null,
      }),
    );

    await user.click(
      within(editor).getByRole("button", { name: "Save review settings" }),
    );
    expect(mutationMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        expectedUpdatedAt: 11,
        status: "ready",
        fullPracticeEligible: true,
      }),
    );
  });

  it("offers the same question editor inline and in a focused popup", async () => {
    const user = userEvent.setup();
    render(<QuestionBankManager />);

    const inlineEditor = screen.getByLabelText("Selected question editor");
    expect(within(inlineEditor).getByLabelText("Question prompt")).toHaveValue(
      baseRow.content.prompt,
    );

    const openPopup = within(inlineEditor).getByRole("button", {
      name: "Open popup",
    });
    await user.click(openPopup);
    const popup = screen.getByRole("dialog", {
      name: "Edit question in a focused workspace",
    });
    expect(within(popup).getByLabelText("Question prompt")).toHaveValue(
      baseRow.content.prompt,
    );
    expect(
      within(popup).getByRole("button", {
        name: "Save question revision",
      }),
    ).toBeEnabled();

    const popupPrompt = within(popup).getByLabelText("Question prompt");
    await user.clear(popupPrompt);
    await user.type(popupPrompt, "Which detail best supports the conclusion?");
    await user.click(
      within(popup).getByRole("button", { name: "Save question revision" }),
    );
    expect(mutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bankQuestionId: "bank-one",
        expectedUpdatedAt: 10,
        content: expect.objectContaining({
          prompt: "Which detail best supports the conclusion?",
        }),
      }),
    );
    expect(
      within(popup).getByText(
        "Question revision saved. Existing attempts still use their pinned revision.",
      ),
    ).toBeVisible();

    await user.click(
      within(popup).getByRole("button", { name: "Close question popup" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(openPopup).toHaveFocus();
  });

  it("reveals the compact reviewed-audio picker when authoring Listening", async () => {
    const user = userEvent.setup();
    render(<QuestionBankManager />);

    await user.click(screen.getByRole("button", { name: "Add question" }));
    const builder = screen.getByRole("form", {
      name: "Author a bank question",
    });
    const skillSelect = Array.from(builder.querySelectorAll("select")).find(
      (select) =>
        Array.from(select.options).some(
          (option) => option.value === "listening",
        ),
    );
    expect(skillSelect).toBeDefined();
    fireEvent.change(skillSelect!, { target: { value: "listening" } });

    expect(
      within(builder).getByRole("combobox", { name: "Reviewed recording" }),
    ).toBeVisible();
    expect(within(builder).getByText(/No recording selected/)).toBeVisible();

    const audioSelect = Array.from(builder.querySelectorAll("select")).find(
      (select) =>
        Array.from(select.options).some(
          (option) => option.value === "audio-one",
        ),
    );
    expect(audioSelect).toBeDefined();
    fireEvent.change(audioSelect!, { target: { value: "audio-one" } });
    expect(
      within(builder).getByLabelText("Preview after-class-meeting.mp3"),
    ).toHaveAttribute(
      "src",
      "https://r2.mukhtada.my.id/audio/question-one.mp3",
    );
  });

  it("keeps projected Listening audio available when it is outside the newest asset page", () => {
    currentRow = {
      ...baseRow,
      skill: "listening",
      taskFamily: "listen-conversation",
      points: 35 / 47,
      audio: {
        mediaId: "audio-attached",
        publicUrl:
          "https://r2.mukhtada.my.id/assessment-audio/campus%20briefing.mp3",
        contentType: "audio/mpeg",
        durationMs: 42_000,
        description: "A coordinator briefs members before the weekly circle",
      },
    };
    render(<QuestionBankManager />);

    const editor = screen.getByLabelText("Selected question editor");
    expect(
      within(editor).getByRole("combobox", { name: "Reviewed recording" }),
    ).toHaveTextContent("campus briefing.mp3");
    expect(
      within(editor).getByLabelText("Preview campus briefing.mp3"),
    ).toHaveAttribute(
      "src",
      "https://r2.mukhtada.my.id/assessment-audio/campus%20briefing.mp3",
    );
    expect(
      within(editor).queryByText(
        "The uploaded recording is being added to the reviewed library.",
      ),
    ).not.toBeInTheDocument();
    expect(within(editor).getByText("0.74", { exact: true })).toBeVisible();
  });

  it("keeps an older projected illustration visible and labels its actual profile", () => {
    currentRow = {
      ...baseRow,
      profile: "ec-itp-level-1-aligned-v1",
      illustration: {
        mediaId: "image-attached",
        publicUrl:
          "https://r2.mukhtada.my.id/assessment-images/wetland%20map.webp",
        alt: "A wetland map marking the seasonal bird route",
        width: 1_200,
        height: 800,
      },
    };
    render(<QuestionBankManager />);

    const editor = screen.getByLabelText("Selected question editor");
    expect(
      within(editor).getByRole("button", { name: "wetland map.webp" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(editor).queryByText(
        "The uploaded illustration is being added to the reviewed library.",
      ),
    ).not.toBeInTheDocument();
    expect(
      within(editor).getByText("English Club paper-based Level 1 practice", {
        exact: true,
      }),
    ).toBeVisible();
  });

  it.each([
    {
      type: "multiple-select",
      label: "Choose every keyed response",
      content: {
        type: "multiple-select",
        prompt: "Which details support the announcement?",
        explanation: null,
        options: choiceOptions,
        selectionMin: 2,
        selectionMax: 2,
        correctChoiceKeys: ["a", "d"],
      },
    },
    {
      type: "cloze-select",
      label: "Blank count stays fixed",
      content: {
        type: "cloze-select",
        prompt: "Complete the sentence.",
        explanation: null,
        stemParts: ["The club meets ", " every Thursday."],
        gaps: [{ key: "gap-one", options: choiceOptions }],
        correctGapAnswers: [{ gapKey: "gap-one", choiceKey: "b" }],
      },
    },
    {
      type: "sentence-build",
      label: "Token count stays fixed",
      content: {
        type: "sentence-build",
        prompt: "Build the sentence.",
        explanation: null,
        tokens: choiceOptions,
        acceptedTokenOrders: [["a", "b", "c", "d"]],
      },
    },
    {
      type: "constructed-response",
      label: "Private scoring guide",
      content: {
        type: "constructed-response",
        prompt: "Write a short response to the club coordinator.",
        explanation: null,
        responseMode: "writing",
        minimumWords: 40,
        recommendedWords: 80,
        maximumCharacters: 2_000,
        preparationSeconds: null,
        responseSeconds: null,
        rubric: {
          maxPoints: 4,
          minimumWords: 40,
          targetTerms: ["meeting", "Thursday"],
          sampleResponse: "I can join the meeting on Thursday after class.",
        },
      },
    },
  ])("opens safe direct controls for $type", ({ content, label }) => {
    currentRow = {
      ...baseRow,
      content,
      itemType: content.type,
      prompt: content.prompt,
      options: "options" in content ? content.options : [],
      correctChoiceKey: null,
    };
    render(<QuestionBankManager />);

    expect(screen.getByText(label)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Save question revision" }),
    ).toBeEnabled();
  });
});
