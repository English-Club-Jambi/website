import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const rawModules = import.meta.glob("../../convex/**/*.ts");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, loader]) => [
    path.replace("../../convex", "."),
    loader,
  ]),
);

const confirm = "import-toefl-reading-v1" as const;
const checksum = "a".repeat(64);

function harness() {
  return convexTest(schema, modules);
}

async function seedOwner(t: ReturnType<typeof harness>) {
  await t.mutation(internal.adminUsers.bootstrapOwner, {
    tokenIdentifier: "https://example.test|reading-import-owner",
    displayName: "Reading Import Owner",
    email: "reading-import@example.test",
  });
}

function importArgs() {
  return {
    confirm,
    datasetChecksum: checksum,
    topic: {
      id: "science_nature",
      title: "Science and Nature",
      sourceFile: "Science and Nature.pdf",
    },
    section: {
      id: "section_01_wetland_cycles",
      number: 1,
      title: "Wetland cycles",
      sourcePages: [1, 2],
    },
    passage: {
      id: "passage_01",
      title: "Wetland cycles",
      sourcePages: [1, 2],
      paragraphs: [
        {
          id: "passage_01_p01",
          order: 1,
          label: "Paragraph 1",
          text: "Seasonal wetlands collect water and support migrating birds.",
        },
      ],
    },
    questions: [
      {
        id: "q_1",
        number: 1,
        prompt: "What is the passage mainly about?",
        options: [
          { key: "a", label: "Seasonal wetlands" },
          { key: "b", label: "Mountain roads" },
          { key: "c", label: "Urban transport" },
          { key: "d", label: "Desert weather" },
          { key: "e", label: "Ocean currents" },
        ],
        correctChoiceKey: "a",
        explanation: "The passage describes seasonal wetlands.",
      },
      {
        id: "q_2",
        number: 2,
        prompt: "Which animals are mentioned?",
        options: [
          { key: "a", label: "Migrating birds" },
          { key: "b", label: "Mountain goats" },
          { key: "c", label: "Desert foxes" },
          { key: "d", label: "Ocean whales" },
          { key: "e", label: "Farm horses" },
        ],
        correctChoiceKey: "a",
        explanation: "Migrating birds are named in the passage.",
      },
    ],
  };
}

describe("TOEFL Reading Question Bank import", () => {
  it("writes an idempotent paused batch with one shared passage and private keys", async () => {
    const t = harness();
    await seedOwner(t);

    await expect(
      t.mutation(internal.adminAssessmentQuestionBank.importReadingSection, importArgs()),
    ).resolves.toEqual({ inserted: 2, existing: 0, duplicates: 0 });

    const records = await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("assessmentQuestionBank")
        .withIndex("by_seed_batch_and_status_and_updated_at", (q) =>
          q.eq("seedBatch", `toefl-reading:${checksum}`).eq("status", "paused"),
        )
        .collect();
      const items = await Promise.all(
        rows.map((row) => ctx.db.get("assessmentItems", row.sourceItemId)),
      );
      const keys = await Promise.all(
        rows.map((row) =>
          ctx.db
            .query("assessmentAnswerKeys")
            .withIndex("by_item_id", (q) => q.eq("itemId", row.sourceItemId))
            .unique(),
        ),
      );
      return { rows, items, keys };
    });
    expect(records.rows).toHaveLength(2);
    expect(records.rows.every((row) => !row.fullPracticeEligible)).toBe(true);
    expect(new Set(records.items.map((item) => item?.stimulusId)).size).toBe(1);
    expect(records.items.every((item) => item?.type === "single-choice")).toBe(true);
    expect(records.keys.map((key) => key?.kind)).toEqual(["choice", "choice"]);

    await expect(
      t.query(internal.adminAssessmentQuestionBank.verifyReadingImport, {
        confirm,
        datasetChecksum: checksum,
        expectedRecords: 2,
      }),
    ).resolves.toMatchObject({
      total: 2,
      paused: 2,
      ready: 0,
      archived: 0,
      passages: 1,
      invalidSources: 0,
      byTopic: [{ topicId: "science_nature", count: 2 }],
    });
    await expect(
      t.query(internal.assessmentSeed.verifyQuestionBank, {
        confirm: "seed-ec-paper-level1-v1",
      }),
    ).resolves.toMatchObject({ total: 0, ready: 0, eligible: 0 });

    await expect(
      t.mutation(internal.adminAssessmentQuestionBank.importReadingSection, importArgs()),
    ).resolves.toEqual({ inserted: 0, existing: 2, duplicates: 0 });
  });
});
