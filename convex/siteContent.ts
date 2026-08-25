import { v } from "convex/values";

import { query } from "./_generated/server";
import { contentKindValidator } from "./validators";

const publishedContentValidator = v.object({
  contentKey: v.string(),
  kind: contentKindValidator,
  value: v.string(),
  revision: v.number(),
  publishedAt: v.number(),
});

const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const localePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const MAX_CONTENT_ENTRIES_PER_PAGE = 200;

export const getPublishedPage = query({
  args: { pageKey: v.string(), locale: v.string() },
  returns: v.array(publishedContentValidator),
  handler: async (ctx, args) => {
    if (
      !keyPattern.test(args.pageKey) ||
      !localePattern.test(args.locale) ||
      args.pageKey.length > 64 ||
      args.locale.length > 8
    ) {
      return [];
    }

    const entries = await ctx.db
      .query("siteContentEntries")
      .withIndex("by_page_key_and_locale_and_content_key", (q) =>
        q.eq("pageKey", args.pageKey).eq("locale", args.locale),
      )
      .take(MAX_CONTENT_ENTRIES_PER_PAGE + 1);
    if (entries.length > MAX_CONTENT_ENTRIES_PER_PAGE) {
      throw new Error("Content page exceeds the supported entry limit.");
    }
    const published = await Promise.all(
      entries.map(async (entry) => {
        if (entry.publishedVersionId === undefined) {
          return null;
        }
        const version = await ctx.db.get(
          "siteContentVersions",
          entry.publishedVersionId,
        );
        if (version === null || version.entryId !== entry._id) {
          return null;
        }
        return {
          contentKey: entry.contentKey,
          kind: entry.kind,
          value: version.value,
          revision: version.revision,
          publishedAt: version.publishedAt,
        };
      }),
    );
    return published.flatMap((entry) => (entry === null ? [] : [entry]));
  },
});
