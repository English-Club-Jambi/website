import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v, type Infer } from "convex/values";

import {
  attemptResultValidator,
  certificateTemplateValidator,
  resultDeliveryFailureValidator,
} from "./assessmentValidators";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  action,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { projectAttemptResult } from "./lib/assessmentResult";
import { projectReviewItem, reviewItemValidator } from "./lib/assessmentReview";
import { isRandomBankSection } from "./lib/assessmentQuestionBank";
import {
  assertSha256,
  normalizeDeliveryRequestId,
  normalizeReviewAccessToken,
  randomAccessToken,
  sha256Hex,
} from "./lib/resultDeliverySecurity";

const reviewGrantLifetimeMs = 30 * 24 * 60 * 60 * 1_000;
const reviewSessionLifetimeMs = 30 * 60 * 1_000;
const reviewSessionLimit = 5;
const deliveryRateWindowMs = 24 * 60 * 60 * 1_000;
const deliveryRateLimit = 3;
const deliveryLifetimeLimit = 6;
const globalDailyLimit = 250;
const verificationRateWindowMs = 10 * 60 * 1_000;
const verificationRateLimit = 6;
const verificationGlobalLimit = 500;
const verificationRetentionMs = 24 * 60 * 60 * 1_000;
const deliveryRetentionMs = 180 * 24 * 60 * 60 * 1_000;
const staleDeliveryMs = 10 * 60 * 1_000;
const purgeBatchSize = 50;

const reserveResultValidator = v.union(
  v.object({
    state: v.literal("created"),
    deliveryId: v.id("assessmentResultDeliveries"),
    grantId: v.id("assessmentResultReviewGrants"),
    expiresAt: v.number(),
  }),
  v.object({
    state: v.literal("accepted"),
    deliveryId: v.id("assessmentResultDeliveries"),
    expiresAt: v.number(),
  }),
  v.object({
    state: v.literal("in_progress"),
    deliveryId: v.id("assessmentResultDeliveries"),
  }),
  v.object({
    state: v.literal("failed"),
    deliveryId: v.id("assessmentResultDeliveries"),
  }),
  v.object({
    state: v.literal("uncertain"),
    deliveryId: v.id("assessmentResultDeliveries"),
    expiresAt: v.number(),
  }),
  v.object({
    state: v.literal("rate_limited"),
    retryAt: v.number(),
  }),
  v.object({ state: v.literal("limit_reached") }),
);

const deliverySnapshotValidator = v.object({
  deliveryId: v.id("assessmentResultDeliveries"),
  grantId: v.id("assessmentResultReviewGrants"),
  certificateTemplate: certificateTemplateValidator,
  publicCertificateId: v.string(),
  expiresAt: v.number(),
  result: attemptResultValidator,
});

const inspectResultValidator = v.union(
  v.object({ state: v.literal("missing") }),
  v.object({ state: v.literal("in_progress") }),
  v.object({ state: v.literal("failed") }),
  v.object({ state: v.literal("accepted"), expiresAt: v.number() }),
  v.object({ state: v.literal("uncertain"), expiresAt: v.number() }),
);

const verificationAuthorizationValidator = v.union(
  v.object({ state: v.literal("allowed") }),
  v.object({ state: v.literal("rate_limited"), retryAt: v.number() }),
);

const sharedResultValidator = v.object({
  expiresAt: v.number(),
  result: attemptResultValidator,
});
const sharedReviewPageValidator =
  paginationResultValidator(reviewItemValidator);
type SharedResult = Infer<typeof sharedResultValidator>;
type SharedReviewPage = Infer<typeof sharedReviewPageValidator>;
const redeemResultValidator = v.union(
  v.object({ ok: v.literal(false), code: v.literal("unavailable") }),
  v.object({
    ok: v.literal(true),
    sessionToken: v.string(),
    sessionExpiresAt: v.number(),
    grantExpiresAt: v.number(),
  }),
);
type RedeemResult = Infer<typeof redeemResultValidator>;

async function grantForDelivery(
  ctx: QueryCtx | MutationCtx,
  deliveryId: Id<"assessmentResultDeliveries">,
) {
  return await ctx.db
    .query("assessmentResultReviewGrants")
    .withIndex("by_delivery_id", (q) => q.eq("deliveryId", deliveryId))
    .unique();
}

