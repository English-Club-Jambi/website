import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "../../convex/_generated/api";
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
});
