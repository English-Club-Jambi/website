"use client";

import {
  ArrowRightIcon,
  DocumentPlusIcon,
} from "@heroicons/react/24/outline";
import { usePaginatedQuery } from "convex/react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { SelectField } from "@/components/forms/select-field";
import { api } from "../../../convex/_generated/api";

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

const statusOptions = [
  { value: "all", label: "All stories" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

function statusTone(status: "draft" | "published" | "archived") {
  if (status === "published") return "success" as const;
  if (status === "archived") return "danger" as const;
  return "warning" as const;
}

export function JournalManager() {
  const [status, setStatus] = useState<"all" | "draft" | "published" | "archived">("all");
  const queryArgs = status === "all" ? {} : { status };
  const { results, status: paginationStatus, loadMore } = usePaginatedQuery(
    api.adminPosts.listPage,
    queryArgs,
    { initialNumItems: 12 },
  );

  return (
    <>
      <AdminPageHeading
        title="Journal"
        description="Draft with structured blocks, save revisions deliberately, and publish only the reviewed version."
        actions={
          <Link className={styles.primaryButton} href="/admin/journal/new">
            <DocumentPlusIcon aria-hidden width={18} height={18} />
            New story
          </Link>
        }
      />

      <AdminSection
        title="Story archive"
        description="Twelve stories load at a time so the archive stays quick to scan."
      >
        <div className={styles.toolbar}>
          <SelectField
            label="Status"
            value={status}
            options={statusOptions}
            onValueChange={(next) => setStatus(next as typeof status)}
          />
          <div className={styles.workspaceFact}>
            <span>Visible in this view</span>
            <strong>{results.length} {results.length === 1 ? "story" : "stories"}</strong>
          </div>
        </div>

        {paginationStatus === "LoadingFirstPage" ? (
          <AdminLoadingRows label="Loading journal stories" />
        ) : results.length === 0 ? (
          <AdminEmpty
            title="No stories in this view"
            description="Start a draft or choose another status to inspect the archive."
          />
        ) : (
          <div className={styles.journalAdminList}>
            {results.map((post) => (
              <Link
                key={post._id}
                href={`/admin/journal/${post._id}` as Route}
                className={styles.journalAdminRow}
              >
                <div>
                  <strong>{post.title}</strong>
                  <span>{post.category} / {post.authorName}</span>
                </div>
                <p>{post.excerpt}</p>
                <div className={styles.journalRowMeta}>
                  <AdminStatus tone={statusTone(post.status)}>{post.status}</AdminStatus>
                  <time dateTime={new Date(post.updatedAt).toISOString()}>
                    {formatAdminDate(post.updatedAt)}
                  </time>
                  <ArrowRightIcon aria-hidden width={18} height={18} />
                </div>
              </Link>
            ))}
          </div>
        )}

        {paginationStatus === "CanLoadMore" || paginationStatus === "LoadingMore" ? (
          <div className={styles.listFooter}>
            <LoadMoreButton
              loading={paginationStatus === "LoadingMore"}
              onClick={() => loadMore(12)}
            />
          </div>
        ) : null}
      </AdminSection>
    </>
  );
}
