import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  findAdminByTokenIdentifier,
  requireAdmin,
  writeAuditEvent,
} from "./lib/adminAuth";
import { adminRoleValidator, adminStatusValidator } from "./validators";

const adminViewValidator = v.object({
  _id: v.id("adminUsers"),
  tokenIdentifier: v.string(),
  displayName: v.string(),
  email: v.optional(v.string()),
  role: adminRoleValidator,
  status: adminStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  lastSeenAt: v.optional(v.number()),
});

const identityViewValidator = v.union(
  v.null(),
  v.object({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }),
);

function cleanLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: string | undefined) {
  const email = value?.trim().toLowerCase();
  return email === undefined || email.length === 0 ? undefined : email;
}

function validateAdminProfile(
  tokenIdentifier: string,
  displayName: string,
  email: string | undefined,
) {
  if (
    tokenIdentifier.length < 8 ||
    tokenIdentifier.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(tokenIdentifier) ||
    displayName.length < 2 ||
    displayName.length > 100 ||
    (email !== undefined &&
      (email.length < 6 || email.length > 254 || !email.includes("@")))
  ) {
    throw new Error("Admin profile input is invalid.");
  }
}

function toAdminView(row: Doc<"adminUsers">) {
  return {
    _id: row._id,
    tokenIdentifier: row.tokenIdentifier,
    displayName: row.displayName,
    ...(row.email === undefined ? {} : { email: row.email }),
    role: row.role,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(row.lastSeenAt === undefined ? {} : { lastSeenAt: row.lastSeenAt }),
  };
}

export const whoAmI = query({
  args: {},
  returns: identityViewValidator,
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null;
    }
    return {
      tokenIdentifier: identity.tokenIdentifier,
      ...(identity.name === undefined ? {} : { name: identity.name }),
      ...(identity.email === undefined ? {} : { email: identity.email }),
    };
  },
});

export const me = query({
  args: {},
  returns: v.union(v.null(), adminViewValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null;
    }
    const admin = await findAdminByTokenIdentifier(
      ctx,
      identity.tokenIdentifier,
    );
    return admin === null || admin.status !== "active"
      ? null
      : toAdminView(admin);
  },
});

export const getActiveByTokenIdentifier = internalQuery({
  args: { tokenIdentifier: v.string() },
  returns: v.union(v.null(), adminViewValidator),
  handler: async (ctx, args) => {
    const admin = await findAdminByTokenIdentifier(ctx, args.tokenIdentifier);
    return admin === null || admin.status !== "active"
      ? null
      : toAdminView(admin);
  },
});

export const bootstrapOwner = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
  },
  returns: v.id("adminUsers"),
  handler: async (ctx, args) => {
    const displayName = cleanLine(args.displayName);
    const email = normalizeEmail(args.email);
    validateAdminProfile(args.tokenIdentifier, displayName, email);

    const firstAdmin = await ctx.db
      .query("adminUsers")
      .withIndex("by_created_at")
      .first();
    if (firstAdmin !== null) {
      throw new Error("Admin bootstrap has already been completed.");
    }

    const now = Date.now();
    return await ctx.db.insert("adminUsers", {
      tokenIdentifier: args.tokenIdentifier,
      displayName,
      ...(email === undefined ? {} : { email }),
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listPage = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(adminViewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "admin:manage");
    if (args.paginationOpts.numItems !== 20) {
      throw new Error("Admin page size is invalid.");
    }
    const result = await ctx.db
      .query("adminUsers")
      .withIndex("by_status_and_updated_at")
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: result.page.map(toAdminView) };
  },
});

export const setAccess = mutation({
  args: {
    tokenIdentifier: v.string(),
    displayName: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    role: adminRoleValidator,
    status: adminStatusValidator,
  },
  returns: v.id("adminUsers"),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "admin:manage");
    const displayName = cleanLine(args.displayName);
    const email = normalizeEmail(args.email ?? undefined);
    validateAdminProfile(args.tokenIdentifier, displayName, email);

    const existing = await findAdminByTokenIdentifier(
      ctx,
      args.tokenIdentifier,
    );
    if (
      existing !== null &&
      existing.role === "owner" &&
      existing.status === "active" &&
      (args.role !== "owner" || args.status !== "active")
    ) {
      const activeOwners = await ctx.db
        .query("adminUsers")
        .withIndex("by_role_and_status_and_updated_at", (q) =>
          q.eq("role", "owner").eq("status", "active"),
        )
        .take(2);
      if (activeOwners.length < 2) {
        throw new Error("The last active owner cannot be disabled or demoted.");
      }
    }

    const now = Date.now();
    const adminId =
      existing === null
        ? await ctx.db.insert("adminUsers", {
            tokenIdentifier: args.tokenIdentifier,
            displayName,
            ...(email === undefined ? {} : { email }),
            role: args.role,
            status: args.status,
            createdAt: now,
            updatedAt: now,
          })
        : existing._id;

    if (existing !== null) {
      await ctx.db.patch("adminUsers", existing._id, {
        displayName,
        email,
        role: args.role,
        status: args.status,
        updatedAt: now,
      });
    }

    await writeAuditEvent(ctx, {
      area: "admins",
      action: args.status === "disabled" ? "disable" : "grant",
      resourceType: "admin-user",
      resourceId: adminId,
      summary: `${args.role} access ${existing === null ? "granted" : "updated"}`,
      actorId: actor._id,
    });
    return adminId;
  },
});
