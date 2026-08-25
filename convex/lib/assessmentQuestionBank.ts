import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AssessmentReadCtx = Pick<QueryCtx | MutationCtx, "db">;
type QuestionBankMutationCtx = Pick<MutationCtx, "db">;

export type AssessmentTaskFamily =
  | "complete-words"
  | "read-daily-life"
  | "read-academic-passage"
  | "listen-choose-response"
  | "listen-conversation"
  | "listen-announcement"
  | "listen-academic-talk"
  | "build-sentence"
  | "write-email"
  | "academic-discussion"
  | "listen-repeat"
  | "take-interview";

export type AssessmentQuestionDifficulty =
  | "foundational"
  | "developing"
  | "advanced";

export type DeliveredAssessmentItem = {
  item: Doc<"assessmentItems">;
  order: number;
  targetSectionId: Id<"assessmentSections">;
  bankQuestionId?: Id<"assessmentQuestionBank">;
};

const taskFamilyByPrefix: ReadonlyArray<
  readonly [string, AssessmentTaskFamily]
> = [
  ["reading-word-", "complete-words"],
  ["reading-daily-", "read-daily-life"],
  ["reading-academic-", "read-academic-passage"],
  ["listening-response-", "listen-choose-response"],
  ["listening-conversation-", "listen-conversation"],
  ["listening-announcement-", "listen-announcement"],
  ["listening-talk-", "listen-academic-talk"],
  ["writing-build-", "build-sentence"],
  ["writing-email-", "write-email"],
  ["writing-discussion-", "academic-discussion"],
  ["speaking-repeat-", "listen-repeat"],
  ["speaking-interview-", "take-interview"],
];

export function taskFamilyForItemKey(itemKey: string): AssessmentTaskFamily {
  const match = taskFamilyByPrefix.find(([prefix]) => itemKey.startsWith(prefix));
  if (match === undefined) {
    throw new ConvexError({
      code: "QUESTION_BANK_TASK_FAMILY_UNKNOWN" as const,
      itemKey,
    });
  }
  return match[1];
}

export function defaultTaskFamilyForSkill(
  skill: Doc<"assessmentSections">["skill"],
): AssessmentTaskFamily | null {
  switch (skill) {
    case "reading":
      return "read-academic-passage";
    case "listening":
      return "listen-academic-talk";
    case "writing":
      return "academic-discussion";
    case "speaking":
      return "take-interview";
    case "structure":
      return null;
  }
}

export function taskFamilyForItemOrSkill(
  itemKey: string,
  skill: Doc<"assessmentSections">["skill"],
) {
  const match = taskFamilyByPrefix.find(([prefix]) => itemKey.startsWith(prefix));
  const inferred = match?.[1] ?? defaultTaskFamilyForSkill(skill);
  if (inferred === null) {
    throw new ConvexError({
      code: "QUESTION_BANK_TASK_FAMILY_UNKNOWN" as const,
      itemKey,
    });
  }
  return inferred;
}

function compactHash(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function questionContentFingerprint(
  skill: string,
  prompt: string,
  optionValues: readonly string[],
) {
  const canonical = [
    skill.trim().toLocaleLowerCase("en"),
    prompt.trim().replace(/\s+/g, " ").toLocaleLowerCase("en"),
    ...optionValues.map((value) =>
      value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en"),
    ),
  ].join("\u001f");
  return `ecq:${compactHash(canonical, 2_166_136_261)}${compactHash(
    canonical,
    3_332_266_313,
  )}`;
}

export function difficultyForPosition(
  order: number,
  itemCount: number,
): AssessmentQuestionDifficulty {
  if (!Number.isInteger(order) || !Number.isInteger(itemCount) || itemCount < 1) {
    throw new ConvexError({ code: "QUESTION_BANK_DIFFICULTY_INVALID" as const });
  }
  const position = (order + 1) / itemCount;
  if (position <= 1 / 3) return "foundational";
  if (position <= 2 / 3) return "developing";
  return "advanced";
}

export function normalizeBankPrompt(prompt: string) {
  const value = prompt.trim().replace(/\s+/g, " ");
  if (value.length < 2 || value.length > 2_000) {
    throw new ConvexError({ code: "QUESTION_BANK_PROMPT_INVALID" as const });
  }
  return value.toLocaleLowerCase("en").slice(0, 500);
}

export function normalizeQuestionBankTags(values: readonly string[]) {
  if (values.length > 8) {
    throw new ConvexError({ code: "QUESTION_BANK_TAGS_INVALID" as const });
  }
  const tags = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (
    tags.some(
      (tag) =>
        tag.length > 32 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag),
    ) ||
    new Set(tags).size !== tags.length
  ) {
    throw new ConvexError({ code: "QUESTION_BANK_TAGS_INVALID" as const });
  }
  return tags;
}

