"use client";

import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LockClosedIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../../../convex/_generated/api";

import { useAdminSession } from "../admin-session";
import adminStyles from "../admin-shell.module.css";
import {
  AdminEmpty,
  AdminError,
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
  AdminStatus,
  humanizeError,
} from "../admin-ui";
import { AssessmentMediaStateView } from "./assessment-admin-ui";
import { getAssessmentAdminCapabilities } from "./assessment-admin-permissions";
import { AdminConfirmDialog } from "../admin-confirm-dialog";
import { AssessmentMediaUpload } from "./assessment-media-upload";
import { assessmentPublicMediaQueryArgs } from "./assessment-media-client";
import {
  assessmentOrderControls,
  assessmentRevisionConflict,
} from "./assessment-order";
import styles from "./assessment-admin.module.css";
import {
  AssessmentSectionForm,
  type AssessmentSectionInput,
} from "./assessment-section-form";
import {
  AssessmentStimulusEditor,
  type AssessmentStimulusInput,
  type AssessmentStimulusMediaOption,
} from "./assessment-stimulus-editor";
import {
  SingleChoiceItemEditor,
  type SingleChoiceItemDraft,
} from "./single-choice-item-editor";
import { useAssessmentMediaConfig } from "./use-assessment-media-config";

type ItemRow = FunctionReturnType<
  typeof api.adminAssessmentItems.listPage
>["page"][number];
type SectionWorkspace = NonNullable<
  FunctionReturnType<typeof api.adminAssessmentItems.getSectionWorkspace>
>;
type DeleteTarget =
  | { kind: "stimulus"; id: string; label: string }
  | { kind: "item"; id: string; label: string };

function itemDraft(row: ItemRow): SingleChoiceItemDraft | null {
  if (row.item.type !== "single-choice" || row.correctAnswer.kind !== "choice") {
    return null;
  }
  return {
    itemId: row.item.id,
    itemKey: row.itemKey,
    order: row.order,
    prompt: row.item.prompt,
    required: row.item.required,
    ...(row.explanation === null ? {} : { explanation: row.explanation }),
    ...(row.stimulusId === null ? {} : { stimulusId: row.stimulusId }),
    options: row.item.options,
    correctChoiceKey: row.correctAnswer.selectedChoiceKey ?? "",
    provenanceJson: row.provenanceJson,
  };
}

function stimulusDraft(
  row: SectionWorkspace["stimuli"][number],
): AssessmentStimulusInput {
  return {
    stimulusId: row.stimulusId,
    stimulusKey: row.stimulusKey,
    kind: row.kind,
    order: row.order,
    title: row.title,
    body: row.body,
    mediaId: row.mediaId,
    transcript: row.transcript,
    alt: row.alt,
    provenanceJson: row.provenanceJson,
  };
}

