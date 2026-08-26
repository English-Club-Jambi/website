"use client";

import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleStackIcon,
  InformationCircleIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  assessmentTaskFamilyLabelByValue,
  taskFamilySelectGroupsForSkill,
} from "@content/assessment-task-families";
import { SelectField } from "@/components/forms/select-field";

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
import { getAssessmentAdminCapabilities } from "./assessment-admin-permissions";
import {
  QuestionAudioField,
  type QuestionAudioAsset,
} from "./question-audio-field";
import {
  QuestionIllustrationField,
  type QuestionIllustrationAsset,
} from "./question-illustration-field";
import styles from "./assessment-admin.module.css";

type BankStatus = "ready" | "paused" | "archived";
type Difficulty = "foundational" | "developing" | "advanced";
type Skill = "reading" | "listening" | "writing" | "speaking";
type TaskFamily = FunctionReturnType<
  typeof api.adminAssessmentQuestionBank.listPage
>["page"][number]["taskFamily"];
type BankRow = FunctionReturnType<
  typeof api.adminAssessmentQuestionBank.listPage
>["page"][number];
type BankContent = BankRow["content"];
type BankProfile = BankRow["profile"];

const statusOptions = [
  { value: "ready", label: "Ready for selection" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
] as const;

const skillOptions = [
  { value: "all", label: "All skills" },
  { value: "reading", label: "Reading" },
  { value: "listening", label: "Listening" },
  { value: "writing", label: "Writing" },
  { value: "speaking", label: "Speaking" },
] as const;

const difficultyOptions = [
  { value: "all", label: "All difficulty levels" },
  { value: "foundational", label: "Foundational" },
  { value: "developing", label: "Developing" },
  { value: "advanced", label: "Advanced" },
] as const;

const requiredBySkill: Record<Skill, number> = {
  reading: 50,
  listening: 47,
  writing: 12,
  speaking: 11,
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function itemTypeLabel(value: BankContent["type"]) {
  return {
    "single-choice": "Single choice",
    "multiple-select": "Multiple select",
    "cloze-select": "Cloze select",
    "sentence-build": "Sentence build",
    "constructed-response": "Constructed response",
  }[value];
}

const profileLabelByValue: Record<BankProfile, string> = {
  "ec-itp-level-1-aligned-v1": "English Club ITP Level 1",
  "ec-ibt-style-2026-v1": "English Club four-skill practice (2026)",
  "club-program-v1": "English Club programme quiz",
};

function mediaNameFromUrl(publicUrl: string, fallback: string) {
  try {
    const filename = new URL(publicUrl).pathname
      .split("/")
      .filter(Boolean)
      .at(-1);
    return filename ? decodeURIComponent(filename) : fallback;
  } catch {
    return fallback;
  }
}

function rowSelectionState(row: BankRow) {
  if (row.status === "archived") {
    return { label: "Archived", tone: "neutral" as const };
  }
  if (row.status === "paused") {
    return { label: "Paused", tone: "neutral" as const };
  }
  if (row.skill === "listening" && row.audio === null) {
    return { label: "Audio required", tone: "danger" as const };
  }
  return { label: "Format default", tone: "success" as const };
}

export function QuestionBankManager() {
  const admin = useAdminSession();
  const capabilities = getAssessmentAdminCapabilities(admin.role);
  const [status, setStatus] = useState<BankStatus>("ready");
  const [skill, setSkill] = useState<Skill | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const cursor = cursors.at(-1) ?? null;
  const summary = useQuery(api.adminAssessmentQuestionBank.getSummary, {});
  const result = useQuery(api.adminAssessmentQuestionBank.listPage, {
    status,
    ...(skill === "all" ? {} : { skill }),
    ...(difficulty === "all" ? {} : { difficulty }),
    paginationOpts: {
      cursor,
      numItems: 20,
      maximumRowsRead: 20,
    },
  });
  const illustrationResult = useQuery(api.adminMedia.listPage, {
    purpose: "assessment-image",
    status: "ready",
    paginationOpts: {
      cursor: null,
      numItems: 24,
      maximumRowsRead: 24,
    },
  });
  const audioResult = useQuery(api.adminMedia.listPage, {
    purpose: "assessment-audio",
    status: "ready",
    paginationOpts: {
      cursor: null,
      numItems: 24,
      maximumRowsRead: 24,
    },
  });
  const illustrationAssets = illustrationResult?.page ?? [];
  const audioAssets = audioResult?.page ?? [];

  function resetPage() {
    setCursors([null]);
    setSelectedId(null);
  }

  const selected =
    result?.page.find((row) => row.bankQuestionId === selectedId) ??
    result?.page[0] ??
    null;

  return (
    <>
      <AdminPageHeading
        title="Question Bank"
        description="Control which reviewed questions can be drawn into a full practice attempt. Every attempt keeps its own immutable selection manifest."
        actions={
          <>
            <button
              type="button"
              className={adminStyles.primaryButton}
              disabled={!capabilities.canEdit}
              aria-expanded={creating}
              onClick={() => setCreating((current) => !current)}
            >
              {creating ? (
                <XMarkIcon aria-hidden width={18} height={18} />
              ) : (
                <PlusIcon aria-hidden width={18} height={18} />
              )}
              {creating ? "Close builder" : "Add question"}
            </button>
            <Link
              className={adminStyles.secondaryButton}
              href="/admin/assessments"
            >
              Back to assessments
            </Link>
          </>
        }
      />

      {creating ? (
        <AdminSection
          title="Author a bank question"
          description="Create an original single-choice question, keep its answer key private, and review its selection settings before it can enter a live practice."
        >
          <QuestionBankCreateForm
            illustrationAssets={illustrationAssets}
            audioAssets={audioAssets}
            onCancel={() => setCreating(false)}
            onCreated={(bankQuestionId) => {
              setStatus("paused");
              setSkill("all");
              setDifficulty("all");
              setCursors([null]);
              setSelectedId(bankQuestionId);
              setCreating(false);
            }}
          />
        </AdminSection>
      ) : null}

      <AdminSection
        title="Full-practice capacity"
        description="Ready and eligible questions are sampled without duplicates. Pool capacity must meet every section quota before an attempt can start."
      >
        {summary === undefined ? (
          <AdminLoadingRows label="Loading question bank capacity" />
        ) : (
          <div className={styles.bankCapacityGrid}>
            {summary.bySkill.map(({ skill: capacitySkill, count }) => {
              const required = requiredBySkill[capacitySkill];
              const ready = count >= required;
              return (
                <div
                  key={capacitySkill}
                  className={styles.bankCapacityCard}
                  data-ready={ready}
                >
                  <span>{titleCase(capacitySkill)}</span>
                  <strong>
                    {count}
                    <small> / {required}</small>
                  </strong>
                  <AdminStatus tone={ready ? "success" : "danger"}>
                    {ready ? "Ready" : `${required - count} short`}
                  </AdminStatus>
                </div>
              );
            })}
            <div className={styles.bankCapacityCard}>
              <span>Catalogue</span>
              <strong>
                {summary.total}
                {summary.capped ? <small>+</small> : null}
              </strong>
              <AdminStatus tone="neutral">
                {summary.eligible} eligible
              </AdminStatus>
            </div>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Bank catalogue"
        description="Author and revise questions here, then set review status, task family, difficulty, media, and tags."
      >
        <div className={styles.bankFormatNotice}>
          <InformationCircleIcon aria-hidden width={21} height={21} />
          <div>
            <strong>Ready questions are allowed by default.</strong>
            <p>
              Each Practice Format can keep that default, disable a question, or
              add an explicit exception. Attempt manifests keep the exact
              question revision they received.
            </p>
          </div>
          <Link className={adminStyles.textButton} href="/admin/assessments">
            Manage formats
          </Link>
        </div>
        <div className={styles.bankToolbar}>
          <SelectField
            label="Selection status"
            value={status}
            options={statusOptions}
            onValueChange={(value) => {
              setStatus(value as BankStatus);
              resetPage();
            }}
          />
          <SelectField
            label="Skill"
            value={skill}
            options={skillOptions}
            onValueChange={(value) => {
              setSkill(value as Skill | "all");
              resetPage();
            }}
          />
          <SelectField
            label="Difficulty"
            value={difficulty}
            options={difficultyOptions}
            onValueChange={(value) => {
              setDifficulty(value as Difficulty | "all");
              resetPage();
            }}
          />
          <div className={adminStyles.workspaceFact} role="status">
            <span>Page</span>
            <strong>{cursors.length}</strong>
          </div>
        </div>

        {result === undefined ? (
          <AdminLoadingRows label="Loading question bank" />
        ) : result.page.length === 0 || selected === null ? (
          <AdminEmpty
            title="No questions match this view"
            description="Change the skill, difficulty, or status filter to inspect another part of the bank."
          />
        ) : (
          <div className={styles.bankWorkspace}>
            <div
              className={styles.bankList}
              role="list"
              aria-label="Question bank entries"
            >
              {result.page.map((row) => {
                const active = row.bankQuestionId === selected.bankQuestionId;
                const selectionState = rowSelectionState(row);
                return (
                  <div
                    key={row.bankQuestionId}
                    className={styles.bankRow}
                    data-active={active}
                    role="listitem"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.bankQuestionId)}
                      aria-pressed={active}
                    >
                      <span className={styles.bankRowIndex}>
                        <CircleStackIcon aria-hidden width={18} height={18} />
                      </span>
                      <span className={styles.bankRowCopy}>
                        <strong>{row.prompt}</strong>
                        <small>
                          {titleCase(row.skill)} ·{" "}
                          {assessmentTaskFamilyLabelByValue[row.taskFamily]} ·{" "}
                          {titleCase(row.difficulty)}
                        </small>
                      </span>
                      <AdminStatus tone={selectionState.tone}>
                        {selectionState.label}
                      </AdminStatus>
                    </button>
                  </div>
                );
              })}
            </div>
            <QuestionBankEditor
              key={selected.bankQuestionId}
              row={selected}
              canEdit={capabilities.canEdit}
              illustrationAssets={illustrationAssets}
              audioAssets={audioAssets}
            />
          </div>
        )}

        {result && (cursors.length > 1 || !result.isDone) ? (
          <nav
            className={adminStyles.listFooter}
            aria-label="Question bank pages"
          >
            <div className={adminStyles.buttonRow}>
              <button
                className={adminStyles.secondaryButton}
                type="button"
                disabled={cursors.length === 1}
                onClick={() => {
                  setCursors((current) =>
                    current.slice(0, Math.max(1, current.length - 1)),
                  );
                  setSelectedId(null);
                }}
              >
                <ChevronLeftIcon aria-hidden width={18} height={18} />
                Previous
              </button>
              <button
                className={adminStyles.secondaryButton}
                type="button"
                disabled={result.isDone}
                onClick={() => {
                  setCursors((current) => [...current, result.continueCursor]);
                  setSelectedId(null);
                }}
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

const defaultTaskFamilyBySkill: Record<Skill, TaskFamily> = {
  reading: "read-academic-passage",
  listening: "listen-conversation",
  writing: "build-sentence",
  speaking: "take-interview",
};

const authoredSkillOptions = skillOptions.filter(
  (option) => option.value !== "all",
);

function QuestionBankCreateForm({
  illustrationAssets,
  audioAssets,
  onCancel,
  onCreated,
}: {
  illustrationAssets: ReadonlyArray<QuestionIllustrationAsset>;
  audioAssets: ReadonlyArray<QuestionAudioAsset>;
  onCancel: () => void;
  onCreated: (bankQuestionId: string) => void;
}) {
  const createQuestion = useMutation(
    api.adminAssessmentQuestionBank.createQuestion,
  );
  const requestIdRef = useRef<string | null>(null);
  const [skill, setSkill] = useState<Skill>("reading");
  const [taskFamily, setTaskFamily] = useState<TaskFamily>(
    defaultTaskFamilyBySkill.reading,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>("developing");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState([
    { key: "a", label: "" },
    { key: "b", label: "" },
    { key: "c", label: "" },
    { key: "d", label: "" },
  ]);
  const [correctChoiceKey, setCorrectChoiceKey] = useState("a");
  const [explanation, setExplanation] = useState("");
  const [tags, setTags] = useState("");
  const [illustrationMediaId, setIllustrationMediaId] = useState<string | null>(
    null,
  );
  const [audioMediaId, setAudioMediaId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleanedOptions = options.map((option) => ({
      ...option,
      label: option.label.trim().replace(/\s+/g, " "),
    }));
    if (cleanedOptions.some((option) => option.label.length === 0)) {
      setError("Write all four answer choices before saving the question.");
      return;
    }
    if (
      new Set(
        cleanedOptions.map((option) => option.label.toLocaleLowerCase("en")),
      ).size !== cleanedOptions.length
    ) {
      setError("Each answer choice needs distinct wording.");
      return;
    }
    if (skill === "listening" && audioMediaId === null) {
      setError(
        "Choose or upload a reviewed recording before creating a Listening question.",
      );
      return;
    }
    setPending(true);
    try {
      requestIdRef.current ??= `bank-question-${crypto.randomUUID()}`;
      const result = await createQuestion({
        requestId: requestIdRef.current,
        skill,
        taskFamily,
        difficulty,
        prompt: prompt.trim(),
        options: cleanedOptions,
        correctChoiceKey,
        explanation: explanation.trim() || null,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        illustrationMediaId:
          illustrationMediaId === null
            ? null
            : (illustrationMediaId as Id<"mediaAssets">),
        audioMediaId:
          audioMediaId === null ? null : (audioMediaId as Id<"mediaAssets">),
      });
      requestIdRef.current = null;
      onCreated(result.bankQuestionId);
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className={styles.questionCreatePanel}
      aria-label="Author a bank question"
      onSubmit={submit}
    >
      <div className={styles.questionCreateIntro}>
        <div>
          <h3>Single-choice question</h3>
          <p>
            The answer key stays private. New questions remain paused until a
            reviewer explicitly makes them available to a practice form.
          </p>
        </div>
        <button
          type="button"
          className={adminStyles.iconButton}
          aria-label="Close question builder"
          onClick={onCancel}
        >
          <XMarkIcon aria-hidden width={20} height={20} />
        </button>
      </div>

      <div className={adminStyles.formGridWide}>
        <div className={adminStyles.spanFour}>
          <SelectField
            label="Skill"
            value={skill}
            options={authoredSkillOptions}
            disabled={pending}
            onValueChange={(value) => {
              const nextSkill = value as Skill;
              setSkill(nextSkill);
              setTaskFamily(defaultTaskFamilyBySkill[nextSkill]);
              if (nextSkill !== "listening") setAudioMediaId(null);
            }}
          />
        </div>
        <div className={adminStyles.spanFour}>
          <SelectField
            label="Task family"
            value={taskFamily}
            groups={taskFamilySelectGroupsForSkill(skill)}
            disabled={pending}
            onValueChange={(value) => setTaskFamily(value as TaskFamily)}
          />
        </div>
        <div className={adminStyles.spanFour}>
          <SelectField
            label="Difficulty"
            value={difficulty}
            options={difficultyOptions.filter(
              (option) => option.value !== "all",
            )}
            disabled={pending}
            onValueChange={(value) => setDifficulty(value as Difficulty)}
          />
        </div>

        <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
          <span>Question prompt</span>
          <textarea
            value={prompt}
            minLength={2}
            maxLength={4_000}
            required
            disabled={pending}
            placeholder="Write the exact question the learner will answer"
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>

        <div className={`${styles.questionOptionGrid} ${adminStyles.spanFull}`}>
          {options.map((option, index) => (
            <label className={adminStyles.field} key={option.key}>
              <span>Answer {option.key.toUpperCase()}</span>
              <input
                value={option.label}
                minLength={1}
                maxLength={500}
                required
                disabled={pending}
                onChange={(event) =>
                  setOptions((current) =>
                    current.map((candidate, optionIndex) =>
                      optionIndex === index
                        ? { ...candidate, label: event.target.value }
                        : candidate,
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>

        <div className={adminStyles.spanFour}>
          <SelectField
            label="Correct answer"
            value={correctChoiceKey}
            options={options.map((option) => ({
              value: option.key,
              label: `${option.key.toUpperCase()}. ${option.label.trim() || "Answer not written yet"}`,
            }))}
            disabled={pending}
            onValueChange={setCorrectChoiceKey}
          />
        </div>
        <label className={`${adminStyles.field} ${adminStyles.spanEight}`}>
          <span>Tags</span>
          <input
            value={tags}
            maxLength={190}
            disabled={pending}
            placeholder="campus-life, inference"
            onChange={(event) => setTags(event.target.value)}
          />
        </label>
        <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
          <span>Answer note</span>
          <textarea
            value={explanation}
            maxLength={4_000}
            disabled={pending}
            placeholder="Explain why the keyed response is the best answer"
            onChange={(event) => setExplanation(event.target.value)}
          />
        </label>

        <div className={adminStyles.spanFull}>
          <QuestionIllustrationField
            assets={illustrationAssets}
            selectedMediaId={illustrationMediaId}
            disabled={pending}
            onChange={setIllustrationMediaId}
          />
        </div>
        {skill === "listening" ? (
          <div className={adminStyles.spanFull}>
            <QuestionAudioField
              assets={audioAssets}
              selectedMediaId={audioMediaId}
              disabled={pending}
              onChange={setAudioMediaId}
            />
          </div>
        ) : null}
      </div>
      {error ? <AdminError>{error}</AdminError> : null}
      <footer className={styles.questionCreateFooter}>
        <p>
          Saving keeps the question and its private answer key together. Use the
          selection settings afterward to review and activate it.
        </p>
        <div className={adminStyles.buttonRow}>
          <button
            type="button"
            className={adminStyles.secondaryButton}
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={adminStyles.primaryButton}
            disabled={pending}
          >
            <PlusIcon aria-hidden width={18} height={18} />
            {pending ? "Creating…" : "Create paused question"}
          </button>
        </div>
      </footer>
    </form>
  );
}

function QuestionBankEditor({
  row,
  canEdit,
  illustrationAssets,
  audioAssets,
}: {
  row: BankRow;
  canEdit: boolean;
  illustrationAssets: ReadonlyArray<QuestionIllustrationAsset>;
  audioAssets: ReadonlyArray<QuestionAudioAsset>;
}) {
  const updateContent = useMutation(
    api.adminAssessmentQuestionBank.updateContent,
  );
  const updateMetadata = useMutation(
    api.adminAssessmentQuestionBank.updateMetadata,
  );
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(row.updatedAt);
  const [content, setContent] = useState<BankContent>(row.content);
  const [status, setStatus] = useState<BankStatus>(row.status);
  const [taskFamily, setTaskFamily] = useState<TaskFamily>(row.taskFamily);
  const [difficulty, setDifficulty] = useState<Difficulty>(row.difficulty);
  const [tags, setTags] = useState(row.tags.join(", "));
  const [illustrationMediaId, setIllustrationMediaId] = useState<string | null>(
    row.illustration?.mediaId ?? null,
  );
  const [audioMediaId, setAudioMediaId] = useState<string | null>(
    row.audio?.mediaId ?? null,
  );
  const [contentPending, setContentPending] = useState(false);
  const [settingsPending, setSettingsPending] = useState(false);
  const [contentMessage, setContentMessage] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [contentError, setContentError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const pending = contentPending || settingsPending;
  const selectableIllustrationAssets =
    row.illustration !== null &&
    !illustrationAssets.some(
      (asset) => asset._id === row.illustration?.mediaId,
    )
      ? [
          {
            _id: row.illustration.mediaId,
            publicUrl: row.illustration.publicUrl,
            alt: row.illustration.alt,
            width: row.illustration.width,
            height: row.illustration.height,
            originalName: mediaNameFromUrl(
              row.illustration.publicUrl,
              "Attached question illustration",
            ),
          },
          ...illustrationAssets,
        ]
      : illustrationAssets;
  const selectableAudioAssets =
    row.audio !== null &&
    !audioAssets.some((asset) => asset._id === row.audio?.mediaId)
      ? [
          {
            _id: row.audio.mediaId,
            publicUrl: row.audio.publicUrl,
            alt: row.audio.description,
            durationMs: row.audio.durationMs,
            originalName: mediaNameFromUrl(
              row.audio.publicUrl,
              "Attached Listening audio",
            ),
          },
          ...audioAssets,
        ]
      : audioAssets;

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContentPending(true);
    setContentMessage("");
    setContentError("");
    if (
      row.skill === "listening" &&
      row.status === "ready" &&
      audioMediaId === null
    ) {
      setContentError(
        "Pause this question in Review and selection before removing its audio.",
      );
      setContentPending(false);
      return;
    }
    try {
      const normalizedContent = {
        ...content,
        prompt: content.prompt.trim(),
        explanation: content.explanation?.trim() || null,
      } as BankContent;
      const result = await updateContent({
        bankQuestionId: row.bankQuestionId,
        expectedUpdatedAt,
        content: normalizedContent,
        illustrationMediaId:
          illustrationMediaId === null
            ? null
            : (illustrationMediaId as Id<"mediaAssets">),
        audioMediaId:
          audioMediaId === null ? null : (audioMediaId as Id<"mediaAssets">),
      });
      if (!result.ok) {
        setContentError(
          "This question changed in another session. Reload it before saving again.",
        );
        return;
      }
      setExpectedUpdatedAt(result.updatedAt);
      setContent(normalizedContent);
      setContentMessage(
        "Question revision saved. Existing attempts still use their pinned revision.",
      );
    } catch (caught) {
      setContentError(humanizeError(caught));
    } finally {
      setContentPending(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsPending(true);
    setSettingsMessage("");
    setSettingsError("");
    if (
      row.skill === "listening" &&
      status === "ready" &&
      audioMediaId === null
    ) {
      setSettingsError(
        "A Listening question needs reviewed audio before it can be ready.",
      );
      setSettingsPending(false);
      return;
    }
    try {
      const result = await updateMetadata({
        bankQuestionId: row.bankQuestionId,
        expectedUpdatedAt,
        status,
        taskFamily,
        difficulty,
        fullPracticeEligible: status === "ready",
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        illustrationMediaId:
          illustrationMediaId === null
            ? null
            : (illustrationMediaId as Id<"mediaAssets">),
        audioMediaId:
          audioMediaId === null ? null : (audioMediaId as Id<"mediaAssets">),
      });
      if (!result.ok) {
        setSettingsError(
          "This question changed in another session. Reload it before saving again.",
        );
        return;
      }
      setExpectedUpdatedAt(result.updatedAt);
      setSettingsMessage(
        status === "ready"
          ? "Settings saved. Compatible Practice Formats now allow this question by default."
          : "Question settings saved.",
      );
    } catch (caught) {
      setSettingsError(humanizeError(caught));
    } finally {
      setSettingsPending(false);
    }
  }

  return (
    <aside className={styles.bankEditor} aria-label="Selected question editor">
      <header>
        <div>
          <span>{row.sourceTitle}</span>
          <h3>Edit bank question</h3>
        </div>
        <AdminStatus tone="neutral">
          {itemTypeLabel(row.content.type)}
        </AdminStatus>
      </header>

      <form className={styles.bankEditorSection} onSubmit={saveContent}>
        <div className={styles.bankEditorSectionHeading}>
          <div>
            <h4>Question and answer key</h4>
            <p>
              Edit this item here, even when it came from a published or older
              assessment. Saving creates a new source revision.
            </p>
          </div>
          <AdminStatus tone="neutral">Private key</AdminStatus>
        </div>
        <QuestionContentFields
          content={content}
          disabled={!canEdit || pending}
          onChange={setContent}
        />
        <div className={styles.bankMediaFields}>
          <QuestionIllustrationField
            assets={selectableIllustrationAssets}
            selectedMediaId={illustrationMediaId}
            disabled={!canEdit || pending}
            onChange={setIllustrationMediaId}
          />
          {row.skill === "listening" ? (
            <QuestionAudioField
              assets={selectableAudioAssets}
              selectedMediaId={audioMediaId}
              disabled={!canEdit || pending}
              onChange={setAudioMediaId}
            />
          ) : null}
        </div>
        {contentError ? <AdminError>{contentError}</AdminError> : null}
        <div className={styles.bankEditorActionBar}>
          <p role="status">
            {contentMessage ||
              "Answer details stay inside the protected admin query and mutation."}
          </p>
          <button
            className={adminStyles.primaryButton}
            type="submit"
            disabled={!canEdit || pending}
          >
            <CheckCircleIcon aria-hidden width={18} height={18} />
            {contentPending ? "Saving revision…" : "Save question revision"}
          </button>
        </div>
      </form>

      <form className={styles.bankEditorSection} onSubmit={saveSettings}>
        <div className={styles.bankEditorSectionHeading}>
          <div>
            <h4>Review and selection</h4>
            <p>
              Ready, compatible questions inherit each format&apos;s default.
              Explicit allow and disable rules live in Practice Builder.
            </p>
          </div>
          <Link className={adminStyles.textButton} href="/admin/assessments">
            Practice Formats
          </Link>
        </div>
        <div className={styles.bankEditorFields}>
          <SelectField
            label="Status"
            value={status}
            options={statusOptions}
            disabled={!canEdit || pending}
            onValueChange={(value) => setStatus(value as BankStatus)}
          />
          <SelectField
            label="Task family"
            value={taskFamily}
            groups={taskFamilySelectGroupsForSkill(row.skill)}
            disabled={!canEdit || pending}
            onValueChange={(value) => setTaskFamily(value as TaskFamily)}
          />
          <SelectField
            label="Difficulty"
            value={difficulty}
            options={difficultyOptions.filter(
              (option) => option.value !== "all",
            )}
            disabled={!canEdit || pending}
            onValueChange={(value) => setDifficulty(value as Difficulty)}
          />
          <label className={adminStyles.field}>
            <span>Tags</span>
            <input
              value={tags}
              maxLength={260}
              disabled={!canEdit || pending}
              placeholder="campus-life, inference"
              onChange={(event) => setTags(event.target.value)}
            />
          </label>
        </div>
        {settingsError ? <AdminError>{settingsError}</AdminError> : null}
        <div className={styles.bankEditorActionBar}>
          <p role="status">
            {settingsMessage ||
              "Practice Format overrides decide exceptions to the ready default."}
          </p>
          <button
            className={adminStyles.primaryButton}
            type="submit"
            disabled={!canEdit || pending}
          >
            <CheckCircleIcon aria-hidden width={18} height={18} />
            {settingsPending ? "Saving settings…" : "Save review settings"}
          </button>
        </div>
      </form>

      <dl className={styles.bankFacts}>
        <div>
          <dt>Profile</dt>
          <dd>{profileLabelByValue[row.profile]}</dd>
        </div>
        <div>
          <dt>Uses</dt>
          <dd>
            {row.usageCount}
            {row.usageCountCapped ? "+" : ""}
          </dd>
        </div>
        <div>
          <dt>Item type</dt>
          <dd>{itemTypeLabel(row.content.type)}</dd>
        </div>
        <div>
          <dt>Points</dt>
          <dd>{row.points}</dd>
        </div>
      </dl>
    </aside>
  );
}

function QuestionContentFields({
  content,
  disabled,
  onChange,
}: {
  content: BankContent;
  disabled: boolean;
  onChange: (content: BankContent) => void;
}) {
  return (
    <div className={styles.questionContentFields}>
      <label className={adminStyles.field}>
        <span>Question prompt</span>
        <textarea
          value={content.prompt}
          minLength={2}
          maxLength={4_000}
          required
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...content, prompt: event.target.value } as BankContent)
          }
        />
      </label>

      {content.type === "single-choice" ? (
        <SingleChoiceFields
          content={content}
          disabled={disabled}
          onChange={onChange}
        />
      ) : content.type === "multiple-select" ? (
        <MultipleSelectFields
          content={content}
          disabled={disabled}
          onChange={onChange}
        />
      ) : content.type === "cloze-select" ? (
        <ClozeFields
          content={content}
          disabled={disabled}
          onChange={onChange}
        />
      ) : content.type === "sentence-build" ? (
        <SentenceBuildFields
          content={content}
          disabled={disabled}
          onChange={onChange}
        />
      ) : (
        <ConstructedResponseFields
          content={content}
          disabled={disabled}
          onChange={onChange}
        />
      )}

      <label className={adminStyles.field}>
        <span>Answer note</span>
        <textarea
          value={content.explanation ?? ""}
          minLength={2}
          maxLength={4_000}
          disabled={disabled}
          placeholder="Explain how the review key should be interpreted"
          onChange={(event) =>
            onChange({
              ...content,
              explanation: event.target.value || null,
            } as BankContent)
          }
        />
      </label>
    </div>
  );
}

type SingleChoiceContent = Extract<BankContent, { type: "single-choice" }>;
type MultipleSelectContent = Extract<BankContent, { type: "multiple-select" }>;
type ClozeContent = Extract<BankContent, { type: "cloze-select" }>;
type SentenceBuildContent = Extract<BankContent, { type: "sentence-build" }>;
type ConstructedResponseContent = Extract<
  BankContent,
  { type: "constructed-response" }
>;

function SingleChoiceFields({
  content,
  disabled,
  onChange,
}: {
  content: SingleChoiceContent;
  disabled: boolean;
  onChange: (content: BankContent) => void;
}) {
  const name = useId();
  return (
    <fieldset className={styles.questionTypePanel} disabled={disabled}>
      <legend>
        Answer choices <span>Choose one key</span>
      </legend>
      <div className={styles.questionOptionEditList}>
        {content.options.map((option, index) => (
          <div className={styles.questionOptionEditRow} key={option.key}>
            <label className={adminStyles.field}>
              <span>Answer {option.key.toUpperCase()}</span>
              <input
                value={option.label}
                minLength={1}
                maxLength={500}
                required
                onChange={(event) =>
                  onChange({
                    ...content,
                    options: content.options.map((candidate, optionIndex) =>
                      optionIndex === index
                        ? { ...candidate, label: event.target.value }
                        : candidate,
                    ),
                  })
                }
              />
            </label>
            <label className={styles.answerKeyControl}>
              <input
                type="radio"
                name={name}
                checked={content.correctChoiceKey === option.key}
                onChange={() =>
                  onChange({ ...content, correctChoiceKey: option.key })
                }
              />
              Correct answer
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function MultipleSelectFields({
  content,
  disabled,
  onChange,
}: {
  content: MultipleSelectContent;
  disabled: boolean;
  onChange: (content: BankContent) => void;
}) {
  return (
    <fieldset className={styles.questionTypePanel} disabled={disabled}>
      <legend>
        Answer choices <span>Choose every keyed response</span>
      </legend>
      <div className={styles.questionOptionEditList}>
        {content.options.map((option, index) => {
          const checked = content.correctChoiceKeys.includes(option.key);
          return (
            <div className={styles.questionOptionEditRow} key={option.key}>
              <label className={adminStyles.field}>
                <span>Answer {option.key.toUpperCase()}</span>
                <input
                  value={option.label}
                  minLength={1}
                  maxLength={500}
                  required
                  onChange={(event) =>
                    onChange({
                      ...content,
                      options: content.options.map((candidate, optionIndex) =>
                        optionIndex === index
                          ? { ...candidate, label: event.target.value }
                          : candidate,
                      ),
                    })
                  }
                />
              </label>
              <label className={styles.answerKeyControl}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange({
                      ...content,
                      correctChoiceKeys: checked
                        ? content.correctChoiceKeys.filter(
                            (key) => key !== option.key,
                          )
                        : [...content.correctChoiceKeys, option.key],
                    })
                  }
                />
                Correct answer
              </label>
            </div>
          );
        })}
      </div>
      <div className={styles.questionNumberGrid}>
        <label className={adminStyles.field}>
          <span>Minimum selections</span>
          <input
            type="number"
            min={1}
            max={content.options.length}
            required
            value={content.selectionMin}
            onChange={(event) =>
              onChange({ ...content, selectionMin: Number(event.target.value) })
            }
          />
        </label>
        <label className={adminStyles.field}>
          <span>Maximum selections</span>
          <input
            type="number"
            min={content.selectionMin}
            max={content.options.length}
            required
            value={content.selectionMax}
            onChange={(event) =>
              onChange({ ...content, selectionMax: Number(event.target.value) })
            }
          />
        </label>
      </div>
    </fieldset>
  );
}

function ClozeFields({
  content,
  disabled,
  onChange,
}: {
  content: ClozeContent;
  disabled: boolean;
  onChange: (content: BankContent) => void;
}) {
  return (
    <fieldset className={styles.questionTypePanel} disabled={disabled}>
      <legend>
        Sentence blanks <span>Blank count stays fixed</span>
      </legend>
      <div className={styles.clozeEditList}>
        {content.gaps.map((gap, gapIndex) => {
          const correct = content.correctGapAnswers.find(
            (answer) => answer.gapKey === gap.key,
          )?.choiceKey;
          const name = `cloze-${gap.key}`;
          return (
            <div className={styles.clozeEditBlock} key={gap.key}>
              <label className={adminStyles.field}>
                <span>Text before blank {gapIndex + 1}</span>
                <textarea
                  value={content.stemParts[gapIndex] ?? ""}
                  maxLength={2_000}
                  onChange={(event) =>
                    onChange({
                      ...content,
                      stemParts: content.stemParts.map((part, partIndex) =>
                        partIndex === gapIndex ? event.target.value : part,
                      ),
                    })
                  }
                />
              </label>
              <div className={styles.questionOptionEditList}>
                {gap.options.map((option, optionIndex) => (
                  <div
                    className={styles.questionOptionEditRow}
                    key={option.key}
                  >
                    <label className={adminStyles.field}>
                      <span>
                        Blank {gapIndex + 1}, option {option.key.toUpperCase()}
                      </span>
                      <input
                        value={option.label}
                        minLength={1}
                        maxLength={500}
                        required
                        onChange={(event) =>
                          onChange({
                            ...content,
                            gaps: content.gaps.map(
                              (candidate, candidateIndex) =>
                                candidateIndex === gapIndex
                                  ? {
                                      ...candidate,
                                      options: candidate.options.map(
                                        (
                                          candidateOption,
                                          candidateOptionIndex,
                                        ) =>
                                          candidateOptionIndex === optionIndex
                                            ? {
                                                ...candidateOption,
                                                label: event.target.value,
                                              }
                                            : candidateOption,
                                      ),
                                    }
                                  : candidate,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className={styles.answerKeyControl}>
                      <input
                        type="radio"
                        name={name}
                        checked={correct === option.key}
                        onChange={() =>
                          onChange({
                            ...content,
                            correctGapAnswers: content.correctGapAnswers.map(
                              (answer) =>
                                answer.gapKey === gap.key
                                  ? { ...answer, choiceKey: option.key }
                                  : answer,
                            ),
                          })
                        }
                      />
                      Correct word
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <label className={adminStyles.field}>
          <span>Text after the final blank</span>
          <textarea
            value={content.stemParts.at(-1) ?? ""}
            maxLength={2_000}
            onChange={(event) =>
              onChange({
                ...content,
                stemParts: content.stemParts.map((part, index) =>
                  index === content.stemParts.length - 1
                    ? event.target.value
                    : part,
                ),
              })
            }
          />
        </label>
      </div>
    </fieldset>
  );
}

function SentenceBuildFields({
  content,
  disabled,
  onChange,
}: {
  content: SentenceBuildContent;
  disabled: boolean;
  onChange: (content: BankContent) => void;
}) {
  function replaceOrderKey(
    orderIndex: number,
    position: number,
    value: string,
  ) {
    const orders = content.acceptedTokenOrders.map((order, candidateIndex) => {
      if (candidateIndex !== orderIndex) return order;
      const next = [...order];
      const previous = next[position];
      const occupiedPosition = next.indexOf(value);
      next[position] = value;
      if (occupiedPosition !== -1 && occupiedPosition !== position) {
        next[occupiedPosition] = previous;
      }
      return next;
    });
    onChange({ ...content, acceptedTokenOrders: orders });
  }

  return (
    <fieldset className={styles.questionTypePanel} disabled={disabled}>
      <legend>
        Sentence tokens <span>Token count stays fixed</span>
      </legend>
      <div className={styles.tokenEditGrid}>
        {content.tokens.map((token, index) => (
          <label className={adminStyles.field} key={token.key}>
            <span>Token {index + 1}</span>
            <input
              value={token.label}
              minLength={1}
              maxLength={200}
              required
              onChange={(event) =>
                onChange({
                  ...content,
                  tokens: content.tokens.map((candidate, tokenIndex) =>
                    tokenIndex === index
                      ? { ...candidate, label: event.target.value }
                      : candidate,
                  ),
                })
              }
            />
          </label>
        ))}
      </div>
      <div className={styles.sentenceOrderList}>
        {content.acceptedTokenOrders.map((order, orderIndex) => (
          <div
            className={styles.sentenceOrderBlock}
            key={`order-${orderIndex}`}
          >
            <strong>Accepted order {orderIndex + 1}</strong>
            <div>
              {order.map((key, position) => (
                <SelectField
                  key={`${orderIndex}-${position}`}
                  label={`Position ${position + 1}`}
                  value={key}
                  disabled={disabled}
                  options={content.tokens.map((token) => ({
                    value: token.key,
                    label: token.label,
                  }))}
                  onValueChange={(value) =>
                    replaceOrderKey(orderIndex, position, value)
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function ConstructedResponseFields({
  content,
  disabled,
  onChange,
}: {
  content: ConstructedResponseContent;
  disabled: boolean;
  onChange: (content: BankContent) => void;
}) {
  const [targetTerms, setTargetTerms] = useState(
    content.rubric.targetTerms.join(", "),
  );
  const responseModeLabel = {
    writing: "Writing",
    "speaking-repeat": "Speaking repeat",
    "speaking-interview": "Speaking interview",
  }[content.responseMode];
  const optionalNumber = (value: string) =>
    value.trim() === "" ? null : Number(value);

  return (
    <fieldset className={styles.questionTypePanel} disabled={disabled}>
      <legend>
        Response and rubric <span>Private scoring guide</span>
      </legend>
      <div className={styles.questionModeFact}>
        <span>Response mode</span>
        <strong>{responseModeLabel}</strong>
      </div>
      <div className={styles.questionNumberGrid}>
        <label className={adminStyles.field}>
          <span>Minimum words</span>
          <input
            type="number"
            min={0}
            max={5_000}
            required
            value={content.minimumWords}
            onChange={(event) =>
              onChange({ ...content, minimumWords: Number(event.target.value) })
            }
          />
        </label>
        <label className={adminStyles.field}>
          <span>Recommended words</span>
          <input
            type="number"
            min={content.minimumWords}
            max={5_000}
            required
            value={content.recommendedWords}
            onChange={(event) =>
              onChange({
                ...content,
                recommendedWords: Number(event.target.value),
              })
            }
          />
        </label>
        <label className={adminStyles.field}>
          <span>Maximum characters</span>
          <input
            type="number"
            min={100}
            max={40_000}
            required
            value={content.maximumCharacters}
            onChange={(event) =>
              onChange({
                ...content,
                maximumCharacters: Number(event.target.value),
              })
            }
          />
        </label>
        <label className={adminStyles.field}>
          <span>Preparation seconds</span>
          <input
            type="number"
            min={0}
            max={1_800}
            value={content.preparationSeconds ?? ""}
            placeholder="None"
            onChange={(event) =>
              onChange({
                ...content,
                preparationSeconds: optionalNumber(event.target.value),
              })
            }
          />
        </label>
        <label className={adminStyles.field}>
          <span>Response seconds</span>
          <input
            type="number"
            min={0}
            max={1_800}
            value={content.responseSeconds ?? ""}
            placeholder="None"
            onChange={(event) =>
              onChange({
                ...content,
                responseSeconds: optionalNumber(event.target.value),
              })
            }
          />
        </label>
        <label className={adminStyles.field}>
          <span>Maximum points</span>
          <input
            type="number"
            min={1}
            max={100}
            required
            value={content.rubric.maxPoints}
            onChange={(event) =>
              onChange({
                ...content,
                rubric: {
                  ...content.rubric,
                  maxPoints: Number(event.target.value),
                },
              })
            }
          />
        </label>
        <label className={adminStyles.field}>
          <span>Rubric minimum words</span>
          <input
            type="number"
            min={0}
            max={5_000}
            required
            value={content.rubric.minimumWords}
            onChange={(event) =>
              onChange({
                ...content,
                rubric: {
                  ...content.rubric,
                  minimumWords: Number(event.target.value),
                },
              })
            }
          />
        </label>
      </div>
      <label className={adminStyles.field}>
        <span>Target terms</span>
        <input
          value={targetTerms}
          maxLength={3_000}
          placeholder="meeting, evidence, example"
          onChange={(event) => {
            const value = event.target.value;
            setTargetTerms(value);
            onChange({
              ...content,
              rubric: {
                ...content.rubric,
                targetTerms: value
                  .split(",")
                  .map((term) => term.trim())
                  .filter(Boolean),
              },
            });
          }}
        />
      </label>
      <label className={adminStyles.field}>
        <span>Sample response</span>
        <textarea
          value={content.rubric.sampleResponse}
          minLength={2}
          maxLength={8_000}
          required
          onChange={(event) =>
            onChange({
              ...content,
              rubric: {
                ...content.rubric,
                sampleResponse: event.target.value,
              },
            })
          }
        />
      </label>
    </fieldset>
  );
}
