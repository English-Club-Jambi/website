import { convexTest } from "convex-test";
import type { FunctionReturnType } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "../../convex/_generated/api";
import { publicAssessmentDerivativeKey } from "../../convex/lib/assessmentMedia";
import schema from "../../convex/schema";

const rawModules = import.meta.glob("../../convex/**/*.ts");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, loader]) => [
    path.replace("../../convex", "."),
    loader,
  ]),
);

const confirm = "seed-ec-ibt-style-2026-v1" as const;

function harness() {
  return convexTest(schema, modules);
}

afterEach(() => {
  vi.useRealTimers();
});

async function seedOwner(t: ReturnType<typeof harness>) {
  return await t.mutation(internal.adminUsers.bootstrapOwner, {
    tokenIdentifier: "https://example.test|seed-owner",
    displayName: "Practice Publisher",
    email: "practice-publisher@example.test",
  });
}

async function attachAllAudio(
  t: ReturnType<typeof harness>,
  prepared: FunctionReturnType<typeof internal.assessmentSeed.prepareIbtPractice>,
) {
  const plan = prepared.audio;
  for (let offset = 0; offset < plan.length; offset += 20) {
    const assets = plan.slice(offset, offset + 20).map((entry, index) => {
      const checksumSha256 = (offset + index + 1).toString(16).padStart(64, "0");
      return {
        versionId: entry.versionId,
        stimulusId: entry.stimulusId,
        objectKey: publicAssessmentDerivativeKey({
          versionId: entry.versionId,
          checksumSha256,
          extension: "mp3",
        }),
        checksumSha256,
        byteSize: 12_000 + offset + index,
        durationMs: 4_000 + offset + index,
      };
    });
    await t.mutation(internal.assessmentSeed.attachPublicAudio, {
      confirm,
      assets,
    });
  }
}

