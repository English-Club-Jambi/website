"use client";

import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  DocumentPlusIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import {
  programCategoryLabels,
  programDeliveryStateLabels,
  type ProgramCategory,
  type ProgramDeliveryState,
} from "@content/programs";
import { SelectField } from "@/components/forms/select-field";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

import { useAdminConfirm } from "./admin-confirm-dialog";
import { canPublish, useAdminSession } from "./admin-session";
import {
  AdminEmpty,
  AdminError,
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
  AdminStatus,
  LoadMoreButton,
  humanizeError,
} from "./admin-ui";
import styles from "./admin-shell.module.css";

type ProgramStatus = "draft" | "published" | "archived";
type ProgramSummary = FunctionReturnType<
  typeof api.adminPrograms.listPage
>["page"][number];
type ProgramWorkspace = NonNullable<
  FunctionReturnType<typeof api.adminPrograms.getWorkspace>
>;
type ProgramVersion = NonNullable<
  ProgramWorkspace["workingCopy"] | ProgramWorkspace["publishedVersion"]
>;

const statusOptions = [
  { value: "all", label: "All records" },
  { value: "draft", label: "Not yet published" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

const categoryOptions = Object.entries(programCategoryLabels).map(
  ([value, label]) => ({ value, label }),
);
const deliveryOptions = Object.entries(programDeliveryStateLabels).map(
  ([value, label]) => ({ value, label }),
);

type ProgramFormState = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: ProgramCategory;
  deliveryState: ProgramDeliveryState;
  audience: string;
  date: string;
  locationLabel: string;
  communityBenefit: string;
  sourceLabel: string;
  sourceUrl: string;
  featured: boolean;
  sortOrder: string;
};

const emptyProgram: ProgramFormState = {
  slug: "",
  title: "",
  summary: "",
  body: "",
  category: "learning",
  deliveryState: "ongoing",
  audience: "Universitas Jambi students",
  date: "",
  locationLabel: "",
  communityBenefit: "",
  sourceLabel: "",
  sourceUrl: "",
  featured: false,
  sortOrder: "50",
};

function toDateInput(value: number | undefined) {
  return value === undefined ? "" : new Date(value).toISOString().slice(0, 10);
}

function formatDateLabel(value: string) {
  if (!value) return undefined;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function toForm(version: ProgramVersion | null): ProgramFormState {
  if (version === null) return emptyProgram;
  return {
    slug: version.slug,
    title: version.title,
    summary: version.summary,
    body: version.body,
    category: version.category,
    deliveryState: version.deliveryState,
    audience: version.audience,
    date: toDateInput(version.startsAt),
    locationLabel: version.locationLabel ?? "",
    communityBenefit: version.communityBenefit,
    sourceLabel: version.sourceLabel ?? "",
    sourceUrl: version.sourceUrl ?? "",
    featured: version.featured,
    sortOrder: String(version.sortOrder),
  };
}

function statusTone(status: ProgramStatus) {
  if (status === "published") return "success" as const;
  if (status === "archived") return "danger" as const;
  return "warning" as const;
}

function ProgramEditor({
  workspace,
  onSaved,
}: {
  workspace: ProgramWorkspace | null;
  onSaved: (programId: Id<"programs">) => void;
}) {
  const admin = useAdminSession();
  const confirm = useAdminConfirm();
  const saveWorkingCopy = useMutation(api.adminPrograms.saveWorkingCopy);
  const publishProgram = useMutation(api.adminPrograms.publish);
  const archiveProgram = useMutation(api.adminPrograms.archive);
  const restoreProgram = useMutation(api.adminPrograms.restore);
  const sourceVersion = workspace?.workingCopy ?? workspace?.publishedVersion ?? null;
  const [form, setForm] = useState<ProgramFormState>(() => toForm(sourceVersion));
  const [pending, setPending] = useState<"save" | "publish" | "archive" | "restore" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const publishAllowed = canPublish(admin);
  const expectedDraftRevision = workspace?.workingCopy?.revision ?? 0;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("save");
    setMessage("");
    setError("");
    try {
      const startsAt = form.date
        ? Date.parse(`${form.date}T00:00:00.000Z`)
        : undefined;
      const result = await saveWorkingCopy({
        ...(workspace ? { programId: workspace.program._id } : {}),
        expectedDraftRevision,
        slug: form.slug,
        title: form.title,
        summary: form.summary,
        body: form.body,
        category: form.category,
        deliveryState: form.deliveryState,
        audience: form.audience,
        ...(form.date
          ? { startsAt, dateLabel: formatDateLabel(form.date) }
          : {}),
        ...(form.locationLabel.trim()
          ? { locationLabel: form.locationLabel }
          : {}),
        communityBenefit: form.communityBenefit,
        ...(form.sourceLabel.trim() ? { sourceLabel: form.sourceLabel } : {}),
        ...(form.sourceUrl.trim() ? { sourceUrl: form.sourceUrl } : {}),
        featured: form.featured,
        sortOrder: Number(form.sortOrder),
      });
      if (!result.ok) {
        setError("Another editor saved this programme first. Reload the record before continuing.");
        return;
      }
      setMessage(`Working copy ${result.revision} saved. It is not public yet.`);
      onSaved(result.programId);
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(null);
    }
  }

  async function handlePublish() {
    if (!workspace?.workingCopy) return;
    await confirm(
      {
        title: `Publish ${workspace.workingCopy.title}?`,
        description:
          "This exact working copy will replace the public programme record. Its delivery label and source wording will be visible immediately.",
        confirmLabel: "Publish programme",
        cancelLabel: "Keep working copy",
      },
      async () => {
        setPending("publish");
        setMessage("");
        setError("");
        try {
          await publishProgram({
            programId: workspace.program._id,
            expectedRevision: workspace.workingCopy!.revision,
          });
          setMessage("Published version updated. There are no unpublished changes.");
        } catch (caught) {
          setError(humanizeError(caught));
          throw caught;
        } finally {
          setPending(null);
        }
      },
    );
  }

  async function handleArchive() {
    if (!workspace) return;
    await confirm(
      {
        title: `Archive ${workspace.program.title}?`,
        description:
          "The programme leaves the public record and active admin views. Its revisions and audit history remain available for restoration.",
        confirmLabel: "Archive programme",
        cancelLabel: "Keep programme",
      },
      async () => {
        setPending("archive");
        setError("");
        try {
          await archiveProgram({ programId: workspace.program._id });
          setMessage("Programme archived.");
        } catch (caught) {
          setError(humanizeError(caught));
          throw caught;
        } finally {
          setPending(null);
        }
      },
    );
  }

  async function handleRestore() {
    if (!workspace) return;
    setPending("restore");
    setError("");
    setMessage("");
    try {
      const result = await restoreProgram({ programId: workspace.program._id });
      setMessage(`Programme restored to ${result.status}.`);
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <form onSubmit={handleSave}>
      <div className={styles.programEditorHeader}>
        <div>
          <strong>{workspace ? workspace.program.title : "Add a programme record"}</strong>
          <span>
            {workspace?.workingCopy
              ? `Working copy ${workspace.workingCopy.revision} has unpublished changes.`
              : workspace?.publishedVersion
                ? "The editor starts from the published version. Saving creates a private working copy."
                : "Start with a truthful delivery label; completed records also need an official source."}
          </span>
        </div>
        {workspace ? (
          <AdminStatus tone={statusTone(workspace.program.status)}>
            {workspace.program.status}
          </AdminStatus>
        ) : null}
      </div>

      <div className={styles.programPublicationRail} aria-label="Programme publication flow">
        <span data-current={workspace?.workingCopy !== null && workspace !== null}>
          <b>1</b>
          <strong>Working copy</strong>
          <small>Private edits</small>
        </span>
        <span data-current={workspace?.workingCopy !== null && publishAllowed && workspace !== null}>
          <b>2</b>
          <strong>Review</strong>
          <small>Source and delivery state</small>
        </span>
        <span data-current={workspace?.program.status === "published" && !workspace.workingCopy}>
          <b>3</b>
          <strong>Published version</strong>
          <small>Visible on /programs</small>
        </span>
      </div>

      <div className={styles.formGridWide}>
        <label className={`${styles.field} ${styles.spanEight}`}>
          <span>Programme title</span>
          <input
            value={form.title}
            minLength={5}
            maxLength={140}
            required
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </label>
        <label className={`${styles.field} ${styles.spanFour}`}>
          <span>Public address</span>
          <input
            value={form.slug}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            minLength={3}
            maxLength={96}
            required
            placeholder="community-english-service"
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase() }))}
          />
        </label>
        <label className={`${styles.field} ${styles.spanFull}`}>
          <span>Short public summary</span>
          <textarea
            value={form.summary}
            minLength={30}
            maxLength={320}
            required
            onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
          />
        </label>
        <label className={`${styles.field} ${styles.spanFull}`}>
          <span>Programme account</span>
          <textarea
            value={form.body}
            minLength={80}
            maxLength={2400}
            required
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
          />
          <small className={styles.fieldHint}>
            Explain the format, scope, and limits. Do not turn a plan into a completed claim.
          </small>
        </label>
        <div className={styles.spanFour}>
          <SelectField
            label="Programme category"
            value={form.category}
            options={categoryOptions}
            onValueChange={(value) => setForm((current) => ({ ...current, category: value as ProgramCategory }))}
          />
        </div>
        <div className={styles.spanFour}>
          <SelectField
            label="Delivery label"
            value={form.deliveryState}
            options={deliveryOptions}
            onValueChange={(value) => setForm((current) => ({ ...current, deliveryState: value as ProgramDeliveryState }))}
          />
        </div>
        <label className={`${styles.field} ${styles.spanFour}`}>
          <span>Public order</span>
          <input
            type="number"
            min={0}
            max={999}
            step={1}
            value={form.sortOrder}
            required
            onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
          />
        </label>
        <label className={`${styles.field} ${styles.spanSix}`}>
          <span>Audience</span>
          <input
            value={form.audience}
            minLength={3}
            maxLength={180}
            required
            onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}
          />
        </label>
        <label className={`${styles.field} ${styles.spanSix}`}>
          <span>Event date</span>
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
          <small className={styles.fieldHint}>Required for a documented record.</small>
        </label>
        <label className={`${styles.field} ${styles.spanFull}`}>
          <span>Place</span>
          <input
            value={form.locationLabel}
            maxLength={180}
            onChange={(event) => setForm((current) => ({ ...current, locationLabel: event.target.value }))}
          />
        </label>
        <label className={`${styles.field} ${styles.spanFull}`}>
          <span>Why it matters</span>
          <textarea
            value={form.communityBenefit}
            minLength={20}
            maxLength={360}
            required
            onChange={(event) => setForm((current) => ({ ...current, communityBenefit: event.target.value }))}
          />
        </label>
        <label className={`${styles.field} ${styles.spanFour}`}>
          <span>Source label</span>
          <input
            value={form.sourceLabel}
            maxLength={120}
            placeholder="Universitas Jambi news record"
            onChange={(event) => setForm((current) => ({ ...current, sourceLabel: event.target.value }))}
          />
        </label>
        <label className={`${styles.field} ${styles.spanEight}`}>
          <span>Official source address</span>
          <input
            type="url"
            value={form.sourceUrl}
            maxLength={500}
            placeholder="https://www.unja.ac.id/..."
            onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))}
          />
        </label>
        <label className={`${styles.checkbox} ${styles.spanFull}`}>
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))}
          />
          Lead with this programme in the public record
        </label>
      </div>

      {error ? <AdminError>{error}</AdminError> : null}
      {message ? <p className={styles.inlineSuccess} role="status">{message}</p> : null}

      <footer className={styles.formFooter}>
        <p>
          {workspace?.workingCopy
            ? "Saving creates another immutable working revision."
            : "Nothing public changes when a working copy is saved."}
        </p>
        <div className={styles.buttonRow}>
          {workspace && publishAllowed && workspace.program.status === "archived" ? (
            <button className={styles.secondaryButton} type="button" disabled={pending !== null} onClick={handleRestore}>
              <ArrowPathIcon aria-hidden width={18} height={18} />
              {pending === "restore" ? "Restoring…" : "Restore"}
            </button>
          ) : null}
          {workspace && publishAllowed && workspace.program.status !== "archived" ? (
            <button className={styles.dangerButton} type="button" disabled={pending !== null} onClick={handleArchive}>
              <ArchiveBoxIcon aria-hidden width={18} height={18} />
              Archive
            </button>
          ) : null}
          <button className={styles.secondaryButton} type="submit" disabled={pending !== null || workspace?.program.status === "archived"}>
            <CheckCircleIcon aria-hidden width={18} height={18} />
            {pending === "save" ? "Saving…" : "Save working copy"}
          </button>
          {publishAllowed && workspace?.workingCopy && workspace.program.status !== "archived" ? (
            <button className={styles.primaryButton} type="button" disabled={pending !== null} onClick={handlePublish}>
              {pending === "publish" ? "Publishing…" : "Publish this version"}
            </button>
          ) : null}
        </div>
      </footer>
    </form>
  );
}