async function validSessionForHash(
  ctx: QueryCtx,
  sessionHashInput: string,
  now: number,
) {
  const sessionHash = assertSha256(sessionHashInput);
  const session = await ctx.db
    .query("assessmentResultReviewSessions")
    .withIndex("by_session_hash", (q) => q.eq("sessionHash", sessionHash))
    .unique();
  if (
    session === null ||
    session.status !== "active" ||
    session.expiresAt <= now
  ) {
    return null;
  }
  const grant = await ctx.db.get(
    "assessmentResultReviewGrants",
    session.grantId,
  );
  if (grant === null || grant.status !== "active" || grant.expiresAt <= now) {
    return null;
  }
  const attempt = await ctx.db.get("assessmentAttempts", grant.attemptId);
  if (attempt === null || attempt.status !== "submitted") return null;
  return { session, grant, attempt };
}

export const authorizeVerification = internalMutation({
  args: {
    attemptId: v.id("assessmentAttempts"),
    ownerTokenIdentifier: v.string(),
  },
  returns: verificationAuthorizationValidator,
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get("assessmentAttempts", args.attemptId);
    if (
      attempt === null ||
      attempt.ownerTokenIdentifier !== args.ownerTokenIdentifier ||
      attempt.status !== "submitted" ||
      attempt.currentResultId === undefined
    ) {
      throw new ConvexError({ code: "ATTEMPT_NOT_FOUND" as const });
    }
    const definition = await ctx.db.get(
      "assessmentDefinitions",
      attempt.definitionId,
    );
    if (definition === null || definition.kind !== "full-practice") {
      throw new ConvexError({ code: "DELIVERY_NOT_AVAILABLE" as const });
    }

    const now = Date.now();
    const windowStart = now - verificationRateWindowMs;
    const recentForOwner = await ctx.db
      .query("assessmentResultVerificationEvents")
      .withIndex("by_owner_token_identifier_and_created_at", (q) =>
        q
          .eq("ownerTokenIdentifier", args.ownerTokenIdentifier)
          .gte("createdAt", windowStart),
      )
      .take(verificationRateLimit);
    const recentGlobal = await ctx.db
      .query("assessmentResultVerificationEvents")
      .withIndex("by_created_at", (q) => q.gte("createdAt", windowStart))
      .take(verificationGlobalLimit);
    if (recentForOwner.length >= verificationRateLimit) {
      const oldest = Math.min(
        ...recentForOwner.map((event) => event.createdAt),
      );
      return {
        state: "rate_limited" as const,
        retryAt: oldest + verificationRateWindowMs,
      };
    }
    if (recentGlobal.length >= verificationGlobalLimit) {
      return {
        state: "rate_limited" as const,
        retryAt: now + 60 * 1_000,
      };
    }
    await ctx.db.insert("assessmentResultVerificationEvents", {
      attemptId: attempt._id,
      ownerTokenIdentifier: args.ownerTokenIdentifier,
      createdAt: now,
    });
    return { state: "allowed" as const };
  },
});

