import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { writeAuditEvent } from "./lib/adminAuth";

async function requireClonePair(
  ctx: MutationCtx,
  sourceVersionId: Doc<"assessmentVersions">["_id"],
  draftVersionId: Doc<"assessmentVersions">["_id"],
) {
  const [source, draft] = await Promise.all([
    ctx.db.get("assessmentVersions", sourceVersionId),
    ctx.db.get("assessmentVersions", draftVersionId),
  ]);
  if (
    source === null ||
    draft === null ||
    source.definitionId !== draft.definitionId ||
    source.status !== "published" ||
    draft.status !== "cloning" ||
    draft.cloneSourceVersionId !== source._id
  ) {
    throw new ConvexError({ code: "CLONE_STATE_INVALID" as const });
  }
  return { source, draft };
}

export const cloneSections = internalMutation({
  args: {
    sourceVersionId: v.id("assessmentVersions"),
    draftVersionId: v.id("assessmentVersions"),
    actorId: v.id("adminUsers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { source, draft } = await requireClonePair(
      ctx,
      args.sourceVersionId,
      args.draftVersionId,
    );
    const sections = await ctx.db
      .query("assessmentSections")
      .withIndex("by_version_id_and_order", (q) =>
        q.eq("versionId", source._id),
      )
      .take(9);
    if (sections.length === 0 || sections.length > 8) {
      throw new ConvexError({ code: "CLONE_SOURCE_INVALID" as const });
    }
    for (const section of sections) {
      const existing = await ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_section_key", (q) =>
          q.eq("versionId", draft._id).eq("sectionKey", section.sectionKey),
        )
        .unique();
      if (existing !== null) continue;
      await ctx.db.insert("assessmentSections", {
        versionId: draft._id,
        sectionKey: section.sectionKey,
        skill: section.skill,
        order: section.order,
        title: section.title,
        instructions: section.instructions,
        timeLimitSeconds: section.timeLimitSeconds,
        audioReplayPolicy: section.audioReplayPolicy,
        itemCount: 0,
      });
    }
    await ctx.scheduler.runAfter(
      0,
      internal.assessmentCloneRunner.runStimuliBatch,
      {
        sourceVersionId: source._id,
        draftVersionId: draft._id,
        actorId: args.actorId,
        paginationOpts: {
          cursor: null,
          numItems: 20,
          maximumRowsRead: 20,
        },
      },
    );
    return null;
  },
});

