import { ConvexError, v } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  assessmentResponseInputValidator,
  assessmentSkillValidator,
  publicAssessmentItemValidator,
  publicStimulusValidator,
} from "../assessmentValidators";
import {
  publicItemFromDoc,
  publicResponseFromDoc,
} from "./assessmentModel";
import { scoreObjectiveResponse } from "./assessmentScoring";
import { publicAssessmentR2UrlForMedia } from "./media";

export const reviewItemValidator = v.object({
  item: publicAssessmentItemValidator,
  section: v.object({
    id: v.id("assessmentSections"),
    title: v.string(),
    skill: assessmentSkillValidator,
    order: v.number(),
  }),
  stimulus: v.union(publicStimulusValidator, v.null()),
  response: v.union(assessmentResponseInputValidator, v.null()),
  correctAnswer: assessmentResponseInputValidator,
  explanation: v.union(v.string(), v.null()),
  answered: v.boolean(),
  correct: v.boolean(),
});

function answerProjection(key: Doc<"assessmentAnswerKeys">) {
  switch (key.kind) {
    case "choice":
      if (key.correctChoiceKeys.length !== 1) {
        throw new ConvexError({ code: "ANSWER_KEY_SHAPE_INVALID" as const });
      }
      return {
        kind: "choice" as const,
        selectedChoiceKey: key.correctChoiceKeys[0],
      };
    case "multi-choice":
      return {
        kind: "multi-choice" as const,
        selectedChoiceKeys: key.correctChoiceKeys,
      };
    case "cloze":
      return { kind: "cloze" as const, gapAnswers: key.correctGapAnswers };
    case "token-order":
      if (key.acceptedTokenOrders.length === 0) {
        throw new ConvexError({ code: "ANSWER_KEY_SHAPE_INVALID" as const });
      }
      return {
        kind: "token-order" as const,
        tokenOrder: key.acceptedTokenOrders[0],
      };
    case "text-rubric":
      return {
        kind: "text" as const,
        text: key.sampleResponse,
      };
  }
}

export async function projectReviewItem(
  ctx: QueryCtx,
  attempt: Doc<"assessmentAttempts">,
  section: Doc<"assessmentSections">,
  item: Doc<"assessmentItems">,
) {
  const [key, response, stimulusRow] = await Promise.all([
    ctx.db
      .query("assessmentAnswerKeys")
      .withIndex("by_item_id", (q) => q.eq("itemId", item._id))
      .unique(),
    ctx.db
      .query("assessmentResponses")
      .withIndex("by_attempt_id_and_item_id", (q) =>
        q.eq("attemptId", attempt._id).eq("itemId", item._id),
      )
      .unique(),
    item.stimulusId === undefined
      ? Promise.resolve(null)
      : ctx.db.get("assessmentStimuli", item.stimulusId),
  ]);
  if (key === null || key.versionId !== item.versionId) {
    throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
  }
  let stimulus = null;
  if (
    stimulusRow !== null &&
    stimulusRow.versionId === item.versionId &&
    stimulusRow.sectionId === item.sectionId
  ) {
    let mediaUrl: string | null = null;
    if (stimulusRow.mediaId !== undefined) {
      const media = await ctx.db.get("mediaAssets", stimulusRow.mediaId);
      mediaUrl = publicAssessmentR2UrlForMedia(
        media,
        stimulusRow.versionId,
        stimulusRow.kind,
      );
    }
    stimulus = {
      id: stimulusRow._id,
      kind: stimulusRow.kind,
      title: stimulusRow.title ?? null,
      body: stimulusRow.body ?? null,
      mediaUrl,
      transcript: stimulusRow.transcript ?? null,
      alt: stimulusRow.alt ?? null,
    };
  }
  const scored = scoreObjectiveResponse(item, key, response);
  return {
    item: publicItemFromDoc(item),
    section: {
      id: section._id,
      title: section.title,
      skill: section.skill,
      order: section.order,
    },
    stimulus,
    response: response === null ? null : publicResponseFromDoc(response),
    correctAnswer: answerProjection(key),
    explanation: item.explanation ?? null,
    answered: scored.answered,
    correct: scored.correct,
  };
}
