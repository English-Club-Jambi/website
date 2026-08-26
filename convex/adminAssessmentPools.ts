import { ConvexError, v } from "convex/values";

import {
  assessmentFlagReviewStatusValidator,
  assessmentProfileValidator,
  assessmentQuestionBankStatusValidator,
  assessmentQuestionDifficultyValidator,
  assessmentSkillValidator,
  assessmentTaskFamilyValidator,
  assessmentVersionStatusValidator,
  assessmentVisibilityValidator,
  itemTypeValidator,
} from "./assessmentValidators";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  bumpAssessmentRevision,
  getMutableAssessmentVersion,
} from "./lib/assessmentAdmin";
import {
  isRandomBankSection,
  listEligibleBankQuestionsForSection,
} from "./lib/assessmentQuestionBank";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";

const poolSectionValidator = v.object({
  sectionId: v.id("assessmentSections"),
  skill: assessmentSkillValidator,
  title: v.string(),
  requiredCount: v.number(),
  allowedCount: v.number(),
  disabledCount: v.number(),
  spareCount: v.number(),
  deliveryMode: v.union(v.literal("fixed"), v.literal("random-bank")),
});

const flagSignalValidator = v.object({
  activeCount: v.number(),
  totalEvents: v.number(),
  lastFlaggedAt: v.number(),
  reviewStatus: assessmentFlagReviewStatusValidator,
  reviewedAt: v.union(v.number(), v.null()),
});

const poolQuestionValidator = v.object({
  bankQuestionId: v.id("assessmentQuestionBank"),
  skill: assessmentSkillValidator,
  taskFamily: assessmentTaskFamilyValidator,
  difficulty: assessmentQuestionDifficultyValidator,
  status: assessmentQuestionBankStatusValidator,
  prompt: v.string(),
  itemType: itemTypeValidator,
  sourceTitle: v.string(),
  allowedByDefault: v.boolean(),
  ruleState: v.union(
    v.literal("inherit"),
    v.literal("allowed"),
    v.literal("disabled"),
  ),
  effectiveAllowed: v.boolean(),
  flagSignal: v.union(flagSignalValidator, v.null()),
});

const overviewValidator = v.object({
  definition: v.object({
    definitionId: v.id("assessmentDefinitions"),
    title: v.string(),
    slug: v.string(),
    profile: assessmentProfileValidator,
    visibility: assessmentVisibilityValidator,
  }),
  version: v.object({
    versionId: v.id("assessmentVersions"),
    source: v.union(v.literal("working"), v.literal("published")),
    status: assessmentVersionStatusValidator,
    contentRevision: v.number(),
    mutable: v.boolean(),
  }),
  sections: v.array(poolSectionValidator),
  questions: v.array(poolQuestionValidator),
});

const ruleMutationResultValidator = v.union(
  v.object({
    ok: v.literal(true),
    changed: v.boolean(),
    contentRevision: v.number(),
  }),
  v.object({
    ok: v.literal(false),
    code: v.literal("conflict"),
    currentRevision: v.number(),
  }),
);

type PoolQuestionView = {
  bankQuestionId: Id<"assessmentQuestionBank">;
  skill: Doc<"assessmentQuestionBank">["skill"];
  taskFamily: Doc<"assessmentQuestionBank">["taskFamily"];
  difficulty: Doc<"assessmentQuestionBank">["difficulty"];
  status: Doc<"assessmentQuestionBank">["status"];
  prompt: string;
  itemType: Doc<"assessmentItems">["type"];
  sourceTitle: string;
  allowedByDefault: boolean;
  ruleState: "inherit" | "allowed" | "disabled";
  effectiveAllowed: boolean;
  flagSignal: null | {
    activeCount: number;
    totalEvents: number;
    lastFlaggedAt: number;
    reviewStatus: Doc<"assessmentQuestionFlagSignals">["reviewStatus"];
    reviewedAt: number | null;
  };
};

function allowedByDefault(
  definition: Doc<"assessmentDefinitions">,
  question: Doc<"assessmentQuestionBank">,
) {
  return definition.kind === "full-practice"
    ? question.fullPracticeEligible
    : question.sourceDefinitionId === definition._id;
}

