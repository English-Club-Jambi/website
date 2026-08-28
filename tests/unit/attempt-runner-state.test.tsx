import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "../../convex/_generated/dataModel";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  phase: "question" as "question" | "section-ready",
  resolvedAttemptId: "assessmentattempt00000000001" as string | null,
  queryNames: [] as string[],
  transcriptEnabled: false,
  itemCount: 1,
  playerMode: "listening" as "listening" | "writing",
  audioMode: "generated" as "generated" | "legacy" | "top-level",
  illustrationVisible: false,
  saveResponse: vi.fn(
    async (args: { expectedClientRevision: number }) => ({
      ok: true as const,
      revision: args.expectedClientRevision + 1,
      savedAt: Date.now(),
    }),
  ),
  move: vi.fn(async (args: { expectedRevision: number }) => ({
    ok: true as const,
    revision: args.expectedRevision + 1,
  })),
  enableTranscript: vi.fn(async (args: unknown) => {
    void args;
    return { ok: true as const, revision: 4 };
  }),
}));

vi.mock("@convex-dev/auth/react", () => ({
  ConvexAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("convex/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("convex/react")>();
  const { getFunctionName } = await import("convex/server");
  return {
    ...actual,
    ConvexReactClient: class MockConvexReactClient {},
    useQuery: (reference: Parameters<typeof getFunctionName>[0], args: unknown) => {
      if (args === "skip") return undefined;
      const name = getFunctionName(reference);
      mocks.queryNames.push(name);
      if (name === "assessmentAttempts:resolveMine") {
        return mocks.resolvedAttemptId === null
          ? null
          : {
              attemptId: mocks.resolvedAttemptId,
              status: "in-progress",
            };
      }
      if (name === "assessmentAttempts:getAttemptState") {
        if (mocks.phase === "section-ready") {
          return {
            phase: "section-ready",
            attemptId: "assessmentattempt00000000001",
            status: "section-review",
            revision: 4,
            resultId: null,
            section: {
              id: "assessmentsection000000000002",
              title: "Structure and Written Expression",
              skill: "structure",
              order: 1,
              totalSections: 3,
              itemCount: 40,
              instructions: "Read each sentence before choosing.",
              deadlineAt: null,
            },
          };
        }
        return {
          phase: "question",
          attemptId: "assessmentattempt00000000001",
          status: "in-progress",
          revision: mocks.transcriptEnabled ? 4 : 3,
          resultId: null,
          section: {
            id: "assessmentsection000000000001",
            title: "Listening",
            skill: "listening",
            order: 0,
            totalSections: 3,
            itemCount: 1,
            instructions: "Listen and choose.",
            deadlineAt: Date.now() - 1_000,
          },
        };
      }
      if (name === "assessmentAttempts:getPlayer") {
        const writing = mocks.playerMode === "writing";
        return {
          attemptId: "assessmentattempt00000000001",
          status: "in-progress",
          timingMode: "standard",
          listeningMode: mocks.transcriptEnabled ? "transcript-supported" : "audio-primary",
          sectionDeadlineAt: Date.now() - 1_000,
          saveStateVersion: mocks.transcriptEnabled ? 4 : 3,
          responseRevision: 0,
          section: {
            id: "assessmentsection000000000001",
            title: writing ? "Writing" : "Listening",
            skill: writing ? "writing" : "listening",
            order: 0,
            totalSections: 3,
            instructions: writing ? "Write a clear response." : "Listen and choose.",
          },
          item: writing
            ? {
                id: "assessmentitem00000000000001",
                type: "constructed-response",
                prompt: "Explain one practical way to welcome a new member.",
                required: true,
                responseMode: "writing",
                minimumWords: 20,
                recommendedWords: 45,
                maximumCharacters: 1_500,
              }
            : {
                id: "assessmentitem00000000000001",
                type: "single-choice",
                prompt: "What does the speaker plan to do?",
                required: true,
                options: [
                  { key: "a", label: "Meet the group" },
                  { key: "b", label: "Leave the room" },
                ],
              },
          illustration: mocks.illustrationVisible
            ? {
                mediaId: "media00000000000000000000001",
                publicUrl:
                  "https://r2.mukhtada.my.id/assessments/question-illustration.webp",
                alt: "Learners comparing notes around a table",
                width: 1_200,
                height: 800,
              }
            : null,
          audio:
            !writing && mocks.audioMode === "top-level"
              ? {
                  mediaId: "media00000000000000000000002",
                  publicUrl:
                    "https://r2.mukhtada.my.id/assessments/question-recording.mp3",
                  contentType: "audio/mpeg",
                  durationMs: 8_200,
                  description: "Question recording",
                }
              : null,
          stimulus: writing
            ? null
            : {
                id: "assessmentstimulus0000000001",
                kind: "audio",
                title: "Conversation",
                body: null,
                mediaUrl:
                  mocks.audioMode === "legacy" || mocks.audioMode === "top-level"
                    ? "https://r2.mukhtada.my.id/assessments/legacy-stimulus.mp3"
                    : null,
                transcript: mocks.transcriptEnabled
                  ? "Let us meet the group after class."
                  : null,
                alt: null,
              },
          response: null,
          flagged: false,
          itemStates: [
            {
              itemId: "assessmentitem00000000000001",
              itemOrder: 0,
              answered: false,
              flagged: false,
              current: true,
            },
          ],
          navigation: {
            itemOrder: 0,
            itemCount: mocks.itemCount,
            canGoBack: false,
            canGoNext: mocks.itemCount > 1,
          },
        };
      }
      return undefined;
    },
    useMutation: (reference: Parameters<typeof getFunctionName>[0]) => {
      const name = getFunctionName(reference);
      if (name === "assessmentAttempts:enableTranscript") {
        return async (args: unknown) => {
          const result = await mocks.enableTranscript(args);
          mocks.transcriptEnabled = true;
          return result;
        };
      }
      if (name === "assessmentAttempts:move") {
        return mocks.move;
      }
      if (name === "assessmentAttempts:saveResponse") {
        return mocks.saveResponse;
      }
      return vi.fn(async () => ({ ok: true, revision: 4, savedAt: Date.now() }));
    },
  };
});

import { getPublicContentDefaults } from "@content/public-content";
import { AttemptRunner } from "@/components/practice/attempt-runner";
import { PracticeProvider } from "@/components/practice/practice-provider";

const copy = getPublicContentDefaults("practice");
const attemptId = "assessmentattempt00000000001" as Id<"assessmentAttempts">;

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mocks.phase = "question";
  mocks.resolvedAttemptId = "assessmentattempt00000000001";
  mocks.queryNames.length = 0;
  mocks.transcriptEnabled = false;
  mocks.itemCount = 1;
  mocks.playerMode = "listening";
  mocks.audioMode = "generated";
  mocks.illustrationVisible = false;
  mocks.enableTranscript.mockClear();
  mocks.move.mockClear();
  mocks.saveResponse.mockClear();
});

