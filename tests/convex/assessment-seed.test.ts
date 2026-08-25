import { convexTest } from "convex-test";
import type { FunctionReturnType } from "convex/server";
import { describe, expect, it } from "vitest";

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
      randomSections: 4,
    });
    await expect(
      t.mutation(internal.assessmentSeed.seedQuestionBank, { confirm }),
    ).resolves.toEqual({
      inserted: 0,
      existing: 145,
      eligible: 120,
      randomSections: 4,
    });
    await expect(
      t.query(internal.assessmentSeed.verifyQuestionBank, { confirm }),
    ).resolves.toMatchObject({
      total: 145,
      ready: 145,
      eligible: 120,
      randomSections: 4,
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
          entry.difficulty === "advanced",
      ),
    ).toBe(true);
    const edited = page.page[0];
    await expect(
      owner.mutation(api.adminAssessmentQuestionBank.updateMetadata, {
        bankQuestionId: edited.bankQuestionId,
        expectedUpdatedAt: edited.updatedAt,
        status: "paused",
        taskFamily: edited.taskFamily,
        difficulty: edited.difficulty,
        fullPracticeEligible: false,
        tags: ["reading", "review-later"],
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
});
