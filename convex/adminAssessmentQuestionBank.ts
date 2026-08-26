import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v, type Infer } from "convex/values";

import { isTaskFamilyForSkill } from "../content/assessment-task-families";
import {
  assessmentProfileValidator,
  clozeAnswerValidator,
  clozeGapValidator,
  constructedResponseModeValidator,
  assessmentOptionValidator,
  assessmentQuestionBankStatusValidator,
  assessmentQuestionDifficultyValidator,
  assessmentSkillValidator,
  assessmentTaskFamilyValidator,
  itemTypeValidator,
  questionAudioValidator,
} from "./assessmentValidators";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import {
  normalizeBankPrompt,
  normalizeQuestionBankTags,
  questionBankRowIsReadyForSelection,
  questionBankSourceIsReady,
  questionContentFingerprint,
  QUESTION_BANK_AUTHORING_LEDGER_SLUG,
  resolveReadyQuestionAudio,
} from "./lib/assessmentQuestionBank";
import {
  normalizeBoundedText,
  normalizeKey,
  normalizeOptions,
  normalizeRequestId,
  requireIntegerInRange,
} from "./lib/assessmentModel";
import {
  projectReadyQuestionAudio,
  projectReadyQuestionIllustration,
} from "./lib/media";

const illustrationValidator = v.object({
  mediaId: v.id("mediaAssets"),
  publicUrl: v.string(),
  alt: v.string(),
  width: v.number(),
  height: v.number(),
});

const bankContentBaseValidator = v.object({
  prompt: v.string(),
  explanation: v.union(v.string(), v.null()),
});