export function isRandomBankSection(section: Doc<"assessmentSections">) {
  return section.deliveryMode === "random-bank";
}

export async function deliveredItemAt(
  ctx: AssessmentReadCtx,
  attemptId: Id<"assessmentAttempts">,
  section: Doc<"assessmentSections">,
  order: number,
): Promise<DeliveredAssessmentItem | null> {
  if (isRandomBankSection(section)) {
    const selection = await ctx.db
      .query("assessmentAttemptItems")
      .withIndex("by_attempt_id_and_section_id_and_order", (q) =>
        q
          .eq("attemptId", attemptId)
          .eq("sectionId", section._id)
          .eq("order", order),
      )
      .unique();
    if (selection === null || selection.selectionContract !== 1) return null;
    const item = await ctx.db.get("assessmentItems", selection.itemId);
    if (item === null) return null;
    return {
      item,
      order: selection.order,
      targetSectionId: section._id,
      bankQuestionId: selection.bankQuestionId,
    };
  }

  const item = await ctx.db
    .query("assessmentItems")
    .withIndex("by_section_id_and_order", (q) =>
      q.eq("sectionId", section._id).eq("order", order),
    )
    .unique();
  if (item === null || item.versionId !== section.versionId) return null;
  return { item, order: item.order, targetSectionId: section._id };
}

export async function listDeliveredSectionItems(
  ctx: AssessmentReadCtx,
  attemptId: Id<"assessmentAttempts">,
  section: Doc<"assessmentSections">,
): Promise<DeliveredAssessmentItem[]> {
  if (isRandomBankSection(section)) {
    const selections = await ctx.db
      .query("assessmentAttemptItems")
      .withIndex("by_attempt_id_and_section_id_and_order", (q) =>
        q.eq("attemptId", attemptId).eq("sectionId", section._id),
      )
      .take(section.itemCount + 1);
    if (
      selections.length !== section.itemCount ||
      selections.some((selection, index) => selection.order !== index)
    ) {
      throw new ConvexError({ code: "QUESTION_BANK_SELECTION_INVALID" as const });
    }
    const result: DeliveredAssessmentItem[] = [];
    for (const selection of selections) {
      const item = await ctx.db.get("assessmentItems", selection.itemId);
      if (item === null) {
        throw new ConvexError({ code: "QUESTION_BANK_SOURCE_MISSING" as const });
      }
      result.push({
        item,
        order: selection.order,
        targetSectionId: section._id,
        bankQuestionId: selection.bankQuestionId,
      });
    }
    return result;
  }

  const items = await ctx.db
    .query("assessmentItems")
    .withIndex("by_section_id_and_order", (q) => q.eq("sectionId", section._id))
    .take(section.itemCount + 1);
  if (
    items.length !== section.itemCount ||
    items.some(
      (item, index) =>
        item.versionId !== section.versionId || item.order !== index,
    )
  ) {
    throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
  }
  return items.map((item) => ({
    item,
    order: item.order,
    targetSectionId: section._id,
  }));
}

