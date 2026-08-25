import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import { publicResponseFromDoc, responseIsAnswered } from "./assessmentModel";

function sameOrder(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameSet(left: string[], right: string[]) {
  return left.length === right.length && new Set(left).size === left.length && left.every((value) => right.includes(value));
}

export function scoreObjectiveResponse(
  item: Doc<"assessmentItems">,
  answerKey: Doc<"assessmentAnswerKeys">,
  response: Doc<"assessmentResponses"> | null,
) {
  if (answerKey.itemId !== item._id || answerKey.versionId !== item.versionId) {
    throw new ConvexError({ code: "ANSWER_KEY_RELATIONSHIP_INVALID" as const });
  }
  const publicResponse = response === null ? null : publicResponseFromDoc(response);
  const answered = publicResponse !== null && responseIsAnswered(publicResponse);
  if (!answered || publicResponse === null) {
    return { answered: false, correct: false };
  }

  if (item.type === "single-choice" && answerKey.kind === "choice" && publicResponse.kind === "choice") {
    if (answerKey.correctChoiceKeys.length !== 1) {
      throw new ConvexError({ code: "ANSWER_KEY_SHAPE_INVALID" as const });
    }
    return {
      answered: true,
      correct: publicResponse.selectedChoiceKey === answerKey.correctChoiceKeys[0],
    };
  }
  if (item.type === "multiple-select" && answerKey.kind === "multi-choice" && publicResponse.kind === "multi-choice") {
    return {
      answered: true,
      correct: sameSet(publicResponse.selectedChoiceKeys, answerKey.correctChoiceKeys),
    };
  }
  if (item.type === "cloze-select" && answerKey.kind === "cloze" && publicResponse.kind === "cloze") {
    const actual = publicResponse.gapAnswers.map((answer) => `${answer.gapKey}:${answer.choiceKey}`);
    const expected = answerKey.correctGapAnswers.map((answer) => `${answer.gapKey}:${answer.choiceKey}`);
    return { answered: true, correct: sameSet(actual, expected) };
  }
  if (item.type === "sentence-build" && answerKey.kind === "token-order" && publicResponse.kind === "token-order") {
    return {
      answered: true,
      correct: answerKey.acceptedTokenOrders.some((order) => sameOrder(order, publicResponse.tokenOrder)),
    };
  }
  throw new ConvexError({ code: "ANSWER_KEY_SHAPE_INVALID" as const });
}
