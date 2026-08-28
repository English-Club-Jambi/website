import { ConvexError } from "convex/values";

import { isTaskFamilyForSkill } from "../../content/assessment-task-families";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { projectReadyQuestionAudio } from "./media";

type AssessmentReadCtx = Pick<QueryCtx | MutationCtx, "db">;
type QuestionBankMutationCtx = Pick<MutationCtx, "db">;

export const QUESTION_BANK_AUTHORING_LEDGER_SLUG =
  "paper-question-bank-authoring-ledger";

export type AssessmentTaskFamily =
  | "complete-words"
  | "read-daily-life"
  | "read-academic-passage"
  | "listen-choose-response"
  | "listen-conversation"
  | "listen-announcement"
  | "listen-academic-talk"
  | "structure-sentence-completion"
  | "structure-written-expression"
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
  illustrationMediaId?: Id<"mediaAssets">;
  audioMediaId?: Id<"mediaAssets">;
  dependencyGroupKey?: string;
  dependencyRole?: "anchor" | "follow-up";
  parentAttemptItemOrder?: number;
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
  ["structure-completion-", "structure-sentence-completion"],
  ["structure-expression-", "structure-written-expression"],
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
      return "structure-sentence-completion";
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

export function questionBankSourceIsReady(
  row: Doc<"assessmentQuestionBank">,
  item: Doc<"assessmentItems"> | null,
  answerKey: Doc<"assessmentAnswerKeys"> | null,
  version: Doc<"assessmentVersions"> | null,
  definition: Doc<"assessmentDefinitions"> | null,
) {
  if (
    item === null ||
    answerKey === null ||
    version === null ||
    definition === null ||
    item.versionId !== row.sourceVersionId ||
    item.sectionId !== row.sourceSectionId ||
    answerKey.versionId !== row.sourceVersionId ||
    version.definitionId !== definition._id ||
    definition._id !== row.sourceDefinitionId ||
    definition.profile !== row.profile
  ) {
    return false;
  }
  if (row.origin === "bank-authored") {
    return (
      definition.internalOnly === true &&
      definition.slug === QUESTION_BANK_AUTHORING_LEDGER_SLUG &&
      version.status === "ready"
    );
  }
  return (
    version.status === "published" &&
    definition.visibility === "published" &&
    definition.publishedVersionId === version._id
  );
}

export async function resolveReadyQuestionAudio(
  ctx: AssessmentReadCtx,
  row: Doc<"assessmentQuestionBank">,
  sourceItem?: Doc<"assessmentItems"> | null,
) {
  if (row.skill !== "listening") return null;
  const item =
    sourceItem === undefined
      ? await ctx.db.get("assessmentItems", row.sourceItemId)
      : sourceItem;
  if (
    item === null ||
    item._id !== row.sourceItemId ||
    item.versionId !== row.sourceVersionId ||
    item.sectionId !== row.sourceSectionId
  ) {
    return null;
  }
  if (row.audioMediaId !== undefined) {
    return await projectReadyQuestionAudio(ctx, row.audioMediaId);
  }
  if (item.stimulusId === undefined) return null;
  const stimulus = await ctx.db.get("assessmentStimuli", item.stimulusId);
  if (
    stimulus === null ||
    stimulus.kind !== "audio" ||
    stimulus.versionId !== item.versionId ||
    stimulus.sectionId !== item.sectionId
  ) {
    return null;
  }
  return await projectReadyQuestionAudio(
    ctx,
    stimulus.mediaId,
    item.versionId,
  );
}

/**
 * Applies the source-integrity gate shared by catalogue capacity, Practice
 * Format previews, and live random delivery. The legacy
 * `fullPracticeEligible` field is intentionally not part of this decision;
 * version-level rules own format overrides.
 */
