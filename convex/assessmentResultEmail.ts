"use node";

import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";

import { ConvexError, v, type Infer } from "convex/values";

import {
  attemptResultValidator,
  certificateTemplateValidator,
} from "./assessmentValidators";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, env } from "./_generated/server";
import {
  CertificateArtifactError,
  generateFullPracticeCertificate,
} from "./lib/fullPracticeCertificate";
import {
  buildBrevoTransactionalPayload,
  buildBrevoTransactionalRequest,
  buildFullPracticeEmail,
} from "./lib/fullPracticeEmail";
import {
  maskEmail,
  normalizeDeliveryRequestId,
} from "./lib/resultDeliverySecurity";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const sendResultValidator = v.union(
  v.object({
    ok: v.literal(true),
    maskedEmail: v.string(),
    expiresAt: v.number(),
  }),
  v.object({
    ok: v.literal(false),
    code: v.union(
      v.literal("invalid"),
      v.literal("not_available"),
      v.literal("in_progress"),
      v.literal("rate_limited"),
      v.literal("limit_reached"),
      v.literal("certificate_name_invalid"),
      v.literal("certificate_unavailable"),
      v.literal("provider_unavailable"),
      v.literal("delivery_uncertain"),
      v.literal("configuration_unavailable"),
    ),
    retryAt: v.optional(v.number()),
  }),
);

type SendResult = Infer<typeof sendResultValidator>;
type CertificateTemplate = Infer<typeof certificateTemplateValidator>;
type AttemptResult = Infer<typeof attemptResultValidator>;
type ReserveResult =
  | {
      state: "created";
      deliveryId: Id<"assessmentResultDeliveries">;
      grantId: Id<"assessmentResultReviewGrants">;
      expiresAt: number;
    }
  | {
      state: "accepted";
      deliveryId: Id<"assessmentResultDeliveries">;
      expiresAt: number;
    }
  | {
      state: "in_progress" | "failed";
      deliveryId: Id<"assessmentResultDeliveries">;
    }
  | {
      state: "uncertain";
      deliveryId: Id<"assessmentResultDeliveries">;
      expiresAt: number;
    }
  | { state: "rate_limited"; retryAt: number }
  | { state: "limit_reached" };

type DeliverySnapshot = {
  deliveryId: Id<"assessmentResultDeliveries">;
  grantId: Id<"assessmentResultReviewGrants">;
  certificateTemplate: CertificateTemplate;
  publicCertificateId: string;
  expiresAt: number;
  result: AttemptResult;
};

function cleanName(value: string) {
  const name = value.trim().replace(/\s+/gu, " ");
  if (
    name.length < 2 ||
    name.length > 80 ||
    /[\u0000-\u001f\u007f]/u.test(name)
  ) {
    return null;
  }
  return name;
}

function cleanEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254 || !emailPattern.test(email)) {
    return null;
  }
  return email;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function recipientDigest(value: string, secret: string) {
  return createHmac("sha256", secret)
    .update("result-recipient\0", "utf8")
    .update(value, "utf8")
    .digest("hex");
}

function deliveryConfig() {
  const apiKey = env.BREVO_API_KEY?.trim();
  const senderEmail = env.BREVO_SENDER_EMAIL?.trim();
  const senderName = env.BREVO_SENDER_NAME?.trim();
  const replyToEmail = env.BREVO_REPLY_TO_EMAIL?.trim() || undefined;
  const rawOrigin = env.RESULT_DELIVERY_PUBLIC_ORIGIN?.trim();
  const recipientHashKey = env.RESULT_DELIVERY_RECIPIENT_HASH_KEY?.trim();
  const turnstileSecretKey = env.TURNSTILE_SECRET_KEY?.trim();
  if (
    !apiKey ||
    !senderEmail ||
    !senderName ||
    !rawOrigin ||
    !recipientHashKey ||
    recipientHashKey.length < 32 ||
    !turnstileSecretKey ||
    cleanEmail(senderEmail) === null ||
    (replyToEmail !== undefined && cleanEmail(replyToEmail) === null) ||
    senderName.length > 120
  ) {
    return null;
  }
  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    return null;
  }
  if (
    origin.protocol !== "https:" ||
    origin.origin !== rawOrigin.replace(/\/$/u, "")
  ) {
    return null;
  }
  return {
    apiKey,
    senderEmail,
    senderName,
    replyToEmail,
    recipientHashKey,
    turnstileSecretKey,
    origin: origin.origin,
  };
}

