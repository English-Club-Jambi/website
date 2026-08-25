import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import {
  programCategoryValidator,
  programDeliveryStateValidator,
  programStatusValidator,
} from "./validators";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const httpsSourcePattern = /^https:\/\/[a-z0-9.-]+(?:[/:?#][^\s]*)?$/i;

const programSummaryValidator = v.object({
  _id: v.id("programs"),
  slug: v.string(),
  title: v.string(),
  summary: v.string(),
  category: programCategoryValidator,
  deliveryState: programDeliveryStateValidator,
  status: programStatusValidator,
  featured: v.boolean(),
  sortOrder: v.number(),
  publishedAt: v.optional(v.number()),
  updatedAt: v.number(),
  hasWorkingCopy: v.boolean(),
});

const programRevisionValidator = v.object({
  _id: v.id("programRevisions"),
  revision: v.number(),
  slug: v.string(),
  title: v.string(),
  summary: v.string(),
  body: v.string(),
  category: programCategoryValidator,
  deliveryState: programDeliveryStateValidator,
  audience: v.string(),
  dateLabel: v.optional(v.string()),
  startsAt: v.optional(v.number()),
  locationLabel: v.optional(v.string()),
  communityBenefit: v.string(),
  sourceLabel: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  featured: v.boolean(),
  sortOrder: v.number(),
  createdAt: v.number(),
});

const workspaceValidator = v.object({
  program: programSummaryValidator,
  workingCopy: v.union(v.null(), programRevisionValidator),
  publishedVersion: v.union(v.null(), programRevisionValidator),
});

function cleanLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanParagraph(value: string) {
  return value.trim().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
}

function optionalLine(value: string | undefined) {
  const cleaned = value === undefined ? "" : cleanLine(value);
  return cleaned.length === 0 ? undefined : cleaned;
}

function validateProgram(input: {
  slug: string;
  title: string;
  summary: string;
  body: string;
  deliveryState: "completed" | "ongoing" | "planned";
  audience: string;
  dateLabel?: string;
  startsAt?: number;
  locationLabel?: string;
  communityBenefit: string;
  sourceLabel?: string;
  sourceUrl?: string;
  sortOrder: number;
}) {
  if (
    !slugPattern.test(input.slug) ||
    input.slug.length < 3 ||
    input.slug.length > 96 ||
    input.title.length < 5 ||
    input.title.length > 140 ||
    input.summary.length < 30 ||
    input.summary.length > 320 ||
    input.body.length < 80 ||
    input.body.length > 2_400 ||
    input.audience.length < 3 ||
    input.audience.length > 180 ||
    input.communityBenefit.length < 20 ||
    input.communityBenefit.length > 360 ||
    (input.dateLabel !== undefined && input.dateLabel.length > 80) ||
    (input.locationLabel !== undefined && input.locationLabel.length > 180) ||
    !Number.isInteger(input.sortOrder) ||
    input.sortOrder < 0 ||
    input.sortOrder > 999
  ) {
    throw new Error("Programme content is invalid.");
  }
  if (
    input.startsAt !== undefined &&
    (!Number.isInteger(input.startsAt) ||
      input.startsAt < Date.UTC(2000, 0, 1) ||
      input.startsAt > Date.UTC(2100, 0, 1))
  ) {
    throw new Error("Programme date is invalid.");
  }
  if ((input.sourceLabel === undefined) !== (input.sourceUrl === undefined)) {
    throw new Error("A source needs both a label and an HTTPS address.");
  }
  if (
    input.sourceUrl !== undefined &&
    (!httpsSourcePattern.test(input.sourceUrl) || input.sourceUrl.length > 500)
  ) {
    throw new Error("Programme source must use a valid HTTPS address.");
  }
  if (input.sourceLabel !== undefined && input.sourceLabel.length > 120) {
    throw new Error("Programme source label is too long.");
  }
  if (
    input.deliveryState === "completed" &&
    (input.startsAt === undefined ||
      input.dateLabel === undefined ||
      input.sourceUrl === undefined)
  ) {
    throw new Error("A documented record needs a date and an official source.");
  }
}

function toSummary(program: Doc<"programs">) {
  return {
    _id: program._id,
    slug: program.slug,
    title: program.title,
    summary: program.summary,
    category: program.category,
    deliveryState: program.deliveryState,
    status: program.status,
    featured: program.featured,
    sortOrder: program.sortOrder,
    ...(program.publishedAt === undefined
      ? {}
      : { publishedAt: program.publishedAt }),
    updatedAt: program.updatedAt,
    hasWorkingCopy: program.draftRevisionId !== undefined,
  };
}

function toRevision(revision: Doc<"programRevisions">) {
  return {
    _id: revision._id,
    revision: revision.revision,
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
    createdAt: revision.createdAt,
  };
}

export const listPage = query({
  args: {
    status: v.optional(programStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(programSummaryValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "programs:read");
    if (args.paginationOpts.numItems !== 20) {
      throw new Error("Programme admin page size is invalid.");
    }
    const result =
      args.status === undefined
        ? await ctx.db
            .query("programs")
            .withIndex("by_updated_at")
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("programs")
            .withIndex("by_status_and_updated_at", (q) =>
              q.eq("status", args.status!),
            )
            .order("desc")
            .paginate(args.paginationOpts);
    return { ...result, page: result.page.map(toSummary) };
  },
});

export const getWorkspace = query({
  args: { programId: v.id("programs") },
  returns: v.union(v.null(), workspaceValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "programs:read");
    const program = await ctx.db.get("programs", args.programId);
    if (program === null) return null;
    const [workingCopy, publishedVersion] = await Promise.all([
      program.draftRevisionId === undefined
        ? null
        : ctx.db.get("programRevisions", program.draftRevisionId),
      program.publishedRevisionId === undefined
        ? null
        : ctx.db.get("programRevisions", program.publishedRevisionId),
    ]);
    return {
      program: toSummary(program),
      workingCopy:
        workingCopy === null || workingCopy.programId !== program._id
          ? null
          : toRevision(workingCopy),
      publishedVersion:
        publishedVersion === null || publishedVersion.programId !== program._id
          ? null
          : toRevision(publishedVersion),
    };
  },
});

export const saveWorkingCopy = mutation({
  args: {
    programId: v.optional(v.id("programs")),
    expectedDraftRevision: v.number(),
    slug: v.string(),
    title: v.string(),
    summary: v.string(),
    body: v.string(),
    category: programCategoryValidator,
    deliveryState: programDeliveryStateValidator,
    audience: v.string(),
    dateLabel: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    locationLabel: v.optional(v.string()),
    communityBenefit: v.string(),
    sourceLabel: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    featured: v.boolean(),
    sortOrder: v.number(),
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      programId: v.id("programs"),
      revision: v.number(),
    }),
    v.object({
      ok: v.literal(false),
      code: v.literal("conflict"),
      currentDraftRevision: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "programs:edit");
    if (
      !Number.isInteger(args.expectedDraftRevision) ||
      args.expectedDraftRevision < 0
    ) {
      throw new Error("Expected programme revision is invalid.");
    }
    const input = {
      slug: cleanLine(args.slug).toLowerCase(),
      title: cleanLine(args.title),
      summary: cleanLine(args.summary),
      body: cleanParagraph(args.body),
      category: args.category,
      deliveryState: args.deliveryState,
      audience: cleanLine(args.audience),
      dateLabel: optionalLine(args.dateLabel),
      startsAt: args.startsAt,
      locationLabel: optionalLine(args.locationLabel),
      communityBenefit: cleanLine(args.communityBenefit),
      sourceLabel: optionalLine(args.sourceLabel),
      sourceUrl: optionalLine(args.sourceUrl),
      featured: args.featured,
      sortOrder: args.sortOrder,
    };
    validateProgram(input);

    const program =
      args.programId === undefined
        ? null
        : await ctx.db.get("programs", args.programId);
    if (args.programId !== undefined && program === null) {
      throw new Error("Programme record was not found.");
    }
    const currentWorkingCopy =
      program?.draftRevisionId === undefined
        ? null
        : await ctx.db.get("programRevisions", program.draftRevisionId);
    const currentDraftRevision = currentWorkingCopy?.revision ?? 0;
    if (currentDraftRevision !== args.expectedDraftRevision) {
      return {
        ok: false,
        code: "conflict",
        currentDraftRevision,
      } as const;
    }
    const slugOwner = await ctx.db
      .query("programs")
      .withIndex("by_slug", (q) => q.eq("slug", input.slug))
      .unique();
    if (slugOwner !== null && slugOwner._id !== program?._id) {
      throw new Error("Programme address is already in use.");
    }

    const now = Date.now();
    const revisionNumber = program?.nextRevision ?? 1;
    const programId =
      program?._id ??
      (await ctx.db.insert("programs", {
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        category: input.category,
        deliveryState: input.deliveryState,
        status: "draft",
        featured: input.featured,
        sortOrder: input.sortOrder,
        nextRevision: 1,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      }));
    const revisionId = await ctx.db.insert("programRevisions", {
      programId,
      revision: revisionNumber,
      ...input,
      createdBy: actor._id,
      createdAt: now,
    });
    await ctx.db.patch("programs", programId, {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      category: input.category,
      deliveryState: input.deliveryState,
      featured: input.featured,
      sortOrder: input.sortOrder,
      draftRevisionId: revisionId,
      nextRevision: revisionNumber + 1,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "programs",
      action: program === null ? "create" : "update",
      resourceType: "program",
      resourceId: programId,
      summary: `${input.title} working copy saved`,
      actorId: actor._id,
    });
    return { ok: true, programId, revision: revisionNumber } as const;
  },
});

export const publish = mutation({
  args: {
    programId: v.id("programs"),
    expectedRevision: v.number(),
  },
  returns: v.object({ revision: v.number(), publishedAt: v.number() }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "programs:publish");
    const program = await ctx.db.get("programs", args.programId);
    if (program === null || program.draftRevisionId === undefined) {
      throw new Error("There are no unpublished programme changes.");
    }
    const revision = await ctx.db.get(
      "programRevisions",
      program.draftRevisionId,
    );
    if (
      revision === null ||
      revision.programId !== program._id ||
      revision.revision !== args.expectedRevision
    ) {
      throw new Error("The programme working copy changed before publication.");
    }
    validateProgram(revision);
    const now = Date.now();
    await ctx.db.patch("programs", program._id, {
      slug: revision.slug,
      title: revision.title,
      summary: revision.summary,
      category: revision.category,
      deliveryState: revision.deliveryState,
      featured: revision.featured,
      sortOrder: revision.sortOrder,
      status: "published",
      publishedRevisionId: revision._id,
      draftRevisionId: undefined,
      publishedAt: now,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "programs",
      action: "publish",
      resourceType: "program",
      resourceId: program._id,
      summary: `${revision.title} published`,
      actorId: actor._id,
    });
    return { revision: revision.revision, publishedAt: now };
  },
});

