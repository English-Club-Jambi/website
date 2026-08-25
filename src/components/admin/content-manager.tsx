"use client";

import {
  CheckCircleIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState, type FormEvent } from "react";

import { SelectField } from "@/components/forms/select-field";
import {
  getPublicContentManifestPages,
  publicContentLocale,
  publicContentManifest,
  type PublicContentFieldDefinition,
  type PublicContentPageKey,
} from "@content/public-content";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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
import { canPublish, useAdminSession } from "./admin-session";
import styles from "./admin-shell.module.css";

const manifestPages = getPublicContentManifestPages();
const pageOptions = manifestPages.map((page) => ({
  value: page.pageKey,
  label: page.label,
}));

const contentKinds = [
  { value: "plain-text", label: "Plain text" },
  { value: "markdown", label: "Markdown" },
] as const;

type ContentEntry = FunctionReturnType<
  typeof api.adminContent.getPageWorkspace
>[number];

export type ContentEditorItem = {
  entryId?: Id<"siteContentEntries">;
  pageKey: string;
  locale: string;
  contentKey: string;
  label: string;
  kind: "plain-text" | "markdown";
  draftValue: string;
  draftRevision: number;
  publishedVersionId?: Id<"siteContentVersions">;
  updatedAt?: number;
  maxLength: number;
  managed: boolean;
  contractIssue?: string;
};

export function buildContentEditorItems(
  pageKey: PublicContentPageKey,
  entries: ReadonlyArray<ContentEntry>,
): ContentEditorItem[] {
  const fields = Object.values(
    publicContentManifest[pageKey].fields,
  ) as ReadonlyArray<PublicContentFieldDefinition>;
  const entriesByKey = new Map(entries.map((entry) => [entry.contentKey, entry]));
  const knownKeys = new Set(fields.map((field) => field.contentKey));
  const managedItems = fields.map((field): ContentEditorItem => {
    const entry = entriesByKey.get(field.contentKey);
    return {
      ...(entry ? { entryId: entry._id } : {}),
      pageKey,
      locale: publicContentLocale,
      contentKey: field.contentKey,
      label: entry?.label ?? field.label,
      kind: field.kind,
      draftValue: entry?.draftValue ?? field.defaultValue,
      draftRevision: entry?.draftRevision ?? 0,
      ...(entry?.publishedVersionId ? { publishedVersionId: entry.publishedVersionId } : {}),
      ...(entry ? { updatedAt: entry.updatedAt } : {}),
      maxLength: field.maxLength,
      managed: true,
      ...(entry && entry.kind !== field.kind
        ? { contractIssue: "Format corrected on save" }
        : {}),
    };
  });
  const unrecognizedItems = entries
    .filter((entry) => !knownKeys.has(entry.contentKey))
    .map((entry): ContentEditorItem => ({
      entryId: entry._id,
      pageKey: entry.pageKey,
      locale: entry.locale,
      contentKey: entry.contentKey,
      label: entry.label,
      kind: entry.kind,
      draftValue: entry.draftValue,
      draftRevision: entry.draftRevision,
      ...(entry.publishedVersionId ? { publishedVersionId: entry.publishedVersionId } : {}),
      updatedAt: entry.updatedAt,
      maxLength: entry.kind === "markdown" ? 50_000 : 5_000,
      managed: false,
      contractIssue: "Not used by public site",
    }));
  return [...managedItems, ...unrecognizedItems];
}