async function verifyTurnstile(args: {
  secret: string;
  response: string;
  expectedHostname: string;
}) {
  const token = args.response.trim();
  if (token.length < 20 || token.length > 2_048) return false;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: args.secret,
          response: token,
          idempotency_key: randomUUID(),
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) return false;
    const body = (await response.json().catch(() => null)) as {
      success?: unknown;
      action?: unknown;
      hostname?: unknown;
    } | null;
    return (
      body?.success === true &&
      body.action === "full-practice-result-email" &&
      body.hostname === args.expectedHostname
    );
  } catch {
    return false;
  }
}

async function postToBrevo(request: {
  endpoint: string;
  headers: Readonly<Record<string, string>>;
  body: string;
}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(request.endpoint, {
        method: "POST",
        headers: request.headers,
        body: request.body,
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) {
        const body = (await response.json().catch(() => null)) as {
          messageId?: unknown;
        } | null;
        return typeof body?.messageId === "string" && body.messageId.trim()
          ? { state: "accepted" as const, messageId: body.messageId }
          : { state: "uncertain" as const };
      }
      const errorBody = (await response.json().catch(() => null)) as {
        code?: unknown;
      } | null;
      if (response.status === 400 && errorBody?.code === "duplicate_parameter") {
        return { state: "uncertain" as const };
      }
      if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
        await wait(700);
        continue;
      }
      if (response.status === 401 || response.status === 403) {
        return { state: "configuration_failed" as const };
      }
      return response.status === 429 || response.status >= 500
        ? { state: "uncertain" as const }
        : { state: "provider_failed" as const };
    } catch {
      if (attempt === 0) {
        await wait(700);
        continue;
      }
      return { state: "uncertain" as const };
    }
  }
  return { state: "uncertain" as const };
}

