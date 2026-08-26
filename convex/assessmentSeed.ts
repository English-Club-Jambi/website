import {
  IBT_PRACTICE_BANK_CHECKSUM,
  IBT_PRACTICE_RESEARCH_SOURCES,
  ibtPracticeBank,
  researchSourceIdsForBankItem,
  type IbtBankDefinition,
  type IbtBankItem,
} from "../content/assessment-ibt-bank";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { bumpAssessmentRevision } from "./lib/assessmentAdmin";
import { publicAssessmentDerivativeKey } from "./lib/assessmentMedia";
import {
  difficultyForPosition,
  normalizeBankPrompt,
  taskFamilyForItemKey,
} from "./lib/assessmentQuestionBank";

const confirmation = "seed-ec-ibt-style-2026-v1" as const;

const audioPlanValidator = v.object({
  definitionId: v.id("assessmentDefinitions"),
  versionId: v.id("assessmentVersions"),
  stimulusId: v.id("assessmentStimuli"),
  stimulusKey: v.string(),
  title: v.string(),
  transcript: v.string(),
});
const preparedDefinitionValidator = v.object({
  slug: v.string(),
  definitionId: v.id("assessmentDefinitions"),
  versionId: v.id("assessmentVersions"),
  inserted: v.boolean(),
  itemCount: v.number(),
  audioCount: v.number(),
});

function checksumForSlug(slug: string) {
  return `${IBT_PRACTICE_BANK_CHECKSUM}:${slug}`;
}

async function requireSeedAuthor(ctx: MutationCtx) {
  for (const role of ["owner", "publisher"] as const) {
    const [author] = await ctx.db
      .query("adminUsers")
      .withIndex("by_role_and_status_and_updated_at", (q) =>
        q.eq("role", role).eq("status", "active"),
      )
      .order("desc")
      .take(1);
    if (author !== undefined) return author;
  }
  throw new ConvexError({ code: "ASSESSMENT_SEED_AUTHOR_REQUIRED" as const });
}

function provenanceJson(definition: IbtBankDefinition) {
  return JSON.stringify({
    source: "English Club original practice bank",
    bank: IBT_PRACTICE_BANK_CHECKSUM,
    definition: definition.slug,
    rights: "project-authored",
    publicBlueprintReference: "ETS 2026 public task families and counts",
    researchSources: IBT_PRACTICE_RESEARCH_SOURCES,
    contentPolicy:
      "Facts were researched from the listed sources; passages, prompts, options, transcripts, and answer keys are English Club originals.",
  });
}

function itemDocument(
  item: IbtBankItem,
  base: {
    versionId: Id<"assessmentVersions">;
    sectionId: Id<"assessmentSections">;
    stimulusId?: Id<"assessmentStimuli">;
    order: number;
    authorId: Id<"adminUsers">;
    now: number;
    provenanceJson: string;
  },
) {
  const common = {
    versionId: base.versionId,
    sectionId: base.sectionId,
    stimulusId: base.stimulusId,
    itemKey: item.key,
    order: base.order,
    prompt: item.prompt,
    required: true,
    explanation: item.explanation,
    provenanceJson: base.provenanceJson,
    authoredBy: base.authorId,
    createdAt: base.now,
    updatedAt: base.now,
  };
  switch (item.type) {
    case "single-choice":
      return { ...common, type: item.type, options: item.options.map((entry) => ({ ...entry })) };
    case "cloze-select":
      return {
        ...common,
        type: item.type,
        stemParts: [...item.stemParts],
        gaps: item.gaps.map((gap) => ({
          key: gap.key,
          options: gap.options.map((entry) => ({ ...entry })),
        })),
      };
    case "sentence-build":
      return { ...common, type: item.type, tokens: item.tokens.map((entry) => ({ ...entry })) };
    case "constructed-response":
      return {
        ...common,
        type: item.type,
        responseMode: item.responseMode,
        minimumWords: item.minimumWords,
        recommendedWords: item.recommendedWords,
        maximumCharacters: item.maximumCharacters,
        preparationSeconds: item.preparationSeconds,
        responseSeconds: item.responseSeconds,
      };
  }
}