export const archive = mutation({
  args: { programId: v.id("programs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "programs:publish");
    const program = await ctx.db.get("programs", args.programId);
    if (program === null) throw new Error("Programme record was not found.");
    if (program.status === "archived") {
      throw new Error("Programme record is already archived.");
    }
    const previousStatus = program.status;
    const now = Date.now();
    await ctx.db.patch("programs", program._id, {
      status: "archived",
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "programs",
      action: "archive",
      resourceType: "program",
      resourceId: program._id,
      summary: `${program.title} archived from ${previousStatus}`,
      actorId: actor._id,
    });
    return null;
  },
});

export const restore = mutation({
  args: { programId: v.id("programs") },
  returns: v.object({ status: v.union(v.literal("draft"), v.literal("published")) }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "programs:publish");
    const program = await ctx.db.get("programs", args.programId);
    if (program === null) throw new Error("Programme record was not found.");
    if (program.status !== "archived") {
      throw new Error("Only archived programme records can be restored.");
    }
    const publishedRevision =
      program.publishedRevisionId === undefined
        ? null
        : await ctx.db.get("programRevisions", program.publishedRevisionId);
    const status =
      publishedRevision !== null &&
      publishedRevision.programId === program._id &&
      program.publishedAt !== undefined
        ? ("published" as const)
        : ("draft" as const);
    const now = Date.now();
    await ctx.db.patch("programs", program._id, {
      status,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "programs",
      action: "restore",
      resourceType: "program",
      resourceId: program._id,
      summary: `${program.title} restored to ${status}`,
      actorId: actor._id,
    });
    return { status };
  },
});
