import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getMedia,
  legacyMediaAliases,
  media,
  resolveMediaUrl,
} from "@/content/media";

describe("public media manifest", () => {
  const entries = Object.values(media);

  it("has unique keys and includes only generated, release-ready sources", () => {
    const keys = entries.map((item) => item.key);
    const sources = entries.map((item) => item.sourceFile);

    expect(new Set(keys).size).toBe(keys.length);
    expect(sources.every((source) => source.startsWith("generated-"))).toBe(true);
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

  it("keeps rights, consent, provenance, and people boundaries explicit", () => {
    for (const item of entries) {
      expect(item.rights).toBe("cleared");
      expect(item.consent).toBe("cleared");
      expect(item.provenance).toBe("generated-synthetic");
      expect(item.containsRealPeople).toBe(false);
      expect(item.alt.length).toBeGreaterThan(20);
      expect(item.captureDateVerified).toBe(false);
    }
  });

  it("routes every legacy documentary key to a cleared synthetic replacement", () => {
    for (const [legacyKey, replacementKey] of Object.entries(
      legacyMediaAliases,
    )) {
      expect(getMedia(legacyKey)).toBe(media[replacementKey]);
    }
  });

  it("keeps consent-pending documentary derivatives outside public storage", () => {
    const publicFiles = readdirSync(join(process.cwd(), "public", "images")).sort();
    const allowedPublicFiles = [
      "about-record-relay-v2.avif",
      "about-record-relay-v2.webp",
      "activity-exchange-relay-v2.avif",
      "activity-exchange-relay-v2.webp",
      "activity-make-relay-v2.avif",
      "activity-make-relay-v2.webp",
      "activity-room-relay-v2.avif",
      "activity-room-relay-v2.webp",
      "activity-speak-relay-v2.avif",
      "activity-speak-relay-v2.webp",
      "conversation-hero-placeholder.avif",
      "conversation-hero-placeholder.webp",
      "conversation-relay-hero-v2.avif",
      "conversation-relay-hero-v2.webp",
      "member-directory-portraits-v1.avif",
      "member-directory-portraits-v1.webp",
      "member-relay-placeholder.avif",
      "member-relay-placeholder.webp",
    ];

    expect(publicFiles).toEqual(allowedPublicFiles);
  });
});
