import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import {
  assessmentKindValidator,
  assessmentProfileValidator,
  assessmentReviewDecisionValidator,
  assessmentReviewTypeValidator,
  assessmentSkillValidator,
  assessmentVersionStatusValidator,
  assessmentVisibilityValidator,
  audioReplayPolicyValidator,
  listeningModeValidator,
  reviewPolicyValidator,
  scorePolicyValidator,
  stimulusKindValidator,
  timePolicyValidator,
  timingModeValidator,
} from "./assessmentValidators";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { env, mutation, query } from "./_generated/server";
import {
  bumpAssessmentRevision,
  getMutableAssessmentVersion,
} from "./lib/assessmentAdmin";
import {
  isRandomBankSection,
  listEligibleBankQuestionsForSection,
} from "./lib/assessmentQuestionBank";
import {
  normalizeBoundedText,
  normalizeKey,
  normalizeSlug,
  requireIntegerInRange,
} from "./lib/assessmentModel";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import { publicAssessmentR2UrlForMedia } from "./lib/media";

const definitionSummaryValidator = v.object({
  definitionId: v.id("assessmentDefinitions"),
  slug: v.string(),
  kind: assessmentKindValidator,
  profile: assessmentProfileValidator,
  adminTitle: v.string(),
  visibility: assessmentVisibilityValidator,
  draftVersionId: v.union(v.id("assessmentVersions"), v.null()),
  draftStatus: v.union(assessmentVersionStatusValidator, v.null()),
  publishedVersionId: v.union(v.id("assessmentVersions"), v.null()),
  updatedAt: v.number(),
});

const versionWorkspaceValidator = v.object({
  versionId: v.id("assessmentVersions"),
  version: v.union(v.number(), v.null()),
  status: assessmentVersionStatusValidator,
  title: v.string(),
  summary: v.string(),
  instructions: v.string(),
  locale: v.string(),
  timePolicy: timePolicyValidator,
  allowResume: v.boolean(),
  reviewPolicy: reviewPolicyValidator,
  scorePolicy: scorePolicyValidator,
  defaultTimingMode: timingModeValidator,
  defaultListeningMode: listeningModeValidator,
  maxAttemptsPerDay: v.number(),
  contentRevision: v.number(),
  validatedRevision: v.union(v.number(), v.null()),
  publishedAt: v.union(v.number(), v.null()),
});

const sectionWorkspaceValidator = v.object({
  sectionId: v.id("assessmentSections"),
  sectionKey: v.string(),
  skill: assessmentSkillValidator,
  order: v.number(),
  title: v.string(),
  instructions: v.string(),
  timeLimitSeconds: v.union(v.number(), v.null()),
  audioReplayPolicy: v.union(audioReplayPolicyValidator, v.null()),
  itemCount: v.number(),
});

const workspaceValidator = v.object({
  definition: definitionSummaryValidator,
  draft: v.union(versionWorkspaceValidator, v.null()),
  published: v.union(versionWorkspaceValidator, v.null()),
  sections: v.array(sectionWorkspaceValidator),
  latestCheck: v.union(
    v.object({
      contentRevision: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("passed"),
        v.literal("failed"),
      ),
      blockingCount: v.number(),
      warningCount: v.number(),
      reportJson: v.string(),
      finishedAt: v.union(v.number(), v.null()),
    }),
    v.null(),
  ),
  latestApprovals: v.array(
    v.object({
      reviewType: assessmentReviewTypeValidator,
      contentRevision: v.number(),
      decision: assessmentReviewDecisionValidator,
      note: v.string(),
      reviewerId: v.id("adminUsers"),
      reviewerName: v.string(),
      createdAt: v.number(),
    }),
  ),
  publishReadiness: v.object({
    ready: v.boolean(),
    contentRevision: v.union(v.number(), v.null()),
    blockers: v.array(v.string()),
  }),
});

const revisionConflictValidator = v.object({
  ok: v.literal(false),
  code: v.literal("conflict"),
  currentRevision: v.number(),
});

const revisionSuccessValidator = v.object({
  ok: v.literal(true),
  contentRevision: v.number(),
});

function projectVersion(version: Doc<"assessmentVersions">) {
  return {
    versionId: version._id,
    version: version.version ?? null,
    status: version.status,
    title: version.title,
    summary: version.summary,
    instructions: version.instructions,
    locale: version.locale,
    timePolicy: version.timePolicy,
    allowResume: version.allowResume,
    reviewPolicy: version.reviewPolicy,
    scorePolicy: version.scorePolicy,
    defaultTimingMode: version.defaultTimingMode,
    defaultListeningMode: version.defaultListeningMode,
    maxAttemptsPerDay: version.maxAttemptsPerDay,
    contentRevision: version.contentRevision,
    validatedRevision: version.validatedRevision ?? null,
    publishedAt: version.publishedAt ?? null,
  };
}

async function projectDefinition(
  ctx: Parameters<typeof requireAdmin>[0],
  definition: Doc<"assessmentDefinitions">,
) {
  const draft =
    definition.draftVersionId === undefined
      ? null
      : await ctx.db.get("assessmentVersions", definition.draftVersionId);
  return {
    definitionId: definition._id,
    slug: definition.slug,
    kind: definition.kind,
    profile: definition.profile,
    adminTitle: definition.adminTitle,
    visibility: definition.visibility,
    draftVersionId: definition.draftVersionId ?? null,
    draftStatus: draft?.status ?? null,
    publishedVersionId: definition.publishedVersionId ?? null,
    updatedAt: definition.updatedAt,
  };
}

