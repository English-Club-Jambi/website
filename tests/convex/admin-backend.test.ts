import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "../../convex/_generated/api";
import { validateEditorDocument } from "../../convex/lib/editorDocument";
import schema from "../../convex/schema";

const rawModules = import.meta.glob("../../convex/**/*.ts");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, loader]) => [
    path.replace("../../convex", "."),
    loader,
  ]),
);

const ownerToken = "https://perfect-greyhound-270.convex.site|owner-user";
const publisherToken =
  "https://perfect-greyhound-270.convex.site|publisher-user";
const editorToken = "https://perfect-greyhound-270.convex.site|editor-user";
const testIssuer = "https://perfect-greyhound-270.convex.site";

afterEach(() => {
  vi.unstubAllEnvs();
});

async function bootstrap() {
  const t = convexTest(schema, modules);
  const ownerId = await t.mutation(internal.adminUsers.bootstrapOwner, {
    tokenIdentifier: ownerToken,
    displayName: "Club Owner",
    email: "owner@example.com",
  });
  const owner = t.withIdentity({ tokenIdentifier: ownerToken });
  await owner.mutation(api.adminUsers.setAccess, {
    tokenIdentifier: publisherToken,
    displayName: "Club Publisher",
    email: "publisher@example.com",
    role: "publisher",
    status: "active",
  });
  await owner.mutation(api.adminUsers.setAccess, {
    tokenIdentifier: editorToken,
    displayName: "Club Editor",
    email: "editor@example.com",
    role: "editor",
    status: "active",
  });
  return {
    t,
    owner,
    ownerId,
    publisher: t.withIdentity({ tokenIdentifier: publisherToken }),
    editor: t.withIdentity({ tokenIdentifier: editorToken }),
  };
}

