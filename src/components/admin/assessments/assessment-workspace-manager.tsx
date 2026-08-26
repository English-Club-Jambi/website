"use client";

import { ArrowLeftIcon, CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { api } from "../../../../convex/_generated/api";
import { SelectField } from "@/components/forms/select-field";

import { useAdminSession } from "../admin-session";
import adminStyles from "../admin-shell.module.css";
import {
  AdminEmpty,
  AdminError,
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
  humanizeError,
} from "../admin-ui";
import type {
  AssessmentPublishGate,
  AssessmentReviewDecision,
  AssessmentReviewState,
  AssessmentReviewType,
} from "./assessment-admin-ui";
import { getAssessmentAdminCapabilities } from "./assessment-admin-permissions";
import styles from "./assessment-admin.module.css";
import {
  AssessmentMetadataForm,
  type AssessmentMetadataInput,
} from "./assessment-metadata-form";
import { AssessmentQuestionPoolManager } from "./assessment-question-pool-manager";
import {
  AssessmentWorkspaceView,
  type AssessmentWorkspaceModel,
} from "./assessment-workspace-view";

type Workspace = NonNullable<
  FunctionReturnType<typeof api.adminAssessments.getWorkspace>
>;
type WorkspaceDraft = NonNullable<Workspace["draft"]>;
type EditorMode = "metadata" | null;

const reviewTypes: ReadonlyArray<AssessmentReviewType> = [
  "academic",
  "rights",
  "accessibility",
  "bias",
];

const reviewLabels: Record<AssessmentReviewType, string> = {
  academic: "Academic review",
  rights: "Rights review",
  accessibility: "Accessibility review",
  bias: "Bias review",
};

const blockerCopy: Record<string, { label: string; detail: string }> = {
  "no-draft": {
    label: "Editable draft",
    detail: "This definition has no draft that can be published.",
  },
  "validation-current-passed": {
    label: "Current validation",
    detail: "The latest Convex validation has not passed for this exact revision.",
  },
  "runtime-policy-supported": {
    label: "Supported runtime policy",
    detail: "Timing, resume, or review settings fall outside the current release contract.",
  },
  "audio-replay-unlimited": {
    label: "Listening replay contract",
    detail: "Listening sections must use the supported unlimited replay policy.",
  },
  "approval-academic-current": {
    label: "Current academic approval",
    detail: "Academic approval is missing, stale, or not approved.",
  },
  "approval-rights-current": {
    label: "Current rights approval",
    detail: "Rights approval is missing, stale, or not approved.",
  },
  "approval-accessibility-current": {
    label: "Current accessibility approval",
    detail: "Accessibility approval is missing, stale, or not approved.",
  },
  "approval-bias-current": {
    label: "Current bias approval",
    detail: "Bias approval is missing, stale, or not approved.",
  },
  "academic-reviewer-independent": {
    label: "Independent academic reviewer",
    detail: "The academic reviewer must not be an author of this version.",
  },
};

function reviewsFor(workspace: Workspace, revision: number): AssessmentReviewState[] {
  return reviewTypes.map((reviewType) => {
    const review = workspace.latestApprovals.find(
      (candidate) => candidate.reviewType === reviewType,
    );
    return {
      reviewType,
      decision: review?.decision ?? "missing",
      current: review?.contentRevision === revision,
      ...(review ? { reviewerName: review.reviewerName, note: review.note } : {}),
    };
  });
}

function gatesFor(workspace: Workspace): AssessmentPublishGate[] {
  if (workspace.publishReadiness.ready) {
    return [
      {
        id: "server-readiness",
        label: "Convex publication contract",
        detail: `Revision ${workspace.publishReadiness.contentRevision ?? ""} is ready.`,
        state: "pass",
      },
    ];
  }
  return workspace.publishReadiness.blockers.map((code) => ({
    id: code,
    label: blockerCopy[code]?.label ?? "Publication contract",
    detail: blockerCopy[code]?.detail ?? code,
    state: "block" as const,
  }));
}

function modelFor(workspace: Workspace): AssessmentWorkspaceModel {
  const draft = workspace.draft;
  return {
    definition: {
      id: workspace.definition.definitionId,
      adminTitle: workspace.definition.adminTitle,
      slug: workspace.definition.slug,
      kind: workspace.definition.kind,
      profile: workspace.definition.profile,
      visibility: workspace.definition.visibility,
    },
    draft:
      draft === null
        ? null
        : {
            id: draft.versionId,
            title: draft.title,
            summary: draft.summary,
            instructions: draft.instructions,
            status: draft.status,
            timePolicy: draft.timePolicy,
            reviewPolicy: draft.reviewPolicy,
            contentRevision: draft.contentRevision,
            ...(draft.validatedRevision === null
              ? {}
              : { validatedRevision: draft.validatedRevision }),
          },
    published:
      workspace.published === null || workspace.published.version === null
        ? null
        : {
            id: workspace.published.versionId,
            version: workspace.published.version,
            title: workspace.published.title,
          },
    sections: workspace.sections.map((section) => ({
      id: section.sectionId,
      sectionKey: section.sectionKey,
      title: section.title,
      skill: section.skill,
      order: section.order,
      itemCount: section.itemCount,
      ...(section.timeLimitSeconds === null
        ? {}
        : { timeLimitSeconds: section.timeLimitSeconds }),
    })),
    reviews: draft === null ? [] : reviewsFor(workspace, draft.contentRevision),
    gates: gatesFor(workspace),
    publishReady: workspace.publishReadiness.ready,
  };
}

function metadataFor(draft: WorkspaceDraft): AssessmentMetadataInput {
  return {
    title: draft.title,
    summary: draft.summary,
    instructions: draft.instructions,
    locale: "en",
    timePolicy: draft.timePolicy === "whole-assessment" ? "per-section" : draft.timePolicy,
    allowResume: true,
    reviewPolicy: "after-submit",
    scorePolicy:
      draft.scorePolicy === "feedback-only" ? "raw-objective" : draft.scorePolicy,
    defaultTimingMode: draft.defaultTimingMode,
    defaultListeningMode: draft.defaultListeningMode,
    maxAttemptsPerDay: draft.maxAttemptsPerDay,
  };
}

function ReviewForm({
  reviewType,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  reviewType: AssessmentReviewType;
  pending: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (decision: AssessmentReviewDecision, note: string) => Promise<void> | void;
}) {
  const [decision, setDecision] = useState<AssessmentReviewDecision>("approved");
  const [note, setNote] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(decision, note.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={adminStyles.formGridWide}>
        <div className={adminStyles.spanFour}>
          <SelectField
            label="Decision"
            value={decision}
            options={[
              { value: "approved", label: "Approve current revision" },
              { value: "changes-requested", label: "Request changes" },
              { value: "rejected", label: "Reject" },
            ]}
            onValueChange={(value) => setDecision(value as AssessmentReviewDecision)}
          />
        </div>
        <label className={`${adminStyles.field} ${adminStyles.spanEight}`}>
          <span>Review note</span>
          <textarea value={note} minLength={10} maxLength={2000} required onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>
      {error ? <AdminError>{error}</AdminError> : null}
      <footer className={adminStyles.formFooter}>
        <p>{reviewLabels[reviewType]} is recorded against the current content revision.</p>
        <div className={adminStyles.buttonRow}>
          <button className={adminStyles.secondaryButton} type="button" disabled={pending} onClick={onCancel}>
            <XMarkIcon aria-hidden width={18} height={18} />
            Cancel
          </button>
          <button className={adminStyles.primaryButton} type="submit" disabled={pending}>
            <CheckCircleIcon aria-hidden width={18} height={18} />
            {pending ? "Recording…" : "Record decision"}
          </button>
        </div>
      </footer>
    </form>
  );
}

export function AssessmentWorkspaceManager({ definitionId }: { definitionId: string }) {
  const admin = useAdminSession();
  const capabilities = getAssessmentAdminCapabilities(admin.role);
  const workspace = useQuery(api.adminAssessments.getWorkspace, {
    definitionId: definitionId as Id<"assessmentDefinitions">,
  });
  const updateMetadata = useMutation(api.adminAssessments.updateMetadata);
  const validateDraft = useMutation(api.adminAssessments.validateDraft);
  const recordApproval = useMutation(api.adminAssessments.recordApproval);
  const publish = useMutation(api.adminAssessments.publish);
  const createDraftFromPublished = useMutation(api.adminAssessments.createDraftFromPublished);
  const resumeDraftClone = useMutation(api.adminAssessments.resumeDraftClone);
  const [editor, setEditor] = useState<EditorMode>(null);
  const [reviewType, setReviewType] = useState<AssessmentReviewType | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  if (workspace === undefined) {
    return <AdminLoadingRows label="Loading assessment workspace" />;
  }
  if (workspace === null) {
    return (
      <AdminEmpty
        title="Practice format not found"
        description="The format may have been removed or the link may be incomplete."
      />
    );
  }

  const currentWorkspace = workspace;
  const draft = workspace.draft;

  async function run(task: () => Promise<void>) {
    setPending(true);
    setError("");
    setStatusMessage("");
    try {
      await task();
    } catch (requestError) {
      setError(humanizeError(requestError));
    } finally {
      setPending(false);
    }
  }

  async function handleMetadata(input: AssessmentMetadataInput) {
    if (!draft) return;
    await run(async () => {
      const result = await updateMetadata({
        versionId: draft.versionId,
        expectedContentRevision: draft.contentRevision,
        ...input,
      });
      if (!result.ok) {
        throw new Error(`Revision changed to ${result.currentRevision}. Review the latest draft before saving again.`);
      }
      setEditor(null);
      setStatusMessage(`Metadata saved as revision ${result.contentRevision}.`);
    });
  }

  async function handleValidate() {
    if (!draft) return;
    await run(async () => {
      const result = await validateDraft({
        versionId: draft.versionId,
        expectedContentRevision: draft.contentRevision,
      });
      if (!result.ok) {
        throw new Error(`Revision changed to ${result.currentRevision}. Run validation against the latest draft.`);
      }
      setStatusMessage(
        result.status === "passed"
          ? `Revision ${result.contentRevision} passed automated validation.`
          : `Validation found ${result.blockingCount} blocking checks.`,
      );
    });
  }

  async function handleReview(decision: AssessmentReviewDecision, note: string) {
    if (!draft || reviewType === null) return;
    await run(async () => {
      await recordApproval({
        versionId: draft.versionId,
        expectedContentRevision: draft.contentRevision,
        reviewType,
        decision,
        note,
      });
      setStatusMessage(`${reviewLabels[reviewType]} recorded for revision ${draft.contentRevision}.`);
      setReviewType(null);
    });
  }

  async function handlePublish() {
    if (!draft) return;
    await run(async () => {
      const result = await publish({
        versionId: draft.versionId,
        expectedContentRevision: draft.contentRevision,
      });
      setStatusMessage(`Version ${result.version} published.`);
    });
  }

  async function handleCreateNextDraft() {
    await run(async () => {
      const result = await createDraftFromPublished({
        definitionId: currentWorkspace.definition.definitionId,
      });
      setStatusMessage(
        `Private version ${result.versionId} is copying from the published version.`,
      );
    });
  }

  async function handleResumeClone() {
    if (!draft) return;
    await run(async () => {
      await resumeDraftClone({ versionId: draft.versionId });
      setStatusMessage("The private draft copy has resumed. The published version remains unchanged.");
    });
  }

  return (
    <>
      <Link className={adminStyles.backLink} href="/admin/assessments">
        <ArrowLeftIcon aria-hidden width={18} height={18} />
        Practice formats
      </Link>
      <AdminPageHeading
        title="Practice format workspace"
        description="Maintain one fixed delivery blueprint: its learner-facing contract, skill quotas, eligible Question Bank pool, flag review, and release evidence."
      />

      {statusMessage ? <p className={styles.successNotice} role="status">{statusMessage}</p> : null}
      {error && editor === null && reviewType === null ? <AdminError>{error}</AdminError> : null}

      {editor === "metadata" && draft ? (
        <AdminSection title="Edit learner-facing contract" description={`Saving changes revision ${draft.contentRevision}.`}>
          <AssessmentMetadataForm
            initial={metadataFor(draft)}
            fullPractice={workspace.definition.kind === "full-practice"}
            pending={pending}
            error={error || undefined}
            onCancel={() => setEditor(null)}
            onSave={handleMetadata}
          />
        </AdminSection>
      ) : null}

      {reviewType && draft ? (
        <AdminSection title={reviewLabels[reviewType]} description={`Decision for revision ${draft.contentRevision}.`}>
          <ReviewForm
            key={reviewType}
            reviewType={reviewType}
            pending={pending}
            error={error || undefined}
            onCancel={() => setReviewType(null)}
            onSubmit={handleReview}
          />
        </AdminSection>
      ) : null}

      <AssessmentWorkspaceView
        model={modelFor(workspace)}
        canEdit={capabilities.canEdit}
        canReview={capabilities.canReview}
        canPublish={capabilities.canPublish}
        validating={pending}
        publishing={pending}
        onValidate={draft && capabilities.canEdit ? () => void handleValidate() : undefined}
        onEditMetadata={draft && capabilities.canEdit ? () => setEditor("metadata") : undefined}
        onOpenReview={draft && capabilities.canReview ? setReviewType : undefined}
        onPublish={draft && capabilities.canPublish ? () => void handlePublish() : undefined}
        onCreateNextDraft={!draft && workspace.published && capabilities.canEdit ? () => void handleCreateNextDraft() : undefined}
        onResumeClone={draft && ["cloning", "clone-failed"].includes(draft.status) && capabilities.canEdit ? () => void handleResumeClone() : undefined}
      />
      <AssessmentQuestionPoolManager
        definitionId={workspace.definition.definitionId}
        canEdit={capabilities.canEdit}
        canReview={capabilities.canReview}
      />
    </>
  );
}
