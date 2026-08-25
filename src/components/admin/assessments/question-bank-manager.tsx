"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../../../convex/_generated/api";
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

const taskFamilyOptions = [
  { value: "complete-words", label: "Complete the words" },
  { value: "read-daily-life", label: "Read in daily life" },
  { value: "read-academic-passage", label: "Read an academic passage" },
  { value: "listen-choose-response", label: "Listen and choose a response" },
  { value: "listen-conversation", label: "Listen to a conversation" },
  { value: "listen-announcement", label: "Listen to an announcement" },
  { value: "listen-academic-talk", label: "Listen to an academic talk" },
  { value: "build-sentence", label: "Build a sentence" },
  { value: "write-email", label: "Write an email" },
  { value: "academic-discussion", label: "Academic discussion" },
  { value: "listen-repeat", label: "Listen and repeat" },
  { value: "take-interview", label: "Take an interview" },
] as const;

const requiredBySkill: Record<Skill, number> = {
  reading: 50,
  listening: 47,
  writing: 12,
  speaking: 11,
};

const labelByTaskFamily = Object.fromEntries(
  taskFamilyOptions.map((option) => [option.value, option.label]),
) as Record<TaskFamily, string>;

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
          <Link className={adminStyles.secondaryButton} href="/admin/assessments">
            Back to assessments
          </Link>
        }
      />

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
        description="Questions are authored in an assessment workspace; this catalogue owns selection status, task family, difficulty, and tags."
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
                        <small>{titleCase(row.skill)} · {labelByTaskFamily[row.taskFamily]} · {titleCase(row.difficulty)}</small>
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

function QuestionBankEditor({ row, canEdit }: { row: BankRow; canEdit: boolean }) {
  const updateMetadata = useMutation(api.adminAssessmentQuestionBank.updateMetadata);
  const [status, setStatus] = useState<BankStatus>(row.status);
  const [taskFamily, setTaskFamily] = useState<TaskFamily>(row.taskFamily);
  const [difficulty, setDifficulty] = useState<Difficulty>(row.difficulty);
  const [eligible, setEligible] = useState(row.fullPracticeEligible);
  const [tags, setTags] = useState(row.tags.join(", "));
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
        <Link className={adminStyles.textButton} href={sourceHref}>
          Edit source
          <ArrowTopRightOnSquareIcon aria-hidden width={17} height={17} />
        </Link>
      </header>
      <p className={styles.bankEditorPrompt}>{row.prompt}</p>
      <div className={styles.bankEditorFields}>
        <SelectField label="Status" value={status} options={statusOptions} disabled={!canEdit || pending} onValueChange={(value) => setStatus(value as BankStatus)} />
        <SelectField label="Task family" value={taskFamily} options={taskFamilyOptions} disabled={!canEdit || pending} onValueChange={(value) => setTaskFamily(value as TaskFamily)} />
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
      </div>
      <dl className={styles.bankFacts}>
        <div><dt>Profile</dt><dd>2026 four-skill practice</dd></div>
        <div><dt>Uses</dt><dd>{row.usageCount}{row.usageCountCapped ? "+" : ""}</dd></div>
        <div><dt>Item type</dt><dd>{row.itemType}</dd></div>
        <div><dt>Points</dt><dd>{row.points}</dd></div>
      </dl>
      {error ? <AdminError>{error}</AdminError> : null}
      <footer>
        <p role="status">{message || "Question text and answer key remain in the source assessment."}</p>
        <button className={adminStyles.primaryButton} type="button" disabled={!canEdit || pending} onClick={() => void save()}>
          <CheckCircleIcon aria-hidden width={18} height={18} />
          {pending ? "Saving…" : "Save bank settings"}
        </button>
      </footer>
    </aside>
  );
}