export const reserve = internalMutation({
  args: {
    attemptId: v.id("assessmentAttempts"),
    ownerTokenIdentifier: v.string(),
    requestId: v.string(),
    certificateTemplate: certificateTemplateValidator,
    recipientHash: v.string(),
    certificateNameHash: v.string(),
    tokenHash: v.string(),
    providerAttemptId: v.string(),
    publicCertificateId: v.string(),
    consentVersion: v.literal(1),
    humanVerifiedAt: v.optional(v.number()),
  },
  returns: reserveResultValidator,
  handler: async (ctx, args) => {
    const requestId = normalizeDeliveryRequestId(args.requestId);
    const recipientHash = assertSha256(args.recipientHash);
    const certificateNameHash = assertSha256(args.certificateNameHash);
    const tokenHash = assertSha256(args.tokenHash);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
        args.providerAttemptId,
      ) ||
      !/^EC-[A-F0-9]{32}$/u.test(args.publicCertificateId) ||
      (args.humanVerifiedAt !== undefined &&
        !Number.isFinite(args.humanVerifiedAt))
    ) {
      throw new ConvexError({ code: "DELIVERY_METADATA_INVALID" as const });
    }
    const existing = await ctx.db
      .query("assessmentResultDeliveries")
      .withIndex("by_owner_token_identifier_and_request_id", (q) =>
        q
          .eq("ownerTokenIdentifier", args.ownerTokenIdentifier)
          .eq("requestId", requestId),
      )
      .unique();
    if (existing !== null) {
      if (
        existing.attemptId !== args.attemptId ||
        existing.certificateTemplate !== args.certificateTemplate ||
        existing.recipientHash !== recipientHash ||
        existing.certificateNameHash !== certificateNameHash ||
        existing.consentVersion !== args.consentVersion
      ) {
        throw new ConvexError({ code: "REQUEST_ID_REUSED" as const });
      }
      if (existing.status === "accepted") {
        const grant = await grantForDelivery(ctx, existing._id);
        return grant === null ||
          grant.status !== "active" ||
          grant.expiresAt <= Date.now()
          ? { state: "failed" as const, deliveryId: existing._id }
          : {
              state: "accepted" as const,
              deliveryId: existing._id,
              expiresAt: grant.expiresAt,
            };
      }
      if (existing.status === "uncertain") {
        const grant = await grantForDelivery(ctx, existing._id);
        return grant === null ||
          grant.status !== "active" ||
          grant.expiresAt <= Date.now()
          ? { state: "failed" as const, deliveryId: existing._id }
          : {
              state: "uncertain" as const,
              deliveryId: existing._id,
              expiresAt: grant.expiresAt,
            };
      }
      return existing.status === "preparing" || existing.status === "sending"
        ? { state: "in_progress" as const, deliveryId: existing._id }
        : { state: "failed" as const, deliveryId: existing._id };
    }

    const attempt = await ctx.db.get("assessmentAttempts", args.attemptId);
    if (
      attempt === null ||
      attempt.ownerTokenIdentifier !== args.ownerTokenIdentifier ||
      attempt.status !== "submitted" ||
      attempt.currentResultId === undefined
    ) {
      throw new ConvexError({ code: "ATTEMPT_NOT_FOUND" as const });
    }
    const definition = await ctx.db.get(
      "assessmentDefinitions",
      attempt.definitionId,
    );
    if (definition === null || definition.kind !== "full-practice") {
      throw new ConvexError({ code: "DELIVERY_NOT_AVAILABLE" as const });
    }

    const now = Date.now();
    const allForAttempt = await ctx.db
      .query("assessmentResultDeliveries")
      .withIndex("by_attempt_id_and_requested_at", (q) =>
        q.eq("attemptId", attempt._id),
      )
      .take(deliveryLifetimeLimit + 1);
    if (allForAttempt.length >= deliveryLifetimeLimit) {
      return { state: "limit_reached" as const };
    }
    const lockedIdentity = allForAttempt.find(
      (delivery) =>
        (delivery.status === "accepted" || delivery.status === "uncertain") &&
        delivery.certificateNameHash !== undefined &&
        delivery.certificateNameHash !== certificateNameHash,
    );
    if (lockedIdentity !== undefined) {
      throw new ConvexError({ code: "CERTIFICATE_IDENTITY_LOCKED" as const });
    }
    const recent = await ctx.db
      .query("assessmentResultDeliveries")
      .withIndex("by_attempt_id_and_requested_at", (q) =>
        q
          .eq("attemptId", attempt._id)
          .gte("requestedAt", now - deliveryRateWindowMs),
      )
      .take(deliveryRateLimit);
    const recentForRecipient = await ctx.db
      .query("assessmentResultDeliveries")
      .withIndex("by_recipient_hash_and_requested_at", (q) =>
        q
          .eq("recipientHash", recipientHash)
          .gte("requestedAt", now - deliveryRateWindowMs),
      )
      .take(deliveryRateLimit);
    const recentGlobal = await ctx.db
      .query("assessmentResultDeliveries")
      .withIndex("by_requested_at", (q) =>
        q.gte("requestedAt", now - deliveryRateWindowMs),
      )
      .take(globalDailyLimit);
    if (
      recent.length >= deliveryRateLimit ||
      recentForRecipient.length >= deliveryRateLimit ||
      recentGlobal.length >= globalDailyLimit
    ) {
      const oldest = Math.min(
        ...recent.map((delivery) => delivery.requestedAt),
      );
      return {
        state: "rate_limited" as const,
        retryAt:
          Number.isFinite(oldest) && recent.length >= deliveryRateLimit
            ? oldest + deliveryRateWindowMs
            : now + 60 * 60 * 1_000,
      };
    }

    const deliveryId = await ctx.db.insert("assessmentResultDeliveries", {
      attemptId: attempt._id,
      resultId: attempt.currentResultId,
      ownerTokenIdentifier: args.ownerTokenIdentifier,
      requestId,
      providerAttemptId: args.providerAttemptId,
      publicCertificateId: args.publicCertificateId,
      certificateTemplate: args.certificateTemplate,
      recipientHash,
      certificateNameHash,
      consentVersion: args.consentVersion,
      ...(args.humanVerifiedAt === undefined
        ? {}
        : { humanVerifiedAt: args.humanVerifiedAt }),
      status: "preparing",
      requestedAt: now,
      updatedAt: now,
    });
    const expiresAt = now + reviewGrantLifetimeMs;
    const grantId = await ctx.db.insert("assessmentResultReviewGrants", {
      deliveryId,
      attemptId: attempt._id,
      resultId: attempt.currentResultId,
      tokenHash,
      status: "active",
      createdAt: now,
      expiresAt,
    });
    return {
      state: "created" as const,
      deliveryId,
      grantId,
      expiresAt,
    };
  },
});