export const cloneStimuliBatch = internalMutation({
  args: {
    sourceVersionId: v.id("assessmentVersions"),
    draftVersionId: v.id("assessmentVersions"),
    actorId: v.id("adminUsers"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { source, draft } = await requireClonePair(
      ctx,
      args.sourceVersionId,
      args.draftVersionId,
    );
    if (
      args.paginationOpts.numItems !== 20 ||
      args.paginationOpts.maximumRowsRead !== 20
    ) {
      throw new ConvexError({ code: "CLONE_PAGE_INVALID" as const });
    }
    const page = await ctx.db
      .query("assessmentStimuli")
      .withIndex("by_version_id_and_stimulus_key", (q) =>
        q.eq("versionId", source._id),
      )
      .paginate(args.paginationOpts);
    for (const stimulus of page.page) {
      const existing = await ctx.db
        .query("assessmentStimuli")
        .withIndex("by_version_id_and_stimulus_key", (q) =>
          q
            .eq("versionId", draft._id)
            .eq("stimulusKey", stimulus.stimulusKey),
        )
        .unique();
      if (existing !== null) continue;
      const sourceSection = await ctx.db.get(
        "assessmentSections",
        stimulus.sectionId,
      );
      if (sourceSection === null || sourceSection.versionId !== source._id) {
        throw new ConvexError({ code: "CLONE_SOURCE_INVALID" as const });
      }
      const draftSection = await ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_section_key", (q) =>
          q
            .eq("versionId", draft._id)
            .eq("sectionKey", sourceSection.sectionKey),
        )
        .unique();
      if (draftSection === null) {
        throw new ConvexError({ code: "CLONE_STATE_INVALID" as const });
      }
      await ctx.db.insert("assessmentStimuli", {
        versionId: draft._id,
        sectionId: draftSection._id,
        stimulusKey: stimulus.stimulusKey,
        kind: stimulus.kind,
        order: stimulus.order,
        title: stimulus.title,
        body: stimulus.body,
        // Delivery media is version-bound; a new reviewed derivative is required.
        mediaId: undefined,
        transcript: stimulus.transcript,
        alt: stimulus.alt,
        provenanceJson: stimulus.provenanceJson,
        authoredBy: stimulus.authoredBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.assessmentCloneRunner.runStimuliBatch,
        {
          sourceVersionId: source._id,
          draftVersionId: draft._id,
          actorId: args.actorId,
          paginationOpts: {
            cursor: page.continueCursor,
            numItems: 20,
            maximumRowsRead: 20,
          },
        },
      );
    } else {
      await ctx.scheduler.runAfter(0, internal.assessmentCloneRunner.runItemsBatch, {
        sourceVersionId: source._id,
        draftVersionId: draft._id,
        actorId: args.actorId,
        paginationOpts: {
          cursor: null,
          numItems: 20,
          maximumRowsRead: 20,
        },
      });
    }
    return null;
  },
});

function cloneItemValues(
  source: Doc<"assessmentItems">,
  draftVersionId: Doc<"assessmentVersions">["_id"],
  draftSectionId: Doc<"assessmentSections">["_id"],
  draftStimulusId: Doc<"assessmentStimuli">["_id"] | undefined,
) {
  const base = {
    versionId: draftVersionId,
    sectionId: draftSectionId,
    stimulusId: draftStimulusId,
    sourceContentVersionId: source.sourceContentVersionId,
    itemKey: source.itemKey,
    order: source.order,
    prompt: source.prompt,
    required: source.required,
    explanation: source.explanation,
    provenanceJson: source.provenanceJson,
    authoredBy: source.authoredBy,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  switch (source.type) {
    case "single-choice":
      return { ...base, type: source.type, options: source.options };
    case "multiple-select":
      return {
        ...base,
        type: source.type,
        options: source.options,
        selectionMin: source.selectionMin,
        selectionMax: source.selectionMax,
      };
    case "cloze-select":
      return {
        ...base,
        type: source.type,
        stemParts: source.stemParts,
        gaps: source.gaps,
      };
    case "sentence-build":
      return { ...base, type: source.type, tokens: source.tokens };
    case "constructed-response":
      return {
        ...base,
        type: source.type,
        responseMode: source.responseMode,
        minimumWords: source.minimumWords,
        recommendedWords: source.recommendedWords,
        maximumCharacters: source.maximumCharacters,
        preparationSeconds: source.preparationSeconds,
        responseSeconds: source.responseSeconds,
      };
  }
}

export const cloneItemsBatch = internalMutation({
  args: {
    sourceVersionId: v.id("assessmentVersions"),
    draftVersionId: v.id("assessmentVersions"),
    actorId: v.id("adminUsers"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { source, draft } = await requireClonePair(
      ctx,
      args.sourceVersionId,
      args.draftVersionId,
    );
    if (
      args.paginationOpts.numItems !== 20 ||
      args.paginationOpts.maximumRowsRead !== 20
    ) {
      throw new ConvexError({ code: "CLONE_PAGE_INVALID" as const });
    }
    const page = await ctx.db
      .query("assessmentItems")
      .withIndex("by_version_id_and_order", (q) =>
        q.eq("versionId", source._id),
      )
      .paginate(args.paginationOpts);
    for (const item of page.page) {
      const existing = await ctx.db
        .query("assessmentItems")
        .withIndex("by_version_id_and_item_key", (q) =>
          q.eq("versionId", draft._id).eq("itemKey", item.itemKey),
        )
        .unique();
      if (existing !== null) continue;
      const sourceSection = await ctx.db.get("assessmentSections", item.sectionId);
      if (sourceSection === null || sourceSection.versionId !== source._id) {
        throw new ConvexError({ code: "CLONE_SOURCE_INVALID" as const });
      }
      const draftSection = await ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_section_key", (q) =>
          q
            .eq("versionId", draft._id)
            .eq("sectionKey", sourceSection.sectionKey),
        )
        .unique();
      if (draftSection === null) {
        throw new ConvexError({ code: "CLONE_STATE_INVALID" as const });
      }
      let draftStimulusId: Doc<"assessmentStimuli">["_id"] | undefined;
      if (item.stimulusId !== undefined) {
        const sourceStimulus = await ctx.db.get(
          "assessmentStimuli",
          item.stimulusId,
        );
        if (sourceStimulus === null || sourceStimulus.versionId !== source._id) {
          throw new ConvexError({ code: "CLONE_SOURCE_INVALID" as const });
        }
        const draftStimulus = await ctx.db
          .query("assessmentStimuli")
          .withIndex("by_version_id_and_stimulus_key", (q) =>
            q
              .eq("versionId", draft._id)
              .eq("stimulusKey", sourceStimulus.stimulusKey),
          )
          .unique();
        if (draftStimulus === null) {
          throw new ConvexError({ code: "CLONE_STATE_INVALID" as const });
        }
        draftStimulusId = draftStimulus._id;
      }
      const draftItemId = await ctx.db.insert(
        "assessmentItems",
        cloneItemValues(
          item,
          draft._id,
          draftSection._id,
          draftStimulusId,
        ),
      );
      const sourceKey = await ctx.db
        .query("assessmentAnswerKeys")
        .withIndex("by_item_id", (q) => q.eq("itemId", item._id))
        .unique();
      if (sourceKey === null) {
        throw new ConvexError({ code: "CLONE_SOURCE_INVALID" as const });
      }
      const keyBase = {
        versionId: draft._id,
        itemId: draftItemId,
        scoringMode: sourceKey.scoringMode,
        points: sourceKey.points,
      };
      switch (sourceKey.kind) {
        case "choice":
          await ctx.db.insert("assessmentAnswerKeys", {
            ...keyBase,
            kind: sourceKey.kind,
            correctChoiceKeys: sourceKey.correctChoiceKeys,
          });
          break;
        case "multi-choice":
          await ctx.db.insert("assessmentAnswerKeys", {
            ...keyBase,
            kind: sourceKey.kind,
            correctChoiceKeys: sourceKey.correctChoiceKeys,
          });
          break;
        case "cloze":
          await ctx.db.insert("assessmentAnswerKeys", {
            ...keyBase,
            kind: sourceKey.kind,
            correctGapAnswers: sourceKey.correctGapAnswers,
          });
          break;
        case "token-order":
          await ctx.db.insert("assessmentAnswerKeys", {
            ...keyBase,
            kind: sourceKey.kind,
            acceptedTokenOrders: sourceKey.acceptedTokenOrders,
          });
          break;
        case "text-rubric":
          await ctx.db.insert("assessmentAnswerKeys", {
            ...keyBase,
            kind: sourceKey.kind,
            rubricMode: sourceKey.rubricMode,
            maxPoints: sourceKey.maxPoints,
            minimumWords: sourceKey.minimumWords,
            targetTerms: sourceKey.targetTerms,
            sampleResponse: sourceKey.sampleResponse,
          });
          break;
      }
      await ctx.db.patch("assessmentSections", draftSection._id, {
        itemCount: draftSection.itemCount + 1,
      });
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.assessmentCloneRunner.runItemsBatch, {
        sourceVersionId: source._id,
        draftVersionId: draft._id,
        actorId: args.actorId,
        paginationOpts: {
          cursor: page.continueCursor,
          numItems: 20,
          maximumRowsRead: 20,
        },
      });
    } else {
      const now = Date.now();
      await ctx.db.patch("assessmentVersions", draft._id, {
        status: "draft",
        contentRevision: 1,
        updatedAt: now,
      });
      await writeAuditEvent(ctx, {
        area: "assessment",
        action: "create",
        resourceType: "assessment-version",
        resourceId: draft._id,
        summary: "Editable assessment draft prepared from published version",
        actorId: args.actorId,
      });
    }
    return null;
  },
});

export const markFailed = internalMutation({
  args: {
    draftVersionId: v.id("assessmentVersions"),
    actorId: v.id("adminUsers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get("assessmentVersions", args.draftVersionId);
    if (draft === null || draft.status !== "cloning") return null;
    const definition = await ctx.db.get(
      "assessmentDefinitions",
      draft.definitionId,
    );
    if (definition === null || definition.draftVersionId !== draft._id) {
      return null;
    }
    await ctx.db.patch("assessmentVersions", draft._id, {
      status: "clone-failed",
      updatedAt: Date.now(),
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "update",
      resourceType: "assessment-version",
      resourceId: draft._id,
      summary: "Assessment draft clone paused after an internal failure",
      actorId: args.actorId,
    });
    return null;
  },
});