function validateVersionMetadata(args: {
  title: string;
  summary: string;
  instructions: string;
  locale: string;
  timePolicy: Doc<"assessmentVersions">["timePolicy"];
  reviewPolicy: Doc<"assessmentVersions">["reviewPolicy"];
  scorePolicy: Doc<"assessmentVersions">["scorePolicy"];
  defaultTimingMode: Doc<"assessmentVersions">["defaultTimingMode"];
  defaultListeningMode: Doc<"assessmentVersions">["defaultListeningMode"];
  maxAttemptsPerDay: number;
  allowResume: boolean;
}) {
  if (
    args.locale !== "en" ||
    args.timePolicy === "whole-assessment" ||
    args.reviewPolicy !== "after-submit" ||
    args.allowResume !== true
  ) {
    throw new ConvexError({ code: "UNSUPPORTED_ASSESSMENT_CONTRACT" as const });
  }
  if (
    args.scorePolicy !== "raw-objective" &&
    args.scorePolicy !== "practice-estimate-v1" &&
    args.scorePolicy !== "paper-estimate-v1"
  ) {
    throw new ConvexError({ code: "UNSUPPORTED_ASSESSMENT_CONTRACT" as const });
  }
  return {
    title: normalizeBoundedText(args.title, "title", 5, 180),
    summary: normalizeBoundedText(args.summary, "summary", 20, 500),
    instructions: normalizeBoundedText(
      args.instructions,
      "instructions",
      20,
      4_000,
    ),
    locale: "en",
    timePolicy: args.timePolicy,
    reviewPolicy: args.reviewPolicy,
    scorePolicy: args.scorePolicy,
    defaultTimingMode: args.defaultTimingMode,
    defaultListeningMode: args.defaultListeningMode,
    maxAttemptsPerDay: requireIntegerInRange(
      args.maxAttemptsPerDay,
      1,
      20,
      "maxAttemptsPerDay",
    ),
  };
}

function profileSupportsScorePolicy(
  profile: Doc<"assessmentDefinitions">["profile"],
  scorePolicy: Doc<"assessmentVersions">["scorePolicy"],
) {
  return (
    (profile === "ec-itp-level-1-aligned-v1" &&
      (scorePolicy === "raw-objective" || scorePolicy === "paper-estimate-v1")) ||
    (profile === "ec-ibt-style-2026-v1" &&
      scorePolicy === "practice-estimate-v1")
  );
}

export const listPage = query({
  args: {
    visibility: assessmentVisibilityValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(definitionSummaryValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "assessment:read");
    if (
      args.paginationOpts.numItems !== 20 ||
      (args.paginationOpts.maximumRowsRead !== undefined &&
        args.paginationOpts.maximumRowsRead > 20)
    ) {
      throw new Error("Assessment admin page size is invalid.");
    }
    const result = await ctx.db
      .query("assessmentDefinitions")
      .withIndex("by_visibility_and_updated_at", (q) =>
        q.eq("visibility", args.visibility),
      )
      .order("desc")
      .paginate({ ...args.paginationOpts, maximumRowsRead: 20 });
    const page = [];
    for (const definition of result.page) {
      if (definition.internalOnly === true) continue;
      page.push(await projectDefinition(ctx, definition));
    }
    return { ...result, page };
  },
});

export const getWorkspace = query({
  args: { definitionId: v.id("assessmentDefinitions") },
  returns: v.union(workspaceValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "assessment:read");
    const definition = await ctx.db.get(
      "assessmentDefinitions",
      args.definitionId,
    );
    if (definition === null) return null;
    const draft =
      definition.draftVersionId === undefined
        ? null
        : await ctx.db.get("assessmentVersions", definition.draftVersionId);
    const published =
      definition.publishedVersionId === undefined
        ? null
        : await ctx.db.get(
            "assessmentVersions",
            definition.publishedVersionId,
          );
    const sections =
      draft === null
        ? []
        : await ctx.db
            .query("assessmentSections")
            .withIndex("by_version_id_and_order", (q) =>
              q.eq("versionId", draft._id),
            )
            .take(9);
    if (sections.length > 8) {
      throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
    }
    const latestCheck =
      draft === null
        ? undefined
        : (
            await ctx.db
              .query("assessmentVersionChecks")
              .withIndex("by_version_id_and_content_revision", (q) =>
                q.eq("versionId", draft._id),
              )
              .order("desc")
              .take(1)
          )[0];
    const latestApprovals = [];
    if (draft !== null) {
      for (const reviewType of [
        "academic",
        "rights",
        "accessibility",
        "bias",
      ] as const) {
        const [approval] = await ctx.db
          .query("assessmentVersionApprovals")
          .withIndex("by_version_id_and_review_type_and_created_at", (q) =>
            q.eq("versionId", draft._id).eq("reviewType", reviewType),
          )
          .order("desc")
          .take(1);
        if (approval === undefined) continue;
        const reviewer = await ctx.db.get("adminUsers", approval.reviewerId);
        latestApprovals.push({
          reviewType: approval.reviewType,
          contentRevision: approval.contentRevision,
          decision: approval.decision,
          note: approval.note,
          reviewerId: approval.reviewerId,
          reviewerName: reviewer?.displayName ?? "Former administrator",
          createdAt: approval.createdAt,
        });
      }
    }
    const readinessBlockers: string[] = [];
    if (draft === null) {
      readinessBlockers.push("no-draft");
    } else {
      if (
        draft.status !== "ready" ||
        draft.validatedRevision !== draft.contentRevision ||
        latestCheck === undefined ||
        latestCheck.contentRevision !== draft.contentRevision ||
        latestCheck.status !== "passed" ||
        latestCheck.blockingCount !== 0
      ) {
        readinessBlockers.push("validation-current-passed");
      }
      if (
        draft.reviewPolicy !== "after-submit" ||
        draft.allowResume !== true ||
        draft.timePolicy === "whole-assessment"
      ) {
        readinessBlockers.push("runtime-policy-supported");
      }
      if (
        sections.some(
          (section) =>
            section.skill === "listening" &&
            section.audioReplayPolicy !== "unlimited",
        )
      ) {
        readinessBlockers.push("audio-replay-unlimited");
      }
      for (const reviewType of [
        "academic",
        "rights",
        "accessibility",
        "bias",
      ] as const) {
        const approval = latestApprovals.find(
          (candidate) => candidate.reviewType === reviewType,
        );
        if (
          approval === undefined ||
          approval.contentRevision !== draft.contentRevision ||
          approval.decision !== "approved"
        ) {
          readinessBlockers.push(`approval-${reviewType}-current`);
        }
      }
      const academic = latestApprovals.find(
        (approval) => approval.reviewType === "academic",
      );
      if (
        academic !== undefined &&
        academic.contentRevision === draft.contentRevision &&
        academic.decision === "approved"
      ) {
        const items = await ctx.db
          .query("assessmentItems")
          .withIndex("by_version_id_and_order", (q) =>
            q.eq("versionId", draft._id),
          )
          .take(201);
        if (
          items.length > 200 ||
          items.some((item) => item.authoredBy === academic.reviewerId)
        ) {
          readinessBlockers.push("academic-reviewer-independent");
        }
      }
    }
    return {
      definition: await projectDefinition(ctx, definition),
      draft: draft === null ? null : projectVersion(draft),
      published: published === null ? null : projectVersion(published),
      sections: sections.map((section) => ({
        sectionId: section._id,
        sectionKey: section.sectionKey,
        skill: section.skill,
        order: section.order,
        title: section.title,
        instructions: section.instructions,
        timeLimitSeconds: section.timeLimitSeconds ?? null,
        audioReplayPolicy: section.audioReplayPolicy ?? null,
        itemCount: section.itemCount,
      })),
      latestCheck:
        latestCheck === undefined
          ? null
          : {
              contentRevision: latestCheck.contentRevision,
              status: latestCheck.status,
              blockingCount: latestCheck.blockingCount,
              warningCount: latestCheck.warningCount,
              reportJson: latestCheck.reportJson,
              finishedAt: latestCheck.finishedAt ?? null,
            },
      latestApprovals,
      publishReadiness: {
        ready: readinessBlockers.length === 0,
        contentRevision: draft?.contentRevision ?? null,
        blockers: readinessBlockers,
      },
    };
  },
});

