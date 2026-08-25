import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";

import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const rawModules = import.meta.glob("../../convex/**/*.ts");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, loader]) => [
    path.replace("../../convex", "."),
    loader,
  ]),
);

describe("Convex journal", () => {
  it("seeds idempotently", async () => {
    const t = convexTest(schema, modules);

    await expect(t.mutation(internal.seed.run, {})).resolves.toEqual({
      inserted: 3,
      skipped: 0,
    });
    await expect(t.mutation(internal.seed.run, {})).resolves.toEqual({
      inserted: 0,
      skipped: 3,
    });
  });

  it("returns only published records in descending order and respects limits", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.run, {});

    await t.run(async (ctx) => {
      const now = Date.UTC(2026, 7, 26);
      await ctx.db.insert("posts", {
        slug: "private-draft",
        title: "Private draft",
        excerpt: "This draft must remain outside every public list response.",
        body: "This is a private test body with enough text to satisfy the fixture shape.",
        category: "Draft",
        authorName: "English Club",
        status: "draft",
        featured: false,
        createdAt: now,
        updatedAt: now,
      });
    });

    const posts = await t.query(api.posts.listPublished, { limit: 2 });

    expect(posts).toHaveLength(2);
    expect(posts[0].publishedAt).toBeGreaterThan(posts[1].publishedAt);
    expect(posts.map((post) => post.slug)).not.toContain("private-draft");
    expect(Object.keys(posts[0])).not.toContain("status");
  });

  it("returns null for draft, archived, malformed, and unknown slugs", async () => {
    const t = convexTest(schema, modules);
    const now = Date.UTC(2026, 7, 26);

    await t.run(async (ctx) => {
      for (const status of ["draft", "archived"] as const) {
        await ctx.db.insert("posts", {
          slug: `${status}-story`,
          title: `${status} story`,
          excerpt: "This record exists to prove private states stay private.",
          body: "This is a private test body with enough text to satisfy the fixture shape.",
          category: "Test",
          authorName: "English Club",
          status,
          featured: false,
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    await expect(
      t.query(api.posts.getPublishedBySlug, { slug: "draft-story" }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.posts.getPublishedBySlug, { slug: "archived-story" }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.posts.getPublishedBySlug, { slug: "Not valid!" }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.posts.getPublishedBySlug, { slug: "unknown-story" }),
    ).resolves.toBeNull();
  });

  it("paginates summary-only archive records without duplicates", async () => {
    const t = convexTest(schema, modules);
    const newest = Date.UTC(2026, 7, 25, 12, 0, 0);

    await t.run(async (ctx) => {
      for (let index = 0; index < 15; index += 1) {
        const publishedAt = newest - index * 60_000;
        await ctx.db.insert("posts", {
          slug: `archive-story-${String(index + 1).padStart(2, "0")}`,
          title: `Archive story ${index + 1}`,
          excerpt: "A bounded archive fixture with a public summary and private body.",
          body: `Body ${index + 1} must never appear in an archive page response.`,
          category: "Practice notes",
          authorName: "English Club",
          status: "published",
          featured: false,
          publishedAt,
          createdAt: publishedAt,
          updatedAt: publishedAt,
        });
      }

      await ctx.db.insert("posts", {
        slug: "archive-private-draft",
        title: "Archive private draft",
        excerpt: "This draft must remain outside the public archive.",
        body: "This private body must not be returned.",
        category: "Draft",
        authorName: "English Club",
        status: "draft",
        featured: false,
        createdAt: newest,
        updatedAt: newest,
      });
    });

    const seen: string[] = [];
    let cursor: string | null = null;
    let pageCount = 0;

    while (true) {
      const result: {
        page: Array<{ slug: string }>;
        isDone: boolean;
        continueCursor: string;
      } = await t.query(api.posts.listPublishedPage, {
        paginationOpts: { numItems: 6, cursor, maximumRowsRead: 6 },
      });
      pageCount += 1;
      expect(result.page.length).toBeLessThanOrEqual(6);
      seen.push(...result.page.map((post) => post.slug));

      for (const post of result.page) {
        expect(post).not.toHaveProperty("body");
        expect(post).not.toHaveProperty("status");
        expect(post).not.toHaveProperty("createdAt");
      }

      if (result.isDone) {
        break;
      }
      cursor = result.continueCursor;
    }

    expect(pageCount).toBe(3);
    expect(seen).toHaveLength(15);
    expect(new Set(seen).size).toBe(15);
    expect(seen[0]).toBe("archive-story-01");
    expect(seen).not.toContain("archive-private-draft");

    await expect(
      t.query(api.posts.listPublishedPage, {
        paginationOpts: {
          numItems: 7,
          cursor: null,
          maximumRowsRead: 6,
        },
      }),
    ).rejects.toThrow("Journal page size is invalid");

    await expect(
      t.query(api.posts.listPublishedPage, {
        paginationOpts: {
          numItems: 6,
          cursor: null,
          maximumRowsRead: 7,
        },
      }),
    ).rejects.toThrow("Journal page size is invalid");
  });
});

describe("Convex contact submissions", () => {
  const validSubmission = {
    name: "Alya",
    email: "alya@example.com",
    intent: "join" as const,
    message: "I would like to ask about joining the next club session.",
    consent: true,
  };

  it("rejects invalid consent and a populated honeypot without inserting", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.submissions.create, {
        ...validSubmission,
        consent: false,
      }),
    ).resolves.toEqual({ ok: false, code: "invalid" });
    await expect(
      t.mutation(api.submissions.create, {
        ...validSubmission,
        website: "https://bot.invalid",
      }),
    ).resolves.toEqual({ ok: false, code: "rejected" });

    const count = await t.run(async (ctx) =>
      ctx.db.query("contactSubmissions").take(10),
    );
    expect(count).toHaveLength(0);
  });

  it("stores a valid message privately and rate-limits the fourth repeat", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T08:00:00.000Z"));
    const t = convexTest(schema, modules);

    for (let index = 0; index < 3; index += 1) {
      await expect(
        t.mutation(api.submissions.create, validSubmission),
      ).resolves.toEqual({ ok: true });
    }

    await expect(
      t.mutation(api.submissions.create, validSubmission),
    ).resolves.toEqual({ ok: false, code: "rate_limited" });

    const records = await t.run(async (ctx) =>
      ctx.db
        .query("contactSubmissions")
        .withIndex("by_normalized_email_created_at", (q) =>
          q.eq("normalizedEmail", "alya@example.com"),
        )
        .take(10),
    );

    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      name: "Alya",
      email: "alya@example.com",
      normalizedEmail: "alya@example.com",
      intent: "join",
      status: "new",
      sourcePath: "/contact",
    });
    vi.useRealTimers();
  });
});