export const inspect = internalQuery({
  args: {
    attemptId: v.id("assessmentAttempts"),
    ownerTokenIdentifier: v.string(),
    requestId: v.string(),
    certificateTemplate: certificateTemplateValidator,
    recipientHash: v.string(),
    certificateNameHash: v.string(),
    consentVersion: v.literal(1),
    now: v.number(),
  },
  returns: inspectResultValidator,
  handler: async (ctx, args) => {
    const requestId = normalizeDeliveryRequestId(args.requestId);
    const recipientHash = assertSha256(args.recipientHash);
    const certificateNameHash = assertSha256(args.certificateNameHash);
    const existing = await ctx.db
      .query("assessmentResultDeliveries")
      .withIndex("by_owner_token_identifier_and_request_id", (q) =>
        q
          .eq("ownerTokenIdentifier", args.ownerTokenIdentifier)
          .eq("requestId", requestId),
      )
      .unique();
    if (existing === null) return { state: "missing" as const };
    if (
      existing.attemptId !== args.attemptId ||
      existing.certificateTemplate !== args.certificateTemplate ||
      existing.recipientHash !== recipientHash ||
      existing.certificateNameHash !== certificateNameHash ||
      existing.consentVersion !== args.consentVersion
    ) {
      throw new ConvexError({ code: "REQUEST_ID_REUSED" as const });
    }
    if (existing.status === "accepted" || existing.status === "uncertain") {
      const grant = await grantForDelivery(ctx, existing._id);
      if (
        grant === null ||
        grant.status !== "active" ||
        grant.expiresAt <= args.now
      )
        return { state: "failed" as const };
      return { state: existing.status, expiresAt: grant.expiresAt };
    }
    if (existing.status === "failed") return { state: "failed" as const };
    return { state: "in_progress" as const };
  },
});

export const getSnapshot = internalQuery({
  args: {
    deliveryId: v.id("assessmentResultDeliveries"),
    ownerTokenIdentifier: v.string(),
  },
  returns: v.union(deliverySnapshotValidator, v.null()),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(
      "assessmentResultDeliveries",
      args.deliveryId,
    );
    if (
      delivery === null ||
      delivery.ownerTokenIdentifier !== args.ownerTokenIdentifier ||
      delivery.status !== "preparing"
    ) {
      return null;
    }
    const [attempt, grant] = await Promise.all([
      ctx.db.get("assessmentAttempts", delivery.attemptId),
      grantForDelivery(ctx, delivery._id),
    ]);
    if (
      attempt === null ||
      grant === null ||
      grant.status !== "active" ||
      grant.resultId !== delivery.resultId ||
      delivery.publicCertificateId === undefined
    ) {
      return null;
    }
    const result = await projectAttemptResult(ctx, attempt, delivery.resultId);
    if (result === null || result.kind !== "full-practice") return null;
    return {
      deliveryId: delivery._id,
      grantId: grant._id,
      certificateTemplate: delivery.certificateTemplate,
      publicCertificateId: delivery.publicCertificateId,
      expiresAt: grant.expiresAt,
      result,
    };
  },
});

