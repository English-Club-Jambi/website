import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import {
  assessmentCatalogCardValidator,
  assessmentKindValidator,
  assessmentSkillValidator,
  listeningModeValidator,
  reviewPolicyValidator,
  scorePolicyValidator,
  timePolicyValidator,
  timingModeValidator,
} from "./assessmentValidators";
import type { Doc } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { normalizeSlug } from "./lib/assessmentModel";

const publishedEntryValidator = v.object({
  definitionId: v.id("assessmentDefinitions"),
  versionId: v.id("assessmentVersions"),
  slug: v.string(),
  kind: assessmentKindValidator,
  title: v.string(),
  summary: v.string(),
  instructions: v.string(),
  locale: v.string(),
  skills: v.array(assessmentSkillValidator),
  timePolicy: timePolicyValidator,
  approximateMinutes: v.union(v.number(), v.null()),
  reviewPolicy: reviewPolicyValidator,
  scorePolicy: scorePolicyValidator,
  defaultTimingMode: timingModeValidator,
  defaultListeningMode: listeningModeValidator,
});

async function projectPublished(
  ctx: QueryCtx,
  definition: Doc<"assessmentDefinitions">,
) {
  if (
    definition.publishedVersionId === undefined ||
    definition.visibility !== "published"
  ) {
    return null;
  }
  const version = await ctx.db.get(
    "assessmentVersions",
    definition.publishedVersionId,
  );
  if (
    version === null ||
    version.definitionId !== definition._id ||
    version.status !== "published"
  ) {
    return null;
  }
  const sections = await ctx.db
    .query("assessmentSections")
    .withIndex("by_version_id_and_order", (q) =>
      q.eq("versionId", version._id),
    )
    .take(9);
  if (sections.length === 0 || sections.length > 8) return null;
  const approximateSeconds =
    version.timePolicy === "untimed"
      ? null
      : version.timePolicy === "whole-assessment"
        ? (version.totalTimeLimitSeconds ?? null)
        : sections.reduce(
            (total, section) => total + (section.timeLimitSeconds ?? 0),
            0,
          );
  return {
    version,
    sections,
    approximateMinutes:
      approximateSeconds === null ? null : Math.ceil(approximateSeconds / 60),
  };
}

export const listPublished = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(assessmentCatalogCardValidator),
  handler: async (ctx, args) => {
    if (
      args.paginationOpts.numItems !== 12 ||
      (args.paginationOpts.maximumRowsRead !== undefined &&
        args.paginationOpts.maximumRowsRead > 12)
    ) {
      throw new Error("Assessment catalog page size is invalid.");
    }
    const result = await ctx.db
      .query("assessmentDefinitions")
      .withIndex("by_visibility_and_updated_at", (q) =>
        q.eq("visibility", "published"),
      )
      .order("desc")
      .paginate({ ...args.paginationOpts, maximumRowsRead: 12 });
    const page = [];
    for (const definition of result.page) {
      if (definition.kind === "club-program-quiz") continue;
      const projected = await projectPublished(ctx, definition);
      if (projected === null) continue;
      page.push({
        slug: definition.slug,
        kind: definition.kind,
        title: projected.version.title,
        summary: projected.version.summary,
        skills: projected.sections.map((section) => section.skill),
        timePolicy: projected.version.timePolicy,
        approximateMinutes: projected.approximateMinutes,
        resultLabel:
          projected.version.scorePolicy === "raw-objective"
            ? ("Practice result" as const)
            : ("Feedback only" as const),
      });
    }
    return { ...result, page };
  },
});

export const getPublishedBySlug = query({
  args: { slug: v.string() },
  returns: v.union(publishedEntryValidator, v.null()),
  handler: async (ctx, args) => {
    let slug: string;
    try {
      slug = normalizeSlug(args.slug);
    } catch {
      return null;
    }
    const definition = await ctx.db
      .query("assessmentDefinitions")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (definition === null || definition.kind === "club-program-quiz") {
      return null;
    }
    const projected = await projectPublished(ctx, definition);
    if (projected === null) return null;
    return {
      definitionId: definition._id,
      versionId: projected.version._id,
      slug: definition.slug,
      kind: definition.kind,
      title: projected.version.title,
      summary: projected.version.summary,
      instructions: projected.version.instructions,
      locale: projected.version.locale,
      skills: projected.sections.map((section) => section.skill),
      timePolicy: projected.version.timePolicy,
      approximateMinutes: projected.approximateMinutes,
      reviewPolicy: projected.version.reviewPolicy,
      scorePolicy: projected.version.scorePolicy,
      defaultTimingMode: projected.version.defaultTimingMode,
      defaultListeningMode: projected.version.defaultListeningMode,
    };
  },
});
