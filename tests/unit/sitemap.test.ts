import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/journal", () => ({
  getSitemapPosts: vi.fn(async () => [
    {
      slug: "a-room-made-for-trying-again",
      updatedAt: Date.UTC(2026, 7, 24),
    },
  ]),
}));

import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

describe("sitemap", () => {
  it("indexes the Assessment Lab overview without exposing private attempt routes", async () => {
    const entries = await sitemap();
    const paths = entries.map((entry) => new URL(entry.url).pathname);

    expect(paths).toContain("/practice");
    expect(paths).toContain("/practice/full");
    expect(paths).toContain("/practice/quick/listening");
    expect(paths).toContain("/practice/quick/structure");
    expect(paths).toContain("/practice/quick/reading");
    expect(paths).toContain("/programs");
    expect(paths).toContain("/privacy");
    expect(paths).toContain("/journal/a-room-made-for-trying-again");
    expect(paths.some((path) => path.startsWith("/practice/attempt/"))).toBe(false);
    expect(paths.some((path) => path.startsWith("/practice/result/"))).toBe(false);
    expect(
      entries.every(
        (entry) => new URL(entry.url).origin === "https://englishclubjambi.my.id",
      ),
    ).toBe(true);
  });

  it("uses truthful modification dates and omits ignored priority hints", async () => {
    const entries = await sitemap();
    const byPath = new Map(
      entries.map((entry) => [new URL(entry.url).pathname, entry]),
    );

    expect(byPath.get("/")?.lastModified).toEqual(
      new Date(Date.UTC(2026, 7, 24)),
    );
    expect(byPath.get("/journal")?.lastModified).toEqual(
      new Date(Date.UTC(2026, 7, 24)),
    );
    expect(byPath.get("/about")?.lastModified).toBeUndefined();
    expect(byPath.get("/practice")?.lastModified).toBeUndefined();
    expect(byPath.get("/about")?.priority).toBeUndefined();
    expect(byPath.get("/about")?.changeFrequency).toBeUndefined();
  });

  it("keeps admin and learner-specific attempt URLs out of crawler paths", () => {
    const rules = robots().rules;
    const firstRule = Array.isArray(rules) ? rules[0] : rules;

    expect(firstRule?.disallow).toEqual(
      expect.arrayContaining([
        "/admin",
        "/api/admin/",
        "/practice/attempt/",
        "/practice/result/",
      ]),
    );
    expect(robots().sitemap).toBe(
      "https://englishclubjambi.my.id/sitemap.xml",
    );
  });
});
