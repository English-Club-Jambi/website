import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { query } from "./_generated/server";
import { requireOwnedAttempt } from "./lib/assessmentAuth";
import {
  projectReviewItem,
  reviewItemValidator,
} from "./lib/assessmentReview";
import { isRandomBankSection } from "./lib/assessmentQuestionBank";

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
    const section = await ctx.db.get("assessmentSections", progress.sectionId);
    if (section === null || section.versionId !== attempt.versionId) {
      throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
    }
    if (isRandomBankSection(section)) {
      const result = await ctx.db
        .query("assessmentAttemptItems")
        .withIndex("by_attempt_id_and_section_id_and_order", (q) =>
          q.eq("attemptId", attempt._id).eq("sectionId", section._id),
        )
        .paginate({ ...args.paginationOpts, maximumRowsRead: 20 });
      const page = [];
      for (const selection of result.page) {
        const item = await ctx.db.get("assessmentItems", selection.itemId);
        if (item === null) {
          throw new ConvexError({ code: "QUESTION_BANK_SOURCE_MISSING" as const });
        }
        page.push(await projectReviewItem(ctx, attempt, section, item));
      }
      return { ...result, page };
    }

    const result = await ctx.db
      .query("assessmentItems")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", progress.sectionId),
      )
      .paginate({ ...args.paginationOpts, maximumRowsRead: 20 });
    const page = [];
    for (const item of result.page) {
      page.push(await projectReviewItem(ctx, attempt, section, item));
    }
    return { ...result, page };
  },
});