export const create = mutation({
  args: {
    slug: v.string(),
    kind: assessmentKindValidator,
    profile: assessmentProfileValidator,
    adminTitle: v.string(),
    title: v.string(),
    summary: v.string(),
    instructions: v.string(),
    locale: v.string(),
    timePolicy: timePolicyValidator,
    allowResume: v.boolean(),
    reviewPolicy: reviewPolicyValidator,
    scorePolicy: scorePolicyValidator,
    defaultTimingMode: timingModeValidator,
    defaultListeningMode: listeningModeValidator,
    maxAttemptsPerDay: v.number(),
  },
  returns: v.object({
    definitionId: v.id("assessmentDefinitions"),
    versionId: v.id("assessmentVersions"),
    contentRevision: v.number(),
  }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    if (env.PRACTICE_FORMAT_CREATION_MODE !== "internal-maintenance") {
      throw new ConvexError({
        code: "PRACTICE_FORMAT_CATALOG_FIXED" as const,
      });
    }
    if (
      args.kind === "club-program-quiz" ||
      (args.profile !== "ec-itp-level-1-aligned-v1" &&
        args.profile !== "ec-ibt-style-2026-v1") ||
      !profileSupportsScorePolicy(args.profile, args.scorePolicy) ||
      (args.kind === "full-practice" && args.timePolicy !== "per-section")
    ) {
      throw new ConvexError({ code: "UNSUPPORTED_ASSESSMENT_CONTRACT" as const });
    }
    const slug = normalizeSlug(args.slug);
    const existing = await ctx.db
      .query("assessmentDefinitions")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing !== null) {
      throw new ConvexError({ code: "SLUG_ALREADY_EXISTS" as const });
    }
    const metadata = validateVersionMetadata(args);
    const now = Date.now();
    const definitionId = await ctx.db.insert("assessmentDefinitions", {
      slug,
      kind: args.kind,
      profile: args.profile,
      adminTitle: normalizeBoundedText(
        args.adminTitle,
        "adminTitle",
        5,
        180,
      ),
      nextVersion: 1,
      visibility: "draft",
      createdBy: actor._id,
      updatedBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
    const versionId = await ctx.db.insert("assessmentVersions", {
      definitionId,
      status: "draft",
      ...metadata,
      allowResume: args.allowResume,
      contentRevision: 1,
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("assessmentDefinitions", definitionId, {
      draftVersionId: versionId,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "create",
      resourceType: "assessment-definition",
      resourceId: definitionId,
      summary: `${slug} draft created`,
      actorId: actor._id,
    });
    return { definitionId, versionId, contentRevision: 1 };
  },
});

export const updateMetadata = mutation({
  args: {
    versionId: v.id("assessmentVersions"),
    expectedContentRevision: v.number(),
    title: v.string(),
    summary: v.string(),
    instructions: v.string(),
    locale: v.string(),
    timePolicy: timePolicyValidator,
    allowResume: v.boolean(),
    reviewPolicy: reviewPolicyValidator,
    scorePolicy: scorePolicyValidator,
    defaultTimingMode: timingModeValidator,
    defaultListeningMode: listeningModeValidator,
    maxAttemptsPerDay: v.number(),
  },
  returns: v.union(revisionSuccessValidator, revisionConflictValidator),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      args.versionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: version.contentRevision,
      };
    }
    if (
      !profileSupportsScorePolicy(definition.profile, args.scorePolicy) ||
      (definition.kind === "full-practice" &&
        args.timePolicy !== "per-section")
    ) {
      throw new ConvexError({ code: "UNSUPPORTED_ASSESSMENT_CONTRACT" as const });
    }
    const metadata = validateVersionMetadata(args);
    const now = Date.now();
    await ctx.db.patch("assessmentVersions", version._id, {
      ...metadata,
      allowResume: args.allowResume,
    });
    const contentRevision = await bumpAssessmentRevision(
      ctx,
      version._id,
      version.contentRevision,
      now,
    );
    await ctx.db.patch("assessmentDefinitions", definition._id, {
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "update",
      resourceType: "assessment-version",
      resourceId: version._id,
      summary: `${definition.slug} metadata updated`,
      actorId: actor._id,
    });
    return { ok: true as const, contentRevision };
  },
});

