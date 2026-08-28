import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import {
  assessmentResponseInputValidator,
  attemptPlayerValidator,
  attemptResultValidator,
  attemptStatusValidator,
  listeningModeValidator,
  timingModeValidator,
} from "./assessmentValidators";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  requireAssessmentIdentity,
  requireOwnedAttempt,
} from "./lib/assessmentAuth";
import { projectAttemptResult } from "./lib/assessmentResult";
import { finalizeSectionAndMaybeSubmit } from "./lib/assessmentEngine";
import {
  assertDeliveredItem,
  deliveredItemAt,
  listDeliveredSectionItems,
  prepareRandomSelectionPlans,
  resolveReadyQuestionAudio,
} from "./lib/assessmentQuestionBank";
import { updateQuestionFlagSignal } from "./lib/assessmentQuestionSignals";
import {
  normalizeRequestId,
  normalizeResponseForItem,
  publicItemFromDoc,
  publicResponseFromDoc,
  responseIsAnswered,
  sameResponsePayload,
} from "./lib/assessmentModel";
import {
  projectReadyQuestionAudio,
  projectReadyQuestionIllustration,
  publicAssessmentR2UrlForMedia,
} from "./lib/media";

const startResultValidator = v.object({
  attemptId: v.id("assessmentAttempts"),
  status: v.literal("in-progress"),
  firstSectionOrder: v.number(),
});

const beginSectionResultValidator = v.object({
  status: v.literal("in-progress"),
  revision: v.number(),
  deadlineAt: v.union(v.number(), v.null()),
});

const saveResultValidator = v.union(
  v.object({ ok: v.literal(true), revision: v.number(), savedAt: v.number() }),
  v.object({
    ok: v.literal(false),
    code: v.literal("conflict"),
    currentRevision: v.number(),
  }),
  v.object({ ok: v.literal(false), code: v.literal("section_closed") }),
);

const moveResultValidator = v.union(
  v.object({ ok: v.literal(true), revision: v.number() }),
  v.object({
    ok: v.literal(false),
    code: v.literal("conflict"),
    currentRevision: v.number(),
  }),
);

const lifecycleResultValidator = v.union(
  v.object({
    ok: v.literal(true),
    status: attemptStatusValidator,
    revision: v.number(),
    resultId: v.union(v.id("assessmentResults"), v.null()),
  }),
  v.object({
    ok: v.literal(false),
    code: v.literal("conflict"),
    currentRevision: v.number(),
  }),
);

const historyCardValidator = v.object({
  attemptId: v.id("assessmentAttempts"),
  definitionId: v.id("assessmentDefinitions"),
  versionId: v.id("assessmentVersions"),
  title: v.string(),
  status: attemptStatusValidator,
  startedAt: v.number(),
  submittedAt: v.union(v.number(), v.null()),
  correct: v.union(v.number(), v.null()),
  possible: v.union(v.number(), v.null()),
});

const ownedRouteValidator = v.object({
  attemptId: v.id("assessmentAttempts"),
  status: attemptStatusValidator,
});

const attemptStateValidator = v.union(
  v.object({
    phase: v.literal("section-ready"),
    attemptId: v.id("assessmentAttempts"),
    status: v.union(v.literal("in-progress"), v.literal("section-review")),
    revision: v.number(),
    resultId: v.null(),
    section: v.object({
      id: v.id("assessmentSections"),
      title: v.string(),
      skill: v.union(
        v.literal("listening"),
        v.literal("structure"),
        v.literal("reading"),
        v.literal("writing"),
        v.literal("speaking"),
      ),
      order: v.number(),
      totalSections: v.number(),
      itemCount: v.number(),
      instructions: v.string(),
      deadlineAt: v.null(),
    }),
  }),
  v.object({
    phase: v.literal("question"),
    attemptId: v.id("assessmentAttempts"),
    status: v.literal("in-progress"),
    revision: v.number(),
    resultId: v.null(),
    section: v.object({
      id: v.id("assessmentSections"),
      title: v.string(),
      skill: v.union(
        v.literal("listening"),
        v.literal("structure"),
        v.literal("reading"),
        v.literal("writing"),
        v.literal("speaking"),
      ),
      order: v.number(),
      totalSections: v.number(),
      itemCount: v.number(),
      instructions: v.string(),
      deadlineAt: v.union(v.number(), v.null()),
    }),
  }),
  v.object({
    phase: v.literal("submitted"),
    attemptId: v.id("assessmentAttempts"),
    status: v.literal("submitted"),
    revision: v.number(),
    resultId: v.id("assessmentResults"),
    section: v.null(),
  }),
  v.object({
    phase: v.literal("closed"),
    attemptId: v.id("assessmentAttempts"),
    status: v.literal("abandoned"),
    revision: v.number(),
    resultId: v.null(),
    section: v.null(),
  }),
);

