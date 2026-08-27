import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { parseToeflReadingHtml } from "./lib/toefl-reading-import.ts";

const confirmation = "import-toefl-reading-v1";
const expectedCloudUrl = "https://perfect-greyhound-270.convex.cloud";

function assertDevelopmentTarget() {
  const deployment = process.env.CONVEX_DEPLOYMENT?.trim();
  const cloudUrl = process.env.CONVEX_URL?.trim();
  if (
    deployment !== "dev:perfect-greyhound-270" ||
    cloudUrl !== expectedCloudUrl
  ) {
    throw new Error(
      "Reading import is locked to the perfect-greyhound-270 development deployment.",
    );
  }
}

function convexRun<T>(functionName: string, args: unknown): T {
  const result = spawnSync(
    "npx",
    ["convex", "run", functionName, JSON.stringify(args)],
    {
      cwd: process.cwd(),
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout)
      .trim()
      .split("\n")
      .slice(-16)
      .join("\n");
    throw new Error(`Convex ${functionName} failed.\n${message}`);
  }
  return JSON.parse(result.stdout.trim()) as T;
}

async function resolveSourcePath(argument: string) {
  const source = resolve(argument);
  const sourceStat = await stat(source);
  return sourceStat.isDirectory() ? join(source, "index.html") : source;
}

async function main() {
  assertDevelopmentTarget();
  const sourceArgument = process.argv[2] ?? process.env.TOEFL_READING_SOURCE;
  if (!sourceArgument) {
    throw new Error(
      "Pass the TOEFL Reading directory or index.html path as the first argument.",
    );
  }
  const sourcePath = await resolveSourcePath(sourceArgument);
  const html = await readFile(sourcePath, "utf8");
  const datasetChecksum = createHash("sha256").update(html).digest("hex");
  const plan = parseToeflReadingHtml(html);
  console.log(
    `Validated ${plan.topics} topics, ${plan.passages} passages, and ${plan.questions}/${plan.sourceQuestions} usable questions (${datasetChecksum}).`,
  );
  for (const exclusion of plan.excluded) {
    console.log(`Excluded ${exclusion.key}: ${exclusion.reason}.`);
  }

  let inserted = 0;
  let existing = 0;
  let duplicates = 0;
  for (let index = 0; index < plan.sections.length; index += 1) {
    const entry = plan.sections[index];
    const result = convexRun<{
      inserted: number;
      existing: number;
      duplicates: number;
    }>("adminAssessmentQuestionBank:importReadingSection", {
      confirm: confirmation,
      datasetChecksum,
      ...entry,
    });
    inserted += result.inserted;
    existing += result.existing;
    duplicates += result.duplicates;
    if ((index + 1) % 10 === 0 || index + 1 === plan.sections.length) {
      console.log(`Imported ${index + 1}/${plan.sections.length} passages.`);
    }
  }
  if (inserted + existing + duplicates !== plan.questions) {
    throw new Error("Import accounting does not match the validated question count.");
  }
  console.log(
    `Import accounting: ${inserted} inserted, ${existing} existing, ${duplicates} duplicates skipped.`,
  );
  const verification = convexRun<{
    total: number;
    paused: number;
    ready: number;
    archived: number;
    passages: number;
    invalidSources: number;
    byTopic: Array<{ topicId: string; count: number }>;
  }>("adminAssessmentQuestionBank:verifyReadingImport", {
    confirm: confirmation,
    datasetChecksum,
    expectedRecords: inserted + existing,
  });
  if (
    verification.invalidSources !== 0 ||
    verification.total !== inserted + existing ||
    verification.passages > plan.passages
  ) {
    throw new Error(`Reading import verification failed: ${JSON.stringify(verification)}`);
  }
  console.log(
    `Verified ${verification.total} records across ${verification.passages} passages: ${verification.paused} paused, ${verification.ready} ready, ${verification.archived} archived; ${duplicates} duplicates skipped.`,
  );
  for (const topic of verification.byTopic) {
    console.log(`${topic.topicId}: ${topic.count}`);
  }
}

await main();
