import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import { publicResponseFromDoc, responseIsAnswered } from "./assessmentModel";
import {
  scoreConstructedPracticeResponse,
  scoreRepeatTranscript,
} from "./assessmentEstimate";

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
  const objectivePoints = answerKey.points ?? 1;
  if (
    !Number.isFinite(objectivePoints) ||
    objectivePoints <= 0 ||
    objectivePoints > 100
  ) {
    throw new ConvexError({ code: "ANSWER_KEY_POINTS_INVALID" as const });
  }
  if (!answered || publicResponse === null) {
    return {
      answered: false,
      correct: false,
      earnedPoints: 0,
      possiblePoints:
        answerKey.kind === "text-rubric" ? answerKey.maxPoints : objectivePoints,
    };
  }

  if (item.type === "single-choice" && answerKey.kind === "choice" && publicResponse.kind === "choice") {
    if (answerKey.correctChoiceKeys.length !== 1) {
      throw new ConvexError({ code: "ANSWER_KEY_SHAPE_INVALID" as const });
    }
    const correct =
      publicResponse.selectedChoiceKey === answerKey.correctChoiceKeys[0];
    return {
      answered: true,
      correct,
      earnedPoints: correct ? objectivePoints : 0,
      possiblePoints: objectivePoints,
    };
  }
  if (item.type === "multiple-select" && answerKey.kind === "multi-choice" && publicResponse.kind === "multi-choice") {
    const correct = sameSet(
      publicResponse.selectedChoiceKeys,
      answerKey.correctChoiceKeys,
    );
    return {
      answered: true,
      correct,
      earnedPoints: correct ? objectivePoints : 0,
      possiblePoints: objectivePoints,
    };
  }
  if (item.type === "cloze-select" && answerKey.kind === "cloze" && publicResponse.kind === "cloze") {
    const actual = publicResponse.gapAnswers.map((answer) => `${answer.gapKey}:${answer.choiceKey}`);
    const expected = answerKey.correctGapAnswers.map((answer) => `${answer.gapKey}:${answer.choiceKey}`);
    const correct = sameSet(actual, expected);
    return {
      answered: true,
      correct,
      earnedPoints: correct ? objectivePoints : 0,
      possiblePoints: objectivePoints,
    };
  }
  if (item.type === "sentence-build" && answerKey.kind === "token-order" && publicResponse.kind === "token-order") {
    const correct = answerKey.acceptedTokenOrders.some((order) =>
      sameOrder(order, publicResponse.tokenOrder),
    );
    return {
      answered: true,
      correct,
      earnedPoints: correct ? objectivePoints : 0,
      possiblePoints: objectivePoints,
    };
  }
  if (
    item.type === "constructed-response" &&
    answerKey.kind === "text-rubric" &&
    publicResponse.kind === "text" &&
    item.responseMode === answerKey.rubricMode
  ) {
    if (
      !Number.isFinite(answerKey.maxPoints) ||
      answerKey.maxPoints <= 0 ||
      answerKey.maxPoints > 20 ||
      !Number.isInteger(answerKey.minimumWords) ||
      answerKey.minimumWords < 1 ||
      answerKey.minimumWords > 500
    ) {
      throw new ConvexError({ code: "ANSWER_KEY_SHAPE_INVALID" as const });
    }
    const earnedPoints = answerKey.rubricMode === "speaking-repeat"
      ? scoreRepeatTranscript({
          response: publicResponse.text,
          target: answerKey.sampleResponse,
          maxPoints: answerKey.maxPoints,
        })
      : scoreConstructedPracticeResponse({
          response: publicResponse.text,
          minimumWords: answerKey.minimumWords,
          targetTerms: answerKey.targetTerms,
          maxPoints: answerKey.maxPoints,
        });
    return {
      answered: true,
      correct: earnedPoints >= answerKey.maxPoints,
      earnedPoints,
      possiblePoints: answerKey.maxPoints,
    };
  }
  throw new ConvexError({ code: "ANSWER_KEY_SHAPE_INVALID" as const });
}