function isLegacyClonedPoolSection(section: Doc<"assessmentSections">) {
  return (
    section.deliveryMode === undefined &&
    section.bankProfile === undefined &&
    section.bankSelectionContract === undefined
  );
}

async function repairInheritedPoolSections(
  ctx: MutationCtx,
  definition: Doc<"assessmentDefinitions">,
  version: Doc<"assessmentVersions">,
  sections: readonly Doc<"assessmentSections">[],
  skill: Doc<"assessmentQuestionBank">["skill"],
) {
  const matchingSections = sections.filter((section) => section.skill === skill);
  let hasRandomBankSection = matchingSections.some(isRandomBankSection);
  let repairedCount = 0;

  if (
    version.cloneSourceVersionId === undefined ||
    !matchingSections.some(isLegacyClonedPoolSection)
  ) {
    return { hasRandomBankSection, repairedCount };
  }

  const sourceVersion = await ctx.db.get(
    "assessmentVersions",
    version.cloneSourceVersionId,
  );
  if (
    sourceVersion === null ||
    sourceVersion.definitionId !== definition._id ||
    sourceVersion.status !== "published"
  ) {
    return { hasRandomBankSection, repairedCount };
  }

  for (const section of matchingSections) {
    if (!isLegacyClonedPoolSection(section)) continue;
    const sourceSection = await ctx.db
      .query("assessmentSections")
      .withIndex("by_version_id_and_section_key", (q) =>
        q
          .eq("versionId", sourceVersion._id)
          .eq("sectionKey", section.sectionKey),
      )
      .unique();
    if (
      sourceSection === null ||
      sourceSection.skill !== section.skill ||
      !isRandomBankSection(sourceSection) ||
      sourceSection.bankProfile !== definition.profile ||
      sourceSection.bankSelectionContract !== 1
    ) {
      continue;
    }
    await ctx.db.patch("assessmentSections", section._id, {
      deliveryMode: "random-bank",
      bankProfile: sourceSection.bankProfile,
      bankSelectionContract: 1,
      ...(sourceSection.bankSeedBatch === undefined
        ? {}
        : { bankSeedBatch: sourceSection.bankSeedBatch }),
    });
    repairedCount += 1;
    hasRandomBankSection = true;
  }

  return { hasRandomBankSection, repairedCount };
}

