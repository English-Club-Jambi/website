import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { scoreObjectiveResponse } from "./assessmentScoring";
import { listDeliveredSectionItems } from "./assessmentQuestionBank";
import {
  estimateOverallScore,
  estimateSectionScore,
  type IbtEstimateSkill,
} from "./assessmentEstimate";

export async function finalizeAttempt(
  ctx: MutationCtx,
  attempt: Doc<"assessmentAttempts">,
  completedAt: number,
  submitRequestId: string | undefined,
) {
  if (attempt.currentResultId !== undefined) {
    return attempt.currentResultId;
  }

  const responses = await ctx.db
    .query("assessmentResponses")
    .withIndex("by_attempt_id_and_updated_at", (q) => q.eq("attemptId", attempt._id))
    .take(201);
  const progressRows = await ctx.db
    .query("assessmentAttemptSections")
    .withIndex("by_attempt_id_and_order", (q) => q.eq("attemptId", attempt._id))
    .take(9);
  const version = await ctx.db.get("assessmentVersions", attempt.versionId);

  if (responses.length > 200 || progressRows.length > 8) {
    throw new ConvexError({ code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const });
  }
  if (version === null || version.definitionId !== attempt.definitionId) {
    throw new ConvexError({ code: "ASSESSMENT_VERSION_NOT_FOUND" as const });
  }

  const deliveredItems: Array<{
    item: Doc<"assessmentItems">;
    targetSectionId: Id<"assessmentSections">;
  }> = [];
  for (const progress of progressRows) {
    const section = await ctx.db.get("assessmentSections", progress.sectionId);
    if (section === null || section.versionId !== attempt.versionId) {
      throw new ConvexError({ code: "ASSESSMENT_SECTION_RELATIONSHIP_INVALID" as const });
    }
    const items = await listDeliveredSectionItems(ctx, attempt._id, section);
    deliveredItems.push(
      ...items.map((delivered) => ({
        item: delivered.item,
        targetSectionId: section._id,
      })),
    );
  }
  if (deliveredItems.length < 1 || deliveredItems.length > 200) {
    throw new ConvexError({ code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const });
  }

  const keyByItem = new Map<Id<"assessmentItems">, Doc<"assessmentAnswerKeys">>();
  for (const { item } of deliveredItems) {
    const key = await ctx.db
      .query("assessmentAnswerKeys")
      .withIndex("by_item_id", (q) => q.eq("itemId", item._id))
      .unique();
    if (key === null || keyByItem.has(item._id)) {
      throw new ConvexError({ code: "ASSESSMENT_KEYSET_DUPLICATE" as const });
    }
    keyByItem.set(item._id, key);
  }
  const responseByItem = new Map(responses.map((response) => [response.itemId, response]));
  const progressBySection = new Map(progressRows.map((row) => [row.sectionId, row]));
  const sectionScores = new Map<
    Id<"assessmentSections">,
    {
      correct: number;
      possible: number;
      omitted: number;
      answered: number;
      earnedPoints: number;
      possiblePoints: number;
    }
  >();

  let correct = 0;
  let omitted = 0;
  let earnedPoints = 0;
  let possiblePoints = 0;
  for (const { item, targetSectionId } of deliveredItems) {
    const key = keyByItem.get(item._id);
    if (key === undefined) {
      throw new ConvexError({ code: "ASSESSMENT_KEYSET_INCOMPLETE" as const });
    }
    const response = responseByItem.get(item._id) ?? null;
    if (
      response !== null &&
      (response.versionId !== attempt.versionId || response.sectionId !== targetSectionId)
    ) {
      throw new ConvexError({ code: "ASSESSMENT_RESPONSE_RELATIONSHIP_INVALID" as const });
    }
    const scored = scoreObjectiveResponse(item, key, response);
    correct += scored.correct ? 1 : 0;
    omitted += scored.answered ? 0 : 1;
    earnedPoints += scored.earnedPoints;
    possiblePoints += scored.possiblePoints;
    const sectionScore = sectionScores.get(targetSectionId) ?? {
      correct: 0,
      possible: 0,
      omitted: 0,
      answered: 0,
      earnedPoints: 0,
      possiblePoints: 0,
    };
    sectionScore.correct += scored.correct ? 1 : 0;
    sectionScore.possible += 1;
    sectionScore.omitted += scored.answered ? 0 : 1;
    sectionScore.answered += scored.answered ? 1 : 0;
    sectionScore.earnedPoints += scored.earnedPoints;
    sectionScore.possiblePoints += scored.possiblePoints;
    sectionScores.set(targetSectionId, sectionScore);
  }

  const sectionProjections = [];
  for (const [sectionId, score] of sectionScores) {
    const section = await ctx.db.get("assessmentSections", sectionId);
    const progress = progressBySection.get(sectionId);
    if (section === null || section.versionId !== attempt.versionId || progress === undefined) {
      throw new ConvexError({ code: "ASSESSMENT_SECTION_RELATIONSHIP_INVALID" as const });
    }
    const estimate =
      version.scorePolicy === "practice-estimate-v1" &&
      section.skill !== "structure"
        ? estimateSectionScore({
            skill: section.skill as IbtEstimateSkill,
            earnedPoints: score.earnedPoints,
            possiblePoints: score.possiblePoints,
          })
        : null;
    sectionProjections.push({ section, progress, score, estimate });
  }
  sectionProjections.sort((left, right) => left.section.order - right.section.order);
  const overall =
    version.scorePolicy === "practice-estimate-v1"
      ? estimateOverallScore(
          sectionProjections.flatMap(({ section, estimate }) =>
            estimate === null || section.skill === "structure"
              ? []
              : [{
                  skill: section.skill as IbtEstimateSkill,
                  band: estimate.band,
                  comparableScore: estimate.comparableScore,
                }],
          ),
        )
      : null;
  const revision = attempt.resultRevision + 1;
  const resultId = await ctx.db.insert("assessmentResults", {
    attemptId: attempt._id,
    versionId: attempt.versionId,
    revision,
    status: "final",
    correct,
    possible: deliveredItems.length,
    omitted,
    earnedPoints: Math.round(earnedPoints * 100) / 100,
    possiblePoints: Math.round(possiblePoints * 100) / 100,
    ...(version.scorePolicy === "practice-estimate-v1"
      ? {
          scoringModel: "ec-ibt-style-v1" as const,
          overallBandEstimate: overall?.overallBand,
          comparableTotalEstimate: overall?.comparableTotal,
          estimateConfidence: overall?.confidence ?? "low" as const,
        }
      : {}),
    completedAt,
    claimContract: 1,
  });

  for (const { section, progress, score, estimate } of sectionProjections) {
    await ctx.db.insert("assessmentSectionResults", {
      resultId,
      sectionId: section._id,
      skill: section.skill,
      correct: score.correct,
      possible: score.possible,
      omitted: score.omitted,
      answeredCount: score.answered,
      itemCount: score.possible,
      elapsedSeconds: progress.elapsedSeconds,
      earnedPoints: Math.round(score.earnedPoints * 100) / 100,
      possiblePoints: Math.round(score.possiblePoints * 100) / 100,
      bandEstimate: estimate?.band,
      comparableScoreEstimate: estimate?.comparableScore,
      estimateConfidence: estimate?.confidence,
    });
  }

  await ctx.db.patch("assessmentAttempts", attempt._id, {
    status: "submitted",
    submittedAt: completedAt,
    lastActivityAt: completedAt,
    submitRequestId,
    currentResultId: resultId,
    resultRevision: revision,
    revision: attempt.revision + 1,
  });
  return resultId;
}

