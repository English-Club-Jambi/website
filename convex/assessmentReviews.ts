import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import {
  assessmentResponseInputValidator,
  assessmentSkillValidator,
  publicAssessmentItemValidator,
  publicStimulusValidator,
} from "./assessmentValidators";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireOwnedAttempt } from "./lib/assessmentAuth";
import {
  publicItemFromDoc,
  publicResponseFromDoc,
} from "./lib/assessmentModel";
import { scoreObjectiveResponse } from "./lib/assessmentScoring";
import { publicAssessmentR2UrlForMedia } from "./lib/media";

const reviewItemValidator = v.object({
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
  }
}

export const listMinePage = query({
  args: {
    attemptId: v.id("assessmentAttempts"),
    sectionOrder: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(reviewItemValidator),
  handler: async (ctx, args) => {
    const { attempt } = await requireOwnedAttempt(ctx, args.attemptId);
    if (attempt.status !== "submitted" || attempt.currentResultId === undefined) {
      throw new ConvexError({ code: "REVIEW_NOT_AVAILABLE" as const });
    }
    if (
      args.paginationOpts.numItems !== 20 ||
      (args.paginationOpts.maximumRowsRead !== undefined &&
        args.paginationOpts.maximumRowsRead > 20)
    ) {
      throw new Error("Assessment review page size is invalid.");
    }
    if (
      !Number.isInteger(args.sectionOrder) ||
      args.sectionOrder < 0 ||
      args.sectionOrder > 7
    ) {
      throw new ConvexError({ code: "INVALID_SECTION_ORDER" as const });
    }
    const progress = await ctx.db
      .query("assessmentAttemptSections")
      .withIndex("by_attempt_id_and_order", (q) =>
        q.eq("attemptId", attempt._id).eq("order", args.sectionOrder),
      )
      .unique();
    if (progress === null) {
      throw new ConvexError({ code: "INVALID_SECTION_ORDER" as const });
    }
    const result = await ctx.db
      .query("assessmentItems")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", progress.sectionId),
      )
      .paginate({ ...args.paginationOpts, maximumRowsRead: 20 });
    const page = [];
    for (const item of result.page) {
      const [section, key, response, stimulusRow] = await Promise.all([
        ctx.db.get("assessmentSections", item.sectionId),
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
      if (
        section === null ||
        section.versionId !== attempt.versionId ||
        key === null ||
        key.versionId !== attempt.versionId
      ) {
        throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
      }
      let stimulus = null;
      if (
        stimulusRow !== null &&
        stimulusRow.versionId === attempt.versionId &&
        stimulusRow.sectionId === section._id
      ) {
        let mediaUrl: string | null = null;
        if (stimulusRow.mediaId !== undefined) {
          const media = await ctx.db.get("mediaAssets", stimulusRow.mediaId);
          mediaUrl = publicAssessmentR2UrlForMedia(
            media,
            attempt.versionId,
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
      page.push({
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
      });
    }
    return { ...result, page };
  },
});
