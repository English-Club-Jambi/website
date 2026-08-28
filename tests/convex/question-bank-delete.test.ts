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

const ownerToken = "https://example.test|question-delete-owner";
const publisherToken = "https://example.test|question-delete-publisher";
const editorToken = "https://example.test|question-delete-editor";

function harness() {
  return convexTest(schema, modules);
}

async function seedAdmins(t: ReturnType<typeof harness>) {
  const ownerId = await t.mutation(internal.adminUsers.bootstrapOwner, {
    tokenIdentifier: ownerToken,
    displayName: "Question Delete Owner",
    email: "question-delete-owner@example.test",
  });
  const owner = t.withIdentity({ tokenIdentifier: ownerToken });
  await owner.mutation(api.adminUsers.setAccess, {
    tokenIdentifier: publisherToken,
    displayName: "Question Delete Publisher",
    email: "question-delete-publisher@example.test",
    role: "publisher",
    status: "active",
  });
  await owner.mutation(api.adminUsers.setAccess, {
    tokenIdentifier: editorToken,
    displayName: "Question Delete Editor",
    email: "question-delete-editor@example.test",
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

async function seedQuestion(
  t: ReturnType<typeof harness>,
  ownerId: Id<"adminUsers">,
  suffix: string,
) {
  const now = Date.now();
  return await t.run(async (ctx) => {
    const definitionId = await ctx.db.insert("assessmentDefinitions", {
      slug: `delete-question-${suffix}`,
      kind: "skill-quiz",
      profile: "ec-itp-level-1-aligned-v1",
      adminTitle: `Delete question fixture ${suffix}`,
      nextVersion: 2,
      visibility: "draft",
      createdBy: ownerId,
      updatedBy: ownerId,
      createdAt: now,
      updatedAt: now,
    });
    const versionId = await ctx.db.insert("assessmentVersions", {
      definitionId,
      version: 1,
      status: "draft",
      title: `Delete question fixture ${suffix}`,
      summary: "A protected deletion fixture.",
      instructions: "Choose the best answer.",
      locale: "en",
      timePolicy: "untimed",
      allowResume: true,
      reviewPolicy: "after-submit",
      scorePolicy: "raw-objective",
      defaultTimingMode: "untimed",
      defaultListeningMode: "audio-primary",
      maxAttemptsPerDay: 20,
      contentRevision: 1,
      createdBy: ownerId,
      createdAt: now,
      updatedAt: now,
    });
    const sectionId = await ctx.db.insert("assessmentSections", {
      versionId,
      sectionKey: "reading",
      skill: "reading",
      order: 0,
      title: "Reading",
      instructions: "Read the prompt.",
      itemCount: 1,
      deliveryMode: "random-bank",
      bankProfile: "ec-itp-level-1-aligned-v1",
      bankSelectionContract: 1,
    });
    const itemId = await ctx.db.insert("assessmentItems", {
      versionId,
      sectionId,
      itemKey: `question-${suffix}`,
      order: 0,
      type: "single-choice",
      prompt: `Which answer belongs to fixture ${suffix}?`,
      required: true,
      options: [
        { key: "a", label: "The first answer" },
        { key: "b", label: "The second answer" },
      ],
      explanation: "The first answer is identified by the source.",
      provenanceJson: JSON.stringify({ source: "test" }),
      authoredBy: ownerId,
      createdAt: now,
      updatedAt: now,
    });
    const answerKeyId = await ctx.db.insert("assessmentAnswerKeys", {
      versionId,
      itemId,
      kind: "choice",
      scoringMode: "exact",
      points: 1,
      correctChoiceKeys: ["a"],
    });
    const mediaId = await ctx.db.insert("mediaAssets", {
      objectKey: `uploads/assessment-image/delete-${suffix}.webp`,
      purpose: "assessment-image",
      contentType: "image/webp",
      byteSize: 2_048,
      status: "ready",
      originalName: `delete-${suffix}.webp`,
      alt: `Fixture illustration ${suffix}`,
      width: 1_200,
      height: 800,
      access: "public",
      uploadedBy: ownerId,
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const bankQuestionId = await ctx.db.insert("assessmentQuestionBank", {
      bankKey: `delete/${suffix}`,
      sourceDefinitionId: definitionId,
      sourceVersionId: versionId,
      sourceSectionId: sectionId,
      sourceItemId: itemId,
      skill: "reading",
      taskFamily: "read-daily-life",
      difficulty: "developing",
      status: "paused",
      profile: "ec-itp-level-1-aligned-v1",
      fullPracticeEligible: false,
      origin: "bank-authored",
      illustrationMediaId: mediaId,
      contentFingerprint: `delete-fingerprint-${suffix}`,
      promptSearch: `which answer belongs to fixture ${suffix}`,
      tags: ["reading", "delete-fixture"],
      createdBy: ownerId,
      updatedBy: ownerId,
      createdAt: now,
      updatedAt: now,
    });
    return {
      definitionId,
      versionId,
      sectionId,
      itemId,
      answerKeyId,
      mediaId,
      bankQuestionId,
      updatedAt: now,
    };
  });
}

describe("Question Bank permanent deletion", () => {
  it("lets only an owner delete an unused row and retains immutable source records", async () => {
    const t = harness();
    const { ownerId, owner } = await seedAdmins(t);
    const fixture = await seedQuestion(t, ownerId, "unused");

    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.deleteQuestion, {
        bankQuestionId: fixture.bankQuestionId,
        expectedUpdatedAt: fixture.updatedAt,
      }),
    ).resolves.toEqual({
      ok: true,
      deletedBankQuestionId: fixture.bankQuestionId,
    });

    const retained = await t.run(async (ctx) => ({
      bank: await ctx.db.get("assessmentQuestionBank", fixture.bankQuestionId),
      definition: await ctx.db.get(
        "assessmentDefinitions",
        fixture.definitionId,
      ),
      version: await ctx.db.get("assessmentVersions", fixture.versionId),
      section: await ctx.db.get("assessmentSections", fixture.sectionId),
      item: await ctx.db.get("assessmentItems", fixture.itemId),
      answerKey: await ctx.db.get("assessmentAnswerKeys", fixture.answerKeyId),
      media: await ctx.db.get("mediaAssets", fixture.mediaId),
      deleteAudits: (
        await ctx.db
          .query("cmsAuditEvents")
          .withIndex("by_area_and_created_at", (q) =>
            q.eq("area", "assessment"),
          )
          .collect()
      ).filter((event) => event.action === "delete"),
    }));
    expect(retained.bank).toBeNull();
    expect(retained.definition?._id).toBe(fixture.definitionId);
    expect(retained.version?._id).toBe(fixture.versionId);
    expect(retained.section?._id).toBe(fixture.sectionId);
    expect(retained.item?._id).toBe(fixture.itemId);
    expect(retained.answerKey?._id).toBe(fixture.answerKeyId);
    expect(retained.media?._id).toBe(fixture.mediaId);
    expect(retained.deleteAudits).toEqual([
      expect.objectContaining({
        action: "delete",
        actorId: ownerId,
        resourceId: fixture.bankQuestionId,
        resourceType: "question-bank-entry",
      }),
    ]);
  });

  it("rejects unauthenticated, editor, and publisher deletion attempts", async () => {
    const t = harness();
    const { ownerId, publisher, editor } = await seedAdmins(t);
    const fixture = await seedQuestion(t, ownerId, "authorization");
    const args = {
      bankQuestionId: fixture.bankQuestionId,
      expectedUpdatedAt: fixture.updatedAt,
    };

    await expect(
      t.mutation(api.adminAssessmentQuestionBank.deleteQuestion, args),
    ).rejects.toThrow();
    await expect(
      editor.mutation(api.adminAssessmentQuestionBank.deleteQuestion, args),
    ).rejects.toThrow();
    await expect(
      publisher.mutation(api.adminAssessmentQuestionBank.deleteQuestion, args),
    ).rejects.toThrow();
    await expect(
      t.run(
        async (ctx) =>
          await ctx.db.get("assessmentQuestionBank", fixture.bankQuestionId),
      ),
    ).resolves.not.toBeNull();
  });

  it("returns a conflict without deleting a row changed after the dialog opened", async () => {
    const t = harness();
    const { ownerId, owner } = await seedAdmins(t);
    const fixture = await seedQuestion(t, ownerId, "conflict");
    const currentUpdatedAt = fixture.updatedAt + 1;
    await t.run(
      async (ctx) =>
        await ctx.db.patch("assessmentQuestionBank", fixture.bankQuestionId, {
          updatedAt: currentUpdatedAt,
        }),
    );

    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.deleteQuestion, {
        bankQuestionId: fixture.bankQuestionId,
        expectedUpdatedAt: fixture.updatedAt,
      }),
    ).resolves.toEqual({
      ok: false,
      code: "conflict",
      currentUpdatedAt,
    });
    await expect(
      t.run(
        async (ctx) =>
          await ctx.db.get("assessmentQuestionBank", fixture.bankQuestionId),
      ),
    ).resolves.not.toBeNull();
  });

  it("blocks dependency, format, flag, and attempt history references", async () => {
    const t = harness();
    const { ownerId, owner } = await seedAdmins(t);
    const dependency = await seedQuestion(t, ownerId, "dependency");
    const parent = await seedQuestion(t, ownerId, "parent");
    const child = await seedQuestion(t, ownerId, "child");
    const versionRule = await seedQuestion(t, ownerId, "version-rule");
    const flagHistory = await seedQuestion(t, ownerId, "flag-history");
    const attemptHistory = await seedQuestion(t, ownerId, "attempt-history");
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.patch("assessmentQuestionBank", dependency.bankQuestionId, {
        dependencyGroupKey: "fixture-group",
        dependencyRole: "anchor",
      });
      await ctx.db.patch("assessmentQuestionBank", child.bankQuestionId, {
        parentBankQuestionId: parent.bankQuestionId,
      });
      await ctx.db.insert("assessmentVersionQuestionRules", {
        versionId: versionRule.versionId,
        bankQuestionId: versionRule.bankQuestionId,
        allowed: true,
        updatedBy: ownerId,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("assessmentQuestionFlagSignals", {
        definitionId: flagHistory.definitionId,
        latestVersionId: flagHistory.versionId,
        bankQuestionId: flagHistory.bankQuestionId,
        activeFlagCount: 0,
        totalFlagEvents: 1,
        lastFlaggedAt: now,
        reviewStatus: "reviewed",
        reviewedBy: ownerId,
        reviewedAt: now,
      });
      const attemptId = await ctx.db.insert("assessmentAttempts", {
        versionId: attemptHistory.versionId,
        definitionId: attemptHistory.definitionId,
        ownerTokenIdentifier: "fixture-learner",
        ownerKind: "anonymous",
        startRequestId: "delete-attempt-history",
        timingMode: "untimed",
        timeMultiplier: 1,
        listeningMode: "audio-primary",
        status: "in-progress",
        revision: 1,
        startedAt: now,
        lastActivityAt: now,
        currentSectionOrder: 0,
        currentItemOrder: 0,
        resultRevision: 0,
        startDayUtc: "2026-08-28",
      });
      await ctx.db.insert("assessmentAttemptItems", {
        attemptId,
        sectionId: attemptHistory.sectionId,
        bankQuestionId: attemptHistory.bankQuestionId,
        itemId: attemptHistory.itemId,
        order: 0,
        selectedAt: now,
        selectionContract: 1,
      });
    });

    for (const [fixture, reason] of [
      [dependency, "dependency_group"],
      [parent, "dependent_question"],
      [versionRule, "version_rule"],
      [flagHistory, "flag_history"],
      [attemptHistory, "attempt_history"],
    ] as const) {
      await expect(
        owner.mutation(api.adminAssessmentQuestionBank.deleteQuestion, {
          bankQuestionId: fixture.bankQuestionId,
          expectedUpdatedAt: fixture.updatedAt,
        }),
      ).resolves.toEqual({ ok: false, code: "blocked", reason });
      await expect(
        t.run(
          async (ctx) =>
            await ctx.db.get("assessmentQuestionBank", fixture.bankQuestionId),
        ),
      ).resolves.not.toBeNull();
    }
  });
});
