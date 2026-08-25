import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AssessmentCatalogView,
  AssessmentMediaStateView,
  AssessmentReviewRail,
  type AssessmentPublishGate,
  type AssessmentReviewState,
} from "@/components/admin/assessments/assessment-admin-ui";
import {
  AssessmentWorkspaceView,
  type AssessmentWorkspaceModel,
} from "@/components/admin/assessments/assessment-workspace-view";

afterEach(cleanup);

const approvals: AssessmentReviewState[] = [
  "academic",
  "rights",
  "accessibility",
  "bias",
].map((reviewType) => ({
  reviewType: reviewType as AssessmentReviewState["reviewType"],
  decision: "approved",
  current: true,
  reviewerName: "Assigned reviewer",
}));

const passingGates: AssessmentPublishGate[] = [
  {
    id: "blueprint",
    label: "Blueprint complete",
    detail: "The current section and item counts match the selected profile.",
    state: "pass",
  },
  {
    id: "media",
    label: "Media ready",
    detail: "Every referenced delivery asset passed R2 verification.",
    state: "pass",
  },
];

const workspaceBase: AssessmentWorkspaceModel = {
  definition: {
    id: "definition-a",
    adminTitle: "Weekly reading practice",
    slug: "weekly-reading-practice",
    kind: "skill-quiz",
    profile: "ec-itp-level-1-aligned-v1",
    visibility: "published",
  },
  draft: null,
  published: { id: "published-a", version: 1, title: "Weekly reading practice" },
  sections: [],
  reviews: [],
  gates: [],
  publishReady: false,
};

describe("assessment admin views", () => {
  it("renders an honest empty catalog without synthetic production rows", () => {
    render(<AssessmentCatalogView entries={[]} />);

    expect(
      screen.getByText("No assessment definitions in this view"),
    ).toBeVisible();
    expect(screen.queryByText(/sample|placeholder|voice 01/i)).not.toBeInTheDocument();
  });

  it("enables publication only for the validated revision and four current approvals", async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();
    const { rerender } = render(
      <AssessmentReviewRail
        contentRevision={8}
        validatedRevision={7}
        reviews={approvals}
        gates={passingGates}
        serverReady={false}
        canReview
        canPublish
        publishing={false}
        onPublish={onPublish}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Publish this revision" }),
    ).toBeDisabled();
    expect(screen.getByText("Stale")).toBeVisible();

    rerender(
      <AssessmentReviewRail
        contentRevision={8}
        validatedRevision={8}
        reviews={approvals}
        gates={passingGates}
        serverReady
        canReview
        canPublish
        publishing={false}
        onPublish={onPublish}
      />,
    );

    const publish = screen.getByRole("button", {
      name: "Publish this revision",
    });
    expect(publish).toBeEnabled();
    await user.click(publish);
    expect(onPublish).toHaveBeenCalledOnce();
  });

  it("distinguishes private drafts from public R2 derivatives", () => {
    render(
      <AssessmentMediaStateView
        assets={[
          {
            id: "private-audio",
            name: "Listening delivery draft",
            purpose: "assessment-audio",
            status: "pending",
            access: "assessment-private",
            byteSize: 1_200_000,
            durationMs: 92_000,
            updatedAt: Date.UTC(2026, 7, 25),
          },
          {
            id: "public-image",
            name: "Reading diagram delivery",
            purpose: "assessment-image",
            status: "ready",
            access: "public",
            byteSize: 220_000,
            updatedAt: Date.UTC(2026, 7, 25),
          },
        ]}
      />,
    );

    expect(screen.getByText("Private draft")).toBeVisible();
    expect(screen.getByText("Public derivative")).toBeVisible();
    expect(screen.getByText(/1:32/)).toBeVisible();
  });

  it("creates the next private draft without offering published-version editing", async () => {
    const user = userEvent.setup();
    const onCreateNextDraft = vi.fn();
    render(
      <AssessmentWorkspaceView
        model={workspaceBase}
        canEdit
        canReview={false}
        canPublish={false}
        validating={false}
        publishing={false}
        onCreateNextDraft={onCreateNextDraft}
      />,
    );

    expect(screen.queryByRole("button", { name: "Edit metadata" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create next draft" }));
    expect(onCreateNextDraft).toHaveBeenCalledOnce();
  });

  it("surfaces clone failure recovery while keeping authoring closed", async () => {
    const user = userEvent.setup();
    const onResumeClone = vi.fn();
    render(
      <AssessmentWorkspaceView
        model={{
          ...workspaceBase,
          draft: {
            id: "draft-b",
            title: "Weekly reading practice",
            summary: "A carefully reviewed reading set.",
            instructions: "Read each text before choosing an answer.",
            status: "clone-failed",
            timePolicy: "untimed",
            reviewPolicy: "after-submit",
            contentRevision: 1,
          },
        }}
        canEdit
        canReview={false}
        canPublish={false}
        validating={false}
        publishing={false}
        onResumeClone={onResumeClone}
      />,
    );

    expect(screen.getByText("Draft copy needs attention")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Edit metadata" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume draft copy" }));
    expect(onResumeClone).toHaveBeenCalledOnce();
  });

  it("disables section movement at bounds and protects non-empty deletion", () => {
    render(
      <AssessmentWorkspaceView
        model={{
          ...workspaceBase,
          definition: { ...workspaceBase.definition, visibility: "draft" },
          draft: {
            id: "draft-c",
            title: "Weekly reading practice",
            summary: "A carefully reviewed reading set.",
            instructions: "Read each text before choosing an answer.",
            status: "draft",
            timePolicy: "untimed",
            reviewPolicy: "after-submit",
            contentRevision: 2,
          },
          sections: [
            {
              id: "section-one",
              sectionKey: "reading-one",
              title: "Reading foundations",
              skill: "reading",
              order: 0,
              itemCount: 3,
              href: "/admin/assessments/definition-a/sections/section-one",
            },
            {
              id: "section-two",
              sectionKey: "reading-two",
              title: "Reading detail",
              skill: "reading",
              order: 1,
              itemCount: 0,
              href: "/admin/assessments/definition-a/sections/section-two",
            },
          ],
        }}
        canEdit
        canReview={false}
        canPublish={false}
        validating={false}
        publishing={false}
        onMoveSection={vi.fn()}
        onDeleteSection={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Move Reading foundations up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Reading detail down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove Reading foundations" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove Reading detail" })).toBeEnabled();
  });
});
