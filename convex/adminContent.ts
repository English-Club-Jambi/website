import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import { contentKindValidator } from "./validators";

const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const localePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const MAX_CONTENT_ENTRIES_PER_PAGE = 200;

const contentWorkspaceItemValidator = v.object({
  _id: v.id("siteContentEntries"),
  pageKey: v.string(),
  locale: v.string(),
  contentKey: v.string(),
  label: v.string(),
  kind: contentKindValidator,
  draftValue: v.string(),
  draftRevision: v.number(),
  publishedVersionId: v.optional(v.id("siteContentVersions")),
  updatedAt: v.number(),
});

function cleanLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function validateContentInput(input: {
  pageKey: string;
  locale: string;
  contentKey: string;
  label: string;
  kind: "plain-text" | "markdown";
  value: string;
}) {
  if (
    !keyPattern.test(input.pageKey) ||
    input.pageKey.length > 64 ||
    !keyPattern.test(input.contentKey) ||
    input.contentKey.length > 96 ||
    !localePattern.test(input.locale) ||
    input.locale.length > 8 ||
    input.label.length < 2 ||
    input.label.length > 120 ||
    input.value.trim().length === 0 ||
    input.value.length > (input.kind === "markdown" ? 50_000 : 5_000)
  ) {
    throw new Error("Content input is invalid.");
  }
}

function toWorkspaceItem(entry: Doc<"siteContentEntries">) {
  return {
    _id: entry._id,
    pageKey: entry.pageKey,
    locale: entry.locale,
    contentKey: entry.contentKey,
    label: entry.label,
    kind: entry.kind,
    draftValue: entry.draftValue,
    draftRevision: entry.draftRevision,
    ...(entry.publishedVersionId === undefined
      ? {}
      : { publishedVersionId: entry.publishedVersionId }),
    updatedAt: entry.updatedAt,
  };
}

export const getPageWorkspace = query({
  args: { pageKey: v.string(), locale: v.string() },
  returns: v.array(contentWorkspaceItemValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "content:read");
    if (
      !keyPattern.test(args.pageKey) ||
      !localePattern.test(args.locale) ||
      args.pageKey.length > 64 ||
      args.locale.length > 8
    ) {
      throw new Error("Content page key is invalid.");
    }
    const rows = await ctx.db
      .query("siteContentEntries")
      .withIndex("by_page_key_and_locale_and_content_key", (q) =>
        q.eq("pageKey", args.pageKey).eq("locale", args.locale),
      )
      .take(MAX_CONTENT_ENTRIES_PER_PAGE + 1);
    if (rows.length > MAX_CONTENT_ENTRIES_PER_PAGE) {
      throw new Error("Content page exceeds the supported entry limit.");
    }
    return rows.map(toWorkspaceItem);
  },
});

export const saveDraft = mutation({
  args: {
    pageKey: v.string(),
    locale: v.string(),
    contentKey: v.string(),
    label: v.string(),
    kind: contentKindValidator,
    value: v.string(),
    expectedRevision: v.number(),
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      entryId: v.id("siteContentEntries"),
      revision: v.number(),
    }),
    v.object({
      ok: v.literal(false),
      code: v.literal("conflict"),
      currentRevision: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "content:edit");
    const label = cleanLine(args.label);
    validateContentInput({ ...args, label });
    if (!Number.isInteger(args.expectedRevision) || args.expectedRevision < 0) {
      throw new Error("Expected revision is invalid.");
    }

    const existing = await ctx.db
      .query("siteContentEntries")
      .withIndex("by_page_key_and_locale_and_content_key", (q) =>
        q
          .eq("pageKey", args.pageKey)
          .eq("locale", args.locale)
          .eq("contentKey", args.contentKey),
      )
      .unique();
    const currentRevision = existing?.draftRevision ?? 0;
    if (currentRevision !== args.expectedRevision) {
      return { ok: false, code: "conflict", currentRevision } as const;
    }
    if (existing === null) {
      const pageEntries = await ctx.db
        .query("siteContentEntries")
        .withIndex("by_page_key_and_locale_and_content_key", (q) =>
          q.eq("pageKey", args.pageKey).eq("locale", args.locale),
        )
        .take(MAX_CONTENT_ENTRIES_PER_PAGE);
      if (pageEntries.length >= MAX_CONTENT_ENTRIES_PER_PAGE) {
        throw new Error("Content page has reached its entry limit.");
      }
    }

    const now = Date.now();
    const nextRevision = currentRevision + 1;
    const entryId =
      existing === null
        ? await ctx.db.insert("siteContentEntries", {
            pageKey: args.pageKey,
            locale: args.locale,
            contentKey: args.contentKey,
            label,
            kind: args.kind,
            draftValue: args.value.trim(),
            draftRevision: nextRevision,
            createdBy: actor._id,
            updatedBy: actor._id,
            createdAt: now,
            updatedAt: now,
          })
        : existing._id;
    if (existing !== null) {
      await ctx.db.patch("siteContentEntries", existing._id, {
        label,
        kind: args.kind,
        draftValue: args.value.trim(),
        draftRevision: nextRevision,
        updatedBy: actor._id,
        updatedAt: now,
      });
    }
    await writeAuditEvent(ctx, {
      area: "content",
      action: existing === null ? "create" : "update",
      resourceType: "content-entry",
      resourceId: entryId,
      summary: `${args.pageKey}.${args.contentKey} draft saved`,
      actorId: actor._id,
    });
    return { ok: true, entryId, revision: nextRevision } as const;
  },
});

export const publish = mutation({
  args: {
    entryId: v.id("siteContentEntries"),
    expectedRevision: v.number(),
  },
  returns: v.object({
    versionId: v.id("siteContentVersions"),
    revision: v.number(),
    publishedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "content:publish");
    const entry = await ctx.db.get("siteContentEntries", args.entryId);
    if (entry === null) {
      throw new Error("Content entry was not found.");
    }
    if (
      !Number.isInteger(args.expectedRevision) ||
      entry.draftRevision !== args.expectedRevision
    ) {
      throw new Error("Content draft changed before publication.");
    }
    const currentPublished =
      entry.publishedVersionId === undefined
        ? null
        : await ctx.db.get(
            "siteContentVersions",
            entry.publishedVersionId,
          );
    if (
      currentPublished !== null &&
      currentPublished.entryId === entry._id &&
      currentPublished.revision >= entry.draftRevision
    ) {
      throw new Error("This content revision is already published.");
    }
    const now = Date.now();
    const versionId = await ctx.db.insert("siteContentVersions", {
      entryId: entry._id,
      revision: entry.draftRevision,
      value: entry.draftValue,
      publishedBy: actor._id,
      publishedAt: now,
    });
    await ctx.db.patch("siteContentEntries", entry._id, {
      publishedVersionId: versionId,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "content",
      action: "publish",
      resourceType: "content-entry",
      resourceId: entry._id,
      summary: `${entry.pageKey}.${entry.contentKey} published`,
      actorId: actor._id,
    });
    return { versionId, revision: entry.draftRevision, publishedAt: now };
  },
});
