import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { publicAssessmentDerivativeKey } from "../convex/lib/assessmentMedia.ts";

const confirm = "seed-ec-listening-dependency-groups-v1";
const publicDomain = "https://r2.mukhtada.my.id";

type AudioPlan = {
  groupKey: string;
  versionId: string;
  stimulusId: string;
  stimulusKey: string;
  title: string;
  transcript: string;
  description: string;
};

type PrepareResult = {
  inserted: number;
  existing: number;
  audio: AudioPlan[];
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function r2Endpoint() {
  const accountId = required("R2_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/.test(accountId)) {
    throw new Error("R2_ACCOUNT_ID is invalid.");
  }
  const endpoint = new URL(
    process.env.R2_API?.trim() ||
      `https://${accountId}.r2.cloudflarestorage.com`,
  );
  if (
    endpoint.protocol !== "https:" ||
    endpoint.hostname !== `${accountId}.r2.cloudflarestorage.com`
  ) {
    throw new Error("R2_API must use the configured Cloudflare R2 account.");
  }
  return endpoint.origin;
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
      .slice(-14)
      .join("\n");
    throw new Error(`Convex ${functionName} failed.\n${message}`);
  }
  return JSON.parse(result.stdout.trim()) as T;
}

function run(command: string, args: string[]) {
  execFileSync(command, args, { stdio: ["ignore", "ignore", "pipe"] });
}

async function audioDurationMs(path: string) {
  const raw = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path,
    ],
    { encoding: "utf8" },
  ).trim();
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("Generated audio duration could not be verified.");
  }
  return Math.max(1, Math.round(seconds * 1_000));
}

function publicUrl(objectKey: string) {
  return `${publicDomain}/${objectKey
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

async function verifyPublicObject(objectKey: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(publicUrl(objectKey), { method: "HEAD" });
    if (response.ok) return;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw new Error(
    `Uploaded object did not resolve through the custom domain: ${objectKey}`,
  );
}

function transcriptSegments(transcript: string) {
  return transcript
    .split(/\n\s*\n/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const match = /^(Lecturer|Student|Coordinator):\s*([\s\S]+)$/.exec(
        segment,
      );
      return {
        speaker: match?.[1] ?? "Lecturer",
        text: match?.[2] ?? segment,
      };
    });
}

async function synthesizeAudio(
  directory: string,
  plan: AudioPlan,
  index: number,
) {
  const segments = transcriptSegments(plan.transcript);
  if (segments.length < 1) throw new Error(`Empty transcript: ${plan.groupKey}`);
  const wavPaths = [];
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = segments[segmentIndex];
    const wavPath = join(
      directory,
      `${String(index).padStart(2, "0")}-${String(segmentIndex).padStart(2, "0")}.wav`,
    );
    const voice =
      segment.speaker === "Student"
        ? "en-us"
        : segment.speaker === "Coordinator"
          ? "en-gb"
          : "en-us";
    const pitch =
      segment.speaker === "Student"
        ? "55"
        : segment.speaker === "Coordinator"
          ? "43"
          : "48";
    run("espeak-ng", [
      "-v",
      voice,
      "-s",
      segment.speaker === "Lecturer" ? "148" : "154",
      "-p",
      pitch,
      "-w",
      wavPath,
      segment.text,
    ]);
    wavPaths.push(wavPath);
  }
  const concatPath = join(directory, `${String(index).padStart(2, "0")}.txt`);
  await writeFile(
    concatPath,
    wavPaths.map((path) => `file '${path.replaceAll("'", "'\\''")}'`).join("\n"),
    "utf8",
  );
  const outputPath = join(directory, `${String(index).padStart(2, "0")}.mp3`);
  run("ffmpeg", [
    "-nostdin",
    "-y",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-codec:a",
    "libmp3lame",
    "-q:a",
    "4",
    "-ar",
    "44100",
    outputPath,
  ]);
  return outputPath;
}

async function main() {
  const prepared = convexRun<PrepareResult>(
    "adminAssessmentQuestionBank:prepareListeningDependencyGroups",
    { confirm },
  );
  console.log(
    `Listening sets prepared: ${prepared.inserted} inserted, ${prepared.existing} existing, ${prepared.audio.length} recordings pending.`,
  );

  if (prepared.audio.length > 0) {
    const endpoint = r2Endpoint();
    const bucket = required("R2_BUCKET_NAME");
    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      },
    });
    const tempDirectory = await mkdtemp(
      join(tmpdir(), "ec-listening-dependency-audio-"),
    );
    try {
      const assets = [];
      for (let index = 0; index < prepared.audio.length; index += 1) {
        const plan = prepared.audio[index];
        const path = await synthesizeAudio(tempDirectory, plan, index);
        const body = await readFile(path);
        const checksumSha256 = createHash("sha256").update(body).digest("hex");
        const objectKey = publicAssessmentDerivativeKey({
          versionId: plan.versionId,
          checksumSha256,
          extension: "mp3",
        });
        const file = await stat(path);
        const durationMs = await audioDurationMs(path);
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            Body: body,
            ContentType: "audio/mpeg",
            CacheControl: "public, max-age=31536000, immutable",
            Metadata: {
              checksum: checksumSha256,
              source: "english-club-original-listening-set",
              group: plan.groupKey,
            },
          }),
        );
        await verifyPublicObject(objectKey);
        assets.push({
          groupKey: plan.groupKey,
          versionId: plan.versionId,
          stimulusId: plan.stimulusId,
          objectKey,
          checksumSha256,
          byteSize: file.size,
          durationMs,
        });
        console.log(
          `Uploaded ${plan.title}: ${Math.round(durationMs / 1_000)} seconds, ${file.size} bytes.`,
        );
      }
      const attached = convexRun<{
        attached: number;
        skipped: number;
        readyQuestions: number;
      }>("adminAssessmentQuestionBank:attachListeningDependencyAudio", {
        confirm,
        assets,
      });
      console.log(
        `Audio ledger: ${attached.attached} attached, ${attached.skipped} matched, ${attached.readyQuestions} questions ready.`,
      );
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  }

  const verified = convexRun<{
    total: number;
    anchors: number;
    followUps: number;
    audioReady: number;
    selectable: number;
    orphans: number;
    groups: Array<{ groupKey: string; questions: number }>;
  }>("adminAssessmentQuestionBank:verifyListeningDependencyGroups", {
    confirm,
  });
  if (
    verified.total !== 11 ||
    verified.anchors !== 2 ||
    verified.followUps !== 9 ||
    verified.audioReady !== 11 ||
    verified.selectable !== 11 ||
    verified.orphans !== 0 ||
    verified.groups.length !== 2
  ) {
    throw new Error(`Listening-set verification failed: ${JSON.stringify(verified)}`);
  }
  console.log(
    `Verified ${verified.groups.length} sets: ${verified.anchors} anchors, ${verified.followUps} follow-ups, no orphans.`,
  );
}

await main();
