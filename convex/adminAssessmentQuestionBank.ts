import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { isTaskFamilyForSkill } from "../content/assessment-task-families";
import {
  assessmentProfileValidator,
  assessmentOptionValidator,
  assessmentQuestionBankStatusValidator,
  assessmentQuestionDifficultyValidator,
  assessmentSkillValidator,
  assessmentTaskFamilyValidator,
  itemTypeValidator,
} from "./assessmentValidators";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import {
  normalizeBankPrompt,
  normalizeQuestionBankTags,
  questionBankSourceIsReady,
  questionContentFingerprint,
  QUESTION_BANK_AUTHORING_LEDGER_SLUG,
} from "./lib/assessmentQuestionBank";
import {
  normalizeBoundedText,
  normalizeOptions,
  normalizeRequestId,
} from "./lib/assessmentModel";
import { projectReadyQuestionIllustration } from "./lib/media";

const illustrationValidator = v.object({
  mediaId: v.id("mediaAssets"),
  publicUrl: v.string(),
  alt: v.string(),
  width: v.number(),
  height: v.number(),
});

const bankRowValidator = v.object({
  bankQuestionId: v.id("assessmentQuestionBank"),
  bankKey: v.string(),
  skill: assessmentSkillValidator,
  taskFamily: assessmentTaskFamilyValidator,
  difficulty: assessmentQuestionDifficultyValidator,
  status: assessmentQuestionBankStatusValidator,
  profile: assessmentProfileValidator,
  fullPracticeEligible: v.boolean(),
  origin: v.union(
    v.literal("assessment-source"),
    v.literal("bank-authored"),
  ),
  illustration: v.union(illustrationValidator, v.null()),
  tags: v.array(v.string()),
  prompt: v.string(),
  itemType: itemTypeValidator,
  points: v.number(),
  sourceDefinitionId: v.id("assessmentDefinitions"),
  sourceSectionId: v.id("assessmentSections"),
  sourceItemId: v.id("assessmentItems"),
  sourceTitle: v.string(),
  sourceVisibility: v.union(
    v.literal("draft"),
    v.literal("published"),
    v.literal("retired"),
  ),
  usageCount: v.number(),
  usageCountCapped: v.boolean(),
  seedBatch: v.union(v.string(), v.null()),
  updatedAt: v.number(),
});

async function projectBankRow(
  ctx: Parameters<typeof requireAdmin>[0],
  row: Doc<"assessmentQuestionBank">,
) {
  const [item, key, definition, usages, illustration] = await Promise.all([
    ctx.db.get("assessmentItems", row.sourceItemId),
    ctx.db
      .query("assessmentAnswerKeys")
      .withIndex("by_item_id", (q) => q.eq("itemId", row.sourceItemId))
      .unique(),
    ctx.db.get("assessmentDefinitions", row.sourceDefinitionId),
    ctx.db
      .query("assessmentAttemptItems")
      .withIndex("by_bank_question_id_and_selected_at", (q) =>
        q.eq("bankQuestionId", row._id),
      )
      .take(101),
    projectReadyQuestionIllustration(ctx, row.illustrationMediaId),
  ]);
  if (
    item === null ||
    key === null ||
    definition === null ||
    item.versionId !== row.sourceVersionId ||
    item.sectionId !== row.sourceSectionId ||
    key.versionId !== row.sourceVersionId
  ) {
    throw new ConvexError({ code: "QUESTION_BANK_SOURCE_MISSING" as const });
  }
  return {
    bankQuestionId: row._id,
    bankKey: row.bankKey,
    skill: row.skill,
    taskFamily: row.taskFamily,
    difficulty: row.difficulty,
    status: row.status,
    profile: row.profile,
    fullPracticeEligible: row.fullPracticeEligible,
    origin: row.origin ?? "assessment-source",
    illustration,
    tags: row.tags,
    prompt: item.prompt,
    itemType: item.type,
    points: key.kind === "text-rubric" ? key.maxPoints : (key.points ?? 1),
    sourceDefinitionId: definition._id,
    sourceSectionId: row.sourceSectionId,
    sourceItemId: item._id,
    sourceTitle:
      row.origin === "bank-authored"
        ? "Question Bank original"
        : definition.adminTitle,
    sourceVisibility: definition.visibility,
    usageCount: Math.min(100, usages.length),
    usageCountCapped: usages.length > 100,
    seedBatch: row.seedBatch ?? null,
    updatedAt: row.updatedAt,
  };
}

