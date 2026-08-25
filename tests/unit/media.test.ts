import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { media, resolveMediaUrl } from "@/content/media";

describe("public media manifest", () => {
  const entries = Object.values(media);

  it("has unique keys and excludes held masters", () => {
    const keys = entries.map((item) => item.key);
    const sources = entries.map((item) => item.sourceFile);

    expect(new Set(keys).size).toBe(keys.length);
    expect(sources).not.toContain("IMG_3165.JPG");
    expect(sources).not.toContain("MVI_3166.MOV");
    expect(sources).not.toContain("_MG_8144.JPG");
    expect(sources).not.toContain("IMG_4945.JPG");
  });

  it("points to both WebP and AVIF derivatives with valid dimensions", () => {
    for (const item of entries) {
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
      expect(item.src.endsWith(".webp")).toBe(true);
      expect(item.avifSrc.endsWith(".avif")).toBe(true);
      expect(existsSync(join(process.cwd(), "public", item.objectKey))).toBe(true);
      expect(existsSync(join(process.cwd(), "public", item.avifObjectKey))).toBe(true);
    }
  });

  it("maps one object key to local preview and versioned R2 bases", () => {
    expect(resolveMediaUrl("images/example.webp", "")).toBe(
      "/images/example.webp",
    );
    expect(
      resolveMediaUrl(
        "images/example.webp",
        "https://media.example.com/english-club/v1/",
      ),
    ).toBe("https://media.example.com/english-club/v1/images/example.webp");
  });

  it("keeps consent explicit and alt text factual", () => {
    for (const item of entries) {
      expect(["pending", "cleared"]).toContain(item.consent);
      expect(item.alt.length).toBeGreaterThan(20);
      expect(item.captureDateVerified).toBe(false);
    }
  });
});
