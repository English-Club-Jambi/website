import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import {
  assessmentOptionValidator,
  assessmentResponseInputValidator,
  publicAssessmentItemValidator,
} from "./assessmentValidators";
import { mutation, query } from "./_generated/server";
import {
  bumpAssessmentRevision,
  getMutableAssessmentVersion,
} from "./lib/assessmentAdmin";
import {
  normalizeBoundedText,
  normalizeKey,
  normalizeOptions,
  requireIntegerInRange,
  publicItemFromDoc,
} from "./lib/assessmentModel";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import {
  difficultyForPosition,
  normalizeBankPrompt,
  questionContentFingerprint,
  taskFamilyForItemOrSkill,
} from "./lib/assessmentQuestionBank";

const itemWorkspaceValidator = v.object({
  item: publicAssessmentItemValidator,
  itemKey: v.string(),
  order: v.number(),
  stimulusId: v.union(v.id("assessmentStimuli"), v.null()),
  explanation: v.union(v.string(), v.null()),
  provenanceJson: v.string(),
  correctAnswer: assessmentResponseInputValidator,
});

const stimulusWorkspaceValidator = v.object({
  stimulusId: v.id("assessmentStimuli"),
  stimulusKey: v.string(),
  kind: v.union(
    v.literal("reading"),
    v.literal("audio"),
    v.literal("image"),
  ),
  order: v.number(),
  title: v.union(v.string(), v.null()),
  body: v.union(v.string(), v.null()),
  mediaId: v.union(v.id("mediaAssets"), v.null()),
  transcript: v.union(v.string(), v.null()),
  alt: v.union(v.string(), v.null()),
  provenanceJson: v.string(),
});