export const saveSection = mutation({
  args: {
    sectionId: v.optional(v.id("assessmentSections")),
    versionId: v.id("assessmentVersions"),
    expectedContentRevision: v.number(),
    sectionKey: v.string(),
    skill: assessmentSkillValidator,
    order: v.number(),
    title: v.string(),
    instructions: v.string(),
    timeLimitSeconds: v.optional(v.number()),
    audioReplayPolicy: v.optional(audioReplayPolicyValidator),
  },
  returns: v.union(
    revisionConflictValidator,
    v.object({
      ok: v.literal(true),
      sectionId: v.id("assessmentSections"),
      contentRevision: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      args.versionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: version.contentRevision,
      };
    }
    const order = requireIntegerInRange(args.order, 0, 7, "order");
    const sectionKey = normalizeKey(args.sectionKey, "sectionKey");
    const timeLimitSeconds =
      version.timePolicy === "untimed"
        ? undefined
        : requireIntegerInRange(
            args.timeLimitSeconds ?? 0,
            60,
            7_200,
            "timeLimitSeconds",
          );
    if (
      (args.skill === "listening" && args.audioReplayPolicy === undefined) ||
      (args.skill === "listening" &&
        args.audioReplayPolicy !== "unlimited") ||
      (args.skill !== "listening" && args.audioReplayPolicy !== undefined)
    ) {
      throw new ConvexError({ code: "INVALID_SECTION_CONTRACT" as const });
    }
    const orderCollision = await ctx.db
      .query("assessmentSections")
      .withIndex("by_version_id_and_order", (q) =>
        q.eq("versionId", version._id).eq("order", order),
      )
      .unique();
    const keyCollision = await ctx.db
      .query("assessmentSections")
      .withIndex("by_version_id_and_section_key", (q) =>
        q.eq("versionId", version._id).eq("sectionKey", sectionKey),
      )
      .unique();
    if (
      (orderCollision !== null && orderCollision._id !== args.sectionId) ||
      (keyCollision !== null && keyCollision._id !== args.sectionId)
    ) {
      throw new ConvexError({ code: "SECTION_KEY_OR_ORDER_EXISTS" as const });
    }
    const existing =
      args.sectionId === undefined
        ? null
        : await ctx.db.get("assessmentSections", args.sectionId);
    if (args.sectionId !== undefined && existing === null) {
      throw new ConvexError({ code: "SECTION_NOT_FOUND" as const });
    }
    if (
      existing !== null &&
      (existing.versionId !== version._id || existing.itemCount > 0 && existing.skill !== args.skill)
    ) {
      throw new ConvexError({ code: "SECTION_RELATIONSHIP_INVALID" as const });
    }
    const values = {
      versionId: version._id,
      sectionKey,
      skill: args.skill,
      order,
      title: normalizeBoundedText(args.title, "title", 2, 180),
      instructions: normalizeBoundedText(
        args.instructions,
        "instructions",
        10,
        4_000,
      ),
      timeLimitSeconds,
      audioReplayPolicy: args.audioReplayPolicy,
      itemCount: existing?.itemCount ?? 0,
      deliveryMode: existing?.deliveryMode,
      bankProfile: existing?.bankProfile,
      bankSelectionContract: existing?.bankSelectionContract,
      bankSeedBatch: existing?.bankSeedBatch,
    };
    const sectionId =
      existing === null
        ? await ctx.db.insert("assessmentSections", values)
        : (await ctx.db.replace("assessmentSections", existing._id, values),
          existing._id);
    const now = Date.now();
    const contentRevision = await bumpAssessmentRevision(
      ctx,
      version._id,
      version.contentRevision,
      now,
    );
    await ctx.db.patch("assessmentDefinitions", definition._id, {
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: existing === null ? "create" : "update",
      resourceType: "assessment-section",
      resourceId: sectionId,
      summary: `${definition.slug} section ${sectionKey} saved`,
      actorId: actor._id,
    });
    return { ok: true as const, sectionId, contentRevision };
  },
});

export const saveStimulus = mutation({
  args: {
    stimulusId: v.optional(v.id("assessmentStimuli")),
    versionId: v.id("assessmentVersions"),
    sectionId: v.id("assessmentSections"),
    expectedContentRevision: v.number(),
    stimulusKey: v.string(),
    kind: stimulusKindValidator,
    order: v.number(),
    title: v.union(v.string(), v.null()),
    body: v.union(v.string(), v.null()),
    mediaId: v.union(v.id("mediaAssets"), v.null()),
    transcript: v.union(v.string(), v.null()),
    alt: v.union(v.string(), v.null()),
    provenanceJson: v.string(),
  },
  returns: v.union(
    revisionConflictValidator,
    v.object({
      ok: v.literal(true),
      stimulusId: v.id("assessmentStimuli"),
      contentRevision: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      args.versionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: version.contentRevision,
      };
    }
    const section = await ctx.db.get("assessmentSections", args.sectionId);
    if (section === null || section.versionId !== version._id) {
      throw new ConvexError({ code: "SECTION_RELATIONSHIP_INVALID" as const });
    }
    const stimulusKey = normalizeKey(args.stimulusKey, "stimulusKey");
    const order = requireIntegerInRange(args.order, 0, 199, "order");
    const keyCollision = await ctx.db
      .query("assessmentStimuli")
      .withIndex("by_version_id_and_stimulus_key", (q) =>
        q.eq("versionId", version._id).eq("stimulusKey", stimulusKey),
      )
      .unique();
    const orderCollision = await ctx.db
      .query("assessmentStimuli")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", section._id).eq("order", order),
      )
      .unique();
    if (
      (keyCollision !== null && keyCollision._id !== args.stimulusId) ||
      (orderCollision !== null && orderCollision._id !== args.stimulusId)
    ) {
      throw new ConvexError({ code: "STIMULUS_KEY_OR_ORDER_EXISTS" as const });
    }
    const existing =
      args.stimulusId === undefined
        ? null
        : await ctx.db.get("assessmentStimuli", args.stimulusId);
    if (args.stimulusId !== undefined && existing === null) {
      throw new ConvexError({ code: "STIMULUS_NOT_FOUND" as const });
    }
    if (
      existing !== null &&
      (existing.versionId !== version._id || existing.sectionId !== section._id)
    ) {
      throw new ConvexError({ code: "STIMULUS_RELATIONSHIP_INVALID" as const });
    }
    if (existing === null) {
      const versionStimuli = await ctx.db
        .query("assessmentStimuli")
        .withIndex("by_version_id_and_stimulus_key", (q) =>
          q.eq("versionId", version._id),
        )
        .take(200);
      if (versionStimuli.length >= 200) {
        throw new ConvexError({ code: "ASSESSMENT_STIMULUS_LIMIT" as const });
      }
    }
    let media: Doc<"mediaAssets"> | null = null;
    if (args.kind !== "reading" && args.mediaId === null) {
      throw new ConvexError({ code: "MEDIA_RELATIONSHIP_INVALID" as const });
    }
    if (args.mediaId !== null) {
      media = await ctx.db.get("mediaAssets", args.mediaId);
      if (
        media === null ||
        args.kind === "reading" ||
        publicAssessmentR2UrlForMedia(media, version._id, args.kind) === null
      ) {
        throw new ConvexError({ code: "MEDIA_RELATIONSHIP_INVALID" as const });
      }
    }
    const provenanceJson = normalizeBoundedText(
      args.provenanceJson,
      "provenanceJson",
      2,
      20_000,
    );
    try {
      JSON.parse(provenanceJson);
    } catch {
      throw new ConvexError({ code: "INVALID_PROVENANCE" as const });
    }
    const now = Date.now();
    const values = {
      versionId: version._id,
      sectionId: section._id,
      stimulusKey,
      kind: args.kind,
      order,
      title:
        args.title === null
          ? undefined
          : normalizeBoundedText(args.title, "title", 2, 180),
      body:
        args.body === null
          ? undefined
          : normalizeBoundedText(args.body, "body", 1, 50_000),
      mediaId: media?._id,
      transcript:
        args.transcript === null
          ? undefined
          : normalizeBoundedText(args.transcript, "transcript", 1, 50_000),
      alt:
        args.alt === null
          ? undefined
          : normalizeBoundedText(args.alt, "alt", 1, 500),
      provenanceJson,
      authoredBy: existing?.authoredBy ?? actor._id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const stimulusId =
      existing === null
        ? await ctx.db.insert("assessmentStimuli", values)
        : (await ctx.db.replace("assessmentStimuli", existing._id, values),
          existing._id);
    const contentRevision = await bumpAssessmentRevision(
      ctx,
      version._id,
      version.contentRevision,
      now,
    );
    await ctx.db.patch("assessmentDefinitions", definition._id, {
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: existing === null ? "create" : "update",
      resourceType: "assessment-stimulus",
      resourceId: stimulusId,
      summary: `${definition.slug} stimulus ${stimulusKey} saved`,
      actorId: actor._id,
    });
    return { ok: true as const, stimulusId, contentRevision };
  },
});