function Runner() {
  return (
    <PracticeProvider deploymentUrl="https://example.convex.cloud" copy={copy}>
      <AttemptRunner attemptId={attemptId} />
    </PracticeProvider>
  );
}

describe("AttemptRunner reactive boundaries", () => {
  it("rejects a malformed route id before issuing a Convex query", () => {
    render(
      <PracticeProvider deploymentUrl="https://example.convex.cloud" copy={copy}>
        <AttemptRunner attemptId="not-an-id" />
      </PracticeProvider>,
    );
    expect(
      screen.getByRole("heading", { name: copy.sessionUnavailableTitle }),
    ).toBeVisible();
  });

  it("renders a friendly state when a plausible route id cannot be normalized", () => {
    mocks.resolvedAttemptId = null;
    render(
      <PracticeProvider deploymentUrl="https://example.convex.cloud" copy={copy}>
        <AttemptRunner attemptId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" />
      </PracticeProvider>,
    );
    expect(
      screen.getByRole("heading", { name: copy.sessionUnavailableTitle }),
    ).toBeVisible();
    expect(screen.queryByText("What does the speaker plan to do?")).toBeNull();
    expect(mocks.queryNames).toContain("assessmentAttempts:resolveMine");
    expect(mocks.queryNames).not.toContain("assessmentAttempts:getAttemptState");
  });

  it("leaves an expired question when the server advances to the next section boundary", () => {
    const { rerender } = render(<Runner />);
    expect(screen.getByRole("heading", { name: "What does the speaker plan to do?" })).toBeVisible();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(`${copy.timeLeft} 0:00`)).toBeVisible();

    mocks.phase = "section-ready";
    rerender(<Runner />);

    expect(screen.queryByText("What does the speaker plan to do?")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Structure and Written Expression" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: copy.beginSection })).toBeEnabled();
  });

  it("records transcript support before revealing text and carries the new revision", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Runner />);

    await user.click(screen.getByRole("button", { name: copy.switchTranscript }));
    await waitFor(() =>
      expect(mocks.enableTranscript).toHaveBeenCalledWith({
        attemptId,
        expectedRevision: 3,
      }),
    );

    rerender(<Runner />);
    expect(screen.getByText("Let us meet the group after class.")).toBeVisible();
    expect(screen.queryByRole("button", { name: copy.switchTranscript })).toBeNull();
  });

  it("carries a successful navigation revision into the next rapid move", async () => {
    mocks.itemCount = 3;
    const user = userEvent.setup();
    render(<Runner />);
    const next = screen.getByRole("button", { name: copy.next });

    await user.click(next);
    await user.click(next);

    await waitFor(() => expect(mocks.move).toHaveBeenCalledTimes(2));
    expect(mocks.move.mock.calls.map(([args]) => args.expectedRevision)).toEqual([
      3,
      4,
    ]);
  });

  it("keeps the Writing field focused while a complete sentence is autosaved", async () => {
    mocks.playerMode = "writing";
    const user = userEvent.setup();
    render(<Runner />);
    const response = screen.getByRole("textbox", { name: copy.responseLabel });
    const sentence =
      "I would greet the new member, explain the activity, and invite one easy first response.";

    await user.click(response);
    await user.type(response, sentence);

    expect(response).toHaveFocus();
    expect(response).toHaveValue(sentence);
    await waitFor(() => expect(mocks.saveResponse).toHaveBeenCalledTimes(1));
    expect(mocks.saveResponse.mock.calls[0]?.[0]).toMatchObject({
      expectedClientRevision: 0,
      response: { kind: "text", text: sentence },
    });
    await waitFor(() =>
      expect(screen.getByText(copy.saved, { exact: true })).toBeVisible(),
    );
  });

  it("renders one pinned Question Bank recording and suppresses the legacy stimulus duplicate", () => {
    mocks.audioMode = "top-level";
    const { container } = render(<Runner />);

    const audio = container.querySelectorAll("audio");
    expect(audio).toHaveLength(1);
    expect(container.querySelectorAll("[data-practice-audio-player]")).toHaveLength(1);
    expect(audio[0]).toHaveAttribute("data-practice-audio-engine");
    expect(audio[0]).not.toHaveAttribute("controls");
    expect(audio[0]).not.toHaveAttribute("autoplay");
    expect(audio[0]).toHaveAttribute(
      "src",
      "https://r2.mukhtada.my.id/assessments/question-recording.mp3",
    );
    expect(container.innerHTML).not.toContain("legacy-stimulus.mp3");
    expect(screen.getByText("Question recording")).toBeVisible();
  });

  it("retains the legacy stimulus audio fallback when a manifest has no pinned recording", () => {
    mocks.audioMode = "legacy";
    const { container } = render(<Runner />);

    const audio = container.querySelectorAll("audio");
    expect(audio).toHaveLength(1);
    expect(container.querySelectorAll("[data-practice-audio-player]")).toHaveLength(1);
    expect(audio[0]).toHaveAttribute("data-practice-audio-engine");
    expect(audio[0]).not.toHaveAttribute("controls");
    expect(audio[0]).toHaveAttribute(
      "src",
      "https://r2.mukhtada.my.id/assessments/legacy-stimulus.mp3",
    );
  });

  it("renders an optional Question Bank illustration only when the manifest pins it", () => {
    const first = render(<Runner />);
    expect(
      screen.queryByRole("img", { name: "Learners comparing notes around a table" }),
    ).toBeNull();
    first.unmount();

    mocks.illustrationVisible = true;
    render(<Runner />);
    expect(
      screen.getByRole("img", { name: "Learners comparing notes around a table" }),
    ).toBeVisible();
  });
});
