import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import {
  assessmentProfileValidator,
  assessmentQuestionBankStatusValidator,
  assessmentQuestionDifficultyValidator,
  assessmentSkillValidator,
  assessmentTaskFamilyValidator,
  itemTypeValidator,
} from "./assessmentValidators";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import { normalizeQuestionBankTags } from "./lib/assessmentQuestionBank";

const bankRowValidator = v.object({
  bankQuestionId: v.id("assessmentQuestionBank"),
  bankKey: v.string(),
  skill: assessmentSkillValidator,
  taskFamily: assessmentTaskFamilyValidator,
  difficulty: assessmentQuestionDifficultyValidator,
  status: assessmentQuestionBankStatusValidator,
  profile: assessmentProfileValidator,
  fullPracticeEligible: v.boolean(),
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
  const [item, key, definition, usages] = await Promise.all([
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
    tags: row.tags,
    prompt: item.prompt,
    itemType: item.type,
    points: key.kind === "text-rubric" ? key.maxPoints : (key.points ?? 1),
    sourceDefinitionId: definition._id,
    sourceSectionId: row.sourceSectionId,
    sourceItemId: item._id,
    sourceTitle: definition.adminTitle,
    sourceVisibility: definition.visibility,
    usageCount: Math.min(100, usages.length),
    usageCountCapped: usages.length > 100,
    seedBatch: row.seedBatch ?? null,
    updatedAt: row.updatedAt,
  };
}

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
    return {
      total: visibleRows.length,
      capped,
      ready: visibleRows.filter((row) => row.status === "ready").length,
      eligible: visibleRows.filter(
        (row) => row.status === "ready" && row.fullPracticeEligible,
      ).length,
      bySkill: skills.map((skill) => ({
        skill,
        count: visibleRows.filter(
          (row) =>
            row.skill === skill &&
            row.status === "ready" &&
            row.fullPracticeEligible,
        ).length,
      })),
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
    const tags = normalizeQuestionBankTags(args.tags);
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
      if (
        item === null ||
        key === null ||
        version?.status !== "published" ||
        definition?.visibility !== "published" ||
        definition.publishedVersionId !== version._id ||
        item.versionId !== row.sourceVersionId ||
        key.versionId !== row.sourceVersionId
      ) {
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