export const deleteStimulus = mutation({
  args: {
    stimulusId: v.id("assessmentStimuli"),
    expectedContentRevision: v.number(),
  },
  returns: v.union(revisionConflictValidator, revisionSuccessValidator),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const stimulus = await ctx.db.get("assessmentStimuli", args.stimulusId);
    if (stimulus === null) {
      throw new ConvexError({ code: "STIMULUS_NOT_FOUND" as const });
    }
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      stimulus.versionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: version.contentRevision,
      };
    }
    const sectionItems = await ctx.db
      .query("assessmentItems")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", stimulus.sectionId),
      )
      .take(51);
    if (sectionItems.length > 50) {
      throw new ConvexError({ code: "SECTION_ITEM_LIMIT" as const });
    }
    if (sectionItems.some((item) => item.stimulusId === stimulus._id)) {
      throw new ConvexError({ code: "STIMULUS_IN_USE" as const });
    }
    await ctx.db.delete("assessmentStimuli", stimulus._id);
    const siblings = await ctx.db
      .query("assessmentStimuli")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", stimulus.sectionId),
      )
      .take(201);
    if (siblings.length > 200) {
      throw new ConvexError({ code: "ASSESSMENT_STIMULUS_LIMIT" as const });
    }
    for (let order = 0; order < siblings.length; order += 1) {
      if (siblings[order].order !== order) {
        await ctx.db.patch("assessmentStimuli", siblings[order]._id, { order });
      }
    }
    const now = Date.now();
    const contentRevision = await bumpAssessmentRevision(
      ctx,
      version._id,
      version.contentRevision,
      now,
    );
    await ctx.db.patch("assessmentDefinitions", definition._id, {
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "archive",
      resourceType: "assessment-stimulus",
      resourceId: stimulus._id,
      summary: `${definition.slug} stimulus ${stimulus.stimulusKey} removed from draft`,
      actorId: actor._id,
    });
    return { ok: true as const, contentRevision };
  },
});

export const moveStimulus = mutation({
  args: {
    stimulusId: v.id("assessmentStimuli"),
    targetOrder: v.number(),
    expectedContentRevision: v.number(),
  },
  returns: v.union(revisionConflictValidator, revisionSuccessValidator),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const stimulus = await ctx.db.get("assessmentStimuli", args.stimulusId);
    if (stimulus === null) {
      throw new ConvexError({ code: "STIMULUS_NOT_FOUND" as const });
    }
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      stimulus.versionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: version.contentRevision,
      };
    }
    const siblings = await ctx.db
      .query("assessmentStimuli")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", stimulus.sectionId),
      )
      .take(201);
    if (siblings.length > 200) {
      throw new ConvexError({ code: "ASSESSMENT_STIMULUS_LIMIT" as const });
    }
    const targetOrder = requireIntegerInRange(
      args.targetOrder,
      0,
      siblings.length - 1,
      "targetOrder",
    );
    const reordered = siblings.filter((candidate) => candidate._id !== stimulus._id);
    reordered.splice(targetOrder, 0, stimulus);
    for (let order = 0; order < reordered.length; order += 1) {
      if (reordered[order].order !== order) {
        await ctx.db.patch("assessmentStimuli", reordered[order]._id, { order });
      }
    }
    const now = Date.now();
    const contentRevision = await bumpAssessmentRevision(
      ctx,
      version._id,
      version.contentRevision,
      now,
    );
    await ctx.db.patch("assessmentDefinitions", definition._id, {
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "update",
      resourceType: "assessment-stimulus-order",
      resourceId: stimulus._id,
      summary: `${definition.slug} stimulus order updated`,
      actorId: actor._id,
    });
    return { ok: true as const, contentRevision };
  },
});

export const deleteSection = mutation({
  args: {
    sectionId: v.id("assessmentSections"),
    expectedContentRevision: v.number(),
  },
  returns: v.union(revisionConflictValidator, revisionSuccessValidator),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const section = await ctx.db.get("assessmentSections", args.sectionId);
    if (section === null) {
      throw new ConvexError({ code: "SECTION_NOT_FOUND" as const });
    }
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      section.versionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: version.contentRevision,
      };
    }
    const [item, stimulus] = await Promise.all([
      ctx.db
        .query("assessmentItems")
        .withIndex("by_section_id_and_order", (q) =>
          q.eq("sectionId", section._id),
        )
        .first(),
      ctx.db
        .query("assessmentStimuli")
        .withIndex("by_section_id_and_order", (q) =>
          q.eq("sectionId", section._id),
        )
        .first(),
    ]);
    if (section.itemCount !== 0 || item !== null || stimulus !== null) {
      throw new ConvexError({ code: "SECTION_NOT_EMPTY" as const });
    }
    await ctx.db.delete("assessmentSections", section._id);
    const siblings = await ctx.db
      .query("assessmentSections")
      .withIndex("by_version_id_and_order", (q) =>
        q.eq("versionId", version._id),
      )
      .take(9);
    if (siblings.length > 8) {
      throw new ConvexError({ code: "ASSESSMENT_SECTION_LIMIT" as const });
    }
    for (let order = 0; order < siblings.length; order += 1) {
      if (siblings[order].order !== order) {
        await ctx.db.patch("assessmentSections", siblings[order]._id, { order });
      }
    }
    const now = Date.now();
    const contentRevision = await bumpAssessmentRevision(
      ctx,
      version._id,
      version.contentRevision,
      now,
    );
    await ctx.db.patch("assessmentDefinitions", definition._id, {
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "archive",
      resourceType: "assessment-section",
      resourceId: section._id,
      summary: `${definition.slug} section ${section.sectionKey} removed from draft`,
      actorId: actor._id,
    });
    return { ok: true as const, contentRevision };
  },
});

