import { ConvexError, type Infer } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import {
  assessmentResponseInputValidator,
} from "../assessmentValidators";

export type AssessmentResponseInput = Infer<
  typeof assessmentResponseInputValidator
>;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const keyPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export function normalizeBoundedText(
  value: string,
  label: string,
  minimum: number,
  maximum: number,
) {
  const normalized = value.trim().replace(/\r\n/g, "\n");
  if (
    normalized.length < minimum ||
    normalized.length > maximum ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized)
  ) {
    throw new ConvexError({ code: "INVALID_INPUT" as const, field: label });
  }
  return normalized;
}

export function normalizeSlug(value: string) {
  const slug = value.trim().toLowerCase();
  if (slug.length < 3 || slug.length > 96 || !slugPattern.test(slug)) {
    throw new ConvexError({ code: "INVALID_SLUG" as const });
  }
  return slug;
}

export function normalizeKey(value: string, label: string) {
  const key = value.trim().toLowerCase();
  if (key.length < 1 || key.length > 96 || !keyPattern.test(key)) {
    throw new ConvexError({ code: "INVALID_INPUT" as const, field: label });
  }
  return key;
}

export function normalizeRequestId(value: string, field: string) {
  const requestId = value.trim();
  if (
    requestId.length < 8 ||
    requestId.length > 128 ||
    /[^A-Za-z0-9._:-]/.test(requestId)
  ) {
    throw new ConvexError({ code: "INVALID_INPUT" as const, field });
  }
  return requestId;
}

export function requireIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  field: string,
) {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ConvexError({ code: "INVALID_INPUT" as const, field });
  }
  return value;
}

export function normalizeOptions(
  options: Array<{ key: string; label: string }>,
) {
  if (options.length < 2 || options.length > 8) {
    throw new ConvexError({ code: "INVALID_OPTIONS" as const });
  }
  const normalized = options.map((option, index) => ({
    key: normalizeKey(option.key, `options.${index}.key`),
    label: normalizeBoundedText(option.label, `options.${index}.label`, 1, 500),
  }));
  if (new Set(normalized.map((option) => option.key)).size !== normalized.length) {
    throw new ConvexError({ code: "DUPLICATE_OPTION_KEY" as const });
  }
  return normalized;
}

function assertUnique(values: string[], code: string) {
  if (new Set(values).size !== values.length) {
    throw new ConvexError({ code });
  }
}

