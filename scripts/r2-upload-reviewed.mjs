import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import process from "node:process";

const [filePath, objectKey, contentType] = process.argv.slice(2);

if (!filePath || !objectKey || !contentType) {
  console.error(
    "Usage: npm run r2:upload-reviewed -- <file> <object-key> <content-type>",
  );
  process.exit(1);
}

const bytes = await readFile(filePath);

function runConvex(functionName, args) {
  const result = spawnSync(
    "npx",
    ["convex", "run", functionName, JSON.stringify(args)],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    console.error(
      `${functionName} failed. The signed URL, credentials, and response body were not printed.`,
    );
    process.exit(1);
  }

  return JSON.parse(result.stdout.trim());
}

const upload = runConvex("r2:createReviewedImageUploadUrl", {
  objectKey,
  contentType,
  byteSize: bytes.byteLength,
});

let response;

try {
  response = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
    body: bytes,
  });
} catch {
  console.error("R2 upload request failed. The signed URL was not printed.");
  process.exit(1);
}

if (!response.ok) {
  console.error(`R2 upload failed with HTTP ${response.status}.`);
  process.exit(1);
}

runConvex("r2:verifyReviewedImage", {
  objectKey,
  contentType,
  byteSize: bytes.byteLength,
});

console.log(`${objectKey}: uploaded and verified.`);
