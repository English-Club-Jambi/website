/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const rawModules = import.meta.glob("../../convex/**/*.ts");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, loader]) => [
    path.replace("../../convex", "."),
    loader,
  ]),
);

const ownerToken = "https://perfect-greyhound-270.convex.site|division-owner";

async function bootstrapDivisions() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.adminUsers.bootstrapOwner, {
    tokenIdentifier: ownerToken,
    displayName: "Division Owner",
    email: "division-owner@example.com",
  });
  return { t, owner: t.withIdentity({ tokenIdentifier: ownerToken }) };
}

async function saveMember(
  owner: ReturnType<Awaited<ReturnType<typeof bootstrapDivisions>>["t"]["withIdentity"]>,
  input: {
    slug: string;
    displayName: string;
    roleLevel: 0 | 1;
    sortOrder: number;
  },
) {
  return await owner.mutation(api.adminMembers.saveReviewed, {
    ...input,
    joinedYear: 2025,
    shortBio: `${input.displayName} helps the club make room for useful practice and shared responsibility.`,
    profileStatus: "published",
    profileConsentStatus: "cleared",
    photoConsentStatus: "pending",
  });
}

describe("admin member division management", () => {
  it("keeps one coordinator per managed division and restores prior roles", async () => {
    const { t, owner } = await bootstrapDivisions();
    const firstMemberId = await saveMember(owner, {
      slug: "nara-pradipta",
      displayName: "Nara Pradipta",
      roleLevel: 0,
      sortOrder: 10,
    });
    const secondMemberId = await saveMember(owner, {
      slug: "salsa-wijaya",
      displayName: "Salsa Wijaya",
      roleLevel: 1,
      sortOrder: 20,
    });

    await expect(
      t.query(api.adminMemberDivisions.list, {}),
    ).rejects.toThrow();

    const divisionId = await owner.mutation(api.adminMemberDivisions.save, {
      slug: "conversation-design",
      name: "Conversation Design",
      summary:
        "Builds prompts and session formats that help every member enter the conversation.",
      status: "active",
      sortOrder: 10,
      coordinatorMemberId: firstMemberId,
    });

    await expect(owner.query(api.adminMemberDivisions.list, {})).resolves.toEqual([
      expect.objectContaining({
        _id: divisionId,
        slug: "conversation-design",
        name: "Conversation Design",
        coordinator: {
          memberId: firstMemberId,
          displayName: "Nara Pradipta",
        },
        hasMembers: true,
      }),
    ]);
    await expect(t.query(api.members.listPublished, {})).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "nara-pradipta",
          roleLevel: 2,
          divisionKey: "conversation-design",
          divisionName: "Conversation Design",
        }),
      ]),
    );

    await owner.mutation(api.adminMemberDivisions.save, {
      divisionId,
      slug: "conversation-design",
      name: "Conversation Design",
      summary:
        "Builds prompts and session formats that help every member enter the conversation.",
      status: "active",
      sortOrder: 10,
      coordinatorMemberId: secondMemberId,
    });

    await expect(
      owner.query(api.adminMembers.getById, { memberId: firstMemberId }),
    ).resolves.toMatchObject({ roleLevel: 0 });
    await expect(
      owner.query(api.adminMembers.getById, { memberId: secondMemberId }),
    ).resolves.toMatchObject({ roleLevel: 2, divisionId });

    const otherDivisionId = await owner.mutation(
      api.adminMemberDivisions.save,
      {
        slug: "event-language",
        name: "Event Language",
        summary:
          "Shapes the words and facilitation used before, during, and after club events.",
        status: "active",
        sortOrder: 20,
        coordinatorMemberId: null,
      },
    );
    await expect(
      owner.mutation(api.adminMemberDivisions.save, {
        divisionId: otherDivisionId,
        slug: "event-language",
        name: "Event Language",
        summary:
          "Shapes the words and facilitation used before, during, and after club events.",
        status: "active",
        sortOrder: 20,
        coordinatorMemberId: secondMemberId,
      }),
    ).rejects.toThrow("already coordinates another division");

    await expect(
      owner.mutation(api.adminMemberDivisions.remove, { divisionId }),
    ).rejects.toThrow("Remove member assignments");

    await owner.mutation(api.adminMemberDivisions.save, {
      divisionId,
      slug: "conversation-design",
      name: "Conversation Design",
      summary:
        "Builds prompts and session formats that help every member enter the conversation.",
      status: "archived",
      sortOrder: 10,
      coordinatorMemberId: null,
    });
    await expect(
      owner.query(api.adminMembers.getById, { memberId: secondMemberId }),
    ).resolves.toMatchObject({ roleLevel: 1 });
    await expect(
      owner.mutation(api.adminMemberDivisions.remove, { divisionId }),
    ).resolves.toBeNull();
  });

  it("rejects core and board profiles as division coordinators", async () => {
    const { owner } = await bootstrapDivisions();
    const coreMemberId = await owner.mutation(api.adminMembers.saveReviewed, {
      slug: "raka-utama",
      displayName: "Raka Utama",
      roleLevel: 3,
      position: "president",
      joinedYear: 2024,
      shortBio:
        "Keeps club decisions connected to the people responsible for carrying them out.",
      profileStatus: "published",
      profileConsentStatus: "cleared",
      photoConsentStatus: "pending",
      sortOrder: 10,
    });

    await expect(
      owner.mutation(api.adminMemberDivisions.save, {
        slug: "partnerships",
        name: "Partnerships",
        summary:
          "Coordinates the language, timing, and follow-up needed for external partnerships.",
        status: "active",
        sortOrder: 30,
        coordinatorMemberId: coreMemberId,
      }),
    ).rejects.toThrow("must keep their existing positions");
  });
});