const bankEditableContentValidator = v.union(
  bankContentBaseValidator.extend({
    type: v.literal("single-choice"),
    options: v.array(assessmentOptionValidator),
    correctChoiceKey: v.string(),
  }),
  bankContentBaseValidator.extend({
    type: v.literal("multiple-select"),
    options: v.array(assessmentOptionValidator),
    selectionMin: v.number(),
    selectionMax: v.number(),
    correctChoiceKeys: v.array(v.string()),
  }),
  bankContentBaseValidator.extend({
    type: v.literal("cloze-select"),
    stemParts: v.array(v.string()),
    gaps: v.array(clozeGapValidator),
    correctGapAnswers: v.array(clozeAnswerValidator),
  }),
  bankContentBaseValidator.extend({
    type: v.literal("sentence-build"),
    tokens: v.array(assessmentOptionValidator),
    acceptedTokenOrders: v.array(v.array(v.string())),
  }),
  bankContentBaseValidator.extend({
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

type BankEditableContent = Infer<typeof bankEditableContentValidator>;

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
  audio: v.union(questionAudioValidator, v.null()),
  content: bankEditableContentValidator,
  tags: v.array(v.string()),
  prompt: v.string(),
  itemType: itemTypeValidator,
  options: v.array(assessmentOptionValidator),
  correctChoiceKey: v.union(v.string(), v.null()),
  explanation: v.union(v.string(), v.null()),
  points: v.number(),
  sourceDefinitionId: v.id("assessmentDefinitions"),
  sourceVersionId: v.id("assessmentVersions"),
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

function projectBankEditableContent(
  item: Doc<"assessmentItems">,
  key: Doc<"assessmentAnswerKeys">,
): BankEditableContent {
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
      if (
        key.kind !== "text-rubric" ||
        key.rubricMode !== item.responseMode
      ) {
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
  const audio = await resolveReadyQuestionAudio(ctx, row, item);
  const options =
    item.type === "single-choice" || item.type === "multiple-select"
      ? item.options
      : [];
  const correctChoiceKey =
    key.kind === "choice" && key.correctChoiceKeys.length === 1
      ? key.correctChoiceKeys[0]
      : null;
  const content = projectBankEditableContent(item, key);
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
    audio,
    content,
    tags: row.tags,
    prompt: item.prompt,
    itemType: item.type,
    options,
    correctChoiceKey,
    explanation: item.explanation ?? null,
    points: key.kind === "text-rubric" ? key.maxPoints : (key.points ?? 1),
    sourceDefinitionId: definition._id,
    sourceVersionId: row.sourceVersionId,
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

function normalizeAuthoredQuestion(args: {
  prompt: string;
  options: Array<{ key: string; label: string }>;
  correctChoiceKey: string;
  explanation: string | null;
}) {
  const prompt = normalizeBoundedText(args.prompt, "prompt", 2, 4_000);
  const options = normalizeOptions(args.options);
  if (options.length !== 4) {
    throw new ConvexError({ code: "QUESTION_BANK_OPTION_COUNT_INVALID" as const });
  }
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
  return { prompt, options, correctChoiceKey, explanation };
}

function normalizeEditableOptions(
  options: Array<{ key: string; label: string }>,
  field = "options",
) {
  const normalized = normalizeOptions(options);
  const labels = normalized.map((option) =>
    option.label.toLocaleLowerCase("en"),
  );
  if (new Set(labels).size !== labels.length) {
    throw new ConvexError({ code: "DUPLICATE_OPTION_LABEL" as const, field });
  }
  return normalized;
}

function normalizeEditableContent(content: BankEditableContent) {
  const prompt = normalizeBoundedText(content.prompt, "prompt", 2, 4_000);
  const explanation =
    content.explanation === null
      ? null
      : normalizeBoundedText(content.explanation, "explanation", 2, 4_000);
  if (content.type === "single-choice") {
    const options = normalizeEditableOptions(content.options);
    const correctChoiceKey = normalizeKey(
      content.correctChoiceKey,
      "correctChoiceKey",
    );
    if (!options.some((option) => option.key === correctChoiceKey)) {
      throw new ConvexError({ code: "ANSWER_NOT_IN_OPTIONS" as const });
    }
    return {
      type: content.type,
      prompt,
      explanation,
      options,
      correctChoiceKey,
    } as const;
  }
  if (content.type === "multiple-select") {
    const options = normalizeEditableOptions(content.options);
    const selectionMin = requireIntegerInRange(
      content.selectionMin,
      1,
      options.length,
      "selectionMin",
    );
    const selectionMax = requireIntegerInRange(
      content.selectionMax,
      selectionMin,
      options.length,
      "selectionMax",
    );
    const correctChoiceKeys = content.correctChoiceKeys.map((key, index) =>
      normalizeKey(key, `correctChoiceKeys.${index}`),
    );
    if (
      correctChoiceKeys.length < selectionMin ||
      correctChoiceKeys.length > selectionMax ||
      new Set(correctChoiceKeys).size !== correctChoiceKeys.length ||
      correctChoiceKeys.some(
        (key) => !options.some((option) => option.key === key),
      )
    ) {
      throw new ConvexError({ code: "ANSWER_NOT_IN_OPTIONS" as const });
    }
    return {
      type: content.type,
      prompt,
      explanation,
      options,
      selectionMin,
      selectionMax,
      correctChoiceKeys,
    } as const;
  }
  if (content.type === "cloze-select") {
    if (
      content.gaps.length < 1 ||
      content.gaps.length > 12 ||
      content.stemParts.length !== content.gaps.length + 1
    ) {
      throw new ConvexError({ code: "QUESTION_BANK_CLOZE_INVALID" as const });
    }
    const stemParts = content.stemParts.map((part) => {
      const normalized = part.replace(/\r\n/g, "\n");
      if (
        normalized.length > 2_000 ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized)
      ) {
        throw new ConvexError({ code: "QUESTION_BANK_CLOZE_INVALID" as const });
      }
      return normalized;
    });
    const gaps = content.gaps.map((gap, index) => ({
      key: normalizeKey(gap.key, `gaps.${index}.key`),
      options: normalizeEditableOptions(gap.options, `gaps.${index}.options`),
    }));
    if (new Set(gaps.map((gap) => gap.key)).size !== gaps.length) {
      throw new ConvexError({ code: "QUESTION_BANK_CLOZE_INVALID" as const });
    }
    const answerByGap = new Map<string, string>();
    for (const [index, answer] of content.correctGapAnswers.entries()) {
      const gapKey = normalizeKey(
        answer.gapKey,
        `correctGapAnswers.${index}.gapKey`,
      );
      const choiceKey = normalizeKey(
        answer.choiceKey,
        `correctGapAnswers.${index}.choiceKey`,
      );
      if (answerByGap.has(gapKey)) {
        throw new ConvexError({ code: "QUESTION_BANK_CLOZE_INVALID" as const });
      }
      answerByGap.set(gapKey, choiceKey);
    }
    if (answerByGap.size !== gaps.length) {
      throw new ConvexError({ code: "QUESTION_BANK_CLOZE_INVALID" as const });
    }
    const correctGapAnswers = gaps.map((gap) => {
      const choiceKey = answerByGap.get(gap.key);
      if (
        choiceKey === undefined ||
        !gap.options.some((option) => option.key === choiceKey)
      ) {
        throw new ConvexError({ code: "QUESTION_BANK_CLOZE_INVALID" as const });
      }
      return { gapKey: gap.key, choiceKey };
    });
    return {
      type: content.type,
      prompt,
      explanation,
      stemParts,
      gaps,
      correctGapAnswers,
    } as const;
  }
  if (content.type === "sentence-build") {
    if (content.tokens.length < 2 || content.tokens.length > 30) {
      throw new ConvexError({ code: "QUESTION_BANK_TOKENS_INVALID" as const });
    }
    const tokens = content.tokens.map((token, index) => ({
      key: normalizeKey(token.key, `tokens.${index}.key`),
      label: normalizeBoundedText(token.label, `tokens.${index}.label`, 1, 200),
    }));
    const tokenKeys = tokens.map((token) => token.key);
    if (
      new Set(tokenKeys).size !== tokenKeys.length ||
      content.acceptedTokenOrders.length < 1 ||
      content.acceptedTokenOrders.length > 8
    ) {
      throw new ConvexError({ code: "QUESTION_BANK_TOKENS_INVALID" as const });
    }
    const tokenKeySet = new Set(tokenKeys);
    const acceptedTokenOrders = content.acceptedTokenOrders.map(
      (order, orderIndex) => {
        const normalized = order.map((key, keyIndex) =>
          normalizeKey(key, `acceptedTokenOrders.${orderIndex}.${keyIndex}`),
        );
        if (
          normalized.length !== tokenKeys.length ||
          new Set(normalized).size !== normalized.length ||
          normalized.some((key) => !tokenKeySet.has(key))
        ) {
          throw new ConvexError({ code: "QUESTION_BANK_TOKENS_INVALID" as const });
        }
        return normalized;
      },
    );
    if (
      new Set(acceptedTokenOrders.map((order) => order.join("\u001f"))).size !==
      acceptedTokenOrders.length
    ) {
      throw new ConvexError({ code: "QUESTION_BANK_TOKENS_INVALID" as const });
    }
    return {
      type: content.type,
      prompt,
      explanation,
      tokens,
      acceptedTokenOrders,
    } as const;
  }
  const minimumWords = requireIntegerInRange(
    content.minimumWords,
    0,
    5_000,
    "minimumWords",
  );
  const recommendedWords = requireIntegerInRange(
    content.recommendedWords,
    minimumWords,
    5_000,
    "recommendedWords",
  );
  const maximumCharacters = requireIntegerInRange(
    content.maximumCharacters,
    100,
    40_000,
    "maximumCharacters",
  );
  const optionalSeconds = (value: number | null, field: string) =>
    value === null ? null : requireIntegerInRange(value, 0, 1_800, field);
  const rubricMinimumWords = requireIntegerInRange(
    content.rubric.minimumWords,
    0,
    5_000,
    "rubric.minimumWords",
  );
  if (content.rubric.targetTerms.length > 30) {
    throw new ConvexError({ code: "QUESTION_BANK_RUBRIC_INVALID" as const });
  }
  const targetTerms = content.rubric.targetTerms.map((term, index) =>
    normalizeBoundedText(term, `rubric.targetTerms.${index}`, 1, 100),
  );
  if (new Set(targetTerms.map((term) => term.toLowerCase())).size !== targetTerms.length) {
    throw new ConvexError({ code: "QUESTION_BANK_RUBRIC_INVALID" as const });
  }
  return {
    type: content.type,
    prompt,
    explanation,
    responseMode: content.responseMode,
    minimumWords,
    recommendedWords,
    maximumCharacters,
    preparationSeconds: optionalSeconds(
      content.preparationSeconds,
      "preparationSeconds",
    ),
    responseSeconds: optionalSeconds(content.responseSeconds, "responseSeconds"),
    rubric: {
      maxPoints: requireIntegerInRange(
        content.rubric.maxPoints,
        1,
        100,
        "rubric.maxPoints",
      ),
      minimumWords: rubricMinimumWords,
      targetTerms,
      sampleResponse: normalizeBoundedText(
        content.rubric.sampleResponse,
        "rubric.sampleResponse",
        2,
        8_000,
      ),
    },
  } as const;
}

function fingerprintValuesForContent(content: BankEditableContent) {
  switch (content.type) {
    case "single-choice":
    case "multiple-select":
      return content.options.map((option) => option.label);
    case "cloze-select":
      return [
        ...content.stemParts,
        ...content.gaps.flatMap((gap) =>
          gap.options.map((option) => option.label),
        ),
      ];
    case "sentence-build":
      return content.tokens.map((token) => token.label);
    case "constructed-response":
      return [content.responseMode, content.rubric.sampleResponse];
  }
}

async function validateQuestionMedia(
  ctx: MutationCtx,
  args: {
    skill: "reading" | "listening" | "writing" | "speaking";
    illustrationMediaId: Id<"mediaAssets"> | undefined;
    audioMediaId: Id<"mediaAssets"> | undefined;
  },
) {
  if (args.illustrationMediaId !== undefined) {
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
  if (args.audioMediaId !== undefined && args.skill !== "listening") {
    throw new ConvexError({
      code: "QUESTION_BANK_AUDIO_SKILL_MISMATCH" as const,
    });
  }
  const audio = await projectReadyQuestionAudio(ctx, args.audioMediaId);
  if (args.audioMediaId !== undefined && audio === null) {
    throw new ConvexError({ code: "QUESTION_BANK_AUDIO_INVALID" as const });
  }
  return audio;
}

async function insertAuthoringSource(
  ctx: MutationCtx,
  args: {
    actorId: Id<"adminUsers">;
    skill: "reading" | "listening" | "writing" | "speaking";
    sourceKey: string;
    prompt: string;
    options: Array<{ key: string; label: string }>;
    correctChoiceKey: string;
    explanation?: string;
    audioMediaId?: Id<"mediaAssets">;
    now: number;
  },
) {
  const { definition, version, section } = await getAuthoringLedgerSection(
    ctx,
    args.actorId,
    args.skill,
    args.now,
  );
  const safeSourceKey = args.sourceKey
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  if (safeSourceKey.length < 3) {
    throw new ConvexError({ code: "QUESTION_BANK_SOURCE_KEY_INVALID" as const });
  }
  let stimulusId: Id<"assessmentStimuli"> | undefined;
  if (args.skill === "listening" && args.audioMediaId !== undefined) {
    const audio = await projectReadyQuestionAudio(ctx, args.audioMediaId);
    if (audio === null) {
      throw new ConvexError({ code: "QUESTION_BANK_AUDIO_INVALID" as const });
    }
    stimulusId = await ctx.db.insert("assessmentStimuli", {
      versionId: version._id,
      sectionId: section._id,
      stimulusKey: `${safeSourceKey}-audio`,
      kind: "audio",
      order: section.itemCount,
      title: "Listening question audio",
      mediaId: args.audioMediaId,
      alt: audio.description,
      provenanceJson: JSON.stringify({
        sourceType: "admin-authored",
        authoringSurface: "question-bank",
        rightsNote: "Original English Club audio; review before selection.",
      }),
      authoredBy: args.actorId,
      createdAt: args.now,
      updatedAt: args.now,
    });
  }
  const itemId = await ctx.db.insert("assessmentItems", {
    versionId: version._id,
    sectionId: section._id,
    ...(stimulusId === undefined ? {} : { stimulusId }),
    itemKey: `${safeSourceKey}-question`,
    order: section.itemCount,
    prompt: args.prompt,
    required: true,
    ...(args.explanation === undefined
      ? {}
      : { explanation: args.explanation }),
    provenanceJson: JSON.stringify({
      sourceType: "admin-authored",
      authoringSurface: "question-bank",
      rightsNote: "Original English Club question; review before selection.",
    }),
    authoredBy: args.actorId,
    createdAt: args.now,
    updatedAt: args.now,
    type: "single-choice",
    options: args.options,
  });
  await ctx.db.insert("assessmentAnswerKeys", {
    versionId: version._id,
    itemId,
    kind: "choice",
    correctChoiceKeys: [args.correctChoiceKey],
    scoringMode: "exact",
    points: 1,
  });
  await Promise.all([
    ctx.db.patch("assessmentSections", section._id, {
      itemCount: section.itemCount + 1,
    }),
    ctx.db.patch("assessmentVersions", version._id, {
      contentRevision: version.contentRevision + 1,
      updatedAt: args.now,
    }),
    ctx.db.patch("assessmentDefinitions", definition._id, {
      updatedBy: args.actorId,
      updatedAt: args.now,
    }),
  ]);
  return { definition, version, section, itemId };
}

async function insertEditableContentSource(
  ctx: MutationCtx,
  args: {
    actorId: Id<"adminUsers">;
    skill: "reading" | "listening" | "writing" | "speaking";
    sourceKey: string;
    content: BankEditableContent;
    previousKey: Doc<"assessmentAnswerKeys">;
    audioMediaId?: Id<"mediaAssets">;
    now: number;
  },
) {
  const { definition, version, section } = await getAuthoringLedgerSection(
    ctx,
    args.actorId,
    args.skill,
    args.now,
  );
  const safeSourceKey = args.sourceKey
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  if (safeSourceKey.length < 3) {
    throw new ConvexError({ code: "QUESTION_BANK_SOURCE_KEY_INVALID" as const });
  }
  let stimulusId: Id<"assessmentStimuli"> | undefined;
  if (args.skill === "listening" && args.audioMediaId !== undefined) {
    const audio = await projectReadyQuestionAudio(ctx, args.audioMediaId);
    if (audio === null) {
      throw new ConvexError({ code: "QUESTION_BANK_AUDIO_INVALID" as const });
    }
    stimulusId = await ctx.db.insert("assessmentStimuli", {
      versionId: version._id,
      sectionId: section._id,
      stimulusKey: `${safeSourceKey}-audio`,
      kind: "audio",
      order: section.itemCount,
      title: "Listening question audio",
      mediaId: args.audioMediaId,
      alt: audio.description,
      provenanceJson: JSON.stringify({
        sourceType: "admin-authored",
        authoringSurface: "question-bank",
        rightsNote: "Original English Club audio; review before selection.",
      }),
      authoredBy: args.actorId,
      createdAt: args.now,
      updatedAt: args.now,
    });
  }
  const itemBase = {
    versionId: version._id,
    sectionId: section._id,
    ...(stimulusId === undefined ? {} : { stimulusId }),
    itemKey: `${safeSourceKey}-question`,
    order: section.itemCount,
    prompt: args.content.prompt,
    required: true,
    ...(args.content.explanation === null
      ? {}
      : { explanation: args.content.explanation }),
    provenanceJson: JSON.stringify({
      sourceType: "admin-authored",
      authoringSurface: "question-bank",
      rightsNote: "Original English Club question; review before selection.",
    }),
    authoredBy: args.actorId,
    createdAt: args.now,
    updatedAt: args.now,
  };
  let itemId: Id<"assessmentItems">;
  switch (args.content.type) {
    case "single-choice":
      if (args.previousKey.kind !== "choice") {
        throw new ConvexError({ code: "QUESTION_BANK_ITEM_TYPE_MISMATCH" as const });
      }
      itemId = await ctx.db.insert("assessmentItems", {
        ...itemBase,
        type: args.content.type,
        options: args.content.options,
      });
      await ctx.db.insert("assessmentAnswerKeys", {
        versionId: version._id,
        itemId,
        kind: "choice",
        correctChoiceKeys: [args.content.correctChoiceKey],
        scoringMode: args.previousKey.scoringMode,
        ...(args.previousKey.points === undefined
          ? {}
          : { points: args.previousKey.points }),
      });
      break;
    case "multiple-select":
      if (args.previousKey.kind !== "multi-choice") {
        throw new ConvexError({ code: "QUESTION_BANK_ITEM_TYPE_MISMATCH" as const });
      }
      itemId = await ctx.db.insert("assessmentItems", {
        ...itemBase,
        type: args.content.type,
        options: args.content.options,
        selectionMin: args.content.selectionMin,
        selectionMax: args.content.selectionMax,
      });
      await ctx.db.insert("assessmentAnswerKeys", {
        versionId: version._id,
        itemId,
        kind: "multi-choice",
        correctChoiceKeys: args.content.correctChoiceKeys,
        scoringMode: args.previousKey.scoringMode,
        ...(args.previousKey.points === undefined
          ? {}
          : { points: args.previousKey.points }),
      });
      break;
    case "cloze-select":
      if (args.previousKey.kind !== "cloze") {
        throw new ConvexError({ code: "QUESTION_BANK_ITEM_TYPE_MISMATCH" as const });
      }
      itemId = await ctx.db.insert("assessmentItems", {
        ...itemBase,
        type: args.content.type,
        stemParts: args.content.stemParts,
        gaps: args.content.gaps,
      });
      await ctx.db.insert("assessmentAnswerKeys", {
        versionId: version._id,
        itemId,
        kind: "cloze",
        correctGapAnswers: args.content.correctGapAnswers,
        scoringMode: args.previousKey.scoringMode,
        ...(args.previousKey.points === undefined
          ? {}
          : { points: args.previousKey.points }),
      });
      break;
    case "sentence-build":
      if (args.previousKey.kind !== "token-order") {
        throw new ConvexError({ code: "QUESTION_BANK_ITEM_TYPE_MISMATCH" as const });
      }
      itemId = await ctx.db.insert("assessmentItems", {
        ...itemBase,
        type: args.content.type,
        tokens: args.content.tokens,
      });
      await ctx.db.insert("assessmentAnswerKeys", {
        versionId: version._id,
        itemId,
        kind: "token-order",
        acceptedTokenOrders: args.content.acceptedTokenOrders,
        scoringMode: args.previousKey.scoringMode,
        ...(args.previousKey.points === undefined
          ? {}
          : { points: args.previousKey.points }),
      });
      break;
    case "constructed-response":
      if (
        args.previousKey.kind !== "text-rubric" ||
        args.previousKey.rubricMode !== args.content.responseMode
      ) {
        throw new ConvexError({ code: "QUESTION_BANK_ITEM_TYPE_MISMATCH" as const });
      }
      itemId = await ctx.db.insert("assessmentItems", {
        ...itemBase,
        type: args.content.type,
        responseMode: args.content.responseMode,
        minimumWords: args.content.minimumWords,
        recommendedWords: args.content.recommendedWords,
        maximumCharacters: args.content.maximumCharacters,
        ...(args.content.preparationSeconds === null
          ? {}
          : { preparationSeconds: args.content.preparationSeconds }),
        ...(args.content.responseSeconds === null
          ? {}
          : { responseSeconds: args.content.responseSeconds }),
      });
      await ctx.db.insert("assessmentAnswerKeys", {
        versionId: version._id,
        itemId,
        kind: "text-rubric",
        rubricMode: args.content.responseMode,
        maxPoints: args.content.rubric.maxPoints,
        minimumWords: args.content.rubric.minimumWords,
        targetTerms: args.content.rubric.targetTerms,
        sampleResponse: args.content.rubric.sampleResponse,
        scoringMode: args.previousKey.scoringMode,
        ...(args.previousKey.points === undefined
          ? {}
          : { points: args.previousKey.points }),
      });
      break;
  }
  await Promise.all([
    ctx.db.patch("assessmentSections", section._id, {
      itemCount: section.itemCount + 1,
    }),
    ctx.db.patch("assessmentVersions", version._id, {
      contentRevision: version.contentRevision + 1,
      updatedAt: args.now,
    }),
    ctx.db.patch("assessmentDefinitions", definition._id, {
      updatedBy: args.actorId,
      updatedAt: args.now,
    }),
  ]);
  return { definition, version, section, itemId };
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
    audioMediaId: v.optional(v.union(v.id("mediaAssets"), v.null())),
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
    const { prompt, options, correctChoiceKey, explanation } =
      normalizeAuthoredQuestion(args);
    const tags = normalizeQuestionBankTags([
      ...new Set([args.skill, args.taskFamily, ...args.tags]),
    ]);
    const audioMediaId = args.audioMediaId ?? undefined;
    await validateQuestionMedia(ctx, {
      skill: args.skill,
      illustrationMediaId: args.illustrationMediaId ?? undefined,
      audioMediaId,
    });
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
    const { definition, version, section, itemId } =
      await insertAuthoringSource(ctx, {
        actorId: actor._id,
        skill: args.skill,
        sourceKey: `manual-${requestId}`,
        prompt,
        options,
        correctChoiceKey,
        explanation,
        audioMediaId,
        now,
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
      audioMediaId,
      contentFingerprint: fingerprint,
      promptSearch: normalizeBankPrompt(prompt),
      tags,
      createdBy: actor._id,
      updatedBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
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

export const updateContent = mutation({
  args: {
    bankQuestionId: v.id("assessmentQuestionBank"),
    expectedUpdatedAt: v.number(),
    content: bankEditableContentValidator,
    illustrationMediaId: v.union(v.id("mediaAssets"), v.null()),
    audioMediaId: v.union(v.id("mediaAssets"), v.null()),
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      updatedAt: v.number(),
      sourceItemId: v.id("assessmentItems"),
    }),
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
    if (
      row.skill === "structure" ||
      !isTaskFamilyForSkill(row.skill, row.taskFamily)
    ) {
      throw new ConvexError({ code: "QUESTION_BANK_SKILL_INVALID" as const });
    }
    const [previousItem, previousKey] = await Promise.all([
      ctx.db.get("assessmentItems", row.sourceItemId),
      ctx.db
        .query("assessmentAnswerKeys")
        .withIndex("by_item_id", (q) => q.eq("itemId", row.sourceItemId))
        .unique(),
    ]);
    if (
      previousItem === null ||
      previousKey === null ||
      previousItem.versionId !== row.sourceVersionId ||
      previousItem.sectionId !== row.sourceSectionId ||
      previousKey.versionId !== row.sourceVersionId ||
      previousItem.type !== args.content.type
    ) {
      throw new ConvexError({ code: "QUESTION_BANK_ITEM_TYPE_MISMATCH" as const });
    }
    const content = normalizeEditableContent(args.content);
    const illustrationMediaId = args.illustrationMediaId ?? undefined;
    const audioMediaId = args.audioMediaId ?? undefined;
    const audio = await validateQuestionMedia(ctx, {
      skill: row.skill,
      illustrationMediaId,
      audioMediaId,
    });
    if (
      row.skill === "listening" &&
      row.status === "ready" &&
      audio === null
    ) {
      throw new ConvexError({ code: "QUESTION_BANK_AUDIO_REQUIRED" as const });
    }
    const fingerprint = questionContentFingerprint(
      row.skill,
      content.prompt,
      fingerprintValuesForContent(content),
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
    const duplicate =
      duplicates.find(
        (candidate) =>
          candidate._id !== row._id && candidate.status !== "archived",
      ) ?? null;
    if (duplicate !== null) {
      throw new ConvexError({
        code: "QUESTION_BANK_DUPLICATE" as const,
        bankQuestionId: duplicate._id,
      });
    }
    const now = Date.now();
    const source = await insertEditableContentSource(ctx, {
      actorId: actor._id,
      skill: row.skill,
      sourceKey: `edit-${row._id}-${row.updatedAt}`,
      content,
      previousKey,
      audioMediaId,
      now,
    });
    await ctx.db.patch("assessmentQuestionBank", row._id, {
      sourceDefinitionId: source.definition._id,
      sourceVersionId: source.version._id,
      sourceSectionId: source.section._id,
      sourceItemId: source.itemId,
      origin: "bank-authored",
      illustrationMediaId,
      audioMediaId,
      contentFingerprint: fingerprint,
      promptSearch: normalizeBankPrompt(content.prompt),
      updatedBy: actor._id,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      area: "assessment",
      action: "update",
      resourceType: "question-bank-content",
      resourceId: row._id,
      summary: `${row.skill} Question Bank content revised`,
      actorId: actor._id,
    });
    return { ok: true as const, updatedAt: now, sourceItemId: source.itemId };
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
    const selectableByFingerprint = new Map<
      string,
      Doc<"assessmentQuestionBank">
    >();
    for (const row of visibleRows) {
      if (
        row.profile === "ec-ibt-style-2026-v1" &&
        !selectableByFingerprint.has(row.contentFingerprint) &&
        (await questionBankRowIsReadyForSelection(ctx, row))
      ) {
        selectableByFingerprint.set(row.contentFingerprint, row);
      }
    }
    const selectableRows = [...selectableByFingerprint.values()];
    const skills = ["reading", "listening", "writing", "speaking"] as const;
    const bySkill = skills.map((skill) => ({
      skill,
      count: selectableRows.filter((row) => row.skill === skill).length,
    }));
    return {
      total: visibleRows.length,
      capped,
      ready: visibleRows.filter((row) => row.status === "ready").length,
      eligible: selectableRows.length,
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
    audioMediaId: v.optional(v.union(v.id("mediaAssets"), v.null())),
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
    const audioMediaId =
      args.audioMediaId === undefined
        ? row.audioMediaId
        : (args.audioMediaId ?? undefined);
    if (audioMediaId !== undefined) {
      if (row.skill !== "listening") {
        throw new ConvexError({
          code: "QUESTION_BANK_AUDIO_SKILL_MISMATCH" as const,
        });
      }
      if ((await projectReadyQuestionAudio(ctx, audioMediaId)) === null) {
        throw new ConvexError({ code: "QUESTION_BANK_AUDIO_INVALID" as const });
      }
    }
    let sourceItem: Doc<"assessmentItems"> | null = null;
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
      sourceItem = item;
    }
    if (
      row.skill === "listening" &&
      args.status === "ready"
    ) {
      sourceItem ??= await ctx.db.get("assessmentItems", row.sourceItemId);
      const rowWithAudio = { ...row, audioMediaId };
      if (
        (await resolveReadyQuestionAudio(ctx, rowWithAudio, sourceItem)) === null
      ) {
        throw new ConvexError({ code: "QUESTION_BANK_AUDIO_REQUIRED" as const });
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
      ...(args.audioMediaId === undefined ? {} : { audioMediaId }),
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
