import { v } from "convex/values";

export const postStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const eventStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("cancelled"),
  v.literal("archived"),
);

export const programStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const programCategoryValidator = v.union(
  v.literal("learning"),
  v.literal("competition"),
  v.literal("exchange"),
  v.literal("community"),
  v.literal("milestone"),
);

export const programDeliveryStateValidator = v.union(
  v.literal("completed"),
  v.literal("ongoing"),
  v.literal("planned"),
);

export const publicProgramValidator = v.object({
  slug: v.string(),
  title: v.string(),
  summary: v.string(),
  body: v.string(),
  category: programCategoryValidator,
  deliveryState: programDeliveryStateValidator,
  audience: v.string(),
  dateLabel: v.optional(v.string()),
  startsAt: v.optional(v.number()),
  locationLabel: v.optional(v.string()),
  communityBenefit: v.string(),
  sourceLabel: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  featured: v.boolean(),
  sortOrder: v.number(),
  publishedAt: v.number(),
  updatedAt: v.number(),
});

export const contactIntentValidator = v.union(
  v.literal("join"),
  v.literal("partner"),
  v.literal("ask"),
);

export const contactStatusValidator = v.union(
  v.literal("new"),
  v.literal("reviewing"),
  v.literal("replied"),
  v.literal("closed"),
  v.literal("spam"),
);

export const publicMediaProjectionValidator = v.object({
  mediaId: v.id("mediaAssets"),
  publicUrl: v.string(),
  alt: v.string(),
  width: v.number(),
  height: v.number(),
});

export const publicInlineMediaValidator = publicMediaProjectionValidator;

export const publicPostValidator = v.object({
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  body: v.string(),
  editorJson: v.optional(v.string()),
  inlineMedia: v.optional(v.array(publicInlineMediaValidator)),
  category: v.string(),
  authorName: v.string(),
  coverKey: v.optional(v.string()),
  coverMedia: v.optional(publicMediaProjectionValidator),
  publishedAt: v.number(),
  updatedAt: v.number(),
  featured: v.boolean(),
});

export const publicPostSummaryValidator = v.object({
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  category: v.string(),
  authorName: v.string(),
  coverKey: v.optional(v.string()),
  coverMedia: v.optional(publicMediaProjectionValidator),
  publishedAt: v.number(),
  updatedAt: v.number(),
  featured: v.boolean(),
});

export const sitemapEntryValidator = v.object({
  slug: v.string(),
  updatedAt: v.number(),
});

export const memberRoleLevelValidator = v.union(
  v.literal(0),
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
);

export const memberDivisionValidator = v.union(
  v.literal("academic"),
  v.literal("art"),
  v.literal("mic"),
  v.literal("public-relation"),
  v.literal("human-resource-development"),
);

export const memberDivisionStatusValidator = v.union(
  v.literal("active"),
  v.literal("archived"),
);

export const memberPreCoordinatorRoleValidator = v.union(
  v.literal(0),
  v.literal(1),
);

export const memberPositionValidator = v.union(
  v.literal("secretary"),
  v.literal("treasury"),
  v.literal("vice-president"),
  v.literal("president"),
  v.literal("mentor"),
  v.literal("head-of-upa"),
);

export const memberProfileStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const memberConsentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("cleared"),
  v.literal("revoked"),
);

export const memberRecordOriginValidator = v.union(
  v.literal("reviewed"),
  v.literal("development-seed"),
);

export const memberPhotoValidator = v.object({
  objectKey: v.string(),
  width: v.number(),
  height: v.number(),
  alt: v.string(),
  focalPoint: v.string(),
});

export const publicMemberValidator = v.object({
  slug: v.string(),
  displayName: v.string(),
  roleLevel: memberRoleLevelValidator,
  division: v.optional(memberDivisionValidator),
  divisionKey: v.optional(v.string()),
  divisionName: v.optional(v.string()),
  position: v.optional(memberPositionValidator),
  joinedYear: v.optional(v.number()),
  shortBio: v.optional(v.string()),
  photo: v.optional(memberPhotoValidator),
  sortOrder: v.number(),
  updatedAt: v.number(),
});