export function AssessmentSectionManager({
  definitionId,
  sectionId,
}: {
  definitionId: string;
  sectionId: string;
}) {
  const admin = useAdminSession();
  const capabilities = getAssessmentAdminCapabilities(admin.role);
  const mediaConfig = useAssessmentMediaConfig();
  const definition = useQuery(api.adminAssessments.getWorkspace, {
    definitionId: definitionId as Id<"assessmentDefinitions">,
  });
  const sectionWorkspace = useQuery(api.adminAssessmentItems.getSectionWorkspace, {
    sectionId: sectionId as Id<"assessmentSections">,
  });
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const items = useQuery(api.adminAssessmentItems.listPage, {
    sectionId: sectionId as Id<"assessmentSections">,
    paginationOpts: {
      cursor: cursors.at(-1) ?? null,
      numItems: 25,
      maximumRowsRead: 25,
    },
  });
  const mediaVersionId = definition?.draft?.versionId;
  const audioMedia = useQuery(
    api.adminMedia.listAssessmentPage,
    mediaVersionId
      ? assessmentPublicMediaQueryArgs(mediaVersionId, "assessment-audio")
      : "skip",
  );
  const imageMedia = useQuery(
    api.adminMedia.listAssessmentPage,
    mediaVersionId
      ? assessmentPublicMediaQueryArgs(mediaVersionId, "assessment-image")
      : "skip",
  );
  const saveSection = useMutation(api.adminAssessments.saveSection);
  const saveStimulus = useMutation(api.adminAssessments.saveStimulus);
  const saveItem = useMutation(api.adminAssessmentItems.saveSingleChoice);
  const deleteStimulus = useMutation(api.adminAssessments.deleteStimulus);
  const moveStimulus = useMutation(api.adminAssessments.moveStimulus);
  const deleteItem = useMutation(api.adminAssessmentItems.deleteItem);
  const moveItem = useMutation(api.adminAssessmentItems.moveItem);
  const [editingSection, setEditingSection] = useState(false);
  const [editingStimulus, setEditingStimulus] = useState<string | "new" | null>(null);
  const [editingItem, setEditingItem] = useState<string | "new" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  if (definition === undefined || sectionWorkspace === undefined || items === undefined) {
    return <AdminLoadingRows label="Loading section authoring workspace" />;
  }
  const draft = definition?.draft ?? null;
  const section = definition?.sections.find((candidate) => candidate.sectionId === sectionId);
  if (
    definition === null ||
    draft === null ||
    section === undefined ||
    sectionWorkspace === null ||
    sectionWorkspace.versionId !== draft.versionId
  ) {
    return (
      <AdminEmpty
        title="Section not found in this draft"
        description="Return to the assessment workspace and choose a section from the current version."
      />
    );
  }
  const currentDraft = draft;
  const currentSection = section;

  const selectedItem =
    editingItem && editingItem !== "new"
      ? items.page.find((row) => row.item.id === editingItem)
      : undefined;
  const selectedStimulus =
    editingStimulus && editingStimulus !== "new"
      ? sectionWorkspace.stimuli.find((row) => row.stimulusId === editingStimulus)
      : undefined;
  const versionMedia = [...(audioMedia?.page ?? []), ...(imageMedia?.page ?? [])].filter(
    (asset) => asset.assessmentVersionId === currentDraft.versionId,
  );
  const mediaOptions: AssessmentStimulusMediaOption[] = versionMedia
    .filter((asset) => (asset.access ?? "public") === "public")
    .map((asset) => ({
      id: asset._id,
      label: asset.originalName,
      purpose: asset.purpose as "assessment-audio" | "assessment-image",
      access: "public",
    }));

  async function run(task: () => Promise<void>) {
    setPending(true);
    setError("");
    setStatusMessage("");
    try {
      await task();
    } catch (requestError) {
      setError(humanizeError(requestError));
    } finally {
      setPending(false);
    }
  }

  async function handleSection(input: AssessmentSectionInput) {
    await run(async () => {
      const result = await saveSection({
        sectionId: currentSection.sectionId,
        versionId: currentDraft.versionId,
        expectedContentRevision: currentDraft.contentRevision,
        sectionKey: input.sectionKey,
        skill: input.skill,
        order: input.order,
        title: input.title,
        instructions: input.instructions,
        ...(input.timeLimitSeconds === undefined ? {} : { timeLimitSeconds: input.timeLimitSeconds }),
        ...(input.audioReplayPolicy === undefined ? {} : { audioReplayPolicy: input.audioReplayPolicy }),
      });
      if (!result.ok) throw new Error(`Revision changed to ${result.currentRevision}. Reload the current section before saving.`);
      setEditingSection(false);
      setStatusMessage(`Section saved as revision ${result.contentRevision}.`);
    });
  }

  async function handleStimulus(input: AssessmentStimulusInput) {
    await run(async () => {
      const result = await saveStimulus({
        ...(input.stimulusId ? { stimulusId: input.stimulusId as Id<"assessmentStimuli"> } : {}),
        versionId: currentDraft.versionId,
        sectionId: currentSection.sectionId,
        expectedContentRevision: currentDraft.contentRevision,
        stimulusKey: input.stimulusKey,
        kind: input.kind,
        order: input.order,
        title: input.title,
        body: input.body,
        mediaId: input.mediaId === null ? null : input.mediaId as Id<"mediaAssets">,
        transcript: input.transcript,
        alt: input.alt,
        provenanceJson: input.provenanceJson,
      });
      if (!result.ok) throw new Error(`Revision changed to ${result.currentRevision}. Reload the current section before saving.`);
      setEditingStimulus(null);
      setStatusMessage(`Stimulus saved as revision ${result.contentRevision}.`);
    });
  }

  async function handleItem(input: SingleChoiceItemDraft) {
    await run(async () => {
      const result = await saveItem({
        ...(input.itemId ? { itemId: input.itemId as Id<"assessmentItems"> } : {}),
        versionId: currentDraft.versionId,
        sectionId: currentSection.sectionId,
        stimulusId: input.stimulusId ? input.stimulusId as Id<"assessmentStimuli"> : null,
        expectedContentRevision: currentDraft.contentRevision,
        itemKey: input.itemKey,
        order: input.order,
        prompt: input.prompt,
        required: input.required,
        explanation: input.explanation ?? null,
        provenanceJson: input.provenanceJson,
        options: [...input.options],
        correctChoiceKey: input.correctChoiceKey,
      });
      if (!result.ok) throw new Error(`Revision changed to ${result.currentRevision}. Reload the current section before saving.`);
      setEditingItem(null);
      setStatusMessage(`Question saved as revision ${result.contentRevision}.`);
    });
  }

  async function handleMoveStimulus(stimulusId: string, targetOrder: number) {
    await run(async () => {
      const result = await moveStimulus({
        stimulusId: stimulusId as Id<"assessmentStimuli">,
        targetOrder,
        expectedContentRevision: currentDraft.contentRevision,
      });
      if (!result.ok) throw new Error(assessmentRevisionConflict(result.currentRevision));
      setStatusMessage(`Stimulus order saved as revision ${result.contentRevision}.`);
    });
  }

  async function handleMoveItem(itemId: string, targetOrder: number) {
    await run(async () => {
      const result = await moveItem({
        itemId: itemId as Id<"assessmentItems">,
        targetOrder,
        expectedContentRevision: currentDraft.contentRevision,
      });
      if (!result.ok) throw new Error(assessmentRevisionConflict(result.currentRevision));
      setCursors([null]);
      setStatusMessage(`Question order saved as revision ${result.contentRevision}.`);
    });
  }

  async function handleDelete() {
    if (deleteTarget === null) return;
    await run(async () => {
      const result =
        deleteTarget.kind === "stimulus"
          ? await deleteStimulus({
              stimulusId: deleteTarget.id as Id<"assessmentStimuli">,
              expectedContentRevision: currentDraft.contentRevision,
            })
          : await deleteItem({
              itemId: deleteTarget.id as Id<"assessmentItems">,
              expectedContentRevision: currentDraft.contentRevision,
            });
      if (!result.ok) throw new Error(assessmentRevisionConflict(result.currentRevision));
      if (deleteTarget.kind === "item") setCursors([null]);
      setEditingStimulus(null);
      setEditingItem(null);
      setStatusMessage(
        `${deleteTarget.kind === "stimulus" ? "Stimulus" : "Question"} removed in revision ${result.contentRevision}.`,
      );
      setDeleteTarget(null);
    });
  }

  const sectionInitial: AssessmentSectionInput = {
    sectionId: section.sectionId,
    sectionKey: section.sectionKey,
    skill: section.skill,
    order: section.order,
    title: section.title,
    instructions: section.instructions,
    ...(section.timeLimitSeconds === null ? {} : { timeLimitSeconds: section.timeLimitSeconds }),
    ...(section.audioReplayPolicy === null ? {} : { audioReplayPolicy: section.audioReplayPolicy }),
  };

  return (
    <>
      <Link className={adminStyles.backLink} href={`/admin/assessments/${definitionId}`}>
        <ArrowLeftIcon aria-hidden width={18} height={18} />
        Draft overview
      </Link>
      <AdminPageHeading
        title={section.title}
        description={`Section ${section.order + 1}. Questions load 25 at a time; stimuli remain bounded to 50 per section.`}
        actions={
          capabilities.canEdit ? (
            <button className={adminStyles.secondaryButton} type="button" onClick={() => setEditingSection(true)}>
              <PencilSquareIcon aria-hidden width={18} height={18} />
              Edit section
            </button>
          ) : undefined
        }
      />

      {statusMessage ? <p className={styles.successNotice} role="status">{statusMessage}</p> : null}
      {error && !editingSection && !editingStimulus && !editingItem ? <AdminError>{error}</AdminError> : null}

      {editingSection ? (
        <AdminSection title="Edit section contract" description={`Saving changes revision ${draft.contentRevision}.`}>
          <AssessmentSectionForm
            key={draft.contentRevision}
            initial={sectionInitial}
            timed={draft.timePolicy === "per-section"}
            pending={pending}
            error={error || undefined}
            onCancel={() => setEditingSection(false)}
            onSave={handleSection}
          />
        </AdminSection>
      ) : null}

      {editingStimulus ? (
        <AdminSection
          title={editingStimulus === "new" ? "Add stimulus" : "Edit stimulus"}
          description="Passages, audio, and images are versioned separately from questions."
        >
          <AssessmentStimulusEditor
            key={editingStimulus}
            initial={selectedStimulus ? stimulusDraft(selectedStimulus) : undefined}
            media={mediaOptions}
            pending={pending}
            error={error || undefined}
            onCancel={() => setEditingStimulus(null)}
            onSave={handleStimulus}
          />
        </AdminSection>
      ) : null}

      {editingItem ? (
        <AdminSection
          title={editingItem === "new" ? "Add single-choice question" : "Edit question and private key"}
          description="The learner item and protected answer key save together under one revision check."
        >
          {editingItem !== "new" && selectedItem && itemDraft(selectedItem) === null ? (
            <AdminEmpty
              title="This question format is read only"
              description="The current authoring release edits single-choice questions. Existing advanced formats remain intact."
            />
          ) : (
            <SingleChoiceItemEditor
              key={editingItem}
              initial={selectedItem ? itemDraft(selectedItem) ?? undefined : undefined}
              stimulusOptions={sectionWorkspace.stimuli.map((stimulus) => ({ value: stimulus.stimulusId, label: stimulus.title ?? stimulus.stimulusKey }))}
              pending={pending}
              error={error || undefined}
              onSave={handleItem}
            />
          )}
        </AdminSection>
      ) : null}

      <AdminSection
        title="Versioned stimuli"
        description="Reading copy and verified delivery media stay pinned to this draft version."
        actions={capabilities.canEdit ? (
          <button className={adminStyles.primaryButton} type="button" onClick={() => setEditingStimulus("new")}>
            <PlusIcon aria-hidden width={18} height={18} />
            Add stimulus
          </button>
        ) : undefined}
      >
        {sectionWorkspace.stimuli.length === 0 ? (
          <AdminEmpty title="No stimuli in this section" description="Questions may stand alone, or you can add one shared passage, audio clip, or image." />
        ) : (
          <div className={styles.authoringList}>
            {sectionWorkspace.stimuli.map((stimulus) => {
              const orderControls = assessmentOrderControls(
                stimulus.order,
                sectionWorkspace.stimuli.length,
              );
              return <div className={styles.authoringRow} key={stimulus.stimulusId}>
                <span className={styles.authoringIndex}>{stimulus.order + 1}</span>
                <span className={styles.rowCopy}>
                  <strong>{stimulus.title ?? stimulus.stimulusKey}</strong>
                  <span>{stimulus.kind}{stimulus.mediaId ? ", linked to verified media" : ""}</span>
                </span>
                <span className={styles.rowActions}>
                  <AdminStatus>{stimulus.stimulusKey}</AdminStatus>
                  {capabilities.canEdit ? (
                    <>
                      <button className={adminStyles.iconButton} type="button" disabled={pending || !orderControls.canMoveUp} aria-label={`Move ${stimulus.title ?? stimulus.stimulusKey} up`} onClick={() => void handleMoveStimulus(stimulus.stimulusId, stimulus.order - 1)}>
                        <ArrowUpIcon aria-hidden width={18} height={18} />
                      </button>
                      <button className={adminStyles.iconButton} type="button" disabled={pending || !orderControls.canMoveDown} aria-label={`Move ${stimulus.title ?? stimulus.stimulusKey} down`} onClick={() => void handleMoveStimulus(stimulus.stimulusId, stimulus.order + 1)}>
                        <ArrowDownIcon aria-hidden width={18} height={18} />
                      </button>
                      <button className={adminStyles.secondaryButton} type="button" disabled={pending} onClick={() => setEditingStimulus(stimulus.stimulusId)}>
                        Edit
                      </button>
                      <button className={adminStyles.iconButton} type="button" disabled={pending} aria-label={`Remove ${stimulus.title ?? stimulus.stimulusKey}`} onClick={() => setDeleteTarget({ kind: "stimulus", id: stimulus.stimulusId, label: stimulus.title ?? stimulus.stimulusKey })}>
                        <TrashIcon aria-hidden width={18} height={18} />
                      </button>
                    </>
                  ) : null}
                </span>
              </div>
            })}
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Questions and protected keys"
        description="Only administrator queries receive correct answers. The public practice API returns question content without the key table."
        actions={capabilities.canEdit ? (
          <button className={adminStyles.primaryButton} type="button" onClick={() => setEditingItem("new")}>
            <PlusIcon aria-hidden width={18} height={18} />
            Add question
          </button>
        ) : undefined}
      >
        {items.page.length === 0 ? (
          <AdminEmpty title="No questions on this page" description="Add the first single-choice question or return to an earlier page." />
        ) : (
          <div className={styles.authoringList}>
            {items.page.map((row) => {
              const orderControls = assessmentOrderControls(row.order, currentSection.itemCount);
              return <div className={styles.authoringRow} key={row.item.id}>
                <span className={styles.authoringIndex}>{row.order + 1}</span>
                <span className={styles.rowCopy}>
                  <strong>{row.item.prompt}</strong>
                  <span>{row.item.type}, {row.itemKey}</span>
                </span>
                <span className={styles.rowActions}>
                  <AdminStatus tone="warning">
                    <LockClosedIcon aria-hidden width={14} height={14} />
                    Private key
                  </AdminStatus>
                  {capabilities.canEdit ? (
                    <>
                      <button className={adminStyles.iconButton} type="button" disabled={pending || !orderControls.canMoveUp} aria-label={`Move ${row.itemKey} up`} onClick={() => void handleMoveItem(row.item.id, row.order - 1)}>
                        <ArrowUpIcon aria-hidden width={18} height={18} />
                      </button>
                      <button className={adminStyles.iconButton} type="button" disabled={pending || !orderControls.canMoveDown} aria-label={`Move ${row.itemKey} down`} onClick={() => void handleMoveItem(row.item.id, row.order + 1)}>
                        <ArrowDownIcon aria-hidden width={18} height={18} />
                      </button>
                      <button className={adminStyles.secondaryButton} type="button" disabled={pending} onClick={() => setEditingItem(row.item.id)}>
                        Edit
                      </button>
                      <button className={adminStyles.iconButton} type="button" disabled={pending} aria-label={`Remove ${row.itemKey}`} onClick={() => setDeleteTarget({ kind: "item", id: row.item.id, label: row.itemKey })}>
                        <TrashIcon aria-hidden width={18} height={18} />
                      </button>
                    </>
                  ) : null}
                </span>
              </div>
            })}
          </div>
        )}
        {cursors.length > 1 || !items.isDone ? (
          <nav className={adminStyles.listFooter} aria-label="Question pages">
            <div className={adminStyles.buttonRow}>
              <button className={adminStyles.secondaryButton} type="button" disabled={cursors.length === 1} onClick={() => setCursors((current) => current.slice(0, Math.max(1, current.length - 1)))}>
                <ChevronLeftIcon aria-hidden width={18} height={18} />
                Previous
              </button>
              <button className={adminStyles.secondaryButton} type="button" disabled={items.isDone} onClick={() => setCursors((current) => [...current, items.continueCursor])}>
                Next
                <ChevronRightIcon aria-hidden width={18} height={18} />
              </button>
            </div>
          </nav>
        ) : null}
      </AdminSection>

      <AdminSection title="R2 assessment media" description="This view shows ready assets linked to the current assessment version. Private drafts do not expose a public URL.">
        {capabilities.canEdit && mediaConfig.status?.privateDraftReady ? (
          <AssessmentMediaUpload
            versionId={currentDraft.versionId}
            onComplete={() =>
              setStatusMessage(
                "Private source verified. A publisher must inspect its signed preview and create the public derivative before a stimulus can select it.",
              )
            }
          />
        ) : capabilities.canEdit && !mediaConfig.loading ? (
          <div className={styles.sourceNotice}>
            <LockClosedIcon aria-hidden width={20} height={20} />
            <span>
              Confidential upload is disabled until the separate private assessment R2 bucket is configured. Ready public derivatives remain selectable above.
            </span>
          </div>
        ) : mediaConfig.loading ? (
          <AdminLoadingRows label="Checking private R2 configuration" />
        ) : null}
        {audioMedia === undefined || imageMedia === undefined ? (
          <AdminLoadingRows label="Loading assessment media" />
        ) : (
          <AssessmentMediaStateView
            assets={versionMedia.map((asset) => ({
              id: asset._id,
              name: asset.originalName,
              purpose: asset.purpose as "assessment-audio" | "assessment-image",
              status: asset.status,
              access: asset.access ?? "public",
              byteSize: asset.byteSize,
              ...(asset.durationMs === undefined ? {} : { durationMs: asset.durationMs }),
              updatedAt: asset.updatedAt,
            }))}
          />
        )}
      </AdminSection>

      <AdminConfirmDialog
        open={deleteTarget !== null}
        title={`Remove ${deleteTarget?.kind ?? "content"}?`}
        description={
          deleteTarget?.kind === "stimulus"
            ? `${deleteTarget.label} can only be removed when no question references it. This changes the draft revision.`
            : `${deleteTarget?.label ?? "This question"} and its private answer key will be removed from this draft.`
        }
        confirmLabel="Remove from draft"
        pending={pending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
