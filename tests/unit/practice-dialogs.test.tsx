import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getPublicContentDefaults } from "@content/public-content";
import {
  FinishDialog,
  QuestionNavigator,
} from "@/components/practice/attempt-runner";
import { PracticeProvider } from "@/components/practice/practice-provider";
import type { AttemptPlayer } from "@/components/practice/question-renderer";
import type { Id } from "../../convex/_generated/dataModel";

const copy = getPublicContentDefaults("practice");

const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
const closeModal = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});

const player = {
  attemptId: "assessmentattempt00000000001" as Id<"assessmentAttempts">,
  status: "in-progress",
  timingMode: "standard",
  listeningMode: "audio-primary",
  sectionDeadlineAt: Date.now() + 60_000,
  saveStateVersion: 3,
  responseRevision: 0,
  section: {
    id: "assessmentsection000000000001" as Id<"assessmentSections">,
    title: "Listening",
    skill: "listening",
    order: 0,
    totalSections: 3,
    instructions: "Listen and choose one answer.",
  },
  item: {
    id: "assessmentitem00000000000001" as Id<"assessmentItems">,
    type: "single-choice",
    prompt: "What does the speaker mean?",
    required: true,
    options: [
      { key: "a", label: "They will meet later." },
      { key: "b", label: "They met yesterday." },
    ],
  },
  stimulus: null,
  response: null,
  flagged: false,
  itemStates: [
    {
      itemId: "assessmentitem00000000000001" as Id<"assessmentItems">,
      itemOrder: 0,
      answered: false,
      flagged: false,
      current: true,
    },
    {
      itemId: "assessmentitem00000000000002" as Id<"assessmentItems">,
      itemOrder: 1,
      answered: true,
      flagged: false,
      current: false,
    },
    {
      itemId: "assessmentitem00000000000003" as Id<"assessmentItems">,
      itemOrder: 2,
      answered: false,
      flagged: true,
      current: false,
    },
  ],
  navigation: {
    itemOrder: 0,
    itemCount: 3,
    canGoBack: false,
    canGoNext: true,
  },
} satisfies AttemptPlayer;

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: showModal,
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: closeModal,
  });
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  showModal.mockClear();
  closeModal.mockClear();
});

function NavigatorHarness({ onMove }: { onMove: (order: number) => Promise<boolean> }) {
  const launcherRef = useRef<HTMLButtonElement>(null);
  return (
    <PracticeProvider copy={copy}>
      <QuestionNavigator player={player} launcherRef={launcherRef} onMove={onMove} />
    </PracticeProvider>
  );
}

function FinishHarness() {
  const launcherRef = useRef<HTMLButtonElement>(null);
  return (
    <PracticeProvider copy={copy}>
      <FinishDialog
        player={player}
        launcherRef={launcherRef}
        lastSection={false}
        busy={false}
        onConfirm={vi.fn(async () => undefined)}
      />
    </PracticeProvider>
  );
}

describe("practice runner dialogs at phone width", () => {
  it("uses a modal navigator, locks background scroll, and restores launcher focus", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    const user = userEvent.setup();
    const onMove = vi.fn(async () => true);
    render(<NavigatorHarness onMove={onMove} />);

    const launcher = screen.getByRole("button", { name: copy.openNavigator });
    await user.click(launcher);

    const dialog = screen.getByRole("dialog", { name: copy.openNavigator });
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("open");
    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));
    expect(screen.getByRole("button", { name: /Question 2: Answered/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: copy.closeNavigator }));
    expect(screen.queryByRole("dialog", { name: copy.openNavigator })).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(launcher).toHaveFocus();
  });

  it("keeps the finish boundary modal and returns focus without leaving a scroll lock", async () => {
    const user = userEvent.setup();
    render(<FinishHarness />);

    const launcher = screen.getByRole("button", { name: copy.reviewSection });
    await user.click(launcher);
    const dialog = screen.getByRole("dialog", { name: copy.finishSectionTitle });
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("open");
    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));

    await user.click(screen.getByRole("button", { name: copy.returnQuestions }));
    expect(document.body.style.overflow).toBe("");
    expect(launcher).toHaveFocus();
  });
});