async function insertAnswerKey(
  ctx: MutationCtx,
  item: IbtBankItem,
  versionId: Id<"assessmentVersions">,
  itemId: Id<"assessmentItems">,
) {
  const answer = item.answer;
  const base = { versionId, itemId };
  switch (answer.kind) {
    case "choice":
      await ctx.db.insert("assessmentAnswerKeys", {
        ...base,
        kind: answer.kind,
        correctChoiceKeys: [...answer.correctChoiceKeys],
        scoringMode: "exact",
        points: answer.points,
      });
      return;
    case "cloze":
      await ctx.db.insert("assessmentAnswerKeys", {
        ...base,
        kind: answer.kind,
        correctGapAnswers: answer.correctGapAnswers.map((entry) => ({ ...entry })),
        scoringMode: "exact",
        points: answer.points,
      });
      return;
    case "token-order":
      await ctx.db.insert("assessmentAnswerKeys", {
        ...base,
        kind: answer.kind,
        acceptedTokenOrders: answer.acceptedTokenOrders.map((order) => [...order]),
        scoringMode: "exact",
        points: answer.points,
      });
      return;
    case "text-rubric":
      await ctx.db.insert("assessmentAnswerKeys", {
        ...base,
        kind: answer.kind,
        rubricMode: answer.rubricMode,
        maxPoints: answer.maxPoints,
        minimumWords: answer.minimumWords,
        targetTerms: [...answer.targetTerms],
        sampleResponse: answer.sampleResponse,
        scoringMode: "rubric-v1",
      });
  }
}

async function audioPlanForVersion(
  ctx: MutationCtx,
  definitionId: Id<"assessmentDefinitions">,
  versionId: Id<"assessmentVersions">,
) {
  const stimuli = await ctx.db
    .query("assessmentStimuli")
    .withIndex("by_version_id_and_stimulus_key", (q) => q.eq("versionId", versionId))
    .take(201);
  if (stimuli.length > 200) {
    throw new ConvexError({ code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const });
  }
  return stimuli.flatMap((stimulus) =>
    stimulus.kind !== "audio" || stimulus.transcript === undefined
      ? []
      : [{
          definitionId,
          versionId,
          stimulusId: stimulus._id,
          stimulusKey: stimulus.stimulusKey,
          title: stimulus.title ?? stimulus.stimulusKey,
          transcript: stimulus.transcript,
        }],
  );
}

