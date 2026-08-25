"use client";

import { useConvexAuth } from "@convex-dev/auth/react";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Image from "next/image";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SelectField } from "@/components/forms/select-field";
import type {
  PublicAssessmentItem,
  PublicAssessmentResponse,
} from "./question-renderer";
import {
  AttemptRouteResolver,
} from "./attempt-route-resolver";
import { usePracticeContext } from "./practice-provider";
import styles from "./practice.module.css";

type Result = NonNullable<
  FunctionReturnType<typeof api.assessmentAttempts.getResult>
>;
type ReviewPage = FunctionReturnType<
  typeof api.assessmentReviews.listMinePage
>;
type ReviewItem = ReviewPage["page"][number];

export function formatElapsed(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function labelForChoice(item: PublicAssessmentItem, key: string) {
  if (item.type === "single-choice" || item.type === "multiple-select") {
    return item.options.find((option) => option.key === key)?.label ?? key;
  }
  return key;
}

export function reviewResponseText(
  item: PublicAssessmentItem,
  response: PublicAssessmentResponse | null,
  omittedLabel: string,
) {
  if (response === null) return omittedLabel;
  switch (response.kind) {
    case "choice":
      return response.selectedChoiceKey === undefined
        ? omittedLabel
        : labelForChoice(item, response.selectedChoiceKey);
    case "multi-choice":
      return response.selectedChoiceKeys.length === 0
        ? omittedLabel
        : response.selectedChoiceKeys.map((key) => labelForChoice(item, key)).join(", ");
    case "cloze":
      if (response.gapAnswers.length === 0 || item.type !== "cloze-select") {
        return omittedLabel;
      }
      return response.gapAnswers
        .map((answer) => {
          const gap = item.gaps.find((candidate) => candidate.key === answer.gapKey);
          return gap?.options.find((option) => option.key === answer.choiceKey)?.label ?? answer.choiceKey;
        })
        .join(" / ");
    case "token-order":
      if (response.tokenOrder.length === 0 || item.type !== "sentence-build") {
        return omittedLabel;
      }
      return response.tokenOrder
        .map((key) => item.tokens.find((token) => token.key === key)?.label ?? key)
        .join(" ");
    case "text":
      return response.text.trim().length === 0 ? omittedLabel : response.text;
  }
}

function SessionUnavailable({ attemptId, result }: { attemptId: string; result?: boolean }) {
  const { copy } = usePracticeContext();
  return (
    <section className={styles.unavailablePage}>
      <div className={`page-container ${styles.unavailableFrame}`}>
        <h1>{result ? copy.noResultTitle : copy.sessionUnavailableTitle}</h1>
        <p>{result ? copy.noResultBody : copy.sessionUnavailableBody}</p>
        <Link
          href={(result ? `/practice/attempt/${attemptId}` : "/practice") as Route}
          className={styles.primaryLink}
        >
          <ArrowLeftIcon width={19} height={19} strokeWidth={2} aria-hidden />
          {result ? copy.returnAttempt : copy.returnLab}
        </Link>
      </div>
    </section>
  );
}

function ReviewStimulus({ item }: { item: ReviewItem }) {
  const { copy } = usePracticeContext();
  const stimulus = item.stimulus;
  if (stimulus === null) return null;
  return (
    <div className={styles.reviewStimulus}>
      {stimulus.title !== null ? <h4>{stimulus.title}</h4> : null}
      {stimulus.kind === "audio" && stimulus.mediaUrl !== null ? (
        <audio controls preload="metadata" src={stimulus.mediaUrl}>
          {copy.audioUnavailable}
        </audio>
      ) : null}
      {stimulus.kind === "image" && stimulus.mediaUrl !== null ? (
        <div className={styles.reviewImage}>
          <Image
            src={stimulus.mediaUrl}
            alt={stimulus.alt ?? ""}
            fill
            sizes="(max-width: 879px) 100vw, 42vw"
          />
        </div>
      ) : null}
      {stimulus.body !== null ? <p>{stimulus.body}</p> : null}
      {stimulus.transcript !== null ? (
        <details className={styles.transcript}>
          <summary>
            <DocumentTextIcon width={19} height={19} strokeWidth={1.9} aria-hidden />
            {copy.transcript}
          </summary>
          <p>{stimulus.transcript}</p>
        </details>
      ) : null}
    </div>
  );
}

function ReviewedAnswers({
  attemptId,
  sectionOrder,
}: {
  attemptId: Id<"assessmentAttempts">;
  sectionOrder: number;
}) {
  const { copy } = usePracticeContext();
  const { results, status, loadMore } = usePaginatedQuery(
    api.assessmentReviews.listMinePage,
    { attemptId, sectionOrder },
    { initialNumItems: 20 },
  );

  return (
    <div className={styles.reviewList} aria-busy={status === "LoadingFirstPage"}>
      {results.map((entry, index) => {
        const constructed = entry.item.type === "constructed-response";
        const state = constructed && entry.answered
          ? copy.reviewScored
          : entry.correct
            ? copy.reviewCorrect
            : entry.answered
              ? copy.reviewIncorrect
              : copy.reviewOmitted;
        const StateIcon = constructed && entry.answered
          ? DocumentTextIcon
          : entry.correct
            ? CheckCircleIcon
            : entry.answered
              ? XCircleIcon
              : MinusCircleIcon;
        return (
          <article className={styles.reviewItem} key={entry.item.id}>
            <div className={styles.reviewItemHeading}>
              <p>{copy.questionPrefix} {index + 1}</p>
              <span data-correct={entry.correct ? "true" : "false"}>
                <StateIcon width={20} height={20} strokeWidth={1.9} aria-hidden />
                {state}
              </span>
            </div>
            <ReviewStimulus item={entry} />
            <h3>{entry.item.prompt}</h3>
            <dl className={styles.reviewAnswers}>
              <div>
                <dt>{copy.yourAnswer}</dt>
                <dd>{reviewResponseText(entry.item, entry.response, copy.reviewOmitted)}</dd>
              </div>
              <div>
                <dt>{constructed ? copy.exampleResponse : copy.correctAnswer}</dt>
                <dd>{reviewResponseText(entry.item, entry.correctAnswer, copy.reviewOmitted)}</dd>
              </div>
            </dl>
            {entry.explanation !== null ? (
              <div className={styles.reviewExplanation}>
                <strong>{copy.explanation}</strong>
                <p>{entry.explanation}</p>
              </div>
            ) : null}
          </article>
        );
      })}
      {status === "CanLoadMore" ? (
        <button type="button" className={styles.quietButton} onClick={() => loadMore(20)}>
          {copy.loadMoreReview}
        </button>
      ) : null}
    </div>
  );
}

function ResultReport({
  result,
  attemptId,
}: {
  result: Result;
  attemptId: Id<"assessmentAttempts">;
}) {
  const { copy } = usePracticeContext();
  const [sectionIndex, setSectionIndex] = useState(0);
  const possible = result.objective.possible;
  const elapsed = result.sections.reduce((total, section) => total + section.elapsedSeconds, 0);
  const selected = result.sections[sectionIndex];
  const estimatedBand =
    result.estimate?.overallBand ?? result.sections[0]?.bandEstimate ?? null;
  const comparableScore =
    result.estimate?.comparableTotal ??
    result.sections[0]?.comparableScoreEstimate ??
    null;
  const confidence = result.estimate?.confidence ?? result.sections[0]?.confidence ?? null;

  return (
    <div className={styles.resultPage}>
      <header className={`page-container ${styles.resultHeader}`}>
        <Link href="/practice" className={styles.backLink}>
          <ArrowLeftIcon width={19} height={19} strokeWidth={2} aria-hidden />
          {copy.labBack}
        </Link>
        <p className={styles.resultKicker}>{result.label}</p>
        <h1>{copy.resultTitle}</h1>
        <p>{result.disclaimer}</p>
      </header>

      <div className={`page-container ${styles.resultBody}`}>
        <section className={styles.rawResult} aria-label={result.label}>
          <div className={styles.rawResultLead}>
            <strong>{estimatedBand ?? result.objective.correct}</strong>
            <span>
              {estimatedBand === null
                ? `${copy.rawCount} / ${possible}`
                : `${copy.estimatedBand} / 6`}
            </span>
          </div>
          <dl>
            <div>
              <dt>{copy.practicePoints}</dt>
              <dd>{result.weighted.earned.toFixed(2)} / {result.weighted.possible.toFixed(2)}</dd>
            </div>
            {comparableScore !== null ? (
              <div>
                <dt>{copy.comparableScore}</dt>
                <dd>{comparableScore} / {result.estimate?.comparableTotal !== null ? 120 : 30}</dd>
              </div>
            ) : null}
            <div><dt>{copy.omitted}</dt><dd>{result.objective.omitted}</dd></div>
            <div><dt>{copy.timeUsed}</dt><dd>{formatElapsed(elapsed)}</dd></div>
            {confidence !== null ? (
              <div>
                <dt>{copy.estimateConfidence}</dt>
                <dd>{confidence === "moderate" ? copy.confidenceModerate : copy.confidenceLow}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {result.estimate !== null ? (
          <p className={styles.ruleBasedNote}>{copy.ruleBasedNote}</p>
        ) : null}

        <section className={styles.sectionResults} aria-labelledby="section-results-title">
          <h2 id="section-results-title">{copy.sectionResults}</h2>
          <div className={styles.sectionResultRows}>
            {result.sections.map((section, index) => (
              <div key={`${section.title}-${index}`}>
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.answered} / {section.items} {copy.answered.toLowerCase()}</p>
                </div>
                <strong>
                  {section.bandEstimate === null
                    ? `${section.correct} / ${section.possible}`
                    : `${section.bandEstimate} / 6`}
                </strong>
                <span><ClockIcon width={18} height={18} strokeWidth={1.8} aria-hidden />{formatElapsed(section.elapsedSeconds)}</span>
              </div>
            ))}
          </div>
        </section>

        {selected !== undefined ? (
          <section className={styles.answerReview} aria-labelledby="answer-review-title">
            <div className={styles.answerReviewHeading}>
              <h2 id="answer-review-title">{copy.answerReview}</h2>
              <div className={styles.reviewSectionSelect}>
                <SelectField
                  label={copy.reviewSectionLabel}
                  value={String(sectionIndex)}
                  options={result.sections.map((section, index) => ({
                    value: String(index),
                    label: section.title,
                  }))}
                  onValueChange={(value) => setSectionIndex(Number(value))}
                />
              </div>
            </div>
            <ReviewedAnswers
              key={sectionIndex}
              attemptId={attemptId}
              sectionOrder={selected.order}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ConnectedResult({ attemptId }: { attemptId: Id<"assessmentAttempts"> }) {
  const { copy } = usePracticeContext();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const result = useQuery(
    api.assessmentAttempts.getResult,
    isAuthenticated ? { attemptId } : "skip",
  );
  if (isLoading || (isAuthenticated && result === undefined)) {
    return (
      <div className={`page-container ${styles.practiceLoading}`} aria-live="polite" aria-busy="true">
        <p>{copy.sessionCheck}</p>
        <div className={styles.loadingRule} />
      </div>
    );
  }
  if (!isAuthenticated) return <SessionUnavailable attemptId={attemptId} />;
  if (result === undefined || result === null) {
    return <SessionUnavailable attemptId={attemptId} result />;
  }
  return <ResultReport result={result} attemptId={attemptId} />;
}

export function ResultView({ attemptId }: { attemptId: string }) {
  const { copy } = usePracticeContext();
  return (
    <AttemptRouteResolver
      routeAttemptId={attemptId}
      loading={(
        <div className={`page-container ${styles.practiceLoading}`} aria-live="polite" aria-busy="true">
          <p>{copy.sessionCheck}</p>
          <div className={styles.loadingRule} />
        </div>
      )}
      unavailable={<SessionUnavailable attemptId={attemptId} />}
    >
      {(resolvedAttemptId) => (
        <ConnectedResult attemptId={resolvedAttemptId} />
      )}
    </AttemptRouteResolver>
  );
}