export const getOverview = query({
  args: { definitionId: v.id("assessmentDefinitions") },
  returns: v.union(v.null(), overviewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "assessment:read");
    const definition = await ctx.db.get(
      "assessmentDefinitions",
      args.definitionId,
    );
    if (definition === null) return null;
    const versionId =
      definition.draftVersionId ?? definition.publishedVersionId;
    if (versionId === undefined) return null;
    const version = await ctx.db.get("assessmentVersions", versionId);
    if (version === null || version.definitionId !== definition._id) return null;

    const [sections, bankRows, rules, signals] = await Promise.all([
      ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_order", (q) =>
          q.eq("versionId", version._id),
        )
        .take(9),
      ctx.db.query("assessmentQuestionBank").take(201),
      ctx.db
        .query("assessmentVersionQuestionRules")
        .withIndex("by_version_id_and_allowed_and_updated_at", (q) =>
          q.eq("versionId", version._id),
        )
        .take(201),
      ctx.db
        .query("assessmentQuestionFlagSignals")
        .withIndex("by_definition_id_and_last_flagged_at", (q) =>
          q.eq("definitionId", definition._id),
        )
        .order("desc")
        .take(201),
    ]);
    if (
      sections.length > 8 ||
      bankRows.length > 200 ||
      rules.length > 200 ||
      signals.length > 200
    ) {
      throw new ConvexError({
        code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const,
      });
    }

    const sectionSkills = new Set(sections.map((section) => section.skill));
    const candidates = bankRows.filter(
      (row) =>
        row.profile === definition.profile && sectionSkills.has(row.skill),
    );
    const ruleByQuestion = new Map(
      rules.map((rule) => [rule.bankQuestionId, rule]),
    );
    const signalByQuestion = new Map(
      signals.map((signal) => [signal.bankQuestionId, signal]),
    );
    const exactAllowed = new Set<Id<"assessmentQuestionBank">>();
    for (const section of sections) {
      if (!isRandomBankSection(section)) continue;
      try {
        const eligible = await listEligibleBankQuestionsForSection(
          ctx,
          section,
        );
        for (const row of eligible) exactAllowed.add(row._id);
      } catch {
        // Validation reports the exact pool failure. The admin view remains usable.
      }
    }

    const sourceDefinitionIds = [
      ...new Set(candidates.map((row) => String(row.sourceDefinitionId))),
    ];
    const sourceTitleById = new Map<string, string>();
    for (const sourceDefinitionId of sourceDefinitionIds) {
      const source = await ctx.db.get(
        "assessmentDefinitions",
        sourceDefinitionId as Id<"assessmentDefinitions">,
      );
      if (source !== null) {
        sourceTitleById.set(sourceDefinitionId, source.adminTitle);
      }
    }

    const questions: PoolQuestionView[] = [];
    for (const row of candidates) {
      const item = await ctx.db.get("assessmentItems", row.sourceItemId);
      if (
        item === null ||
        item.versionId !== row.sourceVersionId ||
        item.sectionId !== row.sourceSectionId
      ) {
        throw new ConvexError({
          code: "QUESTION_BANK_SOURCE_MISSING" as const,
        });
      }
      const rule = ruleByQuestion.get(row._id);
      const signal = signalByQuestion.get(row._id);
      questions.push({
        bankQuestionId: row._id,
        skill: row.skill,
        taskFamily: row.taskFamily,
        difficulty: row.difficulty,
        status: row.status,
        prompt: item.prompt,
        itemType: item.type,
        sourceTitle:
          sourceTitleById.get(String(row.sourceDefinitionId)) ??
          "Published Question Bank source",
        allowedByDefault: allowedByDefault(definition, row),
        ruleState:
          rule === undefined
            ? ("inherit" as const)
            : rule.allowed
              ? ("allowed" as const)
              : ("disabled" as const),
        effectiveAllowed: exactAllowed.has(row._id),
        flagSignal:
          signal === undefined
            ? null
            : {
                activeCount: signal.activeFlagCount,
                totalEvents: signal.totalFlagEvents,
                lastFlaggedAt: signal.lastFlaggedAt,
                reviewStatus: signal.reviewStatus,
                reviewedAt: signal.reviewedAt ?? null,
              },
      });
    }

    return {
      definition: {
        definitionId: definition._id,
        title: definition.adminTitle,
        slug: definition.slug,
        profile: definition.profile,
        visibility: definition.visibility,
      },
      version: {
        versionId: version._id,
        source:
          definition.draftVersionId === version._id
            ? ("working" as const)
            : ("published" as const),
        status: version.status,
        contentRevision: version.contentRevision,
        mutable:
          definition.draftVersionId === version._id &&
          (version.status === "draft" || version.status === "ready"),
      },
      sections: sections.map((section) => {
        const relevant = questions.filter(
          (question) => question.skill === section.skill,
        );
        const allowedCount = relevant.filter(
          (question) => question.effectiveAllowed,
        ).length;
        return {
          sectionId: section._id,
          skill: section.skill,
          title: section.title,
          requiredCount: section.itemCount,
          allowedCount,
          disabledCount: relevant.length - allowedCount,
          spareCount: allowedCount - section.itemCount,
          deliveryMode: section.deliveryMode ?? "fixed",
        };
      }),
      questions,
    };
  },
});

