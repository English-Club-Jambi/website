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

describe("journal fallback adapter", () => {
  it("returns bounded seed records newest first without a Convex URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const posts = await getPublishedPosts(2);

    expect(posts).toHaveLength(2);
    expect(posts[0].publishedAt).toBeGreaterThan(posts[1].publishedAt);
    expect(posts[0].slug).toBe(
      "leeds-the-way-bridging-england-and-indonesia",
    );
  });

  it("returns one known record and null for an unknown slug", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const known = await getPublishedPost("A-ROOM-MADE-FOR-TRYING-AGAIN");
    const unknown = await getPublishedPost("not-in-the-journal");

    expect(known?.title).toBe("A room made for trying again");
    expect(unknown).toBeNull();
  });

  it("formats editorial timestamps in UTC", () => {
    expect(formatPublishedDate(Date.UTC(2026, 7, 25))).toBe("25 August 2026");
  });

  it("returns summary-only local archive fallback on the first page", async () => {
    vi.stubEnv("CONVEX_URL", "");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const page = await getPublishedPostsPage();

    expect(page.state).toBe("fallback");
    expect(page.posts).toHaveLength(3);
    expect(page.continueCursor).toBeNull();
    expect(page.posts[0]).not.toHaveProperty("body");
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
