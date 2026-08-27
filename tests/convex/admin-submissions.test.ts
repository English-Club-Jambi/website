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

const ownerToken = "https://identity.example|contact-owner";
const editorToken = "https://identity.example|contact-editor";

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.adminUsers.bootstrapOwner, {
    tokenIdentifier: ownerToken,
    displayName: "Contact Owner",
  });
  const owner = t.withIdentity({ tokenIdentifier: ownerToken });
  await owner.mutation(api.adminUsers.setAccess, {
    tokenIdentifier: editorToken,
    displayName: "Contact Editor",
    role: "editor",
    status: "active",
  });
  return { t, owner, editor: t.withIdentity({ tokenIdentifier: editorToken }) };
}

async function submit(
  t: ReturnType<typeof convexTest>,
  input: {
    name: string;
    email: string;
    intent: "join" | "partner" | "ask";
    message: string;
  },
) {
  await t.mutation(api.submissions.create, {
    ...input,
    consent: true,
  });
}

describe("admin contact desk", () => {
  it("keeps personal submissions behind admin access and uses bounded indexed queues", async () => {
    const { t, editor } = await setup();
    await submit(t, {
      name: "Alya Rahman",
      email: "alya@example.com",
      intent: "join",
      message: "I would like to join the weekly English practice sessions.",
    });
    await submit(t, {
      name: "Bima Pratama",
      email: "bima@example.com",
      intent: "partner",
      message: "Our community would like to propose a shared language workshop.",
    });
    await submit(t, {
      name: "Citra Dewi",
      email: "citra@example.com",
      intent: "ask",
      message: "Could you share when the next open club session will take place?",
    });

    await expect(
      t.query(api.adminSubmissions.listPage, {
        paginationOpts: { cursor: null, numItems: 20 },
      }),
    ).rejects.toThrow();
    await expect(
      t
        .withIdentity({ tokenIdentifier: "https://identity.example|outsider" })
        .query(api.adminSubmissions.listPage, {
          paginationOpts: { cursor: null, numItems: 20 },
        }),
    ).rejects.toThrow();

    const all = await editor.query(api.adminSubmissions.listPage, {
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(all.page).toHaveLength(3);
    expect(Object.keys(all.page[0]).sort()).toEqual(
      [
        "_id",
        "consentAt",
        "createdAt",
        "email",
        "intent",
        "message",
        "name",
        "status",
        "updatedAt",
      ].sort(),
    );
    expect(all.page[0]).not.toHaveProperty("normalizedEmail");
    expect(all.page[0]).not.toHaveProperty("sourcePath");

    const joins = await editor.query(api.adminSubmissions.listPage, {
      intent: "join",
      status: "new",
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(joins.page).toHaveLength(1);
    expect(joins.page[0]).toMatchObject({
      name: "Alya Rahman",
      intent: "join",
      status: "new",
    });

    await expect(
      editor.query(api.adminSubmissions.listPage, {
        paginationOpts: { cursor: null, numItems: 19 },
      }),
    ).rejects.toThrow("page size is invalid");
  });

  it("records status changes with optimistic concurrency and a PII-free audit summary", async () => {
    const { t, editor } = await setup();
    await submit(t, {
      name: "Damar Putra",
      email: "damar@example.com",
      intent: "ask",
      message: "May I visit a session before deciding whether to join the club?",
    });
    const before = await editor.query(api.adminSubmissions.listPage, {
      intent: "ask",
      paginationOpts: { cursor: null, numItems: 20 },
    });
    const submission = before.page[0];

    await expect(
      t
        .withIdentity({ tokenIdentifier: "https://identity.example|outsider" })
        .mutation(api.adminSubmissions.setStatus, {
          id: submission._id,
          status: "spam",
          expectedUpdatedAt: submission.updatedAt,
        }),
    ).rejects.toThrow();

    const changed = await editor.mutation(api.adminSubmissions.setStatus, {
      id: submission._id,
      status: "reviewing",
      expectedUpdatedAt: submission.updatedAt,
    });
    expect(changed).toMatchObject({ ok: true, status: "reviewing" });

    await expect(
      editor.mutation(api.adminSubmissions.setStatus, {
        id: submission._id,
        status: "closed",
        expectedUpdatedAt: submission.updatedAt,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "conflict",
      currentStatus: "reviewing",
    });

    const reviewing = await editor.query(api.adminSubmissions.listPage, {
      status: "reviewing",
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(reviewing.page).toHaveLength(1);

    const events = await t.run(async (ctx) =>
      ctx.db
        .query("cmsAuditEvents")
        .withIndex("by_area_and_created_at", (q) => q.eq("area", "contact"))
        .take(5),
    );
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("ask submission marked reviewing");
    expect(events[0].summary).not.toContain("Damar");
    expect(events[0].summary).not.toContain("damar@example.com");
  });

  it("erases verified privacy requests without leaving personal data in the audit log", async () => {
    const { t, owner, editor } = await setup();
    await submit(t, {
      name: "Eka Saputra",
      email: "eka@example.com",
      intent: "join",
      message: "Please remove the contact message I sent while asking to join.",
    });
    const before = await editor.query(api.adminSubmissions.listPage, {
      intent: "join",
      paginationOpts: { cursor: null, numItems: 20 },
    });
    const submission = before.page[0];

    await expect(
      t
        .withIdentity({ tokenIdentifier: "https://identity.example|outsider" })
        .mutation(api.adminSubmissions.deleteSubmission, {
          id: submission._id,
          expectedUpdatedAt: submission.updatedAt,
        }),
    ).rejects.toThrow();

    await expect(
      owner.mutation(api.adminSubmissions.deleteSubmission, {
        id: submission._id,
        expectedUpdatedAt: submission.updatedAt - 1,
      }),
    ).resolves.toMatchObject({ ok: false, code: "conflict" });

    await expect(
      owner.mutation(api.adminSubmissions.deleteSubmission, {
        id: submission._id,
        expectedUpdatedAt: submission.updatedAt,
      }),
    ).resolves.toEqual({ ok: true, deleted: true });

    const after = await editor.query(api.adminSubmissions.listPage, {
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(after.page).toHaveLength(0);

    const events = await t.run(async (ctx) =>
      ctx.db
        .query("cmsAuditEvents")
        .withIndex("by_area_and_created_at", (q) => q.eq("area", "contact"))
        .order("desc")
        .take(1),
    );
    expect(events[0].summary).toBe(
      "join submission erased after a privacy request",
    );
    expect(JSON.stringify(events[0])).not.toContain("Eka");
    expect(JSON.stringify(events[0])).not.toContain("eka@example.com");
  });

  it("purges contact messages after the published 180-day limit", async () => {
    const { t } = await setup();
    const now = Date.now();
    const oldId = await t.run(async (ctx) =>
      ctx.db.insert("contactSubmissions", {
        name: "Old Contact",
        email: "old@example.com",
        normalizedEmail: "old@example.com",
        intent: "ask",
        message: "This record is beyond the public retention limit.",
        status: "closed",
        consentAt: now - 181 * 24 * 60 * 60 * 1000,
        createdAt: now - 181 * 24 * 60 * 60 * 1000,
        updatedAt: now - 181 * 24 * 60 * 60 * 1000,
        sourcePath: "/contact",
      }),
    );
    const recentId = await t.run(async (ctx) =>
      ctx.db.insert("contactSubmissions", {
        name: "Recent Contact",
        email: "recent@example.com",
        normalizedEmail: "recent@example.com",
        intent: "ask",
        message: "This record is still inside the published retention limit.",
        status: "new",
        consentAt: now - 30 * 24 * 60 * 60 * 1000,
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        updatedAt: now - 30 * 24 * 60 * 60 * 1000,
        sourcePath: "/contact",
      }),
    );

    await expect(
      t.mutation(internal.submissions.purgeExpired, {}),
    ).resolves.toEqual({ deleted: 1, hasMore: false });
    await expect(t.run((ctx) => ctx.db.get("contactSubmissions", oldId))).resolves.toBeNull();
    await expect(t.run((ctx) => ctx.db.get("contactSubmissions", recentId))).resolves.not.toBeNull();
  });
});
