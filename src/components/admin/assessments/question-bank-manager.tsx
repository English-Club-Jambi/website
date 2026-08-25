"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleStackIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import type { Route } from "next";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

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
  const illustrationAssets = illustrationResult?.page ?? [];

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
            <Link className={adminStyles.secondaryButton} href="/admin/assessments">
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
            assets={illustrationAssets}
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
                <div key={capacitySkill} className={styles.bankCapacityCard} data-ready={ready}>
                  <span>{titleCase(capacitySkill)}</span>
                  <strong>{count}<small> / {required}</small></strong>
                  <AdminStatus tone={ready ? "success" : "danger"}>
                    {ready ? "Ready" : `${required - count} short`}
                  </AdminStatus>
                </div>
              );
            })}
            <div className={styles.bankCapacityCard}>
              <span>Catalogue</span>
              <strong>{summary.total}{summary.capped ? <small>+</small> : null}</strong>
              <AdminStatus tone="neutral">{summary.eligible} eligible</AdminStatus>
            </div>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Bank catalogue"
        description="Author questions here or bring them in from an assessment workspace, then control selection status, task family, difficulty, tags, and optional illustration."
      >
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
            <div className={styles.bankList} role="list" aria-label="Question bank entries">
              {result.page.map((row) => {
                const active = row.bankQuestionId === selected.bankQuestionId;
                return (
                  <div key={row.bankQuestionId} className={styles.bankRow} data-active={active} role="listitem">
                    <button type="button" onClick={() => setSelectedId(row.bankQuestionId)} aria-pressed={active}>
                      <span className={styles.bankRowIndex}><CircleStackIcon aria-hidden width={18} height={18} /></span>
                      <span className={styles.bankRowCopy}>
                        <strong>{row.prompt}</strong>
                        <small>{titleCase(row.skill)} · {assessmentTaskFamilyLabelByValue[row.taskFamily]} · {titleCase(row.difficulty)}</small>
                      </span>
                      <AdminStatus tone={row.fullPracticeEligible ? "success" : "neutral"}>
                        {row.fullPracticeEligible ? "In full practice" : "Fixed only"}
                      </AdminStatus>
                    </button>
                  </div>
                );
              })}
            </div>
            <QuestionBankEditor
              key={`${selected.bankQuestionId}-${selected.updatedAt}`}
              row={selected}
              canEdit={capabilities.canEdit}
              illustrationAssets={illustrationAssets}
            />
          </div>
        )}

        {result && (cursors.length > 1 || !result.isDone) ? (
          <nav className={adminStyles.listFooter} aria-label="Question bank pages">
            <div className={adminStyles.buttonRow}>
              <button
                className={adminStyles.secondaryButton}
                type="button"
                disabled={cursors.length === 1}
                onClick={() => {
                  setCursors((current) => current.slice(0, Math.max(1, current.length - 1)));
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
  assets,
  onCancel,
  onCreated,
}: {
  assets: ReadonlyArray<QuestionIllustrationAsset>;
  onCancel: () => void;
  onCreated: (bankQuestionId: string) => void;
}) {
  const createQuestion = useMutation(api.adminAssessmentQuestionBank.createQuestion);
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
            options={difficultyOptions.filter((option) => option.value !== "all")}
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
            assets={assets}
            selectedMediaId={illustrationMediaId}
            disabled={pending}
            onChange={setIllustrationMediaId}
          />
        </div>
      </div>
      {error ? <AdminError>{error}</AdminError> : null}
      <footer className={styles.questionCreateFooter}>
        <p>
          Saving keeps the question and its private answer key together. Use
          the selection settings afterward to review and activate it.
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
}: {
  row: BankRow;
  canEdit: boolean;
  illustrationAssets: ReadonlyArray<QuestionIllustrationAsset>;
}) {
  const updateMetadata = useMutation(api.adminAssessmentQuestionBank.updateMetadata);
  const [status, setStatus] = useState<BankStatus>(row.status);
  const [taskFamily, setTaskFamily] = useState<TaskFamily>(row.taskFamily);
  const [difficulty, setDifficulty] = useState<Difficulty>(row.difficulty);
  const [eligible, setEligible] = useState(row.fullPracticeEligible);
  const [tags, setTags] = useState(row.tags.join(", "));
  const [illustrationMediaId, setIllustrationMediaId] = useState<string | null>(
    row.illustration?.mediaId ?? null,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const sourceHref = `/admin/assessments/${row.sourceDefinitionId}/sections/${row.sourceSectionId}` as Route;

  async function save() {
    setPending(true);
    setMessage("");
    setError("");
    try {
      const result = await updateMetadata({
        bankQuestionId: row.bankQuestionId,
        expectedUpdatedAt: row.updatedAt,
        status,
        taskFamily,
        difficulty,
        fullPracticeEligible: eligible,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        illustrationMediaId:
          illustrationMediaId === null
            ? null
            : (illustrationMediaId as Id<"mediaAssets">),
      });
      if (!result.ok) {
        setError("This bank entry changed in another session. Reload before saving again.");
        return;
      }
      setMessage("Question-bank settings saved.");
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <aside className={styles.bankEditor} aria-label="Selected question settings">
      <header>
        <div>
          <span>{row.sourceTitle}</span>
          <h3>Selection settings</h3>
        </div>
        {row.origin === "assessment-source" ? (
          <Link className={adminStyles.textButton} href={sourceHref}>
            Edit source
            <ArrowTopRightOnSquareIcon aria-hidden width={17} height={17} />
          </Link>
        ) : (
          <AdminStatus tone="neutral">Authored here</AdminStatus>
        )}
      </header>
      <p className={styles.bankEditorPrompt}>{row.prompt}</p>
      <div className={styles.bankEditorFields}>
        <SelectField label="Status" value={status} options={statusOptions} disabled={!canEdit || pending} onValueChange={(value) => setStatus(value as BankStatus)} />
        <SelectField
          label="Task family"
          value={taskFamily}
          groups={taskFamilySelectGroupsForSkill(row.skill)}
          disabled={!canEdit || pending}
          onValueChange={(value) => setTaskFamily(value as TaskFamily)}
        />
        <SelectField label="Difficulty" value={difficulty} options={difficultyOptions.filter((option) => option.value !== "all")} disabled={!canEdit || pending} onValueChange={(value) => setDifficulty(value as Difficulty)} />
        <label className={adminStyles.field}>
          <span>Tags</span>
          <input value={tags} maxLength={260} disabled={!canEdit || pending} placeholder="campus-life, inference" onChange={(event) => setTags(event.target.value)} />
        </label>
        <label className={`${adminStyles.checkbox} ${styles.bankEligibility}`}>
          <input type="checkbox" checked={eligible} disabled={!canEdit || pending} onChange={(event) => setEligible(event.target.checked)} />
          <span>
            <strong>Available to full practice</strong>
            <small>Ready entries can be randomly selected once the skill pool meets its quota.</small>
          </span>
        </label>
        <div className={styles.bankEligibility}>
          <QuestionIllustrationField
            assets={illustrationAssets}
            selectedMediaId={illustrationMediaId}
            disabled={!canEdit || pending}
            onChange={setIllustrationMediaId}
          />
        </div>
      </div>
      <dl className={styles.bankFacts}>
        <div><dt>Profile</dt><dd>2026 four-skill practice</dd></div>
        <div><dt>Uses</dt><dd>{row.usageCount}{row.usageCountCapped ? "+" : ""}</dd></div>
        <div><dt>Item type</dt><dd>{row.itemType}</dd></div>
        <div><dt>Points</dt><dd>{row.points}</dd></div>
      </dl>
      {error ? <AdminError>{error}</AdminError> : null}
      <footer>
        <p role="status">
          {message ||
            (row.origin === "bank-authored"
              ? "Question text and its private answer key remain available for later review."
              : "Question text and answer key remain in the source assessment.")}
        </p>
        <button className={adminStyles.primaryButton} type="button" disabled={!canEdit || pending} onClick={() => void save()}>
          <CheckCircleIcon aria-hidden width={18} height={18} />
          {pending ? "Saving…" : "Save bank settings"}
        </button>
      </footer>
    </aside>
  );
}
