"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  GlobeAltIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { useAction, useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../../../convex/_generated/api";
import { SelectField } from "@/components/forms/select-field";

import { useAdminSession } from "../admin-session";
import adminStyles from "../admin-shell.module.css";
import {
  AdminError,
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
  humanizeError,
} from "../admin-ui";
import { AssessmentMediaStateView } from "./assessment-admin-ui";
import { getAssessmentAdminCapabilities } from "./assessment-admin-permissions";
import { AssessmentMediaUpload } from "./assessment-media-upload";
import styles from "./assessment-admin.module.css";
import { useAssessmentMediaConfig } from "./use-assessment-media-config";

type Purpose = "assessment-audio" | "assessment-image";
type Status = "pending" | "ready" | "rejected" | "archived";

export function AssessmentMediaManager() {
  const admin = useAdminSession();
  const capabilities = getAssessmentAdminCapabilities(admin.role);
  const [purpose, setPurpose] = useState<Purpose>("assessment-audio");
  const [status, setStatus] = useState<Status>("ready");
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [draftCursors, setDraftCursors] = useState<Array<string | null>>([null]);
  const [definitionId, setDefinitionId] = useState<string | null>(null);
  const [previewLinks, setPreviewLinks] = useState<Record<string, string>>({});
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const result = useQuery(api.adminMedia.listPage, {
    purpose,
    status,
    paginationOpts: {
      cursor: cursors.at(-1) ?? null,
      numItems: 24,
      maximumRowsRead: 24,
    },
  });
  const draftPage = useQuery(api.adminAssessments.listPage, {
    visibility: "draft",
    paginationOpts: {
      cursor: draftCursors.at(-1) ?? null,
      numItems: 20,
      maximumRowsRead: 20,
    },
  });
  const selectedWorkspace = useQuery(
    api.adminAssessments.getWorkspace,
    definitionId
      ? { definitionId: definitionId as Id<"assessmentDefinitions"> }
      : "skip",
  );
  const createPreviewUrl = useAction(api.assessmentMediaNode.createPreviewUrl);
  const publishDerivative = useAction(api.assessmentMediaNode.publishDerivative);
  const mediaConfig = useAssessmentMediaConfig();

  function resetPage() {
    setCursors([null]);
  }

  async function handlePreview(mediaId: string) {
    setPendingAction(`preview:${mediaId}`);
    setError("");
    setMessage("");
    try {
      const preview = await createPreviewUrl({
        mediaId: mediaId as Id<"mediaAssets">,
      });
      setPreviewLinks((current) => ({ ...current, [mediaId]: preview.previewUrl }));
      setMessage("Signed private preview prepared for three minutes.");
    } catch (requestError) {
      setError(humanizeError(requestError));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDerivative(mediaId: string) {
    setPendingAction(`publish:${mediaId}`);
    setError("");
    setMessage("");
    try {
      await publishDerivative({ sourceMediaId: mediaId as Id<"mediaAssets"> });
      setMessage("Reviewed immutable public derivative is ready on the assessment R2 route.");
    } catch (requestError) {
      setError(humanizeError(requestError));
    } finally {
      setPendingAction(null);
    }
  }

  const assets =
    result?.page.map((asset) => ({
      id: asset._id,
      name: asset.originalName,
      purpose: asset.purpose as Purpose,
      status: asset.status,
      access: asset.access ?? "public",
      byteSize: asset.byteSize,
      ...(asset.durationMs === undefined ? {} : { durationMs: asset.durationMs }),
      updatedAt: asset.updatedAt,
      ...(asset.publicUrl === undefined ? {} : { publicUrl: asset.publicUrl }),
    })) ?? [];

  return (
    <>
      <Link className={adminStyles.backLink} href="/admin/assessments">
        <ArrowLeftIcon aria-hidden width={18} height={18} />
        Assessment catalogue
      </Link>
      <AdminPageHeading
        title="Assessment media"
        description="Reserve private R2 sources, verify exact bytes and metadata, review signed previews, then create immutable public derivatives."
      />

      {capabilities.canEdit ? (
        <AdminSection
          title="Private source upload"
          description="Choose the draft version before checksum reservation. A source cannot move between versions later."
        >
          {mediaConfig.loading ? (
            <AdminLoadingRows label="Checking private R2 configuration" />
          ) : mediaConfig.error ? (
            <AdminError>{humanizeError(mediaConfig.error)}</AdminError>
          ) : mediaConfig.status?.confidentialUploadsBlocked ? (
            <div className={styles.sourceNotice}>
              <LockClosedIcon aria-hidden width={20} height={20} />
              <span>
                Confidential uploads are disabled. Configure a separate
                R2_ASSESSMENT_BUCKET_NAME and assessment-scoped credentials before
                uploading learner-test source media.
              </span>
            </div>
          ) : <>
          <div className={adminStyles.toolbar}>
            {draftPage === undefined ? (
              <AdminLoadingRows label="Loading private assessment drafts" />
            ) : (
              <SelectField
                label="Target assessment draft"
                value={definitionId ?? undefined}
                placeholder="Choose a private draft"
                options={draftPage.page.map((definition) => ({
                  value: definition.definitionId,
                  label: definition.adminTitle,
                }))}
                onValueChange={setDefinitionId}
              />
            )}
            <div className={adminStyles.workspaceFact}>
              <span>Draft catalogue page</span>
              <strong>{draftCursors.length}</strong>
            </div>
          </div>
          {draftPage && (draftCursors.length > 1 || !draftPage.isDone) ? (
            <nav className={adminStyles.listFooter} aria-label="Private draft pages">
              <div className={adminStyles.buttonRow}>
                <button
                  className={adminStyles.secondaryButton}
                  type="button"
                  disabled={draftCursors.length === 1}
                  onClick={() => {
                    setDefinitionId(null);
                    setDraftCursors((current) => current.slice(0, Math.max(1, current.length - 1)));
                  }}
                >
                  <ChevronLeftIcon aria-hidden width={18} height={18} />
                  Previous drafts
                </button>
                <button
                  className={adminStyles.secondaryButton}
                  type="button"
                  disabled={draftPage.isDone}
                  onClick={() => {
                    setDefinitionId(null);
                    setDraftCursors((current) => [...current, draftPage.continueCursor]);
                  }}
                >
                  Next drafts
                  <ChevronRightIcon aria-hidden width={18} height={18} />
                </button>
              </div>
            </nav>
          ) : null}
          {definitionId && selectedWorkspace === undefined ? (
            <AdminLoadingRows label="Loading selected assessment version" />
          ) : selectedWorkspace?.draft ? (
            <AssessmentMediaUpload
              versionId={selectedWorkspace.draft.versionId}
              onComplete={() => {
                setStatus("ready");
                resetPage();
                setMessage("Private source uploaded and verified. Prepare its signed preview before publication.");
              }}
            />
          ) : definitionId ? (
            <div className={styles.sourceNotice}>
              <LockClosedIcon aria-hidden width={20} height={20} />
              <span>The chosen definition no longer has an editable private draft.</span>
            </div>
          ) : null}
          </>}
        </AdminSection>
      ) : null}

      {message ? <p className={styles.successNotice} role="status">{message}</p> : null}
      {error ? <AdminError>{error}</AdminError> : null}

      <AdminSection
        title="R2 asset ledger"
        description="Twenty-four assets load per page. Private rows receive only short-lived signed previews; public rows use the custom R2 delivery route."
      >
        {!mediaConfig.loading && mediaConfig.status && !mediaConfig.status.publicDerivativeReady ? (
          <div className={styles.sourceNotice}>
            <GlobeAltIcon aria-hidden width={20} height={20} />
            <span>
              Public derivative creation is disabled until the public R2 delivery
              credentials are configured. Existing ledger rows remain available.
            </span>
          </div>
        ) : null}
        <div className={adminStyles.toolbar}>
          <SelectField
            label="Media purpose"
            value={purpose}
            options={[
              { value: "assessment-audio", label: "Assessment audio" },
              { value: "assessment-image", label: "Assessment images" },
            ]}
            onValueChange={(value) => {
              setPurpose(value as Purpose);
              resetPage();
            }}
          />
          <SelectField
            label="Verification state"
            value={status}
            options={[
              { value: "ready", label: "Ready" },
              { value: "pending", label: "Pending verification" },
              { value: "rejected", label: "Rejected" },
              { value: "archived", label: "Archived" },
            ]}
            onValueChange={(value) => {
              setStatus(value as Status);
              resetPage();
            }}
          />
        </div>

        {result === undefined ? (
          <AdminLoadingRows label="Loading assessment media" />
        ) : (
          <AssessmentMediaStateView
            assets={assets}
            renderActions={(asset) => {
              if (asset.status !== "ready") return null;
              if (asset.access === "public") {
                return asset.publicUrl ? (
                  <a className={adminStyles.secondaryButton} href={asset.publicUrl} target="_blank" rel="noreferrer">
                    <GlobeAltIcon aria-hidden width={17} height={17} />
                    Open public asset
                  </a>
                ) : null;
              }
              const previewUrl = previewLinks[asset.id];
              const reviewed = reviewedIds.includes(asset.id);
              return (
                <>
                  <button
                    className={adminStyles.secondaryButton}
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={() => void handlePreview(asset.id)}
                  >
                    {pendingAction === `preview:${asset.id}` ? (
                      <ArrowPathIcon aria-hidden width={17} height={17} className={adminStyles.spin} />
                    ) : (
                      <EyeIcon aria-hidden width={17} height={17} />
                    )}
                    Prepare preview
                  </button>
                  {previewUrl ? (
                    <a
                      className={adminStyles.secondaryButton}
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setReviewedIds((current) => current.includes(asset.id) ? current : [...current, asset.id])}
                    >
                      <EyeIcon aria-hidden width={17} height={17} />
                      Open signed preview
                    </a>
                  ) : null}
                  {capabilities.canPublish ? (
                    <button
                      className={adminStyles.primaryButton}
                      type="button"
                      disabled={!reviewed || pendingAction !== null || !mediaConfig.status?.publicDerivativeReady}
                      onClick={() => void handleDerivative(asset.id)}
                    >
                      <GlobeAltIcon aria-hidden width={17} height={17} />
                      {pendingAction === `publish:${asset.id}` ? "Publishing…" : "Create reviewed derivative"}
                    </button>
                  ) : null}
                </>
              );
            }}
          />
        )}

        {result && (cursors.length > 1 || !result.isDone) ? (
          <nav className={adminStyles.listFooter} aria-label="Assessment media pages">
            <div className={adminStyles.buttonRow}>
              <button className={adminStyles.secondaryButton} type="button" disabled={cursors.length === 1} onClick={() => setCursors((current) => current.slice(0, Math.max(1, current.length - 1)))}>
                <ChevronLeftIcon aria-hidden width={18} height={18} />
                Previous
              </button>
              <button className={adminStyles.secondaryButton} type="button" disabled={result.isDone} onClick={() => setCursors((current) => [...current, result.continueCursor])}>
                Next
                <ChevronRightIcon aria-hidden width={18} height={18} />
              </button>
            </div>
          </nav>
        ) : null}
      </AdminSection>
    </>
  );
}
