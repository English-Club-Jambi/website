import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/journal", () => ({
  getSitemapPosts: vi.fn(async () => []),
}));

import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

describe("sitemap", () => {
  it("indexes the Assessment Lab overview without exposing private attempt routes", async () => {
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);

    expect(paths).toContain("/practice");
    expect(paths.some((path) => path.startsWith("/practice/attempt/"))).toBe(false);
    expect(paths.some((path) => path.startsWith("/practice/result/"))).toBe(false);
  });

  it("keeps admin and learner-specific attempt URLs out of crawler paths", () => {
    const rules = robots().rules;
    const firstRule = Array.isArray(rules) ? rules[0] : rules;

    expect(firstRule?.disallow).toEqual(
      expect.arrayContaining([
        "/admin",
        "/practice/attempt/",
        "/practice/result/",
      ]),
    );
  });
});
