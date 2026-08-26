import { Scrypt } from "lucia";
import { describe, expect, it } from "vitest";

import {
  BCRYPT_COST,
  hashPasswordSecret,
  inspectPasswordHash,
  verifyPasswordSecret,
} from "../../convex/lib/passwordCrypto";
import { assertPasswordRequirements } from "../../convex/lib/passwordPolicy";

function testCredential(label: string, sequence: number) {
  return `${label}Credential${sequence}Alpha!`;
}

describe("administrator password crypto", () => {
  it("stores new credentials as bcrypt without exposing the password", async () => {
    const password = testCredential("Stable", 42);
    const differentPassword = testCredential("Different", 42);
    const storedHash = await hashPasswordSecret(password);

    expect(storedHash).not.toContain(password);
    expect(storedHash).toMatch(/^\$2[aby]\$10\$/);
    expect(inspectPasswordHash(storedHash)).toEqual({
      algorithm: "bcrypt",
      bcryptCost: BCRYPT_COST,
    });
    await expect(verifyPasswordSecret(password, storedHash)).resolves.toBe(true);
    await expect(
      verifyPasswordSecret(differentPassword, storedHash),
    ).resolves.toBe(false);
  });

  it("keeps legacy Scrypt accounts readable until their explicit reset", async () => {
    const password = testCredential("Legacy", 42);
    const differentPassword = testCredential("Different", 42);
    const storedHash = await new Scrypt().hash(password);

    expect(inspectPasswordHash(storedHash)).toEqual({
      algorithm: "legacy-scrypt",
    });
    await expect(verifyPasswordSecret(password, storedHash)).resolves.toBe(true);
    await expect(
      verifyPasswordSecret(differentPassword, storedHash),
    ).resolves.toBe(false);
  });

  it("rejects input that bcrypt would silently truncate", () => {
    expect(() => assertPasswordRequirements(`Aa1${"x".repeat(70)}`)).toThrow(
      "72-byte limit",
    );
  });
});
