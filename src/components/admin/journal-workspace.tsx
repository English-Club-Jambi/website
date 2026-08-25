"use client";

import {
  ArchiveBoxIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import type { JSONContent } from "@tiptap/core";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import {
  RichJournalEditor,
  type JournalEditorChange,
} from "@/components/admin/editor/rich-journal-editor";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

import {
  AdminEmpty,
  AdminError,
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
  AdminStatus,
  formatAdminDate,
  humanizeError,
} from "./admin-ui";
import { useAdminConfirm } from "./admin-confirm-dialog";
import { canPublish, useAdminSession } from "./admin-session";
import styles from "./admin-shell.module.css";
import { useAdminMediaUpload } from "./use-admin-media-upload";

const emptyDocument: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function parseEditorDocument(value: string | undefined) {
  if (!value) return emptyDocument;
  try {
    const parsed = JSON.parse(value) as JSONContent;
    return parsed.type === "doc" ? parsed : emptyDocument;
  } catch {
    return emptyDocument;
  }
}

type JournalFormState = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  authorName: string;
  featured: boolean;
};

const newStoryState: JournalFormState = {
  slug: "",
  title: "",
  excerpt: "",
  category: "Club life",
  authorName: "English Club Editorial Team",
  featured: false,
};

export function JournalWorkspace({ postId }: { postId?: string }) {
  const typedPostId = postId as Id<"posts"> | undefined;
  const workspace = useQuery(
    api.adminPosts.getWorkspace,
    typedPostId === undefined ? "skip" : { postId: typedPostId },
  );
  const revisions = useQuery(
    api.adminPosts.listRevisions,
    typedPostId === undefined ? "skip" : { postId: typedPostId, limit: 20 },
  );

  if (typedPostId !== undefined && workspace === undefined) {
    return <AdminLoadingRows label="Loading journal workspace" />;
  }
  if (typedPostId !== undefined && workspace === null) {
    return (
      <AdminSection title="Story not found">
        <AdminEmpty
          title="This story is unavailable"
          description="It may have been removed or the address may be incomplete. Return to the journal archive."
        />
      </AdminSection>
    );
  }

  return (
    <JournalWorkspaceEditor
      key={typedPostId ?? "new-story"}
      typedPostId={typedPostId}
      workspace={workspace ?? undefined}
      revisions={revisions}
    />
  );
}

type JournalWorkspaceRecord = NonNullable<
  FunctionReturnType<typeof api.adminPosts.getWorkspace>
>;
type JournalRevisionRecords = FunctionReturnType<
  typeof api.adminPosts.listRevisions
>;

