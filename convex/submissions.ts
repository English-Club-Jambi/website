import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  contactIntentValidator,
  contactStatusValidator,
} from "./validators";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const repeatWindowMs = 30 * 60 * 1000;
const repeatLimit = 3;
const contactRetentionMs = 180 * 24 * 60 * 60 * 1000;
const purgeBatchSize = 50;

const submissionResultValidator = v.union(
  v.object({ ok: v.literal(true) }),
  v.object({
    ok: v.literal(false),
    code: v.union(
      v.literal("invalid"),
      v.literal("rate_limited"),
      v.literal("rejected"),
    ),
  }),
);

const internalSubmissionValidator = v.object({
  _id: v.id("contactSubmissions"),
  _creationTime: v.number(),
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
});

function cleanLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    intent: contactIntentValidator,
    message: v.string(),
    consent: v.boolean(),
    website: v.optional(v.string()),
  },
  returns: submissionResultValidator,
  handler: async (ctx, args) => {
    const name = cleanLine(args.name);
    const email = args.email.trim();
    const normalizedEmail = email.toLowerCase();
    const message = args.message.trim();

    if ((args.website ?? "").trim().length > 0) {
      return { ok: false, code: "rejected" } as const;
    }

    if (
      name.length < 2 ||
      name.length > 80 ||
      email.length > 254 ||
      !emailPattern.test(email) ||
      message.length < 20 ||
      message.length > 2_000 ||
      !args.consent
    ) {
      return { ok: false, code: "invalid" } as const;
    }

    const now = Date.now();
    const recent = await ctx.db
      .query("contactSubmissions")
      .withIndex("by_normalized_email_created_at", (q) =>
        q
          .eq("normalizedEmail", normalizedEmail)
          .gte("createdAt", now - repeatWindowMs),
      )
      .take(repeatLimit);

    if (recent.length >= repeatLimit) {
      return { ok: false, code: "rate_limited" } as const;
    }

    await ctx.db.insert("contactSubmissions", {
      name,
      email,
      normalizedEmail,
      intent: args.intent,
      message,
      status: "new",
      consentAt: now,
      createdAt: now,
      updatedAt: now,
      sourcePath: "/contact",
    });

    return { ok: true } as const;
  },
});

export const listForReview = internalQuery({
  args: {
    status: contactStatusValidator,
    limit: v.optional(v.number()),
  },
  returns: v.array(internalSubmissionValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(50, Math.max(1, Math.floor(args.limit ?? 25)));
    return await ctx.db
      .query("contactSubmissions")
      .withIndex("by_status_created_at", (q) => q.eq("status", args.status))
      .order("desc")
      .take(limit);
  },
});

export const setStatus = internalMutation({
  args: {
    id: v.id("contactSubmissions"),
    status: contactStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const purgeExpired = internalMutation({
  args: {},
  returns: v.object({
    deleted: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx) => {
    const cutoff = Date.now() - contactRetentionMs;
    const expired = await ctx.db
      .query("contactSubmissions")
      .withIndex("by_created_at", (q) => q.lte("createdAt", cutoff))
      .order("asc")
      .take(purgeBatchSize);

    for (const submission of expired) {
      await ctx.db.delete("contactSubmissions", submission._id);
    }

    const hasMore = expired.length === purgeBatchSize;
    if (hasMore) {
      await ctx.scheduler.runAfter(0, internal.submissions.purgeExpired, {});
    }

    return { deleted: expired.length, hasMore };
  },
});