export async function questionBankRowIsReadyForSelection(
  ctx: AssessmentReadCtx,
  row: Doc<"assessmentQuestionBank">,
) {
  if (
    row.status !== "ready" ||
    !isTaskFamilyForSkill(row.skill, row.taskFamily)
  ) {
    return false;
  }
  const [item, answerKey, version, definition, sourceSection] = await Promise.all([
    ctx.db.get("assessmentItems", row.sourceItemId),
    ctx.db
      .query("assessmentAnswerKeys")
      .withIndex("by_item_id", (q) => q.eq("itemId", row.sourceItemId))
      .unique(),
    ctx.db.get("assessmentVersions", row.sourceVersionId),
    ctx.db.get("assessmentDefinitions", row.sourceDefinitionId),
    ctx.db.get("assessmentSections", row.sourceSectionId),
  ]);
  if (
    !questionBankSourceIsReady(row, item, answerKey, version, definition) ||
    sourceSection === null ||
    sourceSection.versionId !== row.sourceVersionId ||
    sourceSection.skill !== row.skill
  ) {
    return false;
  }
  return (
    row.skill !== "listening" ||
    (await resolveReadyQuestionAudio(ctx, row, item)) !== null
  );
}

/**
 * Defines the inherited Practice Format rule before an administrator adds an
 * explicit allow/disable override. Full and quick formats share the same
 * reviewed bank for their profile; the section query applies the exact skill
 * boundary before this rule is evaluated.
 */
export function questionAllowedByDefaultForFormat(
  definition: Doc<"assessmentDefinitions">,
  question: Doc<"assessmentQuestionBank">,
) {
  return (
    definition.kind !== "club-program-quiz" &&
    definition.profile === question.profile &&
    question.status === "ready"
  );
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
      illustrationMediaId: selection.illustrationMediaId,
      audioMediaId: selection.audioMediaId,
      dependencyGroupKey: selection.dependencyGroupKey,
      dependencyRole: selection.dependencyRole,
      parentAttemptItemOrder: selection.parentAttemptItemOrder,
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
        illustrationMediaId: selection.illustrationMediaId,
        audioMediaId: selection.audioMediaId,
        dependencyGroupKey: selection.dependencyGroupKey,
        dependencyRole: selection.dependencyRole,
        parentAttemptItemOrder: selection.parentAttemptItemOrder,
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
  return shuffledWithRandom(values, Math.random);
}

export function shuffledWithRandom<T>(
  values: readonly T[],
  random: () => number,
) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

type StructuredBankRow = Pick<
  Doc<"assessmentQuestionBank">,
  "_id" | "dependencyGroupKey" | "dependencyRole" | "parentBankQuestionId"
>;

/**
 * Selects an exact item count while preserving dependency closure. Follow-ups
 * may be sampled, but their anchor is inserted once and every selected group
 * is recomposed into one contiguous, parent-first block.
 */
export function selectStructuredQuestionBankRows<T extends StructuredBankRow>(
  values: readonly T[],
  itemCount: number,
  random: () => number = Math.random,
) {
  if (!Number.isInteger(itemCount) || itemCount < 1) return [];
  const rowsById = new Map(values.map((row) => [String(row._id), row]));
  const selected: T[] = [];
  const selectedIds = new Set<string>();

  function add(row: T) {
    const id = String(row._id);
    if (selectedIds.has(id) || selected.length >= itemCount) return false;
    selected.push(row);
    selectedIds.add(id);
    return true;
  }

  for (const row of shuffledWithRandom(values, random)) {
    if (selected.length >= itemCount) break;
    if (row.dependencyRole !== "follow-up") {
      add(row);
      continue;
    }
    if (row.parentBankQuestionId === undefined) continue;
    const parent = rowsById.get(String(row.parentBankQuestionId));
    if (
      parent === undefined ||
      parent.dependencyRole !== "anchor" ||
      parent.dependencyGroupKey === undefined ||
      parent.dependencyGroupKey !== row.dependencyGroupKey
    ) {
      continue;
    }
    if (!selectedIds.has(String(parent._id))) {
      if (itemCount - selected.length < 2) continue;
      add(parent);
    }
    add(row);
  }

  if (selected.length !== itemCount) return [];
  const orderById = new Map(
    selected.map((row, index) => [String(row._id), index]),
  );
  const emittedGroups = new Set<string>();
  const recomposed: T[] = [];
  for (const row of selected) {
    const groupKey = row.dependencyGroupKey;
    if (groupKey === undefined) {
      recomposed.push(row);
      continue;
    }
    if (emittedGroups.has(groupKey)) continue;
    emittedGroups.add(groupKey);
    const groupRows = selected
      .filter((candidate) => candidate.dependencyGroupKey === groupKey)
      .sort((left, right) => {
        if (left.dependencyRole === "anchor") return -1;
        if (right.dependencyRole === "anchor") return 1;
        return (
          (orderById.get(String(left._id)) ?? 0) -
          (orderById.get(String(right._id)) ?? 0)
        );
      });
    recomposed.push(...groupRows);
  }
  return recomposed;
}

