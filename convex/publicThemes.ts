import { v } from "convex/values";

import { query } from "./_generated/server";
import { publicThemeSnapshotValidator } from "./validators";

export const getPublished = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      name: v.string(),
      publicRevision: v.number(),
      contractVersion: v.literal(1),
      snapshot: publicThemeSnapshotValidator,
    }),
  ),
  handler: async (ctx) => {
    const state = await ctx.db
      .query("publicThemeState")
      .withIndex("by_site_key", (q) => q.eq("siteKey", "public"))
      .unique();
    if (state === null) {
      return null;
    }
    const version = await ctx.db.get(
      "publicThemeVersions",
      state.publishedVersionId,
    );
    if (version === null || version.siteKey !== "public") {
      return null;
    }
    return {
      name: version.name,
      publicRevision: state.publicRevision,
      contractVersion: 1 as const,
      snapshot: version.snapshot,
    };
  },
});
