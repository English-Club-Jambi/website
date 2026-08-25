import {
  deriveThemeSnapshot,
  normalizeThemeRecipe,
  validateThemeRecipe,
  type ThemeValidationResult,
} from "../content/theme-contract";
import {
  DEFAULT_PUBLIC_THEME_RECIPE,
  isPublicThemePresetKey,
} from "../content/theme-presets";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import {
  publicThemeSnapshotValidator,
  themeEventActionValidator,
  themeRecipeValidator,
  themeSourceValidator,
} from "./validators";

const validationIssueValidator = v.object({
  severity: v.union(v.literal("blocking"), v.literal("warning")),
  code: v.union(
    v.literal("invalid-value"),
    v.literal("contrast"),
    v.literal("surface-separation"),
    v.literal("accent-separation"),
  ),
  mode: v.optional(v.union(v.literal("light"), v.literal("dark"))),
  path: v.string(),
  message: v.string(),
  ratio: v.optional(v.number()),
  minimum: v.optional(v.number()),
});

const validationViewValidator = v.object({
  ok: v.boolean(),
  blocking: v.array(validationIssueValidator),
  warnings: v.array(validationIssueValidator),
});

const draftViewValidator = v.object({
  _id: v.id("publicThemeDrafts"),
  name: v.string(),
  source: themeSourceValidator,
  presetKey: v.optional(v.string()),
  recipe: themeRecipeValidator,
  basedOnVersionId: v.optional(v.id("publicThemeVersions")),
  revision: v.number(),
  updatedAt: v.number(),
});

const versionViewValidator = v.object({
  _id: v.id("publicThemeVersions"),
  version: v.number(),
  name: v.string(),
  source: themeSourceValidator,
  presetKey: v.optional(v.string()),
  recipe: themeRecipeValidator,
  snapshot: publicThemeSnapshotValidator,
  publishedAt: v.number(),
  note: v.optional(v.string()),
});

const eventViewValidator = v.object({
  _id: v.id("publicThemeEvents"),
  action: themeEventActionValidator,
  fromVersionId: v.optional(v.id("publicThemeVersions")),
  toVersionId: v.id("publicThemeVersions"),
  actorId: v.id("adminUsers"),
  note: v.optional(v.string()),
  createdAt: v.number(),
});

const presetViewValidator = v.object({
  presetKey: v.string(),
  name: v.string(),
  description: v.string(),
  recipe: themeRecipeValidator,
  updatedAt: v.number(),
});

function cleanLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function validateNameAndNote(name: string, note: string | undefined) {
  if (
    name.length < 3 ||
    name.length > 80 ||
    (note !== undefined && (note.length < 3 || note.length > 400))
  ) {
    throw new Error("Theme name or note is invalid.");
  }
}

function toValidationView(result: ThemeValidationResult) {
  return {
    ok: result.ok,
    blocking: result.blocking,
    warnings: result.warnings,
  };
}

function toDraftView(draft: Doc<"publicThemeDrafts">) {
  return {
    _id: draft._id,
    name: draft.name,
    source: draft.source,
    ...(draft.presetKey === undefined ? {} : { presetKey: draft.presetKey }),
    recipe: draft.recipe,
    ...(draft.basedOnVersionId === undefined
      ? {}
      : { basedOnVersionId: draft.basedOnVersionId }),
    revision: draft.revision,
    updatedAt: draft.updatedAt,
  };
}

function toVersionView(version: Doc<"publicThemeVersions">) {
  return {
    _id: version._id,
    version: version.version,
    name: version.name,
    source: version.source,
    ...(version.presetKey === undefined
      ? {}
      : { presetKey: version.presetKey }),
    recipe: version.recipe,
    snapshot: version.snapshot,
    publishedAt: version.publishedAt,
    ...(version.note === undefined ? {} : { note: version.note }),
  };
}

function toEventView(event: Doc<"publicThemeEvents">) {
  return {
    _id: event._id,
    action: event.action,
    ...(event.fromVersionId === undefined
      ? {}
      : { fromVersionId: event.fromVersionId }),
    toVersionId: event.toVersionId,
    actorId: event.actorId,
    ...(event.note === undefined ? {} : { note: event.note }),
    createdAt: event.createdAt,
  };
}

