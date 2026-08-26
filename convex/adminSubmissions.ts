import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import {
  contactIntentValidator,
  contactStatusValidator,
} from "./validators";

const contactSubmissionViewValidator = v.object({
  _id: v.id("contactSubmissions"),
  name: v.string(),
  email: v.string(),
  intent: contactIntentValidator,
  message: v.string(),
  status: contactStatusValidator,
  consentAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const statusChangeResultValidator = v.union(
  v.object({
    ok: v.literal(true),
    status: contactStatusValidator,
    updatedAt: v.number(),
  }),
  v.object({
    ok: v.literal(false),
    code: v.literal("conflict"),
    currentStatus: contactStatusValidator,
    currentUpdatedAt: v.number(),
  }),
);

function toView(submission: Doc<"contactSubmissions">) {
  return {
    _id: submission._id,
    name: submission.name,
    email: submission.email,
    intent: submission.intent,
    message: submission.message,
    status: submission.status,
    consentAt: submission.consentAt,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

export const listPage = query({
  args: {
    intent: v.optional(contactIntentValidator),
    status: v.optional(contactStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(contactSubmissionViewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "contact:read");
    if (args.paginationOpts.numItems !== 20) {
      throw new Error("Contact desk page size is invalid.");
    }
    const intent = args.intent;
    const status = args.status;

    if (intent !== undefined && status !== undefined) {
      const result = await ctx.db
        .query("contactSubmissions")
        .withIndex("by_intent_and_status_and_created_at", (q) =>
          q.eq("intent", intent).eq("status", status),
        )
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...result, page: result.page.map(toView) };
    }

    if (intent !== undefined) {
      const result = await ctx.db
        .query("contactSubmissions")
        .withIndex("by_intent_and_created_at", (q) =>
          q.eq("intent", intent),
        )
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...result, page: result.page.map(toView) };
    }

    if (status !== undefined) {
      const result = await ctx.db
        .query("contactSubmissions")
        .withIndex("by_status_created_at", (q) =>
          q.eq("status", status),
        )
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...result, page: result.page.map(toView) };
    }

    const result = await ctx.db
      .query("contactSubmissions")
      .withIndex("by_created_at")
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: result.page.map(toView) };
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("contactSubmissions"),
    status: contactStatusValidator,
    expectedUpdatedAt: v.number(),
  },
  returns: statusChangeResultValidator,
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "contact:manage");
    const submission = await ctx.db.get("contactSubmissions", args.id);
    if (submission === null) {
      throw new Error("This contact message no longer exists.");
    }

    if (submission.updatedAt !== args.expectedUpdatedAt) {
      return {
        ok: false,
        code: "conflict",
        currentStatus: submission.status,
        currentUpdatedAt: submission.updatedAt,
      } as const;
    }

    if (submission.status === args.status) {
      return {
        ok: true,
        status: submission.status,
        updatedAt: submission.updatedAt,
      } as const;
    }

    const updatedAt = Math.max(Date.now(), submission.updatedAt + 1);
    await ctx.db.patch(submission._id, {
      status: args.status,
      updatedAt,
    });
    await writeAuditEvent(ctx, {
      area: "contact",
      action: "update",
      resourceType: "contactSubmission",
      resourceId: submission._id,
      summary: `${submission.intent} submission marked ${args.status}`,
      actorId: actor._id,
    });

    return { ok: true, status: args.status, updatedAt } as const;
  },
});