export const setQuestionAllowed = mutation({
  args: {
    definitionId: v.id("assessmentDefinitions"),
    bankQuestionId: v.id("assessmentQuestionBank"),
    allowed: v.boolean(),
    expectedContentRevision: v.number(),
  },
  returns: ruleMutationResultValidator,
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:edit");
    const definition = await ctx.db.get(
      "assessmentDefinitions",
      args.definitionId,
    );
    if (
      definition === null ||
      definition.draftVersionId === undefined
    ) {
      throw new ConvexError({ code: "DRAFT_NOT_AVAILABLE" as const });
    }
    const { version } = await getMutableAssessmentVersion(
      ctx,
      definition.draftVersionId,
    );
    if (version.contentRevision !== args.expectedContentRevision) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentRevision: version.contentRevision,
      };
    }
    const question = await ctx.db.get(
      "assessmentQuestionBank",
      args.bankQuestionId,
    );
    if (
      question === null ||
      question.profile !== definition.profile ||
      (args.allowed && question.status !== "ready")
    ) {
      throw new ConvexError({ code: "QUESTION_BANK_NOT_AVAILABLE" as const });
    }
    const sections = await ctx.db
      .query("assessmentSections")
      .withIndex("by_version_id_and_order", (q) =>
        q.eq("versionId", version._id),
      )
      .take(9);
    if (sections.length > 8) {
      throw new ConvexError({ code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const });
    }
    const poolConfiguration = await repairInheritedPoolSections(
      ctx,
      definition,
      version,
      sections,
      question.skill,
    );
    if (!poolConfiguration.hasRandomBankSection) {
      throw new ConvexError({ code: "QUESTION_BANK_SKILL_NOT_USED" as const });
    }
    const existing = await ctx.db
      .query("assessmentVersionQuestionRules")
      .withIndex("by_version_id_and_bank_question_id", (q) =>
        q
          .eq("versionId", version._id)
          .eq("bankQuestionId", question._id),
      )
      .unique();
    const inherited = allowedByDefault(definition, question);
    const current = existing?.allowed ?? inherited;
    const ruleChanged = current !== args.allowed;
    if (!ruleChanged && poolConfiguration.repairedCount === 0) {
      return {
        ok: true as const,
        changed: false,
        contentRevision: version.contentRevision,
      };
    }
    const now = Date.now();
    if (ruleChanged) {
      if (args.allowed === inherited) {
        if (existing !== null) {
          await ctx.db.delete("assessmentVersionQuestionRules", existing._id);
        }
      } else if (existing === null) {
        await ctx.db.insert("assessmentVersionQuestionRules", {
          versionId: version._id,
          bankQuestionId: question._id,
          allowed: args.allowed,
          updatedBy: actor._id,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.patch("assessmentVersionQuestionRules", existing._id, {
          allowed: args.allowed,
          updatedBy: actor._id,
          updatedAt: now,
        });
      }
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
      action: "update",
      resourceType: "assessment-question-pool",
      resourceId: version._id,
      summary:
        definition.slug +
        " " +
        question.skill +
        " question " +
        (args.allowed ? "allowed" : "disabled") +
        (poolConfiguration.repairedCount > 0
          ? "; inherited question-pool configuration restored"
          : ""),
      actorId: actor._id,
    });
    return {
      ok: true as const,
      changed: true,
      contentRevision,
    };
  },
});

export const reviewFlagSignal = mutation({
  args: {
    definitionId: v.id("assessmentDefinitions"),
    bankQuestionId: v.id("assessmentQuestionBank"),
    expectedLastFlaggedAt: v.number(),
    decision: v.union(v.literal("reviewed"), v.literal("dismissed")),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), reviewedAt: v.number() }),
    v.object({
      ok: v.literal(false),
      code: v.literal("conflict"),
      currentLastFlaggedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "assessment:review");
    const signal = await ctx.db
      .query("assessmentQuestionFlagSignals")
      .withIndex("by_definition_id_and_bank_question_id", (q) =>
        q
          .eq("definitionId", args.definitionId)
          .eq("bankQuestionId", args.bankQuestionId),
      )
      .unique();
    if (signal === null) {
      throw new ConvexError({ code: "QUESTION_FLAG_NOT_FOUND" as const });
    }
    if (signal.lastFlaggedAt !== args.expectedLastFlaggedAt) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentLastFlaggedAt: signal.lastFlaggedAt,
      };
    }
    const reviewedAt = Date.now();
    await ctx.db.patch("assessmentQuestionFlagSignals", signal._id, {
      reviewStatus: args.decision,
      reviewedBy: actor._id,
      reviewedAt,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "review",
      resourceType: "assessment-question-flag",
      resourceId: signal._id,
      summary: "Question flag signal marked " + args.decision,
      actorId: actor._id,
    });
    return { ok: true as const, reviewedAt };
  },
});
