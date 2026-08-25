import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { developmentSeedMembers } from "../../content/member-development-seed";
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
      mediaInserted: 15,
      mediaExisting: 0,
    });
    await expect(
      t.mutation(internal.developmentSeed.seedMembers, { confirm, portraits }),
    ).resolves.toEqual({
      inserted: 0,
      existing: 15,
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
      t.query(internal.developmentSeed.verify, { confirm }),
    ).resolves.toEqual({
      members: 15,
      memberMedia: 15,
      themePresets: 4,
      publicThemeReady: true,
      contentExpected: 425,
      contentPublished: 0,
    });

    const publishedMembers = await t.query(api.members.listPublished, { limit: 120 });
    expect(publishedMembers).toHaveLength(15);
    expect(
      publishedMembers.every((member) =>
        member.photo?.objectKey.startsWith("members/development-seed-v1/") ?? false,
      ),
    ).toBe(true);

    const owner = t.withIdentity({ tokenIdentifier: ownerToken });
    const [presets, adminMembers] = await Promise.all([
      owner.query(api.adminThemes.listPresets, {}),
      owner.query(api.adminMembers.listPage, {
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
  });
});