describe("Convex member directory", () => {
  const reviewedCoordinator = {
    slug: "synthetic-coordinator",
    displayName: "Synthetic Coordinator",
    roleLevel: 2 as const,
    division: "academic" as const,
    joinedYear: 2025,
    shortBio:
      "A test-only profile used to verify the public projection contract.",
    profileStatus: "published" as const,
    profileConsentStatus: "cleared" as const,
    photoConsentStatus: "pending" as const,
    sortOrder: 20,
  };

  it("returns only published, consent-cleared, structurally valid profiles", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.members.upsertReviewed, reviewedCoordinator);
    await t.mutation(internal.members.upsertReviewed, {
      slug: "synthetic-draft",
      displayName: "Synthetic Draft",
      roleLevel: 0,
      profileStatus: "draft",
      profileConsentStatus: "cleared",
      photoConsentStatus: "pending",
      sortOrder: 30,
    });
    await t.mutation(internal.members.upsertReviewed, {
      slug: "synthetic-pending",
      displayName: "Synthetic Pending",
      roleLevel: 1,
      profileStatus: "published",
      profileConsentStatus: "pending",
      photoConsentStatus: "pending",
      sortOrder: 40,
    });

    await t.run(async (ctx) => {
      const now = Date.UTC(2026, 7, 25);
      await ctx.db.insert("members", {
        slug: "synthetic-invalid-assignment",
        displayName: "Synthetic Invalid Assignment",
        roleLevel: 2,
        profileStatus: "published",
        profileConsentStatus: "cleared",
        photoConsentStatus: "pending",
        sortOrder: 10,
        createdAt: now,
        updatedAt: now,
      });
    });

    const members = await t.query(api.members.listPublished, {});

    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      slug: "synthetic-coordinator",
      displayName: "Synthetic Coordinator",
      roleLevel: 2,
      division: "academic",
      joinedYear: 2025,
    });
    expect(Object.keys(members[0])).not.toEqual(
      expect.arrayContaining([
        "profileStatus",
        "profileConsentStatus",
        "photoConsentStatus",
      ]),
    );
  });

  it("enforces assignments, updates by slug, and supports indexed role reads", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(internal.members.upsertReviewed, {
        ...reviewedCoordinator,
        slug: "invalid-coordinator",
        division: undefined,
      }),
    ).rejects.toThrow("Member profile input is invalid");

    const firstId = await t.mutation(
      internal.members.upsertReviewed,
      reviewedCoordinator,
    );
    const secondId = await t.mutation(internal.members.upsertReviewed, {
      ...reviewedCoordinator,
      shortBio:
        "An updated test-only profile used to verify idempotent reviewed writes.",
    });
    await t.mutation(internal.members.upsertReviewed, {
      slug: "synthetic-member",
      displayName: "Synthetic Member",
      roleLevel: 0,
      profileStatus: "published",
      profileConsentStatus: "cleared",
      photoConsentStatus: "pending",
      sortOrder: 10,
    });

    expect(secondId).toBe(firstId);
    const coordinators = await t.query(api.members.listPublished, {
      roleLevel: 2,
    });
    expect(coordinators).toHaveLength(1);
    expect(coordinators[0].shortBio).toContain("idempotent reviewed writes");
  });

  it("projects a portrait only after separate photo consent clears", async () => {
    const t = convexTest(schema, modules);
    const photo = {
      objectKey: "members/synthetic-coordinator/profile.webp",
      width: 900,
      height: 1_200,
      alt: "Synthetic coordinator test portrait.",
      focalPoint: "50% 40%",
    };

    await t.mutation(internal.members.upsertReviewed, {
      ...reviewedCoordinator,
      photo,
    });
    const pending = await t.query(api.members.listPublished, {});
    expect(pending[0].photo).toBeUndefined();

    await t.mutation(internal.members.upsertReviewed, {
      ...reviewedCoordinator,
      photo,
      photoConsentStatus: "cleared",
    });
    const cleared = await t.query(api.members.listPublished, {});
    expect(cleared[0].photo).toEqual(photo);
  });

  it("preserves, clears, and validates reviewed joined years", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(internal.members.upsertReviewed, {
        ...reviewedCoordinator,
        joinedYear: 9999,
      }),
    ).rejects.toThrow("Member profile input is invalid");

    await expect(
      t.mutation(internal.members.upsertReviewed, {
        ...reviewedCoordinator,
        joinedYear: 2024.5,
      }),
    ).rejects.toThrow("Member profile input is invalid");

    await t.mutation(internal.members.upsertReviewed, {
      ...reviewedCoordinator,
      joinedYear: 2024,
    });
    await t.mutation(internal.members.upsertReviewed, {
      ...reviewedCoordinator,
      joinedYear: undefined,
      shortBio:
        "A changed test-only profile that keeps its separately reviewed joined year.",
    });

    let member = (await t.query(api.members.listPublished, {}))[0];
    expect(member.joinedYear).toBe(2024);

    await t.mutation(internal.members.upsertReviewed, {
      ...reviewedCoordinator,
      joinedYear: null,
    });
    member = (await t.query(api.members.listPublished, {}))[0];
    expect(member.joinedYear).toBeUndefined();
  });
});
