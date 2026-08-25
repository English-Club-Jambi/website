import { seedPosts } from "../content/seed-posts";

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const run = internalMutation({
  args: {},
  returns: v.object({
    inserted: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    let inserted = 0;
    let skipped = 0;

    for (const post of seedPosts) {
      const existing = await ctx.db
        .query("posts")
        .withIndex("by_slug", (q) => q.eq("slug", post.slug))
        .unique();

      if (existing !== null) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("posts", post);
      inserted += 1;
    }

    return { inserted, skipped };
  },
});
