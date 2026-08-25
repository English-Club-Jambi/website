import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireAdmin } from "./lib/adminAuth";
import { cmsActionValidator, cmsAreaValidator } from "./validators";

const auditEventViewValidator = v.object({
  _id: v.id("cmsAuditEvents"),
  area: cmsAreaValidator,
  action: cmsActionValidator,
  resourceType: v.string(),
  resourceId: v.string(),
  summary: v.string(),
  actorId: v.id("adminUsers"),
  createdAt: v.number(),
});

function toView(event: Doc<"cmsAuditEvents">) {
  return {
    _id: event._id,
    area: event.area,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    summary: event.summary,
    actorId: event.actorId,
    createdAt: event.createdAt,
  };
}

export const listPage = query({
  args: {
    area: cmsAreaValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(auditEventViewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "admin:manage");
    if (args.paginationOpts.numItems !== 30) {
      throw new Error("Audit page size is invalid.");
    }
    const result = await ctx.db
      .query("cmsAuditEvents")
      .withIndex("by_area_and_created_at", (q) => q.eq("area", args.area))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: result.page.map(toView) };
  },
});
