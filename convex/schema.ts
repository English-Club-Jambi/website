import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  assessmentAnswerKeyValidator,
  assessmentItemValidator,
  assessmentKindValidator,
  assessmentProfileValidator,
  assessmentResponseValidator,
  assessmentReviewDecisionValidator,
  assessmentReviewTypeValidator,
  attemptSectionStatusValidator,
  assessmentSkillValidator,
  assessmentVersionStatusValidator,
  assessmentVisibilityValidator,
  attemptOwnerKindValidator,
  attemptStatusValidator,
  audioReplayPolicyValidator,
  listeningModeValidator,
  mediaAccessValidator,
  resultStatusValidator,
  reviewPolicyValidator,
  scorePolicyValidator,
  stimulusKindValidator,
  timePolicyValidator,
  timingModeValidator,
  versionCheckStatusValidator,
} from "./assessmentValidators";
import {
  contactIntentValidator,
  contactStatusValidator,
  eventStatusValidator,
  memberConsentStatusValidator,
  memberDivisionValidator,
  memberPhotoValidator,
  memberPositionValidator,
  memberProfileStatusValidator,
  memberRoleLevelValidator,
  adminRoleValidator,
  adminStatusValidator,
  cmsActionValidator,
  cmsAreaValidator,
  contentKindValidator,
  mediaContentTypeValidator,
  mediaPurposeValidator,
  mediaStatusValidator,
  postStatusValidator,
  publicThemeSnapshotValidator,
  themeEventActionValidator,
  themeRecipeValidator,
  themeSourceValidator,
} from "./validators";

