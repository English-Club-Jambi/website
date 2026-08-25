"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  EyeSlashIcon,
  FlagIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { assessmentTaskFamilyLabelByValue } from "../../../../content/assessment-task-families";
import { SelectField } from "@/components/forms/select-field";

import adminStyles from "../admin-shell.module.css";
import {
  AdminEmpty,
  AdminError,
  AdminLoadingRows,
  AdminSection,
  AdminStatus,
  formatAdminDate,
  humanizeError,
} from "../admin-ui";
import styles from "./assessment-admin.module.css";

type Overview = NonNullable<
  FunctionReturnType<typeof api.adminAssessmentPools.getOverview>
>;
type PoolQuestion = Overview["questions"][number];
type SkillFilter = PoolQuestion["skill"] | "all";
type StateFilter = "all" | "allowed" | "disabled" | "flagged";

const PAGE_SIZE = 12;

const stateOptions = [
  { value: "all", label: "All pool questions" },
  { value: "allowed", label: "Allowed to appear" },
  { value: "disabled", label: "Disabled for this format" },
  { value: "flagged", label: "Flagged by learners" },
] as const;

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function questionStateTone(question: PoolQuestion) {
  if (question.status !== "ready") return "warning" as const;
  return question.effectiveAllowed ? ("success" as const) : ("neutral" as const);
}

function ruleLabel(question: PoolQuestion) {
  if (question.ruleState === "allowed") return "explicitly allowed";
  if (question.ruleState === "disabled") return "explicitly disabled";
  return "format default";
}