function normalizeTimingMultiplier(
  timingMode: Doc<"assessmentAttempts">["timingMode"],
  requested: number,
) {
  if (!Number.isFinite(requested)) {
    throw new ConvexError({ code: "INVALID_TIMING_MODE" as const });
  }
  if (timingMode === "extended") {
    if (requested !== 1.5 && requested !== 2) {
      throw new ConvexError({ code: "INVALID_TIMING_MODE" as const });
    }
    return requested;
  }
  if (requested !== 1) {
    throw new ConvexError({ code: "INVALID_TIMING_MODE" as const });
  }
  return 1;
}

async function getAttemptProgress(
  ctx: Parameters<typeof requireOwnedAttempt>[0],
  attemptId: Id<"assessmentAttempts">,
  order: number,
) {
  return await ctx.db
    .query("assessmentAttemptSections")
    .withIndex("by_attempt_id_and_order", (q) =>
      q.eq("attemptId", attemptId).eq("order", order),
    )
    .unique();
}

export const resolveMine = query({
  args: { attemptId: v.string() },
  returns: v.union(ownedRouteValidator, v.null()),
  handler: async (ctx, args) => {
    const owner = await requireAssessmentIdentity(ctx);
    if (
      args.attemptId.length < 1 ||
      args.attemptId.length > 128 ||
      args.attemptId !== args.attemptId.trim()
    ) {
      return null;
    }
    const attemptId = ctx.db.normalizeId("assessmentAttempts", args.attemptId);
    if (attemptId === null) return null;
    const attempt = await ctx.db.get("assessmentAttempts", attemptId);
    if (
      attempt === null ||
      attempt.ownerTokenIdentifier !== owner.tokenIdentifier
    ) {
      return null;
    }
    return { attemptId: attempt._id, status: attempt.status };
  },
});

export const start = mutation({
  args: {
    definitionId: v.id("assessmentDefinitions"),
    versionId: v.id("assessmentVersions"),
    timingMode: timingModeValidator,
    timeMultiplier: v.number(),
    listeningMode: listeningModeValidator,
    startRequestId: v.string(),
  },
  returns: startResultValidator,
  handler: async (ctx, args) => {
    const owner = await requireAssessmentIdentity(ctx);
    const startRequestId = normalizeRequestId(args.startRequestId, "startRequestId");
    const timeMultiplier = normalizeTimingMultiplier(
      args.timingMode,
      args.timeMultiplier,
    );
    const existing = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_owner_token_identifier_and_start_request_id", (q) =>
        q
          .eq("ownerTokenIdentifier", owner.tokenIdentifier)
          .eq("startRequestId", startRequestId),
      )
      .unique();
    if (existing !== null) {
      if (
        existing.definitionId !== args.definitionId ||
        existing.versionId !== args.versionId ||
        existing.timingMode !== args.timingMode ||
        existing.timeMultiplier !== timeMultiplier ||
        existing.listeningMode !== args.listeningMode
      ) {
        throw new ConvexError({ code: "IDEMPOTENCY_KEY_REUSED" as const });
      }
      return {
        attemptId: existing._id,
        status: "in-progress" as const,
        firstSectionOrder: 0,
      };
    }

    const definition = await ctx.db.get(
      "assessmentDefinitions",
      args.definitionId,
    );
    const version = await ctx.db.get("assessmentVersions", args.versionId);
    if (
      definition === null ||
      version === null ||
      definition.visibility !== "published" ||
      definition.publishedVersionId !== version._id ||
      version.definitionId !== definition._id ||
      version.status !== "published" ||
      definition.kind === "club-program-quiz"
    ) {
      throw new ConvexError({ code: "ASSESSMENT_NOT_AVAILABLE" as const });
    }
    const sections = await ctx.db
      .query("assessmentSections")
      .withIndex("by_version_id_and_order", (q) => q.eq("versionId", version._id))
      .take(9);
    if (
      sections.length === 0 ||
      sections.length > 8 ||
      sections.some((section, index) => section.order !== index) ||
      sections.reduce((total, section) => total + section.itemCount, 0) > 200
    ) {
      throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
    }
    if (
      !Number.isInteger(version.maxAttemptsPerDay) ||
      version.maxAttemptsPerDay < 1 ||
      version.maxAttemptsPerDay > 20
    ) {
      throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
    }

    const now = Date.now();
    const startDayUtc = new Date(now).toISOString().slice(0, 10);
    const attemptsToday = await ctx.db
      .query("assessmentAttempts")
      .withIndex(
        "by_owner_version_day_started",
        (q) =>
          q
            .eq("ownerTokenIdentifier", owner.tokenIdentifier)
            .eq("versionId", version._id)
            .eq("startDayUtc", startDayUtc),
      )
      .take(version.maxAttemptsPerDay + 1);
    if (attemptsToday.length >= version.maxAttemptsPerDay) {
      throw new ConvexError({ code: "DAILY_ATTEMPT_LIMIT" as const });
    }
    const randomSelectionPlans = await prepareRandomSelectionPlans(ctx, sections);
    const attemptId = await ctx.db.insert("assessmentAttempts", {
      versionId: version._id,
      definitionId: definition._id,
      ownerTokenIdentifier: owner.tokenIdentifier,
      ownerKind: owner.ownerKind,
      startRequestId,
      timingMode: args.timingMode,
      timeMultiplier,
      listeningMode: args.listeningMode,
      status: "in-progress",
      revision: 1,
      startedAt: now,
      lastActivityAt: now,
      currentSectionOrder: sections[0].order,
      currentItemOrder: 0,
      resultRevision: 0,
      startDayUtc,
    });
    for (const section of sections) {
      await ctx.db.insert("assessmentAttemptSections", {
        attemptId,
        sectionId: section._id,
        order: section.order,
        status: "not-started",
        elapsedSeconds: 0,
        answeredCount: 0,
        flaggedCount: 0,
      });
      const selection = randomSelectionPlans.get(section._id) ?? [];
      const selectedOrderByQuestionId = new Map(
        selection.map((question, index) => [String(question._id), index]),
      );
      for (let order = 0; order < selection.length; order += 1) {
        const bankQuestion = selection[order];
        if (bankQuestion.skill !== section.skill) {
          throw new ConvexError({
            code: "QUESTION_BANK_SELECTION_INVALID" as const,
            skill: section.skill,
          });
        }
        const sourceItem = await ctx.db.get(
          "assessmentItems",
          bankQuestion.sourceItemId,
        );
        const pinnedAudio = await resolveReadyQuestionAudio(
          ctx,
          bankQuestion,
          sourceItem,
        );
        if (bankQuestion.skill === "listening" && pinnedAudio === null) {
          throw new ConvexError({ code: "QUESTION_BANK_AUDIO_REQUIRED" as const });
        }
        const parentAttemptItemOrder =
          bankQuestion.dependencyRole === "follow-up" &&
          bankQuestion.parentBankQuestionId !== undefined
            ? selectedOrderByQuestionId.get(
                String(bankQuestion.parentBankQuestionId),
              )
            : undefined;
        if (
          bankQuestion.dependencyRole === "follow-up" &&
          (parentAttemptItemOrder === undefined ||
            parentAttemptItemOrder >= order)
        ) {
          throw new ConvexError({
            code: "QUESTION_BANK_SELECTION_INVALID" as const,
            skill: section.skill,
          });
        }
        await ctx.db.insert("assessmentAttemptItems", {
          attemptId,
          sectionId: section._id,
          bankQuestionId: bankQuestion._id,
          itemId: bankQuestion.sourceItemId,
          illustrationMediaId: bankQuestion.illustrationMediaId,
          audioMediaId: pinnedAudio?.mediaId,
          dependencyGroupKey: bankQuestion.dependencyGroupKey,
          dependencyRole: bankQuestion.dependencyRole,
          parentAttemptItemOrder,
          order,
          selectedAt: now,
          selectionContract: 1,
        });
      }
    }
    return {
      attemptId,
      status: "in-progress" as const,
      firstSectionOrder: sections[0].order,
    };
  },
});