function dependencyMetadataIsIndependent(row: StructuredBankRow) {
  return (
    row.dependencyGroupKey === undefined &&
    row.dependencyRole === undefined &&
    row.parentBankQuestionId === undefined
  );
}

async function dependencyMetadataIsReady(
  ctx: AssessmentReadCtx,
  row: Doc<"assessmentQuestionBank">,
  eligibleById: ReadonlyMap<string, Doc<"assessmentQuestionBank">>,
  itemCache: Map<string, Doc<"assessmentItems"> | null>,
) {
  if (dependencyMetadataIsIndependent(row)) return true;
  const groupKey = row.dependencyGroupKey?.trim();
  if (groupKey === undefined || groupKey.length < 3 || groupKey.length > 120) {
    return false;
  }
  if (row.dependencyRole === "anchor") {
    return row.parentBankQuestionId === undefined;
  }
  if (
    row.dependencyRole !== "follow-up" ||
    row.parentBankQuestionId === undefined ||
    String(row.parentBankQuestionId) === String(row._id)
  ) {
    return false;
  }
  const parent = eligibleById.get(String(row.parentBankQuestionId));
  if (
    parent === undefined ||
    parent.dependencyRole !== "anchor" ||
    parent.parentBankQuestionId !== undefined ||
    parent.dependencyGroupKey !== row.dependencyGroupKey ||
    parent.profile !== row.profile ||
    parent.skill !== row.skill
  ) {
    return false;
  }

  async function getItem(question: Doc<"assessmentQuestionBank">) {
    const key = String(question.sourceItemId);
    if (!itemCache.has(key)) {
      itemCache.set(key, await ctx.db.get("assessmentItems", question.sourceItemId));
    }
    return itemCache.get(key) ?? null;
  }
  const [item, parentItem] = await Promise.all([getItem(row), getItem(parent)]);
  if (item === null || parentItem === null) return false;
  if (row.skill === "listening") {
    const [audio, parentAudio] = await Promise.all([
      resolveReadyQuestionAudio(ctx, row, item),
      resolveReadyQuestionAudio(ctx, parent, parentItem),
    ]);
    return audio !== null && parentAudio !== null && audio.mediaId === parentAudio.mediaId;
  }
  return (
    item.stimulusId !== undefined &&
    item.stimulusId === parentItem.stimulusId
  );
}