export function normalizeResponseForItem(
  item: Doc<"assessmentItems">,
  response: AssessmentResponseInput,
): AssessmentResponseInput {
  if (item.type === "single-choice") {
    if (response.kind !== "choice") {
      throw new ConvexError({ code: "RESPONSE_KIND_MISMATCH" as const });
    }
    if (
      response.selectedChoiceKey !== undefined &&
      !item.options.some((option) => option.key === response.selectedChoiceKey)
    ) {
      throw new ConvexError({ code: "INVALID_RESPONSE_OPTION" as const });
    }
    return response.selectedChoiceKey === undefined
      ? { kind: "choice" }
      : { kind: "choice", selectedChoiceKey: response.selectedChoiceKey };
  }

  if (item.type === "multiple-select") {
    if (response.kind !== "multi-choice") {
      throw new ConvexError({ code: "RESPONSE_KIND_MISMATCH" as const });
    }
    if (response.selectedChoiceKeys.length > item.selectionMax) {
      throw new ConvexError({ code: "INVALID_RESPONSE_OPTION" as const });
    }
    assertUnique(response.selectedChoiceKeys, "DUPLICATE_RESPONSE_OPTION");
    const selected = new Set(response.selectedChoiceKeys);
    if ([...selected].some((key) => !item.options.some((option) => option.key === key))) {
      throw new ConvexError({ code: "INVALID_RESPONSE_OPTION" as const });
    }
    return {
      kind: "multi-choice",
      selectedChoiceKeys: item.options
        .filter((option) => selected.has(option.key))
        .map((option) => option.key),
    };
  }

  if (item.type === "cloze-select") {
    if (response.kind !== "cloze" || response.gapAnswers.length > 12) {
      throw new ConvexError({ code: "RESPONSE_KIND_MISMATCH" as const });
    }
    assertUnique(
      response.gapAnswers.map((answer) => answer.gapKey),
      "DUPLICATE_GAP_ANSWER",
    );
    const byGap = new Map(response.gapAnswers.map((answer) => [answer.gapKey, answer.choiceKey]));
    for (const [gapKey, choiceKey] of byGap) {
      const gap = item.gaps.find((candidate) => candidate.key === gapKey);
      if (gap === undefined || !gap.options.some((option) => option.key === choiceKey)) {
        throw new ConvexError({ code: "INVALID_GAP_ANSWER" as const });
      }
    }
    return {
      kind: "cloze",
      gapAnswers: item.gaps
        .filter((gap) => byGap.has(gap.key))
        .map((gap) => ({ gapKey: gap.key, choiceKey: byGap.get(gap.key)! })),
    };
  }

  if (item.type === "sentence-build") {
    if (response.kind !== "token-order" || response.tokenOrder.length > 30) {
      throw new ConvexError({ code: "RESPONSE_KIND_MISMATCH" as const });
    }
    assertUnique(response.tokenOrder, "DUPLICATE_TOKEN");
    if (response.tokenOrder.some((key) => !item.tokens.some((token) => token.key === key))) {
      throw new ConvexError({ code: "INVALID_TOKEN" as const });
    }
    return { kind: "token-order", tokenOrder: [...response.tokenOrder] };
  }

  if (response.kind !== "text") {
    throw new ConvexError({ code: "RESPONSE_KIND_MISMATCH" as const });
  }
  const text = response.text.trim().replace(/\r\n/g, "\n");
  if (
    text.length > item.maximumCharacters ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)
  ) {
    throw new ConvexError({ code: "INVALID_RESPONSE_TEXT" as const });
  }
  return { kind: "text", text };
}

export function responseIsAnswered(response: AssessmentResponseInput) {
  switch (response.kind) {
    case "choice":
      return response.selectedChoiceKey !== undefined;
    case "multi-choice":
      return response.selectedChoiceKeys.length > 0;
    case "cloze":
      return response.gapAnswers.length > 0;
    case "token-order":
      return response.tokenOrder.length > 0;
    case "text":
      return response.text.trim().length > 0;
  }
}

export function publicResponseFromDoc(
  response: Doc<"assessmentResponses">,
): AssessmentResponseInput {
  switch (response.kind) {
    case "choice":
      return response.selectedChoiceKey === undefined
        ? { kind: "choice" }
        : { kind: "choice", selectedChoiceKey: response.selectedChoiceKey };
    case "multi-choice":
      return { kind: "multi-choice", selectedChoiceKeys: response.selectedChoiceKeys };
    case "cloze":
      return { kind: "cloze", gapAnswers: response.gapAnswers };
    case "token-order":
      return { kind: "token-order", tokenOrder: response.tokenOrder };
    case "text":
      return { kind: "text", text: response.text };
  }
}

export function publicItemFromDoc(item: Doc<"assessmentItems">) {
  const base = { id: item._id, type: item.type, prompt: item.prompt, required: item.required };
  switch (item.type) {
    case "single-choice":
      return { ...base, type: item.type, options: item.options };
    case "multiple-select":
      return {
        ...base,
        type: item.type,
        options: item.options,
        selectionMin: item.selectionMin,
        selectionMax: item.selectionMax,
      };
    case "cloze-select":
      return { ...base, type: item.type, stemParts: item.stemParts, gaps: item.gaps };
    case "sentence-build":
      return { ...base, type: item.type, tokens: item.tokens };
    case "constructed-response":
      return {
        ...base,
        type: item.type,
        responseMode: item.responseMode,
        minimumWords: item.minimumWords,
        recommendedWords: item.recommendedWords,
        maximumCharacters: item.maximumCharacters,
        preparationSeconds: item.preparationSeconds ?? null,
        responseSeconds: item.responseSeconds ?? null,
      };
  }
}

export function sameResponsePayload(
  left: AssessmentResponseInput,
  right: AssessmentResponseInput,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}
