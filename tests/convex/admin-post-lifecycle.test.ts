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

const ownerToken = "https://perfect-greyhound-270.convex.site|journal-owner";
const publisherToken =
  "https://perfect-greyhound-270.convex.site|journal-publisher";
const editorToken = "https://perfect-greyhound-270.convex.site|journal-editor";

const editorJson = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "A careful listening circle gives every member enough room to finish a thought, notice a new expression, ask a useful follow-up question, and carry the conversation forward together.",
        },
      ],
    },
  ],
});

async function bootstrapJournal() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.adminUsers.bootstrapOwner, {
    tokenIdentifier: ownerToken,
    displayName: "Journal Owner",
    email: "journal-owner@example.com",
  });
  const owner = t.withIdentity({ tokenIdentifier: ownerToken });
  await owner.mutation(api.adminUsers.setAccess, {
    tokenIdentifier: publisherToken,
    displayName: "Journal Publisher",
    role: "publisher",
    status: "active",
  });
  await owner.mutation(api.adminUsers.setAccess, {
    tokenIdentifier: editorToken,
    displayName: "Journal Editor",
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

async function saveStory(
  editor: ReturnType<Awaited<ReturnType<typeof bootstrapJournal>>["t"]["withIdentity"]>,
) {
  const result = await editor.mutation(api.adminPosts.saveDraft, {
    expectedRevision: 0,
    slug: "listening-circle-notes",
    title: "Listening circle notes",
    excerpt:
      "A practical record of how one listening circle made room for a better club conversation.",
    category: "Practice notes",
    authorName: "English Club Editorial",
    featured: false,
    editorJson,
  });
  if (!result.ok) throw new Error("Expected the initial journal save to succeed.");
  return result;
}

describe("admin journal lifecycle management", () => {
  it("archives and restores a published story with role gates and an audit trail", async () => {
    const { t, owner, publisher, editor } = await bootstrapJournal();
    const saved = await saveStory(editor);
    await publisher.mutation(api.adminPosts.publish, {
      postId: saved.postId,
      expectedRevision: saved.revision,
    });

    await expect(
      editor.mutation(api.adminPosts.archive, { postId: saved.postId }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.adminPosts.archive, { postId: saved.postId }),
    ).rejects.toThrow();

    await publisher.mutation(api.adminPosts.archive, { postId: saved.postId });
    await expect(
      t.query(api.posts.getPublishedBySlug, {
        slug: "listening-circle-notes",
      }),
    ).resolves.toBeNull();
    await expect(
      publisher.mutation(api.adminPosts.archive, { postId: saved.postId }),
    ).rejects.toThrow("already archived");
    await expect(
      editor.mutation(api.adminPosts.restore, { postId: saved.postId }),
    ).rejects.toThrow();

    await expect(
      owner.mutation(api.adminPosts.restore, { postId: saved.postId }),
    ).resolves.toEqual({ status: "published" });
    await expect(
      t.query(api.posts.getPublishedBySlug, {
        slug: "listening-circle-notes",
      }),
    ).resolves.toMatchObject({ title: "Listening circle notes" });
    await expect(
      publisher.mutation(api.adminPosts.restore, { postId: saved.postId }),
    ).rejects.toThrow("Only archived");

    const audit = await owner.query(api.adminAudit.listPage, {
      area: "journal",
      paginationOpts: { cursor: null, numItems: 30 },
    });
    const lifecycleEvents = audit.page.filter(
      (event) =>
        event.resourceId === saved.postId &&
        (event.action === "archive" || event.action === "restore"),
    );
    expect(lifecycleEvents.map((event) => event.action)).toEqual([
      "restore",
      "archive",
    ]);
    expect(lifecycleEvents.map((event) => event.summary)).toEqual([
      "Listening circle notes restored to published",
      "Listening circle notes archived from published",
    ]);
  });

  it("restores a never-published story to a private draft", async () => {
    const { t, publisher, editor } = await bootstrapJournal();
    const saved = await saveStory(editor);

    await publisher.mutation(api.adminPosts.archive, { postId: saved.postId });
    await expect(
      publisher.mutation(api.adminPosts.restore, { postId: saved.postId }),
    ).resolves.toEqual({ status: "draft" });

    const workspace = await publisher.query(api.adminPosts.getWorkspace, {
      postId: saved.postId,
    });
    expect(workspace?.post.status).toBe("draft");
    await expect(
      t.query(api.posts.getPublishedBySlug, {
        slug: "listening-circle-notes",
      }),
    ).resolves.toBeNull();
  });

  it("fails closed to draft when an archived publication has lost its revision", async () => {
    const { t, publisher, editor } = await bootstrapJournal();
    const saved = await saveStory(editor);
    await publisher.mutation(api.adminPosts.publish, {
      postId: saved.postId,
      expectedRevision: saved.revision,
    });
    await publisher.mutation(api.adminPosts.archive, { postId: saved.postId });
    await t.run(async (ctx) => {
      await ctx.db.delete("postRevisions", saved.revisionId);
    });

    await expect(
      publisher.mutation(api.adminPosts.restore, { postId: saved.postId }),
    ).resolves.toEqual({ status: "draft" });
    await expect(
      t.query(api.posts.getPublishedBySlug, {
        slug: "listening-circle-notes",
      }),
    ).resolves.toBeNull();
  });
});
