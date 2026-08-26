import bcrypt from "bcryptjs";
import { Scrypt } from "lucia";

// Convex queries and mutations have a one-second user-code limit. Cost 10
// preserves bcrypt's adaptive work factor while leaving headroom for the
// surrounding Convex Auth transaction.
export const BCRYPT_COST = 10;

const bcryptHashPattern = /^\$2[aby]\$(\d{2})\$/;
const legacyScryptHashPattern = /^[0-9a-f]{32}:[0-9a-f]{128}$/;

export type PasswordHashAlgorithm =
  | "bcrypt"
  | "legacy-scrypt"
  | "unknown";

export function inspectPasswordHash(hash: string): {
  algorithm: PasswordHashAlgorithm;
  bcryptCost?: number;
} {
  const bcryptMatch = bcryptHashPattern.exec(hash);
  if (bcryptMatch !== null) {
    return { algorithm: "bcrypt", bcryptCost: Number(bcryptMatch[1]) };
  }
  if (legacyScryptHashPattern.test(hash)) {
    return { algorithm: "legacy-scrypt" };
  }
  return { algorithm: "unknown" };
}

export async function hashPasswordSecret(secret: string) {
  if (bcrypt.truncates(secret)) {
    throw new Error("Password exceeds bcrypt's 72-byte input limit.");
  }
  return bcrypt.hashSync(secret, BCRYPT_COST);
}

export async function verifyPasswordSecret(secret: string, storedHash: string) {
  const { algorithm } = inspectPasswordHash(storedHash);
  if (algorithm === "bcrypt") {
    return bcrypt.compareSync(secret, storedHash);
  }
  if (algorithm === "legacy-scrypt") {
    return await new Scrypt().verify(storedHash, secret);
  }
  return false;
}
