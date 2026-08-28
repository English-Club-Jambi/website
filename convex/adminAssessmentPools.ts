import { ConvexError, v } from "convex/values";

import {
  assessmentFlagReviewStatusValidator,
  assessmentOptionValidator,
  assessmentProfileValidator,
  assessmentQuestionBankStatusValidator,
  assessmentQuestionDependencyRoleValidator,
  assessmentQuestionDifficultyValidator,
  assessmentSkillValidator,
  assessmentTaskFamilyValidator,
  assessmentVersionStatusValidator,
  assessmentVisibilityValidator,
  clozeAnswerValidator,
  clozeGapValidator,
  constructedResponseModeValidator,
  itemTypeValidator,
  questionAudioValidator,
  stimulusKindValidator,
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
  questionAllowedByDefaultForFormat,
  questionBankRowIsReadyForSelection,
  resolveReadyQuestionAudio,
} from "./lib/assessmentQuestionBank";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import { projectReadyQuestionIllustration } from "./lib/media";

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
  dependency: v.union(
    v.object({
      groupKey: v.string(),
      role: assessmentQuestionDependencyRoleValidator,
      parentBankQuestionId: v.union(v.id("assessmentQuestionBank"), v.null()),
    }),
    v.null(),
  ),
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

const reviewImageValidator = v.object({
  mediaId: v.id("mediaAssets"),
  publicUrl: v.string(),
  alt: v.string(),
  width: v.number(),
  height: v.number(),
});

const reviewContentBaseValidator = v.object({
  prompt: v.string(),
  explanation: v.union(v.string(), v.null()),
});

const reviewContentValidator = v.union(
  reviewContentBaseValidator.extend({
    type: v.literal("single-choice"),
    options: v.array(assessmentOptionValidator),
    correctChoiceKey: v.string(),
  }),
  reviewContentBaseValidator.extend({
    type: v.literal("multiple-select"),
    options: v.array(assessmentOptionValidator),
    selectionMin: v.number(),
    selectionMax: v.number(),
    correctChoiceKeys: v.array(v.string()),
  }),
  reviewContentBaseValidator.extend({
    type: v.literal("cloze-select"),
    stemParts: v.array(v.string()),
    gaps: v.array(clozeGapValidator),
    correctGapAnswers: v.array(clozeAnswerValidator),
  }),
  reviewContentBaseValidator.extend({
    type: v.literal("sentence-build"),
    tokens: v.array(assessmentOptionValidator),
    acceptedTokenOrders: v.array(v.array(v.string())),
  }),
  reviewContentBaseValidator.extend({
    type: v.literal("constructed-response"),
    responseMode: constructedResponseModeValidator,
    minimumWords: v.number(),
    recommendedWords: v.number(),
    maximumCharacters: v.number(),
    preparationSeconds: v.union(v.number(), v.null()),
    responseSeconds: v.union(v.number(), v.null()),
    rubric: v.object({
      maxPoints: v.number(),
      minimumWords: v.number(),
      targetTerms: v.array(v.string()),
      sampleResponse: v.string(),
    }),
  }),
);

