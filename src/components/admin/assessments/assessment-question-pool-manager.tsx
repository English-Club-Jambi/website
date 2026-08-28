"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  FlagIcon,
  MusicalNoteIcon,
  PhotoIcon,
  ShieldCheckIcon,
  SpeakerXMarkIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import { useId, useMemo, useState } from "react";

import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { assessmentTaskFamilyLabelByValue } from "../../../../content/assessment-task-families";
import { SelectField } from "@/components/forms/select-field";

import adminStyles from "../admin-shell.module.css";
import { AdminWorkspaceDialog } from "../admin-workspace-dialog";
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
type QuestionReview = NonNullable<
  FunctionReturnType<typeof api.adminAssessmentPools.getQuestionReview>
>;
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
  return question.effectiveAllowed
    ? ("success" as const)
    : ("neutral" as const);
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
  const [reviewQuestionId, setReviewQuestionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const skillOptions = useMemo(() => {
    if (!overview) return [{ value: "all", label: "All skills" }];
    return [
      { value: "all", label: "All skills" },
      ...Array.from(
        new Set(overview.sections.map((section) => section.skill)),
      ).map((value) => ({ value, label: capitalise(value) })),
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
  const reviewQuestion =
    overview?.questions.find(
      (question) => question.bankQuestionId === reviewQuestionId,
    ) ?? null;

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
    <>
      <AdminSection
        title="Questions allowed in this format"
        description="Question Bank is the inventory. This versioned pool decides which reviewed questions may be drawn when a learner starts."
        className={styles.poolSection}
      >
        <div
          className={styles.poolFlow}
          aria-label="How format selection works"
        >
          <span>
            <ShieldCheckIcon aria-hidden width={22} height={22} />
            <b>Format rules</b>
            <small>Skill, quota, timing, and delivery remain fixed.</small>
          </span>
          <span>
            <CheckCircleIcon aria-hidden width={22} height={22} />
            <b>Allowed pool</b>
            <small>
              Admins may disable a question; a disabled set anchor also
              suppresses its follow-ups.
            </small>
          </span>
          <span>
            <FlagIcon aria-hidden width={22} height={22} />
            <b>Pinned attempt</b>
            <small>
              Start draws a valid set once, then pins question IDs and order.
            </small>
          </span>
        </div>

        <div
          className={styles.poolCapacityGrid}
          aria-label="Question capacity by section"
        >
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
                Start the next private revision above before changing
                eligibility. Learners continue using this exact published pool
                until the revision is approved.
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
            A learner flag means “review this question again.” It is a content
            signal, not proof that the answer is wrong. This workspace exposes
            aggregate counts only; it never reveals a participant, attempt, or
            response.
          </p>
        </div>

        {visibleQuestions.length === 0 ? (
          <AdminEmpty
            title="No questions match these filters"
            description="Change the skill or pool-state filter. The format itself remains available."
          />
        ) : (
          <div className={styles.poolList} role="list">
            {visibleQuestions.map((question, questionIndex) => {
              const poolPending =
                pendingKey === `pool:${question.bankQuestionId}`;
              const flagPending =
                pendingKey === `flag:${question.bankQuestionId}`;
              const canAllow = question.status === "ready";
              return (
                <article
                  className={styles.poolRow}
                  key={question.bankQuestionId}
                  role="listitem"
                >
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
                      {question.dependency ? (
                        <AdminStatus tone="neutral">
                          {question.dependency.role === "anchor"
                            ? "Set anchor"
                            : "Follow-up"}
                        </AdminStatus>
                      ) : null}
                    </div>
                    <h3>{question.prompt}</h3>
                    <p>
                      Source: {question.sourceTitle}. Rule:{" "}
                      {ruleLabel(question)}.
                      {question.dependency?.role === "anchor"
                        ? " This anchor is required before any selected follow-up in its set."
                        : question.dependency?.role === "follow-up"
                          ? " This follow-up is eligible only when its anchor is also allowed."
                          : null}
                    </p>
                  </div>

                  <div className={styles.poolQuestionSide}>
                    {question.flagSignal ? (
                      <div
                        className={styles.poolFlagSignal}
                        data-status={question.flagSignal.reviewStatus}
                      >
                        <FlagIcon aria-hidden width={20} height={20} />
                        <div>
                          <strong>
                            {question.flagSignal.activeCount} active ·{" "}
                            {question.flagSignal.totalEvents} total
                          </strong>
                          <span>
                            Last flagged{" "}
                            {formatAdminDate(question.flagSignal.lastFlaggedAt)}{" "}
                            · {question.flagSignal.reviewStatus}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className={styles.poolQuietSignal}>
                        No learner flags
                      </span>
                    )}

                    <div className={styles.poolActions}>
                      <button
                        className={adminStyles.secondaryButton}
                        type="button"
                        aria-label={`Review question ${firstVisible + questionIndex}: ${question.prompt}`}
                        aria-haspopup="dialog"
                        onClick={() =>
                          setReviewQuestionId(question.bankQuestionId)
                        }
                      >
                        <EyeIcon aria-hidden width={18} height={18} />
                        Review
                      </button>

                      {canEdit && overview.version.mutable ? (
                        <button
                          className={
                            question.effectiveAllowed
                              ? adminStyles.secondaryButton
                              : adminStyles.primaryButton
                          }
                          type="button"
                          disabled={
                            Boolean(pendingKey) ||
                            (!canAllow && !question.effectiveAllowed)
                          }
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
                            <CheckCircleIcon
                              aria-hidden
                              width={18}
                              height={18}
                            />
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
                            onClick={() =>
                              void reviewSignal(question, "reviewed")
                            }
                          >
                            <CheckCircleIcon
                              aria-hidden
                              width={18}
                              height={18}
                            />
                            {flagPending ? "Saving…" : "Mark reviewed"}
                          </button>
                          <button
                            className={adminStyles.secondaryButton}
                            type="button"
                            disabled={Boolean(pendingKey)}
                            onClick={() =>
                              void reviewSignal(question, "dismissed")
                            }
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
              onClick={() =>
                setPage((current) => Math.min(pageCount - 1, current + 1))
              }
            >
              Next
              <ArrowRightIcon aria-hidden width={18} height={18} />
            </button>
          </nav>
        ) : null}
      </AdminSection>

      <AdminWorkspaceDialog
        open={reviewQuestion !== null}
        eyebrow={
          reviewQuestion === null
            ? undefined
            : `${capitalise(reviewQuestion.skill)} · ${assessmentTaskFamilyLabelByValue[reviewQuestion.taskFamily]}`
        }
        title="Review question"
        description="Check the complete prompt, answer key, supporting material, and current format signals before changing eligibility."
        closeLabel="Close question review"
        onClose={() => setReviewQuestionId(null)}
      >
        {reviewQuestion ? (
          <PoolQuestionReview
            definitionId={overview.definition.definitionId}
            question={reviewQuestion}
          />
        ) : null}
      </AdminWorkspaceDialog>
    </>
  );
}

function formatDuration(durationMs: number) {
  const seconds = Math.round(durationMs / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatMinimumWords(value: number) {
  return value === 0 ? "Not set" : `${value} words`;
}

function formatConstraintSeconds(
  value: number | null,
  emptyLabel: "Not set" | "Not timed",
) {
  return value === null ? emptyLabel : `${value} seconds`;
}

function ReviewOptions({
  options,
  correctKeys,
}: {
  options: ReadonlyArray<{ key: string; label: string }>;
  correctKeys: ReadonlyArray<string>;
}) {
  const correct = new Set(correctKeys);
  return (
    <ol className={styles.poolReviewOptions} aria-label="Answer options">
      {options.map((option) => {
        const isCorrect = correct.has(option.key);
        return (
          <li key={option.key} data-correct={isCorrect || undefined}>
            <span>{option.key.toUpperCase()}</span>
            <p>{option.label}</p>
            {isCorrect ? (
              <strong>
                <CheckCircleIcon aria-hidden width={18} height={18} />
                Correct answer
              </strong>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewAnswer({ content }: { content: QuestionReview["content"] }) {
  if (content.type === "single-choice") {
    return (
      <ReviewOptions
        options={content.options}
        correctKeys={[content.correctChoiceKey]}
      />
    );
  }
  if (content.type === "multiple-select") {
    return (
      <div className={styles.poolReviewAnswerBlock}>
        <p>
          Select {content.selectionMin}–{content.selectionMax} answers.
        </p>
        <ReviewOptions
          options={content.options}
          correctKeys={content.correctChoiceKeys}
        />
      </div>
    );
  }
  if (content.type === "cloze-select") {
    return (
      <div className={styles.poolReviewAnswerBlock}>
        <p className={styles.poolReviewStem}>
          {content.stemParts.map((part, index) => (
            <span key={`${index}-${part}`}>
              {part}
              {index < content.gaps.length ? <b>Gap {index + 1}</b> : null}
            </span>
          ))}
        </p>
        {content.gaps.map((gap, index) => {
          const answer = content.correctGapAnswers.find(
            (candidate) => candidate.gapKey === gap.key,
          );
          return (
            <section className={styles.poolReviewGap} key={gap.key}>
              <h4>Gap {index + 1}</h4>
              <ReviewOptions
                options={gap.options}
                correctKeys={answer ? [answer.choiceKey] : []}
              />
            </section>
          );
        })}
      </div>
    );
  }
  if (content.type === "sentence-build") {
    const labelByKey = new Map(
      content.tokens.map((token) => [token.key, token.label]),
    );
    return (
      <div className={styles.poolReviewAnswerBlock}>
        <div className={styles.poolReviewTokens} aria-label="Available tokens">
          {content.tokens.map((token) => (
            <span key={token.key}>{token.label}</span>
          ))}
        </div>
        <h4>Accepted order</h4>
        <ol className={styles.poolReviewAccepted}>
          {content.acceptedTokenOrders.map((order, index) => (
            <li key={`${index}-${order.join("-")}`}>
              {order.map((key) => labelByKey.get(key) ?? key).join(" ")}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className={styles.poolReviewAnswerBlock}>
      <dl className={styles.poolReviewFacts}>
        <div>
          <dt>Response mode</dt>
          <dd>{capitalise(content.responseMode.replaceAll("-", " "))}</dd>
        </div>
        <div>
          <dt>Response minimum</dt>
          <dd>{formatMinimumWords(content.minimumWords)}</dd>
        </div>
        <div>
          <dt>Recommended length</dt>
          <dd>{content.recommendedWords} words</dd>
        </div>
        <div>
          <dt>Maximum length</dt>
          <dd>{content.maximumCharacters} characters</dd>
        </div>
        <div>
          <dt>Preparation time</dt>
          <dd>
            {formatConstraintSeconds(content.preparationSeconds, "Not set")}
          </dd>
        </div>
        <div>
          <dt>Response time</dt>
          <dd>
            {formatConstraintSeconds(content.responseSeconds, "Not timed")}
          </dd>
        </div>
        <div>
          <dt>Rubric minimum</dt>
          <dd>{formatMinimumWords(content.rubric.minimumWords)}</dd>
        </div>
        <div>
          <dt>Rubric value</dt>
          <dd>{content.rubric.maxPoints} points</dd>
        </div>
      </dl>
      {content.rubric.targetTerms.length > 0 ? (
        <p>
          <strong>Target terms:</strong> {content.rubric.targetTerms.join(", ")}
        </p>
      ) : null}
      <div className={styles.poolReviewSample}>
        <h4>Sample response</h4>
        <p>{content.rubric.sampleResponse}</p>
      </div>
    </div>
  );
}

function PoolQuestionReview({
  definitionId,
  question,
}: {
  definitionId: Id<"assessmentDefinitions">;
  question: PoolQuestion;
}) {
  const audioHeadingId = useId();
  const review = useQuery(api.adminAssessmentPools.getQuestionReview, {
    definitionId,
    bankQuestionId: question.bankQuestionId,
  });

  if (review === undefined) {
    return <AdminLoadingRows label="Loading complete question review" />;
  }
  if (review === null) {
    return (
      <AdminEmpty
        title="Question review unavailable"
        description="This question no longer belongs to the active revision pool. Close the review and use the refreshed list."
      />
    );
  }

  const visual = review.illustration ?? review.stimulus?.image ?? null;
  return (
    <article className={styles.poolReview}>
      <div className={styles.poolReviewSummary}>
        <div className={styles.poolReviewQuestion}>
          <div className={styles.poolQuestionMeta}>
            <AdminStatus tone={questionStateTone(question)}>
              {question.effectiveAllowed ? "Allowed" : "Disabled"}
            </AdminStatus>
            <span>{capitalise(review.difficulty)}</span>
            <span>{capitalise(review.content.type.replaceAll("-", " "))}</span>
            <span>{ruleLabel(question)}</span>
          </div>
          <h3>{review.content.prompt}</h3>
          <p>
            {review.content.explanation ??
              "No answer explanation has been recorded for this question."}
          </p>
        </div>

        <dl className={styles.poolReviewFacts}>
          <div>
            <dt>Source</dt>
            <dd>{review.source.title}</dd>
          </div>
          <div>
            <dt>Section</dt>
            <dd>{review.source.sectionTitle}</dd>
          </div>
          <div>
            <dt>Source state</dt>
            <dd>
              {capitalise(review.source.visibility)} ·{" "}
              {capitalise(review.source.versionStatus.replaceAll("-", " "))}
            </dd>
          </div>
          <div>
            <dt>Question key</dt>
            <dd>{review.source.itemKey}</dd>
          </div>
          <div>
            <dt>Bank updated</dt>
            <dd>{formatAdminDate(review.updatedAt)}</dd>
          </div>
          <div>
            <dt>Selection</dt>
            <dd>
              {review.fullPracticeEligible
                ? "Full Practice eligible"
                : "Format-specific"}
            </dd>
          </div>
          <div>
            <dt>Learner flags</dt>
            <dd>
              {question.flagSignal
                ? `${question.flagSignal.activeCount} active · ${question.flagSignal.totalEvents} total · ${question.flagSignal.reviewStatus}`
                : "No learner flags"}
            </dd>
          </div>
        </dl>
      </div>

      {review.audio !== null || review.skill === "listening" ? (
        <section
          className={styles.poolReviewMedia}
          aria-labelledby={audioHeadingId}
        >
          <div className={styles.poolReviewSectionHeading}>
            {review.audio ? (
              <MusicalNoteIcon aria-hidden width={22} height={22} />
            ) : (
              <SpeakerXMarkIcon aria-hidden width={22} height={22} />
            )}
            <div>
              <h3 id={audioHeadingId}>Listening recording</h3>
              <p>
                {review.audio
                  ? `${formatDuration(review.audio.durationMs)} · ${review.audio.description}`
                  : "No playable reviewed audio is attached to this question."}
              </p>
            </div>
          </div>
          {review.audio ? (
            <audio
              aria-label={`Play the reviewed audio for ${review.content.prompt}`}
              controls
              preload="metadata"
              src={review.audio.publicUrl}
            >
              Audio playback is not available in this browser.
            </audio>
          ) : (
            <p className={styles.poolReviewMediaNotice}>
              Keep this question out of learner delivery until a reviewed
              recording is ready.
            </p>
          )}
        </section>
      ) : null}

      {review.stimulus ? (
        <section className={styles.poolReviewSection}>
          <div className={styles.poolReviewSectionHeading}>
            <PhotoIcon aria-hidden width={22} height={22} />
            <div>
              <h3>{review.stimulus.title ?? "Supporting material"}</h3>
              <p>{capitalise(review.stimulus.kind)} stimulus</p>
            </div>
          </div>
          {review.stimulus.body ? (
            <p className={styles.poolReviewLongText}>{review.stimulus.body}</p>
          ) : null}
          {review.stimulus.transcript ? (
            <details className={styles.poolReviewTranscript}>
              <summary>Read transcript</summary>
              <p>{review.stimulus.transcript}</p>
            </details>
          ) : null}
        </section>
      ) : null}

      {visual ? (
        <figure className={styles.poolReviewVisual}>
          <Image
            alt={visual.alt}
            src={visual.publicUrl}
            width={visual.width}
            height={visual.height}
            sizes="(max-width: 760px) 100vw, 42rem"
          />
          <figcaption>{visual.alt}</figcaption>
        </figure>
      ) : null}

      <section className={styles.poolReviewSection}>
        <div className={styles.poolReviewSectionHeading}>
          <CheckCircleIcon aria-hidden width={22} height={22} />
          <div>
            <h3>Answer and scoring record</h3>
            <p>
              Visible only inside the authenticated administration workspace.
            </p>
          </div>
        </div>
        <ReviewAnswer content={review.content} />
      </section>

      {review.dependency ? (
        <section className={styles.poolReviewDependency}>
          <strong>
            {review.dependency.role === "anchor"
              ? "Set anchor"
              : "Follow-up question"}
          </strong>
          <p>
            Group {review.dependency.groupKey}
            {review.dependency.parentPrompt
              ? ` · Anchor: ${review.dependency.parentPrompt}`
              : ""}
          </p>
        </section>
      ) : null}

      {review.tags.length > 0 ? (
        <p className={styles.poolReviewTags}>
          <strong>Tags</strong> {review.tags.join(" · ")}
        </p>
      ) : null}
    </article>
  );
}
