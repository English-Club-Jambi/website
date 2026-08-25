"use client";

import {
  ArrowRightIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  MusicalNoteIcon,
  PhotoIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type { Route } from "next";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

import {
  AdminEmpty,
  AdminStatus,
  formatAdminDate,
} from "@/components/admin/admin-ui";

import adminStyles from "../admin-shell.module.css";
import styles from "./assessment-admin.module.css";

export type AssessmentVisibility = "draft" | "published" | "retired";
export type AssessmentKind =
  | "full-practice"
  | "skill-quiz"
  | "club-program-quiz";
export type AssessmentVersionStatus =
  | "draft"
  | "cloning"
  | "validating"
  | "ready"
  | "published"
  | "retired"
  | "clone-failed";
export type AssessmentReviewType =
  | "academic"
  | "rights"
  | "accessibility"
  | "bias";
export type AssessmentReviewDecision =
  | "approved"
  | "changes-requested"
  | "rejected";

export type AssessmentCatalogEntry = {
  id: string;
  title: string;
  slug: string;
  kind: AssessmentKind;
  profile: string;
  visibility: AssessmentVisibility;
  draftStatus?: AssessmentVersionStatus;
  updatedAt: number;
  href: Route;
};

export type AssessmentReviewState = {
  reviewType: AssessmentReviewType;
  decision: AssessmentReviewDecision | "missing";
  current: boolean;
  reviewerName?: string;
  note?: string;
};

export type AssessmentPublishGate = {
  id: string;
  label: string;
  detail: string;
  state: "pass" | "pending" | "block";
};

export type AssessmentMediaState = {
  id: string;
  name: string;
  purpose: "assessment-audio" | "assessment-image";
  status: "pending" | "ready" | "rejected" | "archived";
  access: "public" | "assessment-private";
  byteSize: number;
  durationMs?: number;
  updatedAt: number;
  publicUrl?: string;
};

export type AssessmentWorkflowLink = {
  label: string;
  href:
    | Route
    | Route<`/admin/assessments/${string}/sections/${string}`>;
  active?: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const kindLabels: Record<AssessmentKind, string> = {
  "full-practice": "Full practice",
  "skill-quiz": "Skill quiz",
  "club-program-quiz": "Home programme quiz",
};

const visibilityTones: Record<
  AssessmentVisibility,
  "neutral" | "success" | "warning"
> = {
  draft: "warning",
  published: "success",
  retired: "neutral",
};

const reviewLabels: Record<AssessmentReviewType, string> = {
  academic: "Academic review",
  rights: "Rights review",
  accessibility: "Accessibility review",
  bias: "Bias review",
};

const decisionLabels: Record<AssessmentReviewState["decision"], string> = {
  approved: "Approved",
  "changes-requested": "Changes requested",
  rejected: "Rejected",
  missing: "Not reviewed",
};

const statusTone = (
  status: AssessmentMediaState["status"],
): "neutral" | "success" | "warning" | "danger" => {
  if (status === "ready") return "success";
  if (status === "pending") return "warning";
  if (status === "rejected") return "danger";
  return "neutral";
};

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function formatDuration(value: number | undefined) {
  if (value === undefined) return null;
  const totalSeconds = Math.round(value / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AssessmentCatalogView({
  entries,
}: {
  entries: ReadonlyArray<AssessmentCatalogEntry>;
}) {
  if (entries.length === 0) {
    return (
      <AdminEmpty
        title="No assessment definitions in this view"
        description="Create a definition or change the status filter. Nothing publishes until its current revision passes every review gate."
      />
    );
  }

  return (
    <div className={styles.catalogList}>
      {entries.map((entry) => (
        <Link key={entry.id} href={entry.href} className={styles.catalogRow}>
          <span className={styles.catalogIdentity}>
            <strong>{entry.title}</strong>
            <span>/{entry.slug}</span>
          </span>
          <span className={styles.catalogMeta}>
            <span>
              <b>{kindLabels[entry.kind]}</b>
              <small>{entry.profile}</small>
            </span>
            <span>
              <b>{entry.draftStatus ?? "No active draft"}</b>
              <small>Updated {formatAdminDate(entry.updatedAt)}</small>
            </span>
          </span>
          <span className={styles.catalogState}>
            <AdminStatus tone={visibilityTones[entry.visibility]}>
              {entry.visibility}
            </AdminStatus>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function AssessmentWorkflowNav({
  links,
  label = "Assessment authoring",
}: {
  links: ReadonlyArray<AssessmentWorkflowLink>;
  label?: string;
}) {
  return (
    <nav className={styles.workflowNav} aria-label={label}>
      {links.map(({ label: itemLabel, href, active, icon: Icon }) => (
        <Link
          key={`${href}-${itemLabel}`}
          className={styles.workflowLink}
          href={href}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden width={18} height={18} strokeWidth={1.8} />
          {itemLabel}
        </Link>
      ))}
    </nav>
  );
}

function ReviewIcon({ decision }: { decision: AssessmentReviewState["decision"] }) {
  if (decision === "approved") {
    return <CheckBadgeIcon aria-hidden width={20} height={20} />;
  }
  if (decision === "rejected") {
    return <XCircleIcon aria-hidden width={20} height={20} />;
  }
  if (decision === "changes-requested") {
    return <ExclamationTriangleIcon aria-hidden width={20} height={20} />;
  }
  return <ClockIcon aria-hidden width={20} height={20} />;
}

function GateIcon({ state }: { state: AssessmentPublishGate["state"] }) {
  if (state === "pass") {
    return <CheckCircleIcon aria-hidden width={20} height={20} />;
  }
  if (state === "block") {
    return <XCircleIcon aria-hidden width={20} height={20} />;
  }
  return <ClockIcon aria-hidden width={20} height={20} />;
}

export function AssessmentReviewRail({
  contentRevision,
  validatedRevision,
  reviews,
  gates,
  serverReady,
  canReview,
  canPublish,
  publishing,
  onOpenReview,
  onPublish,
}: {
  contentRevision: number;
  validatedRevision?: number;
  reviews: ReadonlyArray<AssessmentReviewState>;
  gates: ReadonlyArray<AssessmentPublishGate>;
  serverReady: boolean;
  canReview: boolean;
  canPublish: boolean;
  publishing: boolean;
  onOpenReview?: (type: AssessmentReviewType) => void;
  onPublish?: () => void;
}) {
  const revisionValidated = validatedRevision === contentRevision;
  const currentApprovals = reviews.filter(
    (review) => review.current && review.decision === "approved",
  ).length;
  const publishReady = serverReady && canPublish;

  return (
    <aside className={styles.proofRail} aria-label="Publication checks">
      <div className={styles.revisionBar}>
        <ShieldCheckIcon aria-hidden width={22} height={22} />
        <span className={styles.revisionCopy}>
          <strong>Revision {contentRevision}</strong>
          <span>
            {revisionValidated
              ? "Automated checks target this revision."
              : "Run validation again after the latest content change."}
          </span>
        </span>
        <AdminStatus tone={revisionValidated ? "success" : "warning"}>
          {revisionValidated ? "Validated" : "Stale"}
        </AdminStatus>
      </div>

      <div className={styles.editorBlock}>
        <div className={styles.editorHeading}>
          <div>
            <h3>Human approvals</h3>
            <p>Every approval must match the current content revision.</p>
          </div>
          <AdminStatus tone={currentApprovals === 4 ? "success" : "warning"}>
            {currentApprovals} of 4 current
          </AdminStatus>
        </div>
        <div className={styles.reviewList}>
          {reviews.map((review) => (
            <div
              key={review.reviewType}
              className={styles.reviewRow}
              data-current={review.current}
            >
              <span
                className={styles.reviewIcon}
                data-decision={review.decision}
                aria-hidden
              >
                <ReviewIcon decision={review.decision} />
              </span>
              <span className={styles.reviewCopy}>
                <strong>{reviewLabels[review.reviewType]}</strong>
                <span>
                  {decisionLabels[review.decision]}
                  {review.reviewerName ? ` by ${review.reviewerName}` : ""}
                  {!review.current && review.decision !== "missing"
                    ? ". This decision is from an older revision."
                    : ""}
                </span>
                {review.note ? <span>{review.note}</span> : null}
              </span>
              {canReview && onOpenReview ? (
                <button
                  className={adminStyles.secondaryButton}
                  type="button"
                  onClick={() => onOpenReview(review.reviewType)}
                >
                  Review
                  <ArrowRightIcon aria-hidden width={17} height={17} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.editorBlock}>
        <div className={styles.editorHeading}>
          <div>
            <h3>Release gates</h3>
            <p>Convex checks these conditions again during publication.</p>
          </div>
        </div>
        <div className={styles.gateList}>
          {gates.map((gate) => (
            <div key={gate.id} className={styles.gateRow}>
              <span className={styles.gateIcon} data-state={gate.state} aria-hidden>
                <GateIcon state={gate.state} />
              </span>
              <span className={styles.gateCopy}>
                <strong>{gate.label}</strong>
                <span>{gate.detail}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.publishDock}>
        <p role="status">
          {!canPublish
            ? "Publisher or owner access is required."
            : publishReady
              ? "The current revision is ready for the publication mutation."
              : "Resolve every blocked gate and collect four current approvals."}
        </p>
        <button
          className={adminStyles.primaryButton}
          type="button"
          disabled={!publishReady || publishing || !onPublish}
          onClick={onPublish}
        >
          <ShieldCheckIcon aria-hidden width={18} height={18} />
          {publishing ? "Publishing…" : "Publish this revision"}
        </button>
      </div>
    </aside>
  );
}

export function AssessmentMediaStateView({
  assets,
  renderActions,
}: {
  assets: ReadonlyArray<AssessmentMediaState>;
  renderActions?: (asset: AssessmentMediaState) => ReactNode;
}) {
  if (assets.length === 0) {
    return (
      <AdminEmpty
        title="No assessment media in this view"
        description="Reviewed audio and images appear here after R2 verification. Draft sources stay private."
      />
    );
  }

  return (
    <div className={styles.mediaList}>
      {assets.map((asset) => {
        const Icon =
          asset.purpose === "assessment-audio" ? MusicalNoteIcon : PhotoIcon;
        const duration = formatDuration(asset.durationMs);
        return (
          <div key={asset.id} className={styles.mediaRow}>
            <span className={styles.mediaIcon} aria-hidden>
              <Icon width={20} height={20} />
            </span>
            <span className={styles.mediaCopy}>
              <strong>{asset.name}</strong>
              <span>
                {asset.purpose === "assessment-audio" ? "Audio" : "Image"}
                {duration ? `, ${duration}` : ""}. Updated {formatAdminDate(asset.updatedAt)}.
              </span>
            </span>
            <span className={styles.mediaMeta}>
              <AdminStatus tone={asset.access === "assessment-private" ? "warning" : "neutral"}>
                <LockClosedIcon aria-hidden width={14} height={14} />
                {asset.access === "assessment-private" ? "Private draft" : "Public derivative"}
              </AdminStatus>
              <AdminStatus tone={statusTone(asset.status)}>{asset.status}</AdminStatus>
              <AdminStatus>{formatBytes(asset.byteSize)}</AdminStatus>
              {renderActions?.(asset)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
