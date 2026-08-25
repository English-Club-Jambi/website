const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const ACCOUNT_ID_PATTERN = /^[a-f0-9]{32}$/;
const BUCKET_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const OBJECT_KEY_PATTERN =
  /^(?:brand|images|members|uploads)\/(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_-]*\.(?:avif|jpe?g|png|webp)$/;
const SIGNATURE_PATTERN = /^[a-f0-9]{64}$/;

const allowedContentTypes = {
  "image/avif": ".avif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
} as const;

export const runtime = "nodejs";

function jsonError(error: string, status: number) {
  return Response.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function readConfiguredR2Target() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const bucket = process.env.R2_BUCKET_NAME?.trim() ?? "";
  if (!ACCOUNT_ID_PATTERN.test(accountId) || !BUCKET_PATTERN.test(bucket)) {
    return null;
  }
  const configuredEndpoint =
    process.env.R2_API?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;
  let endpoint: URL;
  try {
    endpoint = new URL(configuredEndpoint);
  } catch {
    return null;
  }
  if (
    endpoint.protocol !== "https:" ||
    endpoint.hostname !== `${accountId}.r2.cloudflarestorage.com` ||
    endpoint.port !== "" ||
    (endpoint.pathname !== "/" && endpoint.pathname !== `/${bucket}`) ||
    endpoint.search !== "" ||
    endpoint.hash !== "" ||
    endpoint.username !== "" ||
    endpoint.password !== ""
  ) {
    return null;
  }
  return {
    virtualHost: `${bucket}.${endpoint.hostname}`,
  };
}

function parseAwsTimestamp(value: string) {
  const match =
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (match === null) return null;
  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
  return Number.isFinite(timestamp) ? timestamp : null;
}

function validatedUploadTarget(value: string, now = Date.now()) {
  const config = readConfiguredR2Target();
  if (config === null || value.length > 4_096) return null;
  const rawTarget = value.slice(0, value.indexOf("?") === -1 ? value.length : value.indexOf("?"));
  if (rawTarget.includes("%")) return null;
  const authorityEnd = rawTarget.indexOf(
    "/",
    rawTarget.indexOf("://") + 3,
  );
  const rawPath = authorityEnd === -1 ? "" : rawTarget.slice(authorityEnd);
  if (rawPath.split("/").some((segment) => segment === "." || segment === "..")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== "" ||
    url.hostname !== config.virtualHost ||
    url.port !== ""
  ) {
    return null;
  }

  let objectKey: string;
  try {
    objectKey = decodeURIComponent(url.pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
  if (!OBJECT_KEY_PATTERN.test(objectKey)) return null;

  const oneSignedValue = (name: string) => {
    const values = url.searchParams.getAll(name);
    return values.length === 1 ? values[0] : null;
  };
  const algorithm = oneSignedValue("X-Amz-Algorithm");
  const credential = oneSignedValue("X-Amz-Credential");
  const signedAtValue = oneSignedValue("X-Amz-Date");
  const expiresValue = oneSignedValue("X-Amz-Expires");
  const signedHeaders = oneSignedValue("X-Amz-SignedHeaders");
  const signature = oneSignedValue("X-Amz-Signature");
  const payloadHash = oneSignedValue("X-Amz-Content-Sha256");
  const operation = oneSignedValue("x-id");
  const signedAt = signedAtValue === null ? null : parseAwsTimestamp(signedAtValue);
  const expires = expiresValue === null ? NaN : Number(expiresValue);
  const credentialParts = credential?.split("/") ?? [];
  const signedHeaderNames = signedHeaders?.split(";") ?? [];
  const relayHeaderNames = new Set([
    "host",
    "cache-control",
    "content-length",
    "content-type",
  ]);
  const requiredSignedHeaders = [
    "cache-control",
    "content-length",
    "content-type",
    "host",
  ];
  const allowedQueryNames = new Set([
    "X-Amz-Algorithm",
    "X-Amz-Content-Sha256",
    "X-Amz-Credential",
    "X-Amz-Date",
    "X-Amz-Expires",
    "X-Amz-Signature",
    "X-Amz-SignedHeaders",
    "x-id",
  ]);

  if (
    algorithm !== "AWS4-HMAC-SHA256" ||
    signedAtValue === null ||
    signedAt === null ||
    !Number.isInteger(expires) ||
    expires < 1 ||
    expires > 300 ||
    signedAt > now + 60_000 ||
    signedAt + expires * 1_000 + 60_000 < now ||
    credentialParts.length !== 5 ||
    credentialParts[0].length < 3 ||
    credentialParts[1] !== signedAtValue.slice(0, 8) ||
    credentialParts[2] !== "auto" ||
    credentialParts[3] !== "s3" ||
    credentialParts[4] !== "aws4_request" ||
    signedHeaders !== requiredSignedHeaders.join(";") ||
    signedHeaderNames.some((name) => !relayHeaderNames.has(name)) ||
    [...url.searchParams.keys()].some((name) => !allowedQueryNames.has(name)) ||
    payloadHash !== "UNSIGNED-PAYLOAD" ||
    operation !== "PutObject" ||
    signature === null ||
    !SIGNATURE_PATTERN.test(signature)
  ) {
    return null;
  }

  return { url: url.toString(), objectKey };
}

function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    const host = request.headers.get("host");
    return (
      host !== null &&
      originUrl.host === host &&
      originUrl.protocol === requestUrl.protocol
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) {
    return jsonError("Cross-site uploads are not accepted.", 403);
  }
  const uploadUrl = request.headers.get("x-english-club-r2-upload") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  const cacheControl = request.headers.get("cache-control") ?? "";
  const contentLengthValue = request.headers.get("content-length");
  const contentLength =
    contentLengthValue === null ? NaN : Number(contentLengthValue);
  const uploadTarget = validatedUploadTarget(uploadUrl);
  const expectedExtension =
    allowedContentTypes[contentType as keyof typeof allowedContentTypes];

  if (!Number.isInteger(contentLength) || contentLength < 1) {
    return jsonError("A valid upload size is required.", 411);
  }
  if (contentLength > MAX_IMAGE_BYTES) {
    return jsonError("Images must be no larger than 10 MB.", 413);
  }

  if (
    uploadTarget === null ||
    expectedExtension === undefined ||
    cacheControl !== IMMUTABLE_CACHE_CONTROL ||
    !uploadTarget.objectKey.endsWith(expectedExtension) ||
    request.body === null
  ) {
    return jsonError("The upload authorization is invalid or expired.", 400);
  }

  let upstream: Response;
  try {
    const upstreamInit: RequestInit & { duplex: "half" } = {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Cache-Control": IMMUTABLE_CACHE_CONTROL,
        "Content-Length": String(contentLength),
      },
      body: request.body,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
      duplex: "half",
    };
    upstream = await fetch(uploadTarget.url, upstreamInit);
  } catch {
    return jsonError(
      "R2 could not be reached. Request a new upload and try again.",
      502,
    );
  }

  if (!upstream.ok) {
    return jsonError(
      "R2 rejected the upload. Request a new upload and try again.",
      502,
    );
  }

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
