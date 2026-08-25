import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/admin/media-upload/route";
import { relayAdminMediaUpload } from "@/components/admin/admin-media-upload-relay";

const accountId = "0123456789abcdef0123456789abcdef";
const bucket = "english-club";
const cacheControl = "public, max-age=31536000, immutable";

function signedUploadUrl({
  host = `${bucket}.${accountId}.r2.cloudflarestorage.com`,
  objectKey = "uploads/journal-inline/7ad9c146-8403-4548-a24d-6d7fd8b65d3c.webp",
  expires = 300,
}: {
  host?: string;
  objectKey?: string;
  expires?: number;
} = {}) {
  const date = new Date();
  const stamp = date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const url = new URL(`https://${host}/${objectKey}`);
  url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  url.searchParams.set("X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD");
  url.searchParams.set(
    "X-Amz-Credential",
    `test-access/${stamp.slice(0, 8)}/auto/s3/aws4_request`,
  );
  url.searchParams.set("X-Amz-Date", stamp);
  url.searchParams.set("X-Amz-Expires", String(expires));
  url.searchParams.set(
    "X-Amz-SignedHeaders",
    "cache-control;content-length;content-type;host",
  );
  url.searchParams.set("X-Amz-Signature", "a".repeat(64));
  url.searchParams.set("x-id", "PutObject");
  return url.toString();
}

function relayRequest({
  uploadUrl = signedUploadUrl(),
  contentType = "image/webp",
  file = new File([new Uint8Array([1, 2, 3])], "session.webp", {
    type: "image/webp",
  }),
}: {
  uploadUrl?: string;
  contentType?: string;
  file?: File;
} = {}) {
  return new Request("http://127.0.0.1:3987/api/admin/media-upload", {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:3987",
      Host: "127.0.0.1:3987",
      "Content-Type": contentType,
      "Content-Length": String(file.size),
      "Cache-Control": cacheControl,
      "X-English-Club-R2-Upload": uploadUrl,
    },
    body: file,
  });
}

beforeEach(() => {
  vi.stubEnv("R2_ACCOUNT_ID", accountId);
  vi.stubEnv("R2_BUCKET_NAME", bucket);
  vi.stubEnv("R2_API", `https://${accountId}.r2.cloudflarestorage.com`);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("admin media same-origin relay", () => {
  it("keeps the browser request same-origin instead of fetching R2 directly", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const file = new File([new Uint8Array([1, 2, 3])], "session.webp", {
      type: "image/webp",
    });
    const uploadUrl = signedUploadUrl();

    await relayAdminMediaUpload({
      uploadUrl,
      file,
      requiredHeaders: { contentType: "image/webp", cacheControl },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toBe("/api/admin/media-upload");
    expect(init).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
    expect(init?.body).toBe(file);
    expect(init?.headers).toEqual({
      "Content-Type": "image/webp",
      "Cache-Control": cacheControl,
      "X-English-Club-R2-Upload": uploadUrl,
    });
  });

  it("forwards one validated upload to the exact R2 object", async () => {
    const upstream = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    const uploadUrl = signedUploadUrl();
    const response = await POST(relayRequest({ uploadUrl }));

    expect(response.status).toBe(204);
    expect(upstream).toHaveBeenCalledOnce();
    const [target, init] = upstream.mock.calls[0];
    expect(target).toBe(uploadUrl);
    expect(init).toMatchObject({
      method: "PUT",
      redirect: "error",
      cache: "no-store",
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": cacheControl,
      },
    });
    expect(init?.body).toBeInstanceOf(ReadableStream);
  });

  it("rejects an SSRF target before any upstream request", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const response = await POST(
      relayRequest({ uploadUrl: signedUploadUrl({ host: "example.com" }) }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "The upload authorization is invalid or expired.",
    });
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects a cross-site relay before inspecting its bearer URL", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const request = relayRequest();
    request.headers.set("origin", "https://attacker.example");
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("requires a same-origin browser request", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const request = relayRequest();
    request.headers.delete("origin");
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects mismatched signed metadata before contacting R2", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const response = await POST(relayRequest({ contentType: "image/png" }));

    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects altered cache metadata before contacting R2", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const request = relayRequest();
    request.headers.set("cache-control", "no-store");
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects missing and oversized upload lengths before contacting R2", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const missingLength = relayRequest();
    missingLength.headers.delete("content-length");
    expect((await POST(missingLength)).status).toBe(411);

    const oversized = relayRequest();
    oversized.headers.set("content-length", String(10 * 1024 * 1024 + 1));
    expect((await POST(oversized)).status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects path traversal and altered signature shapes", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const traversalUrl = signedUploadUrl().replace(
      "/uploads/journal-inline/7ad9c146-8403-4548-a24d-6d7fd8b65d3c.webp",
      "/uploads/journal-inline/%2e%2e/secret.webp",
    );
    const traversal = await POST(
      relayRequest({ uploadUrl: traversalUrl }),
    );
    expect(traversal.status).toBe(400);

    const altered = new URL(signedUploadUrl());
    altered.searchParams.set("X-Amz-Signature", "not-a-signature");
    expect(
      (await POST(relayRequest({ uploadUrl: altered.toString() }))).status,
    ).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects credentials, ports, and plain traversal in the upload target", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const credentialTarget = signedUploadUrl().replace(
      "https://",
      "https://user:secret@",
    );
    expect(
      (await POST(relayRequest({ uploadUrl: credentialTarget }))).status,
    ).toBe(400);

    const portTarget = signedUploadUrl().replace(
      ".r2.cloudflarestorage.com/",
      ".r2.cloudflarestorage.com:444/",
    );
    expect((await POST(relayRequest({ uploadUrl: portTarget }))).status).toBe(
      400,
    );

    const traversalTarget = signedUploadUrl().replace(
      "/uploads/journal-inline/7ad9c146-8403-4548-a24d-6d7fd8b65d3c.webp",
      "/uploads/journal-inline/../secret.webp",
    );
    expect(
      (await POST(relayRequest({ uploadUrl: traversalTarget }))).status,
    ).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects a checksum query that the relay cannot prove against the body", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const checksumUrl = new URL(signedUploadUrl());
    checksumUrl.searchParams.set("x-amz-checksum-crc32", "AAAAAA==");
    const response = await POST(
      relayRequest({ uploadUrl: checksumUrl.toString() }),
    );

    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("returns a bounded error when R2 rejects the relay", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("signature details must not escape", { status: 403 }),
    );
    const response = await POST(relayRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "R2 rejected the upload. Request a new upload and try again.",
    });
  });
});