export const adminRoleValidator = v.union(
  v.literal("owner"),
  v.literal("publisher"),
  v.literal("editor"),
);

export const adminStatusValidator = v.union(
  v.literal("active"),
  v.literal("disabled"),
);

export const adminPermissionValidator = v.union(
  v.literal("admin:manage"),
  v.literal("content:read"),
  v.literal("content:edit"),
  v.literal("content:publish"),
  v.literal("journal:read"),
  v.literal("journal:edit"),
  v.literal("journal:publish"),
  v.literal("contact:read"),
  v.literal("contact:manage"),
  v.literal("members:read"),
  v.literal("members:edit"),
  v.literal("media:read"),
  v.literal("media:upload"),
  v.literal("theme:read"),
  v.literal("theme:edit"),
  v.literal("theme:publish"),
  v.literal("assessment:read"),
  v.literal("assessment:edit"),
  v.literal("assessment:review"),
  v.literal("assessment:publish"),
  v.literal("programs:read"),
  v.literal("programs:edit"),
  v.literal("programs:publish"),
);

export const cmsAreaValidator = v.union(
  v.literal("admins"),
  v.literal("content"),
  v.literal("journal"),
  v.literal("contact"),
  v.literal("members"),
  v.literal("media"),
  v.literal("theme"),
  v.literal("assessment"),
  v.literal("programs"),
);

export const cmsActionValidator = v.union(
  v.literal("create"),
  v.literal("update"),
  v.literal("publish"),
  v.literal("archive"),
  v.literal("delete"),
  v.literal("restore"),
  v.literal("grant"),
  v.literal("disable"),
  v.literal("upload"),
  v.literal("verify"),
  v.literal("validate"),
  v.literal("review"),
  v.literal("retire"),
);

export const contentKindValidator = v.union(
  v.literal("plain-text"),
  v.literal("markdown"),
);

export const mediaPurposeValidator = v.union(
  v.literal("journal-cover"),
  v.literal("journal-inline"),
  v.literal("member-photo"),
  v.literal("page-image"),
  v.literal("brand"),
  v.literal("assessment-audio"),
  v.literal("assessment-image"),
);

export const mediaStatusValidator = v.union(
  v.literal("pending"),
  v.literal("ready"),
  v.literal("rejected"),
  v.literal("archived"),
);

export const mediaContentTypeValidator = v.union(
  v.literal("image/avif"),
  v.literal("image/jpeg"),
  v.literal("image/png"),
  v.literal("image/webp"),
  v.literal("audio/mpeg"),
  v.literal("audio/mp4"),
  v.literal("audio/ogg"),
  v.literal("audio/webm"),
);

export const themeSourceValidator = v.union(
  v.literal("preset"),
  v.literal("custom"),
);

export const themeEventActionValidator = v.union(
  v.literal("publish"),
  v.literal("rollback"),
);

export const oklchValidator = v.object({
  l: v.number(),
  c: v.number(),
  h: v.number(),
});

export const themeRecipeModeValidator = v.object({
  canvas: oklchValidator,
  surface: oklchValidator,
  ink: oklchValidator,
  mutedInk: oklchValidator,
  line: oklchValidator,
  identity: oklchValidator,
  response: oklchValidator,
});

export const themeRecipeValidator = v.object({
  contractVersion: v.literal(1),
  light: themeRecipeModeValidator,
  dark: themeRecipeModeValidator,
});

export const publicThemeModeValidator = v.object({
  page: oklchValidator,
  surface: oklchValidator,
  ink: oklchValidator,
  muted: oklchValidator,
  line: oklchValidator,
  primary: oklchValidator,
  primaryStrong: oklchValidator,
  primaryWash: oklchValidator,
  onPrimary: oklchValidator,
  signal: oklchValidator,
  signalInk: oklchValidator,
  danger: oklchValidator,
  success: oklchValidator,
  focus: oklchValidator,
  focusOffset: oklchValidator,
  selection: oklchValidator,
});

export const publicThemeSnapshotValidator = v.object({
  contractVersion: v.literal(1),
  light: publicThemeModeValidator,
  dark: publicThemeModeValidator,
});