export const moveSection = mutation({
  args: {
    sectionId: v.id("assessmentSections"),
    targetOrder: v.number(),
    expectedContentRevision: v.number(),
  },
  returns: v.union(revisionConflictValidator, revisionSuccessValidator),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const section = await ctx.db.get("assessmentSections", args.sectionId);
    if (section === null) {
      throw new ConvexError({ code: "SECTION_NOT_FOUND" as const });
    }
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      section.versionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: version.contentRevision,
      };
    }
    const siblings = await ctx.db
      .query("assessmentSections")
      .withIndex("by_version_id_and_order", (q) =>
        q.eq("versionId", version._id),
      )
      .take(9);
    if (siblings.length > 8) {
      throw new ConvexError({ code: "ASSESSMENT_SECTION_LIMIT" as const });
    }
    const targetOrder = requireIntegerInRange(
      args.targetOrder,
      0,
      siblings.length - 1,
      "targetOrder",
    );
    const reordered = siblings.filter((candidate) => candidate._id !== section._id);
    reordered.splice(targetOrder, 0, section);
    for (let order = 0; order < reordered.length; order += 1) {
      if (reordered[order].order !== order) {
        await ctx.db.patch("assessmentSections", reordered[order]._id, { order });
      }
    }
    const now = Date.now();
    const contentRevision = await bumpAssessmentRevision(
      ctx,
      version._id,
      version.contentRevision,
      now,
    );
    await ctx.db.patch("assessmentDefinitions", definition._id, {
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "update",
      resourceType: "assessment-section-order",
      resourceId: section._id,
      summary: `${definition.slug} section order updated`,
      actorId: actor._id,
    });
    return { ok: true as const, contentRevision };
  },
});

