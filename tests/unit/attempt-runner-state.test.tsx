import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "../../convex/_generated/dataModel";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  phase: "question" as "question" | "section-ready",
  resolvedAttemptId: "assessmentattempt00000000001" as string | null,
  queryNames: [] as string[],
  transcriptEnabled: false,
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
            title: "Listening",
            skill: "listening",
            order: 0,
            totalSections: 3,
            instructions: "Listen and choose.",
          },
          item: {
            id: "assessmentitem00000000000001",
            type: "single-choice",
            prompt: "What does the speaker plan to do?",
            required: true,
            options: [
              { key: "a", label: "Meet the group" },
              { key: "b", label: "Leave the room" },
            ],
          },
          stimulus: {
            id: "assessmentstimulus0000000001",
            kind: "audio",
            title: "Conversation",
            body: null,
            mediaUrl: null,
            transcript: mocks.transcriptEnabled ? "Let us meet the group after class." : null,
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
            itemCount: 1,
            canGoBack: false,
            canGoNext: false,
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
      return vi.fn(async () => ({ ok: true, revision: 4, savedAt: Date.now() }));
    },
  };
});

import { getPublicContentDefaults } from "@content/public-content";
import { AttemptRunner } from "@/components/practice/attempt-runner";
import { PracticeProvider } from "@/components/practice/practice-provider";

const copy = getPublicContentDefaults("practice");
const attemptId = "assessmentattempt00000000001" as Id<"assessmentAttempts">;

afterEach(() => {
  cleanup();
  mocks.phase = "question";
  mocks.resolvedAttemptId = "assessmentattempt00000000001";
  mocks.queryNames.length = 0;
  mocks.transcriptEnabled = false;
  mocks.enableTranscript.mockClear();
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
});