function ContentEntryEditor({ item, allowPublish }: { item: ContentEditorItem; allowPublish: boolean }) {
  const saveDraft = useMutation(api.adminContent.saveDraft);
  const publish = useMutation(api.adminContent.publish);
  const [entryId, setEntryId] = useState(item.entryId);
  const [label, setLabel] = useState(item.label);
  const [kind, setKind] = useState<"plain-text" | "markdown">(item.kind);
  const [value, setValue] = useState(item.draftValue);
  const [revision, setRevision] = useState(item.draftRevision);
  const [pending, setPending] = useState<"save" | "publish" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("save");
    setMessage("");
    setError("");
    try {
      const result = await saveDraft({
        pageKey: item.pageKey,
        locale: item.locale,
        contentKey: item.contentKey,
        label,
        kind,
        value,
        expectedRevision: revision,
      });
      if (!result.ok) {
        setRevision(result.currentRevision);
        setError("A newer draft exists. Review the latest content before saving again.");
        return;
      }
      setEntryId(result.entryId);
      setRevision(result.revision);
      setMessage(`Draft revision ${result.revision} saved.`);
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(null);
    }
  }

  async function handlePublish() {
    if (!entryId || !item.managed) return;
    setPending("publish");
    setMessage("");
    setError("");
    try {
      const result = await publish({ entryId, expectedRevision: revision });
      setMessage(`Revision ${result.revision} published.`);
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <form className={styles.contentEditor} onSubmit={handleSave}>
      <header className={styles.contentEditorHead}>
        <div>
          <code>{item.contentKey}</code>
          <strong>{item.label}</strong>
        </div>
        <div className={styles.buttonRow}>
          {item.contractIssue ? <AdminStatus tone="danger">{item.contractIssue}</AdminStatus> : null}
          <AdminStatus>{kind === "markdown" ? "Markdown" : "Plain text"}</AdminStatus>
          <AdminStatus tone={item.publishedVersionId ? "success" : "warning"}>
            {item.publishedVersionId ? "Published before" : revision > 0 ? "Draft only" : "Not initialized"}
          </AdminStatus>
        </div>
      </header>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Editor label</span>
          <input value={label} minLength={2} maxLength={120} required onChange={(event) => setLabel(event.target.value)} />
        </label>
        <SelectField
          label="Content format"
          value={kind}
          options={contentKinds}
          disabled={item.managed}
          onValueChange={(next) => setKind(next as "plain-text" | "markdown")}
        />
        <label className={`${styles.field} ${styles.spanFull}`}>
          <span>Public copy</span>
          <textarea
            value={value}
            minLength={1}
            maxLength={item.maxLength}
            required
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
      </div>
      {error ? <AdminError>{error}</AdminError> : null}
      <footer className={styles.formFooter}>
        <p>
          Revision {revision}. {item.updatedAt ? `Updated ${formatAdminDate(item.updatedAt)}.` : "Not stored in Convex yet."}
          {message ? ` ${message}` : ""}
        </p>
        <div className={styles.buttonRow}>
          <button className={styles.secondaryButton} type="submit" disabled={pending !== null}>
            <CheckCircleIcon aria-hidden width={18} height={18} />
            {pending === "save" ? "Saving…" : "Save draft"}
          </button>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={!allowPublish || !item.managed || !entryId || revision < 1 || pending !== null}
            title={!item.managed ? "This key is not used by the public copy contract" : allowPublish ? undefined : "Publisher or owner access is required"}
            onClick={() => void handlePublish()}
          >
            <PaperAirplaneIcon aria-hidden width={18} height={18} />
            {pending === "publish" ? "Publishing…" : "Publish"}
          </button>
        </div>
      </footer>
    </form>
  );
}

export function ContentManager() {
  const admin = useAdminSession();
  const [pageKey, setPageKey] = useState<PublicContentPageKey>("home");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const entries = useQuery(api.adminContent.getPageWorkspace, {
    pageKey,
    locale: publicContentLocale,
  });
  const editorItems = useMemo<ContentEditorItem[]>(() => {
    if (entries === undefined) return [];
    return buildContentEditorItems(pageKey, entries);
  }, [entries, pageKey]);
  const selectedItem =
    editorItems.find((item) => item.contentKey === selectedKey) ??
    editorItems[0] ??
    null;

  return (
    <>
      <AdminPageHeading
        title="Page copy"
        description="Edit every approved piece of public wording. Missing records open with the site's current checked-in copy, ready to save as a first draft."
      />

      <AdminSection
        title="Choose a public page"
        description="English is the current publishing locale."
      >
        <div className={styles.toolbar}>
          <SelectField
            label="Page"
            value={pageKey}
            options={pageOptions}
            onValueChange={(value) => {
              setPageKey(value as PublicContentPageKey);
              setSelectedKey(null);
            }}
          />
          {selectedItem ? (
            <div className={styles.contentPicker}>
              <SelectField
                label="Content field"
                value={selectedItem.contentKey}
                options={editorItems.map((item) => ({
                  value: item.contentKey,
                  label: item.label,
                }))}
                onValueChange={setSelectedKey}
              />
            </div>
          ) : null}
          <div className={styles.workspaceFact}>
            <span>Publishing access</span>
            <strong>{canPublish(admin) ? "Available" : "Drafts only"}</strong>
          </div>
        </div>
      </AdminSection>

      <AdminSection
        key={pageKey}
        title={`${pageOptions.find((page) => page.value === pageKey)?.label ?? pageKey} content`}
        description="Every approved key keeps its own draft revision and publication pointer. Layout and interaction remain in code."
      >
        {entries === undefined ? (
          <AdminLoadingRows label="Loading page content" />
        ) : selectedItem === null ? (
          <AdminEmpty title="No approved content fields" description="The shared public copy manifest has no fields for this page." />
        ) : (
          <div className={styles.splitWorkspace}>
            <div className={`${styles.workspaceRail} ${styles.contentRail}`}>
              {editorItems.map((item) => (
                <button
                  key={`${item.pageKey}-${item.contentKey}`}
                  className={styles.railButton}
                  type="button"
                  data-active={selectedItem.contentKey === item.contentKey}
                  onClick={() => setSelectedKey(item.contentKey)}
                >
                  <strong>{item.label}</strong>
                  <small>{item.contentKey} / Revision {item.draftRevision}</small>
                </button>
              ))}
            </div>
            <div className={styles.workspaceCanvas}>
              <ContentEntryEditor
                key={`${selectedItem.pageKey}-${selectedItem.contentKey}`}
                item={selectedItem}
                allowPublish={canPublish(admin)}
              />
            </div>
          </div>
        )}
      </AdminSection>
    </>
  );
}
