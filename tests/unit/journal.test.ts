import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatPublishedDate,
  getPublishedPostsPage,
  getPublishedPost,
  getPublishedPosts,
  parseJournalCursor,
} from "@/lib/journal";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("journal Convex adapter", () => {
  it("does not substitute hardcoded posts without a Convex URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const posts = await getPublishedPosts(2);

    expect(posts).toEqual([]);
  });

  it("returns null without a Convex deployment instead of a local story", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      getPublishedPost("A-ROOM-MADE-FOR-TRYING-AGAIN"),
    ).resolves.toBeNull();
  });

  it("formats editorial timestamps in UTC", () => {
    expect(formatPublishedDate(Date.UTC(2026, 7, 25))).toBe("25 August 2026");
  });

  it("returns an honest unavailable archive without a Convex URL", async () => {
    vi.stubEnv("CONVEX_URL", "");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const page = await getPublishedPostsPage();

    expect(page).toEqual({
      state: "unavailable",
      posts: [],
      isDone: true,
      continueCursor: null,
    });
  });

  it("does not replace a cursor-page failure with first-page seeds", async () => {
    vi.stubEnv("CONVEX_URL", "");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const page = await getPublishedPostsPage("opaque-cursor");

    expect(page).toEqual({
      state: "unavailable",
      posts: [],
      isDone: true,
      continueCursor: null,
    });
  });

  it("accepts only one bounded opaque cursor string", () => {
    expect(parseJournalCursor(undefined)).toEqual({ state: "first" });
    expect(parseJournalCursor("opaque+/=cursor")).toEqual({
      state: "cursor",
      cursor: "opaque+/=cursor",
    });
    expect(parseJournalCursor(["one", "two"])).toEqual({ state: "invalid" });
    expect(parseJournalCursor(" ")).toEqual({ state: "invalid" });
    expect(parseJournalCursor("x".repeat(2_049))).toEqual({ state: "invalid" });
  });
});