async function insertDefinition(
  ctx: MutationCtx,
  definition: IbtBankDefinition,
  author: Doc<"adminUsers">,
  now: number,
) {
  const definitionId = await ctx.db.insert("assessmentDefinitions", {
    slug: definition.slug,
    kind: definition.kind,
    profile: "ec-ibt-style-2026-v1",
    adminTitle: definition.adminTitle,
    nextVersion: 2,
    visibility: "published",
    createdBy: author._id,
    updatedBy: author._id,
    createdAt: now,
    updatedAt: now,
  });
  const versionId = await ctx.db.insert("assessmentVersions", {
    definitionId,
    version: 1,
    status: "published",
    title: definition.title,
    summary: definition.summary,
    instructions: definition.instructions,
    locale: "en",
    timePolicy: "per-section",
    allowResume: true,
    reviewPolicy: "after-submit",
    scorePolicy: "practice-estimate-v1",
    defaultTimingMode: "standard",
    defaultListeningMode: "audio-primary",
    maxAttemptsPerDay: definition.maxAttemptsPerDay,
    contentRevision: 1,
    validatedRevision: 1,
    contentChecksum: checksumForSlug(definition.slug),
    createdBy: author._id,
    publishedBy: author._id,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });
  await ctx.db.patch("assessmentDefinitions", definitionId, {
    publishedVersionId: versionId,
  });

  const provenance = provenanceJson(definition);
  for (let sectionOrder = 0; sectionOrder < definition.sections.length; sectionOrder += 1) {
    const section = definition.sections[sectionOrder];
    const sectionId = await ctx.db.insert("assessmentSections", {
      versionId,
      sectionKey: section.key,
      skill: section.skill,
      order: sectionOrder,
      title: section.title,
      instructions: section.instructions,
      timeLimitSeconds: section.timeLimitSeconds,
      audioReplayPolicy: section.skill === "listening" ? "unlimited" : undefined,
      itemCount: section.items.length,
    });
    const stimulusIds = new Map<string, Id<"assessmentStimuli">>();
    for (let stimulusOrder = 0; stimulusOrder < section.stimuli.length; stimulusOrder += 1) {
      const stimulus = section.stimuli[stimulusOrder];
      const stimulusId = await ctx.db.insert("assessmentStimuli", {
        versionId,
        sectionId,
        stimulusKey: stimulus.key,
        kind: stimulus.kind,
        order: stimulusOrder,
        title: stimulus.title,
        body: stimulus.body,
        transcript: stimulus.transcript,
        alt: stimulus.alt,
        provenanceJson: provenance,
        authoredBy: author._id,
        createdAt: now,
        updatedAt: now,
      });
      stimulusIds.set(stimulus.key, stimulusId);
    }
    for (let itemOrder = 0; itemOrder < section.items.length; itemOrder += 1) {
      const item = section.items[itemOrder];
      const stimulusId = item.stimulusKey === undefined
        ? undefined
        : stimulusIds.get(item.stimulusKey);
      if (item.stimulusKey !== undefined && stimulusId === undefined) {
        throw new ConvexError({ code: "ASSESSMENT_SEED_STIMULUS_MISSING" as const });
      }
      const itemId = await ctx.db.insert(
        "assessmentItems",
        itemDocument(item, {
          versionId,
          sectionId,
          stimulusId,
          order: itemOrder,
          authorId: author._id,
          now,
          provenanceJson: provenance,
        }),
      );
      await insertAnswerKey(ctx, item, versionId, itemId);
    }
  }
  await ctx.db.insert("cmsAuditEvents", {
    area: "assessment",
    action: "publish",
    resourceType: "assessment-seed",
    resourceId: definitionId,
    summary: `${definition.slug} original practice bank seeded`,
    actorId: author._id,
    createdAt: now,
  });
  return { definitionId, versionId };
}

export const prepareIbtPractice = internalMutation({
  args: { confirm: v.literal(confirmation) },
  returns: v.object({
    definitions: v.array(preparedDefinitionValidator),
    audio: v.array(audioPlanValidator),
  }),
  handler: async (ctx) => {
    const author = await requireSeedAuthor(ctx);
    const definitions = [];
    const audio = [];
    for (const bankDefinition of ibtPracticeBank) {
      const existing = await ctx.db
        .query("assessmentDefinitions")
        .withIndex("by_slug", (q) => q.eq("slug", bankDefinition.slug))
        .unique();
      let definitionId: Id<"assessmentDefinitions">;
      let versionId: Id<"assessmentVersions">;
      let inserted = false;
      if (existing === null) {
        const created = await insertDefinition(ctx, bankDefinition, author, Date.now());
        definitionId = created.definitionId;
        versionId = created.versionId;
        inserted = true;
      } else {
        if (
          existing.profile !== "ec-ibt-style-2026-v1" ||
          existing.publishedVersionId === undefined
        ) {
          throw new ConvexError({ code: "ASSESSMENT_SEED_SLUG_CONFLICT" as const, slug: bankDefinition.slug });
        }
        const version = await ctx.db.get("assessmentVersions", existing.publishedVersionId);
        if (
          version === null ||
          version.definitionId !== existing._id ||
          version.status !== "published" ||
          version.contentChecksum !== checksumForSlug(bankDefinition.slug)
        ) {
          throw new ConvexError({ code: "ASSESSMENT_SEED_SLUG_CONFLICT" as const, slug: bankDefinition.slug });
        }
        definitionId = existing._id;
        versionId = version._id;
      }
      const plan = await audioPlanForVersion(ctx, definitionId, versionId);
      audio.push(...plan);
      definitions.push({
        slug: bankDefinition.slug,
        definitionId,
        versionId,
        inserted,
        itemCount: bankDefinition.sections.reduce((total, section) => total + section.items.length, 0),
        audioCount: plan.length,
      });
    }
    return { definitions, audio };
  },
});

