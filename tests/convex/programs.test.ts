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

const ownerToken = "https://perfect-greyhound-270.convex.site|program-owner";
const publisherToken = "https://perfect-greyhound-270.convex.site|program-publisher";
const editorToken = "https://perfect-greyhound-270.convex.site|program-editor";

async function bootstrap() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.adminUsers.bootstrapOwner, {
    tokenIdentifier: ownerToken,
    displayName: "Programme Owner",
  });
  const owner = t.withIdentity({ tokenIdentifier: ownerToken });
  await owner.mutation(api.adminUsers.setAccess, {
    tokenIdentifier: publisherToken,
    displayName: "Programme Publisher",
    role: "publisher",
    status: "active",
  });
  await owner.mutation(api.adminUsers.setAccess, {
    tokenIdentifier: editorToken,
    displayName: "Programme Editor",
    role: "editor",
    status: "active",
  });
  return {
    t,
    owner,
    publisher: t.withIdentity({ tokenIdentifier: publisherToken }),
    editor: t.withIdentity({ tokenIdentifier: editorToken }),
  };
}

const completedRecord = {
  expectedDraftRevision: 0,
  slug: "campus-language-exchange",
  title: "Campus Language Exchange",
  summary:
    "A documented English exchange gives students a real audience for careful questions and cross-cultural listening.",
  body:
    "Students met visiting speakers for a guided exchange built around listening, direct questions, and practical English. The public account stays within the event details supported by the official source.",
  category: "exchange" as const,
  deliveryState: "completed" as const,
  audience: "Universitas Jambi students",
  dateLabel: "20 August 2025",
  startsAt: Date.UTC(2025, 7, 20),
  locationLabel: "Universitas Jambi",
  communityBenefit:
    "A campus-wide opportunity to practise English with people beyond the usual classroom.",
  sourceLabel: "Universitas Jambi news record",
  sourceUrl: "https://www.unja.ac.id/example-programme-record/",
  featured: true,
  sortOrder: 10,
};

describe("programme publication lifecycle", () => {
  it("keeps editor work private until a publisher releases the exact revision", async () => {
    const { t, editor, publisher } = await bootstrap();
    const saved = await editor.mutation(
      api.adminPrograms.saveWorkingCopy,
      completedRecord,
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) throw new Error("Expected programme save to succeed.");

    await expect(t.query(api.programs.listPublished, {})).resolves.toEqual([]);
    await expect(
      editor.mutation(api.adminPrograms.publish, {
        programId: saved.programId,
        expectedRevision: saved.revision,
      }),
    ).rejects.toThrow();

    await publisher.mutation(api.adminPrograms.publish, {
      programId: saved.programId,
      expectedRevision: saved.revision,
    });
    const publicPrograms = await t.query(api.programs.listPublished, {});
    expect(publicPrograms).toHaveLength(1);
    expect(publicPrograms[0]).toMatchObject({
      slug: completedRecord.slug,
      title: completedRecord.title,
      deliveryState: "completed",
      sourceUrl: completedRecord.sourceUrl,
    });
    expect(publicPrograms[0]).not.toHaveProperty("createdBy");
    expect(publicPrograms[0]).not.toHaveProperty("publishedRevisionId");

    const workspace = await editor.query(api.adminPrograms.getWorkspace, {
      programId: saved.programId,
    });
    expect(workspace?.workingCopy).toBeNull();
    expect(workspace?.publishedVersion?.revision).toBe(1);
  });

  it("requires proof for completed claims but permits an explicitly planned direction", async () => {
    const { editor } = await bootstrap();
    await expect(
      editor.mutation(api.adminPrograms.saveWorkingCopy, {
        ...completedRecord,
        sourceLabel: undefined,
        sourceUrl: undefined,
      }),
    ).rejects.toThrow("documented record needs a date and an official source");

    await expect(
      editor.mutation(api.adminPrograms.saveWorkingCopy, {
        ...completedRecord,
        slug: "community-english-service",
        title: "Community English Service",
        deliveryState: "planned",
        category: "community",
        startsAt: undefined,
        dateLabel: undefined,
        sourceLabel: undefined,
        sourceUrl: undefined,
      }),
    ).resolves.toMatchObject({ ok: true, revision: 1 });
  });

  it("archives and restores without erasing revisions or audit history", async () => {
    const { t, editor, publisher, owner } = await bootstrap();
    const saved = await editor.mutation(
      api.adminPrograms.saveWorkingCopy,
      completedRecord,
    );
    if (!saved.ok) throw new Error("Expected programme save to succeed.");
    await publisher.mutation(api.adminPrograms.publish, {
      programId: saved.programId,
      expectedRevision: saved.revision,
    });
    await publisher.mutation(api.adminPrograms.archive, {
      programId: saved.programId,
    });
    await expect(t.query(api.programs.listPublished, {})).resolves.toEqual([]);
    await expect(
      editor.mutation(api.adminPrograms.restore, {
        programId: saved.programId,
      }),
    ).rejects.toThrow();
    await expect(
      publisher.mutation(api.adminPrograms.restore, {
        programId: saved.programId,
      }),
    ).resolves.toEqual({ status: "published" });

    const audit = await owner.query(api.adminAudit.listPage, {
      area: "programs",
      paginationOpts: { cursor: null, numItems: 30 },
    });
    expect(audit.page.map((event) => event.action)).toEqual([
      "restore",
      "archive",
      "publish",
      "create",
    ]);
  });

  it("rejects stale working-copy saves instead of overwriting another editor", async () => {
    const { editor } = await bootstrap();
    const first = await editor.mutation(
      api.adminPrograms.saveWorkingCopy,
      completedRecord,
    );
    if (!first.ok) throw new Error("Expected programme save to succeed.");
    await expect(
      editor.mutation(api.adminPrograms.saveWorkingCopy, {
        ...completedRecord,
        programId: first.programId,
        expectedDraftRevision: 0,
        summary:
          "A stale editor attempts to replace a newer programme working copy without seeing the first saved revision.",
      }),
    ).resolves.toEqual({
      ok: false,
      code: "conflict",
      currentDraftRevision: 1,
    });
  });

  it("keeps the protected catalogue cursor-bounded when filtering by status", async () => {
    const { editor, publisher } = await bootstrap();
    const saved = await editor.mutation(
      api.adminPrograms.saveWorkingCopy,
      completedRecord,
    );
    if (!saved.ok) throw new Error("Expected programme save to succeed.");
    await publisher.mutation(api.adminPrograms.publish, {
      programId: saved.programId,
      expectedRevision: saved.revision,
    });

    const result = await editor.query(api.adminPrograms.listPage, {
      status: "published",
      paginationOpts: {
        cursor: null,
        numItems: 20,
        maximumRowsRead: 20,
      },
    });

    expect(result.page).toHaveLength(1);
    expect(result.page[0]).toMatchObject({
      title: completedRecord.title,
      status: "published",
      hasWorkingCopy: false,
    });
    expect(result.isDone).toBe(true);
  });
});
