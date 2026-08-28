import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { publicAssessmentDerivativeKey } from "../../convex/lib/assessmentMedia";
import { listEligibleBankQuestionsForSection } from "../../convex/lib/assessmentQuestionBank";
import schema from "../../convex/schema";

const rawModules = import.meta.glob("../../convex/**/*.ts");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, loader]) => [
    path.replace("../../convex", "."),
    loader,
  ]),
);

const confirm = "seed-ec-listening-dependency-groups-v1" as const;

function harness() {
  return convexTest(schema, modules);
}

async function seedOwner(t: ReturnType<typeof harness>) {
  return await t.mutation(internal.adminUsers.bootstrapOwner, {
    tokenIdentifier: "https://example.test|listening-set-owner",
    displayName: "Listening Set Publisher",
    email: "listening-set@example.test",
  });
}

async function attachPreparedAudio(
  t: ReturnType<typeof harness>,
  prepared: Awaited<
    ReturnType<
      typeof t.mutation<
        typeof internal.adminAssessmentQuestionBank.prepareListeningDependencyGroups
      >
    >
  >,
) {
  const assets = prepared.audio.map((entry, index) => {
    const checksumSha256 = (index + 41).toString(16).padStart(64, "0");
    return {
      groupKey: entry.groupKey,
      versionId: entry.versionId,
      stimulusId: entry.stimulusId,
      objectKey: publicAssessmentDerivativeKey({
        versionId: entry.versionId,
        checksumSha256,
        extension: "mp3",
      }),
      checksumSha256,
      byteSize: 90_000 + index,
      durationMs: 120_000 + index,
    };
  });
  return await t.mutation(
    internal.adminAssessmentQuestionBank.attachListeningDependencyAudio,
    { confirm, assets },
  );
}

