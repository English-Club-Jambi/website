import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "../../convex/_generated/dataModel";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticated: false,
  signIn: vi.fn(async () => undefined),
  start: vi.fn(async () => ({
    attemptId: "assessmentattempt00000000001",
    status: "in-progress" as const,
    firstSectionOrder: 0,
  })),
  push: vi.fn(),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: mocks.signIn }),
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: mocks.authenticated, isLoading: false }),
  useMutation: () => mocks.start,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

import { getPublicContentDefaults } from "@content/public-content";
import { StartAssessment } from "@/components/practice/start-assessment";
import type { PublishedAssessment } from "@/lib/assessment";

const copy = getPublicContentDefaults("practice");
const assessment = {
  definitionId: "assessmentdefinition000000001" as Id<"assessmentDefinitions">,
  versionId: "assessmentversion000000000001" as Id<"assessmentVersions">,
  slug: "full-practice",
  kind: "full-practice",
  title: "English Club full practice",
  summary: "A sustained original form.",
  instructions: "Read each section introduction.",
  locale: "en",
  skills: ["listening", "structure", "reading"],
  timePolicy: "per-section",
  approximateMinutes: 115,
  reviewPolicy: "after-submit",
  scorePolicy: "raw-objective",
  defaultTimingMode: "standard",
  defaultListeningMode: "audio-primary",
} satisfies PublishedAssessment;

afterEach(() => {
  cleanup();
  mocks.authenticated = false;
  mocks.signIn.mockClear();
  mocks.start.mockClear();
  mocks.push.mockClear();
});

describe("StartAssessment", () => {
  it("creates Anonymous Convex Auth only after the acknowledged Start press", async () => {
    const user = userEvent.setup();
    const view = render(<StartAssessment assessment={assessment} copy={copy} />);

    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: copy.startButton }));

    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith("anonymous"));
    expect(mocks.start).not.toHaveBeenCalled();
    mocks.authenticated = true;
    view.rerender(<StartAssessment assessment={assessment} copy={copy} />);
    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    expect(mocks.push).toHaveBeenCalledWith(
      "/practice/attempt/assessmentattempt00000000001",
    );
  });

  it("does not create another identity when the same-device session is authenticated", async () => {
    mocks.authenticated = true;
    const user = userEvent.setup();
    render(<StartAssessment assessment={assessment} copy={copy} />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: copy.startButton }));

    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
});
