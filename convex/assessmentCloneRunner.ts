import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";

async function recordFailure(
  ctx: ActionCtx,
  draftVersionId: Id<"assessmentVersions">,
  actorId: Id<"adminUsers">,
) {
  await ctx.runMutation(internal.assessmentClone.markFailed, {
    draftVersionId,
    actorId,
  });
}

export const runSections = internalAction({
  args: {
    sourceVersionId: v.id("assessmentVersions"),
    draftVersionId: v.id("assessmentVersions"),
    actorId: v.id("adminUsers"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    try {
      await ctx.runMutation(internal.assessmentClone.cloneSections, args);
    } catch {
      await recordFailure(ctx, args.draftVersionId, args.actorId);
    }
    return null;
  },
});

export const runStimuliBatch = internalAction({
  args: {
    sourceVersionId: v.id("assessmentVersions"),
    draftVersionId: v.id("assessmentVersions"),
    actorId: v.id("adminUsers"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    try {
      await ctx.runMutation(internal.assessmentClone.cloneStimuliBatch, args);
    } catch {
      await recordFailure(ctx, args.draftVersionId, args.actorId);
    }
    return null;
  },
});

export const runItemsBatch = internalAction({
  args: {
    sourceVersionId: v.id("assessmentVersions"),
    draftVersionId: v.id("assessmentVersions"),
    actorId: v.id("adminUsers"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    try {
      await ctx.runMutation(internal.assessmentClone.cloneItemsBatch, args);
    } catch {
      await recordFailure(ctx, args.draftVersionId, args.actorId);
    }
    return null;
  },
});
