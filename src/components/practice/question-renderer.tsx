"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";

import { api } from "../../../convex/_generated/api";
import type { PublicContentFor } from "@content/public-content";
import { SelectField } from "@/components/forms/select-field";

import styles from "./practice.module.css";

export type AttemptPlayer = NonNullable<
  FunctionReturnType<typeof api.assessmentAttempts.getPlayer>
>;
export type PublicAssessmentItem = AttemptPlayer["item"];
export type PublicAssessmentResponse = NonNullable<AttemptPlayer["response"]>;

export function emptyResponseForItem(
  item: PublicAssessmentItem,
): PublicAssessmentResponse {
  switch (item.type) {
    case "single-choice":
      return { kind: "choice" };
    case "multiple-select":
      return { kind: "multi-choice", selectedChoiceKeys: [] };
    case "cloze-select":
      return { kind: "cloze", gapAnswers: [] };
    case "sentence-build":
      return { kind: "token-order", tokenOrder: [] };
  }
}

export function responseIsAnswered(response: PublicAssessmentResponse) {
  switch (response.kind) {
    case "choice":
      return response.selectedChoiceKey !== undefined;
    case "multi-choice":
      return response.selectedChoiceKeys.length > 0;
    case "cloze":
      return response.gapAnswers.length > 0;
    case "token-order":
      return response.tokenOrder.length > 0;
  }
}

export function QuestionRenderer({
  item,
  response,
  disabled,
  onChange,
  copy,
}: {
  item: PublicAssessmentItem;
  response: PublicAssessmentResponse;
  disabled?: boolean;
  onChange: (next: PublicAssessmentResponse) => void;
  copy: PublicContentFor<"practice">;
}) {
  switch (item.type) {
    case "single-choice": {
      const selected = response.kind === "choice" ? response.selectedChoiceKey : undefined;
      return (
        <fieldset className={styles.answerGroup} disabled={disabled}>
          <legend className="visually-hidden">{copy.chooseOne}</legend>
          {item.options.map((option) => (
            <label className={styles.answerLine} key={option.key}>
              <input
                type="radio"
                name={`answer-${item.id}`}
                value={option.key}
                checked={selected === option.key}
                onChange={() =>
                  onChange({ kind: "choice", selectedChoiceKey: option.key })
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      );
    }

    case "multiple-select": {
      const selected =
        response.kind === "multi-choice" ? response.selectedChoiceKeys : [];
      return (
        <fieldset className={styles.answerGroup} disabled={disabled}>
          <legend>
            {copy.chooseRangePrefix}{" "}
            {item.selectionMin === item.selectionMax
              ? item.selectionMin
              : `${item.selectionMin} ${copy.chooseRangeJoin} ${item.selectionMax}`} {copy.chooseRangeSuffix}
          </legend>
          {item.options.map((option) => {
            const checked = selected.includes(option.key);
            return (
              <label className={styles.answerLine} key={option.key}>
                <input
                  type="checkbox"
                  value={option.key}
                  checked={checked}
                  disabled={
                    disabled || (!checked && selected.length >= item.selectionMax)
                  }
                  onChange={() => {
                    const next = checked
                      ? selected.filter((key) => key !== option.key)
                      : [...selected, option.key];
                    onChange({ kind: "multi-choice", selectedChoiceKeys: next });
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </fieldset>
      );
    }

    case "cloze-select": {
      const answers = response.kind === "cloze" ? response.gapAnswers : [];
      return (
        <div className={styles.clozeAnswer} aria-label={copy.completeBlanks}>
          {item.stemParts.map((part, index) => {
            const gap = item.gaps[index];
            const value = gap
              ? answers.find((answer) => answer.gapKey === gap.key)?.choiceKey
              : undefined;
            return (
              <div className={styles.clozePart} key={`${item.id}-part-${index}`}>
                {part ? <p>{part}</p> : null}
                {gap ? (
                  <SelectField
                    label={`${copy.blank} ${index + 1}`}
                    value={value}
                    disabled={disabled}
                    placeholder={copy.choosePhrase}
                    options={gap.options.map((option) => ({
                      value: option.key,
                      label: option.label,
                    }))}
                    onValueChange={(choiceKey) => {
                      const next = answers.filter((answer) => answer.gapKey !== gap.key);
                      next.push({ gapKey: gap.key, choiceKey });
                      onChange({ kind: "cloze", gapAnswers: next });
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      );
    }

    case "sentence-build": {
      const tokenOrder = response.kind === "token-order" ? response.tokenOrder : [];
      const tokenByKey = new Map(item.tokens.map((token) => [token.key, token]));
      const available = item.tokens.filter((token) => !tokenOrder.includes(token.key));

      function moveToken(index: number, offset: number) {
        const nextIndex = index + offset;
        if (nextIndex < 0 || nextIndex >= tokenOrder.length) {
          return;
        }
        const next = [...tokenOrder];
        [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
        onChange({ kind: "token-order", tokenOrder: next });
      }

      return (
        <div className={styles.sentenceBuilder}>
          <div className={styles.sentenceOrder} aria-label={copy.currentOrder}>
            {tokenOrder.length === 0 ? (
              <p>{copy.sentenceStart}</p>
            ) : (
              <ol>
                {tokenOrder.map((key, index) => (
                  <li key={key}>
                    <span>{tokenByKey.get(key)?.label ?? key}</span>
                    <span className={styles.tokenActions}>
                      <button
                        type="button"
                        disabled={disabled || index === 0}
                        aria-label={`${copy.moveEarlier}: ${tokenByKey.get(key)?.label ?? copy.choosePhrase}`}
                        onClick={() => moveToken(index, -1)}
                      >
                        <ArrowLeftIcon width={18} height={18} strokeWidth={2} aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={disabled || index + 1 === tokenOrder.length}
                        aria-label={`${copy.moveLater}: ${tokenByKey.get(key)?.label ?? copy.choosePhrase}`}
                        onClick={() => moveToken(index, 1)}
                      >
                        <ArrowRightIcon width={18} height={18} strokeWidth={2} aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`${copy.removePhrase}: ${tokenByKey.get(key)?.label ?? copy.choosePhrase}`}
                        onClick={() =>
                          onChange({
                            kind: "token-order",
                            tokenOrder: tokenOrder.filter((tokenKey) => tokenKey !== key),
                          })
                        }
                      >
                        <XMarkIcon width={18} height={18} strokeWidth={2} aria-hidden />
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {available.length > 0 ? (
            <div className={styles.availableTokens} aria-label={copy.availablePhrases}>
              {available.map((token) => (
                <button
                  key={token.key}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      kind: "token-order",
                      tokenOrder: [...tokenOrder, token.key],
                    })
                  }
                >
                  <PlusIcon width={17} height={17} strokeWidth={2} aria-hidden />
                  {token.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
    }
  }
}
