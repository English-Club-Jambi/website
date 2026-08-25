import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { publicAssessmentDerivativeKey } from "../convex/lib/assessmentMedia.ts";

const confirm = "seed-ec-ibt-style-2026-v1";
const publicDomain = "https://r2.mukhtada.my.id";

type AudioPlan = {
  definitionId: string;
  versionId: string;
  stimulusId: string;
  stimulusKey: string;
  title: string;
  transcript: string;
};

type PrepareResult = {
  definitions: Array<{
    slug: string;
    definitionId: string;
    versionId: string;
    inserted: boolean;
    itemCount: number;
    audioCount: number;
  }>;
  audio: AudioPlan[];
};

type UploadedAudio = {
  versionId: string;
  stimulusId: string;
  objectKey: string;
  checksumSha256: string;
  byteSize: number;
  durationMs: number;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
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
    const message = (result.stderr || result.stdout).trim().split("\n").slice(-12).join("\n");
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
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
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
  throw new Error(`Uploaded object did not resolve through the custom domain: ${objectKey}`);
}

async function mapLimit<T, R>(
  values: readonly T[],
  limit: number,
  task: (value: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

async function main() {
  const endpoint = new URL(
    process.env.R2_API?.trim() ||
      `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  ).origin;
  const bucket = required("R2_BUCKET_NAME");
  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });

  const prepared = convexRun<PrepareResult>(
    "assessmentSeed:prepareIbtPractice",
    { confirm },
  );
  const inserted = prepared.definitions.filter((entry) => entry.inserted).length;
  console.log(
    `Prepared ${prepared.definitions.length} practice forms (${inserted} inserted) and ${prepared.audio.length} audio derivatives.`,
  );

  const tempDirectory = await mkdtemp(join(tmpdir(), "ec-ibt-audio-"));
  try {
    const voices = ["en-us", "en-gb", "en-sc"];
    const uploaded = await mapLimit(prepared.audio, 4, async (entry, index) => {
      const base = join(tempDirectory, String(index).padStart(3, "0"));
      const wavPath = `${base}.wav`;
      const mp3Path = `${base}.mp3`;
      run("espeak-ng", [
        "-v", voices[index % voices.length],
        "-s", entry.transcript.length > 420 ? "148" : "155",
        "-p", index % 2 === 0 ? "48" : "52",
        "-w", wavPath,
        entry.transcript,
      ]);
      run("ffmpeg", [
        "-nostdin", "-y", "-loglevel", "error",
        "-i", wavPath,
        "-codec:a", "libmp3lame",
        "-q:a", "5",
        "-ar", "44100",
        mp3Path,
      ]);
      const body = await readFile(mp3Path);
      const checksumSha256 = createHash("sha256").update(body).digest("hex");
      const objectKey = publicAssessmentDerivativeKey({
        versionId: entry.versionId,
        checksumSha256,
        extension: "mp3",
      });
      const file = await stat(mp3Path);
      const durationMs = await audioDurationMs(mp3Path);
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: body,
        ContentType: "audio/mpeg",
        CacheControl: "public, max-age=31536000, immutable",
        Metadata: {
          checksum: checksumSha256,
          source: "english-club-original-practice",
        },
      }));
      await verifyPublicObject(objectKey);
      if ((index + 1) % 10 === 0 || index + 1 === prepared.audio.length) {
        console.log(`Uploaded and verified ${index + 1}/${prepared.audio.length} audio files.`);
      }
      return {
        versionId: entry.versionId,
        stimulusId: entry.stimulusId,
        objectKey,
        checksumSha256,
        byteSize: file.size,
        durationMs,
      } satisfies UploadedAudio;
    });

    let attached = 0;
    let skipped = 0;
    for (let index = 0; index < uploaded.length; index += 20) {
      const result = convexRun<{ attached: number; skipped: number }>(
        "assessmentSeed:attachPublicAudio",
        { confirm, assets: uploaded.slice(index, index + 20) },
      );
      attached += result.attached;
      skipped += result.skipped;
    }
    console.log(`Attached ${attached} audio records; ${skipped} already matched.`);

    const verification = convexRun<{
      definitions: Array<{
        slug: string;
        published: boolean;
        items: number;
        audioReady: number;
        audioTotal: number;
        sections: Array<{ skill: string; items: number; points: number }>;
      }>;
    }>("assessmentSeed:verifyIbtPractice", { confirm });
    const invalid = verification.definitions.filter(
      (entry) => !entry.published || entry.audioReady !== entry.audioTotal,
    );
    if (invalid.length > 0) {
      throw new Error(`Practice verification failed for ${invalid.map((entry) => entry.slug).join(", ")}.`);
    }
    for (const entry of verification.definitions) {
      const sections = entry.sections
        .map((section) => `${section.skill}:${section.items}/${section.points}`)
        .join(", ");
      console.log(
        `${entry.slug}: ${entry.items} items; audio ${entry.audioReady}/${entry.audioTotal}; ${sections}`,
      );
    }
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

await main();