export async function assertDeliveredItem(
  ctx: AssessmentReadCtx,
  attemptId: Id<"assessmentAttempts">,
  section: Doc<"assessmentSections">,
  itemId: Id<"assessmentItems">,
) {
  if (!isRandomBankSection(section)) {
    const item = await ctx.db.get("assessmentItems", itemId);
    return item !== null && item.versionId === section.versionId && item.sectionId === section._id
      ? item
      : null;
  }
  const selection = await ctx.db
    .query("assessmentAttemptItems")
    .withIndex("by_attempt_id_and_item_id", (q) =>
      q.eq("attemptId", attemptId).eq("itemId", itemId),
    )
    .unique();
  if (selection === null || selection.sectionId !== section._id) return null;
  return await ctx.db.get("assessmentItems", selection.itemId);
}

export function shuffled<T>(values: readonly T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export async function prepareRandomSelectionPlans(
  ctx: QuestionBankMutationCtx,
  sections: readonly Doc<"assessmentSections">[],
) {
  const plans = new Map<
    Id<"assessmentSections">,
    Array<Doc<"assessmentQuestionBank">>
  >();
  for (const section of sections) {
    if (!isRandomBankSection(section)) continue;
    if (
      section.bankProfile === undefined ||
      section.bankSelectionContract !== 1 ||
      section.itemCount < 1 ||
      section.itemCount > 80
    ) {
      throw new ConvexError({ code: "QUESTION_BANK_SECTION_INVALID" as const });
    }
    const rows = await ctx.db
      .query("assessmentQuestionBank")
      .withIndex("by_profile_and_status_and_skill", (q) =>
        q
          .eq("profile", section.bankProfile!)
          .eq("status", "ready")
          .eq("skill", section.skill),
      )
      .take(81);
    if (rows.length > 80) {
      throw new ConvexError({ code: "QUESTION_BANK_POOL_LIMIT" as const });
    }
    const eligible: Array<Doc<"assessmentQuestionBank">> = [];
    const fingerprints = new Set<string>();
    for (const row of rows) {
      if (!row.fullPracticeEligible || fingerprints.has(row.contentFingerprint)) {
        continue;
      }
      const [item, answerKey] = await Promise.all([
        ctx.db.get("assessmentItems", row.sourceItemId),
        ctx.db
          .query("assessmentAnswerKeys")
          .withIndex("by_item_id", (q) => q.eq("itemId", row.sourceItemId))
          .unique(),
      ]);
      if (
        item === null ||
        answerKey === null ||
        item.versionId !== row.sourceVersionId ||
        item.sectionId !== row.sourceSectionId ||
        answerKey.versionId !== row.sourceVersionId
      ) {
        continue;
      }
      const [sourceVersion, sourceDefinition] = await Promise.all([
        ctx.db.get("assessmentVersions", row.sourceVersionId),
        ctx.db.get("assessmentDefinitions", row.sourceDefinitionId),
      ]);
      if (
        sourceVersion?.status !== "published" ||
        sourceDefinition?.visibility !== "published" ||
        sourceDefinition.publishedVersionId !== sourceVersion._id
      ) {
        continue;
      }
      if (item.stimulusId !== undefined) {
        const stimulus = await ctx.db.get("assessmentStimuli", item.stimulusId);
        if (
          stimulus === null ||
          stimulus.versionId !== item.versionId ||
          stimulus.sectionId !== item.sectionId
        ) {
          continue;
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
            media.purpose !== "assessment-audio" ||
            media.assessmentVersionId !== item.versionId
          ) {
            continue;
          }
        }
      }
      fingerprints.add(row.contentFingerprint);
      eligible.push(row);
    }
    if (eligible.length < section.itemCount) {
      throw new ConvexError({
        code: "QUESTION_BANK_POOL_SHORTAGE" as const,
        skill: section.skill,
        required: section.itemCount,
        available: eligible.length,
      });
    }
    plans.set(section._id, shuffled(eligible).slice(0, section.itemCount));
  }
  return plans;
}
