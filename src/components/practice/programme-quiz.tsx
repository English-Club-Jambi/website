"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { PublicContentFor } from "@content/public-content";
import type { ProgrammeQuizQuestion } from "@/content/assessment";

import styles from "./practice.module.css";

type QuizPhase = "intro" | "questions" | "complete";

export function ProgrammeQuiz({
  questions,
  copy,
}: {
  questions: ReadonlyArray<ProgrammeQuizQuestion>;
  copy: PublicContentFor<"home">;
}) {
  const [phase, setPhase] = useState<QuizPhase>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sectionTitleId = useId();
  const current = questions[questionIndex];

  useEffect(() => {
    if (phase === "questions") {
      const heading = headingRef.current;
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView?.({ block: "start" });
    }
  }, [phase, questionIndex]);

  if (questions.length === 0) {
    return null;
  }

  function start() {
    setPhase("questions");
    setQuestionIndex(0);
  }

  function reset() {
    setAnswers({});
    setChecked(new Set());
    setQuestionIndex(0);
    setPhase("intro");
  }

  function checkAnswer() {
    if (current === undefined || answers[current.id] === undefined) {
      return;
    }

    setChecked((existing) => new Set(existing).add(current.id));
  }

  function move(offset: number) {
    const next = questionIndex + offset;
    if (next < 0) {
      return;
    }
    if (next >= questions.length) {
      setPhase("complete");
      return;
    }
    setQuestionIndex(next);
  }

  const understood = questions.reduce(
    (total, question) =>
      total + (answers[question.id] === question.correctOptionId ? 1 : 0),
    0,
  );

  return (
    <section className={styles.programmeQuiz} aria-labelledby={sectionTitleId}>
      <div className={styles.programmeQuizFrame}>
        <div className={styles.programmeQuizIntro}>
          <h2 id={sectionTitleId}>{copy.programmeQuizTitle}</h2>
          <p>{copy.programmeQuizIntro}</p>
        </div>

        {phase === "intro" ? (
          <div className={styles.programmeQuizStart}>
            <p>{copy.programmeQuizStartBody}</p>
            <button type="button" className={styles.primaryButton} onClick={start}>
              {copy.programmeQuizStart}
              <ArrowRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : null}

        {phase === "questions" && current !== undefined ? (
          <div className={styles.programmeQuestion}>
            <p className={styles.questionPosition}>
              {copy.programmeQuizQuestion} {questionIndex + 1} {copy.programmeQuizOf}{" "}
              {questions.length}
            </p>
            <h3 ref={headingRef} tabIndex={-1}>
              {current.prompt}
            </h3>
            <fieldset className={styles.programmeOptions}>
              <legend className="visually-hidden">
                {copy.programmeQuizChoiceLabel}
              </legend>
              {current.options.map((option) => {
                const selected = answers[current.id] === option.id;
                return (
                  <label key={option.id} className={styles.optionLine}>
                    <input
                      type="radio"
                      name={`programme-${current.id}`}
                      value={option.id}
                      checked={selected}
                      onChange={() => {
                        setAnswers((existing) => ({
                          ...existing,
                          [current.id]: option.id,
                        }));
                        setChecked((existing) => {
                          const next = new Set(existing);
                          next.delete(current.id);
                          return next;
                        });
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </fieldset>

            {checked.has(current.id) ? (
              <div className={styles.programmeExplanation} role="status">
                <CheckCircleIcon width={23} height={23} strokeWidth={2} aria-hidden />
                <div>
                  <p>
                    {answers[current.id] === current.correctOptionId
                      ? copy.programmeQuizCorrect
                      : copy.programmeQuizIncorrect}
                  </p>
                  <p>{current.explanation}</p>
                  <Link href={current.link.href}>{current.link.label}</Link>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.checkButton}
                disabled={answers[current.id] === undefined}
                onClick={checkAnswer}
              >
                {copy.programmeQuizCheck}
              </button>
            )}

            <div className={styles.programmeActions}>
              <button
                type="button"
                className={styles.quietButton}
                disabled={questionIndex === 0}
                onClick={() => move(-1)}
              >
                <ArrowLeftIcon width={20} height={20} strokeWidth={2} aria-hidden />
                {copy.programmeQuizBack}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!checked.has(current.id)}
                onClick={() => move(1)}
              >
                {questionIndex + 1 === questions.length
                  ? copy.programmeQuizFinish
                  : copy.programmeQuizNext}
                <ArrowRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
        ) : null}

        {phase === "complete" ? (
          <div className={styles.programmeComplete} role="status">
            <CheckCircleIcon width={38} height={38} strokeWidth={1.8} aria-hidden />
            <h3>
              {copy.programmeQuizCompletePrefix} {understood} {copy.programmeQuizOf}{" "}
              {questions.length} {copy.programmeQuizCompleteSuffix}
            </h3>
            <p>
              {copy.programmeQuizCompleteBody}
            </p>
            <div className={styles.programmeCompleteActions}>
              <Link href="/activities" className={styles.primaryLink}>
                {copy.programmeQuizReadActivities}
                <ArrowRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
              </Link>
              <button type="button" className={styles.quietButton} onClick={reset}>
                <ArrowPathIcon width={20} height={20} strokeWidth={2} aria-hidden />
                {copy.programmeQuizAgain}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