export const resumeCandidate = query({
  args: {},
  returns: v.union(
    v.object({
      attemptId: v.id("assessmentAttempts"),
      definitionId: v.id("assessmentDefinitions"),
      status: attemptStatusValidator,
      currentSectionOrder: v.number(),
      currentItemOrder: v.number(),
      startedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const owner = await requireAssessmentIdentity(ctx);
    const candidates = [];
    for (const status of ["in-progress", "section-review"] as const) {
      const [candidate] = await ctx.db
        .query("assessmentAttempts")
        .withIndex("by_owner_token_identifier_and_status_and_started_at", (q) =>
          q.eq("ownerTokenIdentifier", owner.tokenIdentifier).eq("status", status),
        )
        .order("desc")
        .take(1);
      if (candidate !== undefined) candidates.push(candidate);
    }
    candidates.sort((left, right) => right.startedAt - left.startedAt);
    const candidate = candidates[0];
    return candidate === undefined
      ? null
      : {
          attemptId: candidate._id,
          definitionId: candidate.definitionId,
          status: candidate.status,
          currentSectionOrder: candidate.currentSectionOrder,
          currentItemOrder: candidate.currentItemOrder,
          startedAt: candidate.startedAt,
        };
  },
});

export const getAttemptState = query({
  args: { attemptId: v.id("assessmentAttempts") },
  returns: attemptStateValidator,
  handler: async (ctx, args) => {
    const { attempt } = await requireOwnedAttempt(ctx, args.attemptId);
    if (attempt.status === "submitted") {
      if (attempt.currentResultId === undefined) {
        throw new ConvexError({ code: "RESULT_NOT_AVAILABLE" as const });
      }
      return {
        phase: "submitted" as const,
        attemptId: attempt._id,
        status: attempt.status,
        revision: attempt.revision,
        resultId: attempt.currentResultId,
        section: null,
      };
    }
    if (attempt.status === "abandoned") {
      return {
        phase: "closed" as const,
        attemptId: attempt._id,
        status: attempt.status,
        revision: attempt.revision,
        resultId: null,
        section: null,
      };
    }
    if (attempt.status === "submitting") {
      throw new ConvexError({ code: "ATTEMPT_BUSY" as const });
    }
    const progressRows = await ctx.db
      .query("assessmentAttemptSections")
      .withIndex("by_attempt_id_and_order", (q) => q.eq("attemptId", attempt._id))
      .take(9);
    if (progressRows.length === 0 || progressRows.length > 8) {
      throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
    }
    const progress = progressRows.find(
      (candidate) => candidate.order === attempt.currentSectionOrder,
    );
    if (progress === undefined) {
      throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
    }
    const section = await ctx.db.get("assessmentSections", progress.sectionId);
    if (section === null || section.versionId !== attempt.versionId) {
      throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
    }
    const sectionProjection = {
      id: section._id,
      title: section.title,
      skill: section.skill,
      order: section.order,
      totalSections: progressRows.length,
      itemCount: section.itemCount,
      instructions: section.instructions,
    };
    if (progress.status === "not-started") {
      return {
        phase: "section-ready" as const,
        attemptId: attempt._id,
        status: attempt.status,
        revision: attempt.revision,
        resultId: null,
        section: { ...sectionProjection, deadlineAt: null },
      };
    }
    if (progress.status !== "in-progress" || attempt.status !== "in-progress") {
      throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
    }
    return {
      phase: "question" as const,
      attemptId: attempt._id,
      status: attempt.status,
      revision: attempt.revision,
      resultId: null,
      section: {
        ...sectionProjection,
        deadlineAt: progress.deadlineAt ?? null,
      },
    };
  },
});

export const beginSection = mutation({
  args: { attemptId: v.id("assessmentAttempts") },
  returns: beginSectionResultValidator,
  handler: async (ctx, args) => {
    const { attempt } = await requireOwnedAttempt(ctx, args.attemptId);
    if (attempt.status === "submitted" || attempt.status === "abandoned") {
      throw new ConvexError({ code: "ATTEMPT_CLOSED" as const });
    }
    const progress = await getAttemptProgress(
      ctx,
      attempt._id,
      attempt.currentSectionOrder,
    );
    if (progress === null) {
      throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
    }
    if (progress.status === "in-progress") {
      return {
        status: "in-progress" as const,
        revision: attempt.revision,
        deadlineAt: progress.deadlineAt ?? null,
      };
    }
    if (progress.status !== "not-started") {
      throw new ConvexError({ code: "SECTION_NOT_AVAILABLE" as const });
    }
    const [section, version] = await Promise.all([
      ctx.db.get("assessmentSections", progress.sectionId),
      ctx.db.get("assessmentVersions", attempt.versionId),
    ]);
    if (
      section === null ||
      version === null ||
      section.versionId !== version._id ||
      section.order !== progress.order
    ) {
      throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
    }
    if (version.timePolicy === "whole-assessment") {
      throw new ConvexError({ code: "TIME_POLICY_NOT_SUPPORTED" as const });
    }
    const now = Date.now();
    const deadlineAt =
      attempt.timingMode === "untimed" || version.timePolicy === "untimed"
        ? undefined
        : section.timeLimitSeconds === undefined
          ? (() => {
              throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
            })()
          : now + Math.round(section.timeLimitSeconds * attempt.timeMultiplier * 1000);
    await ctx.db.patch("assessmentAttemptSections", progress._id, {
      status: "in-progress",
      startedAt: now,
      deadlineAt,
    });
    await ctx.db.patch("assessmentAttempts", attempt._id, {
      status: "in-progress",
      lastActivityAt: now,
      revision: attempt.revision + 1,
    });
    if (deadlineAt !== undefined) {
      await ctx.scheduler.runAt(
        deadlineAt,
        internal.assessmentMaintenance.finalizeSection,
        {
          attemptId: attempt._id,
          sectionId: section._id,
          expectedDeadlineAt: deadlineAt,
        },
      );
    }
    return {
      status: "in-progress" as const,
      revision: attempt.revision + 1,
      deadlineAt: deadlineAt ?? null,
    };
  },
});

export const getPlayer = query({
  args: { attemptId: v.id("assessmentAttempts") },
  returns: v.union(attemptPlayerValidator, v.null()),
  handler: async (ctx, args) => {
    const { attempt } = await requireOwnedAttempt(ctx, args.attemptId);
    if (attempt.status !== "in-progress") return null;
    const progress = await getAttemptProgress(
      ctx,
      attempt._id,
      attempt.currentSectionOrder,
    );
    if (progress === null || progress.status !== "in-progress") return null;
    const section = await ctx.db.get("assessmentSections", progress.sectionId);
    if (section === null || section.versionId !== attempt.versionId) return null;
    const delivered = await deliveredItemAt(
      ctx,
      attempt._id,
      section,
      attempt.currentItemOrder,
    );
    if (delivered === null) return null;
    const { item } = delivered;
    const [illustration, pinnedAudio] = await Promise.all([
      projectReadyQuestionIllustration(ctx, delivered.illustrationMediaId),
      projectReadyQuestionAudio(ctx, delivered.audioMediaId),
    ]);
    let audio = pinnedAudio;
    const response = await ctx.db
      .query("assessmentResponses")
      .withIndex("by_attempt_id_and_item_id", (q) =>
        q.eq("attemptId", attempt._id).eq("itemId", item._id),
      )
      .unique();
    const allProgress = await ctx.db
      .query("assessmentAttemptSections")
      .withIndex("by_attempt_id_and_order", (q) => q.eq("attemptId", attempt._id))
      .take(9);
    if (allProgress.length > 8) return null;
    const sectionItems = await listDeliveredSectionItems(
      ctx,
      attempt._id,
      section,
    );
    const sectionResponses = await ctx.db
      .query("assessmentResponses")
      .withIndex("by_attempt_id_and_section_id_and_item_id", (q) =>
        q.eq("attemptId", attempt._id).eq("sectionId", section._id),
      )
      .take(51);
    if (sectionItems.length > 50 || sectionResponses.length > 50) return null;
    const responseByItem = new Map(
      sectionResponses.map((candidate) => [candidate.itemId, candidate]),
    );

    let stimulus = null;
    if (item.stimulusId !== undefined) {
      const stimulusRow = await ctx.db.get("assessmentStimuli", item.stimulusId);
      if (
        stimulusRow !== null &&
        stimulusRow.versionId === item.versionId &&
        stimulusRow.sectionId === item.sectionId
      ) {
        let mediaUrl: string | null = null;
        if (stimulusRow.kind === "audio") {
          if (audio === null) {
            audio = await projectReadyQuestionAudio(
              ctx,
              stimulusRow.mediaId,
              stimulusRow.versionId,
            );
          }
          mediaUrl = audio?.publicUrl ?? null;
        } else if (stimulusRow.mediaId !== undefined) {
          const media = await ctx.db.get("mediaAssets", stimulusRow.mediaId);
          mediaUrl = publicAssessmentR2UrlForMedia(
            media,
            stimulusRow.versionId,
            stimulusRow.kind,
          );
        }
        stimulus = {
          id: stimulusRow._id,
          kind: stimulusRow.kind,
          title: stimulusRow.title ?? null,
          body: stimulusRow.body ?? null,
          mediaUrl,
          transcript:
            attempt.listeningMode === "transcript-supported"
              ? (stimulusRow.transcript ?? null)
              : null,
          alt: stimulusRow.alt ?? null,
        };
      }
    }
    return {
      attemptId: attempt._id,
      status: attempt.status,
      timingMode: attempt.timingMode,
      listeningMode: attempt.listeningMode,
      sectionDeadlineAt: progress.deadlineAt ?? null,
      saveStateVersion: attempt.revision,
      responseRevision: response?.clientRevision ?? 0,
      section: {
        id: section._id,
        title: section.title,
        skill: section.skill,
        order: section.order,
        totalSections: allProgress.length,
        instructions: section.instructions,
      },
      item: publicItemFromDoc(item),
      illustration,
      audio,
      stimulus,
      response: response === null ? null : publicResponseFromDoc(response),
      flagged: response?.flagged ?? false,
      itemStates: sectionItems.map((candidate) => {
        const saved = responseByItem.get(candidate.item._id);
        return {
          itemId: candidate.item._id,
          itemOrder: candidate.order,
          answered:
            saved === undefined
              ? false
              : responseIsAnswered(publicResponseFromDoc(saved)),
          flagged: saved?.flagged ?? false,
          current: candidate.item._id === item._id,
        };
      }),
      navigation: {
        itemOrder: delivered.order,
        itemCount: section.itemCount,
        canGoBack: delivered.order > 0,
        canGoNext: delivered.order + 1 < section.itemCount,
      },
    };
  },
});

export const saveResponse = mutation({
  args: {
    attemptId: v.id("assessmentAttempts"),
    itemId: v.id("assessmentItems"),
    response: assessmentResponseInputValidator,
    expectedClientRevision: v.number(),
    mutationId: v.string(),
    flagged: v.boolean(),
  },
  returns: saveResultValidator,
  handler: async (ctx, args) => {
    const { attempt } = await requireOwnedAttempt(ctx, args.attemptId);
    if (attempt.status !== "in-progress") {
      return { ok: false as const, code: "section_closed" as const };
    }
    const mutationId = normalizeRequestId(args.mutationId, "mutationId");
    const progress = await ctx.db
      .query("assessmentAttemptSections")
      .withIndex("by_attempt_id_and_order", (q) =>
        q
          .eq("attemptId", attempt._id)
          .eq("order", attempt.currentSectionOrder),
      )
      .unique();
    if (
      progress === null ||
      progress.order !== attempt.currentSectionOrder ||
      progress.status !== "in-progress"
    ) {
      throw new ConvexError({ code: "SECTION_NOT_AVAILABLE" as const });
    }
    const section = await ctx.db.get("assessmentSections", progress.sectionId);
    if (section === null || section.versionId !== attempt.versionId) {
      throw new ConvexError({ code: "SECTION_NOT_AVAILABLE" as const });
    }
    const item = await assertDeliveredItem(
      ctx,
      attempt._id,
      section,
      args.itemId,
    );
    if (item === null) {
      throw new ConvexError({ code: "ITEM_NOT_FOUND" as const });
    }
    const now = Date.now();
    if (progress.deadlineAt !== undefined && now >= progress.deadlineAt) {
      await finalizeSectionAndMaybeSubmit(ctx, attempt, progress, now);
      return { ok: false as const, code: "section_closed" as const };
    }
    const normalized = normalizeResponseForItem(item, args.response);
    const existing = await ctx.db
      .query("assessmentResponses")
      .withIndex("by_attempt_id_and_item_id", (q) =>
        q.eq("attemptId", attempt._id).eq("itemId", item._id),
      )
      .unique();
    const currentRevision = existing?.clientRevision ?? 0;
    if (existing?.lastMutationId === mutationId) {
      if (
        !sameResponsePayload(publicResponseFromDoc(existing), normalized) ||
        existing.flagged !== args.flagged
      ) {
        throw new ConvexError({ code: "IDEMPOTENCY_KEY_REUSED" as const });
      }
      return { ok: true as const, revision: currentRevision, savedAt: existing.updatedAt };
    }
    if (
      !Number.isInteger(args.expectedClientRevision) ||
      args.expectedClientRevision !== currentRevision
    ) {
      return { ok: false as const, code: "conflict" as const, currentRevision };
    }
    const nextRevision = currentRevision + 1;
    const documentBase = {
      attemptId: attempt._id,
      versionId: attempt.versionId,
      sectionId: progress.sectionId,
      itemId: item._id,
      clientRevision: nextRevision,
      lastMutationId: mutationId,
      flagged: args.flagged,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const document = { ...documentBase, ...normalized };
    if (existing === null) {
      await ctx.db.insert("assessmentResponses", document);
    } else {
      await ctx.db.replace("assessmentResponses", existing._id, document);
    }
    if ((existing?.flagged ?? false) !== args.flagged) {
      await updateQuestionFlagSignal(
        ctx,
        attempt,
        item._id,
        args.flagged,
        now,
      );
    }
    const wasAnswered = existing === null ? false : responseIsAnswered(publicResponseFromDoc(existing));
    const isAnswered = responseIsAnswered(normalized);
    await ctx.db.patch("assessmentAttemptSections", progress._id, {
      answeredCount:
        progress.answeredCount + (isAnswered ? 1 : 0) - (wasAnswered ? 1 : 0),
      flaggedCount:
        progress.flaggedCount + (args.flagged ? 1 : 0) - (existing?.flagged ? 1 : 0),
    });
    await ctx.db.patch("assessmentAttempts", attempt._id, {
      lastActivityAt: now,
    });
    return { ok: true as const, revision: nextRevision, savedAt: now };
  },
});

export const move = mutation({
  args: {
    attemptId: v.id("assessmentAttempts"),
    sectionOrder: v.number(),
    itemOrder: v.number(),
    expectedRevision: v.number(),
  },
  returns: moveResultValidator,
  handler: async (ctx, args) => {
    const { attempt } = await requireOwnedAttempt(ctx, args.attemptId);
    if (attempt.status !== "in-progress") {
      throw new ConvexError({ code: "SECTION_NOT_AVAILABLE" as const });
    }
    if (args.expectedRevision !== attempt.revision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: attempt.revision,
      };
    }
    if (
      !Number.isInteger(args.sectionOrder) ||
      !Number.isInteger(args.itemOrder) ||
      args.sectionOrder !== attempt.currentSectionOrder ||
      args.itemOrder < 0 ||
      args.itemOrder > 199
    ) {
      throw new ConvexError({ code: "INVALID_NAVIGATION" as const });
    }
    const progress = await getAttemptProgress(ctx, attempt._id, args.sectionOrder);
    if (progress === null || progress.status !== "in-progress") {
      throw new ConvexError({ code: "SECTION_NOT_AVAILABLE" as const });
    }
    const section = await ctx.db.get("assessmentSections", progress.sectionId);
    if (section === null || section.versionId !== attempt.versionId) {
      throw new ConvexError({ code: "INVALID_NAVIGATION" as const });
    }
    const delivered = await deliveredItemAt(
      ctx,
      attempt._id,
      section,
      args.itemOrder,
    );
    if (delivered === null) {
      throw new ConvexError({ code: "INVALID_NAVIGATION" as const });
    }
    const now = Date.now();
    await ctx.db.patch("assessmentAttempts", attempt._id, {
      currentItemOrder: delivered.order,
      revision: attempt.revision + 1,
      lastActivityAt: now,
    });
    return { ok: true as const, revision: attempt.revision + 1 };
  },
});

export const enableTranscript = mutation({
  args: {
    attemptId: v.id("assessmentAttempts"),
    expectedRevision: v.number(),
  },
  returns: moveResultValidator,
  handler: async (ctx, args) => {
    const { attempt } = await requireOwnedAttempt(ctx, args.attemptId);
    if (attempt.status !== "in-progress") {
      throw new ConvexError({ code: "SECTION_NOT_AVAILABLE" as const });
    }
    if (attempt.listeningMode === "transcript-supported") {
      return { ok: true as const, revision: attempt.revision };
    }
    if (args.expectedRevision !== attempt.revision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: attempt.revision,
      };
    }
    const progress = await getAttemptProgress(
      ctx,
      attempt._id,
      attempt.currentSectionOrder,
    );
    if (progress === null || progress.status !== "in-progress") {
      throw new ConvexError({ code: "SECTION_NOT_AVAILABLE" as const });
    }
    const section = await ctx.db.get("assessmentSections", progress.sectionId);
    if (
      section === null ||
      section.versionId !== attempt.versionId ||
      section.skill !== "listening"
    ) {
      throw new ConvexError({ code: "TRANSCRIPT_NOT_AVAILABLE" as const });
    }
    const now = Date.now();
    await ctx.db.patch("assessmentAttempts", attempt._id, {
      listeningMode: "transcript-supported",
      revision: attempt.revision + 1,
      lastActivityAt: now,
    });
    return { ok: true as const, revision: attempt.revision + 1 };
  },
});

export const finalizeCurrentSection = mutation({
  args: {
    attemptId: v.id("assessmentAttempts"),
    expectedRevision: v.number(),
  },
  returns: lifecycleResultValidator,
  handler: async (ctx, args) => {
    const { attempt } = await requireOwnedAttempt(ctx, args.attemptId);
    if (attempt.status === "section-review" || attempt.status === "submitted") {
      return {
        ok: true as const,
        status: attempt.status,
        revision: attempt.revision,
        resultId: attempt.currentResultId ?? null,
      };
    }
    if (args.expectedRevision !== attempt.revision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: attempt.revision,
      };
    }
    const progress = await getAttemptProgress(
      ctx,
      attempt._id,
      attempt.currentSectionOrder,
    );
    if (progress === null || progress.status !== "in-progress") {
      throw new ConvexError({ code: "SECTION_NOT_AVAILABLE" as const });
    }
    await finalizeSectionAndMaybeSubmit(ctx, attempt, progress, Date.now());
    const updated = await ctx.db.get("assessmentAttempts", attempt._id);
    if (updated === null) throw new ConvexError({ code: "ATTEMPT_NOT_FOUND" as const });
    return {
      ok: true as const,
      status: updated.status,
      revision: updated.revision,
      resultId: updated.currentResultId ?? null,
    };
  },
});