const authoredSkillValidator = v.union(
  v.literal("reading"),
  v.literal("listening"),
  v.literal("writing"),
  v.literal("speaking"),
);

async function createAuthoringLedgerVersion(
  ctx: MutationCtx,
  definition: Doc<"assessmentDefinitions">,
  actorId: Id<"adminUsers">,
  now: number,
) {
  const versionNumber = definition.nextVersion;
  const versionId = await ctx.db.insert("assessmentVersions", {
    definitionId: definition._id,
    version: versionNumber,
    status: "ready",
    title: `Question Bank authoring ledger ${versionNumber}`,
    summary: "Internal source records for questions authored in Question Bank.",
    instructions: "Review bank metadata before making a question selectable.",
    locale: "en",
    timePolicy: "untimed",
    allowResume: true,
    reviewPolicy: "after-submit",
    scorePolicy: "practice-estimate-v1",
    defaultTimingMode: "untimed",
    defaultListeningMode: "transcript-supported",
    maxAttemptsPerDay: 20,
    contentRevision: 0,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
  });
  const definitions = [
    { skill: "reading", title: "Reading" },
    { skill: "listening", title: "Listening" },
    { skill: "writing", title: "Writing" },
    { skill: "speaking", title: "Speaking" },
  ] as const;
  const sections = new Map<
    (typeof definitions)[number]["skill"],
    Doc<"assessmentSections">
  >();
  for (let order = 0; order < definitions.length; order += 1) {
    const entry = definitions[order];
    const sectionId = await ctx.db.insert("assessmentSections", {
      versionId,
      sectionKey: `authored-${entry.skill}`,
      skill: entry.skill,
      order,
      title: entry.title,
      instructions: `Internal source section for ${entry.title.toLowerCase()} questions.`,
      itemCount: 0,
      deliveryMode: "fixed",
    });
    const section = await ctx.db.get("assessmentSections", sectionId);
    if (section === null) {
      throw new ConvexError({ code: "QUESTION_BANK_LEDGER_INVALID" as const });
    }
    sections.set(entry.skill, section);
  }
  await ctx.db.patch("assessmentDefinitions", definition._id, {
    draftVersionId: versionId,
    nextVersion: versionNumber + 1,
    updatedBy: actorId,
    updatedAt: now,
  });
  const version = await ctx.db.get("assessmentVersions", versionId);
  if (version === null) {
    throw new ConvexError({ code: "QUESTION_BANK_LEDGER_INVALID" as const });
  }
  return { version, sections };
}

async function getAuthoringLedgerSection(
  ctx: MutationCtx,
  actorId: Id<"adminUsers">,
  skill: "reading" | "listening" | "writing" | "speaking",
  now: number,
) {
  let definition = await ctx.db
    .query("assessmentDefinitions")
    .withIndex("by_slug", (q) =>
      q.eq("slug", QUESTION_BANK_AUTHORING_LEDGER_SLUG),
    )
    .unique();
  if (definition === null) {
    const definitionId = await ctx.db.insert("assessmentDefinitions", {
      slug: QUESTION_BANK_AUTHORING_LEDGER_SLUG,
      kind: "skill-quiz",
      profile: "ec-ibt-style-2026-v1",
      adminTitle: "Question Bank authoring ledger",
      internalOnly: true,
      nextVersion: 1,
      visibility: "draft",
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: now,
      updatedAt: now,
    });
    definition = await ctx.db.get("assessmentDefinitions", definitionId);
  }
  if (
    definition === null ||
    definition.internalOnly !== true ||
    definition.profile !== "ec-ibt-style-2026-v1"
  ) {
    throw new ConvexError({ code: "QUESTION_BANK_LEDGER_INVALID" as const });
  }

  const versions = await ctx.db
    .query("assessmentVersions")
    .withIndex("by_definition_id_and_status_and_updated_at", (q) =>
      q.eq("definitionId", definition!._id).eq("status", "ready"),
    )
    .order("desc")
    .take(10);
  for (const version of versions) {
    const sections = await ctx.db
      .query("assessmentSections")
      .withIndex("by_version_id_and_order", (q) =>
        q.eq("versionId", version._id),
      )
      .take(5);
    if (sections.length > 4) {
      throw new ConvexError({ code: "QUESTION_BANK_LEDGER_INVALID" as const });
    }
    const section = sections.find((candidate) => candidate.skill === skill) ?? null;
    if (section !== null && section.itemCount < 50) {
      return { definition, version, section };
    }
  }

  const created = await createAuthoringLedgerVersion(
    ctx,
    definition,
    actorId,
    now,
  );
  const section = created.sections.get(skill);
  if (section === undefined) {
    throw new ConvexError({ code: "QUESTION_BANK_LEDGER_INVALID" as const });
  }
  return { definition, version: created.version, section };
}

