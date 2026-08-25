"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentPlusIcon,
  InformationCircleIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useQuery } from "convex/react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../../../convex/_generated/api";
import { SelectField } from "@/components/forms/select-field";

import { useAdminSession } from "../admin-session";
import adminStyles from "../admin-shell.module.css";
import {
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
} from "../admin-ui";
import { AssessmentCatalogView } from "./assessment-admin-ui";
import { getAssessmentAdminCapabilities } from "./assessment-admin-permissions";
import styles from "./assessment-admin.module.css";

type Visibility = "draft" | "published" | "retired";
type CatalogRow = FunctionReturnType<
  typeof api.adminAssessments.listPage
>["page"][number];

const visibilityOptions = [
  { value: "draft", label: "Private drafts" },
  { value: "published", label: "Published" },
  { value: "retired", label: "Retired" },
] as const;

function mapCatalogRow(row: CatalogRow) {
  return {
    id: row.definitionId,
    title: row.adminTitle,
    slug: row.slug,
    kind: row.kind,
    profile: row.profile,
    visibility: row.visibility,
    ...(row.draftStatus === null ? {} : { draftStatus: row.draftStatus }),
    updatedAt: row.updatedAt,
    href: `/admin/assessments/${row.definitionId}` as Route,
  };
}

export function AssessmentCatalogManager() {
  const admin = useAdminSession();
  const capabilities = getAssessmentAdminCapabilities(admin.role);
  const [visibility, setVisibility] = useState<Visibility>("draft");
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const cursor = cursors.at(-1) ?? null;
  const result = useQuery(api.adminAssessments.listPage, {
    visibility,
    paginationOpts: {
      cursor,
      numItems: 20,
      maximumRowsRead: 20,
    },
  });

  function changeVisibility(next: Visibility) {
    setVisibility(next);
    setCursors([null]);
  }

  return (
    <>
      <AdminPageHeading
        title="Assessment Lab"
        description="Build original English practice, keep answer keys private, and publish only the exact revision approved by every reviewer."
        actions={
          <>
            <Link className={adminStyles.secondaryButton} href="/admin/assessments/media">
              <PhotoIcon aria-hidden width={18} height={18} />
              Assessment media
            </Link>
            {capabilities.canEdit ? (
              <Link className={adminStyles.primaryButton} href="/admin/assessments/new">
                <DocumentPlusIcon aria-hidden width={18} height={18} />
                New assessment
              </Link>
            ) : null}
          </>
        }
      />

      <div className={styles.sourceNotice}>
        <InformationCircleIcon aria-hidden width={20} height={20} />
        <span>
          The Home programme quiz is generated from reviewed Activities wording in
          <Link href="/admin/pages"> Pages</Link>. It is not stored as an Assessment definition.
        </span>
      </div>

      <AdminSection
        title="Assessment definitions"
        description="Twenty records are read per page. Status filters and cursors keep the workspace bounded as the catalogue grows."
      >
        <div className={adminStyles.toolbar}>
          <SelectField
            label="Publication state"
            value={visibility}
            options={visibilityOptions}
            onValueChange={(value) => changeVisibility(value as Visibility)}
          />
          <div className={adminStyles.workspaceFact} role="status">
            <span>Page</span>
            <strong>{cursors.length}</strong>
          </div>
        </div>

        {result === undefined ? (
          <AdminLoadingRows label="Loading assessment definitions" />
        ) : (
          <AssessmentCatalogView entries={result.page.map(mapCatalogRow)} />
        )}

        {result && (cursors.length > 1 || !result.isDone) ? (
          <nav className={adminStyles.listFooter} aria-label="Assessment pages">
            <div className={adminStyles.buttonRow}>
              <button
                className={adminStyles.secondaryButton}
                type="button"
                disabled={cursors.length === 1}
                onClick={() =>
                  setCursors((current) => current.slice(0, Math.max(1, current.length - 1)))
                }
              >
                <ChevronLeftIcon aria-hidden width={18} height={18} />
                Previous
              </button>
              <button
                className={adminStyles.secondaryButton}
                type="button"
                disabled={result.isDone}
                onClick={() =>
                  setCursors((current) => [...current, result.continueCursor])
                }
              >
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
