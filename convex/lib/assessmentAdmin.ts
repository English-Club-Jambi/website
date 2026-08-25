import { ConvexError } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function getMutableAssessmentVersion(
  ctx: QueryCtx | MutationCtx,
  versionId: Id<"assessmentVersions">,
) {
  const version = await ctx.db.get("assessmentVersions", versionId);
  if (
    version === null ||
    (version.status !== "draft" && version.status !== "ready")
  ) {
    throw new ConvexError({ code: "DRAFT_NOT_AVAILABLE" as const });
  }
  const definition = await ctx.db.get(
    "assessmentDefinitions",
    version.definitionId,
  );
  if (definition === null || definition.draftVersionId !== version._id) {
    throw new ConvexError({ code: "DRAFT_NOT_AVAILABLE" as const });
  }
  return { definition, version };
}

export async function bumpAssessmentRevision(
  ctx: MutationCtx,
  versionId: Id<"assessmentVersions">,
  currentRevision: number,
  now = Date.now(),
) {
  const nextRevision = currentRevision + 1;
  await ctx.db.patch("assessmentVersions", versionId, {
    contentRevision: nextRevision,
    status: "draft",
    validatedRevision: undefined,
    contentChecksum: undefined,
    updatedAt: now,
  });
  return nextRevision;
}
