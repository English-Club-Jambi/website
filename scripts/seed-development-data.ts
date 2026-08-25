import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  developmentSeedMembers,
} from "../content/member-development-seed.ts";
import { getPublicContentManifestPages } from "../content/public-content.ts";

const confirmation = "seed-english-club-development-v1";
const expectedDeployment = "dev:perfect-greyhound-270";
const publicDomain = "https://r2.mukhtada.my.id";
const portraitSource = "public/images/member-directory-portraits-v1.webp";
const membersOnly = process.argv.includes("--members-only");

type PortraitRecord = {
  slug: string;
  objectKey: string;
  checksumSha256: string;
  byteSize: number;
  width: number;
  height: number;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assertDevelopmentTarget() {
  const deployment = required("CONVEX_DEPLOYMENT").split(/\s+#/, 1)[0].trim();
  const convexUrl = required("CONVEX_URL");
  if (
    deployment !== expectedDeployment ||
    convexUrl !== "https://perfect-greyhound-270.convex.cloud"
  ) {
    throw new Error(
      "Development seed refused: the configured Convex deployment is not perfect-greyhound-270.",
    );
  }
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
  throw new Error(`Portrait is not available on the custom R2 domain: ${objectKey}`);
}

async function uploadPortraits(client: S3Client, bucket: string) {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "ec-members-"));
  try {
    const records: PortraitRecord[] = [];
    for (const member of developmentSeedMembers) {
      const left = Math.round((member.portraitCell.column * 1254) / 4);
      const top = Math.round((member.portraitCell.row * 1254) / 4);
      const right = Math.round(((member.portraitCell.column + 1) * 1254) / 4);
      const bottom = Math.round(((member.portraitCell.row + 1) * 1254) / 4);
      const width = right - left;
      const height = bottom - top;
      const output = join(temporaryDirectory, `${member.slug}.webp`);
      execFileSync(
        "magick",
        [
          portraitSource,
          "-crop",
          `${width}x${height}+${left}+${top}`,
          "+repage",
          "-resize",
          "800x800^",
          "-gravity",
          "center",
          "-extent",
          "800x800",
          "-strip",
          "-quality",
          "86",
          output,
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      const body = await readFile(output);
      const checksumSha256 = createHash("sha256").update(body).digest("hex");
      const objectKey = `members/development-seed-v1/${member.slug}-${checksumSha256.slice(0, 16)}.webp`;
      const file = await stat(output);
      let exists = false;
      try {
        const head = await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
        );
        exists =
          head.ContentLength === file.size &&
          head.ContentType === "image/webp" &&
          head.Metadata?.checksum === checksumSha256;
        if (!exists) {
          throw new Error(`R2 object collision at ${objectKey}.`);
        }
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode;
        if (status !== 404 && status !== undefined) throw error;
      }
      if (!exists) {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            Body: body,
            ContentType: "image/webp",
            CacheControl: "public, max-age=31536000, immutable",
            Metadata: {
              checksum: checksumSha256,
              source: "english-club-generated-member-seed",
            },
          }),
        );
      }
      await verifyPublicObject(objectKey);
      records.push({
        slug: member.slug,
        objectKey,
        checksumSha256,
        byteSize: file.size,
        width: 800,
        height: 800,
      });
    }
    return records;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  assertDevelopmentTarget();
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

  console.log(`Target verified: ${expectedDeployment}.`);
  const portraits = await uploadPortraits(client, bucket);
  console.log(`Uploaded or verified ${portraits.length} generated member portraits.`);
  const members = convexRun<{
    inserted: number;
    existing: number;
    updated: number;
    divisionsInserted: number;
    divisionsExisting: number;
    mediaInserted: number;
    mediaExisting: number;
  }>("developmentSeed:seedMembers", { confirm: confirmation, portraits });
  console.log(
    `Members: ${members.inserted} inserted, ${members.updated} linked to managed divisions, ${members.existing} existing; divisions ${members.divisionsInserted} inserted, ${members.divisionsExisting} existing; media ${members.mediaInserted} inserted, ${members.mediaExisting} existing.`,
  );
  if (membersOnly) {
    const verification = convexRun<{
      members: number;
      memberMedia: number;
      memberDivisions: number;
    }>("developmentSeed:verify", { confirm: confirmation });
    if (
      verification.members !== developmentSeedMembers.length ||
      verification.memberMedia !== developmentSeedMembers.length ||
      verification.memberDivisions !== 5
    ) {
      throw new Error("Development member data verification failed.");
    }
    console.log(
      `Verified ${verification.members} development members and ${verification.memberDivisions} managed divisions from Convex.`,
    );
    return;
  }
  const themes = convexRun<{
    inserted: number;
    updated: number;
    existing: number;
    publishedInitial: boolean;
  }>("developmentSeed:seedThemePresets", { confirm: confirmation });
  console.log(
    `Themes: ${themes.inserted} inserted, ${themes.updated} updated, ${themes.existing} unchanged; initial publish ${themes.publishedInitial ? "created" : "already present"}.`,
  );
  const journal = convexRun<{
    inserted: number;
    migrated: number;
    existing: number;
  }>("developmentSeed:seedJournal", { confirm: confirmation });
  console.log(
    `Journal: ${journal.inserted} inserted, ${journal.migrated} upgraded to the editor lifecycle, ${journal.existing} unchanged.`,
  );
  const programs = convexRun<{ inserted: number; existing: number }>(
    "developmentSeed:seedPrograms",
    { confirm: confirmation },
  );
  console.log(
    `Programs: ${programs.inserted} inserted and published, ${programs.existing} unchanged.`,
  );
  let contentFields = 0;
  let contentInserted = 0;
  let contentPublishedExisting = 0;
  for (const page of getPublicContentManifestPages()) {
    const seeded = convexRun<{
      pageKey: string;
      inserted: number;
      publishedExisting: number;
      existing: number;
      total: number;
    }>("developmentSeed:seedPublicContentPage", {
      confirm: confirmation,
      pageKey: page.pageKey,
    });
    contentFields += seeded.total;
    contentInserted += seeded.inserted;
    contentPublishedExisting += seeded.publishedExisting;
  }
  console.log(
    `Public copy: ${contentFields} fields checked across ${getPublicContentManifestPages().length} pages; ${contentInserted} inserted and ${contentPublishedExisting} existing drafts published.`,
  );
  const verification = convexRun<{
    members: number;
    memberMedia: number;
    memberDivisions: number;
    themePresets: number;
    publicThemeReady: boolean;
    journalPublished: number;
    journalManaged: number;
    contentExpected: number;
    contentPublished: number;
    programsPublished: number;
    programsManaged: number;
  }>("developmentSeed:verify", { confirm: confirmation });
  if (
    verification.members !== 15 ||
    verification.memberMedia !== 15 ||
    verification.memberDivisions !== 5 ||
    verification.themePresets !== 4 ||
    !verification.publicThemeReady ||
    verification.journalPublished !== 3 ||
    verification.journalManaged !== 3 ||
    verification.contentExpected !== contentFields ||
    verification.contentPublished !== contentFields ||
    verification.programsPublished !== 6 ||
    verification.programsManaged !== 6
  ) {
    throw new Error("Development data verification failed.");
  }
  const publicMembers = convexRun<Array<{ slug: string }>>(
    "members:listPublished",
    { limit: 120 },
  );
  if (publicMembers.length !== 15) {
    throw new Error(`Public directory returned ${publicMembers.length} members, expected 15.`);
  }
  console.log(
    `Verified 15 public members, three managed Journal stories, six managed Programs, four Appearance presets, and ${contentFields} published copy fields from Convex.`,
  );
}

await main();