const publicAudioInputValidator = v.object({
  versionId: v.id("assessmentVersions"),
  stimulusId: v.id("assessmentStimuli"),
  objectKey: v.string(),
  checksumSha256: v.string(),
  byteSize: v.number(),
  durationMs: v.number(),
});

export const attachPublicAudio = internalMutation({
  args: {
    confirm: v.literal(confirmation),
    assets: v.array(publicAudioInputValidator),
  },
  returns: v.object({ attached: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    if (args.assets.length < 1 || args.assets.length > 20) {
      throw new ConvexError({ code: "ASSESSMENT_SEED_AUDIO_BATCH_INVALID" as const });
    }
    let attached = 0;
    let skipped = 0;
    const now = Date.now();
    for (const asset of args.assets) {
      if (
        !/^[a-f0-9]{64}$/.test(asset.checksumSha256) ||
        !Number.isInteger(asset.byteSize) ||
        asset.byteSize < 1 ||
        asset.byteSize > 25 * 1024 * 1024 ||
        !Number.isInteger(asset.durationMs) ||
        asset.durationMs < 1 ||
        asset.durationMs > 15 * 60 * 1_000 ||
        asset.objectKey !== publicAssessmentDerivativeKey({
          versionId: asset.versionId,
          checksumSha256: asset.checksumSha256,
          extension: "mp3",
        })
      ) {
        throw new ConvexError({ code: "ASSESSMENT_SEED_AUDIO_INVALID" as const });
      }
      const [version, stimulus] = await Promise.all([
        ctx.db.get("assessmentVersions", asset.versionId),
        ctx.db.get("assessmentStimuli", asset.stimulusId),
      ]);
      if (
        version === null ||
        version.status !== "published" ||
        version.contentChecksum === undefined ||
        !version.contentChecksum.startsWith(IBT_PRACTICE_BANK_CHECKSUM) ||
        stimulus === null ||
        stimulus.versionId !== version._id ||
        stimulus.kind !== "audio" ||
        stimulus.transcript === undefined
      ) {
        throw new ConvexError({ code: "ASSESSMENT_SEED_AUDIO_RELATIONSHIP_INVALID" as const });
      }
      const existing = await ctx.db
        .query("mediaAssets")
        .withIndex("by_object_key", (q) => q.eq("objectKey", asset.objectKey))
        .unique();
      let mediaId: Id<"mediaAssets">;
      if (existing === null) {
        mediaId = await ctx.db.insert("mediaAssets", {
          objectKey: asset.objectKey,
          purpose: "assessment-audio",
          contentType: "audio/mpeg",
          byteSize: asset.byteSize,
          status: "ready",
          originalName: `${stimulus.stimulusKey}.mp3`,
          alt: stimulus.alt ?? `Original practice audio: ${stimulus.title ?? stimulus.stimulusKey}`,
          access: "public",
          durationMs: asset.durationMs,
          checksumSha256: asset.checksumSha256,
          assessmentVersionId: version._id,
          uploadedBy: stimulus.authoredBy,
          verifiedAt: now,
          createdAt: now,
          updatedAt: now,
        });
        attached += 1;
      } else {
        if (
          existing.status !== "ready" ||
          existing.purpose !== "assessment-audio" ||
          existing.contentType !== "audio/mpeg" ||
          existing.access !== "public" ||
          existing.assessmentVersionId !== version._id ||
          existing.checksumSha256 !== asset.checksumSha256 ||
          existing.byteSize !== asset.byteSize ||
          existing.durationMs !== asset.durationMs
        ) {
          throw new ConvexError({ code: "ASSESSMENT_SEED_AUDIO_COLLISION" as const });
        }
        mediaId = existing._id;
        skipped += 1;
      }
      if (stimulus.mediaId !== mediaId) {
        await ctx.db.patch("assessmentStimuli", stimulus._id, {
          mediaId,
          updatedAt: now,
        });
      }
    }
    return { attached, skipped };
  },
});

export const seedQuestionBank = internalMutation({
  args: { confirm: v.literal(confirmation) },
  returns: v.object({
    inserted: v.number(),
    existing: v.number(),
    eligible: v.number(),
    randomSections: v.number(),
  }),
  handler: async (ctx) => {
    const author = await requireSeedAuthor(ctx);
    let inserted = 0;
    let existingCount = 0;
    let eligible = 0;
    let randomSections = 0;
    const now = Date.now();
    for (const source of ibtPracticeBank) {
      const definition = await ctx.db
        .query("assessmentDefinitions")
        .withIndex("by_slug", (q) => q.eq("slug", source.slug))
        .unique();
      if (definition === null || definition.publishedVersionId === undefined) {
        throw new ConvexError({ code: "ASSESSMENT_SEED_VERIFY_INVALID" as const });
      }
      const version = await ctx.db.get(
        "assessmentVersions",
        definition.publishedVersionId,
      );
      if (
        version === null ||
        version.status !== "published" ||
        version.contentChecksum !== checksumForSlug(source.slug)
      ) {
        throw new ConvexError({ code: "ASSESSMENT_SEED_VERIFY_INVALID" as const });
      }
      const sections = await ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_order", (q) =>
          q.eq("versionId", version._id),
        )
        .take(9);
      for (const section of sections) {
        const sourceSection = source.sections.find(
          (entry) => entry.key === section.sectionKey,
        );
        if (sourceSection === undefined) {
          throw new ConvexError({ code: "ASSESSMENT_SEED_VERIFY_INVALID" as const });
        }
        const items = await ctx.db
          .query("assessmentItems")
          .withIndex("by_section_id_and_order", (q) =>
            q.eq("sectionId", section._id),
          )
          .take(section.itemCount + 1);
        if (items.length !== section.itemCount) {
          throw new ConvexError({ code: "ASSESSMENT_SEED_VERIFY_INVALID" as const });
        }
        const fullPracticeEligible = source.kind === "full-practice";
        const usesQuestionBank =
          source.kind === "full-practice" || source.kind === "skill-quiz";
        if (usesQuestionBank) {
          await ctx.db.patch("assessmentSections", section._id, {
            deliveryMode: "random-bank",
            bankProfile: "ec-ibt-style-2026-v1",
            bankSelectionContract: 1,
            bankSeedBatch: IBT_PRACTICE_BANK_CHECKSUM,
          });
          randomSections += 1;
        }
        for (const item of items) {
          const key = await ctx.db
            .query("assessmentAnswerKeys")
            .withIndex("by_item_id", (q) => q.eq("itemId", item._id))
            .unique();
          if (key === null || key.versionId !== version._id) {
            throw new ConvexError({ code: "ASSESSMENT_KEYSET_INCOMPLETE" as const });
          }
          if (item.stimulusId !== undefined) {
            const stimulus = await ctx.db.get("assessmentStimuli", item.stimulusId);
            if (stimulus === null) {
              throw new ConvexError({ code: "ASSESSMENT_SEED_VERIFY_INVALID" as const });
            }
            if (stimulus.kind === "audio") {
              const media =
                stimulus.mediaId === undefined
                  ? null
                  : await ctx.db.get("mediaAssets", stimulus.mediaId);
              if (
                media === null ||
                media.status !== "ready" ||
                media.access !== "public" ||
                media.purpose !== "assessment-audio"
              ) {
                throw new ConvexError({ code: "ASSESSMENT_SEED_AUDIO_INVALID" as const });
              }
            }
          }
          const bankKey = `${IBT_PRACTICE_BANK_CHECKSUM}/${source.slug}/${section.sectionKey}/${item.itemKey}`;
          const existing = await ctx.db
            .query("assessmentQuestionBank")
            .withIndex("by_bank_key", (q) => q.eq("bankKey", bankKey))
            .unique();
          if (existing !== null) {
            if (
              existing.sourceItemId !== item._id ||
              existing.sourceVersionId !== version._id ||
              existing.sourceSectionId !== section._id
            ) {
              throw new ConvexError({ code: "QUESTION_BANK_SEED_COLLISION" as const });
            }
            existingCount += 1;
            eligible += existing.fullPracticeEligible ? 1 : 0;
            continue;
          }
          const taskFamily = taskFamilyForItemKey(item.itemKey);
          const sourceItem = sourceSection.items.find(
            (entry) => entry.key === item.itemKey,
          );
          if (sourceItem === undefined) {
            throw new ConvexError({ code: "ASSESSMENT_SEED_VERIFY_INVALID" as const });
          }
          const sourceTags = researchSourceIdsForBankItem(
            sourceItem,
          ).map((sourceId) => `source-${sourceId}`);
          await ctx.db.insert("assessmentQuestionBank", {
            bankKey,
            sourceDefinitionId: definition._id,
            sourceVersionId: version._id,
            sourceSectionId: section._id,
            sourceItemId: item._id,
            skill: section.skill,
            taskFamily,
            difficulty: difficultyForPosition(item.order, section.itemCount),
            status: "ready",
            profile: "ec-ibt-style-2026-v1",
            fullPracticeEligible,
            contentFingerprint: `ec-ibt-style-2026-v1:${section.skill}:${item.itemKey}`,
            promptSearch: normalizeBankPrompt(item.prompt),
            tags: [
              section.skill,
              taskFamily,
              "original-question",
              ...sourceTags,
            ],
            seedBatch: IBT_PRACTICE_BANK_CHECKSUM,
            createdBy: author._id,
            updatedBy: author._id,
            createdAt: now,
            updatedAt: now,
          });
          inserted += 1;
          eligible += fullPracticeEligible ? 1 : 0;
        }
      }
    }
    if (inserted > 0) {
      await ctx.db.insert("cmsAuditEvents", {
        area: "assessment",
        action: "update",
        resourceType: "question-bank-seed",
        resourceId: IBT_PRACTICE_BANK_CHECKSUM,
        summary: `${inserted + existingCount} original questions indexed in the bank`,
        actorId: author._id,
        createdAt: now,
      });
    }
    return { inserted, existing: existingCount, eligible, randomSections };
  },
});

