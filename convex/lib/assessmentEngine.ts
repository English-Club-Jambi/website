import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { scoreObjectiveResponse } from "./assessmentScoring";

export async function finalizeAttempt(
  ctx: MutationCtx,
  attempt: Doc<"assessmentAttempts">,
  completedAt: number,
  submitRequestId: string | undefined,
) {
  if (attempt.currentResultId !== undefined) {
    return attempt.currentResultId;
  }

  const items = await ctx.db
    .query("assessmentItems")
    .withIndex("by_version_id_and_order", (q) => q.eq("versionId", attempt.versionId))
    .take(201);
  const keys = await ctx.db
    .query("assessmentAnswerKeys")
    .withIndex("by_version_id_and_item_id", (q) => q.eq("versionId", attempt.versionId))
    .take(201);
  const responses = await ctx.db
    .query("assessmentResponses")
    .withIndex("by_attempt_id_and_updated_at", (q) => q.eq("attemptId", attempt._id))
    .take(201);
  const progressRows = await ctx.db
    .query("assessmentAttemptSections")
    .withIndex("by_attempt_id_and_order", (q) => q.eq("attemptId", attempt._id))
    .take(9);

  if (items.length > 200 || keys.length > 200 || responses.length > 200 || progressRows.length > 8) {
    throw new ConvexError({ code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const });
  }
  if (items.length === 0 || keys.length !== items.length) {
    throw new ConvexError({ code: "ASSESSMENT_KEYSET_INCOMPLETE" as const });
  }

  const keyByItem = new Map<Id<"assessmentItems">, Doc<"assessmentAnswerKeys">>();
  for (const key of keys) {
    if (keyByItem.has(key.itemId)) {
      throw new ConvexError({ code: "ASSESSMENT_KEYSET_DUPLICATE" as const });
    }
    keyByItem.set(key.itemId, key);
  }
  const responseByItem = new Map(responses.map((response) => [response.itemId, response]));
  const progressBySection = new Map(progressRows.map((row) => [row.sectionId, row]));
  const sectionScores = new Map<
    Id<"assessmentSections">,
    { correct: number; possible: number; omitted: number; answered: number }
  >();

  let correct = 0;
  let omitted = 0;
  for (const item of items) {
    const key = keyByItem.get(item._id);
    if (key === undefined) {
      throw new ConvexError({ code: "ASSESSMENT_KEYSET_INCOMPLETE" as const });
    }
    const response = responseByItem.get(item._id) ?? null;
    if (
      response !== null &&
      (response.versionId !== attempt.versionId || response.sectionId !== item.sectionId)
    ) {
      throw new ConvexError({ code: "ASSESSMENT_RESPONSE_RELATIONSHIP_INVALID" as const });
    }
    const scored = scoreObjectiveResponse(item, key, response);
    correct += scored.correct ? 1 : 0;
    omitted += scored.answered ? 0 : 1;
    const sectionScore = sectionScores.get(item.sectionId) ?? {
      correct: 0,
      possible: 0,
      omitted: 0,
      answered: 0,
    };
    sectionScore.correct += scored.correct ? 1 : 0;
    sectionScore.possible += 1;
    sectionScore.omitted += scored.answered ? 0 : 1;
    sectionScore.answered += scored.answered ? 1 : 0;
    sectionScores.set(item.sectionId, sectionScore);
  }

  const revision = attempt.resultRevision + 1;
  const resultId = await ctx.db.insert("assessmentResults", {
    attemptId: attempt._id,
    versionId: attempt.versionId,
    revision,
    status: "final",
    correct,
    possible: items.length,
    omitted,
    completedAt,
    claimContract: 1,
  });

  for (const [sectionId, score] of sectionScores) {
    const section = await ctx.db.get("assessmentSections", sectionId);
    const progress = progressBySection.get(sectionId);
    if (section === null || section.versionId !== attempt.versionId || progress === undefined) {
      throw new ConvexError({ code: "ASSESSMENT_SECTION_RELATIONSHIP_INVALID" as const });
    }
    await ctx.db.insert("assessmentSectionResults", {
      resultId,
      sectionId,
      skill: section.skill,
      correct: score.correct,
      possible: score.possible,
      omitted: score.omitted,
      answeredCount: score.answered,
      itemCount: score.possible,
      elapsedSeconds: progress.elapsedSeconds,
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