export const ensureDraft = mutation({
  args: {},
  returns: draftViewValidator,
  handler: async (ctx) => {
    const actor = await requireAdmin(ctx, "theme:edit");
    const existing = await ctx.db
      .query("publicThemeDrafts")
      .withIndex("by_site_key", (q) => q.eq("siteKey", "public"))
      .unique();
    if (existing !== null) {
      return toDraftView(existing);
    }

    const state = await ctx.db
      .query("publicThemeState")
      .withIndex("by_site_key", (q) => q.eq("siteKey", "public"))
      .unique();
    const current =
      state === null
        ? null
        : await ctx.db.get("publicThemeVersions", state.publishedVersionId);
    const now = Date.now();
    const draftId = await ctx.db.insert("publicThemeDrafts", {
      siteKey: "public",
      name: current?.name ?? "Relay cobalt",
      source: current?.source ?? "preset",
      ...(current === null
        ? { presetKey: "relay-cobalt-v1" }
        : current.presetKey === undefined
          ? {}
          : { presetKey: current.presetKey }),
      recipe: current?.recipe ?? DEFAULT_PUBLIC_THEME_RECIPE,
      ...(current === null ? {} : { basedOnVersionId: current._id }),
      revision: 1,
      updatedBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
    const draft = await ctx.db.get("publicThemeDrafts", draftId);
    if (draft === null) {
      throw new Error("Theme draft could not be created.");
    }
    return toDraftView(draft);
  },
});

export const getWorkspace = query({
  args: {},
  returns: v.object({
    draft: v.union(v.null(), draftViewValidator),
    published: v.union(v.null(), versionViewValidator),
    publicRevision: v.number(),
    validation: v.union(v.null(), validationViewValidator),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx, "theme:read");
    const [draft, state] = await Promise.all([
      ctx.db
        .query("publicThemeDrafts")
        .withIndex("by_site_key", (q) => q.eq("siteKey", "public"))
        .unique(),
      ctx.db
        .query("publicThemeState")
        .withIndex("by_site_key", (q) => q.eq("siteKey", "public"))
        .unique(),
    ]);
    const published =
      state === null
        ? null
        : await ctx.db.get("publicThemeVersions", state.publishedVersionId);
    return {
      draft: draft === null ? null : toDraftView(draft),
      published: published === null ? null : toVersionView(published),
      publicRevision: state?.publicRevision ?? 0,
      validation:
        draft === null
          ? null
          : toValidationView(validateThemeRecipe(draft.recipe)),
    };
  },
});

export const listPresets = query({
  args: {},
  returns: v.array(presetViewValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx, "theme:read");
    const rows = await ctx.db
      .query("publicThemePresets")
      .withIndex("by_site_key_and_preset_key", (q) =>
        q.eq("siteKey", "public"),
      )
      .take(13);
    if (rows.length > 12) {
      throw new Error("Theme preset catalogue is too large.");
    }
    return rows.map((row) => ({
      presetKey: row.presetKey,
      name: row.name,
      description: row.description,
      recipe: row.recipe,
      updatedAt: row.updatedAt,
    }));
  },
});

export const saveDraft = mutation({
  args: {
    draftId: v.id("publicThemeDrafts"),
    expectedRevision: v.number(),
    name: v.string(),
    source: themeSourceValidator,
    presetKey: v.optional(v.union(v.string(), v.null())),
    recipe: themeRecipeValidator,
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      revision: v.number(),
      validation: validationViewValidator,
    }),
    v.object({
      ok: v.literal(false),
      code: v.literal("conflict"),
      currentRevision: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "theme:edit");
    const draft = await ctx.db.get("publicThemeDrafts", args.draftId);
    if (draft === null || draft.siteKey !== "public") {
      throw new Error("Theme draft was not found.");
    }
    if (draft.revision !== args.expectedRevision) {
      return {
        ok: false,
        code: "conflict",
        currentRevision: draft.revision,
      } as const;
    }
    const name = cleanLine(args.name);
    validateNameAndNote(name, undefined);
    const recipe = normalizeThemeRecipe(args.recipe);
    const validation = validateThemeRecipe(recipe);
    if (
      args.source === "preset" &&
      (args.presetKey === null ||
        args.presetKey === undefined ||
        !isPublicThemePresetKey(args.presetKey))
    ) {
      throw new Error("Theme preset is invalid.");
    }
    const revision = draft.revision + 1;
    await ctx.db.patch("publicThemeDrafts", draft._id, {
      name,
      source: args.source,
      presetKey:
        args.source === "preset" && args.presetKey !== null
          ? args.presetKey
          : undefined,
      recipe,
      revision,
      updatedBy: actor._id,
      updatedAt: Date.now(),
    });
    await writeAuditEvent(ctx, {
      area: "theme",
      action: "update",
      resourceType: "theme-draft",
      resourceId: draft._id,
      summary: `${name} draft saved`,
      actorId: actor._id,
    });
    return {
      ok: true,
      revision,
      validation: toValidationView(validation),
    } as const;
  },
});