export const getSectionWorkspace = query({
  args: { sectionId: v.id("assessmentSections") },
  returns: v.union(
    v.object({
      sectionId: v.id("assessmentSections"),
      versionId: v.id("assessmentVersions"),
      sectionKey: v.string(),
      title: v.string(),
      stimuli: v.array(stimulusWorkspaceValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "assessment:read");
    const section = await ctx.db.get("assessmentSections", args.sectionId);
    if (section === null) return null;
    const stimuli = await ctx.db
      .query("assessmentStimuli")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", section._id),
      )
      .take(51);
    if (stimuli.length > 50) {
      throw new ConvexError({ code: "STIMULUS_LIMIT" as const });
    }
    return {
      sectionId: section._id,
      versionId: section.versionId,
      sectionKey: section.sectionKey,
      title: section.title,
      stimuli: stimuli.map((stimulus) => ({
        stimulusId: stimulus._id,
        stimulusKey: stimulus.stimulusKey,
        kind: stimulus.kind,
        order: stimulus.order,
        title: stimulus.title ?? null,
        body: stimulus.body ?? null,
        mediaId: stimulus.mediaId ?? null,
        transcript: stimulus.transcript ?? null,
        alt: stimulus.alt ?? null,
        provenanceJson: stimulus.provenanceJson,
      })),
    };
  },
});

export const listPage = query({
  args: {
    sectionId: v.id("assessmentSections"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(itemWorkspaceValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "assessment:read");
    if (
      args.paginationOpts.numItems !== 25 ||
      (args.paginationOpts.maximumRowsRead !== undefined &&
        args.paginationOpts.maximumRowsRead > 25)
    ) {
      throw new Error("Assessment item page size is invalid.");
    }
    const section = await ctx.db.get("assessmentSections", args.sectionId);
    if (section === null) {
      throw new ConvexError({ code: "SECTION_NOT_FOUND" as const });
    }
    const result = await ctx.db
      .query("assessmentItems")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", section._id),
      )
      .paginate({ ...args.paginationOpts, maximumRowsRead: 25 });
    const page = [];
    for (const item of result.page) {
      const key = await ctx.db
        .query("assessmentAnswerKeys")
        .withIndex("by_item_id", (q) => q.eq("itemId", item._id))
        .unique();
      if (key === null) {
        throw new ConvexError({ code: "ANSWER_KEY_MISSING" as const });
      }
      let correctAnswer;
      switch (key.kind) {
        case "choice":
          if (key.correctChoiceKeys.length !== 1) {
            throw new ConvexError({ code: "ANSWER_KEY_SHAPE_INVALID" as const });
          }
          correctAnswer = {
            kind: "choice" as const,
            selectedChoiceKey: key.correctChoiceKeys[0],
          };
          break;
        case "multi-choice":
          correctAnswer = {
            kind: "multi-choice" as const,
            selectedChoiceKeys: key.correctChoiceKeys,
          };
          break;
        case "cloze":
          correctAnswer = {
            kind: "cloze" as const,
            gapAnswers: key.correctGapAnswers,
          };
          break;
        case "token-order":
          if (key.acceptedTokenOrders.length === 0) {
            throw new ConvexError({ code: "ANSWER_KEY_SHAPE_INVALID" as const });
          }
          correctAnswer = {
            kind: "token-order" as const,
            tokenOrder: key.acceptedTokenOrders[0],
          };
          break;
        case "text-rubric":
          correctAnswer = {
            kind: "text" as const,
            text: key.sampleResponse,
          };
          break;
      }
      page.push({
        item: publicItemFromDoc(item),
        itemKey: item.itemKey,
        order: item.order,
        stimulusId: item.stimulusId ?? null,
        explanation: item.explanation ?? null,
        provenanceJson: item.provenanceJson,
        correctAnswer,
      });
    }
    return { ...result, page };
  },
});

export const saveSingleChoice = mutation({
  args: {
    itemId: v.optional(v.id("assessmentItems")),
    versionId: v.id("assessmentVersions"),
    sectionId: v.id("assessmentSections"),
    stimulusId: v.union(v.id("assessmentStimuli"), v.null()),
    expectedContentRevision: v.number(),
    itemKey: v.string(),
    order: v.number(),
    prompt: v.string(),
    required: v.boolean(),
    explanation: v.union(v.string(), v.null()),
    provenanceJson: v.string(),
    options: v.array(assessmentOptionValidator),
    correctChoiceKey: v.string(),
  },
  returns: v.union(
    v.object({
      ok: v.literal(false),
      code: v.literal("conflict"),
      currentRevision: v.number(),
    }),
    v.object({
      ok: v.literal(true),
      itemId: v.id("assessmentItems"),
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
    const existing =
      args.itemId === undefined
        ? null
        : await ctx.db.get("assessmentItems", args.itemId);
    if (args.itemId !== undefined && existing === null) {
      throw new ConvexError({ code: "ITEM_NOT_FOUND" as const });
    }
    if (
      existing !== null &&
      (existing.versionId !== version._id ||
        existing.sectionId !== section._id ||
        existing.type !== "single-choice")
    ) {
      throw new ConvexError({ code: "ITEM_RELATIONSHIP_INVALID" as const });
    }
    if (existing === null && section.itemCount >= 50) {
      throw new ConvexError({ code: "SECTION_ITEM_LIMIT" as const });
    }
    if (existing === null) {
      const versionItems = await ctx.db
        .query("assessmentItems")
        .withIndex("by_version_id_and_order", (q) => q.eq("versionId", version._id))
        .take(200);
      if (versionItems.length >= 200) {
        throw new ConvexError({ code: "ASSESSMENT_ITEM_LIMIT" as const });
      }
    }
    let stimulusId: typeof args.stimulusId = null;
    if (args.stimulusId !== null) {
      const stimulus = await ctx.db.get("assessmentStimuli", args.stimulusId);
      if (
        stimulus === null ||
        stimulus.versionId !== version._id ||
        stimulus.sectionId !== section._id
      ) {
        throw new ConvexError({ code: "STIMULUS_RELATIONSHIP_INVALID" as const });
      }
      stimulusId = stimulus._id;
    }
    const itemKey = normalizeKey(args.itemKey, "itemKey");
    const order = requireIntegerInRange(args.order, 0, 199, "order");
    const keyCollision = await ctx.db
      .query("assessmentItems")
      .withIndex("by_version_id_and_item_key", (q) =>
        q.eq("versionId", version._id).eq("itemKey", itemKey),
      )
      .unique();
    const orderCollision = await ctx.db
      .query("assessmentItems")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", section._id).eq("order", order),
      )
      .unique();
    if (
      (keyCollision !== null && keyCollision._id !== args.itemId) ||
      (orderCollision !== null && orderCollision._id !== args.itemId)
    ) {
      throw new ConvexError({ code: "ITEM_KEY_OR_ORDER_EXISTS" as const });
    }
    const options = normalizeOptions(args.options);
    const correctChoiceKey = normalizeKey(
      args.correctChoiceKey,
      "correctChoiceKey",
    );
    if (!options.some((option) => option.key === correctChoiceKey)) {
      throw new ConvexError({ code: "ANSWER_NOT_IN_OPTIONS" as const });
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
    const itemValues = {
      versionId: version._id,
      sectionId: section._id,
      stimulusId: stimulusId ?? undefined,
      itemKey,
      order,
      prompt: normalizeBoundedText(args.prompt, "prompt", 1, 4_000),
      required: args.required,
      explanation:
        args.explanation === null
          ? undefined
          : normalizeBoundedText(
              args.explanation,
              "explanation",
              1,
              4_000,
            ),
      provenanceJson,
      authoredBy: existing?.authoredBy ?? actor._id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      type: "single-choice" as const,
      options,
    };
    const itemId =
      existing === null
        ? await ctx.db.insert("assessmentItems", itemValues)
        : (await ctx.db.replace("assessmentItems", existing._id, itemValues),
          existing._id);
    const existingKey = await ctx.db
      .query("assessmentAnswerKeys")
      .withIndex("by_item_id", (q) => q.eq("itemId", itemId))
      .unique();
    const answerValues = {
      versionId: version._id,
      itemId,
      kind: "choice" as const,
      correctChoiceKeys: [correctChoiceKey],
      scoringMode: "exact" as const,
    };
    if (existingKey === null) {
      await ctx.db.insert("assessmentAnswerKeys", answerValues);
    } else {
      await ctx.db.replace("assessmentAnswerKeys", existingKey._id, answerValues);
    }
    if (definition.profile === "ec-ibt-style-2026-v1") {
      const bankEntry = await ctx.db
        .query("assessmentQuestionBank")
        .withIndex("by_source_item_id", (q) => q.eq("sourceItemId", itemId))
        .unique();
      const taskFamily = taskFamilyForItemOrSkill(itemKey, section.skill);
      const bankValues = {
        bankKey: `admin/${definition._id}/${version._id}/${itemId}`,
        sourceDefinitionId: definition._id,
        sourceVersionId: version._id,
        sourceSectionId: section._id,
        sourceItemId: itemId,
        skill: section.skill,
        taskFamily,
        difficulty:
          bankEntry?.difficulty ??
          difficultyForPosition(order, Math.max(section.itemCount + (existing === null ? 1 : 0), 1)),
        status: bankEntry?.status ?? ("paused" as const),
        profile: definition.profile,
        fullPracticeEligible: bankEntry?.fullPracticeEligible ?? false,
        origin: bankEntry?.origin ?? ("assessment-source" as const),
        illustrationMediaId: bankEntry?.illustrationMediaId,
        audioMediaId: bankEntry?.audioMediaId,
        contentFingerprint: questionContentFingerprint(
          section.skill,
          itemValues.prompt,
          options.map((option) => option.label),
        ),
        promptSearch: normalizeBankPrompt(itemValues.prompt),
        tags: bankEntry?.tags ?? [section.skill, taskFamily],
        createdBy: bankEntry?.createdBy ?? actor._id,
        updatedBy: actor._id,
        createdAt: bankEntry?.createdAt ?? now,
        updatedAt: now,
      };
      if (bankEntry === null) {
        await ctx.db.insert("assessmentQuestionBank", bankValues);
      } else {
        await ctx.db.replace("assessmentQuestionBank", bankEntry._id, bankValues);
      }
    }
    if (existing === null) {
      await ctx.db.patch("assessmentSections", section._id, {
        itemCount: section.itemCount + 1,
      });
    }
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
      resourceType: "assessment-item",
      resourceId: itemId,
      summary: `${definition.slug} item ${itemKey} saved`,
      actorId: actor._id,
    });
    return { ok: true as const, itemId, contentRevision };
  },
});

export const deleteItem = mutation({
  args: {
    itemId: v.id("assessmentItems"),
    expectedContentRevision: v.number(),
  },
  returns: v.union(
    v.object({
      ok: v.literal(false),
      code: v.literal("conflict"),
      currentRevision: v.number(),
    }),
    v.object({ ok: v.literal(true), contentRevision: v.number() }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const item = await ctx.db.get("assessmentItems", args.itemId);
    if (item === null) {
      throw new ConvexError({ code: "ITEM_NOT_FOUND" as const });
    }
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      item.versionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: version.contentRevision,
      };
    }
    const section = await ctx.db.get("assessmentSections", item.sectionId);
    if (section === null || section.versionId !== version._id) {
      throw new ConvexError({ code: "ITEM_RELATIONSHIP_INVALID" as const });
    }
    const bankEntry = await ctx.db
      .query("assessmentQuestionBank")
      .withIndex("by_source_item_id", (q) => q.eq("sourceItemId", item._id))
      .unique();
    if (bankEntry !== null) {
      const [usage] = await ctx.db
        .query("assessmentAttemptItems")
        .withIndex("by_bank_question_id_and_selected_at", (q) =>
          q.eq("bankQuestionId", bankEntry._id),
        )
        .take(1);
      if (bankEntry.status === "ready" || usage !== undefined) {
        throw new ConvexError({
          code: "QUESTION_BANK_SOURCE_IN_USE" as const,
        });
      }
      await ctx.db.delete("assessmentQuestionBank", bankEntry._id);
    }
    const key = await ctx.db
      .query("assessmentAnswerKeys")
      .withIndex("by_item_id", (q) => q.eq("itemId", item._id))
      .unique();
    if (key !== null) await ctx.db.delete("assessmentAnswerKeys", key._id);
    await ctx.db.delete("assessmentItems", item._id);
    await ctx.db.patch("assessmentSections", section._id, {
      itemCount: Math.max(0, section.itemCount - 1),
    });
    const siblings = await ctx.db
      .query("assessmentItems")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", section._id),
      )
      .take(51);
    if (siblings.length > 50) {
      throw new ConvexError({ code: "SECTION_ITEM_LIMIT" as const });
    }
    for (let order = 0; order < siblings.length; order += 1) {
      if (siblings[order].order !== order) {
        await ctx.db.patch("assessmentItems", siblings[order]._id, { order });
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
      resourceType: "assessment-item",
      resourceId: item._id,
      summary: `${definition.slug} item ${item.itemKey} removed from draft`,
      actorId: actor._id,
    });
    return { ok: true as const, contentRevision };
  },
});

