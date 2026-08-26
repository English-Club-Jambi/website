import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { developmentSeedMembers } from "../../content/member-development-seed";
import { getPublicContentManifestPages } from "../../content/public-content";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const rawModules = import.meta.glob("../../convex/**/*.ts");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, loader]) => [
    path.replace("../../convex", "."),
    loader,
  ]),
);

const confirm = "seed-english-club-development-v1" as const;
const ownerToken = "https://example.test|development-seed-owner";
const publicContentFieldCount = getPublicContentManifestPages().reduce(
  (total, page) => total + Object.keys(page.fields).length,
  0,
);

function harness() {
  return convexTest(schema, modules);
}

beforeEach(() => {
  vi.stubEnv("CONVEX_CLOUD_URL", "http://localhost:3210");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("development database seed", () => {
  it("materializes members and theme schemes once, then exposes both admin and public views", async () => {
    const t = harness();
    await t.mutation(internal.adminUsers.bootstrapOwner, {
      tokenIdentifier: ownerToken,
      displayName: "Development Seed Owner",
      email: "seed-owner@example.test",
    });
    const portraits = developmentSeedMembers.map((member, index) => {
      const checksumSha256 = (index + 1).toString(16).padStart(64, "0");
      return {
        slug: member.slug,
        objectKey: `members/development-seed-v1/${member.slug}-${checksumSha256.slice(0, 16)}.webp`,
        checksumSha256,
        byteSize: 24_000 + index,
        width: 800,
        height: 800,
      };
    });

    await expect(
      t.mutation(internal.developmentSeed.seedMembers, { confirm, portraits }),
    ).resolves.toEqual({
      inserted: 15,
      existing: 0,
      updated: 0,
      divisionsInserted: 5,
      divisionsExisting: 0,
      mediaInserted: 15,
      mediaExisting: 0,
    });
    await expect(
      t.mutation(internal.developmentSeed.seedMembers, { confirm, portraits }),
    ).resolves.toEqual({
      inserted: 0,
      existing: 15,
      updated: 0,
      divisionsInserted: 0,
      divisionsExisting: 5,
      mediaInserted: 0,
      mediaExisting: 15,
    });

    await expect(
      t.mutation(internal.developmentSeed.seedThemePresets, { confirm }),
    ).resolves.toMatchObject({ inserted: 4, updated: 0, publishedInitial: true });
    await expect(
      t.mutation(internal.developmentSeed.seedThemePresets, { confirm }),
    ).resolves.toMatchObject({ inserted: 0, updated: 0, existing: 4, publishedInitial: false });
    await expect(
      t.mutation(internal.developmentSeed.seedJournal, { confirm }),
    ).resolves.toEqual({ inserted: 3, migrated: 0, existing: 0 });
    await expect(
      t.mutation(internal.developmentSeed.seedJournal, { confirm }),
    ).resolves.toEqual({ inserted: 0, migrated: 0, existing: 3 });
    await expect(
      t.mutation(internal.developmentSeed.seedPrograms, { confirm }),
    ).resolves.toEqual({ inserted: 6, existing: 0 });
    await expect(
      t.mutation(internal.developmentSeed.seedPrograms, { confirm }),
    ).resolves.toEqual({ inserted: 0, existing: 6 });

    for (const page of getPublicContentManifestPages()) {
      await expect(
        t.mutation(internal.developmentSeed.seedPublicContentPage, {
          confirm,
          pageKey: page.pageKey,
        }),
      ).resolves.toMatchObject({
        pageKey: page.pageKey,
        inserted: Object.keys(page.fields).length,
        total: Object.keys(page.fields).length,
      });
    }
    for (const page of getPublicContentManifestPages()) {
      await expect(
        t.mutation(internal.developmentSeed.seedPublicContentPage, {
          confirm,
          pageKey: page.pageKey,
        }),
      ).resolves.toMatchObject({
        pageKey: page.pageKey,
        inserted: 0,
        publishedExisting: 0,
        existing: Object.keys(page.fields).length,
      });
    }

    await expect(
      t.query(internal.developmentSeed.verify, { confirm }),
    ).resolves.toEqual({
      members: 15,
      memberMedia: 15,
      memberDivisions: 5,
      themePresets: 4,
      publicThemeReady: true,
      journalPublished: 3,
      journalManaged: 3,
      contentExpected: publicContentFieldCount,
      contentPublished: publicContentFieldCount,
      programsPublished: 6,
      programsManaged: 6,
    });

    const publishedMembers = await t.query(api.members.listPublished, { limit: 120 });
    expect(publishedMembers).toHaveLength(15);
    expect(
      publishedMembers.every((member) =>
        member.photo?.objectKey.startsWith("members/development-seed-v1/") ?? false,
      ),
    ).toBe(true);

    const owner = t.withIdentity({ tokenIdentifier: ownerToken });
    const [presets, adminMembers, adminJournal, adminPrograms] = await Promise.all([
      owner.query(api.adminThemes.listPresets, {}),
      owner.query(api.adminMembers.listPage, {
        paginationOpts: {
          cursor: null,
          numItems: 20,
          maximumRowsRead: 20,
        },
      }),
      owner.query(api.adminPosts.listPage, {
        status: "published",
        paginationOpts: {
          cursor: null,
          numItems: 12,
          maximumRowsRead: 12,
        },
      }),
      owner.query(api.adminPrograms.listPage, {
        status: "published",
        paginationOpts: {
          cursor: null,
          numItems: 20,
          maximumRowsRead: 20,
        },
      }),
    ]);
    expect(presets.map((preset) => preset.name)).toEqual([
      "After Class",
      "Field Notes",
      "Relay Cobalt",
      "Tide Room",
    ]);
    expect(adminMembers.page).toHaveLength(15);
    expect(
      adminMembers.page.every(
        (member) => member.recordOrigin === "development-seed",
      ),
    ).toBe(true);
    expect(adminJournal.page).toHaveLength(3);
    expect(adminJournal.page.every((post) => post.hasDraft)).toBe(true);
    expect(adminPrograms.page).toHaveLength(6);

    const publicPrograms = await t.query(api.programs.listPublished, { limit: 24 });
    expect(publicPrograms).toHaveLength(6);
    expect(publicPrograms.map((program) => program.slug).sort()).toEqual(
      adminPrograms.page.map((program) => program.slug).sort(),
    );

    const publicJournal = await t.query(api.posts.listPublished, { limit: 6 });
    expect(publicJournal).toHaveLength(3);
    expect(publicJournal.map((post) => post.slug)).toEqual(
      adminJournal.page.map((post) => post.slug),
    );

    const practiceCopy = await t.query(api.siteContent.getPublishedPage, {
      pageKey: "practice",
      locale: "en",
    });
    expect(practiceCopy).toHaveLength(
      Object.keys(
        getPublicContentManifestPages().find(
          (page) => page.pageKey === "practice",
        )!.fields,
      ).length,
    );
    expect(
      practiceCopy.find((entry) => entry.contentKey === "full-summary")?.value,
    ).toMatch(/question bank/i);
  });
});