export const publishDraft = mutation({
  args: {
    draftId: v.id("publicThemeDrafts"),
    expectedRevision: v.number(),
    expectedPublishedVersionId: v.union(
      v.id("publicThemeVersions"),
      v.null(),
    ),
    note: v.optional(v.string()),
  },
  returns: v.object({
    versionId: v.id("publicThemeVersions"),
    version: v.number(),
    publicRevision: v.number(),
    publishedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "theme:publish");
    const draft = await ctx.db.get("publicThemeDrafts", args.draftId);
    if (
      draft === null ||
      draft.siteKey !== "public" ||
      draft.revision !== args.expectedRevision
    ) {
      throw new Error("Theme draft changed before publication.");
    }
    const state = await ctx.db
      .query("publicThemeState")
      .withIndex("by_site_key", (q) => q.eq("siteKey", "public"))
      .unique();
    if ((state?.publishedVersionId ?? null) !== args.expectedPublishedVersionId) {
      throw new Error("Published theme changed before publication.");
    }
    const note = args.note === undefined ? undefined : cleanLine(args.note);
    validateNameAndNote(draft.name, note);
    const validation = validateThemeRecipe(draft.recipe);
    if (
      draft.source === "preset" &&
      (draft.presetKey === undefined ||
        !isPublicThemePresetKey(draft.presetKey))
    ) {
      throw new Error("Theme preset is invalid.");
    }
    if (!validation.ok || validation.normalized === undefined) {
      throw new Error("Theme has blocking accessibility issues.");
    }
    const recipe = validation.normalized;
    const snapshot = deriveThemeSnapshot(recipe);
    const version = state?.nextVersion ?? 1;
    const publicRevision = (state?.publicRevision ?? 0) + 1;
    const now = Date.now();
    const versionId = await ctx.db.insert("publicThemeVersions", {
      siteKey: "public",
      version,
      name: draft.name,
      source: draft.source,
      ...(draft.presetKey === undefined ? {} : { presetKey: draft.presetKey }),
      recipe,
      snapshot,
      contractVersion: 1,
      publishedBy: actor._id,
      publishedAt: now,
      ...(note === undefined ? {} : { note }),
    });
    if (state === null) {
      await ctx.db.insert("publicThemeState", {
        siteKey: "public",
        publishedVersionId: versionId,
        nextVersion: version + 1,
        publicRevision,
        updatedBy: actor._id,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch("publicThemeState", state._id, {
        previousVersionId: state.publishedVersionId,
        publishedVersionId: versionId,
        nextVersion: version + 1,
        publicRevision,
        updatedBy: actor._id,
        updatedAt: now,
      });
    }
    await ctx.db.insert("publicThemeEvents", {
      siteKey: "public",
      action: "publish",
      ...(state === null ? {} : { fromVersionId: state.publishedVersionId }),
      toVersionId: versionId,
      actorId: actor._id,
      ...(note === undefined ? {} : { note }),
      createdAt: now,
    });
    await ctx.db.patch("publicThemeDrafts", draft._id, {
      basedOnVersionId: versionId,
      revision: draft.revision + 1,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "theme",
      action: "publish",
      resourceType: "theme-version",
      resourceId: versionId,
      summary: `${draft.name} v${version} published`,
      actorId: actor._id,
    });
    return { versionId, version, publicRevision, publishedAt: now };
  },
});

export const rollback = mutation({
  args: {
    targetVersionId: v.id("publicThemeVersions"),
    expectedPublishedVersionId: v.id("publicThemeVersions"),
    note: v.optional(v.string()),
  },
  returns: v.object({
    version: v.number(),
    publicRevision: v.number(),
  }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "theme:publish");
    const [target, state] = await Promise.all([
      ctx.db.get("publicThemeVersions", args.targetVersionId),
      ctx.db
        .query("publicThemeState")
        .withIndex("by_site_key", (q) => q.eq("siteKey", "public"))
        .unique(),
    ]);
    if (
      target === null ||
      target.siteKey !== "public" ||
      target.contractVersion !== 1 ||
      state === null ||
      state.publishedVersionId !== args.expectedPublishedVersionId
    ) {
      throw new Error("Theme rollback target or pointer is invalid.");
    }
    if (state.publishedVersionId === target._id) {
      throw new Error("The requested theme version is already published.");
    }
    const note = args.note === undefined ? undefined : cleanLine(args.note);
    validateNameAndNote(target.name, note);
    const publicRevision = state.publicRevision + 1;
    const now = Date.now();
    await ctx.db.patch("publicThemeState", state._id, {
      previousVersionId: state.publishedVersionId,
      publishedVersionId: target._id,
      publicRevision,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await ctx.db.insert("publicThemeEvents", {
      siteKey: "public",
      action: "rollback",
      fromVersionId: state.publishedVersionId,
      toVersionId: target._id,
      actorId: actor._id,
      ...(note === undefined ? {} : { note }),
      createdAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "theme",
      action: "restore",
      resourceType: "theme-version",
      resourceId: target._id,
      summary: `${target.name} v${target.version} restored`,
      actorId: actor._id,
    });
    return { version: target.version, publicRevision };
  },
});

export const listVersions = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(versionViewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "theme:read");
    const limit = Math.min(30, Math.max(1, Math.floor(args.limit ?? 20)));
    const rows = await ctx.db
      .query("publicThemeVersions")
      .withIndex("by_site_key_and_published_at", (q) =>
        q.eq("siteKey", "public"),
      )
      .order("desc")
      .take(limit);
    return rows.map(toVersionView);
  },
});

export const listEvents = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(eventViewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "theme:read");
    const limit = Math.min(50, Math.max(1, Math.floor(args.limit ?? 30)));
    const rows = await ctx.db
      .query("publicThemeEvents")
      .withIndex("by_site_key_and_created_at", (q) =>
        q.eq("siteKey", "public"),
      )
      .order("desc")
      .take(limit);
    return rows.map(toEventView);
  },
});