describe("admin authentication and authorization", () => {
  it("bootstraps one operator-provided owner and never trusts an email identity", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.adminUsers.bootstrapOwner, {
        tokenIdentifier: ownerToken,
        displayName: "Club Owner",
      }),
    ).resolves.toBeTruthy();
    await expect(
      t.mutation(internal.adminUsers.bootstrapOwner, {
        tokenIdentifier: "https://issuer.example|second-owner",
        displayName: "Second Owner",
      }),
    ).rejects.toThrow("already been completed");

    const sameEmailWrongToken = t.withIdentity({
      tokenIdentifier: "https://evil.example|owner-user",
      email: "owner@example.com",
    });
    await expect(
      sameEmailWrongToken.query(api.adminMembers.listPage, {
        paginationOpts: { cursor: null, numItems: 20 },
      }),
    ).rejects.toThrow();
  });

  it("rejects public Password sign-up and provisions an owner only through the internal action", async () => {
    vi.stubEnv("CONVEX_SITE_URL", testIssuer);
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          flow: "signUp",
          name: "Browser Owner",
          email: "browser-owner@example.com",
          password: "StrongBrowserPassword12",
        },
      }),
    ).rejects.toThrow("provisioned internally");

    const publicAccountCount = await t.run(async (ctx) =>
      ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q
            .eq("provider", "password")
            .eq("providerAccountId", "browser-owner@example.com"),
        )
        .take(1),
    );
    expect(publicAccountCount).toHaveLength(0);

    const provisioned = await t.action(
      internal.adminProvisioning.provisionPasswordAdmin,
      {
        displayName: "Internal Owner",
        email: "internal-owner@example.com",
        password: "StrongInternalPassword12",
        role: "owner",
      },
    );
    expect(provisioned.role).toBe("owner");

    const issuer = testIssuer;
    const firstSession = t.withIdentity({
      issuer,
      subject: `${provisioned.authUserId}|session-one`,
      tokenIdentifier: `${issuer}|${provisioned.authUserId}|session-one`,
    });
    const secondSession = t.withIdentity({
      issuer,
      subject: `${provisioned.authUserId}|session-two`,
      tokenIdentifier: `${issuer}|${provisioned.authUserId}|session-two`,
    });

    await expect(firstSession.query(api.adminUsers.me, {})).resolves.toMatchObject({
      displayName: "Internal Owner",
      email: "internal-owner@example.com",
      role: "owner",
      status: "active",
    });
    await expect(secondSession.query(api.adminUsers.me, {})).resolves.toMatchObject({
      displayName: "Internal Owner",
      role: "owner",
    });
  });

  it("repairs only the sole exact placeholder owner during internal provisioning", async () => {
    vi.stubEnv("CONVEX_SITE_URL", testIssuer);
    const t = convexTest(schema, modules);
    const placeholderId = await t.mutation(
      internal.adminUsers.bootstrapOwner,
      {
        tokenIdentifier: "TOKEN_DARI_UI",
        displayName: "Placeholder Owner",
      },
    );

    const provisioned = await t.action(
      internal.adminProvisioning.provisionPasswordAdmin,
      {
        displayName: "Recovered Owner",
        email: "recovered-owner@example.com",
        password: "StrongRecoveryPassword12",
        role: "owner",
        replaceSoleLegacyTokenIdentifier: "TOKEN_DARI_UI",
      },
    );
    expect(provisioned.adminUserId).toBe(placeholderId);

    const rows = await t.run(async (ctx) =>
      ctx.db.query("adminUsers").withIndex("by_created_at").take(2),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      _id: placeholderId,
      authUserId: provisioned.authUserId,
      displayName: "Recovered Owner",
      email: "recovered-owner@example.com",
      role: "owner",
      status: "active",
    });
  });

  it("recovers an orphaned Password account before rebinding the sole placeholder owner", async () => {
    vi.stubEnv("CONVEX_SITE_URL", testIssuer);
    const t = convexTest(schema, modules);
    const placeholderId = await t.mutation(
      internal.adminUsers.bootstrapOwner,
      {
        tokenIdentifier: "TOKEN_DARI_UI",
        displayName: "Placeholder Owner",
      },
    );

    await expect(
      t.action(internal.adminProvisioning.provisionPasswordAdmin, {
        displayName: "Orphaned Owner",
        email: "orphaned-owner@example.com",
        password: "OriginalOrphanPassword12",
        role: "owner",
        replaceSoleLegacyTokenIdentifier: "WRONG_PLACEHOLDER",
      }),
    ).rejects.toThrow("placeholder owner repair is not safe");

    const orphaned = await t.run(async (ctx) =>
      ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q
            .eq("provider", "password")
            .eq("providerAccountId", "orphaned-owner@example.com"),
        )
        .unique(),
    );
    expect(orphaned?.secret).toBeTruthy();
    if (orphaned === null) throw new Error("Expected orphaned account fixture.");

    await t.run(async (ctx) => {
      await ctx.db.insert("authSessions", {
        userId: orphaned.userId,
        expirationTime: Date.now() + 60_000,
      });
    });

    const recovered = await t.action(
      internal.adminProvisioning.provisionPasswordAdmin,
      {
        displayName: "Recovered Owner",
        email: "orphaned-owner@example.com",
        password: "RotatedRecoveryPassword12",
        role: "owner",
        replaceSoleLegacyTokenIdentifier: "TOKEN_DARI_UI",
        recoverExistingAccount: true,
      },
    );
    expect(recovered.adminUserId).toBe(placeholderId);
    expect(recovered.authUserId).toBe(orphaned.userId);

    const recoveredState = await t.run(async (ctx) => {
      const account = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q
            .eq("provider", "password")
            .eq("providerAccountId", "orphaned-owner@example.com"),
        )
        .unique();
      const sessions = await ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", orphaned.userId))
        .take(2);
      return { account, sessions };
    });
    expect(recoveredState.account?.secret).not.toBe(orphaned.secret);
    expect(recoveredState.sessions).toHaveLength(0);
  });

  it("keeps unauthenticated, unknown, disabled, and insufficient roles out", async () => {
    const { t, owner, editor } = await bootstrap();
    await expect(
      t.query(api.adminContent.getPageWorkspace, {
        pageKey: "home",
        locale: "en",
      }),
    ).rejects.toThrow();
    await expect(
      t.withIdentity({ tokenIdentifier: "https://issuer.example|unknown" }).query(
        api.adminContent.getPageWorkspace,
        { pageKey: "home", locale: "en" },
      ),
    ).rejects.toThrow();
    await expect(
      editor.mutation(api.adminUsers.setAccess, {
        tokenIdentifier: "https://issuer.example|intruder",
        displayName: "Intruder",
        role: "owner",
        status: "active",
      }),
    ).rejects.toThrow();

    await owner.mutation(api.adminUsers.setAccess, {
      tokenIdentifier: editorToken,
      displayName: "Club Editor",
      role: "editor",
      status: "disabled",
    });
    await expect(
      editor.query(api.adminContent.getPageWorkspace, {
        pageKey: "home",
        locale: "en",
      }),
    ).rejects.toThrow();
  });

  it("will not disable or demote the final active owner", async () => {
    const { owner } = await bootstrap();
    await expect(
      owner.mutation(api.adminUsers.setAccess, {
        tokenIdentifier: ownerToken,
        displayName: "Club Owner",
        role: "editor",
        status: "active",
      }),
    ).rejects.toThrow("last active owner");
  });
});

