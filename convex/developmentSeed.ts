import {
  MEMBER_DEVELOPMENT_SEED_BATCH,
  developmentSeedMembers,
} from "../content/member-development-seed";
import { managedDivisionSeeds } from "../content/member-divisions";
import { seedPosts } from "../content/seed-posts";
import { checkedInPrograms } from "../content/programs";
import {
  getPublicContentManifestPages,
  publicContentLocale,
} from "../content/public-content";
import {
  DEFAULT_PUBLIC_THEME_RECIPE,
  PUBLIC_THEME_PRESET_CATALOG,
} from "../content/theme-presets";
import {
  THEME_ANCHOR_KEYS,
  deriveThemeSnapshot,
  normalizeThemeRecipe,
  validateThemeRecipe,
} from "../content/theme-contract";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  env,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { validateEditorDocument } from "./lib/editorDocument";

const confirmation = "seed-english-club-development-v1" as const;
const expectedCloudUrl = "https://perfect-greyhound-270.convex.cloud";
const themeSeedBatch = "public-theme-presets-v1";

function seedPostEditorJson(markdown: string) {
  const content = markdown
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const heading = block.match(/^##\s+([\s\S]+)$/);
      const text = (heading?.[1] ?? block)
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\s*\n\s*/g, " ")
        .trim();
      return heading === null
        ? { type: "paragraph", content: [{ type: "text", text }] }
        : {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text }],
          };
    });
  return validateEditorDocument(JSON.stringify({ type: "doc", content }));
}

function sameThemeRecipe(
  left: ReturnType<typeof normalizeThemeRecipe>,
  right: ReturnType<typeof normalizeThemeRecipe>,
) {
  return (
    left.contractVersion === right.contractVersion &&
    (["light", "dark"] as const).every((mode) =>
      THEME_ANCHOR_KEYS.every((anchor) =>
        (["l", "c", "h"] as const).every(
          (channel) =>
            Math.abs(left[mode][anchor][channel] - right[mode][anchor][channel]) <
            0.000_1,
        ),
      ),
    )
  );
}

const portraitValidator = v.object({
  slug: v.string(),
  objectKey: v.string(),
  checksumSha256: v.string(),
  byteSize: v.number(),
  width: v.number(),
  height: v.number(),
});

function assertDevelopmentTarget() {
  const cloudUrl = env.CONVEX_CLOUD_URL;
  if (
    cloudUrl !== expectedCloudUrl &&
    !cloudUrl.startsWith("http://127.0.0.1") &&
    !cloudUrl.startsWith("http://localhost")
  ) {
    throw new ConvexError({
      code: "DEVELOPMENT_SEED_TARGET_REJECTED" as const,
    });
  }
}

async function requireSeedAuthor(ctx: MutationCtx) {
  const [owner] = await ctx.db
    .query("adminUsers")
    .withIndex("by_role_and_status_and_updated_at", (q) =>
      q.eq("role", "owner").eq("status", "active"),
    )
    .order("desc")
    .take(1);
  if (owner === undefined) {
    throw new ConvexError({ code: "DEVELOPMENT_SEED_OWNER_REQUIRED" as const });
  }
  return owner;
}

function validatePortrait(
  portrait: {
    slug: string;
    objectKey: string;
    checksumSha256: string;
    byteSize: number;
    width: number;
    height: number;
  },
) {
  if (
    !/^members\/development-seed-v1\/[a-z0-9-]+-[a-f0-9]{16}\.webp$/.test(
      portrait.objectKey,
    ) ||
    !/^[a-f0-9]{64}$/.test(portrait.checksumSha256) ||
    !Number.isInteger(portrait.byteSize) ||
    portrait.byteSize < 1 ||
    portrait.byteSize > 5 * 1024 * 1024 ||
    !Number.isInteger(portrait.width) ||
    !Number.isInteger(portrait.height) ||
    portrait.width < 320 ||
    portrait.width > 2_000 ||
    portrait.height < 320 ||
    portrait.height > 2_000
  ) {
    throw new ConvexError({ code: "DEVELOPMENT_SEED_PORTRAIT_INVALID" as const });
  }
}

