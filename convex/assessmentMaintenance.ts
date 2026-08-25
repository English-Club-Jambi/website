import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { finalizeSectionAndMaybeSubmit } from "./lib/assessmentEngine";

export const finalizeSection = internalMutation({
  args: {
    attemptId: v.id("assessmentAttempts"),
    sectionId: v.id("assessmentSections"),
    expectedDeadlineAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get("assessmentAttempts", args.attemptId);
    if (
      attempt === null ||
      attempt.status !== "in-progress" ||
      attempt.currentResultId !== undefined
    ) {
      return null;
    }
    const progress = await ctx.db
      .query("assessmentAttemptSections")
      .withIndex("by_attempt_id_and_section_id", (q) =>
        q.eq("attemptId", attempt._id).eq("sectionId", args.sectionId),
      )
      .unique();
    if (
      progress === null ||
      progress.status !== "in-progress" ||
      progress.deadlineAt !== args.expectedDeadlineAt ||
      Date.now() < args.expectedDeadlineAt
    ) {
      return null;
    }
    await finalizeSectionAndMaybeSubmit(ctx, attempt, progress, Date.now());
    return null;
  },
});