describe("admin-managed page content", () => {
  it("saves with optimistic concurrency and publishes immutable public copy", async () => {
    const { editor, publisher } = await bootstrap();
    const first = await editor.mutation(api.adminContent.saveDraft, {
      pageKey: "home",
      locale: "en",
      contentKey: "hero-heading",
      label: "Hero heading",
      kind: "plain-text",
      value: "English grows in company.",
      expectedRevision: 0,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("Expected content save to succeed.");

    await expect(
      editor.mutation(api.adminContent.saveDraft, {
        pageKey: "home",
        locale: "en",
        contentKey: "hero-heading",
        label: "Hero heading",
        kind: "plain-text",
        value: "A stale overwrite must not win.",
        expectedRevision: 0,
      }),
    ).resolves.toEqual({ ok: false, code: "conflict", currentRevision: 1 });
    await expect(
      editor.mutation(api.adminContent.publish, {
        entryId: first.entryId,
        expectedRevision: 1,
      }),
    ).rejects.toThrow();
    await publisher.mutation(api.adminContent.publish, {
      entryId: first.entryId,
      expectedRevision: 1,
    });
    await expect(
      publisher.mutation(api.adminContent.publish, {
        entryId: first.entryId,
        expectedRevision: 1,
      }),
    ).rejects.toThrow("already published");

    await expect(
      publisher.query(api.siteContent.getPublishedPage, {
        pageKey: "home",
        locale: "en",
      }),
    ).resolves.toMatchObject([
      {
        contentKey: "hero-heading",
        value: "English grows in company.",
        revision: 1,
      },
    ]);
  });
});

describe("admin journal revisions", () => {
  const editorJson = JSON.stringify({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Listening changes the room" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "A patient pause gives every speaker enough room to find the next honest sentence, ask a sharper question, and keep the conversation moving together.",
          },
        ],
      },
      {
        type: "map",
        attrs: {
          latitude: -6.2,
          longitude: 106.816666,
          zoom: 14,
          label: "English Club meeting room",
        },
      },
    ],
  });

  it("stores immutable structured drafts and only lets publishers publish", async () => {
    const { editor, publisher } = await bootstrap();
    const saved = await editor.mutation(api.adminPosts.saveDraft, {
      expectedRevision: 0,
      slug: "listening-changes-the-room",
      title: "Listening changes the room",
      excerpt:
        "What a thoughtful pause can do for a shared English conversation.",
      category: "Practice notes",
      authorName: "English Club Editorial",
      featured: false,
      editorJson,
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) throw new Error("Expected journal save to succeed.");
    await expect(
      editor.mutation(api.adminPosts.publish, {
        postId: saved.postId,
        expectedRevision: 1,
      }),
    ).rejects.toThrow();
    await publisher.mutation(api.adminPosts.publish, {
      postId: saved.postId,
      expectedRevision: 1,
    });
    await expect(
      publisher.mutation(api.adminPosts.publish, {
        postId: saved.postId,
        expectedRevision: 1,
      }),
    ).rejects.toThrow("already published");
    const publicPost = await publisher.query(api.posts.getPublishedBySlug, {
      slug: "listening-changes-the-room",
    });
    expect(publicPost?.body).toContain("patient pause");

    const revisions = await publisher.query(api.adminPosts.listRevisions, {
      postId: saved.postId,
      limit: 20,
    });
    expect(revisions).toHaveLength(1);
    const revision = await publisher.query(api.adminPosts.getRevision, {
      postId: saved.postId,
      revisionId: revisions[0]._id,
    });
    expect(JSON.parse(revision?.editorJson ?? "null")).toMatchObject({
      type: "doc",
    });
  });

  it("opens a legacy published post and establishes its first editable revision", async () => {
    const { t, editor } = await bootstrap();
    const legacyBody = [
      "The archive records **Leeds the Way** while members listen together.",
      "",
      "## Listening is part of speaking",
      "",
      "A useful exchange gives every speaker enough room to answer.",
    ].join("\n");
    const now = Date.UTC(2026, 7, 25);
    const postId = await t.run(async (ctx) =>
      ctx.db.insert("posts", {
        slug: "legacy-listening-story",
        title: "Legacy listening story",
        excerpt:
          "An existing published story that predates structured journal revisions.",
        body: legacyBody,
        category: "Exchange",
        authorName: "English Club",
        status: "published",
        featured: false,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    );

    const workspace = await editor.query(api.adminPosts.getWorkspace, { postId });
    expect(workspace).toMatchObject({
      post: {
        title: "Legacy listening story",
        excerpt:
          "An existing published story that predates structured journal revisions.",
        status: "published",
      },
      draft: null,
      published: null,
      legacyBody,
    });

    const saved = await editor.mutation(api.adminPosts.saveDraft, {
      postId,
      expectedRevision: 0,
      slug: "legacy-listening-story",
      title: "Legacy listening story",
      excerpt:
        "An existing published story that predates structured journal revisions.",
      category: "Exchange",
      authorName: "English Club",
      featured: false,
      editorJson,
    });
    expect(saved).toMatchObject({ ok: true, postId, revision: 1 });

    const revisedWorkspace = await editor.query(api.adminPosts.getWorkspace, {
      postId,
    });
    expect(revisedWorkspace?.legacyBody).toBeNull();
    expect(revisedWorkspace?.draft).toMatchObject({
      revision: 1,
      title: "Legacy listening story",
    });
    expect(revisedWorkspace?.published).toBeNull();
  });

  it("rejects raw HTML, script-shaped links, and malformed map nodes", async () => {
    const { editor } = await bootstrap();
    for (const editorJson of [
      JSON.stringify({ type: "doc", content: [{ type: "html", html: "<b>x</b>" }] }),
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "unsafe",
                marks: [
                  { type: "link", attrs: { href: "javascript:alert(1)" } },
                ],
              },
            ],
          },
        ],
      }),
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "map",
            attrs: { latitude: 999, longitude: 0, zoom: 14, label: "Wrong" },
          },
        ],
      }),
    ]) {
      await expect(
        editor.mutation(api.adminPosts.saveDraft, {
          expectedRevision: 0,
          slug: "unsafe-story",
          title: "Unsafe story input",
          excerpt: "This story exists to prove the editor contract rejects unsafe input.",
          category: "Security",
          authorName: "English Club Editorial",
          featured: false,
          editorJson,
        }),
      ).rejects.toThrow();
    }
  });

  it("round-trips image nodes through a bounded ready-media projection", async () => {
    const { t, owner, ownerId, editor } = await bootstrap();
    const mediaId = await t.mutation(internal.adminMedia.createPending, {
      objectKey: "uploads/journal-inline/conversation.webp",
      purpose: "journal-inline",
      contentType: "image/webp",
      byteSize: 12_000,
      originalName: "conversation.webp",
      alt: "Members exchanging questions in the club room",
      uploadedBy: ownerId,
    });
    await t.mutation(internal.adminMedia.markReady, {
      mediaId,
      width: 1_280,
      height: 853,
      actorId: ownerId,
    });
    const imageDocument = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "The conversation begins with a question worth carrying into the room.",
            },
          ],
        },
        {
          type: "image",
          attrs: {
            mediaId,
            alt: "A working conversation inside the club room",
            caption: "Members make room for one another's questions.",
          },
        },
      ],
    });
    const saved = await editor.mutation(api.adminPosts.saveDraft, {
      expectedRevision: 0,
      slug: "a-question-worth-carrying",
      title: "A question worth carrying",
      excerpt:
        "How a shared image can give the next English conversation a place to begin.",
      category: "Club life",
      authorName: "English Club Editorial",
      featured: false,
      editorJson: imageDocument,
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) throw new Error("Expected image draft save to succeed.");

    const workspace = await editor.query(api.adminPosts.getWorkspace, {
      postId: saved.postId,
    });
    expect(workspace?.draft?.inlineMedia).toEqual([
      {
        mediaId,
        publicUrl:
          "https://r2.mukhtada.my.id/uploads/journal-inline/conversation.webp",
        alt: "Members exchanging questions in the club room",
        width: 1_280,
        height: 853,
      },
    ]);
    expect(Object.keys(workspace?.draft?.inlineMedia[0] ?? {}).sort()).toEqual(
      ["alt", "height", "mediaId", "publicUrl", "width"],
    );
    const savedDocument = JSON.parse(workspace?.draft?.editorJson ?? "null") as {
      content: Array<{ type: string; attrs?: Record<string, unknown> }>;
    };
    expect(savedDocument.content[1].type).toBe("image");
    expect(savedDocument.content[1].attrs).toMatchObject({ mediaId });
    expect(savedDocument.content[1].attrs).not.toHaveProperty("src");

    const loadedRevision = await editor.query(api.adminPosts.getRevision, {
      postId: saved.postId,
      revisionId: saved.revisionId,
    });
    expect(loadedRevision?.inlineMedia).toEqual(
      workspace?.draft?.inlineMedia,
    );
    const revisionList = await editor.query(api.adminPosts.listRevisions, {
      postId: saved.postId,
      limit: 20,
    });
    expect(revisionList[0]).not.toHaveProperty("editorJson");
    expect(revisionList[0]).not.toHaveProperty("inlineMedia");

    await owner.mutation(api.adminMedia.archive, { mediaId });
    const afterArchive = await editor.query(api.adminPosts.getWorkspace, {
      postId: saved.postId,
    });
    expect(afterArchive?.draft?.inlineMedia).toEqual([]);
    expect(
      (JSON.parse(afterArchive?.draft?.editorJson ?? "null") as {
        content: Array<{ type: string }>;
      }).content[1].type,
    ).toBe("image");
    await expect(
      editor.query(api.posts.getPublishedBySlug, {
        slug: "a-question-worth-carrying",
      }),
    ).resolves.toBeNull();
  });

  it("rejects pending image references and caps a revision at 40 unique images", async () => {
    const { t, ownerId, editor } = await bootstrap();
    const pendingMediaId = await t.mutation(
      internal.adminMedia.createPending,
      {
        objectKey: "uploads/journal-inline/pending.webp",
        purpose: "journal-inline",
        contentType: "image/webp",
        byteSize: 4_000,
        originalName: "pending.webp",
        alt: "A pending editorial image",
        uploadedBy: ownerId,
      },
    );
    const pendingDocument = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { mediaId: pendingMediaId, alt: "A pending editorial image" },
        },
      ],
    });
    await expect(
      editor.mutation(api.adminPosts.saveDraft, {
        expectedRevision: 0,
        slug: "pending-image-story",
        title: "Pending image story",
        excerpt:
          "This draft proves that pending media cannot enter a saved editorial revision.",
        category: "Practice notes",
        authorName: "English Club Editorial",
        featured: false,
        editorJson: pendingDocument,
      }),
    ).rejects.toThrow("not ready");

    const tooManyImages = JSON.stringify({
      type: "doc",
      content: Array.from({ length: 41 }, (_, index) => ({
        type: "image",
        attrs: {
          mediaId: `media-reference-${index.toString().padStart(2, "0")}`,
          alt: `Editorial image ${index + 1}`,
        },
      })),
    });
    expect(() => validateEditorDocument(tooManyImages)).toThrow(
      "too many inline images",
    );
  });

  it("projects only ready media from the immutable published revision", async () => {
    const { t, owner, ownerId, editor, publisher } = await bootstrap();
    const publishedMediaId = await t.mutation(
      internal.adminMedia.createPending,
      {
        objectKey: "uploads/journal-inline/published.webp",
        purpose: "journal-inline",
        contentType: "image/webp",
        byteSize: 9_000,
        originalName: "published.webp",
        alt: "Published conversation photograph",
        uploadedBy: ownerId,
      },
    );
    const draftOnlyMediaId = await t.mutation(
      internal.adminMedia.createPending,
      {
        objectKey: "uploads/journal-inline/draft-only.webp",
        purpose: "journal-inline",
        contentType: "image/webp",
        byteSize: 10_000,
        originalName: "draft-only.webp",
        alt: "Draft-only conversation photograph",
        uploadedBy: ownerId,
      },
    );
    const pendingMediaId = await t.mutation(
      internal.adminMedia.createPending,
      {
        objectKey: "uploads/journal-inline/not-referenced.webp",
        purpose: "journal-inline",
        contentType: "image/webp",
        byteSize: 11_000,
        originalName: "not-referenced.webp",
        alt: "A pending photograph that is not referenced",
        uploadedBy: ownerId,
      },
    );
    await t.mutation(internal.adminMedia.markReady, {
      mediaId: publishedMediaId,
      width: 1_200,
      height: 800,
      actorId: ownerId,
    });
    await t.mutation(internal.adminMedia.markReady, {
      mediaId: draftOnlyMediaId,
      width: 1_000,
      height: 750,
      actorId: ownerId,
    });

    const documentWith = (mediaId: string, alt: string) =>
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "A published story keeps its reviewed image while the editorial team prepares the next revision without changing what visitors can read today.",
              },
            ],
          },
          { type: "image", attrs: { mediaId, alt } },
        ],
      });
    const first = await editor.mutation(api.adminPosts.saveDraft, {
      expectedRevision: 0,
      slug: "published-image-contract",
      title: "Published image contract",
      excerpt:
        "A public story exposes only media attached to its immutable published revision.",
      category: "Editorial practice",
      authorName: "English Club Editorial",
      featured: false,
      editorJson: documentWith(
        publishedMediaId,
        "The published conversation photograph",
      ),
    });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("Expected first revision to save.");
    await publisher.mutation(api.adminPosts.publish, {
      postId: first.postId,
      expectedRevision: 1,
    });

    let publicDetail = await t.query(api.posts.getPublishedBySlug, {
      slug: "published-image-contract",
    });
    expect(publicDetail?.inlineMedia).toEqual([
      {
        mediaId: publishedMediaId,
        publicUrl:
          "https://r2.mukhtada.my.id/uploads/journal-inline/published.webp",
        alt: "Published conversation photograph",
        width: 1_200,
        height: 800,
      },
    ]);
    expect(publicDetail?.inlineMedia).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mediaId: pendingMediaId }),
      ]),
    );
    const archive = await t.query(api.posts.listPublishedPage, {
      paginationOpts: {
        cursor: null,
        numItems: 6,
        maximumRowsRead: 6,
      },
    });
    expect(archive.page[0]).not.toHaveProperty("inlineMedia");
    expect(archive.page[0]).not.toHaveProperty("editorJson");

    const second = await editor.mutation(api.adminPosts.saveDraft, {
      postId: first.postId,
      expectedRevision: 1,
      slug: "published-image-contract",
      title: "Published image contract",
      excerpt:
        "A public story exposes only media attached to its immutable published revision.",
      category: "Editorial practice",
      authorName: "English Club Editorial",
      featured: false,
      editorJson: documentWith(
        draftOnlyMediaId,
        "The image waiting in the next editorial draft",
      ),
    });
    expect(second.ok).toBe(true);
    publicDetail = await t.query(api.posts.getPublishedBySlug, {
      slug: "published-image-contract",
    });
    expect(publicDetail?.inlineMedia?.map((media) => media.mediaId)).toEqual([
      publishedMediaId,
    ]);
    expect(publicDetail?.editorJson).not.toContain(draftOnlyMediaId);

    await owner.mutation(api.adminMedia.archive, {
      mediaId: publishedMediaId,
    });
    publicDetail = await t.query(api.posts.getPublishedBySlug, {
      slug: "published-image-contract",
    });
    expect(publicDetail?.inlineMedia).toEqual([]);
    expect(publicDetail?.editorJson).toContain(publishedMediaId);
  });

  it("projects only the ready published cover across public journal DTOs", async () => {
    const { t, owner, ownerId, editor, publisher } = await bootstrap();
    const publishedCoverId = await t.mutation(
      internal.adminMedia.createPending,
      {
        objectKey: "uploads/journal-cover/published-cover.webp",
        purpose: "journal-cover",
        contentType: "image/webp",
        byteSize: 18_000,
        originalName: "published-cover.webp",
        alt: "Two members preparing a conversation prompt",
        uploadedBy: ownerId,
      },
    );
    const draftCoverId = await t.mutation(internal.adminMedia.createPending, {
      objectKey: "uploads/page-image/next-cover.webp",
      purpose: "page-image",
      contentType: "image/webp",
      byteSize: 17_000,
      originalName: "next-cover.webp",
      alt: "The next cover waiting for editorial review",
      uploadedBy: ownerId,
    });
    const wrongPurposeId = await t.mutation(
      internal.adminMedia.createPending,
      {
        objectKey: "uploads/journal-inline/not-a-cover.webp",
        purpose: "journal-inline",
        contentType: "image/webp",
        byteSize: 15_000,
        originalName: "not-a-cover.webp",
        alt: "An inline image that must not become a cover",
        uploadedBy: ownerId,
      },
    );
    for (const [mediaId, width, height] of [
      [publishedCoverId, 1_600, 900],
      [draftCoverId, 1_400, 933],
      [wrongPurposeId, 1_200, 800],
    ] as const) {
      await t.mutation(internal.adminMedia.markReady, {
        mediaId,
        width,
        height,
        actorId: ownerId,
      });
    }

    const saved = await editor.mutation(api.adminPosts.saveDraft, {
      expectedRevision: 0,
      slug: "published-cover-contract",
      title: "Published cover contract",
      excerpt:
        "A reviewed public cover keeps its metadata while the next draft remains private.",
      category: "Editorial practice",
      authorName: "English Club Editorial",
      featured: true,
      coverMediaId: publishedCoverId,
      editorJson,
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) throw new Error("Expected cover draft to save.");
    await publisher.mutation(api.adminPosts.publish, {
      postId: saved.postId,
      expectedRevision: 1,
    });

    const expectedCover = {
      mediaId: publishedCoverId,
      publicUrl:
        "https://r2.mukhtada.my.id/uploads/journal-cover/published-cover.webp",
      alt: "Two members preparing a conversation prompt",
      width: 1_600,
      height: 900,
    };
    const detail = await t.query(api.posts.getPublishedBySlug, {
      slug: "published-cover-contract",
    });
    expect(detail?.coverMedia).toEqual(expectedCover);
    expect(detail?.coverKey).toBe(
      "uploads/journal-cover/published-cover.webp",
    );
    expect(Object.keys(detail?.coverMedia ?? {}).sort()).toEqual(
      ["alt", "height", "mediaId", "publicUrl", "width"],
    );

    const archive = await t.query(api.posts.listPublishedPage, {
      paginationOpts: {
        cursor: null,
        numItems: 6,
        maximumRowsRead: 6,
      },
    });
    expect(archive.page[0].coverMedia).toEqual(expectedCover);
    expect((await t.query(api.posts.listPublished, { limit: 6 }))[0]
      .coverMedia).toEqual(expectedCover);
    expect((await t.query(api.posts.getFeatured, {}))?.coverMedia).toEqual(
      expectedCover,
    );

    const nextDraft = await editor.mutation(api.adminPosts.saveDraft, {
      postId: saved.postId,
      expectedRevision: 1,
      slug: "published-cover-contract",
      title: "Published cover contract",
      excerpt:
        "A reviewed public cover keeps its metadata while the next draft remains private.",
      category: "Editorial practice",
      authorName: "English Club Editorial",
      featured: true,
      coverMediaId: draftCoverId,
      editorJson,
    });
    expect(nextDraft.ok).toBe(true);
    expect(
      (
        await t.query(api.posts.getPublishedBySlug, {
          slug: "published-cover-contract",
        })
      )?.coverMedia,
    ).toEqual(expectedCover);

    await owner.mutation(api.adminMedia.archive, { mediaId: publishedCoverId });
    const afterArchive = await t.query(api.posts.getPublishedBySlug, {
      slug: "published-cover-contract",
    });
    expect(afterArchive?.coverMedia).toBeUndefined();
    expect(afterArchive?.coverKey).toBe(
      "uploads/journal-cover/published-cover.webp",
    );

    await t.run(async (ctx) => {
      await ctx.db.patch(saved.postId, { coverMediaId: wrongPurposeId });
    });
    const wrongPurpose = await t.query(api.posts.getPublishedBySlug, {
      slug: "published-cover-contract",
    });
    expect(wrongPurpose?.coverMedia).toBeUndefined();
    expect(wrongPurpose?.coverKey).toBe(
      "uploads/journal-cover/published-cover.webp",
    );
  });
});