export const submit = mutation({
  args: {
    attemptId: v.id("assessmentAttempts"),
    submitRequestId: v.string(),
    expectedRevision: v.number(),
  },
  returns: lifecycleResultValidator,
  handler: async (ctx, args) => {
    const { attempt } = await requireOwnedAttempt(ctx, args.attemptId);
    const submitRequestId = normalizeRequestId(args.submitRequestId, "submitRequestId");
    if (attempt.status === "submitted") {
      if (attempt.currentResultId === undefined) {
        throw new ConvexError({ code: "RESULT_NOT_AVAILABLE" as const });
      }
      return {
        ok: true as const,
        status: attempt.status,
        revision: attempt.revision,
        resultId: attempt.currentResultId,
      };
    }
    if (attempt.status === "abandoned") {
      throw new ConvexError({ code: "ATTEMPT_CLOSED" as const });
    }
    if (args.expectedRevision !== attempt.revision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: attempt.revision,
      };
    }
    const progress = await getAttemptProgress(
      ctx,
      attempt._id,
      attempt.currentSectionOrder,
    );
    if (progress === null || progress.status !== "in-progress") {
      throw new ConvexError({ code: "SECTION_NOT_AVAILABLE" as const });
    }
    const [next] = await ctx.db
      .query("assessmentAttemptSections")
      .withIndex("by_attempt_id_and_order", (q) =>
        q.eq("attemptId", attempt._id).gt("order", progress.order),
      )
      .take(1);
    if (next !== undefined) {
      throw new ConvexError({ code: "FINAL_SECTION_REQUIRED" as const });
    }
    const now = Date.now();
    await finalizeSectionAndMaybeSubmit(
      ctx,
      attempt,
      progress,
      now,
      submitRequestId,
    );
    const updatedAfterFinalize = await ctx.db.get(
      "assessmentAttempts",
      attempt._id,
    );
    const resultId = updatedAfterFinalize?.currentResultId;
    if (resultId === undefined) {
      throw new ConvexError({ code: "RESULT_NOT_AVAILABLE" as const });
    }
    const updated = await ctx.db.get("assessmentAttempts", attempt._id);
    if (updated === null) throw new ConvexError({ code: "ATTEMPT_NOT_FOUND" as const });
    return {
      ok: true as const,
      status: "submitted" as const,
      revision: updated.revision,
      resultId,
    };
  },
});

