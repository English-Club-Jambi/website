"use client";

import {
  ClockIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { usePaginatedQuery } from "convex/react";
import { useState } from "react";

import { SelectField } from "@/components/forms/select-field";
import { api } from "../../../convex/_generated/api";

import { useAdminSession } from "./admin-session";
import {
  AdminEmpty,
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
  AdminStatus,
  LoadMoreButton,
  formatAdminDate,
} from "./admin-ui";
import styles from "./admin-shell.module.css";

type AuditRecord = FunctionReturnType<typeof api.adminAudit.listPage>["page"][number];
type AuditArea = AuditRecord["area"];

const areaOptions = [
  { value: "admins", label: "Admin access" },
  { value: "content", label: "Page content" },
  { value: "journal", label: "Journal" },
  { value: "members", label: "Members" },
  { value: "media", label: "Media" },
  { value: "theme", label: "Appearance" },
] as const;

function actionTone(action: AuditRecord["action"]) {
  if (action === "publish" || action === "create") return "success" as const;
  if (action === "archive" || action === "disable") return "danger" as const;
  if (action === "restore") return "warning" as const;
  return "neutral" as const;
}

function OwnerActivity() {
  const [area, setArea] = useState<AuditArea>("content");
  const { results, status, loadMore } = usePaginatedQuery(
    api.adminAudit.listPage,
    { area },
    { initialNumItems: 30 },
  );

  return (
    <AdminSection
      title="Audit trail"
      description="Thirty events load at a time, newest first. Choose a work area to follow its changes."
    >
      <div className={styles.toolbar}>
        <SelectField
          label="Work area"
          value={area}
          options={areaOptions}
          onValueChange={(value) => setArea(value as AuditArea)}
        />
        <div className={styles.workspaceFact}>
          <span>Loaded events</span>
          <strong>{results.length}</strong>
        </div>
      </div>

      {status === "LoadingFirstPage" ? (
        <AdminLoadingRows label="Loading audit events" />
      ) : results.length === 0 ? (
        <AdminEmpty
          title="No recorded changes in this area"
          description="A signed audit entry appears after an administrator creates, updates, publishes, restores, or archives a record."
        />
      ) : (
        <ol className={styles.auditList}>
          {results.map((event) => (
            <li key={event._id}>
              <div className={styles.auditMarker} aria-hidden>
                <ClockIcon width={19} height={19} />
              </div>
              <div className={styles.auditSummary}>
                <strong>{event.summary}</strong>
                <span>{event.resourceType} / {event.resourceId}</span>
              </div>
              <AdminStatus tone={actionTone(event.action)}>{event.action}</AdminStatus>
              <time dateTime={new Date(event.createdAt).toISOString()}>{formatAdminDate(event.createdAt)}</time>
            </li>
          ))}
        </ol>
      )}

      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className={styles.listFooter}>
          <LoadMoreButton loading={status === "LoadingMore"} onClick={() => loadMore(30)} />
        </div>
      ) : null}
    </AdminSection>
  );
}

export function ActivityManager() {
  const admin = useAdminSession();

  return (
    <>
      <AdminPageHeading
        title="Activity"
        description="Review the signed record of changes made across the English Club workspace."
      />
      {admin.role === "owner" ? (
        <OwnerActivity />
      ) : (
        <AdminSection title="Owner access required" description="Audit entries include administrative and publishing history.">
          <div className={styles.accessInline}>
            <ShieldCheckIcon aria-hidden width={34} height={34} />
            <div>
              <strong>This account cannot read the audit trail.</strong>
              <p>An owner can review activity or change this account&apos;s role from the secured admin access workflow.</p>
            </div>
          </div>
        </AdminSection>
      )}
    </>
  );
}