function checksumFor(version: Doc<"assessmentVersions">, values: string[]) {
  let hash = 2_166_136_261;
  const input = `${version._id}:${version.contentRevision}:${values.join("|")}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export const validateDraft = mutation({
  args: {
    versionId: v.id("assessmentVersions"),
    expectedContentRevision: v.number(),
  },
  returns: v.union(
    revisionConflictValidator,
    v.object({
      ok: v.literal(true),
      status: v.union(v.literal("passed"), v.literal("failed")),
      blockingCount: v.number(),
      warningCount: v.number(),
      contentRevision: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      args.versionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: version.contentRevision,
      };
    }
    const sections = await ctx.db
      .query("assessmentSections")
      .withIndex("by_version_id_and_order", (q) => q.eq("versionId", version._id))
      .take(9);
    const items = await ctx.db
      .query("assessmentItems")
      .withIndex("by_version_id_and_order", (q) => q.eq("versionId", version._id))
      .take(201);
    const keys = await ctx.db
      .query("assessmentAnswerKeys")
      .withIndex("by_version_id_and_item_id", (q) => q.eq("versionId", version._id))
      .take(201);
    const stimuli = await ctx.db
      .query("assessmentStimuli")
      .withIndex("by_version_id_and_stimulus_key", (q) => q.eq("versionId", version._id))
      .take(201);
    const poolRules = await ctx.db
      .query("assessmentVersionQuestionRules")
      .withIndex("by_version_id_and_allowed_and_updated_at", (q) =>
        q.eq("versionId", version._id),
      )
      .take(201);
    const blocking: string[] = [];
    if (sections.length === 0 || sections.length > 8) blocking.push("section-count");
    if (items.length === 0 || items.length > 200) blocking.push("item-count");
    if (keys.length !== items.length || keys.length > 200) blocking.push("answer-key-count");
    if (stimuli.length > 200) blocking.push("stimulus-count");
    if (poolRules.length > 200) blocking.push("question-pool-rule-count");
    if (sections.some((section, index) => section.order !== index)) blocking.push("section-order");
    const sectionById = new Map(sections.map((section) => [section._id, section]));
    const itemCountBySection = new Map<Id<"assessmentSections">, number>();
    for (const item of items) {
      if (!sectionById.has(item.sectionId) || item.versionId !== version._id) {
        blocking.push(`item-relationship:${item.itemKey}`);
      }
      itemCountBySection.set(
        item.sectionId,
        (itemCountBySection.get(item.sectionId) ?? 0) + 1,
      );
      if (
        item.type === "multiple-select" &&
        (!Number.isInteger(item.selectionMin) ||
          !Number.isInteger(item.selectionMax) ||
          item.selectionMin < 1 ||
          item.selectionMin > item.selectionMax ||
          item.selectionMax > item.options.length)
      ) {
        blocking.push(`multiple-select-range:${item.itemKey}`);
      }
    }
    for (const section of sections) {
      if ((itemCountBySection.get(section._id) ?? 0) !== section.itemCount) {
        blocking.push(`section-item-count:${section.sectionKey}`);
      }
    }
    for (const section of sections) {
      if (
        definition.profile !== "ec-ibt-style-2026-v1" &&
        definition.profile !== "ec-itp-level-1-aligned-v1"
      ) continue;
      if (
        definition.profile === "ec-itp-level-1-aligned-v1" &&
        version.scorePolicy !== "paper-estimate-v1"
      ) continue;
      if (!isRandomBankSection(section)) {
        blocking.push("question-pool-delivery:" + section.sectionKey);
        continue;
      }
      try {
        const eligible = await listEligibleBankQuestionsForSection(ctx, section);
        if (eligible.length < section.itemCount) {
          blocking.push("question-pool-shortage:" + section.sectionKey);
        }
      } catch {
        blocking.push("question-pool-invalid:" + section.sectionKey);
      }
    }
    const keyedItems = new Set(keys.map((key) => key.itemId));
    if (keyedItems.size !== keys.length || items.some((item) => !keyedItems.has(item._id))) {
      blocking.push("answer-key-coverage");
    }
    if (definition.kind === "full-practice") {
      const ibtStyle = definition.profile === "ec-ibt-style-2026-v1";
      const exactSkills = ibtStyle
        ? (["reading", "listening", "writing", "speaking"] as const)
        : (["listening", "structure", "reading"] as const);
      const exactCounts = ibtStyle ? [50, 47, 12, 11] : [50, 40, 50];
      const exactTimes = ibtStyle
        ? [1_800, 1_740, 1_380, 480]
        : [2_100, 1_500, 3_300];
      const exactItemCount = ibtStyle ? 120 : 140;
      if (
        sections.length !== exactSkills.length ||
        sections.some(
          (section, index) =>
            section.skill !== exactSkills[index] ||
            section.itemCount !== exactCounts[index] ||
            section.timeLimitSeconds !== exactTimes[index],
        ) ||
        version.timePolicy !== "per-section" ||
        items.length !== exactItemCount
      ) {
        blocking.push("full-practice-blueprint");
      }
    } else if (
      definition.kind !== "skill-quiz" ||
      sections.length !== 1 ||
      items.length < 3 ||
      items.length > 12
    ) {
      blocking.push("skill-quiz-blueprint");
    }
    if (
      version.reviewPolicy !== "after-submit" ||
      version.allowResume !== true ||
      version.timePolicy === "whole-assessment"
    ) {
      blocking.push("unsupported-runtime-policy");
    }
    if (
      sections.some(
        (section) =>
          section.skill === "listening" &&
          section.audioReplayPolicy !== "unlimited",
      )
    ) {
      blocking.push("unsupported-audio-replay-policy");
    }
    for (const stimulus of stimuli) {
      if (!sectionById.has(stimulus.sectionId)) {
        blocking.push(`stimulus-relationship:${stimulus.stimulusKey}`);
      }
      if (stimulus.kind === "reading" && !stimulus.body) {
        blocking.push(`reading-body:${stimulus.stimulusKey}`);
      }
      if (stimulus.kind === "audio") {
        if (!stimulus.transcript || stimulus.mediaId === undefined) {
          blocking.push(`audio-accessibility:${stimulus.stimulusKey}`);
        } else {
          const media = await ctx.db.get("mediaAssets", stimulus.mediaId);
          if (
            publicAssessmentR2UrlForMedia(
              media,
              version._id,
              "audio",
            ) === null
          ) {
            blocking.push(`audio-delivery:${stimulus.stimulusKey}`);
          }
        }
      }
      if (stimulus.kind === "image" && !stimulus.alt) {
        blocking.push(`image-alt:${stimulus.stimulusKey}`);
      }
      if (stimulus.kind === "image") {
        const media =
          stimulus.mediaId === undefined
            ? null
            : await ctx.db.get("mediaAssets", stimulus.mediaId);
        if (
          publicAssessmentR2UrlForMedia(
            media,
            version._id,
            "image",
          ) === null
        ) {
          blocking.push(`image-delivery:${stimulus.stimulusKey}`);
        }
      }
    }
    const uniqueBlocking = [...new Set(blocking)].slice(0, 500);
    const status = uniqueBlocking.length === 0 ? ("passed" as const) : ("failed" as const);
    const reportJson = JSON.stringify({
      contractVersion: 1,
      profile: definition.profile,
      contentRevision: version.contentRevision,
      blocking: uniqueBlocking,
      warnings: [],
    });
    const now = Date.now();
    const existingCheck = await ctx.db
      .query("assessmentVersionChecks")
      .withIndex("by_version_id_and_content_revision", (q) =>
        q.eq("versionId", version._id).eq("contentRevision", version.contentRevision),
      )
      .unique();
    const checkValues = {
      versionId: version._id,
      contentRevision: version.contentRevision,
      status,
      blockingCount: uniqueBlocking.length,
      warningCount: 0,
      reportJson,
      startedBy: actor._id,
      startedAt: now,
      finishedAt: now,
    };
    if (existingCheck === null) {
      await ctx.db.insert("assessmentVersionChecks", checkValues);
    } else {
      await ctx.db.replace("assessmentVersionChecks", existingCheck._id, checkValues);
    }
    await ctx.db.patch("assessmentVersions", version._id, {
      status: status === "passed" ? "ready" : "draft",
      validatedRevision: status === "passed" ? version.contentRevision : undefined,
      contentChecksum:
        status === "passed"
          ? checksumFor(version, [
              ...sections.map((section) => section.sectionKey),
              ...items.map((item) => item.itemKey),
              ...poolRules
                .slice()
                .sort((left, right) =>
                  String(left.bankQuestionId).localeCompare(
                    String(right.bankQuestionId),
                  ),
                )
                .map(
                  (rule) =>
                    String(rule.bankQuestionId) +
                    ":" +
                    (rule.allowed ? "allow" : "disable"),
                ),
            ])
          : undefined,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "validate",
      resourceType: "assessment-version",
      resourceId: version._id,
      summary: `${definition.slug} validation ${status}`,
      actorId: actor._id,
    });
    return {
      ok: true as const,
      status,
      blockingCount: uniqueBlocking.length,
      warningCount: 0,
      contentRevision: version.contentRevision,
    };
  },
});

export const recordApproval = mutation({
  args: {
    versionId: v.id("assessmentVersions"),
    expectedContentRevision: v.number(),
    reviewType: assessmentReviewTypeValidator,
    decision: assessmentReviewDecisionValidator,
    note: v.string(),
  },
  returns: v.id("assessmentVersionApprovals"),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:review");
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      args.versionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      throw new ConvexError({
        code: "REVISION_CONFLICT" as const,
        currentRevision: version.contentRevision,
      });
    }
    const approvalId = await ctx.db.insert("assessmentVersionApprovals", {
      versionId: version._id,
      contentRevision: version.contentRevision,
      reviewType: args.reviewType,
      decision: args.decision,
      reviewerId: actor._id,
      note: normalizeBoundedText(args.note, "note", 10, 2_000),
      createdAt: Date.now(),
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "review",
      resourceType: "assessment-version",
      resourceId: version._id,
      summary: `${definition.slug} ${args.reviewType} review ${args.decision}`,
      actorId: actor._id,
    });
    return approvalId;
  },
});

export const publish = mutation({
  args: {
    versionId: v.id("assessmentVersions"),
    expectedContentRevision: v.number(),
  },
  returns: v.object({ version: v.number(), publishedAt: v.number() }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:publish");
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      args.versionId,
    );
    if (
      version.contentRevision !== args.expectedContentRevision ||
      version.validatedRevision !== version.contentRevision ||
      version.status !== "ready"
    ) {
      throw new ConvexError({
        code: "VERSION_NOT_READY" as const,
        currentRevision: version.contentRevision,
      });
    }
    const [check] = await ctx.db
      .query("assessmentVersionChecks")
      .withIndex("by_version_id_and_content_revision", (q) =>
        q.eq("versionId", version._id).eq("contentRevision", version.contentRevision),
      )
      .order("desc")
      .take(1);
    if (check === undefined || check.status !== "passed" || check.blockingCount !== 0) {
      throw new ConvexError({ code: "VERSION_NOT_READY" as const });
    }
    const latestApprovals = new Map<
      Doc<"assessmentVersionApprovals">["reviewType"],
      Doc<"assessmentVersionApprovals">
    >();
    for (const reviewType of [
      "academic",
      "rights",
      "accessibility",
      "bias",
    ] as const) {
      const [approval] = await ctx.db
        .query("assessmentVersionApprovals")
        .withIndex(
          "by_version_revision_review_created",
          (q) =>
            q
              .eq("versionId", version._id)
              .eq("contentRevision", version.contentRevision)
              .eq("reviewType", reviewType),
        )
        .order("desc")
        .take(1);
      if (approval === undefined || approval.decision !== "approved") {
        throw new ConvexError({ code: "APPROVALS_INCOMPLETE" as const });
      }
      latestApprovals.set(reviewType, approval);
    }
    const items = await ctx.db
      .query("assessmentItems")
      .withIndex("by_version_id_and_order", (q) => q.eq("versionId", version._id))
      .take(201);
    if (items.length > 200) {
      throw new ConvexError({ code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const });
    }
    const academic = latestApprovals.get("academic")!;
    if (items.some((item) => item.authoredBy === academic.reviewerId)) {
      throw new ConvexError({ code: "ACADEMIC_REVIEWER_IS_AUTHOR" as const });
    }
    const publishedAt = Date.now();
    const assignedVersion = definition.nextVersion;
    await ctx.db.patch("assessmentVersions", version._id, {
      version: assignedVersion,
      status: "published",
      publishedBy: actor._id,
      publishedAt,
      updatedAt: publishedAt,
    });
    await ctx.db.patch("assessmentDefinitions", definition._id, {
      publishedVersionId: version._id,
      draftVersionId: undefined,
      nextVersion: assignedVersion + 1,
      visibility: "published",
      updatedBy: actor._id,
      updatedAt: publishedAt,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "publish",
      resourceType: "assessment-version",
      resourceId: version._id,
      summary: `${definition.slug} version ${assignedVersion} published`,
      actorId: actor._id,
    });
    return { version: assignedVersion, publishedAt };
  },
});

export const createDraftFromPublished = mutation({
  args: { definitionId: v.id("assessmentDefinitions") },
  returns: v.object({
    versionId: v.id("assessmentVersions"),
    status: v.literal("cloning"),
  }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const definition = await ctx.db.get(
      "assessmentDefinitions",
      args.definitionId,
    );
    if (
      definition === null ||
      definition.draftVersionId !== undefined ||
      definition.publishedVersionId === undefined
    ) {
      throw new ConvexError({ code: "PUBLISHED_SOURCE_NOT_AVAILABLE" as const });
    }
    const source = await ctx.db.get(
      "assessmentVersions",
      definition.publishedVersionId,
    );
    if (
      source === null ||
      source.definitionId !== definition._id ||
      source.status !== "published"
    ) {
      throw new ConvexError({ code: "PUBLISHED_SOURCE_NOT_AVAILABLE" as const });
    }
    const now = Date.now();
    const versionId = await ctx.db.insert("assessmentVersions", {
      definitionId: definition._id,
      status: "cloning",
      title: source.title,
      summary: source.summary,
      instructions: source.instructions,
      locale: source.locale,
      timePolicy: source.timePolicy,
      totalTimeLimitSeconds: source.totalTimeLimitSeconds,
      allowResume: source.allowResume,
      reviewPolicy: source.reviewPolicy,
      scorePolicy: source.scorePolicy,
      defaultTimingMode: source.defaultTimingMode,
      defaultListeningMode: source.defaultListeningMode,
      maxAttemptsPerDay: source.maxAttemptsPerDay,
      contentRevision: 1,
      cloneSourceVersionId: source._id,
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("assessmentDefinitions", definition._id, {
      draftVersionId: versionId,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.assessmentCloneRunner.runSections, {
      sourceVersionId: source._id,
      draftVersionId: versionId,
      actorId: actor._id,
    });
    return { versionId, status: "cloning" as const };
  },
});

export const resumeDraftClone = mutation({
  args: { versionId: v.id("assessmentVersions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const draft = await ctx.db.get("assessmentVersions", args.versionId);
    if (
      draft === null ||
      (draft.status !== "cloning" && draft.status !== "clone-failed") ||
      draft.cloneSourceVersionId === undefined
    ) {
      throw new ConvexError({ code: "CLONE_STATE_INVALID" as const });
    }
    const definition = await ctx.db.get(
      "assessmentDefinitions",
      draft.definitionId,
    );
    if (definition === null || definition.draftVersionId !== draft._id) {
      throw new ConvexError({ code: "CLONE_STATE_INVALID" as const });
    }
    if (draft.status === "clone-failed") {
      await ctx.db.patch("assessmentVersions", draft._id, {
        status: "cloning",
        updatedAt: Date.now(),
      });
    }
    await ctx.scheduler.runAfter(0, internal.assessmentCloneRunner.runSections, {
      sourceVersionId: draft.cloneSourceVersionId,
      draftVersionId: draft._id,
      actorId: actor._id,
    });
    return null;
  },
});

export const retire = mutation({
  args: { definitionId: v.id("assessmentDefinitions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:publish");
    const definition = await ctx.db.get(
      "assessmentDefinitions",
      args.definitionId,
    );
    if (definition === null) {
      throw new ConvexError({ code: "ASSESSMENT_NOT_FOUND" as const });
    }
    const now = Date.now();
    if (definition.publishedVersionId !== undefined) {
      const published = await ctx.db.get(
        "assessmentVersions",
        definition.publishedVersionId,
      );
      if (published !== null && published.status === "published") {
        await ctx.db.patch("assessmentVersions", published._id, {
          status: "retired",
          updatedAt: now,
        });
      }
    }
    await ctx.db.patch("assessmentDefinitions", definition._id, {
      visibility: "retired",
      publishedVersionId: undefined,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "retire",
      resourceType: "assessment-definition",
      resourceId: definition._id,
      summary: `${definition.slug} retired`,
      actorId: actor._id,
    });
    return null;
  },
});