export const getResult = query({
  args: { attemptId: v.id("assessmentAttempts") },
  returns: v.union(attemptResultValidator, v.null()),
  handler: async (ctx, args) => {
    const { attempt } = await requireOwnedAttempt(ctx, args.attemptId);
    return await projectAttemptResult(ctx, attempt);
  },
});

export const deleteMine = mutation({
  args: { attemptId: v.id("assessmentAttempts") },
  returns: v.object({ deleted: v.literal(true) }),
  handler: async (ctx, args) => {
    const { attempt } = await requireOwnedAttempt(ctx, args.attemptId);
    const [
      responses,
      progressRows,
      selectedItems,
      results,
      deliveries,
      reviewGrants,
    ] = await Promise.all([
      ctx.db
        .query("assessmentResponses")
        .withIndex("by_attempt_id_and_updated_at", (q) =>
          q.eq("attemptId", attempt._id),
        )
        .take(201),
      ctx.db
        .query("assessmentAttemptSections")
        .withIndex("by_attempt_id_and_order", (q) =>
          q.eq("attemptId", attempt._id),
        )
        .take(9),
      ctx.db
        .query("assessmentAttemptItems")
        .withIndex("by_attempt_id_and_section_id_and_order", (q) =>
          q.eq("attemptId", attempt._id),
        )
        .take(201),
      ctx.db
        .query("assessmentResults")
        .withIndex("by_attempt_id_and_revision", (q) =>
          q.eq("attemptId", attempt._id),
        )
        .take(9),
      ctx.db
        .query("assessmentResultDeliveries")
        .withIndex("by_attempt_id_and_requested_at", (q) =>
          q.eq("attemptId", attempt._id),
        )
        .take(7),
      ctx.db
        .query("assessmentResultReviewGrants")
        .withIndex("by_attempt_id_and_created_at", (q) =>
          q.eq("attemptId", attempt._id),
        )
        .take(7),
    ]);
    if (
      responses.length > 200 ||
      progressRows.length > 8 ||
      selectedItems.length > 200 ||
      results.length > 8 ||
      deliveries.length > 6 ||
      reviewGrants.length > 6
    ) {
      throw new ConvexError({ code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const });
    }
    for (const result of results) {
      const sectionResults = await ctx.db
        .query("assessmentSectionResults")
        .withIndex("by_result_id", (q) => q.eq("resultId", result._id))
        .take(9);
      if (sectionResults.length > 8) {
        throw new ConvexError({ code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const });
      }
      for (const sectionResult of sectionResults) {
        await ctx.db.delete("assessmentSectionResults", sectionResult._id);
      }
    }
    for (const response of responses) {
      if (response.flagged) {
        await updateQuestionFlagSignal(
          ctx,
          attempt,
          response.itemId,
          false,
        );
      }
      await ctx.db.delete("assessmentResponses", response._id);
    }
    for (const progress of progressRows) {
      await ctx.db.delete("assessmentAttemptSections", progress._id);
    }
    for (const selectedItem of selectedItems) {
      await ctx.db.delete("assessmentAttemptItems", selectedItem._id);
    }
    for (const grant of reviewGrants) {
      const reviewSessions = await ctx.db
        .query("assessmentResultReviewSessions")
        .withIndex("by_grant_id_and_created_at", (q) =>
          q.eq("grantId", grant._id),
        )
        .take(6);
      if (reviewSessions.length > 5) {
        throw new ConvexError({ code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const });
      }
      for (const session of reviewSessions) {
        await ctx.db.delete("assessmentResultReviewSessions", session._id);
      }
      await ctx.db.delete("assessmentResultReviewGrants", grant._id);
    }
    for (const delivery of deliveries) {
      await ctx.db.delete("assessmentResultDeliveries", delivery._id);
    }
    for (const result of results) {
      await ctx.db.delete("assessmentResults", result._id);
    }
    await ctx.db.delete("assessmentAttempts", attempt._id);
    return { deleted: true as const };
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(historyCardValidator),
  handler: async (ctx, args) => {
    const owner = await requireAssessmentIdentity(ctx);
    if (
      args.paginationOpts.numItems !== 10 ||
      (args.paginationOpts.maximumRowsRead !== undefined &&
        args.paginationOpts.maximumRowsRead > 10)
    ) {
      throw new Error("Attempt history page size is invalid.");
    }
    const result = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_owner_token_identifier_and_started_at", (q) =>
        q.eq("ownerTokenIdentifier", owner.tokenIdentifier),
      )
      .order("desc")
      .paginate({ ...args.paginationOpts, maximumRowsRead: 10 });
    const page = [];
    for (const attempt of result.page) {
      const [version, objective] = await Promise.all([
        ctx.db.get("assessmentVersions", attempt.versionId),
        attempt.currentResultId === undefined
          ? Promise.resolve(null)
          : ctx.db.get("assessmentResults", attempt.currentResultId),
      ]);
      if (version === null) continue;
      page.push({
        attemptId: attempt._id,
        definitionId: attempt.definitionId,
        versionId: attempt.versionId,
        title: version.title,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt ?? null,
        correct: objective?.correct ?? null,
        possible: objective?.possible ?? null,
      });
    }
    return { ...result, page };
  },
});
