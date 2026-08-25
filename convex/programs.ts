import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { publicProgramValidator } from "./validators";

function toPublicProgram(
  program: Doc<"programs">,
  revision: Doc<"programRevisions">,
) {
  if (program.publishedAt === undefined) return null;
  return {
    slug: revision.slug,
    title: revision.title,
    summary: revision.summary,
    body: revision.body,
    category: revision.category,
    deliveryState: revision.deliveryState,
    audience: revision.audience,
    ...(revision.dateLabel === undefined ? {} : { dateLabel: revision.dateLabel }),
    ...(revision.startsAt === undefined ? {} : { startsAt: revision.startsAt }),
    ...(revision.locationLabel === undefined
      ? {}
      : { locationLabel: revision.locationLabel }),
    communityBenefit: revision.communityBenefit,
    ...(revision.sourceLabel === undefined
      ? {}
      : { sourceLabel: revision.sourceLabel }),
    ...(revision.sourceUrl === undefined ? {} : { sourceUrl: revision.sourceUrl }),
    featured: revision.featured,
    sortOrder: revision.sortOrder,
    publishedAt: program.publishedAt,
    updatedAt: program.updatedAt,
  };
}

export const listPublished = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(publicProgramValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(24, Math.max(1, Math.floor(args.limit ?? 24)));
    const rows = await ctx.db
      .query("programs")
      .withIndex("by_status_and_sort_order", (q) => q.eq("status", "published"))
      .order("asc")
      .take(limit);
    const projected = await Promise.all(
      rows.map(async (program) => {
        if (program.publishedRevisionId === undefined) return null;
        const revision = await ctx.db.get(
          "programRevisions",
          program.publishedRevisionId,
        );
        if (revision === null || revision.programId !== program._id) return null;
        return toPublicProgram(program, revision);
      }),
    );
    return projected.flatMap((program) => (program === null ? [] : [program]));
  },
});
