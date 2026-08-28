import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildCursorPaginationItems,
  QuestionBankManager,
} from "@/components/admin/assessments/question-bank-manager";

const useQueryMock = vi.fn();
const mutationMock = vi.fn();
const confirmMock = vi.fn();

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
  useAdminSession: () => ({ role: "owner" }),
}));

vi.mock("@/components/admin/admin-confirm-dialog", () => ({
  useAdminConfirm: () => confirmMock,
}));

vi.mock("@/components/forms/select-field", () => ({
  SelectField: ({
    label,
    value,
    options = [],
    groups = [],
    onValueChange,
    disabled,
  }: {
    label: string;
    value?: string;
    options?: ReadonlyArray<{ value: string; label: string }>;
    groups?: ReadonlyArray<{
      label: string;
      options: ReadonlyArray<{ value: string; label: string }>;
    }>;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
  }) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.currentTarget.value)}
      >
        {[...options, ...groups.flatMap((group) => group.options)].map(
          (option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ),
        )}
      </select>
    </label>
  ),
}));

const choices = [
  { key: "a", label: "First answer" },
  { key: "b", label: "Second answer" },
  { key: "c", label: "Third answer" },
  { key: "d", label: "Fourth answer" },
];

function makeRow(page: number) {
  return {
    bankQuestionId: `bank-${page}`,
    bankKey: `seed/bank-${page}`,
    skill: "reading",
    taskFamily: "read-daily-life",
    difficulty: "developing",
    status: "ready",
    profile: "ec-ibt-style-2026-v1",
    fullPracticeEligible: false,
    origin: "assessment-source",
    illustration: null,
    audio: null,
    dependency: null,
    content: {
      type: "single-choice",
      prompt: `Question on page ${page}`,
      explanation: "A short private explanation.",
      options: choices,
      correctChoiceKey: "b",
    },
    tags: ["pagination"],
    prompt: `Question on page ${page}`,
    itemType: "single-choice",
    options: choices,
    correctChoiceKey: "b",
    explanation: "A short private explanation.",
    points: 1,
    sourceDefinitionId: "definition-one",
    sourceVersionId: "version-one",
    sourceSectionId: "section-one",
    sourceItemId: `item-${page}`,
    sourceTitle: "Pagination source",
    sourceVisibility: "published",
    usageCount: 0,
    usageCountCapped: false,
    seedBatch: "development",
    updatedAt: page,
  } as const;
}

let firstPageIsTerminal = false;
let deletionTerminalPage: 2 | 3 = 3;
let deletedPage: number | null = null;
const listRequests: Array<Record<string, unknown>> = [];

function pageForCursor(cursor: unknown) {
  if (cursor === "cursor-1") {
    return {
      page: deletedPage === 2 ? [] : [makeRow(2)],
      isDone: deletionTerminalPage === 2 || deletedPage === 3,
      continueCursor:
        deletionTerminalPage === 2 || deletedPage === 3 ? "" : "cursor-2",
    };
  }
  if (cursor === "cursor-2") {
    return {
      page: deletedPage === 3 ? [] : [makeRow(3)],
      isDone: true,
      continueCursor: "",
    };
  }
  return {
    page: [makeRow(1)],
    isDone: firstPageIsTerminal || deletedPage === 2,
    continueCursor: firstPageIsTerminal || deletedPage === 2 ? "" : "cursor-1",
  };
}

beforeEach(() => {
  firstPageIsTerminal = false;
  deletionTerminalPage = 3;
  deletedPage = null;
  listRequests.length = 0;
  mutationMock.mockReset();
  mutationMock.mockResolvedValue({ ok: true, updatedAt: 2 });
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(false);
  useQueryMock.mockImplementation(
    (_reference: unknown, args: Record<string, unknown> | undefined) => {
      if (args?.purpose) {
        return { page: [], isDone: true, continueCursor: "" };
      }
      if (args?.status) {
        listRequests.push(args);
        const pagination = args.paginationOpts as { cursor: unknown };
        return pageForCursor(pagination.cursor);
      }
      return {
        total: 3,
        capped: false,
        ready: 3,
        eligible: 3,
        bySkill: [
          { skill: "listening", count: 50 },
          { skill: "structure", count: 40 },
          { skill: "reading", count: 50 },
        ],
      };
    },
  );
});

afterEach(() => cleanup());