function JournalWorkspaceEditor({
  typedPostId,
  workspace,
  revisions,
}: {
  typedPostId?: Id<"posts">;
  workspace?: JournalWorkspaceRecord;
  revisions?: JournalRevisionRecords;
}) {
  const admin = useAdminSession();
  const confirm = useAdminConfirm();
  const router = useRouter();
  const saveDraft = useMutation(api.adminPosts.saveDraft);
  const publish = useMutation(api.adminPosts.publish);
  const archive = useMutation(api.adminPosts.archive);
  const uploadMedia = useAdminMediaUpload();
  const source = workspace?.draft ?? workspace?.published;
  const loadedDraft = workspace?.draft ?? null;
  const [form, setForm] = useState<JournalFormState>(() =>
    source
      ? {
          slug: source.slug,
          title: source.title,
          excerpt: source.excerpt,
          category: source.category,
          authorName: source.authorName,
          featured: source.featured,
        }
      : { ...newStoryState },
  );
  const [revision, setRevision] = useState(workspace?.draft?.revision ?? 0);
  const [editorChange, setEditorChange] = useState<JournalEditorChange>(() => ({
    document: parseEditorDocument(source?.editorJson),
    plainText: source?.plainText ?? "",
    wordCount: source?.plainText.trim()
      ? source.plainText.trim().split(/\s+/u).length
      : 0,
  }));
  const [pending, setPending] = useState<"save" | "publish" | "archive" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editorInitialContent = useMemo(
    () => parseEditorDocument(source?.editorJson),
    [source?.editorJson],
  );
  const mediaUrlsById = useMemo(
    () =>
      Object.fromEntries(
        (source?.inlineMedia ?? []).map((media) => [
          media.mediaId,
          media.publicUrl,
        ]),
      ),
    [source?.inlineMedia],
  );

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("save");
    setMessage("");
    setError("");
    try {
      const result = await saveDraft({
        ...(typedPostId === undefined ? {} : { postId: typedPostId }),
        expectedRevision: revision,
        ...form,
        editorJson: JSON.stringify(editorChange.document),
      });
      if (!result.ok) {
        setRevision(result.currentRevision);
        setError("A newer story revision exists. Reload the workspace before saving again.");
        return;
      }
      setRevision(result.revision);
      setMessage(`Draft revision ${result.revision} saved.`);
      if (typedPostId === undefined) {
        router.replace(`/admin/journal/${result.postId}` as Route);
      }
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(null);
    }
  }

  async function handlePublish() {
    if (typedPostId === undefined) return;
    setPending("publish");
    setMessage("");
    setError("");
    try {
      const result = await publish({ postId: typedPostId, expectedRevision: revision });
      setMessage(`Revision ${result.revision} is now public.`);
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(null);
    }
  }

  async function handleArchive() {
    if (typedPostId === undefined) return;
    await confirm(
      {
        title: "Archive this story?",
        description:
          "This removes it from public journal reads. The archived story remains available to administrators.",
        confirmLabel: "Archive story",
        cancelLabel: "Keep story",
      },
      async () => {
        setPending("archive");
        setMessage("");
        setError("");
        try {
          await archive({ postId: typedPostId });
          setPending(null);
          router.push("/admin/journal");
        } catch (caught) {
          setError(humanizeError(caught));
          setPending(null);
          throw caught;
        }
      },
    );
  }

  return (
    <>
      <Link className={styles.backLink} href="/admin/journal">
        <ArrowLeftIcon aria-hidden width={18} height={18} />
        Journal archive
      </Link>
      <AdminPageHeading
        title={typedPostId === undefined ? "Write a new story" : form.title || "Edit story"}
        description="The editor stores an allowlisted document structure. Images remain verified media references, never pasted HTML."
        actions={
          <AdminStatus tone={workspace?.post.status === "published" ? "success" : "warning"}>
            {workspace?.post.status ?? "New draft"}
          </AdminStatus>
        }
      />

      <form onSubmit={handleSave}>
        <AdminSection title="Story details" description="These fields shape the public journal listing and page address.">
          <div className={styles.formGridWide}>
            <label className={`${styles.field} ${styles.spanEight}`}>
              <span>Title</span>
              <input
                value={form.title}
                minLength={5}
                maxLength={180}
                required
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label className={`${styles.field} ${styles.spanFour}`}>
              <span>URL slug</span>
              <input
                value={form.slug}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                minLength={3}
                maxLength={96}
                placeholder="a-room-made-for-trying-again"
                required
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase() }))}
              />
            </label>
            <label className={`${styles.field} ${styles.spanFull}`}>
              <span>Excerpt</span>
              <textarea
                value={form.excerpt}
                minLength={20}
                maxLength={360}
                required
                onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
              />
            </label>
            <label className={`${styles.field} ${styles.spanFour}`}>
              <span>Category</span>
              <input
                value={form.category}
                minLength={2}
                maxLength={80}
                required
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              />
            </label>
            <label className={`${styles.field} ${styles.spanFour}`}>
              <span>Author name</span>
              <input
                value={form.authorName}
                minLength={2}
                maxLength={100}
                required
                onChange={(event) => setForm((current) => ({ ...current, authorName: event.target.value }))}
              />
            </label>
            <label className={`${styles.checkbox} ${styles.spanFour}`}>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))}
              />
              Feature this story in journal selections
            </label>
          </div>
        </AdminSection>

        <AdminSection
          title="Story body"
          description="Use headings, lists, quotes, links, reviewed images, and coordinate-based map notes."
          actions={<AdminStatus>{editorChange.wordCount} words</AdminStatus>}
        >
          <div className={styles.editorFrame}>
            <RichJournalEditor
              key={loadedDraft?._id ?? workspace?.published?._id ?? "new-story"}
              initialContent={editorInitialContent}
              mediaUrlsById={mediaUrlsById}
              disabled={pending !== null}
              onChange={setEditorChange}
              onImageUpload={async (file, metadata) => {
                const uploaded = await uploadMedia({
                  file,
                  alt: metadata.alt,
                  purpose: "journal-inline",
                });
                return {
                  mediaId: uploaded.mediaId,
                  publicUrl: uploaded.publicUrl,
                  width: uploaded.width,
                  height: uploaded.height,
                };
              }}
            />
          </div>
        </AdminSection>

        {error ? <AdminError>{error}</AdminError> : null}
        <div className={styles.editorActionBar}>
          <div>
            <ClockIcon aria-hidden width={18} height={18} />
            <span>{message || (revision > 0 ? `Working from revision ${revision}.` : "Not saved yet.")}</span>
          </div>
          <div className={styles.buttonRow}>
            {typedPostId !== undefined && canPublish(admin) ? (
              <button className={styles.dangerButton} type="button" disabled={pending !== null} onClick={() => void handleArchive()}>
                <ArchiveBoxIcon aria-hidden width={18} height={18} />
                {pending === "archive" ? "Archiving…" : "Archive"}
              </button>
            ) : null}
            <button className={styles.secondaryButton} type="submit" disabled={pending !== null}>
              <CheckCircleIcon aria-hidden width={18} height={18} />
              {pending === "save" ? "Saving…" : "Save revision"}
            </button>
            <button
              className={styles.primaryButton}
              type="button"
              disabled={typedPostId === undefined || !canPublish(admin) || pending !== null || revision < 1}
              title={canPublish(admin) ? undefined : "Publisher or owner access is required"}
              onClick={() => void handlePublish()}
            >
              <PaperAirplaneIcon aria-hidden width={18} height={18} />
              {pending === "publish" ? "Publishing…" : "Publish revision"}
            </button>
          </div>
        </div>
      </form>

      {typedPostId !== undefined ? (
        <AdminSection title="Revision history" description="Saved revisions remain immutable and newest appears first.">
          {revisions === undefined ? (
            <AdminLoadingRows label="Loading revision history" />
          ) : revisions.length === 0 ? (
            <AdminEmpty title="No saved revisions" description="Save the story to establish its first revision." />
          ) : (
            <ol className={styles.revisionList}>
              {revisions.map((item) => (
                <li key={item._id}>
                  <strong>Revision {item.revision}</strong>
                  <span>{item.title}</span>
                  <time dateTime={new Date(item.createdAt).toISOString()}>{formatAdminDate(item.createdAt)}</time>
                </li>
              ))}
            </ol>
          )}
        </AdminSection>
      ) : null}
    </>
  );
}