export function ProgramManager() {
  const [status, setStatus] = useState<"all" | ProgramStatus>("all");
  const [selectedId, setSelectedId] = useState<Id<"programs"> | null>(null);
  const [creating, setCreating] = useState(false);
  const queryArgs = useMemo(
    () => (status === "all" ? {} : { status }),
    [status],
  );
  const { results, loadMore, status: paginationStatus } = usePaginatedQuery(
    api.adminPrograms.listPage,
    queryArgs,
    { initialNumItems: 20 },
  );
  const workspace = useQuery(
    api.adminPrograms.getWorkspace,
    selectedId === null ? "skip" : { programId: selectedId },
  );
  const editorKey = creating
    ? "new"
    : `${selectedId ?? "none"}:${workspace?.workingCopy?.revision ?? 0}:${workspace?.program.updatedAt ?? 0}`;

  function selectProgram(program: ProgramSummary) {
    setCreating(false);
    setSelectedId(program._id);
  }

  return (
    <>
      <AdminPageHeading
        title="Programs"
        description="Publish a truthful record of delivered work, continuing programme lines, and community directions. Activities remains the public explanation of how the club practises."
        actions={
          <Link className={styles.secondaryButton} href="/programs" target="_blank">
            View public programs
            <ArrowTopRightOnSquareIcon aria-hidden width={18} height={18} />
          </Link>
        }
      />

      <AdminSection
        title="Programme record"
        description="Completed work needs a date and an official source. Ongoing and planned work stays labelled so intention never becomes invented history."
        actions={
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
            }}
          >
            <DocumentPlusIcon aria-hidden width={18} height={18} />
            Add programme
          </button>
        }
      >
        <div className={styles.toolbar}>
          <SelectField
            label="Publication state"
            value={status}
            options={statusOptions}
            onValueChange={(value) => setStatus(value as typeof status)}
          />
          <div className={styles.workspaceFact} role="status">
            <span>Loaded records</span>
            <strong>{results.length}</strong>
          </div>
        </div>

        {paginationStatus === "LoadingFirstPage" ? (
          <AdminLoadingRows label="Loading programme records" />
        ) : results.length === 0 && !creating ? (
          <AdminEmpty
            title="No programme records in this view"
            description="Change the publication filter or add a sourced record. The public page shows only records that have an exact published version."
          />
        ) : (
          <div className={styles.splitWorkspace}>
            <div className={styles.workspaceRail}>
              {results.map((program) => (
                <button
                  key={program._id}
                  type="button"
                  className={styles.railButton}
                  data-active={!creating && selectedId === program._id}
                  onClick={() => selectProgram(program)}
                >
                  <strong>{program.title}</strong>
                  <small>
                    {programDeliveryStateLabels[program.deliveryState]} · {program.hasWorkingCopy ? "unpublished changes" : program.status}
                  </small>
                </button>
              ))}
              {paginationStatus === "CanLoadMore" || paginationStatus === "LoadingMore" ? (
                <div className={styles.listFooter}>
                  <LoadMoreButton loading={paginationStatus === "LoadingMore"} onClick={() => loadMore(20)} />
                </div>
              ) : null}
            </div>
            <div className={styles.workspaceCanvas}>
              {creating ? (
                <ProgramEditor
                  key={editorKey}
                  workspace={null}
                  onSaved={(programId) => {
                    setCreating(false);
                    setSelectedId(programId);
                  }}
                />
              ) : selectedId === null ? (
                <AdminEmpty
                  title="Choose a programme record"
                  description="Select a record to compare its working copy with the published version, or add a new programme."
                />
              ) : workspace === undefined ? (
                <AdminLoadingRows label="Loading programme workspace" />
              ) : workspace === null ? (
                <AdminEmpty
                  title="Programme record not found"
                  description="It may have changed in another session. Return to the list and choose it again."
                />
              ) : (
                <ProgramEditor key={editorKey} workspace={workspace} onSaved={setSelectedId} />
              )}
            </div>
          </div>
        )}
      </AdminSection>
    </>
  );
}
