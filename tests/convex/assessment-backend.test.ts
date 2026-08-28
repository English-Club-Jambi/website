import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  normalizeAssessmentMediaInput,
  privateAssessmentMediaKey,
  publicAssessmentDerivativeKey,
} from "../../convex/lib/assessmentMedia";
import { publicAssessmentR2UrlForMedia } from "../../convex/lib/media";
import { sha256Hex } from "../../convex/lib/resultDeliverySecurity";
import schema from "../../convex/schema";

const rawModules = import.meta.glob("../../convex/**/*.ts");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, loader]) => [
    path.replace("../../convex", "."),
    loader,
  ]),
);

const ownerToken = "https://perfect-greyhound-270.convex.site|assessment-owner";
const publisherToken =
  "https://perfect-greyhound-270.convex.site|assessment-publisher";
const editorToken = "https://perfect-greyhound-270.convex.site|assessment-editor";

beforeEach(() => {
  vi.stubEnv("PRACTICE_FORMAT_CREATION_MODE", "internal-maintenance");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function createHarness() {
  return convexTest(schema, modules);
}

async function anonymousIdentity(
  t: ReturnType<typeof createHarness>,
  tokenIdentifier: string,
) {
  const userId = await t.run(async (ctx) =>
    await ctx.db.insert("users", { isAnonymous: true }),
  );
  return t.withIdentity({
    subject: `${userId}|session`,
    tokenIdentifier,
  });
}

async function accountIdentity(
  t: ReturnType<typeof createHarness>,
  tokenIdentifier: string,
) {
  const userId = await t.run(async (ctx) =>
    await ctx.db.insert("users", { name: "Assessment learner" }),
  );
  return t.withIdentity({
    subject: `${userId}|session`,
    tokenIdentifier,
  });
}

async function bootstrapAdmins(t: ReturnType<typeof createHarness>) {
  const ownerId = await t.mutation(internal.adminUsers.bootstrapOwner, {
    tokenIdentifier: ownerToken,
    displayName: "Assessment Owner",
    email: "assessment-owner@example.com",
  });
  const owner = t.withIdentity({ tokenIdentifier: ownerToken });
  await owner.mutation(api.adminUsers.setAccess, {
    tokenIdentifier: publisherToken,
    displayName: "Assessment Publisher",
    email: "assessment-publisher@example.com",
    role: "publisher",
    status: "active",
  });
  await owner.mutation(api.adminUsers.setAccess, {
    tokenIdentifier: editorToken,
    displayName: "Assessment Editor",
    email: "assessment-editor@example.com",
    role: "editor",
    status: "active",
  });
  return {
    ownerId,
    owner,
    publisher: t.withIdentity({ tokenIdentifier: publisherToken }),
    editor: t.withIdentity({ tokenIdentifier: editorToken }),
  };
}

type PublishedFixture = Awaited<ReturnType<typeof seedPublishedFixture>>;

async function seedPublishedFixture(
  t: ReturnType<typeof createHarness>,
  options: {
    maxAttemptsPerDay?: number;
    kind?: "full-practice" | "skill-quiz" | "club-program-quiz";
    timed?: boolean;
    multipleSelect?: boolean;
    scorePolicy?:
      | "raw-objective"
      | "practice-estimate-v1"
      | "paper-estimate-v1";
  } = {},
) {
  const now = Date.now();
  return await t.run(async (ctx) => {
    const authorId = await ctx.db.insert("adminUsers", {
      tokenIdentifier: `fixture-author-${Math.random()}`,
      displayName: "Fixture Author",
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const definitionId = await ctx.db.insert("assessmentDefinitions", {
      slug: `internal-fixture-${Math.random().toString(36).slice(2)}`,
      kind: options.kind ?? "full-practice",
      profile:
        options.scorePolicy === "practice-estimate-v1"
          ? "ec-ibt-style-2026-v1"
          : "ec-itp-level-1-aligned-v1",
      adminTitle: "Internal assessment fixture",
      nextVersion: 2,
      visibility: "draft",
      createdBy: authorId,
      updatedBy: authorId,
      createdAt: now,
      updatedAt: now,
    });
    const versionId = await ctx.db.insert("assessmentVersions", {
      definitionId,
      version: 1,
      status: "published",
      title: "English Club Objective Practice",
      summary: "Original practice for listening, structure, and reading routines.",
      instructions: "Work independently and submit each section when you are ready.",
      locale: "en",
      timePolicy: options.timed ? "per-section" : "untimed",
      allowResume: true,
      reviewPolicy: "after-submit",
      scorePolicy: options.scorePolicy ?? "raw-objective",
      defaultTimingMode: options.timed ? "standard" : "untimed",
      defaultListeningMode: "audio-primary",
      maxAttemptsPerDay: options.maxAttemptsPerDay ?? 4,
      contentRevision: 1,
      validatedRevision: 1,
      contentChecksum: "fixture-only",
      createdBy: authorId,
      publishedBy: authorId,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    });
    await ctx.db.patch("assessmentDefinitions", definitionId, {
      publishedVersionId: versionId,
      visibility: "published",
    });
    const listeningSectionId = await ctx.db.insert("assessmentSections", {
      versionId,
      sectionKey: "listening",
      skill: "listening",
      order: 0,
      title: "Listening Comprehension",
      instructions: "Listen once, then choose the best answer.",
      timeLimitSeconds: options.timed ? 60 : undefined,
      audioReplayPolicy: "unlimited",
      itemCount: 1,
    });
    const readingSectionId = await ctx.db.insert("assessmentSections", {
      versionId,
      sectionKey: "reading",
      skill: "reading",
      order: 1,
      title: "Reading Comprehension",
      instructions: "Read the short passage and choose the best answer.",
      timeLimitSeconds: options.timed ? 60 : undefined,
      itemCount: 1,
    });
    const checksum = "a".repeat(64);
    const audioMediaId = await ctx.db.insert("mediaAssets", {
      objectKey: publicAssessmentDerivativeKey({
        versionId,
        checksumSha256: checksum,
        extension: "mp3",
      }),
      purpose: "assessment-audio",
      contentType: "audio/mpeg",
      byteSize: 1_024,
      status: "ready",
      originalName: "listening-review.mp3",
      alt: "Short original listening prompt",
      access: "public",
      durationMs: 8_000,
      checksumSha256: checksum,
      assessmentVersionId: versionId,
      uploadedBy: authorId,
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const stimulusId = await ctx.db.insert("assessmentStimuli", {
      versionId,
      sectionId: listeningSectionId,
      stimulusKey: "listen-001",
      kind: "audio",
      order: 0,
      title: "A campus conversation",
      mediaId: audioMediaId,
      transcript: "The club meeting begins after the afternoon class.",
      alt: "Two students arranging a club meeting",
      provenanceJson: JSON.stringify({ fixture: true }),
      authoredBy: authorId,
      createdAt: now,
      updatedAt: now,
    });
    const listeningItemId = options.multipleSelect
      ? await ctx.db.insert("assessmentItems", {
          versionId,
          sectionId: listeningSectionId,
          stimulusId,
          itemKey: "listen-item-001",
          order: 0,
          prompt: "Which two details are stated?",
          required: true,
          explanation: "The meeting follows class and belongs to the club.",
          provenanceJson: JSON.stringify({ fixture: true }),
          authoredBy: authorId,
          createdAt: now,
          updatedAt: now,
          type: "multiple-select" as const,
          options: [
            { key: "a", label: "After class" },
            { key: "b", label: "A club meeting" },
            { key: "c", label: "Before breakfast" },
          ],
          selectionMin: 1,
          selectionMax: 2,
        })
      : await ctx.db.insert("assessmentItems", {
          versionId,
          sectionId: listeningSectionId,
          stimulusId,
          itemKey: "listen-item-001",
          order: 0,
          prompt: "When does the meeting begin?",
          required: true,
          explanation: "The speaker says it begins after the afternoon class.",
          provenanceJson: JSON.stringify({ fixture: true }),
          authoredBy: authorId,
          createdAt: now,
          updatedAt: now,
          type: "single-choice" as const,
          options: [
            { key: "a", label: "Before breakfast" },
            { key: "b", label: "After the afternoon class" },
            { key: "c", label: "At midnight" },
          ],
        });
    await ctx.db.insert("assessmentAnswerKeys", {
      versionId,
      itemId: listeningItemId,
      kind: options.multipleSelect ? "multi-choice" : "choice",
      correctChoiceKeys: options.multipleSelect ? ["a", "b"] : ["b"],
      scoringMode: "exact",
    });
    const readingItemId = await ctx.db.insert("assessmentItems", {
      versionId,
      sectionId: readingSectionId,
      itemKey: "reading-item-001",
      order: 0,
      prompt: "What is the main purpose of the notice?",
      required: true,
      explanation: "The notice invites learners to the weekly practice room.",
      provenanceJson: JSON.stringify({ fixture: true }),
      authoredBy: authorId,
      createdAt: now,
      updatedAt: now,
      type: "single-choice",
      options: [
        { key: "a", label: "Invite learners to weekly practice" },
        { key: "b", label: "Cancel all club activities" },
      ],
    });
    await ctx.db.insert("assessmentAnswerKeys", {
      versionId,
      itemId: readingItemId,
      kind: "choice",
      correctChoiceKeys: ["a"],
      scoringMode: "exact",
    });
    return {
      authorId,
      definitionId,
      versionId,
      listeningSectionId,
      readingSectionId,
      listeningItemId,
      readingItemId,
      stimulusId,
      audioMediaId,
    };
  });
}

async function startAttempt(
  learner: Awaited<ReturnType<typeof anonymousIdentity>>,
  fixture: PublishedFixture,
  request = "start-request-0001",
) {
  return await learner.mutation(api.assessmentAttempts.start, {
    definitionId: fixture.definitionId,
    versionId: fixture.versionId,
    timingMode: "untimed",
    timeMultiplier: 1,
    listeningMode: "audio-primary",
    startRequestId: request,
  });
}

async function submitFixtureAttempt(
  learner: Awaited<ReturnType<typeof anonymousIdentity>>,
  fixture: PublishedFixture,
  requestSuffix: string,
) {
  const started = await startAttempt(
    learner,
    fixture,
    `delivery-start-${requestSuffix}`,
  );
  const firstBegun = await learner.mutation(
    api.assessmentAttempts.beginSection,
    { attemptId: started.attemptId },
  );
  const firstDone = await learner.mutation(
    api.assessmentAttempts.finalizeCurrentSection,
    {
      attemptId: started.attemptId,
      expectedRevision: firstBegun.revision,
    },
  );
  if (!firstDone.ok) throw new Error("delivery fixture revision conflicted");
  const secondBegun = await learner.mutation(
    api.assessmentAttempts.beginSection,
    { attemptId: started.attemptId },
  );
  const submitted = await learner.mutation(api.assessmentAttempts.submit, {
    attemptId: started.attemptId,
    submitRequestId: `delivery-submit-${requestSuffix}`,
    expectedRevision: secondBegun.revision,
  });
  if (!submitted.ok) throw new Error("delivery fixture submit conflicted");
  return { attemptId: started.attemptId, resultId: submitted.resultId };
}

describe("assessment participant authorization and response privacy", () => {
  it("derives ownership from Convex Auth and never leaks private keys before submit", async () => {
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    await expect(
      t.mutation(api.assessmentAttempts.start, {
        definitionId: fixture.definitionId,
        versionId: fixture.versionId,
        timingMode: "untimed",
        timeMultiplier: 1,
        listeningMode: "audio-primary",
        startRequestId: "unauthenticated-start",
      }),
    ).rejects.toThrow();

    const learnerA = await anonymousIdentity(t, "anonymous-a");
    const learnerB = await anonymousIdentity(t, "anonymous-b");
    const started = await startAttempt(learnerA, fixture);
    await expect(
      learnerA.query(api.assessmentAttempts.resolveMine, {
        attemptId: "plausible-but-not-a-real-convex-id",
      }),
    ).resolves.toBeNull();
    await expect(
      learnerB.query(api.assessmentAttempts.resolveMine, {
        attemptId: started.attemptId,
      }),
    ).resolves.toBeNull();
    await expect(
      learnerA.query(api.assessmentAttempts.resolveMine, {
        attemptId: started.attemptId,
      }),
    ).resolves.toEqual({
      attemptId: started.attemptId,
      status: "in-progress",
    });
    const retry = await startAttempt(learnerA, fixture);
    expect(retry.attemptId).toEqual(started.attemptId);

    const beforeBegin = await learnerA.query(api.assessmentAttempts.getAttemptState, {
      attemptId: started.attemptId,
    });
    expect(beforeBegin.phase).toBe("section-ready");
    const begun = await learnerA.mutation(api.assessmentAttempts.beginSection, {
      attemptId: started.attemptId,
    });
    expect(begun.revision).toBe(2);
    const player = await learnerA.query(api.assessmentAttempts.getPlayer, {
      attemptId: started.attemptId,
    });
    expect(player?.stimulus?.transcript).toBeNull();
    expect(player?.stimulus?.mediaUrl, JSON.stringify(player?.stimulus)).not.toBeNull();
    expect(player?.stimulus?.mediaUrl ?? "").toContain(
      "r2.mukhtada.my.id/assessments/",
    );
    expect(player?.responseRevision).toBe(0);
    expect(JSON.stringify(player)).not.toMatch(
      /correctChoiceKeys|correctAnswer|explanation|provenanceJson/,
    );
    await expect(
      learnerB.query(api.assessmentAttempts.getPlayer, {
        attemptId: started.attemptId,
      }),
    ).rejects.toThrow();
    await expect(
      learnerA.query(api.assessmentReviews.listMinePage, {
        attemptId: started.attemptId,
        sectionOrder: 0,
        paginationOpts: { cursor: null, numItems: 20 },
      }),
    ).rejects.toThrow();

    const saved = await learnerA.mutation(api.assessmentAttempts.saveResponse, {
      attemptId: started.attemptId,
      itemId: fixture.listeningItemId,
      response: { kind: "choice", selectedChoiceKey: "b" },
      expectedClientRevision: 0,
      mutationId: "save-response-0001",
      flagged: true,
    });
    expect(saved).toMatchObject({ ok: true, revision: 1 });
    await expect(
      learnerA.mutation(api.assessmentAttempts.saveResponse, {
        attemptId: started.attemptId,
        itemId: fixture.listeningItemId,
        response: { kind: "choice", selectedChoiceKey: "a" },
        expectedClientRevision: 0,
        mutationId: "save-response-0001",
        flagged: true,
      }),
    ).rejects.toThrow();
    await expect(
      learnerA.mutation(api.assessmentAttempts.saveResponse, {
        attemptId: started.attemptId,
        itemId: fixture.listeningItemId,
        response: { kind: "choice", selectedChoiceKey: "a" },
        expectedClientRevision: 0,
        mutationId: "save-response-0002",
        flagged: false,
      }),
    ).resolves.toMatchObject({ ok: false, code: "conflict", currentRevision: 1 });
    const savedPlayer = await learnerA.query(api.assessmentAttempts.getPlayer, {
      attemptId: started.attemptId,
    });
    expect(savedPlayer?.responseRevision).toBe(1);
    expect(savedPlayer?.itemStates).toEqual([
      expect.objectContaining({ answered: true, flagged: true, current: true }),
    ]);
  });

  it("rejects crafted multiple-select answers above the item selection maximum", async () => {
    const t = createHarness();
    const fixture = await seedPublishedFixture(t, { multipleSelect: true });
    const learner = await anonymousIdentity(t, "multiple-select-owner");
    const attempt = await startAttempt(learner, fixture);
    await learner.mutation(api.assessmentAttempts.beginSection, {
      attemptId: attempt.attemptId,
    });
    await expect(
      learner.mutation(api.assessmentAttempts.saveResponse, {
        attemptId: attempt.attemptId,
        itemId: fixture.listeningItemId,
        response: { kind: "multi-choice", selectedChoiceKeys: ["a", "b", "c"] },
        expectedClientRevision: 0,
        mutationId: "too-many-selections",
        flagged: false,
      }),
    ).rejects.toThrow();
  });
});

describe("assessment lifecycle, transcript support, and review", () => {
  it("does not submit early, persists transcript support, and exposes keys only after final submit", async () => {
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    const learner = await anonymousIdentity(t, "lifecycle-owner");
    const other = await anonymousIdentity(t, "lifecycle-other");
    const attempt = await startAttempt(learner, fixture);
    const begun = await learner.mutation(api.assessmentAttempts.beginSection, {
      attemptId: attempt.attemptId,
    });
    await expect(
      learner.mutation(api.assessmentAttempts.submit, {
        attemptId: attempt.attemptId,
        submitRequestId: "premature-submit",
        expectedRevision: begun.revision,
      }),
    ).rejects.toThrow();
    const progressBefore = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentAttemptSections")
        .withIndex("by_attempt_id_and_order", (q) =>
          q.eq("attemptId", attempt.attemptId),
        )
        .collect(),
    );
    expect(progressBefore.map((row) => row.status)).toEqual([
      "in-progress",
      "not-started",
    ]);

    const transcript = await learner.mutation(
      api.assessmentAttempts.enableTranscript,
      { attemptId: attempt.attemptId, expectedRevision: begun.revision },
    );
    if (!transcript.ok) throw new Error("transcript revision conflicted");
    expect(transcript).toEqual({ ok: true, revision: begun.revision + 1 });
    await expect(
      other.mutation(api.assessmentAttempts.enableTranscript, {
        attemptId: attempt.attemptId,
        expectedRevision: transcript.revision,
      }),
    ).rejects.toThrow();
    const transcriptRetry = await learner.mutation(
      api.assessmentAttempts.enableTranscript,
      { attemptId: attempt.attemptId, expectedRevision: 0 },
    );
    expect(transcriptRetry).toEqual(transcript);
    const withTranscript = await learner.query(api.assessmentAttempts.getPlayer, {
      attemptId: attempt.attemptId,
    });
    expect(withTranscript?.listeningMode).toBe("transcript-supported");
    expect(withTranscript?.stimulus?.transcript).toContain("meeting begins");

    const firstDone = await learner.mutation(
      api.assessmentAttempts.finalizeCurrentSection,
      { attemptId: attempt.attemptId, expectedRevision: transcript.revision },
    );
    expect(firstDone).toMatchObject({ ok: true, status: "section-review" });
    expect(
      await learner.query(api.assessmentAttempts.getPlayer, {
        attemptId: attempt.attemptId,
      }),
    ).toBeNull();
    const nextState = await learner.query(api.assessmentAttempts.getAttemptState, {
      attemptId: attempt.attemptId,
    });
    expect(nextState).toMatchObject({
      phase: "section-ready",
      section: { order: 1, skill: "reading" },
    });
    const secondBegun = await learner.mutation(api.assessmentAttempts.beginSection, {
      attemptId: attempt.attemptId,
    });
    await learner.mutation(api.assessmentAttempts.saveResponse, {
      attemptId: attempt.attemptId,
      itemId: fixture.readingItemId,
      response: { kind: "choice", selectedChoiceKey: "a" },
      expectedClientRevision: 0,
      mutationId: "reading-save-0001",
      flagged: false,
    });
    const submitted = await learner.mutation(api.assessmentAttempts.submit, {
      attemptId: attempt.attemptId,
      submitRequestId: "final-submit-0001",
      expectedRevision: secondBegun.revision,
    });
    if (!submitted.ok) throw new Error("submit revision conflicted");
    expect(submitted).toMatchObject({ ok: true, status: "submitted" });
    const submitRetry = await learner.mutation(api.assessmentAttempts.submit, {
      attemptId: attempt.attemptId,
      submitRequestId: "final-submit-0001",
      expectedRevision: 0,
    });
    expect(submitRetry.resultId).toEqual(submitted.resultId);

    const result = await learner.query(api.assessmentAttempts.getResult, {
      attemptId: attempt.attemptId,
    });
    expect(result).toMatchObject({
      listeningMode: "transcript-supported",
      label: "Transcript-supported practice result",
      objective: { correct: 1, possible: 2, omitted: 1 },
      disclaimer:
        "This is an English Club practice result based on original questions. It is not an official or predicted score. A requested completion certificate records participation only; it does not certify proficiency or admission eligibility.",
    });
    expect(result?.disclaimer).not.toMatch(/TOEFL/i);
    expect(result?.estimate).toBeNull();
    expect(result?.sections.map((section) => section.order)).toEqual([0, 1]);
    await expect(
      learner.mutation(api.assessmentAttempts.enableTranscript, {
        attemptId: attempt.attemptId,
        expectedRevision: submitted.revision,
      }),
    ).rejects.toThrow();
    const review = await learner.query(api.assessmentReviews.listMinePage, {
      attemptId: attempt.attemptId,
      sectionOrder: 1,
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(review.page[0]).toMatchObject({
      correct: true,
      answered: true,
      correctAnswer: { kind: "choice", selectedChoiceKey: "a" },
      explanation: "The notice invites learners to the weekly practice room.",
    });
    await expect(
      other.query(api.assessmentReviews.listMinePage, {
        attemptId: attempt.attemptId,
        sectionOrder: 1,
        paginationOpts: { cursor: null, numItems: 20 },
      }),
    ).rejects.toThrow();
    await expect(
      learner.query(api.assessmentReviews.listMinePage, {
        attemptId: attempt.attemptId,
        sectionOrder: 1,
        paginationOpts: { cursor: null, numItems: 21 },
      }),
    ).rejects.toThrow();
  });

  it("separates exact delivered-item results from bounded score estimates", async () => {
    const t = createHarness();
    const fixture = await seedPublishedFixture(t, {
      scorePolicy: "practice-estimate-v1",
    });
    const learner = await anonymousIdentity(t, "estimate-wording-owner");
    const attempt = await startAttempt(
      learner,
      fixture,
      "estimate-wording-start-0001",
    );
    const firstBegun = await learner.mutation(
      api.assessmentAttempts.beginSection,
      { attemptId: attempt.attemptId },
    );
    const firstDone = await learner.mutation(
      api.assessmentAttempts.finalizeCurrentSection,
      {
        attemptId: attempt.attemptId,
        expectedRevision: firstBegun.revision,
      },
    );
    if (!firstDone.ok) throw new Error("section revision conflicted");
    const secondBegun = await learner.mutation(
      api.assessmentAttempts.beginSection,
      { attemptId: attempt.attemptId },
    );
    const submitted = await learner.mutation(api.assessmentAttempts.submit, {
      attemptId: attempt.attemptId,
      submitRequestId: "estimate-wording-submit-0001",
      expectedRevision: secondBegun.revision,
    });
    if (!submitted.ok) throw new Error("submit revision conflicted");

    const result = await learner.query(api.assessmentAttempts.getResult, {
      attemptId: attempt.attemptId,
    });
    expect(result).toMatchObject({
      estimate: {
        model: "ec-ibt-style-v1",
        overallBand: null,
        comparableTotal: null,
        confidence: "low",
      },
      disclaimer:
        "The raw result is exact for the original questions delivered in this attempt. The band and 0-120 values are English Club estimates, not an official ETS score or an exact test prediction. A requested completion certificate records participation only; it does not certify this estimate, proficiency, or admission eligibility.",
    });
    expect(result?.disclaimer).toMatch(/not an official ETS score/i);
    expect(result?.disclaimer).not.toMatch(/predicted TOEFL score/i);
    expect(result?.disclaimer).not.toMatch(
      /(?:is|reports|provides) an? (?:official|predicted) (?:ETS|TOEFL)? ?score/i,
    );
  });

  it("submits a legacy quick attempt with paper policy as a raw objective result", async () => {
    const t = createHarness();
    const fixture = await seedPublishedFixture(t, {
      kind: "skill-quiz",
      scorePolicy: "paper-estimate-v1",
    });
    const learner = await anonymousIdentity(t, "legacy-paper-quick-owner");
    const attempt = await startAttempt(
      learner,
      fixture,
      "legacy-paper-quick-start-0001",
    );
    const firstBegun = await learner.mutation(
      api.assessmentAttempts.beginSection,
      { attemptId: attempt.attemptId },
    );
    const firstDone = await learner.mutation(
      api.assessmentAttempts.finalizeCurrentSection,
      {
        attemptId: attempt.attemptId,
        expectedRevision: firstBegun.revision,
      },
    );
    if (!firstDone.ok) throw new Error("section revision conflicted");
    const secondBegun = await learner.mutation(
      api.assessmentAttempts.beginSection,
      { attemptId: attempt.attemptId },
    );
    const submitted = await learner.mutation(api.assessmentAttempts.submit, {
      attemptId: attempt.attemptId,
      submitRequestId: "legacy-paper-quick-submit-0001",
      expectedRevision: secondBegun.revision,
    });
    if (!submitted.ok) throw new Error("submit revision conflicted");

    const result = await learner.query(api.assessmentAttempts.getResult, {
      attemptId: attempt.attemptId,
    });
    expect(result).toMatchObject({
      objective: { possible: 2 },
      estimate: null,
      disclaimer:
        "This is an English Club practice result based on original questions. It is not an official or predicted score. A requested completion certificate records participation only; it does not certify proficiency or admission eligibility.",
    });
    expect(result?.sections.every((section) => section.paperSectionEstimate === null)).toBe(true);
  });

  it("closes only the expired current section and leaves the next section unstarted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T09:00:00.000Z"));
    const t = createHarness();
    const fixture = await seedPublishedFixture(t, { timed: true });
    const learner = await anonymousIdentity(t, "timer-owner");
    const started = await learner.mutation(api.assessmentAttempts.start, {
      definitionId: fixture.definitionId,
      versionId: fixture.versionId,
      timingMode: "standard",
      timeMultiplier: 1,
      listeningMode: "audio-primary",
      startRequestId: "timer-start-0001",
    });
    await learner.mutation(api.assessmentAttempts.beginSection, {
      attemptId: started.attemptId,
    });
    vi.setSystemTime(new Date("2026-08-26T09:01:01.000Z"));
    const lateSave = await learner.mutation(api.assessmentAttempts.saveResponse, {
      attemptId: started.attemptId,
      itemId: fixture.listeningItemId,
      response: { kind: "choice", selectedChoiceKey: "b" },
      expectedClientRevision: 0,
      mutationId: "late-save-0001",
      flagged: false,
    });
    expect(lateSave).toEqual({ ok: false, code: "section_closed" });
    const rows = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentAttemptSections")
        .withIndex("by_attempt_id_and_order", (q) =>
          q.eq("attemptId", started.attemptId),
        )
        .collect(),
    );
    expect(rows.map((row) => row.status)).toEqual(["completed", "not-started"]);
  });
});

describe("Full Practice result delivery grants", () => {
  const providerAttemptId = (sequence: number) =>
    `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
  const publicCertificateId = (sequence: number) =>
    `EC-${sequence.toString(16).toUpperCase().padStart(32, "0")}`;

  function stubDeliveryEnvironment() {
    vi.stubEnv("BREVO_API_KEY", "brevo-test-key-with-enough-entropy");
    vi.stubEnv("BREVO_SENDER_EMAIL", "results@english-club.example");
    vi.stubEnv("BREVO_SENDER_NAME", "English Club");
    vi.stubEnv("BREVO_REPLY_TO_EMAIL", "hello@english-club.example");
    vi.stubEnv(
      "RESULT_DELIVERY_PUBLIC_ORIGIN",
      "https://english-club.example",
    );
    vi.stubEnv(
      "RESULT_DELIVERY_RECIPIENT_HASH_KEY",
      "result-delivery-test-hmac-key-with-32-characters",
    );
    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-test-secret");
  }

  async function reservationInput(args: {
    attemptId: Id<"assessmentAttempts">;
    ownerTokenIdentifier: string;
    requestId: string;
    reviewToken: string;
    recipientEmail?: string;
    recipientName?: string;
    sequence: number;
  }) {
    return {
      attemptId: args.attemptId,
      ownerTokenIdentifier: args.ownerTokenIdentifier,
      requestId: args.requestId,
      certificateTemplate: "mendalo-record" as const,
      recipientHash: await sha256Hex(
        args.recipientEmail ?? "siti.rahma@example.com",
      ),
      certificateNameHash: await sha256Hex(args.recipientName ?? "Siti Rahma"),
      tokenHash: await sha256Hex(args.reviewToken),
      providerAttemptId: providerAttemptId(args.sequence),
      publicCertificateId: publicCertificateId(args.sequence),
      consentVersion: 1 as const,
      humanVerifiedAt: Date.now(),
    };
  }

  it("sends one owner-scoped Brevo message without storing recipient PII", async () => {
    stubDeliveryEnvironment();
    const providerFetch = vi.fn<typeof fetch>(async (input) => {
      const endpoint = String(input);
      if (endpoint.includes("challenges.cloudflare.com")) {
        return new Response(
          JSON.stringify({
            success: true,
            action: "full-practice-result-email",
            hostname: "english-club.example",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ messageId: "brevo-message-live-0001" }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", providerFetch);

    const t = createHarness();
    const ownerTokenIdentifier = "delivery-action-owner";
    const fixture = await seedPublishedFixture(t);
    const learner = await anonymousIdentity(t, ownerTokenIdentifier);
    const submitted = await submitFixtureAttempt(
      learner,
      fixture,
      "action-contract-0001",
    );
    const recipientEmail = "alya.rahman@example.com";
    const outcome = await learner.action(api.assessmentResultEmail.send, {
      attemptId: submitted.attemptId,
      recipientName: "Alya Rahman",
      recipientEmail,
      certificateTemplate: "mendalo-record",
      requestId: "delivery-action-0001",
      consent: true,
      consentVersion: 1,
      turnstileToken: "turnstile-test-token-that-is-long-enough",
    });

    expect(outcome).toMatchObject({
      ok: true,
      maskedEmail: "a•••••••@example.com",
    });
    expect(providerFetch).toHaveBeenCalledTimes(2);
    const turnstileCall = providerFetch.mock.calls.find(([endpoint]) =>
      String(endpoint).includes("challenges.cloudflare.com"),
    );
    expect(turnstileCall).toBeDefined();
    const turnstileBody = new URLSearchParams(
      String(turnstileCall?.[1]?.body),
    );
    expect(turnstileBody.get("response")).toBe(
      "turnstile-test-token-that-is-long-enough",
    );
    expect(turnstileBody.get("idempotency_key")).toMatch(
      /^[0-9a-f-]{36}$/iu,
    );
    const brevoCall = providerFetch.mock.calls.find(
      ([endpoint]) => endpoint === "https://api.brevo.com/v3/smtp/email",
    );
    expect(brevoCall).toBeDefined();
    const [endpoint, init] = brevoCall!;
    expect(endpoint).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "api-key": "brevo-test-key-with-enough-entropy",
    });
    expect(init?.headers).not.toHaveProperty("Idempotency-Key");
    const body = String(init?.body);
    expect(body).toContain(recipientEmail);
    expect(body).toContain("Alya Rahman");
    expect(body).toContain("hello@english-club.example");
    expect(body).toContain(
      "https://english-club.example/practice/review#access=",
    );
    expect(body).not.toContain("brevo-test-key-with-enough-entropy");
    const providerPayload = JSON.parse(body) as {
      headers: { idempotencyKey: string; "X-Ec-Delivery": string };
      to: Array<{ contactPixelTrackingConsent: boolean }>;
      attachment: Array<{ name: string; content: string }>;
    };
    expect(providerPayload.headers.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
    );
    expect(providerPayload.headers["X-Ec-Delivery"]).toMatch(
      /^EC-[A-F0-9]{32}$/u,
    );
    expect(providerPayload.to[0]?.contactPixelTrackingConsent).toBe(false);
    expect(providerPayload.attachment).toHaveLength(1);
    expect(providerPayload.attachment[0]?.name).toMatch(
      /^english-club-full-practice-EC-[A-F0-9]{32}\.pdf$/u,
    );
    expect(providerPayload.attachment[0]?.content).toMatch(/^JVBER/u);

    const stored = await t.run(async (ctx) => {
      const deliveries = await ctx.db
        .query("assessmentResultDeliveries")
        .withIndex("by_attempt_id_and_requested_at", (q) =>
          q.eq("attemptId", submitted.attemptId),
        )
        .take(2);
      const grants = await ctx.db
        .query("assessmentResultReviewGrants")
        .withIndex("by_attempt_id_and_created_at", (q) =>
          q.eq("attemptId", submitted.attemptId),
        )
        .take(2);
      return { deliveries, grants };
    });
    expect(stored.deliveries).toHaveLength(1);
    expect(stored.deliveries[0]).toMatchObject({
      status: "accepted",
      providerMessageId: "brevo-message-live-0001",
      providerAttemptId: providerPayload.headers.idempotencyKey,
      publicCertificateId: providerPayload.headers["X-Ec-Delivery"],
      consentVersion: 1,
    });
    expect(stored.deliveries[0]?.recipientHash).not.toBe(
      await sha256Hex(recipientEmail),
    );
    expect(JSON.stringify(stored)).not.toContain(recipientEmail);
    expect(JSON.stringify(stored)).not.toContain("Alya Rahman");

    const replay = await learner.action(api.assessmentResultEmail.send, {
      attemptId: submitted.attemptId,
      recipientName: "Alya Rahman",
      recipientEmail,
      certificateTemplate: "mendalo-record",
      requestId: "delivery-action-0001",
      consent: true,
      consentVersion: 1,
      turnstileToken: "deliberately-invalid-on-accepted-replay",
    });
    expect(replay).toMatchObject({ ok: true });
    expect(providerFetch).toHaveBeenCalledTimes(2);
  });

  it("rejects unsubmitted and missing attempts before recording or fetching verification", async () => {
    stubDeliveryEnvironment();
    const providerFetch = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", providerFetch);
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    const ownerTokenIdentifier = "verification-attempt-owner";
    const learner = await anonymousIdentity(t, ownerTokenIdentifier);
    const unsubmitted = await startAttempt(
      learner,
      fixture,
      "verification-unsubmitted-start",
    );
    const missing = await startAttempt(
      learner,
      fixture,
      "verification-missing-start",
    );
    await t.run(async (ctx) => {
      await ctx.db.delete("assessmentAttempts", missing.attemptId);
    });
    const baseInput = {
      recipientName: "Alya Rahman",
      recipientEmail: "alya@example.com",
      certificateTemplate: "mendalo-record" as const,
      consent: true,
      consentVersion: 1 as const,
      turnstileToken: "turnstile-attempt-check-token-long-enough",
    };

    await expect(
      learner.action(api.assessmentResultEmail.send, {
        ...baseInput,
        attemptId: unsubmitted.attemptId,
        requestId: "verification-unsubmitted-request",
      }),
    ).resolves.toEqual({ ok: false, code: "not_available" });
    await expect(
      learner.action(api.assessmentResultEmail.send, {
        ...baseInput,
        attemptId: missing.attemptId,
        requestId: "verification-missing-request",
      }),
    ).resolves.toEqual({ ok: false, code: "not_available" });

    expect(providerFetch).not.toHaveBeenCalled();
    const verificationEvents = await t.run(async (ctx) =>
      await ctx.db.query("assessmentResultVerificationEvents").take(1),
    );
    expect(verificationEvents).toHaveLength(0);
  });

  it("allows six invalid Turnstile checks and rate limits the seventh before Siteverify", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T04:00:00.000Z"));
    stubDeliveryEnvironment();
    const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: "wrong-action",
          hostname: "english-club.example",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", providerFetch);
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    const learner = await anonymousIdentity(t, "verification-rate-owner");
    const submitted = await submitFixtureAttempt(
      learner,
      fixture,
      "verification-rate-submit",
    );
    const baseInput = {
      attemptId: submitted.attemptId,
      recipientName: "Alya Rahman",
      recipientEmail: "alya@example.com",
      certificateTemplate: "mendalo-record" as const,
      consent: true,
      consentVersion: 1 as const,
      turnstileToken: "turnstile-rate-limit-token-long-enough",
    };

    for (let index = 0; index < 6; index += 1) {
      await expect(
        learner.action(api.assessmentResultEmail.send, {
          ...baseInput,
          requestId: `verification-rate-request-${index}`,
        }),
      ).resolves.toEqual({ ok: false, code: "invalid" });
    }
    expect(providerFetch).toHaveBeenCalledTimes(6);

    await expect(
      learner.action(api.assessmentResultEmail.send, {
        ...baseInput,
        requestId: "verification-rate-request-6",
      }),
    ).resolves.toEqual({
      ok: false,
      code: "rate_limited",
      retryAt: Date.parse("2026-08-28T04:10:00.000Z"),
    });
    expect(providerFetch).toHaveBeenCalledTimes(6);
    const verificationEvents = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentResultVerificationEvents")
        .withIndex("by_owner_token_identifier_and_created_at", (q) =>
          q.eq("ownerTokenIdentifier", "verification-rate-owner"),
        )
        .collect(),
    );
    expect(verificationEvents).toHaveLength(6);
    const deliveries = await t.run(async (ctx) =>
      await ctx.db.query("assessmentResultDeliveries").take(1),
    );
    expect(deliveries).toHaveLength(0);
  });

  it("rejects unauthenticated review revocation", async () => {
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    const learner = await anonymousIdentity(t, "revoke-auth-owner");
    const submitted = await submitFixtureAttempt(
      learner,
      fixture,
      "revoke-auth-submit",
    );

    await expect(
      t.action(api.assessmentResultEmail.revokeReviewLinks, {
        attemptId: submitted.attemptId,
      }),
    ).rejects.toMatchObject({ data: { code: "AUTH_REQUIRED" } });
  });

  it.each([
    {
      label: "action",
      verification: {
        success: true,
        action: "wrong-action",
        hostname: "english-club.example",
      },
    },
    {
      label: "hostname",
      verification: {
        success: true,
        action: "full-practice-result-email",
        hostname: "attacker.example",
      },
    },
  ])(
    "fails closed when Turnstile returns the wrong $label before reserving delivery",
    async ({ verification }) => {
      stubDeliveryEnvironment();
      const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(verification), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", providerFetch);
      const t = createHarness();
      const fixture = await seedPublishedFixture(t);
      const learner = await anonymousIdentity(t, "turnstile-negative-owner");
      const submitted = await submitFixtureAttempt(
        learner,
        fixture,
        `turnstile-negative-${verification.hostname}`,
      );

      await expect(
        learner.action(api.assessmentResultEmail.send, {
          attemptId: submitted.attemptId,
          recipientName: "Alya Rahman",
          recipientEmail: "alya@example.com",
          certificateTemplate: "mendalo-record",
          requestId: `turnstile-request-${verification.action}`,
          consent: true,
          consentVersion: 1,
          turnstileToken: "turnstile-negative-token-long-enough",
        }),
      ).resolves.toEqual({ ok: false, code: "invalid" });
      expect(providerFetch).toHaveBeenCalledOnce();
      expect(String(providerFetch.mock.calls[0]?.[0])).toContain(
        "challenges.cloudflare.com",
      );
      const deliveries = await t.run(async (ctx) =>
        await ctx.db.query("assessmentResultDeliveries").take(1),
      );
      expect(deliveries).toHaveLength(0);
    },
  );

  it("keeps one provider UUID and exact payload across a bounded retry, then freezes an uncertain delivery", async () => {
    stubDeliveryEnvironment();
    const brevoBodies: string[] = [];
    const providerFetch = vi.fn<typeof fetch>(async (input, init) => {
      const endpoint = String(input);
      if (endpoint.includes("challenges.cloudflare.com")) {
        return new Response(
          JSON.stringify({
            success: true,
            action: "full-practice-result-email",
            hostname: "english-club.example",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      brevoBodies.push(String(init?.body));
      return new Response(JSON.stringify({ code: "temporary_failure" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", providerFetch);
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    const learner = await anonymousIdentity(t, "delivery-uncertain-owner");
    const submitted = await submitFixtureAttempt(
      learner,
      fixture,
      "delivery-uncertain-submit",
    );
    const input = {
      attemptId: submitted.attemptId,
      recipientName: "Alya Rahman",
      recipientEmail: "alya@example.com",
      certificateTemplate: "mendalo-record" as const,
      requestId: "delivery-uncertain-request",
      consent: true,
      consentVersion: 1 as const,
      turnstileToken: "turnstile-uncertain-token-long-enough",
    };

    await expect(
      learner.action(api.assessmentResultEmail.send, input),
    ).resolves.toEqual({ ok: false, code: "delivery_uncertain" });
    expect(brevoBodies).toHaveLength(2);
    expect(brevoBodies[1]).toBe(brevoBodies[0]);
    const payload = JSON.parse(brevoBodies[0]!) as {
      headers: { idempotencyKey: string };
    };
    const stored = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentResultDeliveries")
        .withIndex("by_attempt_id_and_requested_at", (q) =>
          q.eq("attemptId", submitted.attemptId),
        )
        .unique(),
    );
    expect(stored).toMatchObject({
      status: "uncertain",
      failureCode: "provider_uncertain",
      providerAttemptId: payload.headers.idempotencyKey,
    });

    const fetchCountAfterAmbiguousProvider = providerFetch.mock.calls.length;
    await expect(
      learner.action(api.assessmentResultEmail.send, {
        ...input,
        turnstileToken: "invalid-replay-token-is-never-submitted",
      }),
    ).resolves.toEqual({ ok: false, code: "delivery_uncertain" });
    expect(providerFetch).toHaveBeenCalledTimes(fetchCountAfterAmbiguousProvider);
  });

  it("binds one hashed delivery to its owner, payload, result, and expiring review", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T02:00:00.000Z"));
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    const ownerTokenIdentifier = "delivery-result-owner";
    const learner = await anonymousIdentity(t, ownerTokenIdentifier);
    const submitted = await submitFixtureAttempt(
      learner,
      fixture,
      "grant-contract-0001",
    );
    const reviewToken = "A".repeat(43);
    const recipientEmail = "siti.rahma@example.com";
    const request = await reservationInput({
      attemptId: submitted.attemptId,
      ownerTokenIdentifier,
      requestId: "delivery-request-0001",
      reviewToken,
      recipientEmail,
      sequence: 101,
    });

    const reserved = await t.mutation(
      internal.assessmentResultDelivery.reserve,
      request,
    );
    expect(reserved).toMatchObject({ state: "created" });
    if (reserved.state !== "created") throw new Error("delivery was not created");

    const stored = await t.run(async (ctx) => ({
      delivery: await ctx.db.get("assessmentResultDeliveries", reserved.deliveryId),
      grant: await ctx.db.get("assessmentResultReviewGrants", reserved.grantId),
    }));
    expect(stored.delivery).toMatchObject({
      attemptId: submitted.attemptId,
      resultId: submitted.resultId,
      recipientHash: request.recipientHash,
      status: "preparing",
    });
    expect(stored.grant).toMatchObject({
      tokenHash: request.tokenHash,
      status: "active",
    });
    expect(JSON.stringify(stored)).not.toContain(recipientEmail);
    expect(JSON.stringify(stored)).not.toContain(reviewToken);

    const snapshot = await t.query(
      internal.assessmentResultDelivery.getSnapshot,
      {
        deliveryId: reserved.deliveryId,
        ownerTokenIdentifier,
      },
    );
    expect(snapshot).toMatchObject({
      certificateTemplate: "mendalo-record",
      result: { kind: "full-practice", objective: { possible: 2 } },
    });

    const redeemed = await t.action(api.assessmentResultDelivery.redeem, {
      token: reviewToken,
    });
    expect(redeemed).toMatchObject({ ok: true });
    if (!redeemed.ok) throw new Error("review grant did not redeem");
    expect(redeemed.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    const shared = await t.action(
      api.assessmentResultDelivery.getSharedResult,
      { sessionToken: redeemed.sessionToken },
    );
    expect(shared).toMatchObject({
      result: { kind: "full-practice", objective: { possible: 2 } },
    });
    const review = await t.action(
      api.assessmentResultDelivery.listSharedReviewPage,
      {
        sessionToken: redeemed.sessionToken,
        sectionOrder: 1,
        paginationOpts: { cursor: null, numItems: 20 },
      },
    );
    expect(review.page).toHaveLength(1);
    expect(review.page[0]).toMatchObject({
      item: { id: fixture.readingItemId },
      correctAnswer: { kind: "choice", selectedChoiceKey: "a" },
    });
    await expect(
      t.action(api.assessmentResultDelivery.getSharedResult, {
        sessionToken: "B".repeat(43),
      }),
    ).resolves.toBeNull();

    await t.mutation(internal.assessmentResultDelivery.beginProviderAttempt, {
      deliveryId: reserved.deliveryId,
      providerAttemptId: request.providerAttemptId,
    });
    await t.mutation(internal.assessmentResultDelivery.markAccepted, {
      deliveryId: reserved.deliveryId,
      providerAttemptId: request.providerAttemptId,
      providerMessageId: "brevo-message-0001",
    });
    await expect(
      t.mutation(internal.assessmentResultDelivery.reserve, {
        ...request,
        tokenHash: await sha256Hex("C".repeat(43)),
      }),
    ).resolves.toMatchObject({
      state: "accepted",
      deliveryId: reserved.deliveryId,
    });
    await expect(
      t.mutation(internal.assessmentResultDelivery.reserve, {
        ...request,
        recipientHash: await sha256Hex("other@example.com"),
      }),
    ).rejects.toThrow();

    vi.setSystemTime(new Date("2026-08-28T02:30:01.000Z"));
    await expect(
      t.action(api.assessmentResultDelivery.getSharedResult, {
        sessionToken: redeemed.sessionToken,
      }),
    ).resolves.toBeNull();
    const refreshedSession = await t.action(
      api.assessmentResultDelivery.redeem,
      { token: reviewToken },
    );
    expect(refreshedSession).toMatchObject({ ok: true });
    if (!refreshedSession.ok) throw new Error("review grant did not redeem");

    vi.setSystemTime(new Date("2026-09-28T02:00:01.000Z"));
    await expect(
      t.action(api.assessmentResultDelivery.getSharedResult, {
        sessionToken: refreshedSession.sessionToken,
      }),
    ).resolves.toBeNull();
    await expect(
      t.action(api.assessmentResultDelivery.redeem, { token: reviewToken }),
    ).resolves.toEqual({ ok: false, code: "unavailable" });
  });

  it("caps private review sessions at five and revokes the grant and every live session", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T02:30:00.000Z"));
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    const ownerTokenIdentifier = "delivery-session-owner";
    const learner = await anonymousIdentity(t, ownerTokenIdentifier);
    const submitted = await submitFixtureAttempt(
      learner,
      fixture,
      "delivery-session-submit",
    );
    const reviewToken = "R".repeat(43);
    const request = await reservationInput({
      attemptId: submitted.attemptId,
      ownerTokenIdentifier,
      requestId: "delivery-session-request",
      reviewToken,
      sequence: 202,
    });
    const reserved = await t.mutation(
      internal.assessmentResultDelivery.reserve,
      request,
    );
    if (reserved.state !== "created") throw new Error("delivery was not created");
    await t.mutation(internal.assessmentResultDelivery.beginProviderAttempt, {
      deliveryId: reserved.deliveryId,
      providerAttemptId: request.providerAttemptId,
    });
    await t.mutation(internal.assessmentResultDelivery.markAccepted, {
      deliveryId: reserved.deliveryId,
      providerAttemptId: request.providerAttemptId,
      providerMessageId: "brevo-session-message",
    });

    const sessionTokens: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      vi.setSystemTime(new Date(Date.now() + 1));
      const redeemed = await t.action(api.assessmentResultDelivery.redeem, {
        token: reviewToken,
      });
      if (!redeemed.ok) throw new Error("review grant did not redeem");
      sessionTokens.push(redeemed.sessionToken);
    }
    await expect(
      t.action(api.assessmentResultDelivery.redeem, { token: reviewToken }),
    ).resolves.toEqual({ ok: false, code: "unavailable" });
    const sessions = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentResultReviewSessions")
        .withIndex("by_grant_id_and_created_at", (q) =>
          q.eq("grantId", reserved.grantId),
        )
        .collect(),
    );
    expect(sessions).toHaveLength(5);
    for (const sessionToken of sessionTokens) {
      expect(JSON.stringify(sessions)).not.toContain(sessionToken);
    }
    await expect(
      t.action(api.assessmentResultDelivery.getSharedResult, {
        sessionToken: sessionTokens[0]!,
      }),
    ).resolves.toMatchObject({ result: { kind: "full-practice" } });
    await expect(
      t.action(api.assessmentResultDelivery.getSharedResult, {
        sessionToken: sessionTokens.at(-1)!,
      }),
    ).resolves.toMatchObject({ result: { kind: "full-practice" } });

    await expect(
      learner.action(api.assessmentResultEmail.revokeReviewLinks, {
        attemptId: submitted.attemptId,
      }),
    ).resolves.toEqual({ revoked: 1 });
    await expect(
      t.action(api.assessmentResultDelivery.getSharedResult, {
        sessionToken: sessionTokens.at(-1)!,
      }),
    ).resolves.toBeNull();
    await expect(
      t.action(api.assessmentResultDelivery.redeem, { token: reviewToken }),
    ).resolves.toEqual({ ok: false, code: "unavailable" });
  });

  it("moves a provider attempt through preparing, sending, and frozen uncertain states", async () => {
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    const ownerTokenIdentifier = "delivery-state-owner";
    const learner = await anonymousIdentity(t, ownerTokenIdentifier);
    const submitted = await submitFixtureAttempt(
      learner,
      fixture,
      "delivery-state-submit",
    );
    const request = await reservationInput({
      attemptId: submitted.attemptId,
      ownerTokenIdentifier,
      requestId: "delivery-state-request",
      reviewToken: "S".repeat(43),
      sequence: 303,
    });
    const reserved = await t.mutation(
      internal.assessmentResultDelivery.reserve,
      request,
    );
    if (reserved.state !== "created") throw new Error("delivery was not created");

    await expect(
      t.mutation(internal.assessmentResultDelivery.beginProviderAttempt, {
        deliveryId: reserved.deliveryId,
        providerAttemptId: request.providerAttemptId,
      }),
    ).resolves.toEqual({ state: "send" });
    await expect(
      t.mutation(internal.assessmentResultDelivery.beginProviderAttempt, {
        deliveryId: reserved.deliveryId,
        providerAttemptId: request.providerAttemptId,
      }),
    ).resolves.toEqual({ state: "in_progress" });
    await expect(
      t.mutation(internal.assessmentResultDelivery.beginProviderAttempt, {
        deliveryId: reserved.deliveryId,
        providerAttemptId: providerAttemptId(999),
      }),
    ).rejects.toThrow();
    await t.mutation(internal.assessmentResultDelivery.markUncertain, {
      deliveryId: reserved.deliveryId,
      providerAttemptId: request.providerAttemptId,
    });
    await expect(
      t.mutation(internal.assessmentResultDelivery.reserve, request),
    ).resolves.toMatchObject({
      state: "uncertain",
      deliveryId: reserved.deliveryId,
    });
    await expect(
      t.query(internal.assessmentResultDelivery.inspect, {
        attemptId: submitted.attemptId,
        ownerTokenIdentifier,
        requestId: request.requestId,
        certificateTemplate: request.certificateTemplate,
        recipientHash: request.recipientHash,
        certificateNameHash: request.certificateNameHash,
        consentVersion: 1,
        now: Date.now(),
      }),
    ).resolves.toMatchObject({ state: "uncertain" });
  });

  it("rate limits repeated delivery reservations before provider work starts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T03:00:00.000Z"));
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    const ownerTokenIdentifier = "delivery-rate-owner";
    const learner = await anonymousIdentity(t, ownerTokenIdentifier);
    const submitted = await submitFixtureAttempt(
      learner,
      fixture,
      "rate-contract-0001",
    );
    for (let index = 0; index < 3; index += 1) {
      const request = await reservationInput({
        attemptId: submitted.attemptId,
        ownerTokenIdentifier,
        requestId: `delivery-rate-000${index}`,
        reviewToken: String(index).repeat(43),
        recipientEmail: "rate@example.com",
        sequence: 400 + index,
      });
      await expect(
        t.mutation(internal.assessmentResultDelivery.reserve, request),
      ).resolves.toMatchObject({ state: "created" });
    }

    const limitedRequest = await reservationInput({
      attemptId: submitted.attemptId,
      ownerTokenIdentifier,
      requestId: "delivery-rate-0004",
      reviewToken: "Z".repeat(43),
      recipientEmail: "rate@example.com",
      sequence: 404,
    });
    await expect(
      t.mutation(internal.assessmentResultDelivery.reserve, limitedRequest),
    ).resolves.toMatchObject({ state: "rate_limited" });
  });
});

describe("assessment quotas, exclusions, and privacy deletion", () => {
  it("enforces the owner/version/day quota while keeping idempotent retry safe", async () => {
    const t = createHarness();
    const fixture = await seedPublishedFixture(t, { maxAttemptsPerDay: 1 });
    const learner = await anonymousIdentity(t, "quota-owner");
    const first = await startAttempt(learner, fixture, "quota-start-0001");
    const retry = await startAttempt(learner, fixture, "quota-start-0001");
    expect(retry.attemptId).toEqual(first.attemptId);
    await expect(
      startAttempt(learner, fixture, "quota-start-0002"),
    ).rejects.toThrow();
  });

  it("rejects the local-only programme quiz from the assessment attempt engine", async () => {
    const t = createHarness();
    const fixture = await seedPublishedFixture(t, { kind: "club-program-quiz" });
    const learner = await accountIdentity(t, "account-owner");
    await expect(startAttempt(learner, fixture)).rejects.toThrow();
  });

  it("deletes only the caller's bounded attempt graph", async () => {
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    const owner = await anonymousIdentity(t, "delete-owner");
    const other = await anonymousIdentity(t, "delete-other");
    const started = await startAttempt(owner, fixture);
    await owner.mutation(api.assessmentAttempts.beginSection, {
      attemptId: started.attemptId,
    });
    await owner.mutation(api.assessmentAttempts.saveResponse, {
      attemptId: started.attemptId,
      itemId: fixture.listeningItemId,
      response: { kind: "choice", selectedChoiceKey: "b" },
      expectedClientRevision: 0,
      mutationId: "delete-save-0001",
      flagged: false,
    });
    await expect(
      other.mutation(api.assessmentAttempts.deleteMine, {
        attemptId: started.attemptId,
      }),
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.assessmentAttempts.deleteMine, {
        attemptId: started.attemptId,
      }),
    ).resolves.toEqual({ deleted: true });
    const counts = await t.run(async (ctx) => ({
      attempt: await ctx.db.get("assessmentAttempts", started.attemptId),
      responses: await ctx.db
        .query("assessmentResponses")
        .withIndex("by_attempt_id_and_updated_at", (q) =>
          q.eq("attemptId", started.attemptId),
        )
        .collect(),
      progress: await ctx.db
        .query("assessmentAttemptSections")
        .withIndex("by_attempt_id_and_order", (q) =>
          q.eq("attemptId", started.attemptId),
        )
        .collect(),
    }));
    expect(counts).toEqual({ attempt: null, responses: [], progress: [] });
  });
});

describe("assessment media boundary", () => {
  it("accepts only purpose-matched bounded media and safe immutable keys", () => {
    expect(
      normalizeAssessmentMediaInput({
        purpose: "assessment-audio",
        contentType: "audio/mpeg",
        byteSize: 4_096,
        originalName: "Listening source.mp3",
        alt: "A short listening prompt",
        checksumSha256: "b".repeat(64),
        durationMs: 12_000,
      }),
    ).toMatchObject({ extension: "mp3", durationMs: 12_000 });
    expect(() =>
      normalizeAssessmentMediaInput({
        purpose: "assessment-audio",
        contentType: "image/webp",
        byteSize: 4_096,
        originalName: "Wrong media.webp",
        alt: "Wrong purpose and MIME",
        checksumSha256: "b".repeat(64),
        durationMs: 12_000,
      }),
    ).toThrow();
    expect(() =>
      normalizeAssessmentMediaInput({
        purpose: "assessment-audio",
        contentType: "audio/mpeg",
        byteSize: 25 * 1024 * 1024 + 1,
        originalName: "Too large.mp3",
        alt: "Oversized listening prompt",
        checksumSha256: "b".repeat(64),
        durationMs: 12_000,
      }),
    ).toThrow();
    const privateKey = privateAssessmentMediaKey({
        definitionId: "abc_definition",
        versionId: "abc_version",
        mediaId: "abc_media",
        extension: "mp3",
      });
    expect(privateKey).toMatch(
      /^assessment-drafts\/[a-f0-9]+\/[a-f0-9]+\/[a-f0-9]+\/source\.mp3$/,
    );
    const publicKey = publicAssessmentDerivativeKey({
        versionId: "abc_version",
        checksumSha256: "c".repeat(64),
        extension: "mp3",
      });
    expect(publicKey).toMatch(
      new RegExp(`^assessments/[a-f0-9]+/${"c".repeat(64)}\\.mp3$`),
    );
    const encodedTraversal = privateAssessmentMediaKey({
      definitionId: "../escape",
      versionId: "abc_version",
      mediaId: "abc_media",
      extension: "mp3",
    });
    expect(encodedTraversal).not.toContain("..");
  });

  it("never projects private, wrong-purpose, wrong-version, or unsafe media", async () => {
    const t = createHarness();
    const fixture = await seedPublishedFixture(t);
    const valid = await t.run(async (ctx) =>
      await ctx.db.get("mediaAssets", fixture.audioMediaId),
    );
    const validProjection = publicAssessmentR2UrlForMedia(
      valid,
      fixture.versionId,
      "audio",
    );
    expect(
      validProjection,
      JSON.stringify({ valid, versionId: fixture.versionId }),
    ).not.toBeNull();
    expect(validProjection ?? "").toContain("r2.mukhtada.my.id/assessments/");
    for (const mutation of [
      { access: "assessment-private" as const },
      { purpose: "assessment-image" as const },
      { objectKey: "assessments/../secret.mp3" },
      { objectKey: "assessments/wrong\\secret.mp3" },
      { objectKey: "assessments/wrong/secret.mp3?download=1" },
    ]) {
      const candidate = valid === null ? null : { ...valid, ...mutation };
      expect(
        publicAssessmentR2UrlForMedia(candidate, fixture.versionId, "audio"),
      ).toBeNull();
    }
    if (valid !== null) {
      expect(
        publicAssessmentR2UrlForMedia(
          { ...valid, assessmentVersionId: fixture.definitionId as unknown as Id<"assessmentVersions"> },
          fixture.versionId,
          "audio",
        ),
      ).toBeNull();
    }
  });

  it("keeps reserved draft media private and blocks every invalid stimulus delivery relationship", async () => {
    const t = createHarness();
    const { editor, ownerId } = await bootstrapAdmins(t);
    const created = await editor.mutation(api.adminAssessments.create, {
      slug: "media-contract-check",
      kind: "skill-quiz",
      profile: "ec-itp-level-1-aligned-v1",
      adminTitle: "Media contract check",
      title: "Media Contract Check",
      summary: "A private draft used to verify the assessment media boundary.",
      instructions: "Review every media relationship before this draft can publish.",
      locale: "en",
      timePolicy: "untimed",
      allowResume: true,
      reviewPolicy: "after-submit",
      scorePolicy: "raw-objective",
      defaultTimingMode: "untimed",
      defaultListeningMode: "audio-primary",
      maxAttemptsPerDay: 4,
    });
    const section = await editor.mutation(api.adminAssessments.saveSection, {
      versionId: created.versionId,
      expectedContentRevision: created.contentRevision,
      sectionKey: "listening",
      skill: "listening",
      order: 0,
      title: "Listening Check",
      instructions: "Listen to each original prompt and choose the best answer.",
      audioReplayPolicy: "unlimited",
    });
    if (!section.ok) throw new Error("section save conflicted");
    const validReservationArgs = {
      assessmentVersionId: created.versionId,
      purpose: "assessment-audio" as const,
      contentType: "audio/mpeg" as const,
      byteSize: 4_096,
      originalName: "private-listening-source.mp3",
      alt: "Private listening source under review",
      checksumSha256: "d".repeat(64),
      durationMs: 9_000,
    };
    await expect(
      editor.mutation(api.assessmentMedia.reserveUpload, validReservationArgs),
    ).rejects.toThrow();
    const beforeConfigRows = await t.run(async (ctx) =>
      await ctx.db
        .query("mediaAssets")
        .withIndex(
          "by_assessment_version_id_and_status_and_updated_at",
          (q) =>
            q
              .eq("assessmentVersionId", created.versionId)
              .eq("status", "pending"),
        )
        .collect(),
    );
    expect(beforeConfigRows).toEqual([]);
    vi.stubEnv("R2_ACCOUNT_ID", "a".repeat(32));
    vi.stubEnv(
      "R2_API",
      `https://${"a".repeat(32)}.r2.cloudflarestorage.com`,
    );
    vi.stubEnv("R2_ASSESSMENT_BUCKET_NAME", "assessment-private-test");
    vi.stubEnv("R2_ASSESSMENT_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("R2_ASSESSMENT_SECRET_ACCESS_KEY", "test-secret-key");
    await expect(
      editor.mutation(api.assessmentMedia.reserveUpload, {
        assessmentVersionId: created.versionId,
        purpose: "assessment-audio",
        contentType: "image/webp",
        byteSize: 4_096,
        originalName: "wrong.webp",
        alt: "Wrong purpose and MIME",
        checksumSha256: "d".repeat(64),
        durationMs: 9_000,
      }),
    ).rejects.toThrow();
    const reserved = await editor.mutation(
      api.assessmentMedia.reserveUpload,
      validReservationArgs,
    );
    const privateRow = await t.run(async (ctx) =>
      await ctx.db.get("mediaAssets", reserved.mediaId),
    );
    expect(privateRow).toMatchObject({
      access: "assessment-private",
      status: "pending",
      assessmentVersionId: created.versionId,
    });
    expect(privateRow?.objectKey).toMatch(/^assessment-drafts\//);
    const privatePage = await editor.query(api.adminMedia.listAssessmentPage, {
      assessmentVersionId: created.versionId,
      access: "assessment-private",
      purpose: "assessment-audio",
      status: "pending",
      paginationOpts: { cursor: null, numItems: 24 },
    });
    expect(privatePage.page.map((asset) => asset._id)).toContain(reserved.mediaId);

    await expect(
      editor.mutation(api.adminAssessments.saveStimulus, {
        versionId: created.versionId,
        sectionId: section.sectionId,
        expectedContentRevision: section.contentRevision,
        stimulusKey: "private-audio",
        kind: "audio",
        order: 0,
        title: "Private audio",
        body: null,
        mediaId: reserved.mediaId,
        transcript: "A transcript cannot make a private draft publicly deliverable.",
        alt: "Private audio under review",
        provenanceJson: JSON.stringify({ original: true }),
      }),
    ).rejects.toThrow();

    const invalidMediaIds = await t.run(async (ctx) => {
      const wrongVersionId = await ctx.db.insert("assessmentVersions", {
        definitionId: created.definitionId,
        status: "draft",
        title: "Unrelated media version",
        summary: "A separate internal version used only for relationship validation.",
        instructions: "This version must never provide media to another assessment version.",
        locale: "en",
        timePolicy: "untimed",
        allowResume: true,
        reviewPolicy: "after-submit",
        scorePolicy: "raw-objective",
        defaultTimingMode: "untimed",
        defaultListeningMode: "audio-primary",
        maxAttemptsPerDay: 4,
        contentRevision: 1,
        createdBy: ownerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const base = {
        byteSize: 4_096,
        status: "ready" as const,
        originalName: "invalid-delivery.mp3",
        alt: "Invalid delivery relationship",
        access: "public" as const,
        durationMs: 9_000,
        checksumSha256: "e".repeat(64),
        uploadedBy: ownerId,
        verifiedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return await Promise.all([
        ctx.db.insert("mediaAssets", {
          ...base,
          objectKey: publicAssessmentDerivativeKey({
            versionId: created.versionId,
            checksumSha256: "e".repeat(64),
            extension: "webp",
          }),
          purpose: "assessment-audio",
          contentType: "image/webp",
          assessmentVersionId: created.versionId,
        }),
        ctx.db.insert("mediaAssets", {
          ...base,
          objectKey: "assessments/unsafe/../source.mp3",
          purpose: "assessment-audio",
          contentType: "audio/mpeg",
          assessmentVersionId: created.versionId,
        }),
        ctx.db.insert("mediaAssets", {
          ...base,
          objectKey: publicAssessmentDerivativeKey({
            versionId: created.versionId,
            checksumSha256: "f".repeat(64),
            extension: "mp3",
          }),
          purpose: "assessment-audio",
          contentType: "audio/mpeg",
          assessmentVersionId: wrongVersionId,
        }),
      ]);
    });
    for (const [index, mediaId] of invalidMediaIds.entries()) {
      await expect(
        editor.mutation(api.adminAssessments.saveStimulus, {
          versionId: created.versionId,
          sectionId: section.sectionId,
          expectedContentRevision: section.contentRevision,
          stimulusKey: `invalid-audio-${index}`,
          kind: "audio",
          order: index,
          title: "Invalid audio delivery",
          body: null,
          mediaId,
          transcript: "This relationship must be rejected before it reaches a learner.",
          alt: "Invalid audio delivery",
          provenanceJson: JSON.stringify({ original: true }),
        }),
      ).rejects.toThrow();
    }

    await t.run(async (ctx) => {
      await ctx.db.insert("assessmentStimuli", {
        versionId: created.versionId,
        sectionId: section.sectionId,
        stimulusKey: "missing-image-media",
        kind: "image",
        order: 0,
        alt: "Diagram with no reviewed derivative",
        provenanceJson: JSON.stringify({ fixture: true }),
        authoredBy: ownerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const validation = await editor.mutation(api.adminAssessments.validateDraft, {
      versionId: created.versionId,
      expectedContentRevision: section.contentRevision,
    });
    expect(validation).toMatchObject({ ok: true, status: "failed" });
    const check = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentVersionChecks")
        .withIndex("by_version_id_and_content_revision", (q) =>
          q
            .eq("versionId", created.versionId)
            .eq("contentRevision", section.contentRevision),
        )
        .unique(),
    );
    expect(check?.reportJson).toContain("image-delivery:missing-image-media");
  });

  it("reports the private-bucket launch gate without falling back to the public bucket", async () => {
    const t = createHarness();
    const { editor } = await bootstrapAdmins(t);
    vi.stubEnv("R2_ASSESSMENT_BUCKET_NAME", "");
    vi.stubEnv("R2_ASSESSMENT_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_ASSESSMENT_SECRET_ACCESS_KEY", "");
    await expect(
      t.action(api.assessmentMediaNode.getConfigStatus, {}),
    ).rejects.toThrow();
    const status = await editor.action(
      api.assessmentMediaNode.getConfigStatus,
      {},
    );
    expect(status.privateDraftReady).toBe(false);
    expect(status.confidentialUploadsBlocked).toBe(true);
  });
});

describe("assessment administration and immutable publication", () => {
  it("keeps the fixed practice-format catalogue closed outside internal maintenance", async () => {
    vi.stubEnv("PRACTICE_FORMAT_CREATION_MODE", "");
    const t = createHarness();
    const { editor } = await bootstrapAdmins(t);

    await expect(
      editor.mutation(api.adminAssessments.create, {
        slug: "unplanned-extra-format",
        kind: "skill-quiz",
        profile: "ec-ibt-style-2026-v1",
        adminTitle: "Unplanned extra format",
        title: "Unplanned Extra Format",
        summary: "This record must not extend the fixed catalogue from the admin UI.",
        instructions: "Use one of the installed practice formats instead of adding another.",
        locale: "en",
        timePolicy: "untimed",
        allowResume: true,
        reviewPolicy: "after-submit",
        scorePolicy: "practice-estimate-v1",
        defaultTimingMode: "standard",
        defaultListeningMode: "transcript-supported",
        maxAttemptsPerDay: 3,
      }),
    ).rejects.toThrow(/PRACTICE_FORMAT_CATALOG_FIXED/);
  });

  it("binds each supported content profile to its matching score policy", async () => {
    const t = createHarness();
    const { editor } = await bootstrapAdmins(t);
    const ibtInput = {
      kind: "skill-quiz" as const,
      profile: "ec-ibt-style-2026-v1" as const,
      adminTitle: "Reading estimate practice",
      title: "Reading Estimate Practice",
      summary:
        "A short original fixed-form reading practice for English Club learners.",
      instructions:
        "Read each original passage and answer every question before submitting.",
      locale: "en",
      timePolicy: "untimed" as const,
      allowResume: true,
      reviewPolicy: "after-submit" as const,
      defaultTimingMode: "standard" as const,
      defaultListeningMode: "transcript-supported" as const,
      maxAttemptsPerDay: 3,
    };

    await expect(
      editor.mutation(api.adminAssessments.create, {
        ...ibtInput,
        slug: "reading-estimate-practice",
        scorePolicy: "practice-estimate-v1",
      }),
    ).resolves.toMatchObject({ contentRevision: 1 });
    await expect(
      editor.mutation(api.adminAssessments.create, {
        ...ibtInput,
        slug: "reading-estimate-with-raw-policy",
        scorePolicy: "raw-objective",
      }),
    ).rejects.toThrow();
    await expect(
      editor.mutation(api.adminAssessments.create, {
        ...ibtInput,
        slug: "legacy-profile-with-estimate-policy",
        profile: "ec-itp-level-1-aligned-v1",
        scorePolicy: "practice-estimate-v1",
      }),
    ).rejects.toThrow();
  });

  it("enforces roles, server readiness, publication, and next-draft cloning", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));
    const t = createHarness();
    const { editor, publisher, ownerId } = await bootstrapAdmins(t);
    await expect(
      publisher.mutation(api.adminAssessments.create, {
        slug: "weekly-objective-check",
        kind: "skill-quiz",
        profile: "ec-itp-level-1-aligned-v1",
        adminTitle: "Weekly objective check",
        title: "Weekly Objective Check",
        summary: "A short original English Club practice set for weekly review.",
        instructions: "Choose the best answer for each original practice question.",
        locale: "en",
        timePolicy: "untimed",
        allowResume: true,
        reviewPolicy: "after-submit",
        scorePolicy: "raw-objective",
        defaultTimingMode: "untimed",
        defaultListeningMode: "audio-primary",
        maxAttemptsPerDay: 4,
      }),
    ).rejects.toThrow();
    const created = await editor.mutation(api.adminAssessments.create, {
      slug: "weekly-objective-check",
      kind: "skill-quiz",
      profile: "ec-itp-level-1-aligned-v1",
      adminTitle: "Weekly objective check",
      title: "Weekly Objective Check",
      summary: "A short original English Club practice set for weekly review.",
      instructions: "Choose the best answer for each original practice question.",
      locale: "en",
      timePolicy: "untimed",
      allowResume: true,
      reviewPolicy: "after-submit",
      scorePolicy: "raw-objective",
      defaultTimingMode: "untimed",
      defaultListeningMode: "audio-primary",
      maxAttemptsPerDay: 4,
    });
    const section = await editor.mutation(api.adminAssessments.saveSection, {
      versionId: created.versionId,
      expectedContentRevision: created.contentRevision,
      sectionKey: "reading",
      skill: "reading",
      order: 0,
      title: "Reading Check",
      instructions: "Read each original prompt and choose the strongest answer.",
    });
    if (!section.ok) throw new Error("section save conflicted");
    let revision = section.contentRevision;
    const itemIds: Id<"assessmentItems">[] = [];
    for (let order = 0; order < 3; order += 1) {
      const saved = await editor.mutation(api.adminAssessmentItems.saveSingleChoice, {
        versionId: created.versionId,
        sectionId: section.sectionId,
        stimulusId: null,
        expectedContentRevision: revision,
        itemKey: `reading-${order + 1}`,
        order,
        prompt: `Which answer best completes original practice item ${order + 1}?`,
        required: true,
        explanation: "The first option follows the sentence meaning and grammar.",
        provenanceJson: JSON.stringify({ original: true, order }),
        options: [
          { key: "a", label: "The well-formed answer" },
          { key: "b", label: "The unrelated answer" },
        ],
        correctChoiceKey: "a",
      });
      if (!saved.ok) throw new Error("item save conflicted");
      revision = saved.contentRevision;
      itemIds.push(saved.itemId);
    }
    await expect(
      publisher.mutation(api.adminAssessmentItems.deleteItem, {
        itemId: itemIds[0],
        expectedContentRevision: revision,
      }),
    ).rejects.toThrow();
    await expect(
      editor.mutation(api.adminAssessments.recordApproval, {
        versionId: created.versionId,
        expectedContentRevision: revision,
        reviewType: "academic",
        decision: "approved",
        note: "Academic review is complete.",
      }),
    ).rejects.toThrow();
    const checked = await editor.mutation(api.adminAssessments.validateDraft, {
      versionId: created.versionId,
      expectedContentRevision: revision,
    });
    expect(checked).toMatchObject({ ok: true, status: "passed", blockingCount: 0 });
    for (const reviewType of [
      "academic",
      "rights",
      "accessibility",
      "bias",
    ] as const) {
      await publisher.mutation(api.adminAssessments.recordApproval, {
        versionId: created.versionId,
        expectedContentRevision: revision,
        reviewType,
        decision: "approved",
        note: `${reviewType} review is complete and approved.`,
      });
    }
    const workspace = await publisher.query(api.adminAssessments.getWorkspace, {
      definitionId: created.definitionId,
    });
    expect(workspace?.publishReadiness).toEqual({
      ready: true,
      contentRevision: revision,
      blockers: [],
    });
    await publisher.mutation(api.adminAssessments.publish, {
      versionId: created.versionId,
      expectedContentRevision: revision,
    });
    const publicBefore = await t.query(api.assessments.getPublishedBySlug, {
      slug: "weekly-objective-check",
    });
    expect(publicBefore?.versionId).toEqual(created.versionId);

    const clone = await editor.mutation(
      api.adminAssessments.createDraftFromPublished,
      { definitionId: created.definitionId },
    );
    await t.mutation(internal.assessmentClone.markFailed, {
      draftVersionId: clone.versionId,
      actorId: ownerId,
    });
    await expect(
      editor.mutation(api.adminAssessments.resumeDraftClone, {
        versionId: clone.versionId,
      }),
    ).resolves.toBeNull();
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const clonedWorkspace = await editor.query(api.adminAssessments.getWorkspace, {
      definitionId: created.definitionId,
    });
    expect(clonedWorkspace?.draft).toMatchObject({
      versionId: clone.versionId,
      status: "draft",
      contentRevision: 1,
    });
    expect(clonedWorkspace?.sections[0]).toMatchObject({ itemCount: 3 });
    const cloneItems = await editor.query(api.adminAssessmentItems.listPage, {
      sectionId: clonedWorkspace!.sections[0].sectionId,
      paginationOpts: { cursor: null, numItems: 25 },
    });
    expect(cloneItems.page).toHaveLength(3);
    const edited = await editor.mutation(api.adminAssessmentItems.saveSingleChoice, {
      itemId: cloneItems.page[0].item.id,
      versionId: clone.versionId,
      sectionId: clonedWorkspace!.sections[0].sectionId,
      stimulusId: null,
      expectedContentRevision: 1,
      itemKey: cloneItems.page[0].itemKey,
      order: 0,
      prompt: "Which revised answer best completes this original practice item?",
      required: true,
      explanation: "The revised first option follows the intended meaning.",
      provenanceJson: JSON.stringify({ original: true, revised: true }),
      options: [
        { key: "a", label: "The revised well-formed answer" },
        { key: "b", label: "The unrelated answer" },
      ],
      correctChoiceKey: "a",
    });
    expect(edited).toMatchObject({ ok: true, contentRevision: 2 });
    const publicAfter = await t.query(api.assessments.getPublishedBySlug, {
      slug: "weekly-objective-check",
    });
    expect(publicAfter?.versionId).toEqual(created.versionId);
  });

  it("supports hook-shaped pagination while enforcing server hard caps", async () => {
    const t = createHarness();
    const { editor } = await bootstrapAdmins(t);
    await expect(
      editor.query(api.adminAssessments.listPage, {
        visibility: "draft",
        paginationOpts: { cursor: null, numItems: 20 },
      }),
    ).resolves.toMatchObject({ page: [] });
    await expect(
      editor.query(api.adminAssessments.listPage, {
        visibility: "draft",
        paginationOpts: {
          cursor: null,
          numItems: 20,
          maximumRowsRead: 21,
        },
      }),
    ).rejects.toThrow();
  });

  it("reorders and safely deletes draft sections, stimuli, items, and private keys", async () => {
    const t = createHarness();
    const { editor } = await bootstrapAdmins(t);
    const created = await editor.mutation(api.adminAssessments.create, {
      slug: "draft-structure-maintenance",
      kind: "skill-quiz",
      profile: "ec-itp-level-1-aligned-v1",
      adminTitle: "Draft structure maintenance",
      title: "Draft Structure Maintenance",
      summary: "An internal draft for checking safe authoring corrections.",
      instructions: "Editors can reorder and remove mistaken draft content safely.",
      locale: "en",
      timePolicy: "untimed",
      allowResume: true,
      reviewPolicy: "after-submit",
      scorePolicy: "raw-objective",
      defaultTimingMode: "untimed",
      defaultListeningMode: "audio-primary",
      maxAttemptsPerDay: 4,
    });
    const reading = await editor.mutation(api.adminAssessments.saveSection, {
      versionId: created.versionId,
      expectedContentRevision: 1,
      sectionKey: "reading",
      skill: "reading",
      order: 0,
      title: "Reading Draft",
      instructions: "Read the original passage before choosing an answer.",
    });
    if (!reading.ok) throw new Error("reading section save conflicted");
    const structure = await editor.mutation(api.adminAssessments.saveSection, {
      versionId: created.versionId,
      expectedContentRevision: reading.contentRevision,
      sectionKey: "structure",
      skill: "structure",
      order: 1,
      title: "Structure Draft",
      instructions: "Choose the option that completes each sentence correctly.",
    });
    if (!structure.ok) throw new Error("structure section save conflicted");
    const movedSection = await editor.mutation(api.adminAssessments.moveSection, {
      sectionId: structure.sectionId,
      targetOrder: 0,
      expectedContentRevision: structure.contentRevision,
    });
    if (!movedSection.ok) throw new Error("section move conflicted");
    let revision = movedSection.contentRevision;
    const stimulusA = await editor.mutation(api.adminAssessments.saveStimulus, {
      versionId: created.versionId,
      sectionId: reading.sectionId,
      expectedContentRevision: revision,
      stimulusKey: "reading-passage-a",
      kind: "reading",
      order: 0,
      title: "Weekly practice notice",
      body: "The English Club opens a weekly room for careful, low-pressure practice.",
      mediaId: null,
      transcript: null,
      alt: null,
      provenanceJson: JSON.stringify({ original: true }),
    });
    if (!stimulusA.ok) throw new Error("stimulus save conflicted");
    const stimulusB = await editor.mutation(api.adminAssessments.saveStimulus, {
      versionId: created.versionId,
      sectionId: reading.sectionId,
      expectedContentRevision: stimulusA.contentRevision,
      stimulusKey: "reading-passage-b",
      kind: "reading",
      order: 1,
      title: "Conversation workshop notice",
      body: "The conversation workshop welcomes members who want another try.",
      mediaId: null,
      transcript: null,
      alt: null,
      provenanceJson: JSON.stringify({ original: true }),
    });
    if (!stimulusB.ok) throw new Error("stimulus save conflicted");
    const movedStimulus = await editor.mutation(
      api.adminAssessments.moveStimulus,
      {
        stimulusId: stimulusB.stimulusId,
        targetOrder: 0,
        expectedContentRevision: stimulusB.contentRevision,
      },
    );
    if (!movedStimulus.ok) throw new Error("stimulus move conflicted");
    revision = movedStimulus.contentRevision;
    const itemA = await editor.mutation(api.adminAssessmentItems.saveSingleChoice, {
      versionId: created.versionId,
      sectionId: reading.sectionId,
      stimulusId: stimulusA.stimulusId,
      expectedContentRevision: revision,
      itemKey: "reading-a-1",
      order: 0,
      prompt: "What does the weekly room offer?",
      required: true,
      explanation: "It offers careful, low-pressure practice.",
      provenanceJson: JSON.stringify({ original: true }),
      options: [
        { key: "a", label: "Low-pressure practice" },
        { key: "b", label: "A formal admission test" },
      ],
      correctChoiceKey: "a",
    });
    if (!itemA.ok) throw new Error("item save conflicted");
    const itemB = await editor.mutation(api.adminAssessmentItems.saveSingleChoice, {
      versionId: created.versionId,
      sectionId: reading.sectionId,
      stimulusId: null,
      expectedContentRevision: itemA.contentRevision,
      itemKey: "reading-a-2",
      order: 1,
      prompt: "Who can join the practice room?",
      required: true,
      explanation: "The English Club practice room is for its learners and members.",
      provenanceJson: JSON.stringify({ original: true }),
      options: [
        { key: "a", label: "Club learners and members" },
        { key: "b", label: "Only admission officers" },
      ],
      correctChoiceKey: "a",
    });
    if (!itemB.ok) throw new Error("item save conflicted");
    const movedItem = await editor.mutation(api.adminAssessmentItems.moveItem, {
      itemId: itemB.itemId,
      targetOrder: 0,
      expectedContentRevision: itemB.contentRevision,
    });
    if (!movedItem.ok) throw new Error("item move conflicted");
    revision = movedItem.contentRevision;
    const orderedItems = await editor.query(api.adminAssessmentItems.listPage, {
      sectionId: reading.sectionId,
      paginationOpts: { cursor: null, numItems: 25 },
    });
    expect(orderedItems.page.map((row) => row.itemKey)).toEqual([
      "reading-a-2",
      "reading-a-1",
    ]);
    await expect(
      editor.mutation(api.adminAssessments.deleteStimulus, {
        stimulusId: stimulusA.stimulusId,
        expectedContentRevision: revision,
      }),
    ).rejects.toThrow();
    for (const itemId of [itemB.itemId, itemA.itemId]) {
      const deleted = await editor.mutation(api.adminAssessmentItems.deleteItem, {
        itemId,
        expectedContentRevision: revision,
      });
      if (!deleted.ok) throw new Error("item delete conflicted");
      revision = deleted.contentRevision;
    }
    for (const stimulusId of [stimulusA.stimulusId, stimulusB.stimulusId]) {
      const deleted = await editor.mutation(api.adminAssessments.deleteStimulus, {
        stimulusId,
        expectedContentRevision: revision,
      });
      if (!deleted.ok) throw new Error("stimulus delete conflicted");
      revision = deleted.contentRevision;
    }
    const deletedSection = await editor.mutation(
      api.adminAssessments.deleteSection,
      {
        sectionId: reading.sectionId,
        expectedContentRevision: revision,
      },
    );
    if (!deletedSection.ok) throw new Error("section delete conflicted");
    const workspace = await editor.query(api.adminAssessments.getWorkspace, {
      definitionId: created.definitionId,
    });
    expect(workspace?.sections).toEqual([
      expect.objectContaining({
        sectionId: structure.sectionId,
        sectionKey: "structure",
        order: 0,
      }),
    ]);
  });

  it("returns every published Practice CMS field beyond the old 120-row ceiling", async () => {
    const t = createHarness();
    const { ownerId, editor } = await bootstrapAdmins(t);
    await t.run(async (ctx) => {
      for (let index = 0; index < 142; index += 1) {
        const contentKey = `practice-field-${String(index).padStart(3, "0")}`;
        const entryId = await ctx.db.insert("siteContentEntries", {
          pageKey: "practice",
          locale: "en",
          contentKey,
          label: `Practice field ${index + 1}`,
          kind: "plain-text",
          draftValue: `Published practice copy ${index + 1}`,
          draftRevision: 1,
          createdBy: ownerId,
          updatedBy: ownerId,
          createdAt: index,
          updatedAt: index,
        });
        const versionId = await ctx.db.insert("siteContentVersions", {
          entryId,
          revision: 1,
          value: `Published practice copy ${index + 1}`,
          publishedBy: ownerId,
          publishedAt: index,
        });
        await ctx.db.patch("siteContentEntries", entryId, {
          publishedVersionId: versionId,
        });
      }
    });
    await expect(
      t.query(api.siteContent.getPublishedPage, {
        pageKey: "practice",
        locale: "en",
      }),
    ).resolves.toHaveLength(142);
    await expect(
      editor.query(api.adminContent.getPageWorkspace, {
        pageKey: "practice",
        locale: "en",
      }),
    ).resolves.toHaveLength(142);
  });

  it("refuses a 201st CMS key instead of silently starving known page fields", async () => {
    const t = createHarness();
    const { ownerId, editor } = await bootstrapAdmins(t);
    await t.run(async (ctx) => {
      for (let index = 0; index < 200; index += 1) {
        await ctx.db.insert("siteContentEntries", {
          pageKey: "practice",
          locale: "en",
          contentKey: `bounded-field-${String(index).padStart(3, "0")}`,
          label: `Bounded field ${index + 1}`,
          kind: "plain-text",
          draftValue: `Bounded copy ${index + 1}`,
          draftRevision: 1,
          createdBy: ownerId,
          updatedBy: ownerId,
          createdAt: index,
          updatedAt: index,
        });
      }
    });
    await expect(
      editor.query(api.adminContent.getPageWorkspace, {
        pageKey: "practice",
        locale: "en",
      }),
    ).resolves.toHaveLength(200);
    await expect(
      editor.mutation(api.adminContent.saveDraft, {
        pageKey: "practice",
        locale: "en",
        contentKey: "bounded-field-overflow",
        label: "Overflow field",
        kind: "plain-text",
        value: "This extra key must be refused.",
        expectedRevision: 0,
      }),
    ).rejects.toThrow();
    await t.run(async (ctx) => {
      await ctx.db.insert("siteContentEntries", {
        pageKey: "practice",
        locale: "en",
        contentKey: "direct-corruption-field",
        label: "Direct corruption field",
        kind: "plain-text",
        draftValue: "This direct insert simulates an over-limit legacy page.",
        draftRevision: 1,
        createdBy: ownerId,
        updatedBy: ownerId,
        createdAt: 201,
        updatedAt: 201,
      });
    });
    await expect(
      editor.query(api.adminContent.getPageWorkspace, {
        pageKey: "practice",
        locale: "en",
      }),
    ).rejects.toThrow();
    await expect(
      t.query(api.siteContent.getPublishedPage, {
        pageKey: "practice",
        locale: "en",
      }),
    ).rejects.toThrow();
  });
});
