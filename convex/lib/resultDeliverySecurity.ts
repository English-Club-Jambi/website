const requestIdPattern = /^[a-zA-Z0-9_-]{16,96}$/;
const tokenPattern = /^[a-zA-Z0-9_-]{43}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

export function normalizeDeliveryRequestId(value: string) {
  const requestId = value.trim();
  if (!requestIdPattern.test(requestId)) {
    throw new Error("Delivery request ID is invalid.");
  }
  return requestId;
}

export function normalizeReviewAccessToken(value: string) {
  const token = value.trim();
  if (!tokenPattern.test(token)) {
    return null;
  }
  return token;
}

export function assertSha256(value: string) {
  if (!sha256Pattern.test(value)) {
    throw new Error("Delivery digest is invalid.");
  }
  return value;
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function randomAccessToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export function maskEmail(value: string) {
  const [local = "", domain = ""] = value.split("@");
  const first = local.slice(0, 1);
  return `${first}${"•".repeat(Math.max(3, Math.min(7, local.length - 1)))}@${domain}`;
}