export const moveItem = mutation({
  args: {
    itemId: v.id("assessmentItems"),
    targetOrder: v.number(),
    expectedContentRevision: v.number(),
  },
  returns: v.union(
    v.object({
      ok: v.literal(false),
      code: v.literal("conflict"),
      currentRevision: v.number(),
    }),
    v.object({ ok: v.literal(true), contentRevision: v.number() }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const item = await ctx.db.get("assessmentItems", args.itemId);
    if (item === null) throw new ConvexError({ code: "ITEM_NOT_FOUND" as const });
    const { definition, version } = await getMutableAssessmentVersion(
      ctx,
      item.versionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: version.contentRevision,
      };
    }
    const siblings = await ctx.db
      .query("assessmentItems")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", item.sectionId),
      )
      .take(51);
    if (siblings.length > 50) {
      throw new ConvexError({ code: "SECTION_ITEM_LIMIT" as const });
    }
    const targetOrder = requireIntegerInRange(
      args.targetOrder,
      0,
      siblings.length - 1,
      "targetOrder",
    );
    const reordered = siblings.filter((candidate) => candidate._id !== item._id);
    reordered.splice(targetOrder, 0, item);
    for (let order = 0; order < reordered.length; order += 1) {
      if (reordered[order].order !== order) {
        await ctx.db.patch("assessmentItems", reordered[order]._id, { order });
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
      resourceType: "assessment-item-order",
      resourceId: item._id,
      summary: `${definition.slug} item order updated`,
      actorId: actor._id,
    });
    return { ok: true as const, contentRevision };
  },
});
