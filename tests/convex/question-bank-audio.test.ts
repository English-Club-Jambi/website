import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";

const rawModules = import.meta.glob("../../convex/**/*.ts");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, loader]) => [
    path.replace("../../convex", "."),
    loader,
  ]),
);

function harness() {
  return convexTest(schema, modules);
}

async function seedOwner(t: ReturnType<typeof harness>) {
  const ownerId = await t.mutation(internal.adminUsers.bootstrapOwner, {
    tokenIdentifier: "https://example.test|question-bank-owner",
    displayName: "Question Bank Publisher",
    email: "question-bank@example.test",
  });
  return {
    ownerId,
    owner: t.withIdentity({
      tokenIdentifier: "https://example.test|question-bank-owner",
    }),
  };
}

async function insertAudio(
  t: ReturnType<typeof harness>,
  ownerId: Id<"adminUsers">,
  key: string,
  overrides: Partial<{
    purpose: "assessment-audio" | "assessment-image";
    contentType: "audio/mpeg" | "image/webp";
    status: "pending" | "ready";
    access: "public" | "assessment-private";
    durationMs: number | undefined;
  }> = {},
) {
  const now = Date.now();
  const durationMs =
    Object.prototype.hasOwnProperty.call(overrides, "durationMs")
      ? overrides.durationMs
      : 12_400;
  return await t.run(async (ctx) =>
    await ctx.db.insert("mediaAssets", {
      objectKey: `uploads/assessment-audio/${key}.mp3`,
      purpose: overrides.purpose ?? "assessment-audio",
      contentType: overrides.contentType ?? "audio/mpeg",
      byteSize: 48_000,
      status: overrides.status ?? "ready",
      originalName: `${key}.mp3`,
      alt: `Listening recording for ${key.replaceAll("-", " ")}`,
      access: overrides.access ?? "public",
      ...(durationMs === undefined ? {} : { durationMs }),
      uploadedBy: ownerId,
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

async function insertIllustration(
  t: ReturnType<typeof harness>,
  ownerId: Id<"adminUsers">,
  key: string,
) {
  const now = Date.now();
  return await t.run(async (ctx) =>
    await ctx.db.insert("mediaAssets", {
      objectKey: `uploads/assessment-image/${key}.webp`,
      purpose: "assessment-image",
      contentType: "image/webp",
      byteSize: 52_000,
      status: "ready",
      originalName: `${key}.webp`,
      alt: `Illustration for ${key.replaceAll("-", " ")}`,
      width: 1_200,
      height: 800,
      access: "public",
      uploadedBy: ownerId,
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

async function createRandomPractice(
  t: ReturnType<typeof harness>,
  ownerId: Id<"adminUsers">,
  skill: "reading" | "listening",
  slug: string,
) {
  const now = Date.now();
  return await t.run(async (ctx) => {
    const definitionId = await ctx.db.insert("assessmentDefinitions", {
      slug,
      kind: "full-practice",
      profile: "ec-ibt-style-2026-v1",
      adminTitle: `${skill} bank practice`,
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
      title: `${skill} bank practice`,
      summary: "A focused bank delivery test.",
      instructions: "Answer the question.",
      locale: "en",
      timePolicy: "untimed",
      allowResume: true,
      reviewPolicy: "after-submit",
      scorePolicy: "practice-estimate-v1",
      defaultTimingMode: "untimed",
      defaultListeningMode: "audio-primary",
      maxAttemptsPerDay: 20,
      contentRevision: 1,
      validatedRevision: 1,
      contentChecksum: `${slug}-checksum`,
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
      sectionKey: skill,
      skill,
      order: 0,
      title: skill === "listening" ? "Listening" : "Reading",
      instructions: "Use the supplied material and choose one answer.",
      itemCount: 1,
      deliveryMode: "random-bank",
      bankProfile: "ec-ibt-style-2026-v1",
      bankSelectionContract: 1,
    });
    return { definitionId, versionId };
  });
}

async function createLearner(
  t: ReturnType<typeof harness>,
  tokenIdentifier: string,
) {
  const authUserId = await t.run(async (ctx) =>
    await ctx.db.insert("users", { isAnonymous: true }),
  );
  return t.withIdentity({
    subject: `${authUserId}|session`,
    tokenIdentifier,
  });
}

const listeningOptions = [
  { key: "a", label: "The workshop begins after lunch." },
  { key: "b", label: "The workshop has been cancelled." },
  { key: "c", label: "Participants should bring a laptop." },
  { key: "d", label: "Participants should wait outside." },
];

describe("Question Bank audio and copy-on-write content", () => {
  it("validates Listening audio, pins it per attempt, and keeps retries idempotent", async () => {
    const t = harness();
    const { ownerId, owner } = await seedOwner(t);
    const audioA = await insertAudio(t, ownerId, "workshop-announcement-a");
    const audioB = await insertAudio(t, ownerId, "workshop-announcement-b");
    const wrongPurpose = await insertAudio(t, ownerId, "wrong-purpose", {
      purpose: "assessment-image",
    });
    const wrongMime = await insertAudio(t, ownerId, "wrong-mime", {
      contentType: "image/webp",
    });
    const pending = await insertAudio(t, ownerId, "pending", {
      status: "pending",
    });
    const privateAudio = await insertAudio(t, ownerId, "private", {
      access: "assessment-private",
    });
    const missingDuration = await insertAudio(t, ownerId, "missing-duration", {
      durationMs: undefined,
    });

    const input = {
      requestId: "listening-bank-audio-0001",
      skill: "listening" as const,
      taskFamily: "listen-announcement" as const,
      difficulty: "developing" as const,
      prompt: "What should participants do before the workshop begins?",
      options: listeningOptions,
      correctChoiceKey: "c",
      explanation: "The announcement explicitly asks participants to bring a laptop.",
      tags: ["announcement", "detail"],
      illustrationMediaId: null,
      audioMediaId: audioA,
    };
    const created = await owner.mutation(
      api.adminAssessmentQuestionBank.createQuestion,
      input,
    );
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.createQuestion, input),
    ).resolves.toEqual({ ...created, created: false });

    for (const [index, audioMediaId] of [
      wrongPurpose,
      wrongMime,
      pending,
      privateAudio,
      missingDuration,
    ].entries()) {
      await expect(
        owner.mutation(api.adminAssessmentQuestionBank.createQuestion, {
          ...input,
          requestId: `listening-bank-audio-invalid-000${index}`,
          prompt: `Which detail is stated in recording ${index + 1}?`,
          audioMediaId,
        }),
      ).rejects.toThrow();
    }
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.createQuestion, {
        ...input,
        requestId: "reading-question-with-audio-0001",
        skill: "reading",
        taskFamily: "read-daily-life",
        prompt: "Which sentence states the workshop time?",
      }),
    ).rejects.toThrow();

    const noAudio = await owner.mutation(
      api.adminAssessmentQuestionBank.createQuestion,
      {
        ...input,
        requestId: "listening-bank-no-audio-0001",
        prompt: "Where will the follow-up meeting take place?",
        audioMediaId: null,
      },
    );
    const pausedPage = await owner.query(
      api.adminAssessmentQuestionBank.listPage,
      {
        status: "paused",
        skill: "listening",
        paginationOpts: { cursor: null, numItems: 20, maximumRowsRead: 20 },
      },
    );
    const noAudioRow = pausedPage.page.find(
      (row) => row.bankQuestionId === noAudio.bankQuestionId,
    );
    if (noAudioRow === undefined) throw new Error("No-audio draft was not listed.");
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.updateMetadata, {
        bankQuestionId: noAudioRow.bankQuestionId,
        expectedUpdatedAt: noAudioRow.updatedAt,
        status: "ready",
        taskFamily: noAudioRow.taskFamily,
        difficulty: noAudioRow.difficulty,
        fullPracticeEligible: true,
        tags: noAudioRow.tags,
        illustrationMediaId: null,
        audioMediaId: null,
      }),
    ).rejects.toThrow();

    const authored = pausedPage.page.find(
      (row) => row.bankQuestionId === created.bankQuestionId,
    );
    if (authored === undefined) throw new Error("Authored question was not listed.");
    expect(authored).toMatchObject({
      options: listeningOptions,
      correctChoiceKey: "c",
      explanation: input.explanation,
      audio: {
        mediaId: audioA,
        publicUrl:
          "https://r2.mukhtada.my.id/uploads/assessment-audio/workshop-announcement-a.mp3",
        contentType: "audio/mpeg",
        durationMs: 12_400,
      },
    });
    const ready = await owner.mutation(
      api.adminAssessmentQuestionBank.updateMetadata,
      {
        bankQuestionId: authored.bankQuestionId,
        expectedUpdatedAt: authored.updatedAt,
        status: "ready",
        taskFamily: authored.taskFamily,
        difficulty: authored.difficulty,
        fullPracticeEligible: true,
        tags: authored.tags,
        illustrationMediaId: null,
        audioMediaId: audioA,
      },
    );
    if (!ready.ok) throw new Error("Question metadata update conflicted.");
    await t.run(async (ctx) => {
      await ctx.db.patch("assessmentQuestionBank", noAudio.bankQuestionId, {
        status: "ready",
        fullPracticeEligible: false,
      });
    });
    await expect(
      owner.query(api.adminAssessmentQuestionBank.getSummary, {}),
    ).resolves.toMatchObject({
      total: 2,
      ready: 2,
      eligible: 1,
      bySkill: [
        { skill: "reading", count: 0 },
        { skill: "listening", count: 1 },
        { skill: "writing", count: 0 },
        { skill: "speaking", count: 0 },
      ],
    });
    await expect(
      t.query(internal.assessmentSeed.verifyQuestionBank, {
        confirm: "seed-ec-ibt-style-2026-v1",
      }),
    ).resolves.toMatchObject({ eligible: 1 });

    const practice = await createRandomPractice(
      t,
      ownerId,
      "listening",
      "bank-audio-live-practice",
    );
    const learner = await createLearner(
      t,
      "https://example.test|question-bank-audio-learner",
    );
    const firstAttempt = await learner.mutation(api.assessmentAttempts.start, {
      ...practice,
      timingMode: "untimed",
      timeMultiplier: 1,
      listeningMode: "audio-primary",
      startRequestId: "bank-audio-attempt-0001",
    });
    const pinned = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentAttemptItems")
        .withIndex("by_attempt_id_and_bank_question_id", (q) =>
          q
            .eq("attemptId", firstAttempt.attemptId)
            .eq("bankQuestionId", created.bankQuestionId),
        )
        .unique(),
    );
    expect(pinned?.audioMediaId).toBe(audioA);
    const oldItemId = pinned?.itemId;

    const revisedPrompt = "Why should participants arrive ten minutes early?";
    const revised = await owner.mutation(
      api.adminAssessmentQuestionBank.updateContent,
      {
        bankQuestionId: created.bankQuestionId,
        expectedUpdatedAt: ready.updatedAt,
        content: {
          type: "single-choice",
          prompt: revisedPrompt,
          options: [
            { key: "a", label: "To collect a name badge." },
            { key: "b", label: "To test the room microphone." },
            { key: "c", label: "To move the tables." },
            { key: "d", label: "To meet the guest speaker." },
          ],
          correctChoiceKey: "a",
          explanation:
            "The revised recording asks participants to collect badges early.",
        },
        illustrationMediaId: null,
        audioMediaId: audioB,
      },
    );
    if (!revised.ok) throw new Error("Question content update conflicted.");
    expect(revised.sourceItemId).not.toBe(oldItemId);
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.updateContent, {
        bankQuestionId: created.bankQuestionId,
        expectedUpdatedAt: ready.updatedAt,
        content: {
          type: "single-choice",
          prompt: revisedPrompt,
          options: listeningOptions,
          correctChoiceKey: "a",
          explanation: null,
        },
        illustrationMediaId: null,
        audioMediaId: audioB,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "conflict",
      currentUpdatedAt: revised.updatedAt,
    });

    await learner.mutation(api.assessmentAttempts.beginSection, {
      attemptId: firstAttempt.attemptId,
    });
    const firstPlayer = await learner.query(api.assessmentAttempts.getPlayer, {
      attemptId: firstAttempt.attemptId,
    });
    expect(firstPlayer).toMatchObject({
      item: { id: oldItemId, prompt: input.prompt },
      audio: {
        mediaId: audioA,
        publicUrl:
          "https://r2.mukhtada.my.id/uploads/assessment-audio/workshop-announcement-a.mp3",
      },
      stimulus: {
        kind: "audio",
        mediaUrl:
          "https://r2.mukhtada.my.id/uploads/assessment-audio/workshop-announcement-a.mp3",
      },
    });

    const secondAttempt = await learner.mutation(api.assessmentAttempts.start, {
      ...practice,
      timingMode: "untimed",
      timeMultiplier: 1,
      listeningMode: "audio-primary",
      startRequestId: "bank-audio-attempt-0002",
    });
    await learner.mutation(api.assessmentAttempts.beginSection, {
      attemptId: secondAttempt.attemptId,
    });
    const secondPlayer = await learner.query(api.assessmentAttempts.getPlayer, {
      attemptId: secondAttempt.attemptId,
    });
    expect(secondPlayer).toMatchObject({
      item: { id: revised.sourceItemId, prompt: revisedPrompt },
      audio: { mediaId: audioB },
    });
  });

  it("copy-on-write edits a published source while pool inheritance respects overrides", async () => {
    const t = harness();
    const { ownerId, owner } = await seedOwner(t);
    const illustrationA = await insertIllustration(t, ownerId, "harbour-map-a");
    const illustrationB = await insertIllustration(t, ownerId, "harbour-map-b");
    const now = Date.now();
    const source = await t.run(async (ctx) => {
      const definitionId = await ctx.db.insert("assessmentDefinitions", {
        slug: "published-reading-source",
        kind: "skill-quiz",
        profile: "ec-ibt-style-2026-v1",
        adminTitle: "Published Reading Source",
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
        title: "Harbour notices",
        summary: "Read a public notice.",
        instructions: "Choose one answer.",
        locale: "en",
        timePolicy: "untimed",
        allowResume: true,
        reviewPolicy: "after-submit",
        scorePolicy: "practice-estimate-v1",
        defaultTimingMode: "untimed",
        defaultListeningMode: "transcript-supported",
        maxAttemptsPerDay: 20,
        contentRevision: 1,
        validatedRevision: 1,
        contentChecksum: "published-reading-source-v1",
        createdBy: ownerId,
        publishedBy: ownerId,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      });
      await ctx.db.patch("assessmentDefinitions", definitionId, {
        publishedVersionId: versionId,
      });
      const sectionId = await ctx.db.insert("assessmentSections", {
        versionId,
        sectionKey: "reading",
        skill: "reading",
        order: 0,
        title: "Reading",
        instructions: "Read the notice.",
        itemCount: 1,
        deliveryMode: "fixed",
      });
      const itemId = await ctx.db.insert("assessmentItems", {
        versionId,
        sectionId,
        itemKey: "reading-daily-harbour-notice",
        order: 0,
        prompt: "When does the harbour office close on Friday?",
        required: true,
        explanation: "The Friday row lists 16:00.",
        provenanceJson: "{}",
        authoredBy: ownerId,
        createdAt: now,
        updatedAt: now,
        type: "single-choice",
        options: [
          { key: "a", label: "At 15:00" },
          { key: "b", label: "At 16:00" },
          { key: "c", label: "At 17:00" },
          { key: "d", label: "At 18:00" },
        ],
      });
      await ctx.db.insert("assessmentAnswerKeys", {
        versionId,
        itemId,
        kind: "choice",
        correctChoiceKeys: ["b"],
        scoringMode: "exact",
        points: 1,
      });
      const bankQuestionId = await ctx.db.insert("assessmentQuestionBank", {
        bankKey: "published/harbour-notice",
        sourceDefinitionId: definitionId,
        sourceVersionId: versionId,
        sourceSectionId: sectionId,
        sourceItemId: itemId,
        skill: "reading",
        taskFamily: "read-daily-life",
        difficulty: "foundational",
        status: "ready",
        profile: "ec-ibt-style-2026-v1",
        fullPracticeEligible: false,
        origin: "assessment-source",
        illustrationMediaId: illustrationA,
        contentFingerprint: "published-harbour-fingerprint",
        promptSearch: "when does the harbour office close on friday?",
        tags: ["reading", "notice"],
        createdBy: ownerId,
        updatedBy: ownerId,
        createdAt: now,
        updatedAt: now,
      });
      return { definitionId, versionId, sectionId, itemId, bankQuestionId };
    });
    await expect(
      owner.query(api.adminAssessmentQuestionBank.getSummary, {}),
    ).resolves.toMatchObject({
      ready: 1,
      eligible: 1,
      bySkill: [
        { skill: "reading", count: 1 },
        { skill: "listening", count: 0 },
        { skill: "writing", count: 0 },
        { skill: "speaking", count: 0 },
      ],
    });
    const practice = await createRandomPractice(
      t,
      ownerId,
      "reading",
      "published-source-bank-practice",
    );
    const learner = await createLearner(
      t,
      "https://example.test|published-source-learner",
    );
    const firstAttempt = await learner.mutation(api.assessmentAttempts.start, {
      ...practice,
      timingMode: "untimed",
      timeMultiplier: 1,
      listeningMode: "transcript-supported",
      startRequestId: "published-source-attempt-0001",
    });
    const pinned = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentAttemptItems")
        .withIndex("by_attempt_id_and_bank_question_id", (q) =>
          q
            .eq("attemptId", firstAttempt.attemptId)
            .eq("bankQuestionId", source.bankQuestionId),
        )
        .unique(),
    );
    expect(pinned).toMatchObject({
      itemId: source.itemId,
      illustrationMediaId: illustrationA,
    });
    await expect(
      owner.query(api.adminAssessmentQuestionBank.getSummary, {}),
    ).resolves.toMatchObject({
      eligible: 1,
      bySkill: [
        { skill: "reading", count: 1 },
        { skill: "listening", count: 0 },
        { skill: "writing", count: 0 },
        { skill: "speaking", count: 0 },
      ],
    });

    const before = await owner.query(api.adminAssessmentQuestionBank.listPage, {
      status: "ready",
      skill: "reading",
      paginationOpts: { cursor: null, numItems: 20, maximumRowsRead: 20 },
    });
    const row = before.page.find(
      (candidate) => candidate.bankQuestionId === source.bankQuestionId,
    );
    if (row === undefined) throw new Error("Published bank row was not listed.");
    const revisedPrompt = "Which counter handles permit renewals on Friday?";
    const revised = await owner.mutation(
      api.adminAssessmentQuestionBank.updateContent,
      {
        bankQuestionId: row.bankQuestionId,
        expectedUpdatedAt: row.updatedAt,
        content: {
          type: "single-choice",
          prompt: revisedPrompt,
          options: [
            { key: "a", label: "Counter one" },
            { key: "b", label: "Counter two" },
            { key: "c", label: "Counter three" },
            { key: "d", label: "Counter four" },
          ],
          correctChoiceKey: "c",
          explanation: "The Friday notice directs renewals to counter three.",
        },
        illustrationMediaId: illustrationB,
        audioMediaId: null,
      },
    );
    if (!revised.ok) throw new Error("Published source edit conflicted.");
    expect(revised.sourceItemId).not.toBe(source.itemId);
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.updateContent, {
        bankQuestionId: row.bankQuestionId,
        expectedUpdatedAt: row.updatedAt,
        content: row.content,
        illustrationMediaId: illustrationB,
        audioMediaId: null,
      }),
    ).resolves.toMatchObject({ ok: false, code: "conflict" });

    const originalItem = await t.run(async (ctx) =>
      await ctx.db.get("assessmentItems", source.itemId),
    );
    expect(originalItem?.prompt).toBe("When does the harbour office close on Friday?");
    await learner.mutation(api.assessmentAttempts.beginSection, {
      attemptId: firstAttempt.attemptId,
    });
    await expect(
      learner.query(api.assessmentAttempts.getPlayer, {
        attemptId: firstAttempt.attemptId,
      }),
    ).resolves.toMatchObject({
      item: {
        id: source.itemId,
        prompt: "When does the harbour office close on Friday?",
      },
      illustration: { mediaId: illustrationA },
    });

    const after = await owner.query(api.adminAssessmentQuestionBank.listPage, {
      status: "ready",
      skill: "reading",
      paginationOpts: { cursor: null, numItems: 20, maximumRowsRead: 20 },
    });
    expect(
      after.page.find(
        (candidate) => candidate.bankQuestionId === source.bankQuestionId,
      ),
    ).toMatchObject({
      origin: "bank-authored",
      prompt: revisedPrompt,
      options: [
        { key: "a", label: "Counter one" },
        { key: "b", label: "Counter two" },
        { key: "c", label: "Counter three" },
        { key: "d", label: "Counter four" },
      ],
      correctChoiceKey: "c",
      illustration: { mediaId: illustrationB },
    });

    await t.run(async (ctx) => {
      const current = await ctx.db.get(
        "assessmentQuestionBank",
        source.bankQuestionId,
      );
      if (current === null) throw new Error("Expected revised bank row.");
      await ctx.db.insert("assessmentQuestionBank", {
        bankKey: "published/harbour-notice/duplicate-source",
        sourceDefinitionId: current.sourceDefinitionId,
        sourceVersionId: current.sourceVersionId,
        sourceSectionId: current.sourceSectionId,
        sourceItemId: current.sourceItemId,
        skill: current.skill,
        taskFamily: current.taskFamily,
        difficulty: current.difficulty,
        status: "ready",
        profile: current.profile,
        fullPracticeEligible: false,
        origin: current.origin,
        illustrationMediaId: current.illustrationMediaId,
        audioMediaId: current.audioMediaId,
        contentFingerprint: current.contentFingerprint,
        promptSearch: current.promptSearch,
        tags: current.tags,
        seedBatch: current.seedBatch,
        createdBy: current.createdBy,
        updatedBy: current.updatedBy,
        createdAt: current.createdAt + 1,
        updatedAt: current.updatedAt,
      });
    });
    await expect(
      owner.query(api.adminAssessmentQuestionBank.getSummary, {}),
    ).resolves.toMatchObject({ ready: 2, eligible: 1 });

    const disabledRuleId = await t.run(async (ctx) =>
      await ctx.db.insert("assessmentVersionQuestionRules", {
        versionId: practice.versionId,
        bankQuestionId: source.bankQuestionId,
        allowed: false,
        updatedBy: ownerId,
        createdAt: now,
        updatedAt: now,
      }),
    );
    await expect(
      learner.mutation(api.assessmentAttempts.start, {
        ...practice,
        timingMode: "untimed",
        timeMultiplier: 1,
        listeningMode: "transcript-supported",
        startRequestId: "published-source-disabled-0001",
      }),
    ).rejects.toThrow();
    await t.run(async (ctx) => await ctx.db.delete(disabledRuleId));
    await expect(
      learner.mutation(api.assessmentAttempts.start, {
        ...practice,
        timingMode: "untimed",
        timeMultiplier: 1,
        listeningMode: "transcript-supported",
        startRequestId: "published-source-restored-0001",
      }),
    ).resolves.toMatchObject({ status: "in-progress" });

    const draft = await t.run(async (ctx) => {
      const versionId = await ctx.db.insert("assessmentVersions", {
        definitionId: practice.definitionId,
        version: 2,
        status: "draft",
        title: "Reading bank practice draft",
        summary: "A draft pool configuration.",
        instructions: "Answer the question.",
        locale: "en",
        timePolicy: "untimed",
        allowResume: true,
        reviewPolicy: "after-submit",
        scorePolicy: "practice-estimate-v1",
        defaultTimingMode: "untimed",
        defaultListeningMode: "transcript-supported",
        maxAttemptsPerDay: 20,
        contentRevision: 1,
        cloneSourceVersionId: practice.versionId,
        createdBy: ownerId,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch("assessmentDefinitions", practice.definitionId, {
        draftVersionId: versionId,
      });
      await ctx.db.insert("assessmentSections", {
        versionId,
        sectionKey: "reading",
        skill: "reading",
        order: 0,
        title: "Reading",
        instructions: "Read and answer.",
        itemCount: 1,
        deliveryMode: "random-bank",
        bankProfile: "ec-ibt-style-2026-v1",
        bankSelectionContract: 1,
      });
      return versionId;
    });
    const inherited = await owner.query(api.adminAssessmentPools.getOverview, {
      definitionId: practice.definitionId,
    });
    expect(
      inherited?.questions.filter(
        (candidate) => candidate.prompt === revisedPrompt,
      ),
    ).toHaveLength(1);
    expect(
      inherited?.questions.find(
        (candidate) => candidate.bankQuestionId === source.bankQuestionId,
      ),
    ).toMatchObject({
      allowedByDefault: true,
      ruleState: "inherit",
      effectiveAllowed: true,
    });
    const disabled = await owner.mutation(
      api.adminAssessmentPools.setQuestionAllowed,
      {
        definitionId: practice.definitionId,
        bankQuestionId: source.bankQuestionId,
        allowed: false,
        expectedContentRevision: 1,
      },
    );
    if (!disabled.ok) throw new Error("Pool disable conflicted.");
    const disabledOverview = await owner.query(
      api.adminAssessmentPools.getOverview,
      { definitionId: practice.definitionId },
    );
    expect(
      disabledOverview?.questions.find(
        (candidate) => candidate.bankQuestionId === source.bankQuestionId,
      ),
    ).toMatchObject({ ruleState: "disabled", effectiveAllowed: false });
    await expect(
      t.run(async (ctx) =>
        await ctx.db
          .query("assessmentVersionQuestionRules")
          .withIndex("by_version_id_and_allowed_and_updated_at", (q) =>
            q.eq("versionId", draft),
          )
          .collect(),
      ),
    ).resolves.toMatchObject([
      { bankQuestionId: source.bankQuestionId, allowed: false },
    ]);
    const restored = await owner.mutation(
      api.adminAssessmentPools.setQuestionAllowed,
      {
        definitionId: practice.definitionId,
        bankQuestionId: source.bankQuestionId,
        allowed: true,
        expectedContentRevision: disabled.contentRevision,
      },
    );
    expect(restored).toMatchObject({ ok: true, changed: true });
    await expect(
      t.run(async (ctx) =>
        await ctx.db
          .query("assessmentVersionQuestionRules")
          .withIndex("by_version_id_and_allowed_and_updated_at", (q) =>
            q.eq("versionId", draft),
          )
          .collect(),
      ),
    ).resolves.toEqual([]);
  });

  it("rejects unauthenticated and publisher writes without leaving partial authoring records", async () => {
    const t = harness();
    const { owner } = await seedOwner(t);
    await owner.mutation(api.adminUsers.setAccess, {
      tokenIdentifier: "https://example.test|bank-publisher",
      displayName: "Question Bank Publisher",
      email: "bank-publisher@example.test",
      role: "publisher",
      status: "active",
    });
    await owner.mutation(api.adminUsers.setAccess, {
      tokenIdentifier: "https://example.test|bank-editor",
      displayName: "Question Bank Editor",
      email: "bank-editor@example.test",
      role: "editor",
      status: "active",
    });
    const publisher = t.withIdentity({
      tokenIdentifier: "https://example.test|bank-publisher",
    });
    const editor = t.withIdentity({
      tokenIdentifier: "https://example.test|bank-editor",
    });
    const createInput = {
      requestId: "authz-reading-question-0001",
      skill: "reading" as const,
      taskFamily: "read-daily-life" as const,
      difficulty: "foundational" as const,
      prompt: "Which desk receives completed workshop registration forms?",
      options: [
        { key: "a", label: "The reception desk" },
        { key: "b", label: "The library desk" },
        { key: "c", label: "The finance desk" },
        { key: "d", label: "The equipment desk" },
      ],
      correctChoiceKey: "a",
      explanation: "The notice directs completed forms to reception.",
      tags: ["notice", "detail"],
      illustrationMediaId: null,
      audioMediaId: null,
    };
    const created = await owner.mutation(
      api.adminAssessmentQuestionBank.createQuestion,
      createInput,
    );
    const page = await owner.query(api.adminAssessmentQuestionBank.listPage, {
      status: "paused",
      skill: "reading",
      paginationOpts: { cursor: null, numItems: 20, maximumRowsRead: 20 },
    });
    const row = page.page.find(
      (candidate) => candidate.bankQuestionId === created.bankQuestionId,
    );
    if (row === undefined) throw new Error("Expected authored bank row.");

    const authoringCounts = async () =>
      await t.run(async (ctx) => {
        const [definitions, versions, sections, items, keys, bank, audits] =
          await Promise.all([
            ctx.db.query("assessmentDefinitions").collect(),
            ctx.db.query("assessmentVersions").collect(),
            ctx.db.query("assessmentSections").collect(),
            ctx.db.query("assessmentItems").collect(),
            ctx.db.query("assessmentAnswerKeys").collect(),
            ctx.db.query("assessmentQuestionBank").collect(),
            ctx.db.query("cmsAuditEvents").collect(),
          ]);
        return {
          definitions: definitions.length,
          versions: versions.length,
          sections: sections.length,
          items: items.length,
          keys: keys.length,
          bank: bank.length,
          audits: audits.length,
        };
      });
    const beforeRefusals = await authoringCounts();
    const revisedContent = {
      ...row.content,
      prompt: "Where should participants submit a completed workshop form?",
    };
    const updateContentArgs = {
      bankQuestionId: row.bankQuestionId,
      expectedUpdatedAt: row.updatedAt,
      content: revisedContent,
      illustrationMediaId: null,
      audioMediaId: null,
    };
    const updateMetadataArgs = {
      bankQuestionId: row.bankQuestionId,
      expectedUpdatedAt: row.updatedAt,
      status: "ready" as const,
      taskFamily: row.taskFamily,
      difficulty: row.difficulty,
      fullPracticeEligible: false,
      tags: row.tags,
      illustrationMediaId: null,
      audioMediaId: null,
    };
    await expect(
      t.mutation(api.adminAssessmentQuestionBank.createQuestion, {
        ...createInput,
        requestId: "authz-reading-question-unauthenticated",
        prompt: "Where should visitors leave a completed arrival form?",
      }),
    ).rejects.toThrow();
    await expect(
      publisher.mutation(api.adminAssessmentQuestionBank.createQuestion, {
        ...createInput,
        requestId: "authz-reading-question-publisher",
        prompt: "Where should members leave a completed event form?",
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(
        api.adminAssessmentQuestionBank.updateContent,
        updateContentArgs,
      ),
    ).rejects.toThrow();
    await expect(
      publisher.mutation(
        api.adminAssessmentQuestionBank.updateContent,
        updateContentArgs,
      ),
    ).rejects.toThrow();
    await expect(
      t.mutation(
        api.adminAssessmentQuestionBank.updateMetadata,
        updateMetadataArgs,
      ),
    ).rejects.toThrow();
    await expect(
      publisher.mutation(
        api.adminAssessmentQuestionBank.updateMetadata,
        updateMetadataArgs,
      ),
    ).rejects.toThrow();
    await expect(authoringCounts()).resolves.toEqual(beforeRefusals);

    const edited = await editor.mutation(
      api.adminAssessmentQuestionBank.updateContent,
      updateContentArgs,
    );
    if (!edited.ok) throw new Error("Editor content update conflicted.");
    await expect(
      editor.mutation(api.adminAssessmentQuestionBank.updateMetadata, {
        ...updateMetadataArgs,
        expectedUpdatedAt: edited.updatedAt,
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(authoringCounts()).resolves.toMatchObject({
      ...beforeRefusals,
      items: beforeRefusals.items + 1,
      keys: beforeRefusals.keys + 1,
      audits: beforeRefusals.audits + 2,
    });
  });

  it("preserves every specialized item type through protected copy-on-write edits", async () => {
    const t = harness();
    const { ownerId, owner } = await seedOwner(t);
    const now = Date.now();
    const rows = await t.run(async (ctx) => {
      const definitionId = await ctx.db.insert("assessmentDefinitions", {
        slug: "specialized-question-source",
        kind: "skill-quiz",
        profile: "ec-ibt-style-2026-v1",
        adminTitle: "Specialized Question Source",
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
        title: "Specialized source",
        summary: "Specialized item editing fixtures.",
        instructions: "Complete each task.",
        locale: "en",
        timePolicy: "untimed",
        allowResume: true,
        reviewPolicy: "after-submit",
        scorePolicy: "practice-estimate-v1",
        defaultTimingMode: "untimed",
        defaultListeningMode: "transcript-supported",
        maxAttemptsPerDay: 20,
        contentRevision: 1,
        validatedRevision: 1,
        contentChecksum: "specialized-question-source-v1",
        createdBy: ownerId,
        publishedBy: ownerId,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      });
      await ctx.db.patch("assessmentDefinitions", definitionId, {
        publishedVersionId: versionId,
      });
      const readingSectionId = await ctx.db.insert("assessmentSections", {
        versionId,
        sectionKey: "reading-specialized",
        skill: "reading",
        order: 0,
        title: "Reading",
        instructions: "Read and answer.",
        itemCount: 2,
      });
      const writingSectionId = await ctx.db.insert("assessmentSections", {
        versionId,
        sectionKey: "writing-specialized",
        skill: "writing",
        order: 1,
        title: "Writing",
        instructions: "Build and write.",
        itemCount: 2,
      });
      const definitions = [
        {
          skill: "reading" as const,
          taskFamily: "read-academic-passage" as const,
          sectionId: readingSectionId,
          item: {
            type: "multiple-select" as const,
            options: [
              { key: "a", label: "Seasonal rainfall" },
              { key: "b", label: "Soil composition" },
              { key: "c", label: "Bird migration" },
              { key: "d", label: "Road traffic" },
            ],
            selectionMin: 2,
            selectionMax: 2,
          },
          key: {
            kind: "multi-choice" as const,
            correctChoiceKeys: ["a", "c"],
          },
        },
        {
          skill: "reading" as const,
          taskFamily: "complete-words" as const,
          sectionId: readingSectionId,
          item: {
            type: "cloze-select" as const,
            stemParts: ["Migratory birds ", " to the wetland each spring."],
            gaps: [
              {
                key: "verb",
                options: [
                  { key: "return", label: "return" },
                  { key: "returns", label: "returns" },
                ],
              },
            ],
          },
          key: {
            kind: "cloze" as const,
            correctGapAnswers: [{ gapKey: "verb", choiceKey: "return" }],
          },
        },
        {
          skill: "writing" as const,
          taskFamily: "build-sentence" as const,
          sectionId: writingSectionId,
          item: {
            type: "sentence-build" as const,
            tokens: [
              { key: "the", label: "The" },
              { key: "meeting", label: "meeting" },
              { key: "starts", label: "starts" },
              { key: "today", label: "today" },
            ],
          },
          key: {
            kind: "token-order" as const,
            acceptedTokenOrders: [["the", "meeting", "starts", "today"]],
          },
        },
        {
          skill: "writing" as const,
          taskFamily: "write-email" as const,
          sectionId: writingSectionId,
          item: {
            type: "constructed-response" as const,
            responseMode: "writing" as const,
            minimumWords: 40,
            recommendedWords: 80,
            maximumCharacters: 2_000,
          },
          key: {
            kind: "text-rubric" as const,
            rubricMode: "writing" as const,
            maxPoints: 5,
            minimumWords: 40,
            targetTerms: ["request", "schedule"],
            sampleResponse: "I am writing to request a change to the schedule.",
          },
        },
      ];
      const result = [];
      for (let index = 0; index < definitions.length; index += 1) {
        const entry = definitions[index];
        const itemId = await ctx.db.insert("assessmentItems", {
          versionId,
          sectionId: entry.sectionId,
          itemKey: `specialized-${index}`,
          order: index % 2,
          prompt: `Specialized prompt ${index + 1}`,
          required: true,
          explanation: `Specialized explanation ${index + 1}`,
          provenanceJson: "{}",
          authoredBy: ownerId,
          createdAt: now,
          updatedAt: now,
          ...entry.item,
        });
        await ctx.db.insert("assessmentAnswerKeys", {
          versionId,
          itemId,
          scoringMode: entry.key.kind === "text-rubric" ? "rubric-v1" : "exact",
          ...(entry.key.kind === "text-rubric" ? {} : { points: 1 }),
          ...entry.key,
        });
        const bankQuestionId = await ctx.db.insert("assessmentQuestionBank", {
          bankKey: `specialized/${index}`,
          sourceDefinitionId: definitionId,
          sourceVersionId: versionId,
          sourceSectionId: entry.sectionId,
          sourceItemId: itemId,
          skill: entry.skill,
          taskFamily: entry.taskFamily,
          difficulty: "developing",
          status: "paused",
          profile: "ec-ibt-style-2026-v1",
          fullPracticeEligible: false,
          origin: "assessment-source",
          contentFingerprint: `specialized-fingerprint-${index}`,
          promptSearch: `specialized prompt ${index + 1}`,
          tags: [entry.skill, entry.taskFamily],
          createdBy: ownerId,
          updatedBy: ownerId,
          createdAt: now,
          updatedAt: now + index,
        });
        result.push({ bankQuestionId, itemId, type: entry.item.type });
      }
      return result;
    });

    const page = await owner.query(api.adminAssessmentQuestionBank.listPage, {
      status: "paused",
      paginationOpts: { cursor: null, numItems: 20, maximumRowsRead: 20 },
    });
    for (const fixture of rows) {
      const row = page.page.find(
        (candidate) => candidate.bankQuestionId === fixture.bankQuestionId,
      );
      if (row === undefined) throw new Error("Specialized row was not listed.");
      expect(row.content.type).toBe(fixture.type);
      const nextContent = {
        ...row.content,
        prompt: `${row.content.prompt} revised`,
        explanation: `${row.content.explanation} revised`,
      };
      const updated = await owner.mutation(
        api.adminAssessmentQuestionBank.updateContent,
        {
          bankQuestionId: row.bankQuestionId,
          expectedUpdatedAt: row.updatedAt,
          content: nextContent,
          illustrationMediaId: null,
          audioMediaId: null,
        },
      );
      if (!updated.ok) throw new Error("Specialized edit conflicted.");
      const original = await t.run(async (ctx) =>
        await ctx.db.get("assessmentItems", fixture.itemId),
      );
      expect(original?.prompt).toBe(row.content.prompt);
      expect(updated.sourceItemId).not.toBe(fixture.itemId);
      const refreshed = await owner.query(
        api.adminAssessmentQuestionBank.listPage,
        {
          status: "paused",
          skill: row.skill,
          paginationOpts: { cursor: null, numItems: 20, maximumRowsRead: 20 },
        },
      );
      expect(
        refreshed.page.find(
          (candidate) => candidate.bankQuestionId === row.bankQuestionId,
        )?.content,
      ).toEqual(nextContent);
    }

    const singleChoice = page.page.find(
      (row) => row.content.type === "multiple-select",
    );
    if (singleChoice === undefined) throw new Error("Expected a multiple-select row.");
    const currentReading = await owner.query(
      api.adminAssessmentQuestionBank.listPage,
      {
        status: "paused",
        skill: "reading",
        paginationOpts: { cursor: null, numItems: 20, maximumRowsRead: 20 },
      },
    );
    const currentMultiple = currentReading.page.find(
      (row) => row.bankQuestionId === singleChoice.bankQuestionId,
    );
    if (currentMultiple === undefined) {
      throw new Error("Expected the revised multiple-select row.");
    }
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.updateContent, {
        bankQuestionId: singleChoice.bankQuestionId,
        expectedUpdatedAt: currentMultiple.updatedAt,
        content: {
          type: "single-choice",
          prompt: "Changing the item type is not allowed.",
          explanation: null,
          options: listeningOptions,
          correctChoiceKey: "a",
        },
        illustrationMediaId: null,
        audioMediaId: null,
      }),
    ).rejects.toThrow();
  });

  it("marks public admin audio ready without image dimensions", async () => {
    const t = harness();
    const { ownerId } = await seedOwner(t);
    const mediaId = await t.mutation(internal.adminMedia.createPending, {
      objectKey: "uploads/assessment-audio/admin-upload-contract.mp3",
      purpose: "assessment-audio",
      contentType: "audio/mpeg",
      byteSize: 64_000,
      originalName: "admin-upload-contract.mp3",
      alt: "Short listening prompt for the Question Bank",
      durationMs: 8_400,
      uploadedBy: ownerId,
    });
    await expect(
      t.mutation(internal.adminMedia.markReady, {
        mediaId,
        width: 640,
        height: 360,
        durationMs: 8_400,
        actorId: ownerId,
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(internal.adminMedia.markReady, {
        mediaId,
        durationMs: 8_400,
        actorId: ownerId,
      }),
    ).resolves.toBe(
      "https://r2.mukhtada.my.id/uploads/assessment-audio/admin-upload-contract.mp3",
    );
    const media = await t.run(async (ctx) =>
      await ctx.db.get("mediaAssets", mediaId),
    );
    expect(media).toMatchObject({
      status: "ready",
      access: "public",
      durationMs: 8_400,
    });
    expect(media?.width).toBeUndefined();
    expect(media?.height).toBeUndefined();
  });
});