export async function listEligibleBankQuestionsForSection(
  ctx: AssessmentReadCtx,
  section: Doc<"assessmentSections">,
) {
  if (
    !isRandomBankSection(section) ||
    section.bankProfile === undefined ||
    section.bankSelectionContract !== 1 ||
    section.itemCount < 1 ||
    section.itemCount > 80
  ) {
    throw new ConvexError({ code: "QUESTION_BANK_SECTION_INVALID" as const });
  }
  const version = await ctx.db.get("assessmentVersions", section.versionId);
  const definition =
    version === null
      ? null
      : await ctx.db.get("assessmentDefinitions", version.definitionId);
  if (version === null || definition === null) {
    throw new ConvexError({ code: "QUESTION_BANK_SECTION_INVALID" as const });
  }
  const [rows, rules] = await Promise.all([
    ctx.db
      .query("assessmentQuestionBank")
      .withIndex("by_profile_and_status_and_skill", (q) =>
        q
          .eq("profile", section.bankProfile!)
          .eq("status", "ready")
          .eq("skill", section.skill),
      )
      .take(201),
    ctx.db
      .query("assessmentVersionQuestionRules")
      .withIndex("by_version_id_and_allowed_and_updated_at", (q) =>
        q.eq("versionId", version._id),
      )
      .take(201),
  ]);
  if (rows.length > 200 || rules.length > 200) {
    throw new ConvexError({ code: "QUESTION_BANK_POOL_LIMIT" as const });
  }
  const ruleQuestions = await Promise.all(
    rules.map(async (rule) => ({
      rule,
      question: await ctx.db.get("assessmentQuestionBank", rule.bankQuestionId),
    })),
  );
  const ruleByFingerprint = new Map<string, boolean>();
  for (const { rule, question } of ruleQuestions) {
    if (
      question === null ||
      question.profile !== section.bankProfile ||
      question.skill !== section.skill
    ) {
      continue;
    }
    const current = ruleByFingerprint.get(question.contentFingerprint);
    // A disable wins over an allow for the same logical question. This keeps a
    // duplicate source row from leaking content that an administrator disabled.
    ruleByFingerprint.set(
      question.contentFingerprint,
      current === false || rule.allowed === false ? false : true,
    );
  }
  const sourceReady: Array<Doc<"assessmentQuestionBank">> = [];
  const fingerprints = new Set<string>();
  const orderedRows = [...rows].sort(
    (left, right) =>
      left._creationTime - right._creationTime ||
      String(left._id).localeCompare(String(right._id)),
  );
  for (const row of orderedRows) {
    const allowedByDefault = questionAllowedByDefaultForFormat(
      definition,
      row,
    );
    if (!(ruleByFingerprint.get(row.contentFingerprint) ?? allowedByDefault)) {
      continue;
    }
    if (fingerprints.has(row.contentFingerprint)) continue;
    if (!(await questionBankRowIsReadyForSelection(ctx, row))) continue;
    fingerprints.add(row.contentFingerprint);
    sourceReady.push(row);
  }
  const sourceReadyById = new Map(
    sourceReady.map((row) => [String(row._id), row]),
  );
  const itemCache = new Map<string, Doc<"assessmentItems"> | null>();
  const eligible: Array<Doc<"assessmentQuestionBank">> = [];
  for (const row of sourceReady) {
    if (await dependencyMetadataIsReady(ctx, row, sourceReadyById, itemCache)) {
      eligible.push(row);
    }
  }
  return eligible;
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
    const eligible = await listEligibleBankQuestionsForSection(ctx, section);
    if (eligible.length < section.itemCount) {
      throw new ConvexError({
        code: "QUESTION_BANK_POOL_SHORTAGE" as const,
        skill: section.skill,
        required: section.itemCount,
        available: eligible.length,
      });
    }
    const selected = selectStructuredQuestionBankRows(
      eligible,
      section.itemCount,
    );
    const fingerprints = new Set(
      selected.map((question) => question.contentFingerprint),
    );
    const selectedOrderById = new Map(
      selected.map((question, index) => [String(question._id), index]),
    );
    if (
      selected.length !== section.itemCount ||
      fingerprints.size !== selected.length ||
      selected.some(
        (question, index) => {
          if (
            question.skill !== section.skill ||
            !isTaskFamilyForSkill(question.skill, question.taskFamily)
          ) {
            return true;
          }
          if (question.dependencyRole !== "follow-up") return false;
          const parentOrder =
            question.parentBankQuestionId === undefined
              ? undefined
              : selectedOrderById.get(String(question.parentBankQuestionId));
          return (
            parentOrder === undefined ||
            parentOrder >= index ||
            selected[parentOrder]?.dependencyGroupKey !==
              question.dependencyGroupKey
          );
        },
      )
    ) {
      throw new ConvexError({
        code: "QUESTION_BANK_SELECTION_INVALID" as const,
        skill: section.skill,
      });
    }
    plans.set(section._id, selected);
  }
  return plans;
}