const questionReviewValidator = v.object({
  bankQuestionId: v.id("assessmentQuestionBank"),
  bankKey: v.string(),
  skill: assessmentSkillValidator,
  taskFamily: assessmentTaskFamilyValidator,
  difficulty: assessmentQuestionDifficultyValidator,
  status: assessmentQuestionBankStatusValidator,
  profile: assessmentProfileValidator,
  fullPracticeEligible: v.boolean(),
  origin: v.union(v.literal("assessment-source"), v.literal("bank-authored")),
  tags: v.array(v.string()),
  content: reviewContentValidator,
  source: v.object({
    title: v.string(),
    visibility: assessmentVisibilityValidator,
    versionStatus: assessmentVersionStatusValidator,
    sectionTitle: v.string(),
    itemKey: v.string(),
  }),
  stimulus: v.union(
    v.object({
      kind: stimulusKindValidator,
      title: v.union(v.string(), v.null()),
      body: v.union(v.string(), v.null()),
      transcript: v.union(v.string(), v.null()),
      alt: v.union(v.string(), v.null()),
      image: v.union(reviewImageValidator, v.null()),
    }),
    v.null(),
  ),
  illustration: v.union(reviewImageValidator, v.null()),
  audio: v.union(questionAudioValidator, v.null()),
  dependency: v.union(
    v.object({
      groupKey: v.string(),
      role: assessmentQuestionDependencyRoleValidator,
      parentPrompt: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  updatedAt: v.number(),
});

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
  dependency: null | {
    groupKey: string;
    role: "anchor" | "follow-up";
    parentBankQuestionId: Id<"assessmentQuestionBank"> | null;
  };
  flagSignal: null | {
    activeCount: number;
    totalEvents: number;
    lastFlaggedAt: number;
    reviewStatus: Doc<"assessmentQuestionFlagSignals">["reviewStatus"];
    reviewedAt: number | null;
  };
};

function projectReviewContent(
  item: Doc<"assessmentItems">,
  key: Doc<"assessmentAnswerKeys">,
) {
  const base = {
    prompt: item.prompt,
    explanation: item.explanation ?? null,
  };
  switch (item.type) {
    case "single-choice":
      if (key.kind !== "choice" || key.correctChoiceKeys.length !== 1) break;
      return {
        ...base,
        type: item.type,
        options: item.options,
        correctChoiceKey: key.correctChoiceKeys[0],
      };
    case "multiple-select":
      if (key.kind !== "multi-choice") break;
      return {
        ...base,
        type: item.type,
        options: item.options,
        selectionMin: item.selectionMin,
        selectionMax: item.selectionMax,
        correctChoiceKeys: key.correctChoiceKeys,
      };
    case "cloze-select":
      if (key.kind !== "cloze") break;
      return {
        ...base,
        type: item.type,
        stemParts: item.stemParts,
        gaps: item.gaps,
        correctGapAnswers: key.correctGapAnswers,
      };
    case "sentence-build":
      if (key.kind !== "token-order") break;
      return {
        ...base,
        type: item.type,
        tokens: item.tokens,
        acceptedTokenOrders: key.acceptedTokenOrders,
      };
    case "constructed-response":
      if (key.kind !== "text-rubric" || key.rubricMode !== item.responseMode) {
        break;
      }
      return {
        ...base,
        type: item.type,
        responseMode: item.responseMode,
        minimumWords: item.minimumWords,
        recommendedWords: item.recommendedWords,
        maximumCharacters: item.maximumCharacters,
        preparationSeconds: item.preparationSeconds ?? null,
        responseSeconds: item.responseSeconds ?? null,
        rubric: {
          maxPoints: key.maxPoints,
          minimumWords: key.minimumWords,
          targetTerms: key.targetTerms,
          sampleResponse: key.sampleResponse,
        },
      };
  }
  throw new ConvexError({ code: "QUESTION_BANK_SOURCE_MISSING" as const });
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
  const matchingSections = sections.filter(
    (section) => section.skill === skill,
  );
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
    if (version === null || version.definitionId !== definition._id)
      return null;

    const [sections, bankRows, rules, signals] = await Promise.all([
      ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_order", (q) =>
          q.eq("versionId", version._id),
        )
        .take(9),
      ctx.db
        .query("assessmentQuestionBank")
        .withIndex("by_profile_and_status_and_updated_at", (q) =>
          q.eq("profile", definition.profile).eq("status", "ready"),
        )
        .take(201),
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
    const candidates = bankRows.filter((row) => sectionSkills.has(row.skill));
    const ruleByQuestion = new Map(
      rules.map((rule) => [rule.bankQuestionId, rule]),
    );
    const signalByQuestion = new Map(
      signals.map((signal) => [signal.bankQuestionId, signal]),
    );
    const readyForSelectionIds = new Set<Id<"assessmentQuestionBank">>();
    for (const candidate of candidates) {
      if (await questionBankRowIsReadyForSelection(ctx, candidate)) {
        readyForSelectionIds.add(candidate._id);
      }
    }
    const effectivelyAllowedFingerprints = new Set<string>();
    for (const section of sections) {
      if (!isRandomBankSection(section)) continue;
      try {
        const eligible = await listEligibleBankQuestionsForSection(
          ctx,
          section,
        );
        for (const row of eligible) {
          effectivelyAllowedFingerprints.add(row.contentFingerprint);
        }
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

    const rowsByFingerprint = new Map<
      string,
      Array<Doc<"assessmentQuestionBank">>
    >();
    const orderedCandidates = [...candidates].sort(
      (left, right) =>
        Number(readyForSelectionIds.has(right._id)) -
          Number(readyForSelectionIds.has(left._id)) ||
        left._creationTime - right._creationTime ||
        String(left._id).localeCompare(String(right._id)),
    );
    for (const row of orderedCandidates) {
      const group = rowsByFingerprint.get(row.contentFingerprint) ?? [];
      group.push(row);
      rowsByFingerprint.set(row.contentFingerprint, group);
    }

    const questions: PoolQuestionView[] = [];
    for (const group of rowsByFingerprint.values()) {
      const row = group[0];
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
      const groupRules = group
        .map((candidate) => ruleByQuestion.get(candidate._id))
        .filter((rule) => rule !== undefined);
      const ruleState = groupRules.some((rule) => !rule.allowed)
        ? ("disabled" as const)
        : groupRules.some((rule) => rule.allowed)
          ? ("allowed" as const)
          : ("inherit" as const);
      const groupSignals = group
        .map((candidate) => signalByQuestion.get(candidate._id))
        .filter((signal) => signal !== undefined)
        .sort((left, right) => right.lastFlaggedAt - left.lastFlaggedAt);
      const latestSignal = groupSignals[0];
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
        allowedByDefault: group.some(
          (candidate) =>
            readyForSelectionIds.has(candidate._id) &&
            questionAllowedByDefaultForFormat(definition, candidate),
        ),
        ruleState,
        effectiveAllowed: effectivelyAllowedFingerprints.has(
          row.contentFingerprint,
        ),
        dependency:
          row.dependencyGroupKey === undefined ||
          row.dependencyRole === undefined
            ? null
            : {
                groupKey: row.dependencyGroupKey,
                role: row.dependencyRole,
                parentBankQuestionId: row.parentBankQuestionId ?? null,
              },
        flagSignal:
          latestSignal === undefined
            ? null
            : {
                activeCount: groupSignals.reduce(
                  (count, signal) => count + signal.activeFlagCount,
                  0,
                ),
                totalEvents: groupSignals.reduce(
                  (count, signal) => count + signal.totalFlagEvents,
                  0,
                ),
                lastFlaggedAt: latestSignal.lastFlaggedAt,
                reviewStatus: latestSignal.reviewStatus,
                reviewedAt: latestSignal.reviewedAt ?? null,
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

export const getQuestionReview = query({
  args: {
    definitionId: v.id("assessmentDefinitions"),
    bankQuestionId: v.id("assessmentQuestionBank"),
  },
  returns: v.union(v.null(), questionReviewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "assessment:read");
    const [definition, question] = await Promise.all([
      ctx.db.get("assessmentDefinitions", args.definitionId),
      ctx.db.get("assessmentQuestionBank", args.bankQuestionId),
    ]);
    if (
      definition === null ||
      question === null ||
      question.status !== "ready" ||
      question.profile !== definition.profile
    ) {
      return null;
    }

    const versionId =
      definition.draftVersionId ?? definition.publishedVersionId;
    if (versionId === undefined) {
      return null;
    }
    const [version, sections] = await Promise.all([
      ctx.db.get("assessmentVersions", versionId),
      ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_order", (q) =>
          q.eq("versionId", versionId),
        )
        .take(9),
    ]);
    if (
      version === null ||
      version.definitionId !== definition._id ||
      sections.length > 8 ||
      !sections.some(
        (section) =>
          section.skill === question.skill && isRandomBankSection(section),
      )
    ) {
      return null;
    }

    const [
      item,
      answerKey,
      sourceDefinition,
      sourceVersion,
      sourceSection,
      illustration,
    ] = await Promise.all([
      ctx.db.get("assessmentItems", question.sourceItemId),
      ctx.db
        .query("assessmentAnswerKeys")
        .withIndex("by_item_id", (q) => q.eq("itemId", question.sourceItemId))
        .unique(),
      ctx.db.get("assessmentDefinitions", question.sourceDefinitionId),
      ctx.db.get("assessmentVersions", question.sourceVersionId),
      ctx.db.get("assessmentSections", question.sourceSectionId),
      projectReadyQuestionIllustration(ctx, question.illustrationMediaId),
    ]);
    if (
      item === null ||
      answerKey === null ||
      sourceDefinition === null ||
      sourceVersion === null ||
      sourceSection === null ||
      item.versionId !== question.sourceVersionId ||
      item.sectionId !== question.sourceSectionId ||
      answerKey.versionId !== question.sourceVersionId ||
      sourceVersion.definitionId !== question.sourceDefinitionId ||
      sourceSection.versionId !== question.sourceVersionId ||
      sourceSection.skill !== question.skill ||
      sourceDefinition.profile !== question.profile
    ) {
      return null;
    }

    const stimulus =
      item.stimulusId === undefined
        ? null
        : await ctx.db.get("assessmentStimuli", item.stimulusId);
    if (
      item.stimulusId !== undefined &&
      (stimulus === null ||
        stimulus.versionId !== item.versionId ||
        stimulus.sectionId !== item.sectionId)
    ) {
      return null;
    }
    const stimulusImage =
      stimulus?.kind === "image"
        ? await projectReadyQuestionIllustration(ctx, stimulus.mediaId)
        : null;
    const audio = await resolveReadyQuestionAudio(ctx, question, item);
    const parentQuestion =
      question.parentBankQuestionId === undefined
        ? null
        : await ctx.db.get(
            "assessmentQuestionBank",
            question.parentBankQuestionId,
          );
    const parentItem =
      parentQuestion === null ||
      question.dependencyGroupKey === undefined ||
      parentQuestion.profile !== question.profile ||
      parentQuestion.skill !== question.skill ||
      parentQuestion.dependencyGroupKey !== question.dependencyGroupKey ||
      parentQuestion.dependencyRole !== "anchor"
        ? null
        : await ctx.db.get("assessmentItems", parentQuestion.sourceItemId);
    const parentPrompt =
      parentQuestion !== null &&
      parentItem !== null &&
      parentItem._id === parentQuestion.sourceItemId &&
      parentItem.versionId === parentQuestion.sourceVersionId &&
      parentItem.sectionId === parentQuestion.sourceSectionId
        ? parentItem.prompt
        : null;

    return {
      bankQuestionId: question._id,
      bankKey: question.bankKey,
      skill: question.skill,
      taskFamily: question.taskFamily,
      difficulty: question.difficulty,
      status: question.status,
      profile: question.profile,
      fullPracticeEligible: question.fullPracticeEligible,
      origin: question.origin ?? "assessment-source",
      tags: question.tags,
      content: projectReviewContent(item, answerKey),
      source: {
        title:
          question.origin === "bank-authored"
            ? "Question Bank original"
            : sourceDefinition.adminTitle,
        visibility: sourceDefinition.visibility,
        versionStatus: sourceVersion.status,
        sectionTitle: sourceSection.title,
        itemKey: item.itemKey,
      },
      stimulus:
        stimulus === null
          ? null
          : {
              kind: stimulus.kind,
              title: stimulus.title ?? null,
              body: stimulus.body ?? null,
              transcript: stimulus.transcript ?? null,
              alt: stimulus.alt ?? null,
              image: stimulusImage,
            },
      illustration,
      audio,
      dependency:
        question.dependencyGroupKey === undefined ||
        question.dependencyRole === undefined
          ? null
          : {
              groupKey: question.dependencyGroupKey,
              role: question.dependencyRole,
              parentPrompt,
            },
      updatedAt: question.updatedAt,
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
    if (definition === null || definition.draftVersionId === undefined) {
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
    if (question === null || question.profile !== definition.profile) {
      throw new ConvexError({ code: "QUESTION_BANK_NOT_AVAILABLE" as const });
    }
    const duplicateRows = await ctx.db
      .query("assessmentQuestionBank")
      .withIndex("by_content_fingerprint", (q) =>
        q.eq("contentFingerprint", question.contentFingerprint),
      )
      .take(201);
    if (duplicateRows.length > 200) {
      throw new ConvexError({
        code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const,
      });
    }
    const questionGroup = duplicateRows
      .filter(
        (candidate) =>
          candidate.profile === definition.profile &&
          candidate.skill === question.skill,
      )
      .sort(
        (left, right) =>
          Number(right.status === "ready") - Number(left.status === "ready") ||
          left._creationTime - right._creationTime ||
          String(left._id).localeCompare(String(right._id)),
      );
    const readyQuestionGroup: Array<Doc<"assessmentQuestionBank">> = [];
    for (const candidate of questionGroup) {
      if (await questionBankRowIsReadyForSelection(ctx, candidate)) {
        readyQuestionGroup.push(candidate);
      }
    }
    if (
      questionGroup.length === 0 ||
      (args.allowed && readyQuestionGroup.length === 0)
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
      throw new ConvexError({
        code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const,
      });
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
    const allRules = await ctx.db
      .query("assessmentVersionQuestionRules")
      .withIndex("by_version_id_and_allowed_and_updated_at", (q) =>
        q.eq("versionId", version._id),
      )
      .take(201);
    if (allRules.length > 200) {
      throw new ConvexError({
        code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const,
      });
    }
    const groupIds = new Set(questionGroup.map((candidate) => candidate._id));
    const existingRules = allRules.filter((rule) =>
      groupIds.has(rule.bankQuestionId),
    );
    const inherited = readyQuestionGroup.some((candidate) =>
      questionAllowedByDefaultForFormat(definition, candidate),
    );
    const current = existingRules.some((rule) => !rule.allowed)
      ? false
      : existingRules.some((rule) => rule.allowed)
        ? true
        : inherited;
    const representative = readyQuestionGroup[0] ?? questionGroup[0];
    const canonicalRule = existingRules.length === 1 ? existingRules[0] : null;
    const needsCanonicalization =
      args.allowed === inherited
        ? existingRules.length > 0
        : canonicalRule === null ||
          canonicalRule.bankQuestionId !== representative._id ||
          canonicalRule.allowed !== args.allowed;
    const ruleChanged = current !== args.allowed || needsCanonicalization;
    if (!ruleChanged && poolConfiguration.repairedCount === 0) {
      return {
        ok: true as const,
        changed: false,
        contentRevision: version.contentRevision,
      };
    }
    const now = Date.now();
    if (ruleChanged) {
      for (const existingRule of existingRules) {
        await ctx.db.delete("assessmentVersionQuestionRules", existingRule._id);
      }
      if (args.allowed !== inherited) {
        await ctx.db.insert("assessmentVersionQuestionRules", {
          versionId: version._id,
          bankQuestionId: representative._id,
          allowed: args.allowed,
          updatedBy: actor._id,
          createdAt: now,
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
    const [definition, question] = await Promise.all([
      ctx.db.get("assessmentDefinitions", args.definitionId),
      ctx.db.get("assessmentQuestionBank", args.bankQuestionId),
    ]);
    if (
      definition === null ||
      question === null ||
      question.profile !== definition.profile
    ) {
      throw new ConvexError({ code: "QUESTION_FLAG_NOT_FOUND" as const });
    }
    const [duplicateRows, definitionSignals] = await Promise.all([
      ctx.db
        .query("assessmentQuestionBank")
        .withIndex("by_content_fingerprint", (q) =>
          q.eq("contentFingerprint", question.contentFingerprint),
        )
        .take(201),
      ctx.db
        .query("assessmentQuestionFlagSignals")
        .withIndex("by_definition_id_and_last_flagged_at", (q) =>
          q.eq("definitionId", args.definitionId),
        )
        .order("desc")
        .take(201),
    ]);
    if (duplicateRows.length > 200 || definitionSignals.length > 200) {
      throw new ConvexError({
        code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const,
      });
    }
    const groupIds = new Set(
      duplicateRows
        .filter(
          (candidate) =>
            candidate.profile === definition.profile &&
            candidate.skill === question.skill,
        )
        .map((candidate) => candidate._id),
    );
    const signals = definitionSignals.filter((signal) =>
      groupIds.has(signal.bankQuestionId),
    );
    const latestSignal = signals[0];
    if (latestSignal === undefined) {
      throw new ConvexError({ code: "QUESTION_FLAG_NOT_FOUND" as const });
    }
    if (latestSignal.lastFlaggedAt !== args.expectedLastFlaggedAt) {
      return {
        ok: false as const,
        code: "conflict" as const,
        currentLastFlaggedAt: latestSignal.lastFlaggedAt,
      };
    }
    const reviewedAt = Date.now();
    for (const signal of signals) {
      await ctx.db.patch("assessmentQuestionFlagSignals", signal._id, {
        reviewStatus: args.decision,
        reviewedBy: actor._id,
        reviewedAt,
      });
    }
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "review",
      resourceType: "assessment-question-flag",
      resourceId: latestSignal._id,
      summary: "Question flag signal marked " + args.decision,
      actorId: actor._id,
    });
    return { ok: true as const, reviewedAt };
  },
});