export async function finalizeSectionAndMaybeSubmit(
  ctx: MutationCtx,
  attempt: Doc<"assessmentAttempts">,
  progress: Doc<"assessmentAttemptSections">,
  completedAt: number,
  submitRequestId?: string,
) {
  if (attempt.status === "submitted" || attempt.status === "abandoned") {
    return { status: attempt.status, resultId: attempt.currentResultId ?? null };
  }
  if (progress.status === "completed") {
    return { status: attempt.status, resultId: attempt.currentResultId ?? null };
  }

  const elapsedSeconds =
    progress.startedAt === undefined
      ? 0
      : Math.max(
          0,
          Math.floor(
            (Math.min(completedAt, progress.deadlineAt ?? completedAt) - progress.startedAt) /
              1000,
          ),
        );
  await ctx.db.patch("assessmentAttemptSections", progress._id, {
    status: "completed",
    completedAt,
    elapsedSeconds,
  });

  const [next] = await ctx.db
    .query("assessmentAttemptSections")
    .withIndex("by_attempt_id_and_order", (q) =>
      q.eq("attemptId", attempt._id).gt("order", progress.order),
    )
    .take(1);
  if (next !== undefined) {
    await ctx.db.patch("assessmentAttempts", attempt._id, {
      status: "section-review",
      currentSectionOrder: next.order,
      currentItemOrder: 0,
      lastActivityAt: completedAt,
      revision: attempt.revision + 1,
    });
    return { status: "section-review" as const, resultId: null };
  }

  const resultId = await finalizeAttempt(
    ctx,
    attempt,
    completedAt,
    submitRequestId,
  );
  return { status: "submitted" as const, resultId };
}