export const markAccepted = internalMutation({
  args: {
    deliveryId: v.id("assessmentResultDeliveries"),
    providerAttemptId: v.string(),
    providerMessageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(
      "assessmentResultDeliveries",
      args.deliveryId,
    );
    if (
      delivery === null ||
      delivery.status !== "sending" ||
      delivery.providerAttemptId !== args.providerAttemptId
    )
      return null;
    const providerMessageId = args.providerMessageId.trim().slice(0, 180);
    const now = Date.now();
    await ctx.db.patch(delivery._id, {
      status: "accepted",
      providerMessageId: providerMessageId || undefined,
      acceptedAt: now,
      updatedAt: now,
      failureCode: undefined,
    });
    return null;
  },
});

export const markFailed = internalMutation({
  args: {
    deliveryId: v.id("assessmentResultDeliveries"),
    failureCode: resultDeliveryFailureValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(
      "assessmentResultDeliveries",
      args.deliveryId,
    );
    if (
      delivery === null ||
      (delivery.status !== "preparing" && delivery.status !== "sending")
    )
      return null;
    const grant = await grantForDelivery(ctx, delivery._id);
    const now = Date.now();
    if (grant !== null) {
      await ctx.db.patch(grant._id, { status: "revoked" });
    }
    await ctx.db.patch(delivery._id, {
      status: "failed",
      failureCode: args.failureCode,
      updatedAt: now,
    });
    return null;
  },
});