export function AssessmentQuestionPoolManager({
  definitionId,
  canEdit,
  canReview,
}: {
  definitionId: string;
  canEdit: boolean;
  canReview: boolean;
}) {
  const overview = useQuery(api.adminAssessmentPools.getOverview, {
    definitionId: definitionId as Id<"assessmentDefinitions">,
  });
  const setQuestionAllowed = useMutation(
    api.adminAssessmentPools.setQuestionAllowed,
  );
  const reviewFlagSignal = useMutation(
    api.adminAssessmentPools.reviewFlagSignal,
  );
  const [skill, setSkill] = useState<SkillFilter>("all");
  const [state, setState] = useState<StateFilter>("all");
  const [page, setPage] = useState(0);
  const [pendingKey, setPendingKey] = useState("");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const skillOptions = useMemo(() => {
    if (!overview) return [{ value: "all", label: "All skills" }];
    return [
      { value: "all", label: "All skills" },
      ...Array.from(new Set(overview.sections.map((section) => section.skill))).map(
        (value) => ({ value, label: capitalise(value) }),
      ),
    ];
  }, [overview]);

  const filtered = useMemo(() => {
    if (!overview) return [];
    return overview.questions.filter((question) => {
      if (skill !== "all" && question.skill !== skill) return false;
      if (state === "allowed" && !question.effectiveAllowed) return false;
      if (state === "disabled" && question.effectiveAllowed) return false;
      if (state === "flagged" && question.flagSignal === null) return false;
      return true;
    });
  }, [overview, skill, state]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleQuestions = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  function changeSkill(value: string) {
    setSkill(value as SkillFilter);
    setPage(0);
  }

  function changeState(value: string) {
    setState(value as StateFilter);
    setPage(0);
  }

  async function toggleQuestion(question: PoolQuestion) {
    if (!overview || !overview.version.mutable) return;
    setPendingKey(`pool:${question.bankQuestionId}`);
    setError("");
    setStatusMessage("");
    try {
      const result = await setQuestionAllowed({
        definitionId: overview.definition.definitionId,
        bankQuestionId: question.bankQuestionId,
        allowed: !question.effectiveAllowed,
        expectedContentRevision: overview.version.contentRevision,
      });
      if (!result.ok) {
        throw new Error(
          `The working revision changed to ${result.currentRevision}. Review the latest pool before changing it again.`,
        );
      }
      setStatusMessage(
        question.effectiveAllowed
          ? "Question disabled for the next published version."
          : "Question allowed for the next published version.",
      );
    } catch (requestError) {
      setError(humanizeError(requestError));
    } finally {
      setPendingKey("");
    }
  }

  async function reviewSignal(
    question: PoolQuestion,
    decision: "reviewed" | "dismissed",
  ) {
    if (!overview || question.flagSignal === null) return;
    setPendingKey(`flag:${question.bankQuestionId}`);
    setError("");
    setStatusMessage("");
    try {
      const result = await reviewFlagSignal({
        definitionId: overview.definition.definitionId,
        bankQuestionId: question.bankQuestionId,
        expectedLastFlaggedAt: question.flagSignal.lastFlaggedAt,
        decision,
      });
      if (!result.ok) {
        throw new Error(
          "A newer learner flag arrived. Review the refreshed signal before recording a decision.",
        );
      }
      setStatusMessage(
        decision === "reviewed"
          ? "Flag signal marked reviewed."
          : "Flag signal dismissed as not requiring a content change.",
      );
    } catch (requestError) {
      setError(humanizeError(requestError));
    } finally {
      setPendingKey("");
    }
  }

  if (overview === undefined) {
    return (
      <AdminSection
        title="Question pool"
        description="Loading the questions that this fixed format can draw."
      >
        <AdminLoadingRows label="Loading question pool" />
      </AdminSection>
    );
  }

  if (overview === null) {
    return (
      <AdminSection
        title="Question pool"
        description="This format does not have a working or published version yet."
      >
        <AdminEmpty
          title="Question pool unavailable"
          description="Install the fixed format data before configuring its question rules."
        />
      </AdminSection>
    );
  }

  const firstVisible = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const lastVisible = Math.min(filtered.length, (safePage + 1) * PAGE_SIZE);

  return (
    <AdminSection
      title="Questions allowed in this format"
      description="Question Bank is the inventory. This versioned pool decides which reviewed questions may be drawn when a learner starts."
      className={styles.poolSection}
    >
      <div className={styles.poolFlow} aria-label="How format selection works">
        <span>
          <ShieldCheckIcon aria-hidden width={22} height={22} />
          <b>Format rules</b>
          <small>Skill, quota, timing, and delivery remain fixed.</small>
        </span>
        <span>
          <CheckCircleIcon aria-hidden width={22} height={22} />
          <b>Allowed pool</b>
          <small>Admins may allow or disable individual reviewed questions.</small>
        </span>
        <span>
          <FlagIcon aria-hidden width={22} height={22} />
          <b>Pinned attempt</b>
          <small>Start draws a valid set once, then pins question IDs and order.</small>
        </span>
      </div>

      <div className={styles.poolCapacityGrid} aria-label="Question capacity by section">
        {overview.sections.map((section) => {
          const short = section.spareCount < 0;
          return (
            <div
              className={styles.poolCapacityCard}
              data-short={short || undefined}
              key={section.sectionId}
            >
              <span>{section.title}</span>
              <strong>
                {section.allowedCount}
                <small> / {section.requiredCount} needed</small>
              </strong>
              <AdminStatus tone={short ? "danger" : "success"}>
                {short
                  ? `${Math.abs(section.spareCount)} short`
                  : `${section.spareCount} spare`}
              </AdminStatus>
            </div>
          );
        })}
      </div>

      {!overview.version.mutable ? (
        <div className={styles.poolReadOnlyNotice}>
          <ShieldCheckIcon aria-hidden width={22} height={22} />
          <div>
            <strong>Published pool is read-only</strong>
            <p>
              Start the next private revision above before changing eligibility.
              Learners continue using this exact published pool until the revision is approved.
            </p>
          </div>
        </div>
      ) : null}

      <div className={styles.poolToolbar}>
        <SelectField
          label="Skill"
          value={skill}
          options={skillOptions}
          onValueChange={changeSkill}
        />
        <SelectField
          label="Pool state"
          value={state}
          options={stateOptions}
          onValueChange={changeState}
        />
        <p role="status">
          Showing {firstVisible}–{lastVisible} of {filtered.length} questions
        </p>
      </div>

      {error ? <AdminError>{error}</AdminError> : null}
      {statusMessage ? (
        <p className={styles.successNotice} role="status">
          {statusMessage}
        </p>
      ) : null}

      <div className={styles.poolSignalNote}>
        <FlagIcon aria-hidden width={20} height={20} />
        <p>
          A learner flag means “review this question again.” It is a content signal,
          not proof that the answer is wrong. This workspace exposes aggregate counts
          only; it never reveals a participant, attempt, or response.
        </p>
      </div>

      {visibleQuestions.length === 0 ? (
        <AdminEmpty
          title="No questions match these filters"
          description="Change the skill or pool-state filter. The format itself remains available."
        />
      ) : (
        <div className={styles.poolList} role="list">
          {visibleQuestions.map((question) => {
            const poolPending = pendingKey === `pool:${question.bankQuestionId}`;
            const flagPending = pendingKey === `flag:${question.bankQuestionId}`;
            const canAllow = question.status === "ready";
            return (
              <article className={styles.poolRow} key={question.bankQuestionId} role="listitem">
                <div className={styles.poolQuestionCopy}>
                  <div className={styles.poolQuestionMeta}>
                    <AdminStatus tone={questionStateTone(question)}>
                      {question.status !== "ready"
                        ? `Bank ${question.status}`
                        : question.effectiveAllowed
                          ? "Allowed"
                          : "Disabled"}
                    </AdminStatus>
                    <span>{capitalise(question.skill)}</span>
                    <span>
                      {assessmentTaskFamilyLabelByValue[question.taskFamily]}
                    </span>
                    <span>{capitalise(question.difficulty)}</span>
                  </div>
                  <h3>{question.prompt}</h3>
                  <p>
                    Source: {question.sourceTitle}. Rule: {ruleLabel(question)}.
                  </p>
                </div>

                <div className={styles.poolQuestionSide}>
                  {question.flagSignal ? (
                    <div className={styles.poolFlagSignal} data-status={question.flagSignal.reviewStatus}>
                      <FlagIcon aria-hidden width={20} height={20} />
                      <div>
                        <strong>
                          {question.flagSignal.activeCount} active · {question.flagSignal.totalEvents} total
                        </strong>
                        <span>
                          Last flagged {formatAdminDate(question.flagSignal.lastFlaggedAt)} · {question.flagSignal.reviewStatus}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className={styles.poolQuietSignal}>No learner flags</span>
                  )}

                  <div className={styles.poolActions}>
                    {canEdit && overview.version.mutable ? (
                      <button
                        className={
                          question.effectiveAllowed
                            ? adminStyles.secondaryButton
                            : adminStyles.primaryButton
                        }
                        type="button"
                        disabled={Boolean(pendingKey) || (!canAllow && !question.effectiveAllowed)}
                        title={
                          !canAllow && !question.effectiveAllowed
                            ? "Set the Question Bank entry to ready before allowing it"
                            : undefined
                        }
                        onClick={() => void toggleQuestion(question)}
                      >
                        {question.effectiveAllowed ? (
                          <EyeSlashIcon aria-hidden width={18} height={18} />
                        ) : (
                          <CheckCircleIcon aria-hidden width={18} height={18} />
                        )}
                        {poolPending
                          ? "Saving…"
                          : question.effectiveAllowed
                            ? "Disable"
                            : "Allow"}
                      </button>
                    ) : null}

                    {canReview &&
                    question.flagSignal?.reviewStatus === "open" ? (
                      <>
                        <button
                          className={adminStyles.secondaryButton}
                          type="button"
                          disabled={Boolean(pendingKey)}
                          onClick={() => void reviewSignal(question, "reviewed")}
                        >
                          <CheckCircleIcon aria-hidden width={18} height={18} />
                          {flagPending ? "Saving…" : "Mark reviewed"}
                        </button>
                        <button
                          className={adminStyles.secondaryButton}
                          type="button"
                          disabled={Boolean(pendingKey)}
                          onClick={() => void reviewSignal(question, "dismissed")}
                        >
                          <XCircleIcon aria-hidden width={18} height={18} />
                          Dismiss signal
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pageCount > 1 ? (
        <nav className={styles.poolPager} aria-label="Question pool pages">
          <button
            className={adminStyles.secondaryButton}
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ArrowLeftIcon aria-hidden width={18} height={18} />
            Previous
          </button>
          <span>
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            className={adminStyles.secondaryButton}
            type="button"
            disabled={safePage + 1 >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            Next
            <ArrowRightIcon aria-hidden width={18} height={18} />
          </button>
        </nav>
      ) : null}
    </AdminSection>
  );
}