export default defineSchema({
  ...authTables,

  posts: defineTable({
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    body: v.string(),
    category: v.string(),
    authorName: v.string(),
    coverKey: v.optional(v.string()),
    status: postStatusValidator,
    featured: v.boolean(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    draftRevisionId: v.optional(v.id("postRevisions")),
    publishedRevisionId: v.optional(v.id("postRevisions")),
    nextRevision: v.optional(v.number()),
    coverMediaId: v.optional(v.id("mediaAssets")),
    createdBy: v.optional(v.id("adminUsers")),
    updatedBy: v.optional(v.id("adminUsers")),
  })
    .index("by_slug", ["slug"])
    .index("by_status_published_at", ["status", "publishedAt"])
    .index("by_status_featured_published_at", [
      "status",
      "featured",
      "publishedAt",
    ])
    .index("by_status_updated_at", ["status", "updatedAt"])
    .index("by_updated_at", ["updatedAt"]),

  postRevisions: defineTable({
    postId: v.id("posts"),
    revision: v.number(),
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    category: v.string(),
    authorName: v.string(),
    featured: v.boolean(),
    coverMediaId: v.optional(v.id("mediaAssets")),
    editorJson: v.string(),
    plainText: v.string(),
    createdBy: v.id("adminUsers"),
    createdAt: v.number(),
  }).index("by_post_id_and_revision", ["postId", "revision"]),

  events: defineTable({
    slug: v.string(),
    title: v.string(),
    summary: v.string(),
    body: v.string(),
    coverKey: v.optional(v.string()),
    locationLabel: v.optional(v.string()),
    status: eventStatusValidator,
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_starts_at", ["status", "startsAt"]),

  contactSubmissions: defineTable({
    name: v.string(),
    email: v.string(),
    normalizedEmail: v.string(),
    intent: contactIntentValidator,
    message: v.string(),
    status: contactStatusValidator,
    consentAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    sourcePath: v.string(),
  })
    .index("by_normalized_email_created_at", [
      "normalizedEmail",
      "createdAt",
    ])
    .index("by_status_created_at", ["status", "createdAt"]),

  members: defineTable({
    slug: v.string(),
    displayName: v.string(),
    roleLevel: memberRoleLevelValidator,
    division: v.optional(memberDivisionValidator),
    position: v.optional(memberPositionValidator),
    joinedYear: v.optional(v.number()),
    shortBio: v.optional(v.string()),
    photo: v.optional(memberPhotoValidator),
    profileStatus: memberProfileStatusValidator,
    profileConsentStatus: memberConsentStatusValidator,
    profileConsentUpdatedAt: v.optional(v.number()),
    photoConsentStatus: memberConsentStatusValidator,
    photoConsentUpdatedAt: v.optional(v.number()),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_public_sort", [
      "profileStatus",
      "profileConsentStatus",
      "sortOrder",
    ])
    .index("by_public_role_sort", [
      "profileStatus",
      "profileConsentStatus",
      "roleLevel",
      "sortOrder",
    ])
    .index("by_profile_status_and_updated_at", [
      "profileStatus",
      "updatedAt",
    ])
    .index("by_updated_at", ["updatedAt"]),

  adminUsers: defineTable({
    tokenIdentifier: v.string(),
    authIssuer: v.optional(v.string()),
    authUserId: v.optional(v.id("users")),
    displayName: v.string(),
    email: v.optional(v.string()),
    role: adminRoleValidator,
    status: adminStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_auth_issuer_and_auth_user_id", ["authIssuer", "authUserId"])
    .index("by_status_and_updated_at", ["status", "updatedAt"])
    .index("by_role_and_status_and_updated_at", [
      "role",
      "status",
      "updatedAt",
    ])
    .index("by_created_at", ["createdAt"]),

  cmsAuditEvents: defineTable({
    area: cmsAreaValidator,
    action: cmsActionValidator,
    resourceType: v.string(),
    resourceId: v.string(),
    summary: v.string(),
    actorId: v.id("adminUsers"),
    createdAt: v.number(),
  })
    .index("by_area_and_created_at", ["area", "createdAt"])
    .index("by_actor_id_and_created_at", ["actorId", "createdAt"]),

  siteContentEntries: defineTable({
    pageKey: v.string(),
    locale: v.string(),
    contentKey: v.string(),
    label: v.string(),
    kind: contentKindValidator,
    draftValue: v.string(),
    draftRevision: v.number(),
    publishedVersionId: v.optional(v.id("siteContentVersions")),
    createdBy: v.id("adminUsers"),
    updatedBy: v.id("adminUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_page_key_and_locale_and_content_key", [
      "pageKey",
      "locale",
      "contentKey",
    ])
    .index("by_page_key_and_locale_and_updated_at", [
      "pageKey",
      "locale",
      "updatedAt",
    ]),

  siteContentVersions: defineTable({
    entryId: v.id("siteContentEntries"),
    revision: v.number(),
    value: v.string(),
    publishedBy: v.id("adminUsers"),
    publishedAt: v.number(),
  }).index("by_entry_id_and_revision", ["entryId", "revision"]),

  mediaAssets: defineTable({
    objectKey: v.string(),
    purpose: mediaPurposeValidator,
    contentType: mediaContentTypeValidator,
    byteSize: v.number(),
    status: mediaStatusValidator,
    originalName: v.string(),
    alt: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    access: v.optional(mediaAccessValidator),
    durationMs: v.optional(v.number()),
    checksumSha256: v.optional(v.string()),
    assessmentVersionId: v.optional(v.id("assessmentVersions")),
    sourceMediaId: v.optional(v.id("mediaAssets")),
    uploadedBy: v.id("adminUsers"),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_object_key", ["objectKey"])
    .index("by_source_media_id", ["sourceMediaId"])
    .index("by_status_and_updated_at", ["status", "updatedAt"])
    .index("by_purpose_and_status_and_updated_at", [
      "purpose",
      "status",
      "updatedAt",
    ])
    .index("by_access_and_status_and_updated_at", [
      "access",
      "status",
      "updatedAt",
    ])
    .index("by_assessment_version_id_and_status_and_updated_at", [
      "assessmentVersionId",
      "status",
      "updatedAt",
    ])
    .index(
      "by_version_access_status_updated",
      ["assessmentVersionId", "access", "status", "updatedAt"],
    )
    .index(
      "by_version_purpose_status_updated",
      ["assessmentVersionId", "purpose", "status", "updatedAt"],
    )
    .index(
      "by_version_access_purpose_status_updated",
      [
        "assessmentVersionId",
        "access",
        "purpose",
        "status",
        "updatedAt",
      ],
    ),

  assessmentDefinitions: defineTable({
    slug: v.string(),
    kind: assessmentKindValidator,
    profile: assessmentProfileValidator,
    adminTitle: v.string(),
    publishedVersionId: v.optional(v.id("assessmentVersions")),
    draftVersionId: v.optional(v.id("assessmentVersions")),
    nextVersion: v.number(),
    visibility: assessmentVisibilityValidator,
    createdBy: v.id("adminUsers"),
    updatedBy: v.id("adminUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_kind_and_visibility_and_updated_at", [
      "kind",
      "visibility",
      "updatedAt",
    ])
    .index("by_visibility_and_updated_at", ["visibility", "updatedAt"]),

  assessmentVersions: defineTable({
    definitionId: v.id("assessmentDefinitions"),
    version: v.optional(v.number()),
    status: assessmentVersionStatusValidator,
    title: v.string(),
    summary: v.string(),
    instructions: v.string(),
    locale: v.string(),
    timePolicy: timePolicyValidator,
    totalTimeLimitSeconds: v.optional(v.number()),
    allowResume: v.boolean(),
    reviewPolicy: reviewPolicyValidator,
    scorePolicy: scorePolicyValidator,
    defaultTimingMode: timingModeValidator,
    defaultListeningMode: listeningModeValidator,
    maxAttemptsPerDay: v.number(),
    contentRevision: v.number(),
    validatedRevision: v.optional(v.number()),
    contentChecksum: v.optional(v.string()),
    cloneSourceVersionId: v.optional(v.id("assessmentVersions")),
    createdBy: v.id("adminUsers"),
    publishedBy: v.optional(v.id("adminUsers")),
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_definition_id_and_version", ["definitionId", "version"])
    .index("by_definition_id_and_status_and_updated_at", [
      "definitionId",
      "status",
      "updatedAt",
    ])
    .index("by_status_and_published_at", ["status", "publishedAt"]),

  assessmentVersionChecks: defineTable({
    versionId: v.id("assessmentVersions"),
    contentRevision: v.number(),
    status: versionCheckStatusValidator,
    blockingCount: v.number(),
    warningCount: v.number(),
    reportJson: v.string(),
    startedBy: v.id("adminUsers"),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_version_id_and_content_revision", [
      "versionId",
      "contentRevision",
    ])
    .index("by_status_and_started_at", ["status", "startedAt"]),

  assessmentVersionApprovals: defineTable({
    versionId: v.id("assessmentVersions"),
    contentRevision: v.number(),
    reviewType: assessmentReviewTypeValidator,
    decision: assessmentReviewDecisionValidator,
    reviewerId: v.id("adminUsers"),
    note: v.string(),
    createdAt: v.number(),
  })
    .index(
      "by_version_revision_review_created",
      ["versionId", "contentRevision", "reviewType", "createdAt"],
    )
    .index("by_version_id_and_review_type_and_created_at", [
      "versionId",
      "reviewType",
      "createdAt",
    ])
    .index("by_reviewer_id_and_created_at", ["reviewerId", "createdAt"]),

  assessmentSections: defineTable({
    versionId: v.id("assessmentVersions"),
    sectionKey: v.string(),
    skill: assessmentSkillValidator,
    order: v.number(),
    title: v.string(),
    instructions: v.string(),
    timeLimitSeconds: v.optional(v.number()),
    audioReplayPolicy: v.optional(audioReplayPolicyValidator),
    itemCount: v.number(),
  })
    .index("by_version_id_and_order", ["versionId", "order"])
    .index("by_version_id_and_section_key", ["versionId", "sectionKey"]),

  assessmentStimuli: defineTable({
    versionId: v.id("assessmentVersions"),
    sectionId: v.id("assessmentSections"),
    stimulusKey: v.string(),
    kind: stimulusKindValidator,
    order: v.number(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    mediaId: v.optional(v.id("mediaAssets")),
    transcript: v.optional(v.string()),
    alt: v.optional(v.string()),
    provenanceJson: v.string(),
    authoredBy: v.id("adminUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_section_id_and_order", ["sectionId", "order"])
    .index("by_version_id_and_stimulus_key", [
      "versionId",
      "stimulusKey",
    ]),

  assessmentItems: defineTable(assessmentItemValidator)
    .index("by_section_id_and_order", ["sectionId", "order"])
    .index("by_version_id_and_item_key", ["versionId", "itemKey"])
    .index("by_version_id_and_order", ["versionId", "order"]),

  assessmentAnswerKeys: defineTable(assessmentAnswerKeyValidator)
    .index("by_item_id", ["itemId"])
    .index("by_version_id_and_item_id", ["versionId", "itemId"]),

  assessmentAttempts: defineTable({
    versionId: v.id("assessmentVersions"),
    definitionId: v.id("assessmentDefinitions"),
    ownerTokenIdentifier: v.string(),
    ownerKind: attemptOwnerKindValidator,
    startRequestId: v.string(),
    timingMode: timingModeValidator,
    timeMultiplier: v.number(),
    listeningMode: listeningModeValidator,
    status: attemptStatusValidator,
    revision: v.number(),
    startedAt: v.number(),
    lastActivityAt: v.number(),
    submittedAt: v.optional(v.number()),
    currentSectionOrder: v.number(),
    currentItemOrder: v.number(),
    submitRequestId: v.optional(v.string()),
    currentResultId: v.optional(v.id("assessmentResults")),
    resultRevision: v.number(),
    startDayUtc: v.string(),
  })
    .index("by_owner_token_identifier_and_started_at", [
      "ownerTokenIdentifier",
      "startedAt",
    ])
    .index("by_owner_token_identifier_and_status_and_started_at", [
      "ownerTokenIdentifier",
      "status",
      "startedAt",
    ])
    .index("by_owner_token_identifier_and_start_request_id", [
      "ownerTokenIdentifier",
      "startRequestId",
    ])
    .index(
      "by_owner_version_day_started",
      ["ownerTokenIdentifier", "versionId", "startDayUtc", "startedAt"],
    )
    .index("by_version_id_and_started_at", ["versionId", "startedAt"])
    .index("by_status_and_last_activity_at", ["status", "lastActivityAt"]),

  assessmentAttemptSections: defineTable({
    attemptId: v.id("assessmentAttempts"),
    sectionId: v.id("assessmentSections"),
    order: v.number(),
    status: attemptSectionStatusValidator,
    startedAt: v.optional(v.number()),
    deadlineAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    elapsedSeconds: v.number(),
    answeredCount: v.number(),
    flaggedCount: v.number(),
  })
    .index("by_attempt_id_and_order", ["attemptId", "order"])
    .index("by_attempt_id_and_section_id", ["attemptId", "sectionId"]),

  assessmentResponses: defineTable(assessmentResponseValidator)
    .index("by_attempt_id_and_item_id", ["attemptId", "itemId"])
    .index("by_attempt_id_and_section_id_and_item_id", [
      "attemptId",
      "sectionId",
      "itemId",
    ])
    .index("by_attempt_id_and_updated_at", ["attemptId", "updatedAt"]),

  assessmentResults: defineTable({
    attemptId: v.id("assessmentAttempts"),
    versionId: v.id("assessmentVersions"),
    revision: v.number(),
    status: resultStatusValidator,
    correct: v.number(),
    possible: v.number(),
    omitted: v.number(),
    earnedPoints: v.optional(v.number()),
    possiblePoints: v.optional(v.number()),
    scoringModel: v.optional(v.literal("ec-ibt-style-v1")),
    overallBandEstimate: v.optional(v.number()),
    comparableTotalEstimate: v.optional(v.number()),
    estimateConfidence: v.optional(v.union(v.literal("low"), v.literal("moderate"))),
    supersedesResultId: v.optional(v.id("assessmentResults")),
    adjustmentReason: v.optional(v.string()),
    completedAt: v.number(),
    claimContract: v.literal(1),
  })
    .index("by_attempt_id_and_revision", ["attemptId", "revision"])
    .index("by_version_id_and_completed_at", ["versionId", "completedAt"]),

  assessmentSectionResults: defineTable({
    resultId: v.id("assessmentResults"),
    sectionId: v.id("assessmentSections"),
    skill: assessmentSkillValidator,
    correct: v.number(),
    possible: v.number(),
    omitted: v.number(),
    answeredCount: v.number(),
    itemCount: v.number(),
    elapsedSeconds: v.number(),
    earnedPoints: v.optional(v.number()),
    possiblePoints: v.optional(v.number()),
    bandEstimate: v.optional(v.number()),
    comparableScoreEstimate: v.optional(v.number()),
    estimateConfidence: v.optional(v.union(v.literal("low"), v.literal("moderate"))),
  })
    .index("by_result_id_and_section_id", ["resultId", "sectionId"])
    .index("by_result_id", ["resultId"]),

  publicThemeDrafts: defineTable({
    siteKey: v.literal("public"),
    name: v.string(),
    source: themeSourceValidator,
    presetKey: v.optional(v.string()),
    recipe: themeRecipeValidator,
    basedOnVersionId: v.optional(v.id("publicThemeVersions")),
    revision: v.number(),
    updatedBy: v.id("adminUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_site_key", ["siteKey"]),

  publicThemeVersions: defineTable({
    siteKey: v.literal("public"),
    version: v.number(),
    name: v.string(),
    source: themeSourceValidator,
    presetKey: v.optional(v.string()),
    recipe: themeRecipeValidator,
    snapshot: publicThemeSnapshotValidator,
    contractVersion: v.literal(1),
    publishedBy: v.id("adminUsers"),
    publishedAt: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_site_key_and_version", ["siteKey", "version"])
    .index("by_site_key_and_published_at", ["siteKey", "publishedAt"]),

  publicThemeState: defineTable({
    siteKey: v.literal("public"),
    publishedVersionId: v.id("publicThemeVersions"),
    previousVersionId: v.optional(v.id("publicThemeVersions")),
    nextVersion: v.number(),
    publicRevision: v.number(),
    updatedBy: v.id("adminUsers"),
    updatedAt: v.number(),
  }).index("by_site_key", ["siteKey"]),

  publicThemeEvents: defineTable({
    siteKey: v.literal("public"),
    action: themeEventActionValidator,
    fromVersionId: v.optional(v.id("publicThemeVersions")),
    toVersionId: v.id("publicThemeVersions"),
    actorId: v.id("adminUsers"),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_site_key_and_created_at", ["siteKey", "createdAt"])
    .index("by_actor_id_and_created_at", ["actorId", "createdAt"]),
});