describe("admin theme publication", () => {
  it("keeps drafts private, checks publisher permission, and records rollback", async () => {
    const { editor, publisher } = await bootstrap();
    const draft = await editor.mutation(api.adminThemes.ensureDraft, {});
    await expect(
      editor.mutation(api.adminThemes.publishDraft, {
        draftId: draft._id,
        expectedRevision: draft.revision,
        expectedPublishedVersionId: null,
      }),
    ).rejects.toThrow();
    const first = await publisher.mutation(api.adminThemes.publishDraft, {
      draftId: draft._id,
      expectedRevision: draft.revision,
      expectedPublishedVersionId: null,
      note: "Initial accessible club palette",
    });
    const published = await publisher.query(api.publicThemes.getPublished, {});
    expect(published).toMatchObject({ publicRevision: 1, contractVersion: 1 });

    const refreshed = await publisher.mutation(api.adminThemes.ensureDraft, {});
    const saved = await publisher.mutation(api.adminThemes.saveDraft, {
      draftId: refreshed._id,
      expectedRevision: refreshed.revision,
      name: "Relay cobalt, second edition",
      source: "custom",
      presetKey: null,
      recipe: refreshed.recipe,
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) throw new Error("Expected theme save to succeed.");
    const second = await publisher.mutation(api.adminThemes.publishDraft, {
      draftId: refreshed._id,
      expectedRevision: saved.revision,
      expectedPublishedVersionId: first.versionId,
    });
    await publisher.mutation(api.adminThemes.rollback, {
      targetVersionId: first.versionId,
      expectedPublishedVersionId: second.versionId,
      note: "Restore the original club palette",
    });
    await expect(
      publisher.mutation(api.adminThemes.rollback, {
        targetVersionId: first.versionId,
        expectedPublishedVersionId: first.versionId,
      }),
    ).rejects.toThrow("already published");
    const events = await publisher.query(api.adminThemes.listEvents, {
      limit: 10,
    });
    expect(events.map((event) => event.action)).toEqual([
      "rollback",
      "publish",
      "publish",
    ]);
  });
});

describe("R2 media boundary", () => {
  it("rejects upload signing before reading R2 credentials for unknown callers", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.r2.createAdminUploadUrl, {
        purpose: "journal-inline",
        contentType: "image/webp",
        byteSize: 4_096,
        originalName: "conversation.webp",
        alt: "Members sharing a conversation",
      }),
    ).rejects.toThrow("Authentication is required");
    await expect(
      t.withIdentity({ tokenIdentifier: "https://issuer.example|unknown" }).action(
        api.r2.createAdminUploadUrl,
        {
          purpose: "journal-inline",
          contentType: "image/webp",
          byteSize: 4_096,
          originalName: "conversation.webp",
          alt: "Members sharing a conversation",
        },
      ),
    ).rejects.toThrow("Admin media permission is required");
  });

  it("publishes only verified media records on the custom R2 domain", async () => {
    const { t, owner, ownerId } = await bootstrap();
    const mediaId = await t.mutation(internal.adminMedia.createPending, {
      objectKey: "members/profiles/test-portrait.webp",
      purpose: "member-photo",
      contentType: "image/webp",
      byteSize: 8_192,
      originalName: "portrait.webp",
      alt: "Club member portrait",
      uploadedBy: ownerId,
    });
    await expect(
      owner.mutation(api.adminMembers.saveReviewed, {
        slug: "nabila-fauziah",
        displayName: "Nabila Fauziah",
        roleLevel: 3,
        position: "president",
        joinedYear: 2024,
        shortBio: "Keeps the club's programme connected to every member.",
        photo: {
          objectKey: "members/profiles/test-portrait.webp",
          width: 900,
          height: 1_200,
          alt: "Club member portrait",
          focalPoint: "50% 40%",
        },
        profileStatus: "published",
        profileConsentStatus: "cleared",
        photoConsentStatus: "cleared",
        sortOrder: 1,
      }),
    ).rejects.toThrow("has not passed media verification");

    await expect(
      t.mutation(internal.adminMedia.markReady, {
        mediaId,
        width: 900,
        height: 1_200,
        actorId: ownerId,
      }),
    ).resolves.toBe(
      "https://r2.mukhtada.my.id/members/profiles/test-portrait.webp",
    );
    await owner.mutation(api.adminMembers.saveReviewed, {
      slug: "nabila-fauziah",
      displayName: "Nabila Fauziah",
      roleLevel: 3,
      position: "president",
      joinedYear: 2024,
      shortBio: "Keeps the club's programme connected to every member.",
      photo: {
        objectKey: "members/profiles/test-portrait.webp",
        width: 900,
        height: 1_200,
        alt: "Club member portrait",
        focalPoint: "50% 40%",
      },
      profileStatus: "published",
      profileConsentStatus: "cleared",
      photoConsentStatus: "cleared",
      sortOrder: 1,
    });
    const publicMembers = await owner.query(api.members.listPublished, {});
    expect(publicMembers[0].photo?.objectKey).toBe(
      "members/profiles/test-portrait.webp",
    );
  });
});