describe("four-skill assessment seed", () => {
  it("authors an illustrated bank question and delivers it through a random live session", async () => {
    const t = harness();
    const ownerId = await seedOwner(t);
    const owner = t.withIdentity({
      tokenIdentifier: "https://example.test|seed-owner",
    });
    const now = Date.now();
    const illustrationMediaId = await t.run(async (ctx) =>
      await ctx.db.insert("mediaAssets", {
        objectKey: "uploads/assessment-image/wetland-field-guide.webp",
        purpose: "assessment-image",
        contentType: "image/webp",
        byteSize: 24_000,
        status: "ready",
        originalName: "wetland-field-guide.webp",
        alt: "A field guide open beside wetland observation notes",
        width: 1_200,
        height: 800,
        access: "public",
        uploadedBy: ownerId,
        verifiedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    );
    const input = {
      requestId: "bank-question-authored-live-0001",
      skill: "reading" as const,
      taskFamily: "read-daily-life" as const,
      difficulty: "developing" as const,
      prompt: "Which note best records a change observed at the wetland?",
      options: [
        { key: "a", label: "The water level rose after two days of rain." },
        { key: "b", label: "The field guide has a green cover." },
        { key: "c", label: "The observer carried a pencil." },
        { key: "d", label: "The path begins beside the car park." },
      ],
      correctChoiceKey: "a",
      explanation:
        "The first note records a measurable change over time; the other choices describe fixed details.",
      tags: ["field-notes", "detail"],
      illustrationMediaId,
    };
    const created = await owner.mutation(
      api.adminAssessmentQuestionBank.createQuestion,
      input,
    );
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.createQuestion, input),
    ).resolves.toEqual({ ...created, created: false });
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.createQuestion, {
        ...input,
        requestId: "bank-question-authored-live-0002",
        taskFamily: "listen-conversation",
      }),
    ).rejects.toThrow();
    const wrongPurposeMediaId = await t.run(async (ctx) =>
      await ctx.db.insert("mediaAssets", {
        objectKey: "uploads/page-image/not-a-question-illustration.webp",
        purpose: "page-image",
        contentType: "image/webp",
        byteSize: 18_000,
        status: "ready",
        originalName: "not-a-question-illustration.webp",
        alt: "A generic public page image",
        width: 900,
        height: 600,
        access: "public",
        uploadedBy: ownerId,
        verifiedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    );
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.createQuestion, {
        ...input,
        requestId: "bank-question-authored-live-0003",
        prompt: "Which note describes the weather at the observation point?",
        illustrationMediaId: wrongPurposeMediaId,
      }),
    ).rejects.toThrow();

    const paused = await owner.query(api.adminAssessmentQuestionBank.listPage, {
      status: "paused",
      skill: "reading",
      paginationOpts: {
        cursor: null,
        numItems: 20,
        maximumRowsRead: 20,
      },
    });
    const authored = paused.page.find(
      (entry) => entry.bankQuestionId === created.bankQuestionId,
    );
    expect(authored).toMatchObject({
      origin: "bank-authored",
      fullPracticeEligible: false,
      sourceVisibility: "draft",
      illustration: {
        mediaId: illustrationMediaId,
        publicUrl:
          "https://r2.mukhtada.my.id/uploads/assessment-image/wetland-field-guide.webp",
        width: 1_200,
        height: 800,
      },
    });
    if (authored === undefined) throw new Error("Authored question was not listed.");
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.updateMetadata, {
        bankQuestionId: authored.bankQuestionId,
        expectedUpdatedAt: authored.updatedAt,
        status: "ready",
        taskFamily: authored.taskFamily,
        difficulty: authored.difficulty,
        fullPracticeEligible: true,
        tags: authored.tags,
        illustrationMediaId,
      }),
    ).resolves.toMatchObject({ ok: true });

    const full = await t.run(async (ctx) => {
      const definitionId = await ctx.db.insert("assessmentDefinitions", {
        slug: "illustrated-random-practice",
        kind: "full-practice",
        profile: "ec-ibt-style-2026-v1",
        adminTitle: "Illustrated random practice",
        nextVersion: 2,
        visibility: "published",
        createdBy: ownerId,
        updatedBy: ownerId,
        createdAt: now,
        updatedAt: now,
      });
      const versionId = await ctx.db.insert("assessmentVersions", {
        definitionId,
        version: 1,
        status: "published",
        title: "Illustrated Reading Practice",
        summary: "A one-question integration form.",
        instructions: "Read and choose the best answer.",
        locale: "en",
        timePolicy: "untimed",
        allowResume: true,
        reviewPolicy: "after-submit",
        scorePolicy: "practice-estimate-v1",
        defaultTimingMode: "untimed",
        defaultListeningMode: "transcript-supported",
        maxAttemptsPerDay: 4,
        contentRevision: 1,
        validatedRevision: 1,
        contentChecksum: "illustrated-random-practice-v1",
        createdBy: ownerId,
        publishedBy: ownerId,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      });
      await ctx.db.patch("assessmentDefinitions", definitionId, {
        publishedVersionId: versionId,
      });
      await ctx.db.insert("assessmentSections", {
        versionId,
        sectionKey: "reading",
        skill: "reading",
        order: 0,
        title: "Reading",
        instructions: "Read the prompt and choose the best answer.",
        itemCount: 1,
        deliveryMode: "random-bank",
        bankProfile: "ec-ibt-style-2026-v1",
        bankSelectionContract: 1,
      });
      return { definitionId, versionId };
    });
    const authUserId = await t.run(async (ctx) =>
      await ctx.db.insert("users", { isAnonymous: true }),
    );
    const learner = t.withIdentity({
      subject: `${authUserId}|session`,
      tokenIdentifier: "https://example.test|illustrated-bank-learner",
    });
    const attempt = await learner.mutation(api.assessmentAttempts.start, {
      ...full,
      timingMode: "untimed",
      timeMultiplier: 1,
      listeningMode: "transcript-supported",
      startRequestId: "illustrated-bank-attempt-0001",
    });
    const pinnedSelection = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentAttemptItems")
        .withIndex("by_attempt_id_and_bank_question_id", (q) =>
          q
            .eq("attemptId", attempt.attemptId)
            .eq("bankQuestionId", created.bankQuestionId),
        )
        .unique(),
    );
    expect(pinnedSelection?.illustrationMediaId).toBe(illustrationMediaId);
    await t.run(async (ctx) => {
      await ctx.db.patch("assessmentQuestionBank", created.bankQuestionId, {
        illustrationMediaId: undefined,
      });
    });
    await learner.mutation(api.assessmentAttempts.beginSection, {
      attemptId: attempt.attemptId,
    });
    const player = await learner.query(api.assessmentAttempts.getPlayer, {
      attemptId: attempt.attemptId,
    });
    expect(player).toMatchObject({
      item: { prompt: input.prompt },
      illustration: {
        mediaId: illustrationMediaId,
        alt: "A field guide open beside wetland observation notes",
        publicUrl:
          "https://r2.mukhtada.my.id/uploads/assessment-image/wetland-field-guide.webp",
      },
      navigation: { itemCount: 1, itemOrder: 0 },
    });
  });

  it("inserts five published forms atomically and is idempotent", async () => {
    const t = harness();
    await seedOwner(t);
    const first = await t.mutation(internal.assessmentSeed.prepareIbtPractice, { confirm });
    expect(first.definitions).toHaveLength(5);
    expect(first.definitions.every((entry) => entry.inserted)).toBe(true);
    expect(first.definitions.find((entry) => entry.slug === "four-skill-practice-form-1")?.itemCount).toBe(120);
    expect(first.audio.length).toBeGreaterThan(40);

    const second = await t.mutation(internal.assessmentSeed.prepareIbtPractice, { confirm });
    expect(second.definitions.every((entry) => !entry.inserted)).toBe(true);
    expect(second.audio.map((entry) => entry.stimulusId)).toEqual(
      first.audio.map((entry) => entry.stimulusId),
    );

    const verification = await t.query(internal.assessmentSeed.verifyIbtPractice, { confirm });
    const full = verification.definitions.find((entry) => entry.slug === "four-skill-practice-form-1");
    expect(full).toMatchObject({ published: true, items: 120 });
    expect(full?.sections).toEqual([
      { skill: "reading", items: 50, points: 35 },
      { skill: "listening", items: 47, points: 35 },
      { skill: "writing", items: 12, points: 20 },
      { skill: "speaking", items: 11, points: 55 },
    ]);
  });

  it("attaches immutable public audio metadata and rejects collisions", async () => {
    const t = harness();
    await seedOwner(t);
    const prepared = await t.mutation(internal.assessmentSeed.prepareIbtPractice, { confirm });
    const plan = prepared.audio[0];
    const checksumSha256 = "a".repeat(64);
    const objectKey = publicAssessmentDerivativeKey({
      versionId: plan.versionId,
      checksumSha256,
      extension: "mp3",
    });
    const input = {
      versionId: plan.versionId,
      stimulusId: plan.stimulusId,
      objectKey,
      checksumSha256,
      byteSize: 12_345,
      durationMs: 4_200,
    };
    await expect(t.mutation(internal.assessmentSeed.attachPublicAudio, {
      confirm,
      assets: [input],
    })).resolves.toEqual({ attached: 1, skipped: 0 });
    await expect(t.mutation(internal.assessmentSeed.attachPublicAudio, {
      confirm,
      assets: [input],
    })).resolves.toEqual({ attached: 0, skipped: 1 });
    await expect(t.mutation(internal.assessmentSeed.attachPublicAudio, {
      confirm,
      assets: [{ ...input, durationMs: 4_201 }],
    })).rejects.toThrow();
  });

  it("seeds a reusable bank and pins a random manifest to each full attempt", async () => {
    const t = harness();
    await seedOwner(t);
    const prepared = await t.mutation(
      internal.assessmentSeed.prepareIbtPractice,
      { confirm },
    );
    await attachAllAudio(t, prepared);

    await expect(
      t.mutation(internal.assessmentSeed.seedQuestionBank, { confirm }),
    ).resolves.toEqual({
      inserted: 145,
      existing: 0,
      eligible: 120,
      randomSections: 8,
    });
    await expect(
      t.mutation(internal.assessmentSeed.seedQuestionBank, { confirm }),
    ).resolves.toEqual({
      inserted: 0,
      existing: 145,
      eligible: 120,
      randomSections: 8,
    });
    await expect(
      t.query(internal.assessmentSeed.verifyQuestionBank, { confirm }),
    ).resolves.toMatchObject({
      total: 145,
      ready: 145,
      eligible: 120,
      randomSections: 8,
      bySkill: [
        { skill: "reading", eligible: 50 },
        { skill: "listening", eligible: 47 },
        { skill: "writing", eligible: 12 },
        { skill: "speaking", eligible: 11 },
      ],
    });

    const full = await t.run(async (ctx) => {
      const definition = await ctx.db
        .query("assessmentDefinitions")
        .withIndex("by_slug", (q) => q.eq("slug", "four-skill-practice-form-1"))
        .unique();
      if (definition?.publishedVersionId === undefined) {
        throw new Error("Full practice was not published.");
      }
      return {
        definitionId: definition._id,
        versionId: definition.publishedVersionId,
      };
    });
    const authUserId = await t.run(async (ctx) =>
      await ctx.db.insert("users", { isAnonymous: true }),
    );
    const learner = t.withIdentity({
      subject: `${authUserId}|session`,
      tokenIdentifier: "https://example.test|random-bank-learner",
    });
    const startArgs = {
      ...full,
      timingMode: "standard" as const,
      timeMultiplier: 1,
      listeningMode: "audio-primary" as const,
      startRequestId: "random-bank-attempt-0001",
    };
    const first = await learner.mutation(api.assessmentAttempts.start, startArgs);
    const retried = await learner.mutation(api.assessmentAttempts.start, startArgs);
    expect(retried.attemptId).toBe(first.attemptId);

    const manifest = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentAttemptItems")
        .withIndex("by_attempt_id_and_section_id_and_order", (q) =>
          q.eq("attemptId", first.attemptId),
        )
        .take(121),
    );
    expect(manifest).toHaveLength(120);
    expect(new Set(manifest.map((entry) => entry.bankQuestionId)).size).toBe(120);
    expect(new Set(manifest.map((entry) => entry.itemId)).size).toBe(120);
    expect(manifest.every((entry) => entry.selectionContract === 1)).toBe(true);

    const secondAttempt = await learner.mutation(api.assessmentAttempts.start, {
      ...startArgs,
      startRequestId: "random-bank-attempt-0002",
    });
    const secondManifest = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentAttemptItems")
        .withIndex("by_attempt_id_and_section_id_and_order", (q) =>
          q.eq("attemptId", secondAttempt.attemptId),
        )
        .take(121),
    );
    expect(secondManifest.map((entry) => entry.itemId)).not.toEqual(
      manifest.map((entry) => entry.itemId),
    );

    const quickReading = await t.run(async (ctx) => {
      const definition = await ctx.db
        .query("assessmentDefinitions")
        .withIndex("by_slug", (q) =>
          q.eq("slug", "quick-reading-text-in-context"),
        )
        .unique();
      if (definition?.publishedVersionId === undefined) {
        throw new Error("Quick Reading was not published.");
      }
      return {
        definitionId: definition._id,
        versionId: definition.publishedVersionId,
      };
    });
    const quickAttempt = await learner.mutation(api.assessmentAttempts.start, {
      ...quickReading,
      timingMode: "standard",
      timeMultiplier: 1,
      listeningMode: "audio-primary",
      startRequestId: "random-quick-reading-attempt-0001",
    });
    const quickManifest = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentAttemptItems")
        .withIndex("by_attempt_id_and_section_id_and_order", (q) =>
          q.eq("attemptId", quickAttempt.attemptId),
        )
        .take(9),
    );
    expect(quickManifest).toHaveLength(8);
    expect(
      await t.run(async (ctx) =>
        await Promise.all(
          quickManifest.map(async (entry) =>
            (await ctx.db.get("assessmentQuestionBank", entry.bankQuestionId))
              ?.skill,
          ),
        ),
      ),
    ).toEqual(Array.from({ length: 8 }, () => "reading"));

    await expect(
      t.query(api.adminAssessmentQuestionBank.getSummary, {}),
    ).rejects.toThrow();
    const owner = t.withIdentity({
      tokenIdentifier: "https://example.test|seed-owner",
    });
    const page = await owner.query(api.adminAssessmentQuestionBank.listPage, {
      status: "ready",
      skill: "reading",
      difficulty: "advanced",
      paginationOpts: {
        cursor: null,
        numItems: 20,
        maximumRowsRead: 20,
      },
    });
    expect(page.page.length).toBeGreaterThan(0);
    expect(
      page.page.every(
        (entry) =>
          entry.skill === "reading" &&
          entry.status === "ready" &&
          entry.difficulty === "advanced" &&
          entry.tags.includes("original-question") &&
          entry.tags.includes("source-ets-2026-blueprint"),
      ),
    ).toBe(true);
    expect(
      page.page.some((entry) =>
        entry.tags.some((tag) => tag.startsWith("source-epa-") || tag.startsWith("source-nih-") || tag.startsWith("source-noaa-")),
      ),
    ).toBe(true);
    const edited = page.page[0];
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.updateMetadata, {
        bankQuestionId: edited.bankQuestionId,
        expectedUpdatedAt: edited.updatedAt,
        status: edited.status,
        taskFamily: "listen-conversation",
        difficulty: edited.difficulty,
        fullPracticeEligible: edited.fullPracticeEligible,
        tags: edited.tags,
        illustrationMediaId: null,
      }),
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.updateMetadata, {
        bankQuestionId: edited.bankQuestionId,
        expectedUpdatedAt: edited.updatedAt,
        status: "paused",
        taskFamily: edited.taskFamily,
        difficulty: edited.difficulty,
        fullPracticeEligible: false,
        tags: ["reading", "review-later"],
        illustrationMediaId: null,
      }),
    ).resolves.toMatchObject({ ok: true });
    const paused = await owner.query(api.adminAssessmentQuestionBank.listPage, {
      status: "paused",
      skill: "reading",
      paginationOpts: {
        cursor: null,
        numItems: 20,
        maximumRowsRead: 20,
      },
    });
    expect(paused.page.map((entry) => entry.bankQuestionId)).toContain(
      edited.bankQuestionId,
    );
  });

  it("versions per-format eligibility and exposes privacy-safe flag review signals", async () => {
    vi.useFakeTimers();
    const t = harness();
    await seedOwner(t);
    const prepared = await t.mutation(
      internal.assessmentSeed.prepareIbtPractice,
      { confirm },
    );
    await attachAllAudio(t, prepared);
    await t.mutation(internal.assessmentSeed.seedQuestionBank, { confirm });

    const owner = t.withIdentity({
      tokenIdentifier: "https://example.test|seed-owner",
    });
    await owner.mutation(api.adminUsers.setAccess, {
      tokenIdentifier: "https://example.test|pool-publisher",
      displayName: "Pool Publisher",
      email: "pool-publisher@example.test",
      role: "publisher",
      status: "active",
    });
    await owner.mutation(api.adminUsers.setAccess, {
      tokenIdentifier: "https://example.test|pool-editor",
      displayName: "Pool Editor",
      email: "pool-editor@example.test",
      role: "editor",
      status: "active",
    });
    const publisher = t.withIdentity({
      tokenIdentifier: "https://example.test|pool-publisher",
    });
    const editor = t.withIdentity({
      tokenIdentifier: "https://example.test|pool-editor",
    });
    const published = await t.run(async (ctx) => {
      const definition = await ctx.db
        .query("assessmentDefinitions")
        .withIndex("by_slug", (q) =>
          q.eq("slug", "four-skill-practice-form-1"),
        )
        .unique();
      if (definition?.publishedVersionId === undefined) {
        throw new Error("The fixed full-practice format was not seeded.");
      }
      return {
        definitionId: definition._id,
        versionId: definition.publishedVersionId,
      };
    });

    const publishedPool = await owner.query(
      api.adminAssessmentPools.getOverview,
      { definitionId: published.definitionId },
    );
    await expect(
      t.query(api.adminAssessmentPools.getOverview, {
        definitionId: published.definitionId,
      }),
    ).rejects.toThrow();
    expect(publishedPool?.version).toMatchObject({
      source: "published",
      mutable: false,
    });
    expect(
      publishedPool?.sections.every(
        (section) => section.allowedCount >= section.requiredCount,
      ),
    ).toBe(true);
    expect(JSON.stringify(publishedPool)).not.toMatch(
      /ownerTokenIdentifier|attemptId|selectedChoiceKey|correctChoiceKey/,
    );

    const clone = await owner.mutation(
      api.adminAssessments.createDraftFromPublished,
      { definitionId: published.definitionId },
    );
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const workingPool = await owner.query(
      api.adminAssessmentPools.getOverview,
      { definitionId: published.definitionId },
    );
    expect(workingPool?.version).toMatchObject({
      versionId: clone.versionId,
      source: "working",
      mutable: true,
      contentRevision: 1,
    });
    const allowedReading = workingPool?.questions.find(
      (question) =>
        question.skill === "reading" && question.effectiveAllowed,
    );
    const extraReading = workingPool?.questions.find(
      (question) =>
        question.skill === "reading" &&
        question.effectiveAllowed &&
        question.bankQuestionId !== allowedReading?.bankQuestionId,
    );
    if (allowedReading === undefined || extraReading === undefined) {
      throw new Error("Expected two inherited reading questions.");
    }
    const initialReading = workingPool?.sections.find(
      (section) => section.skill === "reading",
    );
    const initialSpeaking = workingPool?.sections.find(
      (section) => section.skill === "speaking",
    );
    if (initialReading === undefined || initialSpeaking === undefined) {
      throw new Error("Expected reading and speaking pool sections.");
    }

    await expect(
      publisher.mutation(api.adminAssessmentPools.setQuestionAllowed, {
        definitionId: published.definitionId,
        bankQuestionId: allowedReading.bankQuestionId,
        allowed: false,
        expectedContentRevision: 1,
      }),
    ).rejects.toThrow();

    await expect(
      owner.mutation(api.adminAssessmentPools.setQuestionAllowed, {
        definitionId: published.definitionId,
        bankQuestionId: allowedReading.bankQuestionId,
        allowed: false,
        expectedContentRevision: 1,
      }),
    ).resolves.toMatchObject({ ok: true, changed: true, contentRevision: 2 });

    const shortPool = await owner.query(
      api.adminAssessmentPools.getOverview,
      { definitionId: published.definitionId },
    );
    expect(
      shortPool?.sections.find((section) => section.skill === "reading"),
    ).toMatchObject({
      requiredCount: 50,
    });
    expect(
      shortPool?.questions.find(
        (question) => question.bankQuestionId === allowedReading.bankQuestionId,
      ),
    ).toMatchObject({ ruleState: "disabled", effectiveAllowed: false });

    await expect(
      owner.mutation(api.adminAssessmentPools.setQuestionAllowed, {
        definitionId: published.definitionId,
        bankQuestionId: allowedReading.bankQuestionId,
        allowed: true,
        expectedContentRevision: 2,
      }),
    ).resolves.toMatchObject({ ok: true, changed: true, contentRevision: 3 });

    const revisedPool = await owner.query(
      api.adminAssessmentPools.getOverview,
      { definitionId: published.definitionId },
    );
    expect(
      revisedPool?.sections.find((section) => section.skill === "reading"),
    ).toMatchObject({
      requiredCount: 50,
      allowedCount: initialReading.allowedCount,
      spareCount: initialReading.spareCount,
    });
    expect(
      revisedPool?.questions.find(
        (question) => question.bankQuestionId === allowedReading.bankQuestionId,
      ),
    ).toMatchObject({ ruleState: "inherit", effectiveAllowed: true });

    const inheritedSpeaking = revisedPool?.questions.find(
      (question) =>
        question.skill === "speaking" &&
        question.allowedByDefault &&
        question.effectiveAllowed,
    );
    if (inheritedSpeaking === undefined) {
      throw new Error("Expected an inherited speaking question.");
    }
    await t.run(async (ctx) => {
      const section = await ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_section_key", (q) =>
          q.eq("versionId", clone.versionId).eq("sectionKey", "speaking"),
        )
        .unique();
      if (section === null) throw new Error("Expected cloned speaking section.");
      await ctx.db.replace("assessmentSections", section._id, {
        versionId: section.versionId,
        sectionKey: section.sectionKey,
        skill: section.skill,
        order: section.order,
        title: section.title,
        instructions: section.instructions,
        timeLimitSeconds: section.timeLimitSeconds,
        audioReplayPolicy: section.audioReplayPolicy,
        itemCount: section.itemCount,
      });
    });
    const legacyPool = await owner.query(
      api.adminAssessmentPools.getOverview,
      { definitionId: published.definitionId },
    );
    expect(
      legacyPool?.sections.find((section) => section.skill === "speaking"),
    ).toMatchObject({ deliveryMode: "fixed", allowedCount: 0 });
    expect(
      legacyPool?.questions.find(
        (question) =>
          question.bankQuestionId === inheritedSpeaking.bankQuestionId,
      ),
    ).toMatchObject({ allowedByDefault: true, effectiveAllowed: false });

    await expect(
      owner.mutation(api.adminAssessmentPools.setQuestionAllowed, {
        definitionId: published.definitionId,
        bankQuestionId: inheritedSpeaking.bankQuestionId,
        allowed: true,
        expectedContentRevision: 3,
      }),
    ).resolves.toMatchObject({ ok: true, changed: true, contentRevision: 4 });
    const repairedPool = await owner.query(
      api.adminAssessmentPools.getOverview,
      { definitionId: published.definitionId },
    );
    expect(
      repairedPool?.sections.find((section) => section.skill === "speaking"),
    ).toMatchObject({
      deliveryMode: "random-bank",
      requiredCount: 11,
      allowedCount: initialSpeaking.allowedCount,
    });
    expect(
      repairedPool?.questions.find(
        (question) =>
          question.bankQuestionId === inheritedSpeaking.bankQuestionId,
      ),
    ).toMatchObject({ ruleState: "inherit", effectiveAllowed: true });

    await t.run(async (ctx) => {
      const section = await ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_section_key", (q) =>
          q.eq("versionId", clone.versionId).eq("sectionKey", "listening"),
        )
        .unique();
      if (section === null) throw new Error("Expected cloned listening section.");
      await ctx.db.replace("assessmentSections", section._id, {
        versionId: section.versionId,
        sectionKey: section.sectionKey,
        skill: section.skill,
        order: section.order,
        title: section.title,
        instructions: section.instructions,
        timeLimitSeconds: section.timeLimitSeconds,
        audioReplayPolicy: section.audioReplayPolicy,
        itemCount: section.itemCount,
      });
    });
    await expect(
      t.mutation(internal.assessmentSeed.repairLegacyDraftQuestionPools, {
        confirm,
      }),
    ).resolves.toEqual({ repairedDefinitions: 1, repairedSections: 1 });
    await expect(
      t.mutation(internal.assessmentSeed.repairLegacyDraftQuestionPools, {
        confirm,
      }),
    ).resolves.toEqual({ repairedDefinitions: 0, repairedSections: 0 });
    const maintainedSection = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentSections")
        .withIndex("by_version_id_and_section_key", (q) =>
          q.eq("versionId", clone.versionId).eq("sectionKey", "listening"),
        )
        .unique(),
    );
    expect(maintainedSection).toMatchObject({
      deliveryMode: "random-bank",
      bankProfile: "ec-ibt-style-2026-v1",
      bankSelectionContract: 1,
    });

    const authUserId = await t.run(async (ctx) =>
      await ctx.db.insert("users", { isAnonymous: true }),
    );
    const learner = t.withIdentity({
      subject: `${authUserId}|session`,
      tokenIdentifier: "https://example.test|flag-signal-learner",
    });
    const attempt = await learner.mutation(api.assessmentAttempts.start, {
      ...published,
      timingMode: "standard",
      timeMultiplier: 1,
      listeningMode: "audio-primary",
      startRequestId: "flag-signal-attempt-0001",
    });
    await learner.mutation(api.assessmentAttempts.beginSection, {
      attemptId: attempt.attemptId,
    });
    const player = await learner.query(api.assessmentAttempts.getPlayer, {
      attemptId: attempt.attemptId,
    });
    if (player === null) throw new Error("Expected a delivered reading question.");
    const emptyResponse = (() => {
      switch (player.item.type) {
        case "single-choice":
          return { kind: "choice" as const };
        case "multiple-select":
          return { kind: "multi-choice" as const, selectedChoiceKeys: [] };
        case "cloze-select":
          return { kind: "cloze" as const, gapAnswers: [] };
        case "sentence-build":
          return { kind: "token-order" as const, tokenOrder: [] };
        case "constructed-response":
          return { kind: "text" as const, text: "" };
      }
    })();
    await learner.mutation(api.assessmentAttempts.saveResponse, {
      attemptId: attempt.attemptId,
      itemId: player.item.id,
      response: emptyResponse,
      expectedClientRevision: 0,
      mutationId: "flag-signal-save-0001",
      flagged: true,
    });
    const delivered = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentAttemptItems")
        .withIndex("by_attempt_id_and_item_id", (q) =>
          q.eq("attemptId", attempt.attemptId).eq("itemId", player.item.id),
        )
        .unique(),
    );
    if (delivered === null) throw new Error("Pinned bank question not found.");

    const flaggedPool = await owner.query(
      api.adminAssessmentPools.getOverview,
      { definitionId: published.definitionId },
    );
    const signal = flaggedPool?.questions.find(
      (question) => question.bankQuestionId === delivered.bankQuestionId,
    )?.flagSignal;
    expect(signal).toMatchObject({
      activeCount: 1,
      totalEvents: 1,
      reviewStatus: "open",
    });
    if (signal === null || signal === undefined) {
      throw new Error("Flag review signal was not projected.");
    }
    await expect(
      editor.mutation(api.adminAssessmentPools.reviewFlagSignal, {
        definitionId: published.definitionId,
        bankQuestionId: delivered.bankQuestionId,
        expectedLastFlaggedAt: signal.lastFlaggedAt,
        decision: "reviewed",
      }),
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.adminAssessmentPools.reviewFlagSignal, {
        definitionId: published.definitionId,
        bankQuestionId: delivered.bankQuestionId,
        expectedLastFlaggedAt: signal.lastFlaggedAt,
        decision: "reviewed",
      }),
    ).resolves.toMatchObject({ ok: true });

    const reviewedPool = await owner.query(
      api.adminAssessmentPools.getOverview,
      { definitionId: published.definitionId },
    );
    expect(
      reviewedPool?.questions.find(
        (question) => question.bankQuestionId === delivered.bankQuestionId,
      )?.flagSignal,
    ).toMatchObject({ reviewStatus: "reviewed" });
  }, 15_000);

  it("preserves a legitimate copy-on-write seed edit across an idempotent rerun", async () => {
    const t = harness();
    await seedOwner(t);
    const owner = t.withIdentity({
      tokenIdentifier: "https://example.test|seed-owner",
    });
    const prepared = await t.mutation(
      internal.assessmentSeed.prepareIbtPractice,
      { confirm },
    );
    await attachAllAudio(t, prepared);
    await t.mutation(internal.assessmentSeed.seedQuestionBank, { confirm });

    const fixture = await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("assessmentQuestionBank")
        .withIndex("by_profile_and_status_and_skill", (q) =>
          q
            .eq("profile", "ec-ibt-style-2026-v1")
            .eq("status", "ready")
            .eq("skill", "reading"),
        )
        .take(201);
      for (const row of rows) {
        if (!row.bankKey.includes("/four-skill-practice-form-1/")) continue;
        const [item, key] = await Promise.all([
          ctx.db.get("assessmentItems", row.sourceItemId),
          ctx.db
            .query("assessmentAnswerKeys")
            .withIndex("by_item_id", (q) => q.eq("itemId", row.sourceItemId))
            .unique(),
        ]);
        if (
          item?.type === "single-choice" &&
          key?.kind === "choice" &&
          key.correctChoiceKeys.length === 1
        ) {
          return {
            row,
            originalPrompt: item.prompt,
            content: {
              type: "single-choice" as const,
              prompt: `${item.prompt} Use the revised club notice.`,
              options: item.options,
              correctChoiceKey: key.correctChoiceKeys[0],
              explanation: item.explanation ?? null,
            },
          };
        }
      }
      throw new Error("Expected a seeded single-choice Reading row.");
    });
    const edited = await owner.mutation(
      api.adminAssessmentQuestionBank.updateContent,
      {
        bankQuestionId: fixture.row._id,
        expectedUpdatedAt: fixture.row.updatedAt,
        content: fixture.content,
        illustrationMediaId: fixture.row.illustrationMediaId ?? null,
        audioMediaId: null,
      },
    );
    if (!edited.ok) throw new Error("Seeded row edit conflicted.");
    expect(edited.sourceItemId).not.toBe(fixture.row.sourceItemId);

    await expect(
      t.mutation(internal.assessmentSeed.seedQuestionBank, { confirm }),
    ).resolves.toMatchObject({
      inserted: 0,
      existing: 145,
      eligible: 121,
      randomSections: 8,
    });
    const preserved = await t.run(async (ctx) => {
      const row = await ctx.db.get("assessmentQuestionBank", fixture.row._id);
      const item =
        row === null ? null : await ctx.db.get("assessmentItems", row.sourceItemId);
      const originalItem = await ctx.db.get(
        "assessmentItems",
        fixture.row.sourceItemId,
      );
      return { row, item, originalItem };
    });
    expect(preserved.row).toMatchObject({
      bankKey: fixture.row.bankKey,
      sourceItemId: edited.sourceItemId,
      origin: "bank-authored",
      seedBatch: fixture.row.seedBatch,
    });
    expect(preserved.item?.prompt).toBe(fixture.content.prompt);
    expect(preserved.originalItem?.prompt).toBe(fixture.originalPrompt);

    await t.run(async (ctx) => {
      await ctx.db.patch("assessmentQuestionBank", fixture.row._id, {
        seedBatch: undefined,
      });
    });
    await expect(
      t.mutation(internal.assessmentSeed.seedQuestionBank, { confirm }),
    ).rejects.toThrow(/QUESTION_BANK_SEED_COLLISION/);
    await expect(
      t.run(async (ctx) => {
        const row = await ctx.db.get(
          "assessmentQuestionBank",
          fixture.row._id,
        );
        return row === null
          ? null
          : await ctx.db.get("assessmentItems", row.sourceItemId);
      }),
    ).resolves.toMatchObject({ prompt: fixture.content.prompt });
  }, 15_000);
});
