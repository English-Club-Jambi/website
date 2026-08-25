"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleStackIcon,
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

import adminStyles from "../admin-shell.module.css";
import {
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
} from "../admin-ui";
import { AssessmentCatalogView } from "./assessment-admin-ui";
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
  const [visibility, setVisibility] = useState<Visibility>("published");
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
        title="Practice Builder"
        description="Question Bank stores reusable questions. A practice format defines the structured draw, section order, timing, delivery rules, and scoring used when a learner starts."
        actions={
          <>
            <Link className={adminStyles.secondaryButton} href="/admin/assessments/questions">
              <CircleStackIcon aria-hidden width={18} height={18} />
              Question bank
            </Link>
            <Link className={adminStyles.secondaryButton} href="/admin/assessments/media">
              <PhotoIcon aria-hidden width={18} height={18} />
              Assessment media
            </Link>
          </>
        }
      />

      <div className={styles.sourceNotice}>
        <InformationCircleIcon aria-hidden width={20} height={20} />
        <span>
          The small Home programme quiz comes from reviewed Programs wording in
          <Link href="/admin/pages"> Pages</Link>. The formats below power the separate Practice area.
        </span>
      </div>

      <div className={styles.catalogGuide} aria-label="How a live practice session is assembled">
        <span>
          <b>1</b>
          <strong>Question Bank</strong>
          <small>Reusable, reviewed questions grouped by skill and task</small>
        </span>
        <span>
          <b>2</b>
          <strong>Practice format</strong>
          <small>Counts, mix, sections, timing, media, and review gates</small>
        </span>
        <span>
          <b>3</b>
          <strong>Pinned attempt</strong>
          <small>The selected questions and order are fixed when Start is pressed</small>
        </span>
      </div>

      <AdminSection
        title="Practice formats"
        description="Each row is a delivery blueprint, not a second question store. “No unpublished changes” means the live format has no newer private working version."
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
          <AdminLoadingRows label="Loading practice formats" />
        ) : (
          <AssessmentCatalogView entries={result.page.map(mapCatalogRow)} />
        )}

        {result && (cursors.length > 1 || !result.isDone) ? (
          <nav className={adminStyles.listFooter} aria-label="Practice format pages">
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