export const createQuestion = mutation({
  args: {
    requestId: v.string(),
    skill: authoredSkillValidator,
    taskFamily: assessmentTaskFamilyValidator,
    difficulty: assessmentQuestionDifficultyValidator,
    prompt: v.string(),
    options: v.array(assessmentOptionValidator),
    correctChoiceKey: v.string(),
    explanation: v.union(v.string(), v.null()),
    tags: v.array(v.string()),
    illustrationMediaId: v.union(v.id("mediaAssets"), v.null()),
  },
  returns: v.object({
    bankQuestionId: v.id("assessmentQuestionBank"),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const requestId = normalizeRequestId(args.requestId, "requestId");
    const bankKey = `manual/${requestId}`;
    const existing = await ctx.db
      .query("assessmentQuestionBank")
      .withIndex("by_bank_key", (q) => q.eq("bankKey", bankKey))
      .unique();
    if (existing !== null) {
      if (existing.origin !== "bank-authored") {
        throw new ConvexError({ code: "QUESTION_BANK_KEY_EXISTS" as const });
      }
      return { bankQuestionId: existing._id, created: false };
    }
    if (!isTaskFamilyForSkill(args.skill, args.taskFamily)) {
      throw new ConvexError({
        code: "QUESTION_BANK_TASK_FAMILY_SKILL_MISMATCH" as const,
        skill: args.skill,
        taskFamily: args.taskFamily,
      });
    }
    const prompt = normalizeBoundedText(args.prompt, "prompt", 2, 4_000);
    const options = normalizeOptions(args.options);
    const normalizedLabels = options.map((option) =>
      option.label.toLocaleLowerCase("en"),
    );
    if (new Set(normalizedLabels).size !== normalizedLabels.length) {
      throw new ConvexError({ code: "DUPLICATE_OPTION_LABEL" as const });
    }
    const correctChoiceKey = args.correctChoiceKey.trim().toLowerCase();
    if (!options.some((option) => option.key === correctChoiceKey)) {
      throw new ConvexError({ code: "ANSWER_NOT_IN_OPTIONS" as const });
    }
    const explanation =
      args.explanation === null
        ? undefined
        : normalizeBoundedText(args.explanation, "explanation", 2, 4_000);
    const tags = normalizeQuestionBankTags([
      ...new Set([args.skill, args.taskFamily, ...args.tags]),
    ]);
    if (args.illustrationMediaId !== null) {
      const illustration = await projectReadyQuestionIllustration(
        ctx,
        args.illustrationMediaId,
      );
      if (illustration === null) {
        throw new ConvexError({
          code: "QUESTION_BANK_ILLUSTRATION_INVALID" as const,
        });
      }
    }
    const fingerprint = questionContentFingerprint(
      args.skill,
      prompt,
      options.map((option) => option.label),
    );
    const duplicates = await ctx.db
      .query("assessmentQuestionBank")
      .withIndex("by_content_fingerprint", (q) =>
        q.eq("contentFingerprint", fingerprint),
      )
      .take(3);
    if (duplicates.length > 2) {
      throw new ConvexError({ code: "QUESTION_BANK_DUPLICATE_LIMIT" as const });
    }
    const duplicate = duplicates.find((candidate) => candidate.status !== "archived") ?? null;
    if (duplicate !== null) {
      throw new ConvexError({
        code: "QUESTION_BANK_DUPLICATE" as const,
        bankQuestionId: duplicate._id,
      });
    }

    const now = Date.now();
    const { definition, version, section } = await getAuthoringLedgerSection(
      ctx,
      actor._id,
      args.skill,
      now,
    );
    const safeRequestKey = requestId
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .slice(0, 72);
    const itemId = await ctx.db.insert("assessmentItems", {
      versionId: version._id,
      sectionId: section._id,
      itemKey: `manual-${safeRequestKey}`,
      order: section.itemCount,
      prompt,
      required: true,
      explanation,
      provenanceJson: JSON.stringify({
        sourceType: "admin-authored",
        authoringSurface: "question-bank",
        rightsNote: "Original English Club question; review before selection.",
      }),
      authoredBy: actor._id,
      createdAt: now,
      updatedAt: now,
      type: "single-choice",
      options,
    });
    await ctx.db.insert("assessmentAnswerKeys", {
      versionId: version._id,
      itemId,
      kind: "choice",
      correctChoiceKeys: [correctChoiceKey],
      scoringMode: "exact",
      points: 1,
    });
    const bankQuestionId = await ctx.db.insert("assessmentQuestionBank", {
      bankKey,
      sourceDefinitionId: definition._id,
      sourceVersionId: version._id,
      sourceSectionId: section._id,
      sourceItemId: itemId,
      skill: args.skill,
      taskFamily: args.taskFamily,
      difficulty: args.difficulty,
      status: "paused",
      profile: "ec-ibt-style-2026-v1",
      fullPracticeEligible: false,
      origin: "bank-authored",
      illustrationMediaId: args.illustrationMediaId ?? undefined,
      contentFingerprint: fingerprint,
      promptSearch: normalizeBankPrompt(prompt),
      tags,
      createdBy: actor._id,
      updatedBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
    await Promise.all([
      ctx.db.patch("assessmentSections", section._id, {
        itemCount: section.itemCount + 1,
      }),
      ctx.db.patch("assessmentVersions", version._id, {
        contentRevision: version.contentRevision + 1,
        updatedAt: now,
      }),
      ctx.db.patch("assessmentDefinitions", definition._id, {
        updatedBy: actor._id,
        updatedAt: now,
      }),
    ]);
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "create",
      resourceType: "question-bank-entry",
      resourceId: bankQuestionId,
      summary: `${args.skill} single-choice question authored`,
      actorId: actor._id,
    });
    return { bankQuestionId, created: true };
  },
});

export const listPage = query({
  args: {
    skill: v.optional(assessmentSkillValidator),
    status: assessmentQuestionBankStatusValidator,
    difficulty: v.optional(assessmentQuestionDifficultyValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(bankRowValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "assessment:read");
    if (
      args.paginationOpts.numItems !== 20 ||
      (args.paginationOpts.maximumRowsRead !== undefined &&
        args.paginationOpts.maximumRowsRead > 20)
    ) {
      throw new Error("Question bank page size is invalid.");
    }
    const result =
      args.skill === undefined && args.difficulty === undefined
        ? await ctx.db
            .query("assessmentQuestionBank")
            .withIndex("by_status_and_updated_at", (q) =>
              q.eq("status", args.status),
            )
            .order("desc")
            .paginate({ ...args.paginationOpts, maximumRowsRead: 20 })
        : args.skill === undefined && args.difficulty !== undefined
          ? await ctx.db
              .query("assessmentQuestionBank")
              .withIndex("by_status_and_difficulty_and_updated_at", (q) =>
                q.eq("status", args.status).eq("difficulty", args.difficulty!),
              )
              .order("desc")
              .paginate({ ...args.paginationOpts, maximumRowsRead: 20 })
          : args.skill !== undefined && args.difficulty === undefined
            ? await ctx.db
                .query("assessmentQuestionBank")
                .withIndex("by_skill_and_status_and_updated_at", (q) =>
                  q.eq("skill", args.skill!).eq("status", args.status),
                )
                .order("desc")
                .paginate({ ...args.paginationOpts, maximumRowsRead: 20 })
            : await ctx.db
                .query("assessmentQuestionBank")
                .withIndex(
                  "by_skill_and_status_and_difficulty_and_updated_at",
                  (q) =>
                    q
                      .eq("skill", args.skill!)
                      .eq("status", args.status)
                      .eq("difficulty", args.difficulty!),
                )
                .order("desc")
                .paginate({ ...args.paginationOpts, maximumRowsRead: 20 });
    const page = [];
    for (const row of result.page) {
      page.push(await projectBankRow(ctx, row));
    }
    return { ...result, page };
  },
});

export const getSummary = query({
  args: {},
  returns: v.object({
    total: v.number(),
    capped: v.boolean(),
    ready: v.number(),
    eligible: v.number(),
    bySkill: v.array(
      v.object({ skill: assessmentSkillValidator, count: v.number() }),
    ),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx, "assessment:read");
    const rows = await ctx.db.query("assessmentQuestionBank").take(201);
    const capped = rows.length > 200;
    const visibleRows = rows.slice(0, 200);
    const skills = ["reading", "listening", "writing", "speaking"] as const;
    const bySkill = [];
    for (const skill of skills) {
      const eligibleRows = await ctx.db
        .query("assessmentQuestionBank")
        .withIndex("by_profile_status_skill_and_eligibility", (q) =>
          q
            .eq("profile", "ec-ibt-style-2026-v1")
            .eq("status", "ready")
            .eq("skill", skill)
            .eq("fullPracticeEligible", true),
        )
        .take(201);
      bySkill.push({ skill, count: Math.min(200, eligibleRows.length) });
    }
    return {
      total: visibleRows.length,
      capped,
      ready: visibleRows.filter((row) => row.status === "ready").length,
      eligible: visibleRows.filter(
        (row) => row.status === "ready" && row.fullPracticeEligible,
      ).length,
      bySkill,
    };
  },
});

export const updateMetadata = mutation({
  args: {
    bankQuestionId: v.id("assessmentQuestionBank"),
    expectedUpdatedAt: v.number(),
    status: assessmentQuestionBankStatusValidator,
    taskFamily: assessmentTaskFamilyValidator,
    difficulty: assessmentQuestionDifficultyValidator,
    fullPracticeEligible: v.boolean(),
    tags: v.array(v.string()),
    illustrationMediaId: v.union(v.id("mediaAssets"), v.null()),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), updatedAt: v.number() }),
    v.object({
      ok: v.literal(false),
      code: v.literal("conflict"),
      currentUpdatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const row = await ctx.db.get("assessmentQuestionBank", args.bankQuestionId);
    if (row === null) {
      throw new ConvexError({ code: "QUESTION_BANK_NOT_FOUND" as const });
    }
    if (row.updatedAt !== args.expectedUpdatedAt) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentUpdatedAt: row.updatedAt,
      };
    }
    if (!isTaskFamilyForSkill(row.skill, args.taskFamily)) {
      throw new ConvexError({
        code: "QUESTION_BANK_TASK_FAMILY_SKILL_MISMATCH" as const,
        skill: row.skill,
        taskFamily: args.taskFamily,
      });
    }
    const tags = normalizeQuestionBankTags(args.tags);
    if (args.illustrationMediaId !== null) {
      const illustration = await projectReadyQuestionIllustration(
        ctx,
        args.illustrationMediaId,
      );
      if (illustration === null) {
        throw new ConvexError({
          code: "QUESTION_BANK_ILLUSTRATION_INVALID" as const,
        });
      }
    }
    if (args.status === "ready") {
      const [item, key, version, definition] = await Promise.all([
        ctx.db.get("assessmentItems", row.sourceItemId),
        ctx.db
          .query("assessmentAnswerKeys")
          .withIndex("by_item_id", (q) => q.eq("itemId", row.sourceItemId))
          .unique(),
        ctx.db.get("assessmentVersions", row.sourceVersionId),
        ctx.db.get("assessmentDefinitions", row.sourceDefinitionId),
      ]);
      if (!questionBankSourceIsReady(row, item, key, version, definition)) {
        throw new ConvexError({ code: "QUESTION_BANK_SOURCE_MISSING" as const });
      }
    }
    const updatedAt = Date.now();
    await ctx.db.patch("assessmentQuestionBank", row._id, {
      status: args.status,
      taskFamily: args.taskFamily,
      difficulty: args.difficulty,
      fullPracticeEligible: args.fullPracticeEligible,
      tags,
      illustrationMediaId: args.illustrationMediaId ?? undefined,
      updatedBy: actor._id,
      updatedAt,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: args.status === "archived" ? "archive" : "update",
      resourceType: "question-bank-entry",
      resourceId: row._id,
      summary: `${row.taskFamily} bank question updated`,
      actorId: actor._id,
    });
    return { ok: true as const, updatedAt };
  },
});