export const send = action({
  args: {
    attemptId: v.id("assessmentAttempts"),
    recipientName: v.string(),
    recipientEmail: v.string(),
    certificateTemplate: certificateTemplateValidator,
    requestId: v.string(),
    consent: v.boolean(),
    consentVersion: v.literal(1),
    turnstileToken: v.string(),
  },
  returns: sendResultValidator,
  handler: async (ctx, args): Promise<SendResult> => {
    const identity = await ctx.auth.getUserIdentity();
    const recipientName = cleanName(args.recipientName);
    const recipientEmail = cleanEmail(args.recipientEmail);
    let requestId: string;
    try {
      requestId = normalizeDeliveryRequestId(args.requestId);
    } catch {
      return { ok: false as const, code: "invalid" as const };
    }
    if (
      identity === null ||
      recipientName === null ||
      recipientEmail === null ||
      !args.consent
    ) {
      return { ok: false as const, code: "invalid" as const };
    }
    const config = deliveryConfig();
    if (config === null) {
      return {
        ok: false as const,
        code: "configuration_unavailable" as const,
      };
    }
    const recipientHash = recipientDigest(
      recipientEmail,
      config.recipientHashKey,
    );
    const certificateNameHash = recipientDigest(
      recipientName,
      config.recipientHashKey,
    );
    try {
      const existing = await ctx.runQuery(
        internal.assessmentResultDelivery.inspect,
        {
          attemptId: args.attemptId,
          ownerTokenIdentifier: identity.tokenIdentifier,
          requestId,
          certificateTemplate: args.certificateTemplate,
          recipientHash,
          certificateNameHash,
          consentVersion: args.consentVersion,
          now: Date.now(),
        },
      );
      if (existing.state === "accepted") {
        return {
          ok: true as const,
          maskedEmail: maskEmail(recipientEmail),
          expiresAt: existing.expiresAt,
        };
      }
      if (existing.state === "uncertain") {
        return { ok: false as const, code: "delivery_uncertain" as const };
      }
      if (existing.state === "in_progress") {
        return { ok: false as const, code: "in_progress" as const };
      }
      if (existing.state === "failed") {
        return { ok: false as const, code: "provider_unavailable" as const };
      }
    } catch {
      return { ok: false as const, code: "not_available" as const };
    }
    let verificationAuthorization: {
      state: "allowed" | "rate_limited";
      retryAt?: number;
    };
    try {
      verificationAuthorization = await ctx.runMutation(
        internal.assessmentResultDelivery.authorizeVerification,
        {
          attemptId: args.attemptId,
          ownerTokenIdentifier: identity.tokenIdentifier,
        },
      );
    } catch {
      return { ok: false as const, code: "not_available" as const };
    }
    if (verificationAuthorization.state === "rate_limited") {
      return {
        ok: false as const,
        code: "rate_limited" as const,
        retryAt: verificationAuthorization.retryAt,
      };
    }
    if (
      !(await verifyTurnstile({
        secret: config.turnstileSecretKey,
        response: args.turnstileToken,
        expectedHostname: new URL(config.origin).hostname,
      }))
    ) {
      return { ok: false as const, code: "invalid" as const };
    }

    const reviewToken = randomBytes(32).toString("base64url");
    const providerAttemptId = randomUUID();
    const publicCertificateId = `EC-${randomBytes(16).toString("hex").toUpperCase()}`;
    const humanVerifiedAt = Date.now();
    let reserve: ReserveResult;
    try {
      reserve = await ctx.runMutation(
        internal.assessmentResultDelivery.reserve,
        {
          attemptId: args.attemptId,
          ownerTokenIdentifier: identity.tokenIdentifier,
          requestId,
          providerAttemptId,
          publicCertificateId,
          certificateTemplate: args.certificateTemplate,
          recipientHash,
          certificateNameHash,
          tokenHash: sha256(reviewToken),
          consentVersion: args.consentVersion,
          humanVerifiedAt,
        },
      );
    } catch {
      return { ok: false, code: "not_available" };
    }
    if (reserve.state === "accepted") {
      return {
        ok: true as const,
        maskedEmail: maskEmail(recipientEmail),
        expiresAt: reserve.expiresAt,
      };
    }
    if (reserve.state === "rate_limited") {
      return {
        ok: false as const,
        code: "rate_limited" as const,
        retryAt: reserve.retryAt,
      };
    }
    if (reserve.state === "limit_reached") {
      return { ok: false as const, code: "limit_reached" as const };
    }
    if (reserve.state === "in_progress") {
      return { ok: false as const, code: "in_progress" as const };
    }
    if (reserve.state === "uncertain") {
      return { ok: false as const, code: "delivery_uncertain" as const };
    }
    if (reserve.state === "failed") {
      return {
        ok: false as const,
        code: "provider_unavailable" as const,
      };
    }

    const snapshot: DeliverySnapshot | null = await ctx.runQuery(
      internal.assessmentResultDelivery.getSnapshot,
      {
        deliveryId: reserve.deliveryId,
        ownerTokenIdentifier: identity.tokenIdentifier,
      },
    );
    if (snapshot === null) {
      await ctx.runMutation(internal.assessmentResultDelivery.markFailed, {
        deliveryId: reserve.deliveryId,
        failureCode: "certificate_unavailable",
      });
      return {
        ok: false as const,
        code: "certificate_unavailable" as const,
      };
    }

    const reviewUrl = `${config.origin}/practice/review#access=${encodeURIComponent(reviewToken)}`;
    const elapsedSeconds = snapshot.result.sections.reduce(
      (total, section) => total + section.elapsedSeconds,
      0,
    );
    const paperEstimate =
      snapshot.result.estimate?.model === "ec-paper-linear-v1"
        ? snapshot.result.estimate.total
        : null;
    const artifactInput = {
      recipientName,
      completedAt: snapshot.result.completedAt,
      timingMode: snapshot.result.timingMode,
      listeningMode: snapshot.result.listeningMode,
      rawCorrect: snapshot.result.objective.correct,
      rawPossible: snapshot.result.objective.possible,
      omitted: snapshot.result.objective.omitted,
      elapsedSeconds,
      paperEstimate,
      sections: snapshot.result.sections.map((section) => ({
        label: section.title,
        correct: section.correct,
        possible: section.possible,
        omitted: Math.max(0, section.items - section.answered),
      })),
      resultRevision: snapshot.result.resultRevision,
      publicCertificateId: snapshot.publicCertificateId,
      reviewUrl,
      templateKey: snapshot.certificateTemplate,
    };

    let certificate: Uint8Array;
    let email;
    try {
      certificate = await generateFullPracticeCertificate(artifactInput);
      email = buildFullPracticeEmail(artifactInput);
    } catch (error) {
      await ctx.runMutation(internal.assessmentResultDelivery.markFailed, {
        deliveryId: reserve.deliveryId,
        failureCode: "certificate_unavailable",
      });
      if (
        error instanceof CertificateArtifactError &&
        (error.code === "CERTIFICATE_NAME_UNSUPPORTED" ||
          error.code === "CERTIFICATE_NAME_TOO_LONG")
      ) {
        return {
          ok: false as const,
          code: "certificate_name_invalid" as const,
        };
      }
      return {
        ok: false as const,
        code: "certificate_unavailable" as const,
      };
    }

    let request;
    try {
      const payload = buildBrevoTransactionalPayload({
        email,
        attachmentPdfBytes: certificate,
        recipientEmail,
        recipientName,
        senderEmail: config.senderEmail,
        senderName: config.senderName,
        replyToEmail: config.replyToEmail,
        idempotencyKey: providerAttemptId,
        deliveryReference: snapshot.publicCertificateId,
      });
      request = buildBrevoTransactionalRequest({
        apiKey: config.apiKey,
        payload,
      });
    } catch {
      await ctx.runMutation(internal.assessmentResultDelivery.markFailed, {
        deliveryId: reserve.deliveryId,
        failureCode: "configuration_unavailable",
      });
      return {
        ok: false as const,
        code: "configuration_unavailable" as const,
      };
    }

    const providerAttempt = await ctx.runMutation(
      internal.assessmentResultDelivery.beginProviderAttempt,
      {
        deliveryId: reserve.deliveryId,
        providerAttemptId,
      },
    );
    if (providerAttempt.state === "accepted") {
      return {
        ok: true as const,
        maskedEmail: maskEmail(recipientEmail),
        expiresAt: snapshot.expiresAt,
      };
    }
    if (providerAttempt.state === "uncertain") {
      return { ok: false as const, code: "delivery_uncertain" as const };
    }
    if (providerAttempt.state !== "send") {
      return {
        ok: false as const,
        code:
          providerAttempt.state === "in_progress"
            ? "in_progress" as const
            : "provider_unavailable" as const,
      };
    }

    const provider = await postToBrevo(request);
    if (provider.state === "uncertain") {
      await ctx.runMutation(internal.assessmentResultDelivery.markUncertain, {
        deliveryId: reserve.deliveryId,
        providerAttemptId,
      });
      return {
        ok: false as const,
        code: "delivery_uncertain" as const,
      };
    }
    if (provider.state !== "accepted") {
      await ctx.runMutation(internal.assessmentResultDelivery.markFailed, {
        deliveryId: reserve.deliveryId,
        failureCode:
          provider.state === "configuration_failed"
            ? "configuration_unavailable"
            : "provider_unavailable",
      });
      return {
        ok: false as const,
        code:
          provider.state === "configuration_failed"
            ? "configuration_unavailable" as const
            : "provider_unavailable" as const,
      };
    }
    await ctx.runMutation(internal.assessmentResultDelivery.markAccepted, {
      deliveryId: reserve.deliveryId,
      providerAttemptId,
      providerMessageId: provider.messageId,
    });
    return {
      ok: true as const,
      maskedEmail: maskEmail(recipientEmail),
      expiresAt: snapshot.expiresAt,
    };
  },
});

export const revokeReviewLinks = action({
  args: { attemptId: v.id("assessmentAttempts") },
  returns: v.object({ revoked: v.number() }),
  handler: async (ctx, args): Promise<{ revoked: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new ConvexError({ code: "AUTH_REQUIRED" as const });
    }
    return await ctx.runMutation(
      internal.assessmentResultDelivery.revokeMine,
      {
        attemptId: args.attemptId,
        ownerTokenIdentifier: identity.tokenIdentifier,
      },
    );
  },
});