async function createRandomListeningPractice(
  t: ReturnType<typeof harness>,
  ownerId: Id<"adminUsers">,
  slug: string,
  kind: "full-practice" | "skill-quiz",
  itemCount: number,
) {
  const now = Date.now();
  return await t.run(async (ctx) => {
    const definitionId = await ctx.db.insert("assessmentDefinitions", {
      slug,
      kind,
      profile: "ec-itp-level-1-aligned-v1",
      adminTitle: slug,
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
      title: slug,
      summary: "Structured Listening dependency test.",
      instructions: "Listen to the recording and answer the questions.",
      locale: "en",
      timePolicy: "untimed",
      allowResume: true,
      reviewPolicy: "after-submit",
      scorePolicy: "raw-objective",
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
    const sectionId = await ctx.db.insert("assessmentSections", {
      versionId,
      sectionKey: "listening",
      skill: "listening",
      order: 0,
      title: "Listening",
      instructions: "Listen before answering.",
      itemCount,
      deliveryMode: "random-bank",
      bankProfile: "ec-itp-level-1-aligned-v1",
      bankSelectionContract: 1,
    });
    return { definitionId, versionId, sectionId };
  });
}

async function createLearner(t: ReturnType<typeof harness>, suffix: string) {
  const authUserId = await t.run(async (ctx) =>
    await ctx.db.insert("users", { isAnonymous: true }),
  );
  return t.withIdentity({
    subject: `${authUserId}|session`,
    tokenIdentifier: `https://example.test|${suffix}`,
  });
}

describe("Listening dependency-group seed and delivery", () => {
  it("seeds original sets idempotently and freezes parent-first manifests", async () => {
    const t = harness();
    const ownerId = await seedOwner(t);
    const prepared = await t.mutation(
      internal.adminAssessmentQuestionBank.prepareListeningDependencyGroups,
      { confirm },
    );
    expect(prepared).toMatchObject({ inserted: 11, existing: 0 });
    expect(prepared.audio).toHaveLength(2);
    await expect(attachPreparedAudio(t, prepared)).resolves.toEqual({
      attached: 2,
      skipped: 0,
      readyQuestions: 11,
    });
    await expect(
      t.query(
        internal.adminAssessmentQuestionBank.verifyListeningDependencyGroups,
        { confirm },
      ),
    ).resolves.toMatchObject({
      total: 11,
      anchors: 2,
      followUps: 9,
      audioReady: 11,
      selectable: 11,
      orphans: 0,
    });
    await expect(
      t.mutation(
        internal.adminAssessmentQuestionBank.prepareListeningDependencyGroups,
        { confirm },
      ),
    ).resolves.toMatchObject({ inserted: 0, existing: 11, audio: [] });

    for (const [kind, itemCount] of [
      ["full-practice", 4],
      ["skill-quiz", 3],
    ] as const) {
      const practice = await createRandomListeningPractice(
        t,
        ownerId,
        `dependency-${kind}`,
        kind,
        itemCount,
      );
      const learner = await createLearner(t, `dependency-${kind}-learner`);
      const attempt = await learner.mutation(api.assessmentAttempts.start, {
        definitionId: practice.definitionId,
        versionId: practice.versionId,
        timingMode: "untimed",
        timeMultiplier: 1,
        listeningMode: "audio-primary",
        startRequestId: `dependency-${kind}-attempt`,
      });
      const manifest = await t.run(async (ctx) =>
        await ctx.db
          .query("assessmentAttemptItems")
          .withIndex("by_attempt_id_and_section_id_and_order", (q) =>
            q
              .eq("attemptId", attempt.attemptId)
              .eq("sectionId", practice.sectionId),
          )
          .take(itemCount + 1),
      );
      expect(manifest).toHaveLength(itemCount);
      expect(manifest.map((entry) => entry.order)).toEqual(
        Array.from({ length: itemCount }, (_, index) => index),
      );
      for (const entry of manifest) {
        expect(entry.audioMediaId).toBeDefined();
        if (entry.dependencyRole !== "follow-up") continue;
        expect(entry.parentAttemptItemOrder).toBeTypeOf("number");
        const parent = manifest[entry.parentAttemptItemOrder!];
        expect(parent.dependencyRole).toBe("anchor");
        expect(parent.dependencyGroupKey).toBe(entry.dependencyGroupKey);
        expect(parent.order).toBeLessThan(entry.order);
      }
      for (const groupKey of new Set(
        manifest
          .map((entry) => entry.dependencyGroupKey)
          .filter((value): value is string => value !== undefined),
      )) {
        const orders = manifest
          .filter((entry) => entry.dependencyGroupKey === groupKey)
          .map((entry) => entry.order);
        expect(orders).toEqual(
          Array.from(
            { length: orders.length },
            (_, index) => Math.min(...orders) + index,
          ),
        );
      }
    }
  });

  it("makes an anchor disable suppress its follow-ups without suppressing siblings", async () => {
    const t = harness();
    const ownerId = await seedOwner(t);
    const prepared = await t.mutation(
      internal.adminAssessmentQuestionBank.prepareListeningDependencyGroups,
      { confirm },
    );
    await attachPreparedAudio(t, prepared);
    const practice = await createRandomListeningPractice(
      t,
      ownerId,
      "dependency-format-rules",
      "skill-quiz",
      3,
    );
    const rows = await t.run(async (ctx) =>
      await ctx.db
        .query("assessmentQuestionBank")
        .withIndex("by_seed_batch_and_status_and_updated_at", (q) =>
          q
            .eq("seedBatch", "ec-listening-dependency-groups-v1")
            .eq("status", "ready"),
        )
        .take(12),
    );
    const anchor = rows.find((row) => row.dependencyRole === "anchor");
    if (anchor === undefined || anchor.dependencyGroupKey === undefined) {
      throw new Error("Seeded anchor missing");
    }
    const child = rows.find(
      (row) => row.parentBankQuestionId === anchor._id,
    );
    if (child === undefined) throw new Error("Seeded follow-up missing");

    const anchorRuleId = await t.run(async (ctx) =>
      await ctx.db.insert("assessmentVersionQuestionRules", {
        versionId: practice.versionId,
        bankQuestionId: anchor._id,
        allowed: false,
        updatedBy: ownerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const withoutAnchor = await t.run(async (ctx) => {
      const section = await ctx.db.get("assessmentSections", practice.sectionId);
      if (section === null) throw new Error("Section missing");
      return await listEligibleBankQuestionsForSection(ctx, section);
    });
    expect(
      withoutAnchor.some(
        (row) => row.dependencyGroupKey === anchor.dependencyGroupKey,
      ),
    ).toBe(false);

    await t.run(async (ctx) => {
      await ctx.db.delete("assessmentVersionQuestionRules", anchorRuleId);
      await ctx.db.insert("assessmentVersionQuestionRules", {
        versionId: practice.versionId,
        bankQuestionId: child._id,
        allowed: false,
        updatedBy: ownerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const withoutOneChild = await t.run(async (ctx) => {
      const section = await ctx.db.get("assessmentSections", practice.sectionId);
      if (section === null) throw new Error("Section missing");
      return await listEligibleBankQuestionsForSection(ctx, section);
    });
    expect(withoutOneChild.some((row) => row._id === anchor._id)).toBe(true);
    expect(withoutOneChild.some((row) => row._id === child._id)).toBe(false);
    expect(
      withoutOneChild.some(
        (row) =>
          row.parentBankQuestionId === anchor._id && row._id !== child._id,
      ),
    ).toBe(true);
  });
});
