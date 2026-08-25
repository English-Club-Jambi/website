"use client";

import {
  ArrowPathIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

import {
  AdminEmpty,
  AdminStatus,
} from "@/components/admin/admin-ui";

import adminStyles from "../admin-shell.module.css";
import styles from "./assessment-admin.module.css";
import {
  AssessmentReviewRail,
  type AssessmentKind,
  type AssessmentPublishGate,
  type AssessmentReviewState,
  type AssessmentReviewType,
  type AssessmentVersionStatus,
  type AssessmentVisibility,
} from "./assessment-admin-ui";

export type AssessmentWorkspaceSection = {
  id: string;
  sectionKey: string;
  title: string;
  skill: "listening" | "structure" | "reading" | "writing" | "speaking";
  order: number;
  itemCount: number;
  timeLimitSeconds?: number;
};

export type AssessmentWorkspaceModel = {
  definition: {
    id: string;
    adminTitle: string;
    slug: string;
    kind: AssessmentKind;
    profile: string;
    visibility: AssessmentVisibility;
  };
  draft: null | {
    id: string;
    title: string;
    summary: string;
    instructions: string;
    status: AssessmentVersionStatus;
    timePolicy: "untimed" | "whole-assessment" | "per-section";
    reviewPolicy: "none" | "after-section" | "after-submit";
    contentRevision: number;
    validatedRevision?: number;
  };
  published: null | {
    id: string;
    version: number;
    title: string;
  };
  sections: ReadonlyArray<AssessmentWorkspaceSection>;
  reviews: ReadonlyArray<AssessmentReviewState>;
  gates: ReadonlyArray<AssessmentPublishGate>;
  publishReady: boolean;
};

function formatMinutes(value: number | undefined) {
  if (value === undefined) return "Untimed";
  const minutes = Math.round(value / 60);
  return `${minutes} min`;
}

export function AssessmentWorkspaceView({
  model,
  canEdit,
  canReview,
  canPublish,
  validating,
  publishing,
  onValidate,
  onEditMetadata,
  onOpenReview,
  onPublish,
  onCreateNextDraft,
  onResumeClone,
}: {
  model: AssessmentWorkspaceModel;
  canEdit: boolean;
  canReview: boolean;
  canPublish: boolean;
  validating: boolean;
  publishing: boolean;
  onValidate?: () => void;
  onEditMetadata?: () => void;
  onOpenReview?: (reviewType: AssessmentReviewType) => void;
  onPublish?: () => void;
  onCreateNextDraft?: () => void;
  onResumeClone?: () => void;
}) {
  const draft = model.draft;
  const clonePending = draft?.status === "cloning";
  const cloneFailed = draft?.status === "clone-failed";

  return (
    <section className={adminStyles.adminSection}>
      <header className={styles.workspaceHeader}>
        <div className={styles.workspaceIdentity}>
          <h2>{model.definition.adminTitle}</h2>
          <p>
            /{model.definition.slug} · {model.definition.profile}
          </p>
        </div>
        <div className={styles.statusCluster}>
          <AdminStatus
            tone={
              model.definition.visibility === "published"
                ? "success"
                : model.definition.visibility === "draft"
                  ? "warning"
                  : "neutral"
            }
          >
            {model.definition.visibility}
          </AdminStatus>
          {draft ? <AdminStatus>{draft.status}</AdminStatus> : null}
        </div>
      </header>

      {draft === null ? (
        <div className={styles.draftLifecyclePanel}>
          <AdminEmpty
            title="No editable draft"
            description="The published version stays immutable. Start a private next revision before changing its wording or Question Bank eligibility rules."
          />
          {canEdit && model.published && onCreateNextDraft ? (
            <button
              className={adminStyles.primaryButton}
              type="button"
              disabled={publishing}
              onClick={onCreateNextDraft}
            >
              <DocumentDuplicateIcon aria-hidden width={18} height={18} />
              {publishing ? "Starting revision…" : "Start next revision"}
            </button>
          ) : null}
        </div>
      ) : clonePending || cloneFailed ? (
        <div className={styles.draftLifecyclePanel} data-tone={cloneFailed ? "danger" : "warning"}>
          <ArrowPathIcon
            aria-hidden
            width={28}
            height={28}
            className={clonePending ? adminStyles.spin : undefined}
          />
          <div>
            <strong>{cloneFailed ? "Draft copy needs attention" : "Creating the next draft"}</strong>
            <p>
              {cloneFailed
                ? "The published version is still untouched. Resume the idempotent copy before authoring."
                : "Sections, stimuli, questions, answer keys, and media links are being copied into a private version."}
            </p>
          </div>
          {canEdit && onResumeClone ? (
            <button
              className={adminStyles.secondaryButton}
              type="button"
              disabled={publishing}
              onClick={onResumeClone}
            >
              <ArrowPathIcon aria-hidden width={18} height={18} />
              {publishing ? "Resuming…" : cloneFailed ? "Resume draft copy" : "Retry draft copy"}
            </button>
          ) : null}
        </div>
      ) : (
        <div className={styles.proofDesk}>
          <div className={styles.authoringColumn}>
            <div className={styles.editorBlock}>
              <div className={styles.editorHeading}>
                <div>
                  <h3>Format contract</h3>
                  <p>
                    The catalogue entry is fixed. Public wording, timing, and review policy
                    belong to working revision {draft.contentRevision}.
                  </p>
                </div>
                {canEdit && onEditMetadata ? (
                  <button
                    className={adminStyles.secondaryButton}
                    type="button"
                    onClick={onEditMetadata}
                  >
                    <PencilSquareIcon aria-hidden width={18} height={18} />
                    Edit metadata
                  </button>
                ) : null}
              </div>
              <div className={adminStyles.formGridWide}>
                <div className={`${adminStyles.workspaceFact} ${adminStyles.spanSix}`}>
                  <span>Public title</span>
                  <strong>{draft.title}</strong>
                </div>
                <div className={`${adminStyles.workspaceFact} ${adminStyles.spanSix}`}>
                  <span>Current revision</span>
                  <strong>{draft.contentRevision}</strong>
                </div>
                <div className={`${adminStyles.workspaceFact} ${adminStyles.spanSix}`}>
                  <span>Timing</span>
                  <strong>{draft.timePolicy}</strong>
                </div>
                <div className={`${adminStyles.workspaceFact} ${adminStyles.spanSix}`}>
                  <span>Learner review</span>
                  <strong>{draft.reviewPolicy}</strong>
                </div>
                <div className={`${adminStyles.workspaceFact} ${adminStyles.spanFull}`}>
                  <span>Summary</span>
                  <strong>{draft.summary}</strong>
                </div>
              </div>
            </div>

            <div className={styles.editorBlock}>
              <div className={styles.editorHeading}>
                <div>
                  <h3>Fixed skill structure</h3>
                  <p>
                    Skills and quotas define the format. Admins choose the eligible
                    Question Bank pool below; they do not add, remove, or reorder sections.
                  </p>
                </div>
                <AdminStatus tone="neutral">Fixed format</AdminStatus>
              </div>
              {model.sections.length === 0 ? (
                <AdminEmpty
                  title="Fixed structure is missing"
                  description="Restore the canonical format data before validating or publishing this revision."
                />
              ) : (
                <div className={styles.authoringList}>
                  {model.sections.map((section) => (
                    <div key={section.id} className={styles.authoringRow}>
                      <span className={styles.authoringIndex}>{section.order + 1}</span>
                      <span className={styles.rowCopy}>
                        <strong>{section.title}</strong>
                        <span>
                          {section.skill}, draws {section.itemCount} questions, {formatMinutes(section.timeLimitSeconds)}
                        </span>
                      </span>
                      <span className={styles.rowActions}>
                        <AdminStatus>{section.sectionKey}</AdminStatus>
                        <AdminStatus tone="success">
                          Quota {section.itemCount}
                        </AdminStatus>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.editorBlock}>
              <div className={styles.editorHeading}>
                <div>
                  <h3>Automated validation</h3>
                  <p>
                    Validation checks the frozen revision in batches. It never replaces
                    the four human approvals.
                  </p>
                </div>
                {canEdit && onValidate ? (
                  <button
                    className={adminStyles.secondaryButton}
                    type="button"
                    disabled={validating}
                    onClick={onValidate}
                  >
                    <ArrowPathIcon
                      aria-hidden
                      width={18}
                      height={18}
                      className={validating ? adminStyles.spin : undefined}
                    />
                    {validating ? "Validating…" : "Validate revision"}
                  </button>
                ) : null}
              </div>
            </div>

          </div>

          <AssessmentReviewRail
            contentRevision={draft.contentRevision}
            validatedRevision={draft.validatedRevision}
            reviews={model.reviews}
            gates={model.gates}
            serverReady={model.publishReady}
            canReview={canReview}
            canPublish={canPublish}
            publishing={publishing}
            onOpenReview={onOpenReview}
            onPublish={onPublish}
          />
        </div>
      )}
    </section>
  );
}