export const seedMembers = internalMutation({
  args: {
    confirm: v.literal(confirmation),
    portraits: v.array(portraitValidator),
  },
  returns: v.object({
    inserted: v.number(),
    existing: v.number(),
    updated: v.number(),
    divisionsInserted: v.number(),
    divisionsExisting: v.number(),
    mediaInserted: v.number(),
    mediaExisting: v.number(),
  }),
  handler: async (ctx, args) => {
    assertDevelopmentTarget();
    if (args.portraits.length !== developmentSeedMembers.length) {
      throw new ConvexError({ code: "DEVELOPMENT_SEED_PORTRAIT_COUNT" as const });
    }
    const bySlug = new Map(args.portraits.map((portrait) => [portrait.slug, portrait]));
    if (bySlug.size !== developmentSeedMembers.length) {
      throw new ConvexError({ code: "DEVELOPMENT_SEED_PORTRAIT_COUNT" as const });
    }
    const author = await requireSeedAuthor(ctx);
    const now = Date.now();
    let inserted = 0;
    let existingCount = 0;
    let updated = 0;
    let divisionsInserted = 0;
    let divisionsExisting = 0;
    let mediaInserted = 0;
    let mediaExisting = 0;

    const divisionIds = new Map<
      (typeof managedDivisionSeeds)[number]["legacyKey"],
      Id<"memberDivisions">
    >();
    for (const division of managedDivisionSeeds) {
      const existingDivision = await ctx.db
        .query("memberDivisions")
        .withIndex("by_slug", (q) => q.eq("slug", division.slug))
        .unique();
      if (existingDivision === null) {
        const divisionId = await ctx.db.insert("memberDivisions", {
          ...division,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        divisionIds.set(division.legacyKey, divisionId);
        divisionsInserted += 1;
      } else {
        if (existingDivision.legacyKey !== division.legacyKey) {
          throw new ConvexError({ code: "DEVELOPMENT_SEED_DIVISION_COLLISION" as const });
        }
        divisionIds.set(division.legacyKey, existingDivision._id);
        divisionsExisting += 1;
      }
    }

    for (const member of developmentSeedMembers) {
      const portrait = bySlug.get(member.slug);
      if (portrait === undefined) {
        throw new ConvexError({ code: "DEVELOPMENT_SEED_PORTRAIT_MISSING" as const });
      }
      validatePortrait(portrait);
      const expectedDivisionId =
        "division" in member
          ? divisionIds.get(member.division)
          : undefined;
      if ("division" in member && expectedDivisionId === undefined) {
        throw new ConvexError({ code: "DEVELOPMENT_SEED_DIVISION_MISSING" as const });
      }
      const existingMedia = await ctx.db
        .query("mediaAssets")
        .withIndex("by_object_key", (q) => q.eq("objectKey", portrait.objectKey))
        .unique();
      if (existingMedia === null) {
        await ctx.db.insert("mediaAssets", {
          objectKey: portrait.objectKey,
          purpose: "member-photo",
          contentType: "image/webp",
          byteSize: portrait.byteSize,
          status: "ready",
          originalName: `${member.slug}.webp`,
          alt: `Portrait of ${member.displayName}`,
          width: portrait.width,
          height: portrait.height,
          access: "public",
          checksumSha256: portrait.checksumSha256,
          uploadedBy: author._id,
          verifiedAt: now,
          createdAt: now,
          updatedAt: now,
        });
        mediaInserted += 1;
      } else {
        if (
          existingMedia.purpose !== "member-photo" ||
          existingMedia.status !== "ready" ||
          existingMedia.contentType !== "image/webp" ||
          existingMedia.checksumSha256 !== portrait.checksumSha256 ||
          existingMedia.byteSize !== portrait.byteSize ||
          existingMedia.width !== portrait.width ||
          existingMedia.height !== portrait.height
        ) {
          throw new ConvexError({ code: "DEVELOPMENT_SEED_MEDIA_COLLISION" as const });
        }
        mediaExisting += 1;
      }

      const existingMember = await ctx.db
        .query("members")
        .withIndex("by_slug", (q) => q.eq("slug", member.slug))
        .unique();
      if (existingMember !== null) {
        if (
          existingMember.recordOrigin !== "development-seed" ||
          existingMember.seedBatch !== MEMBER_DEVELOPMENT_SEED_BATCH
        ) {
          throw new ConvexError({ code: "DEVELOPMENT_SEED_MEMBER_COLLISION" as const });
        }
        if (existingMember.divisionId !== expectedDivisionId) {
          await ctx.db.patch("members", existingMember._id, {
            divisionId: expectedDivisionId,
            updatedAt: now,
          });
          updated += 1;
        }
        existingCount += 1;
        continue;
      }
      await ctx.runMutation(internal.members.upsertReviewed, {
        slug: member.slug,
        displayName: member.displayName,
        roleLevel: member.roleLevel,
        ...("division" in member ? { division: member.division } : {}),
        ...(expectedDivisionId === undefined ? {} : { divisionId: expectedDivisionId }),
        ...("position" in member ? { position: member.position } : {}),
        joinedYear: member.joinedYear,
        shortBio: member.shortBio,
        photo: {
          objectKey: portrait.objectKey,
          width: portrait.width,
          height: portrait.height,
          alt: `Portrait of ${member.displayName}`,
          focalPoint: "50% 50%",
        },
        profileStatus: "published",
        profileConsentStatus: "cleared",
        photoConsentStatus: "cleared",
        recordOrigin: "development-seed",
        seedBatch: MEMBER_DEVELOPMENT_SEED_BATCH,
        sortOrder: member.sortOrder,
      });
      inserted += 1;
    }
    if (inserted > 0) {
      await ctx.db.insert("cmsAuditEvents", {
        area: "members",
        action: "create",
        resourceType: "member-development-seed",
        resourceId: MEMBER_DEVELOPMENT_SEED_BATCH,
        summary: `${inserted} member profiles added to the development directory`,
        actorId: author._id,
        createdAt: now,
      });
    }
    return {
      inserted,
      existing: existingCount,
      updated,
      divisionsInserted,
      divisionsExisting,
      mediaInserted,
      mediaExisting,
    };
  },
});

export const seedThemePresets = internalMutation({
  args: { confirm: v.literal(confirmation) },
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
    existing: v.number(),
    publishedInitial: v.boolean(),
  }),
  handler: async (ctx) => {
    assertDevelopmentTarget();
    const author = await requireSeedAuthor(ctx);
    const now = Date.now();
    let inserted = 0;
    let updated = 0;
    let existingCount = 0;
    for (const preset of PUBLIC_THEME_PRESET_CATALOG) {
      const validation = validateThemeRecipe(preset.recipe);
      if (!validation.ok || validation.snapshot === undefined) {
        throw new ConvexError({
          code: "DEVELOPMENT_SEED_THEME_INVALID" as const,
          presetKey: preset.key,
        });
      }
      const normalizedRecipe = normalizeThemeRecipe(preset.recipe);
      const existing = await ctx.db
        .query("publicThemePresets")
        .withIndex("by_site_key_and_preset_key", (q) =>
          q.eq("siteKey", "public").eq("presetKey", preset.key),
        )
        .unique();
      if (existing === null) {
        await ctx.db.insert("publicThemePresets", {
          siteKey: "public",
          presetKey: preset.key,
          name: preset.name,
          description: preset.description,
          recipe: normalizedRecipe,
          snapshot: validation.snapshot,
          seedBatch: themeSeedBatch,
          createdAt: now,
          updatedAt: now,
        });
        inserted += 1;
      } else if (
        existing.seedBatch === themeSeedBatch &&
        (existing.name !== preset.name ||
          existing.description !== preset.description ||
          !sameThemeRecipe(
            normalizeThemeRecipe(existing.recipe),
            normalizedRecipe,
          ))
      ) {
        await ctx.db.patch("publicThemePresets", existing._id, {
          name: preset.name,
          description: preset.description,
          recipe: normalizedRecipe,
          snapshot: validation.snapshot,
          updatedAt: now,
        });
        updated += 1;
      } else {
        existingCount += 1;
      }
    }

    const state = await ctx.db
      .query("publicThemeState")
      .withIndex("by_site_key", (q) => q.eq("siteKey", "public"))
      .unique();
    let publishedInitial = false;
    let publishedVersionId: Id<"publicThemeVersions"> | undefined;
    if (state === null) {
      const versionId = await ctx.db.insert("publicThemeVersions", {
        siteKey: "public",
        version: 1,
        name: "Relay Cobalt",
        source: "preset",
        presetKey: "relay-cobalt-v1",
        recipe: DEFAULT_PUBLIC_THEME_RECIPE,
        snapshot: deriveThemeSnapshot(DEFAULT_PUBLIC_THEME_RECIPE),
        contractVersion: 1,
        publishedBy: author._id,
        publishedAt: now,
        note: "Initial English Club colour system",
      });
      await ctx.db.insert("publicThemeState", {
        siteKey: "public",
        publishedVersionId: versionId,
        nextVersion: 2,
        publicRevision: 1,
        updatedBy: author._id,
        updatedAt: now,
      });
      await ctx.db.insert("publicThemeEvents", {
        siteKey: "public",
        action: "publish",
        toVersionId: versionId,
        actorId: author._id,
        note: "Initial English Club colour system",
        createdAt: now,
      });
      publishedVersionId = versionId;
      publishedInitial = true;
    } else {
      publishedVersionId = state.publishedVersionId;
    }

    const draft = await ctx.db
      .query("publicThemeDrafts")
      .withIndex("by_site_key", (q) => q.eq("siteKey", "public"))
      .unique();
    if (draft === null) {
      await ctx.db.insert("publicThemeDrafts", {
        siteKey: "public",
        name: "Relay Cobalt",
        source: "preset",
        presetKey: "relay-cobalt-v1",
        recipe: DEFAULT_PUBLIC_THEME_RECIPE,
        ...(publishedVersionId === undefined
          ? {}
          : { basedOnVersionId: publishedVersionId }),
        revision: 1,
        updatedBy: author._id,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (inserted > 0 || updated > 0 || publishedInitial) {
      await ctx.db.insert("cmsAuditEvents", {
        area: "theme",
        action: "create",
        resourceType: "theme-preset-seed",
        resourceId: themeSeedBatch,
        summary: `${PUBLIC_THEME_PRESET_CATALOG.length} colour schemes available in Appearance`,
        actorId: author._id,
        createdAt: now,
      });
    }
    return { inserted, updated, existing: existingCount, publishedInitial };
  },
});

export const seedJournal = internalMutation({
  args: { confirm: v.literal(confirmation) },
  returns: v.object({
    inserted: v.number(),
    migrated: v.number(),
    existing: v.number(),
  }),
  handler: async (ctx) => {
    assertDevelopmentTarget();
    const author = await requireSeedAuthor(ctx);
    let inserted = 0;
    let migrated = 0;
    let existingCount = 0;
    for (const seed of seedPosts) {
      const existing = await ctx.db
        .query("posts")
        .withIndex("by_slug", (q) => q.eq("slug", seed.slug))
        .unique();
      if (
        existing !== null &&
        (existing.title !== seed.title ||
          existing.excerpt !== seed.excerpt ||
          existing.category !== seed.category ||
          existing.authorName !== seed.authorName)
      ) {
        throw new ConvexError({ code: "DEVELOPMENT_SEED_JOURNAL_COLLISION" as const });
      }
      if (existing?.publishedRevisionId !== undefined) {
        const revision = await ctx.db.get(
          "postRevisions",
          existing.publishedRevisionId,
        );
        if (revision === null || revision.postId !== existing._id) {
          throw new ConvexError({ code: "DEVELOPMENT_SEED_JOURNAL_COLLISION" as const });
        }
        existingCount += 1;
        continue;
      }

      const document = seedPostEditorJson(seed.body);
      const postId =
        existing?._id ??
        (await ctx.db.insert("posts", {
          ...seed,
          nextRevision: 2,
          createdBy: author._id,
          updatedBy: author._id,
        }));
      const revisionId = await ctx.db.insert("postRevisions", {
        postId,
        revision: 1,
        slug: seed.slug,
        title: seed.title,
        excerpt: seed.excerpt,
        category: seed.category,
        authorName: seed.authorName,
        featured: seed.featured,
        editorJson: document.editorJson,
        plainText: document.plainText,
        createdBy: author._id,
        createdAt: seed.updatedAt,
      });
      await ctx.db.patch("posts", postId, {
        draftRevisionId: revisionId,
        publishedRevisionId: revisionId,
        nextRevision: 2,
        createdBy: existing?.createdBy ?? author._id,
        updatedBy: author._id,
      });
      if (existing === null) inserted += 1;
      else migrated += 1;
    }
    if (inserted > 0 || migrated > 0) {
      await ctx.db.insert("cmsAuditEvents", {
        area: "journal",
        action: "publish",
        resourceType: "journal-development-seed",
        resourceId: "journal-development-seed-v1",
        summary: `${seedPosts.length} starter stories available to the public Journal and admin workspace`,
        actorId: author._id,
        createdAt: Date.now(),
      });
    }
    return { inserted, migrated, existing: existingCount };
  },
});

export const seedPrograms = internalMutation({
  args: { confirm: v.literal(confirmation) },
  returns: v.object({
    inserted: v.number(),
    existing: v.number(),
  }),
  handler: async (ctx) => {
    assertDevelopmentTarget();
    const author = await requireSeedAuthor(ctx);
    let inserted = 0;
    let existingCount = 0;

    for (const source of checkedInPrograms) {
      const existing = await ctx.db
        .query("programs")
        .withIndex("by_slug", (q) => q.eq("slug", source.slug))
        .unique();
      if (existing !== null) {
        if (
          existing.title !== source.title ||
          existing.summary !== source.summary ||
          existing.category !== source.category ||
          existing.deliveryState !== source.deliveryState
        ) {
          throw new ConvexError({ code: "DEVELOPMENT_SEED_PROGRAM_COLLISION" as const });
        }
        existingCount += 1;
        continue;
      }

      const now = Date.now();
      const programId = await ctx.db.insert("programs", {
        slug: source.slug,
        title: source.title,
        summary: source.summary,
        category: source.category,
        deliveryState: source.deliveryState,
        status: "published",
        featured: source.featured,
        sortOrder: source.sortOrder,
        nextRevision: 2,
        publishedAt: now,
        createdBy: author._id,
        updatedBy: author._id,
        createdAt: now,
        updatedAt: now,
      });
      const revisionId = await ctx.db.insert("programRevisions", {
        programId,
        revision: 1,
        ...source,
        createdBy: author._id,
        createdAt: now,
      });
      await ctx.db.patch("programs", programId, {
        publishedRevisionId: revisionId,
      });
      inserted += 1;
    }

    if (inserted > 0) {
      await ctx.db.insert("cmsAuditEvents", {
        area: "programs",
        action: "publish",
        resourceType: "programme-development-seed",
        resourceId: "verified-programme-catalogue-v1",
        summary: `${checkedInPrograms.length} sourced programme records available in Programs`,
        actorId: author._id,
        createdAt: Date.now(),
      });
    }
    return { inserted, existing: existingCount };
  },
});

export const seedPublicContentPage = internalMutation({
  args: {
    confirm: v.literal(confirmation),
    pageKey: v.string(),
  },
  returns: v.object({
    pageKey: v.string(),
    inserted: v.number(),
    publishedExisting: v.number(),
    existing: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    assertDevelopmentTarget();
    const page = getPublicContentManifestPages().find(
      (candidate) => candidate.pageKey === args.pageKey,
    );
    if (page === undefined) {
      throw new ConvexError({ code: "DEVELOPMENT_SEED_CONTENT_PAGE" as const });
    }
    const author = await requireSeedAuthor(ctx);
    const fields = Object.values(page.fields);
    if (fields.length > 200) {
      throw new ConvexError({ code: "DEVELOPMENT_SEED_CONTENT_LIMIT" as const });
    }
    const currentRows = await ctx.db
      .query("siteContentEntries")
      .withIndex("by_page_key_and_locale_and_content_key", (q) =>
        q.eq("pageKey", page.pageKey).eq("locale", publicContentLocale),
      )
      .take(201);
    if (currentRows.length > 200) {
      throw new ConvexError({ code: "DEVELOPMENT_SEED_CONTENT_LIMIT" as const });
    }
    const currentByKey = new Map(
      currentRows.map((entry) => [entry.contentKey, entry]),
    );
    const now = Date.now();
    let inserted = 0;
    let publishedExisting = 0;
    let existingCount = 0;
    for (const field of fields) {
      const current = currentByKey.get(field.contentKey);
      if (current === undefined) {
        const entryId = await ctx.db.insert("siteContentEntries", {
          pageKey: page.pageKey,
          locale: publicContentLocale,
          contentKey: field.contentKey,
          label: field.label,
          kind: field.kind,
          draftValue: field.defaultValue.trim(),
          draftRevision: 1,
          createdBy: author._id,
          updatedBy: author._id,
          createdAt: now,
          updatedAt: now,
        });
        const versionId = await ctx.db.insert("siteContentVersions", {
          entryId,
          revision: 1,
          value: field.defaultValue.trim(),
          publishedBy: author._id,
          publishedAt: now,
        });
        await ctx.db.patch("siteContentEntries", entryId, {
          publishedVersionId: versionId,
        });
        inserted += 1;
        continue;
      }
      const published =
        current.publishedVersionId === undefined
          ? null
          : await ctx.db.get("siteContentVersions", current.publishedVersionId);
      if (published !== null && published.entryId === current._id) {
        existingCount += 1;
        continue;
      }
      const versionId = await ctx.db.insert("siteContentVersions", {
        entryId: current._id,
        revision: current.draftRevision,
        value: field.defaultValue.trim(),
        publishedBy: author._id,
        publishedAt: now,
      });
      await ctx.db.patch("siteContentEntries", current._id, {
        publishedVersionId: versionId,
        updatedBy: author._id,
        updatedAt: now,
      });
      publishedExisting += 1;
    }
    if (inserted > 0 || publishedExisting > 0) {
      await ctx.db.insert("cmsAuditEvents", {
        area: "content",
        action: "publish",
        resourceType: "public-content-development-seed",
        resourceId: page.pageKey,
        summary: `${page.label} public copy materialized in Convex`,
        actorId: author._id,
        createdAt: now,
      });
    }
    return {
      pageKey: page.pageKey,
      inserted,
      publishedExisting,
      existing: existingCount,
      total: fields.length,
    };
  },
});

export const verify = internalQuery({
  args: { confirm: v.literal(confirmation) },
  returns: v.object({
    members: v.number(),
    memberMedia: v.number(),
    memberDivisions: v.number(),
    themePresets: v.number(),
    publicThemeReady: v.boolean(),
    journalPublished: v.number(),
    journalManaged: v.number(),
    contentExpected: v.number(),
    contentPublished: v.number(),
    programsPublished: v.number(),
    programsManaged: v.number(),
  }),
  handler: async (ctx) => {
    assertDevelopmentTarget();
    const members: Doc<"members">[] = [];
    let memberMedia = 0;
    for (const source of developmentSeedMembers) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_slug", (q) => q.eq("slug", source.slug))
        .unique();
      if (
        member === null ||
        member.recordOrigin !== "development-seed" ||
        member.profileStatus !== "published" ||
        member.profileConsentStatus !== "cleared" ||
        member.photoConsentStatus !== "cleared" ||
        member.photo === undefined
      ) {
        continue;
      }
      members.push(member);
      const media = await ctx.db
        .query("mediaAssets")
        .withIndex("by_object_key", (q) => q.eq("objectKey", member.photo!.objectKey))
        .unique();
      if (media?.status === "ready" && media.purpose === "member-photo") {
        memberMedia += 1;
      }
    }
    let memberDivisions = 0;
    for (const source of managedDivisionSeeds) {
      const division = await ctx.db
        .query("memberDivisions")
        .withIndex("by_slug", (q) => q.eq("slug", source.slug))
        .unique();
      if (division?.legacyKey === source.legacyKey) memberDivisions += 1;
    }
    const presets = await ctx.db
      .query("publicThemePresets")
      .withIndex("by_site_key_and_preset_key", (q) => q.eq("siteKey", "public"))
      .take(13);
    const state = await ctx.db
      .query("publicThemeState")
      .withIndex("by_site_key", (q) => q.eq("siteKey", "public"))
      .unique();
    const published =
      state === null
        ? null
        : await ctx.db.get("publicThemeVersions", state.publishedVersionId);
    let journalPublished = 0;
    let journalManaged = 0;
    for (const source of seedPosts) {
      const post = await ctx.db
        .query("posts")
        .withIndex("by_slug", (q) => q.eq("slug", source.slug))
        .unique();
      if (post?.status !== "published" || post.publishedAt === undefined) {
        continue;
      }
      journalPublished += 1;
      if (post.publishedRevisionId === undefined) continue;
      const revision = await ctx.db.get(
        "postRevisions",
        post.publishedRevisionId,
      );
      if (revision?.postId === post._id) journalManaged += 1;
    }
    let contentExpected = 0;
    let contentPublished = 0;
    for (const page of getPublicContentManifestPages()) {
      const fields = Object.values(page.fields);
      contentExpected += fields.length;
      const rows = await ctx.db
        .query("siteContentEntries")
        .withIndex("by_page_key_and_locale_and_content_key", (q) =>
          q.eq("pageKey", page.pageKey).eq("locale", publicContentLocale),
        )
        .take(201);
      if (rows.length > 200) {
        throw new ConvexError({ code: "DEVELOPMENT_SEED_CONTENT_LIMIT" as const });
      }
      const byKey = new Map(rows.map((entry) => [entry.contentKey, entry]));
      for (const field of fields) {
        const entry = byKey.get(field.contentKey);
        if (entry?.publishedVersionId === undefined) continue;
        const version = await ctx.db.get(
          "siteContentVersions",
          entry.publishedVersionId,
        );
        if (version?.entryId === entry._id) contentPublished += 1;
      }
    }
    let programsPublished = 0;
    let programsManaged = 0;
    for (const source of checkedInPrograms) {
      const program = await ctx.db
        .query("programs")
        .withIndex("by_slug", (q) => q.eq("slug", source.slug))
        .unique();
      if (program?.status !== "published") continue;
      programsPublished += 1;
      if (program.publishedRevisionId === undefined) continue;
      const revision = await ctx.db.get(
        "programRevisions",
        program.publishedRevisionId,
      );
      if (revision?.programId === program._id) programsManaged += 1;
    }
    return {
      members: members.length,
      memberMedia,
      memberDivisions,
      themePresets: presets.length,
      publicThemeReady: published !== null && published.contractVersion === 1,
      journalPublished,
      journalManaged,
      contentExpected,
      contentPublished,
      programsPublished,
      programsManaged,
    };
  },
});