export const repairLegacyDraftQuestionPools = internalMutation({
  args: { confirm: v.literal(confirmation) },
  returns: v.object({
    repairedDefinitions: v.number(),
    repairedSections: v.number(),
  }),
  handler: async (ctx) => {
    const author = await requireSeedAuthor(ctx);
    let repairedDefinitions = 0;
    let repairedSections = 0;

    for (const bankDefinition of ibtPracticeBank) {
      const definition = await ctx.db
        .query("assessmentDefinitions")
        .withIndex("by_slug", (q) => q.eq("slug", bankDefinition.slug))
        .unique();
      if (definition?.draftVersionId === undefined) continue;
      const draft = await ctx.db.get(
        "assessmentVersions",
        definition.draftVersionId,
      );
      if (
        draft === null ||
        (draft.status !== "draft" && draft.status !== "ready") ||
        draft.cloneSourceVersionId === undefined
      ) {
        continue;
      }
      const sourceVersion = await ctx.db.get(
        "assessmentVersions",
        draft.cloneSourceVersionId,
      );
      if (
        sourceVersion === null ||
        sourceVersion.definitionId !== definition._id ||
        sourceVersion.status !== "published"
      ) {
        continue;
      }
      const draftSections = await ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_order", (q) =>
          q.eq("versionId", draft._id),
        )
        .take(9);
      if (draftSections.length > 8) {
        throw new ConvexError({ code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const });
      }
      let repairedForDefinition = 0;
      for (const draftSection of draftSections) {
        const legacyPoolClone =
          draftSection.deliveryMode === undefined &&
          draftSection.bankProfile === undefined &&
          draftSection.bankSelectionContract === undefined;
        if (!legacyPoolClone) continue;
        const sourceSection = await ctx.db
          .query("assessmentSections")
          .withIndex("by_version_id_and_section_key", (q) =>
            q
              .eq("versionId", sourceVersion._id)
              .eq("sectionKey", draftSection.sectionKey),
          )
          .unique();
        if (
          sourceSection === null ||
          sourceSection.skill !== draftSection.skill ||
          sourceSection.deliveryMode !== "random-bank" ||
          sourceSection.bankProfile !== definition.profile ||
          sourceSection.bankSelectionContract !== 1
        ) {
          continue;
        }
        await ctx.db.patch("assessmentSections", draftSection._id, {
          deliveryMode: "random-bank",
          bankProfile: sourceSection.bankProfile,
          bankSelectionContract: 1,
          ...(sourceSection.bankSeedBatch === undefined
            ? {}
            : { bankSeedBatch: sourceSection.bankSeedBatch }),
        });
        repairedForDefinition += 1;
      }
      if (repairedForDefinition === 0) continue;
      const now = Date.now();
      await bumpAssessmentRevision(
        ctx,
        draft._id,
        draft.contentRevision,
        now,
      );
      await ctx.db.patch("assessmentDefinitions", definition._id, {
        updatedBy: author._id,
        updatedAt: now,
      });
      await ctx.db.insert("cmsAuditEvents", {
        area: "assessment",
        action: "update",
        resourceType: "assessment-question-pool",
        resourceId: draft._id,
        summary: `${definition.slug} inherited question-pool configuration restored`,
        actorId: author._id,
        createdAt: now,
      });
      repairedDefinitions += 1;
      repairedSections += repairedForDefinition;
    }

    return { repairedDefinitions, repairedSections };
  },
});