describe("Question Bank cursor pagination", () => {
  it("opens pages 1, 2, and 3, then reuses the exact cursor history backwards", async () => {
    const user = userEvent.setup();
    render(<QuestionBankManager />);
    const pagination = screen.getByRole("navigation", {
      name: "Question bank pages",
    });

    expect(
      within(pagination).getByRole("button", {
        name: "Page 1, current page",
      }),
    ).toHaveAttribute("aria-current", "page");
    await user.click(
      within(pagination).getByRole("button", { name: "Go to page 2" }),
    );
    expect(listRequests.at(-1)?.paginationOpts).toMatchObject({
      cursor: "cursor-1",
    });

    await user.click(
      within(pagination).getByRole("button", { name: "Go to page 3" }),
    );
    expect(listRequests.at(-1)?.paginationOpts).toMatchObject({
      cursor: "cursor-2",
    });
    expect(
      within(pagination).getByRole("button", {
        name: "Page 3, current page",
      }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(pagination).getByRole("button", { name: "Next" }),
    ).toBeDisabled();

    await user.click(
      within(pagination).getByRole("button", { name: "Previous" }),
    );
    expect(listRequests.at(-1)?.paginationOpts).toMatchObject({
      cursor: "cursor-1",
    });
    expect(
      within(pagination).getByRole("button", { name: "Go to page 3" }),
    ).toBeVisible();

    await user.click(
      within(pagination).getByRole("button", { name: "Go to page 1" }),
    );
    expect(listRequests.at(-1)?.paginationOpts).toMatchObject({ cursor: null });
  });

  it("resets the cursor history and current page when a catalogue filter changes", async () => {
    const user = userEvent.setup();
    render(<QuestionBankManager />);

    await user.click(screen.getByRole("button", { name: "Go to page 2" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Skill" }),
      "listening",
    );

    expect(
      screen.getByRole("button", { name: "Page 1, current page" }),
    ).toHaveAttribute("aria-current", "page");
    expect(listRequests.at(-1)).toMatchObject({
      skill: "listening",
      paginationOpts: { cursor: null },
    });
  });

  it("shows one truthful terminal page without inventing a next page", () => {
    firstPageIsTerminal = true;
    render(<QuestionBankManager />);

    const pagination = screen.getByRole("navigation", {
      name: "Question bank pages",
    });
    expect(
      within(pagination).getByRole("button", {
        name: "Page 1, current page",
      }),
    ).toBeVisible();
    expect(
      within(pagination).queryByRole("button", { name: "Go to page 2" }),
    ).not.toBeInTheDocument();
    expect(
      within(pagination).getByRole("button", { name: "Previous" }),
    ).toBeDisabled();
    expect(
      within(pagination).getByRole("button", { name: "Next" }),
    ).toBeDisabled();
  });

  it("keeps a bounded numbered window for long cursor histories", () => {
    expect(buildCursorPaginationItems(50, 100)).toEqual([
      1,
      "gap",
      49,
      50,
      51,
      "gap",
      100,
    ]);
    expect(buildCursorPaginationItems(50, 100)).toHaveLength(7);
    expect(buildCursorPaginationItems(3, 3)).toEqual([1, 2, 3]);
  });

  it.each([2, 3] as const)(
    "drops page %i and later cursors after deleting its sole terminal question",
    async (terminalPage) => {
      deletionTerminalPage = terminalPage;
      const user = userEvent.setup();
      mutationMock.mockImplementation(async (args: Record<string, unknown>) => {
        if ("bankQuestionId" in args && "expectedUpdatedAt" in args) {
          deletedPage = Number(String(args.bankQuestionId).split("-").at(-1));
          return { ok: true, deletedBankQuestionId: args.bankQuestionId };
        }
        return { ok: true, updatedAt: 2 };
      });
      confirmMock.mockImplementation(
        async (_request: unknown, execute?: () => Promise<void>) => {
          await execute?.();
          return true;
        },
      );
      render(<QuestionBankManager />);

      await user.click(screen.getByRole("button", { name: "Go to page 2" }));
      if (terminalPage === 3) {
        await user.click(screen.getByRole("button", { name: "Go to page 3" }));
      }
      await user.click(screen.getByRole("button", { name: "Delete question" }));

      expect(
        screen.getByRole("button", {
          name: `Page ${terminalPage - 1}, current page`,
        }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        screen.queryByRole("button", { name: `Go to page ${terminalPage}` }),
      ).not.toBeInTheDocument();
      expect(listRequests.at(-1)?.paginationOpts).toMatchObject({
        cursor: terminalPage === 2 ? null : "cursor-1",
      });
    },
  );
});