export const markUncertain = internalMutation({
  args: {
    deliveryId: v.id("assessmentResultDeliveries"),
    providerAttemptId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(
      "assessmentResultDeliveries",
      args.deliveryId,
    );
    if (
      delivery === null ||
      delivery.status !== "sending" ||
      delivery.providerAttemptId !== args.providerAttemptId
    )
      return null;
    await ctx.db.patch(delivery._id, {
      status: "uncertain",
      failureCode: "provider_uncertain",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const beginProviderAttempt = internalMutation({
  args: {
    deliveryId: v.id("assessmentResultDeliveries"),
    providerAttemptId: v.string(),
  },
  returns: v.union(
    v.object({ state: v.literal("send") }),
    v.object({ state: v.literal("in_progress") }),
    v.object({ state: v.literal("accepted") }),
    v.object({ state: v.literal("uncertain") }),
    v.object({ state: v.literal("failed") }),
  ),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(
      "assessmentResultDeliveries",
      args.deliveryId,
    );
    if (
      delivery === null ||
      delivery.providerAttemptId !== args.providerAttemptId
    ) {
      throw new ConvexError({ code: "PROVIDER_ATTEMPT_MISMATCH" as const });
    }
    if (delivery.status === "preparing") {
      await ctx.db.patch(delivery._id, {
        status: "sending",
        updatedAt: Date.now(),
      });
      return { state: "send" as const };
    }
    if (delivery.status === "sending") return { state: "in_progress" as const };
    return { state: delivery.status };
  },
});

export const redeemGrant = internalMutation({
  args: {
    tokenHash: v.string(),
    sessionHash: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ ok: v.literal(false) }),
    v.object({
      ok: v.literal(true),
      sessionExpiresAt: v.number(),
      grantExpiresAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const tokenHash = assertSha256(args.tokenHash);
    const sessionHash = assertSha256(args.sessionHash);
    const grant = await ctx.db
      .query("assessmentResultReviewGrants")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (
      grant === null ||
      grant.status !== "active" ||
      grant.expiresAt <= args.now ||
      (grant.redemptionCount ?? 0) >= reviewSessionLimit
    )
      return { ok: false as const };
    const attempt = await ctx.db.get("assessmentAttempts", grant.attemptId);
    if (
      attempt === null ||
      attempt.status !== "submitted" ||
      attempt.currentResultId !== grant.resultId
    )
      return { ok: false as const };
    const sessions = await ctx.db
      .query("assessmentResultReviewSessions")
      .withIndex("by_grant_id_and_created_at", (q) =>
        q.eq("grantId", grant._id),
      )
      .take(reviewSessionLimit + 1);
    if (sessions.length > reviewSessionLimit) {
      throw new Error("Assessment review session bound exceeded.");
    }
    if (sessions.length === reviewSessionLimit) {
      return { ok: false as const };
    }
    const sessionExpiresAt = Math.min(
      grant.expiresAt,
      args.now + reviewSessionLifetimeMs,
    );
    await ctx.db.patch(grant._id, {
      redemptionCount: (grant.redemptionCount ?? 0) + 1,
    });
    await ctx.db.insert("assessmentResultReviewSessions", {
      grantId: grant._id,
      sessionHash,
      status: "active",
      createdAt: args.now,
      expiresAt: sessionExpiresAt,
    });
    return {
      ok: true as const,
      sessionExpiresAt,
      grantExpiresAt: grant.expiresAt,
    };
  },
});

export const redeem = action({
  args: { token: v.string() },
  returns: redeemResultValidator,
  handler: async (ctx, args): Promise<RedeemResult> => {
    const normalized = normalizeReviewAccessToken(args.token);
    if (normalized === null) return { ok: false, code: "unavailable" };
    const sessionToken = randomAccessToken();
    const redeemed = await ctx.runMutation(
      internal.assessmentResultDelivery.redeemGrant,
      {
        tokenHash: await sha256Hex(normalized),
        sessionHash: await sha256Hex(sessionToken),
        now: Date.now(),
      },
    );
    return redeemed.ok
      ? {
          ok: true,
          sessionToken,
          sessionExpiresAt: redeemed.sessionExpiresAt,
          grantExpiresAt: redeemed.grantExpiresAt,
        }
      : { ok: false, code: "unavailable" };
  },
});

export const getSharedResultAt = internalQuery({
  args: { sessionHash: v.string(), now: v.number() },
  returns: v.union(sharedResultValidator, v.null()),
  handler: async (ctx, args) => {
    const resolved = await validSessionForHash(ctx, args.sessionHash, args.now);
    if (resolved === null) return null;
    const result = await projectAttemptResult(
      ctx,
      resolved.attempt,
      resolved.grant.resultId,
    );
    if (result === null || result.kind !== "full-practice") return null;
    return { expiresAt: resolved.grant.expiresAt, result };
  },
});

export const getSharedResult = action({
  args: { sessionToken: v.string() },
  returns: v.union(sharedResultValidator, v.null()),
  handler: async (ctx, args): Promise<SharedResult | null> => {
    const normalized = normalizeReviewAccessToken(args.sessionToken);
    if (normalized === null) return null;
    return await ctx.runQuery(
      internal.assessmentResultDelivery.getSharedResultAt,
      { sessionHash: await sha256Hex(normalized), now: Date.now() },
    );
  },
});

export const listSharedReviewPageAt = internalQuery({
  args: {
    sessionHash: v.string(),
    now: v.number(),
    sectionOrder: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  returns: sharedReviewPageValidator,
  handler: async (ctx, args) => {
    const resolved = await validSessionForHash(ctx, args.sessionHash, args.now);
    if (resolved === null) {
      throw new ConvexError({ code: "REVIEW_NOT_AVAILABLE" as const });
    }
    if (
      args.paginationOpts.numItems !== 20 ||
      (args.paginationOpts.maximumRowsRead !== undefined &&
        args.paginationOpts.maximumRowsRead > 20)
    ) {
      throw new Error("Assessment review page size is invalid.");
    }
    if (
      !Number.isInteger(args.sectionOrder) ||
      args.sectionOrder < 0 ||
      args.sectionOrder > 7
    ) {
      throw new ConvexError({ code: "INVALID_SECTION_ORDER" as const });
    }
    const progress = await ctx.db
      .query("assessmentAttemptSections")
      .withIndex("by_attempt_id_and_order", (q) =>
        q.eq("attemptId", resolved.attempt._id).eq("order", args.sectionOrder),
      )
      .unique();
    if (progress === null) {
      throw new ConvexError({ code: "INVALID_SECTION_ORDER" as const });
    }
    const section = await ctx.db.get("assessmentSections", progress.sectionId);
    if (section === null || section.versionId !== resolved.attempt.versionId) {
      throw new ConvexError({ code: "ASSESSMENT_STRUCTURE_INVALID" as const });
    }

    if (isRandomBankSection(section)) {
      const pageResult = await ctx.db
        .query("assessmentAttemptItems")
        .withIndex("by_attempt_id_and_section_id_and_order", (q) =>
          q.eq("attemptId", resolved.attempt._id).eq("sectionId", section._id),
        )
        .paginate({ ...args.paginationOpts, maximumRowsRead: 20 });
      const page = [];
      for (const selection of pageResult.page) {
        const item = await ctx.db.get("assessmentItems", selection.itemId);
        if (item === null) {
          throw new ConvexError({
            code: "QUESTION_BANK_SOURCE_MISSING" as const,
          });
        }
        page.push(
          await projectReviewItem(ctx, resolved.attempt, section, item),
        );
      }
      return { ...pageResult, page };
    }

    const pageResult = await ctx.db
      .query("assessmentItems")
      .withIndex("by_section_id_and_order", (q) =>
        q.eq("sectionId", progress.sectionId),
      )
      .paginate({ ...args.paginationOpts, maximumRowsRead: 20 });
    const page = [];
    for (const item of pageResult.page) {
      page.push(await projectReviewItem(ctx, resolved.attempt, section, item));
    }
    return { ...pageResult, page };
  },
});

export const listSharedReviewPage = action({
  args: {
    sessionToken: v.string(),
    sectionOrder: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  returns: sharedReviewPageValidator,
  handler: async (ctx, args): Promise<SharedReviewPage> => {
    const normalized = normalizeReviewAccessToken(args.sessionToken);
    if (normalized === null) {
      throw new ConvexError({ code: "REVIEW_NOT_AVAILABLE" as const });
    }
    return await ctx.runQuery(
      internal.assessmentResultDelivery.listSharedReviewPageAt,
      {
        sessionHash: await sha256Hex(normalized),
        now: Date.now(),
        sectionOrder: args.sectionOrder,
        paginationOpts: args.paginationOpts,
      },
    );
  },
});

export const revokeMine = internalMutation({
  args: {
    attemptId: v.id("assessmentAttempts"),
    ownerTokenIdentifier: v.string(),
  },
  returns: v.object({ revoked: v.number() }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get("assessmentAttempts", args.attemptId);
    if (
      attempt === null ||
      attempt.ownerTokenIdentifier !== args.ownerTokenIdentifier
    ) {
      throw new ConvexError({ code: "ATTEMPT_NOT_FOUND" as const });
    }
    const deliveries = await ctx.db
      .query("assessmentResultDeliveries")
      .withIndex("by_attempt_id_and_requested_at", (q) =>
        q.eq("attemptId", args.attemptId),
      )
      .take(deliveryLifetimeLimit + 1);
    if (deliveries.length > deliveryLifetimeLimit) {
      throw new Error("Assessment result delivery bound exceeded.");
    }
    let revoked = 0;
    for (const delivery of deliveries) {
      const grant = await grantForDelivery(ctx, delivery._id);
      if (grant !== null && grant.status === "active") {
        await ctx.db.patch(grant._id, { status: "revoked" });
        const sessions = await ctx.db
          .query("assessmentResultReviewSessions")
          .withIndex("by_grant_id_and_created_at", (q) =>
            q.eq("grantId", grant._id),
          )
          .take(reviewSessionLimit + 1);
        if (sessions.length > reviewSessionLimit) {
          throw new Error("Assessment review session bound exceeded.");
        }
        for (const session of sessions) {
          if (session.status === "active") {
            await ctx.db.patch(session._id, { status: "revoked" });
          }
        }
        revoked += 1;
      }
    }
    return { revoked };
  },
});

export const purgeExpired = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
  handler: async (ctx) => {
    const now = Date.now();
    const oldVerificationEvents = await ctx.db
      .query("assessmentResultVerificationEvents")
      .withIndex("by_created_at", (q) =>
        q.lte("createdAt", now - verificationRetentionMs),
      )
      .take(purgeBatchSize);
    for (const event of oldVerificationEvents) {
      await ctx.db.delete("assessmentResultVerificationEvents", event._id);
    }
    const expiredSessions = await ctx.db
      .query("assessmentResultReviewSessions")
      .withIndex("by_expires_at", (q) => q.lte("expiresAt", now))
      .take(purgeBatchSize);
    for (const session of expiredSessions) {
      await ctx.db.delete("assessmentResultReviewSessions", session._id);
    }
    const expiredGrants = await ctx.db
      .query("assessmentResultReviewGrants")
      .withIndex("by_expires_at", (q) => q.lte("expiresAt", now))
      .take(purgeBatchSize);
    for (const grant of expiredGrants) {
      const sessions = await ctx.db
        .query("assessmentResultReviewSessions")
        .withIndex("by_grant_id_and_created_at", (q) =>
          q.eq("grantId", grant._id),
        )
        .take(reviewSessionLimit + 1);
      if (sessions.length > reviewSessionLimit) {
        throw new Error("Assessment review session bound exceeded.");
      }
      for (const session of sessions) {
        await ctx.db.delete("assessmentResultReviewSessions", session._id);
      }
      await ctx.db.delete("assessmentResultReviewGrants", grant._id);
    }

    const staleSending = await ctx.db
      .query("assessmentResultDeliveries")
      .withIndex("by_status_and_updated_at", (q) =>
        q.eq("status", "sending").lte("updatedAt", now - staleDeliveryMs),
      )
      .take(purgeBatchSize);
    for (const delivery of staleSending) {
      await ctx.db.patch(delivery._id, {
        status: "uncertain",
        failureCode: "provider_uncertain",
        updatedAt: now,
      });
    }
    const stalePreparing = await ctx.db
      .query("assessmentResultDeliveries")
      .withIndex("by_status_and_updated_at", (q) =>
        q.eq("status", "preparing").lte("updatedAt", now - staleDeliveryMs),
      )
      .take(purgeBatchSize);
    for (const delivery of stalePreparing) {
      const grant = await grantForDelivery(ctx, delivery._id);
      if (grant !== null) await ctx.db.patch(grant._id, { status: "revoked" });
      await ctx.db.patch(delivery._id, {
        status: "failed",
        failureCode: "certificate_unavailable",
        updatedAt: now,
      });
    }

    const retainedUntil = now - deliveryRetentionMs;
    const oldDeliveries = await ctx.db
      .query("assessmentResultDeliveries")
      .withIndex("by_updated_at", (q) => q.lte("updatedAt", retainedUntil))
      .take(purgeBatchSize);
    for (const delivery of oldDeliveries) {
      const grant = await grantForDelivery(ctx, delivery._id);
      if (grant !== null) {
        const sessions = await ctx.db
          .query("assessmentResultReviewSessions")
          .withIndex("by_grant_id_and_created_at", (q) =>
            q.eq("grantId", grant._id),
          )
          .take(reviewSessionLimit + 1);
        if (sessions.length > reviewSessionLimit) {
          throw new Error("Assessment review session bound exceeded.");
        }
        for (const session of sessions) {
          await ctx.db.delete("assessmentResultReviewSessions", session._id);
        }
        await ctx.db.delete("assessmentResultReviewGrants", grant._id);
      }
      await ctx.db.delete("assessmentResultDeliveries", delivery._id);
    }
    const deleted =
      oldVerificationEvents.length +
      expiredSessions.length +
      expiredGrants.length +
      oldDeliveries.length;
    const hasMore =
      oldVerificationEvents.length === purgeBatchSize ||
      expiredSessions.length === purgeBatchSize ||
      expiredGrants.length === purgeBatchSize ||
      oldDeliveries.length === purgeBatchSize ||
      staleSending.length === purgeBatchSize ||
      stalePreparing.length === purgeBatchSize;
    if (hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.assessmentResultDelivery.purgeExpired,
        {},
      );
    }
    return { deleted, hasMore };
  },
});
