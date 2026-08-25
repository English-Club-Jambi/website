import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AssessmentCtx = QueryCtx | MutationCtx;

export async function requireAssessmentIdentity(ctx: AssessmentCtx) {
  const identity = await ctx.auth.getUserIdentity();
  const authUserId = await getAuthUserId(ctx);

  if (identity === null || authUserId === null) {
    throw new ConvexError({ code: "UNAUTHENTICATED" as const });
  }

  const authUser = await ctx.db.get("users", authUserId);
  if (authUser === null) {
    throw new ConvexError({ code: "AUTH_PROFILE_MISSING" as const });
  }

  return {
    tokenIdentifier: identity.tokenIdentifier,
    authUserId,
    ownerKind: authUser.isAnonymous === true ? ("anonymous" as const) : ("account" as const),
  };
}

export async function requireOwnedAttempt(
  ctx: AssessmentCtx,
  attemptId: Id<"assessmentAttempts">,
) {
  const owner = await requireAssessmentIdentity(ctx);
  const attempt = await ctx.db.get("assessmentAttempts", attemptId);

  if (
    attempt === null ||
    attempt.ownerTokenIdentifier !== owner.tokenIdentifier
  ) {
    // Deliberately use one error for a missing and a cross-owner ID.
    throw new ConvexError({ code: "ATTEMPT_NOT_FOUND" as const });
  }

  return { owner, attempt };
}
