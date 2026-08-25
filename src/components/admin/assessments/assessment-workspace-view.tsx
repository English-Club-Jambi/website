"use client";

import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ListBulletIcon,
  PencilSquareIcon,
  RectangleStackIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { Route } from "next";
import Link from "next/link";

import {
  AdminEmpty,
  AdminStatus,
} from "@/components/admin/admin-ui";

import adminStyles from "../admin-shell.module.css";
import styles from "./assessment-admin.module.css";
import { assessmentOrderControls } from "./assessment-order";
import {
  AssessmentReviewRail,
  AssessmentWorkflowNav,
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
  skill: "listening" | "structure" | "reading";
  order: number;
  itemCount: number;
  timeLimitSeconds?: number;
  href: Route<`/admin/assessments/${string}/sections/${string}`>;
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
  onAddSection,
  onOpenReview,
  onPublish,
  onCreateNextDraft,
  onResumeClone,
  onMoveSection,
  onDeleteSection,
}: {
  model: AssessmentWorkspaceModel;
  canEdit: boolean;
  canReview: boolean;
  canPublish: boolean;
  validating: boolean;
  publishing: boolean;
  onValidate?: () => void;
  onEditMetadata?: () => void;
  onAddSection?: () => void;
  onOpenReview?: (reviewType: AssessmentReviewType) => void;
  onPublish?: () => void;
  onCreateNextDraft?: () => void;
  onResumeClone?: () => void;
  onMoveSection?: (sectionId: string, targetOrder: number) => void;
  onDeleteSection?: (sectionId: string, title: string) => void;
}) {
  const draft = model.draft;
  const clonePending = draft?.status === "cloning";
  const cloneFailed = draft?.status === "clone-failed";
  const baseHref = `/admin/assessments/${model.definition.id}` as Route;
  const workflow = [
    {
      label: "Draft overview",
      href: baseHref,
      active: true,
      icon: RectangleStackIcon,
    },
    ...(draft && model.sections[0]
      ? [
          {
            label: "Section authoring",
            href: model.sections[0].href,
            icon: ListBulletIcon,
          },
        ]
      : []),
  ];

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

      <AssessmentWorkflowNav links={workflow} />

      {draft === null ? (
        <div className={styles.draftLifecyclePanel}>
          <AdminEmpty
            title="No editable draft"
            description="The published version stays immutable. Create a private next-version draft before changing sections, questions, or media."
          />
          {canEdit && model.published && onCreateNextDraft ? (
            <button
              className={adminStyles.primaryButton}
              type="button"
              disabled={publishing}
              onClick={onCreateNextDraft}
            >
              <DocumentDuplicateIcon aria-hidden width={18} height={18} />
              {publishing ? "Starting clone…" : "Create next draft"}
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
                  <h3>Learner-facing draft</h3>
                  <p>
                    Public title, summary, instructions, timing, and review policy belong
                    to revision {draft.contentRevision}.
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
                  <h3>Versioned sections</h3>
                  <p>
                    Section order, timing, stimuli, items, and private keys remain pinned
                    to this draft version.
                  </p>
                </div>
                {canEdit && onAddSection ? (
                  <button
                    className={adminStyles.primaryButton}
                    type="button"
                    onClick={onAddSection}
                  >
                    <RectangleStackIcon aria-hidden width={18} height={18} />
                    Add section
                  </button>
                ) : null}
              </div>
              {model.sections.length === 0 ? (
                <AdminEmpty
                  title="No sections in this draft"
                  description="Add the first section before creating stimuli or questions."
                />
              ) : (
                <div className={styles.authoringList}>
                  {model.sections.map((section) => {
                    const orderControls = assessmentOrderControls(section.order, model.sections.length);
                    return <div key={section.id} className={styles.authoringRow}>
                      <span className={styles.authoringIndex}>{section.order + 1}</span>
                      <span className={styles.rowCopy}>
                        <Link className={styles.authoringLink} href={section.href}>
                          <strong>{section.title}</strong>
                        </Link>
                        <span>
                          {section.skill}, {section.itemCount} questions, {formatMinutes(section.timeLimitSeconds)}
                        </span>
                      </span>
                      <span className={styles.rowActions}>
                        <AdminStatus>{section.sectionKey}</AdminStatus>
                        {canEdit && onMoveSection ? (
                          <>
                            <button className={adminStyles.iconButton} type="button" disabled={validating || !orderControls.canMoveUp} aria-label={`Move ${section.title} up`} onClick={() => onMoveSection(section.id, section.order - 1)}>
                              <ArrowUpIcon aria-hidden width={18} height={18} />
                            </button>
                            <button className={adminStyles.iconButton} type="button" disabled={validating || !orderControls.canMoveDown} aria-label={`Move ${section.title} down`} onClick={() => onMoveSection(section.id, section.order + 1)}>
                              <ArrowDownIcon aria-hidden width={18} height={18} />
                            </button>
                          </>
                        ) : null}
                        <Link
                          className={adminStyles.secondaryButton}
                          href={section.href}
                          aria-label={`Open ${section.title}`}
                        >
                          Open
                          <EyeIcon aria-hidden width={17} height={17} />
                        </Link>
                        {canEdit && onDeleteSection ? (
                          <button
                            className={adminStyles.iconButton}
                            type="button"
                            disabled={validating || section.itemCount > 0}
                            aria-label={`Remove ${section.title}`}
                            title={section.itemCount > 0 ? "Remove every question before deleting this section" : "Remove empty section"}
                            onClick={() => onDeleteSection(section.id, section.title)}
                          >
                            <TrashIcon aria-hidden width={18} height={18} />
                          </button>
                        ) : null}
                      </span>
                    </div>
                  })}
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
