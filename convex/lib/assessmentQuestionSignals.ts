import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

async function resolveBankQuestionId(
  ctx: MutationCtx,
  attemptId: Id<"assessmentAttempts">,
  itemId: Id<"assessmentItems">,
) {
  const delivered = await ctx.db
    .query("assessmentAttemptItems")
    .withIndex("by_attempt_id_and_item_id", (q) =>
      q.eq("attemptId", attemptId).eq("itemId", itemId),
    )
    .unique();
  if (delivered !== null) return delivered.bankQuestionId;

  const bankQuestion = await ctx.db
    .query("assessmentQuestionBank")
    .withIndex("by_source_item_id", (q) => q.eq("sourceItemId", itemId))
    .unique();
  return bankQuestion?._id ?? null;
}

export async function updateQuestionFlagSignal(
  ctx: MutationCtx,
  attempt: Doc<"assessmentAttempts">,
  itemId: Id<"assessmentItems">,
  becameFlagged: boolean,
  now = Date.now(),
) {
  const bankQuestionId = await resolveBankQuestionId(
    ctx,
    attempt._id,
    itemId,
  );
  if (bankQuestionId === null) return;

  const signal = await ctx.db
    .query("assessmentQuestionFlagSignals")
    .withIndex("by_definition_id_and_bank_question_id", (q) =>
      q
        .eq("definitionId", attempt.definitionId)
        .eq("bankQuestionId", bankQuestionId),
    )
    .unique();

  if (becameFlagged) {
    if (signal === null) {
      await ctx.db.insert("assessmentQuestionFlagSignals", {
        definitionId: attempt.definitionId,
        latestVersionId: attempt.versionId,
        bankQuestionId,
        activeFlagCount: 1,
        totalFlagEvents: 1,
        lastFlaggedAt: now,
        reviewStatus: "open",
      });
      return;
    }
    await ctx.db.patch("assessmentQuestionFlagSignals", signal._id, {
      latestVersionId: attempt.versionId,
      activeFlagCount: signal.activeFlagCount + 1,
      totalFlagEvents: signal.totalFlagEvents + 1,
      lastFlaggedAt: now,
      reviewStatus: "open",
      reviewedBy: undefined,
      reviewedAt: undefined,
    });
    return;
  }

  if (signal !== null && signal.activeFlagCount > 0) {
    await ctx.db.patch("assessmentQuestionFlagSignals", signal._id, {
      activeFlagCount: signal.activeFlagCount - 1,
    });
  }
}