const verificationSectionValidator = v.object({
  skill: v.union(
    v.literal("reading"),
    v.literal("listening"),
    v.literal("writing"),
    v.literal("speaking"),
  ),
  items: v.number(),
  points: v.number(),
});

export const verifyIbtPractice = internalQuery({
  args: { confirm: v.literal(confirmation) },
  returns: v.object({
    definitions: v.array(v.object({
      slug: v.string(),
      published: v.boolean(),
      items: v.number(),
      audioReady: v.number(),
      audioTotal: v.number(),
      sections: v.array(verificationSectionValidator),
    })),
  }),
  handler: async (ctx) => {
    const definitions = [];
    for (const bankDefinition of ibtPracticeBank) {
      const definition = await ctx.db
        .query("assessmentDefinitions")
        .withIndex("by_slug", (q) => q.eq("slug", bankDefinition.slug))
        .unique();
      if (definition === null || definition.publishedVersionId === undefined) {
        definitions.push({
          slug: bankDefinition.slug,
          published: false,
          items: 0,
          audioReady: 0,
          audioTotal: 0,
          sections: [],
        });
        continue;
      }
      const version = await ctx.db.get("assessmentVersions", definition.publishedVersionId);
      if (version === null) {
        throw new ConvexError({ code: "ASSESSMENT_SEED_VERIFY_INVALID" as const });
      }
      const [sections, items, keys, stimuli] = await Promise.all([
        ctx.db.query("assessmentSections").withIndex("by_version_id_and_order", (q) => q.eq("versionId", version._id)).take(9),
        ctx.db.query("assessmentItems").withIndex("by_version_id_and_order", (q) => q.eq("versionId", version._id)).take(201),
        ctx.db.query("assessmentAnswerKeys").withIndex("by_version_id_and_item_id", (q) => q.eq("versionId", version._id)).take(201),
        ctx.db.query("assessmentStimuli").withIndex("by_version_id_and_stimulus_key", (q) => q.eq("versionId", version._id)).take(201),
      ]);
      if (sections.length > 8 || items.length > 200 || keys.length > 200 || stimuli.length > 200) {
        throw new ConvexError({ code: "ASSESSMENT_DATA_LIMIT_EXCEEDED" as const });
      }
      const keyByItem = new Map(keys.map((key) => [key.itemId, key]));
      const sectionSummaries = sections.map((section) => {
        const sectionItems = items.filter((item) => item.sectionId === section._id);
        const points = sectionItems.reduce((total, item) => {
          const key = keyByItem.get(item._id);
          if (key === undefined) return total;
          return total + (key.kind === "text-rubric" ? key.maxPoints : key.points ?? 1);
        }, 0);
        return {
          skill: section.skill as "reading" | "listening" | "writing" | "speaking",
          items: sectionItems.length,
          points: Math.round(points * 100) / 100,
        };
      });
      const audioStimuli = stimuli.filter((stimulus) => stimulus.kind === "audio");
      definitions.push({
        slug: bankDefinition.slug,
        published:
          definition.visibility === "published" &&
          version.status === "published" &&
          version.contentChecksum === checksumForSlug(bankDefinition.slug),
        items: items.length,
        audioReady: audioStimuli.filter((stimulus) => stimulus.mediaId !== undefined).length,
        audioTotal: audioStimuli.length,
        sections: sectionSummaries,
      });
    }
    return { definitions };
  },
});

