"use client";

import {
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  DocumentPlusIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, usePaginatedQuery } from "convex/react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { SelectField } from "@/components/forms/select-field";
import { api } from "../../../convex/_generated/api";

import {
  AdminEmpty,
  AdminError,
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
  AdminStatus,
  LoadMoreButton,
  formatAdminDate,
  humanizeError,
} from "./admin-ui";
import { useAdminConfirm } from "./admin-confirm-dialog";
import { canPublish, useAdminSession } from "./admin-session";
import styles from "./admin-shell.module.css";

type JournalRecord = FunctionReturnType<
  typeof api.adminPosts.listPage
>["page"][number];

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
  const admin = useAdminSession();
  const confirm = useAdminConfirm();
  const archivePost = useMutation(api.adminPosts.archive);
  const restorePost = useMutation(api.adminPosts.restore);
  const [status, setStatus] = useState<"all" | "draft" | "published" | "archived">("all");
  const [pending, setPending] = useState<{
    postId: JournalRecord["_id"];
    action: "archive" | "restore";
  } | null>(null);
  const [actionError, setActionError] = useState("");
  const queryArgs = status === "all" ? {} : { status };
  const { results, status: paginationStatus, loadMore } = usePaginatedQuery(
    api.adminPosts.listPage,
    queryArgs,
    { initialNumItems: 12 },
  );
  const allowLifecycleChanges = canPublish(admin);

  async function manageLifecycle(
    post: JournalRecord,
    action: "archive" | "restore",
  ) {
    const restoringPublication =
      action === "restore" && post.publishedAt !== undefined;
    await confirm(
      action === "archive"
        ? {
            title: `Archive “${post.title}”?`,
            description:
              "The story leaves the public journal immediately. Its revisions and media stay intact so an administrator can restore it later.",
            confirmLabel: "Archive story",
            cancelLabel: "Keep story",
          }
        : {
            title: `Restore “${post.title}”?`,
            description: restoringPublication
              ? "Its last verified published revision returns at the existing journal address. If that revision no longer verifies, the story returns as a private draft."
              : "The story returns to the draft workspace and remains private until it is published.",
            confirmLabel: restoringPublication
              ? "Restore publication"
              : "Restore draft",
            cancelLabel: "Keep archived",
          },
      async () => {
        setPending({ postId: post._id, action });
        setActionError("");
        try {
          if (action === "archive") {
            await archivePost({ postId: post._id });
          } else {
            await restorePost({ postId: post._id });
          }
        } catch (error) {
          setActionError(humanizeError(error));
          throw error;
        } finally {
          setPending(null);
        }
      },
    );
  }

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
        description="Edit any story here. Publishers and owners can archive it without erasing its revisions, then restore it when it is ready."
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
        {actionError ? <AdminError>{actionError}</AdminError> : null}

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
              <article key={post._id} className={styles.journalAdminRow}>
                <div>
                  <strong>{post.title}</strong>
                  <span>{post.category} / {post.authorName}</span>
                  <div className={styles.buttonRow}>
                    <Link
                      href={`/admin/journal/${post._id}` as Route}
                      className={styles.secondaryButton}
                      aria-label={`Edit ${post.title}`}
                    >
                      <PencilSquareIcon aria-hidden width={18} height={18} />
                      Edit
                    </Link>
                    {allowLifecycleChanges ? (
                      <button
                        type="button"
                        className={
                          post.status === "archived"
                            ? styles.secondaryButton
                            : styles.dangerButton
                        }
                        disabled={pending !== null}
                        aria-label={
                          post.status === "archived"
                            ? `Restore ${post.title}`
                            : `Archive ${post.title}`
                        }
                        onClick={() =>
                          void manageLifecycle(
                            post,
                            post.status === "archived" ? "restore" : "archive",
                          )
                        }
                      >
                        {post.status === "archived" ? (
                          <ArrowUturnLeftIcon aria-hidden width={18} height={18} />
                        ) : (
                          <ArchiveBoxIcon aria-hidden width={18} height={18} />
                        )}
                        {pending?.postId === post._id
                          ? pending.action === "archive"
                            ? "Archiving…"
                            : "Restoring…"
                          : post.status === "archived"
                            ? "Restore"
                            : "Archive"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <p>{post.excerpt}</p>
                <div className={styles.journalRowMeta}>
                  <AdminStatus tone={statusTone(post.status)}>{post.status}</AdminStatus>
                  <time dateTime={new Date(post.updatedAt).toISOString()}>
                    {formatAdminDate(post.updatedAt)}
                  </time>
                </div>
              </article>
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