export const verifyQuestionBank = internalQuery({
  args: { confirm: v.literal(confirmation) },
  returns: v.object({
    total: v.number(),
    ready: v.number(),
    eligible: v.number(),
    randomSections: v.number(),
    bySkill: v.array(
      v.object({
        skill: v.union(
          v.literal("reading"),
          v.literal("listening"),
          v.literal("writing"),
          v.literal("speaking"),
        ),
        ready: v.number(),
        eligible: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const rows = await ctx.db.query("assessmentQuestionBank").take(201);
    if (rows.length > 200) {
      throw new ConvexError({ code: "QUESTION_BANK_CATALOGUE_LIMIT" as const });
    }
    let randomSections = 0;
    for (const source of ibtPracticeBank) {
      const definition = await ctx.db
        .query("assessmentDefinitions")
        .withIndex("by_slug", (q) => q.eq("slug", source.slug))
        .unique();
      if (definition?.publishedVersionId === undefined) continue;
      const sections = await ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_order", (q) =>
          q.eq("versionId", definition.publishedVersionId!),
        )
        .take(9);
      if (sections.length > 8) {
        throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
      }
      randomSections += sections.filter(
        (section) =>
          section.deliveryMode === "random-bank" &&
          section.bankSelectionContract === 1,
      ).length;
    }
    const skills = ["reading", "listening", "writing", "speaking"] as const;
    return {
      total: rows.length,
      ready: rows.filter((row) => row.status === "ready").length,
      eligible: rows.filter(
        (row) => row.status === "ready" && row.fullPracticeEligible,
      ).length,
      randomSections,
      bySkill: skills.map((skill) => ({
        skill,
        ready: rows.filter(
          (row) => row.skill === skill && row.status === "ready",
        ).length,
        eligible: rows.filter(
          (row) =>
            row.skill === skill &&
            row.status === "ready" &&
            row.fullPracticeEligible,
        ).length,
      })),
    };
  },
});
