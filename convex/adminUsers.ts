import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  findAdminByAuthAccount,
  findAdminForIdentity,
  findAdminByTokenIdentifier,
  requireAdmin,
  writeAuditEvent,
} from "./lib/adminAuth";
import { inspectPasswordHash } from "./lib/passwordCrypto";
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

const passwordCredentialDiagnosticsValidator = v.object({
  accountExists: v.boolean(),
  hashStored: v.boolean(),
  algorithm: v.union(
    v.null(),
    v.literal("bcrypt"),
    v.literal("legacy-scrypt"),
    v.literal("unknown"),
  ),
  bcryptCost: v.optional(v.number()),
  accountCreatedAt: v.optional(v.number()),
  expirationFieldPresent: v.boolean(),
});

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
    const admin = await findAdminForIdentity(ctx, identity);
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

export const getActiveForIdentity = internalQuery({
  args: {
    tokenIdentifier: v.string(),
    subject: v.string(),
    issuer: v.string(),
  },
  returns: v.union(v.null(), adminViewValidator),
  handler: async (ctx, args) => {
    const legacyAdmin = await findAdminByTokenIdentifier(
      ctx,
      args.tokenIdentifier,
    );
    if (legacyAdmin !== null) {
      return legacyAdmin.status === "active" ? toAdminView(legacyAdmin) : null;
    }

    const rawAuthUserId = args.subject.split("|")[0];
    const authUserId = ctx.db.normalizeId("users", rawAuthUserId);
    if (authUserId === null) return null;

    const admin = await findAdminByAuthAccount(ctx, args.issuer, authUserId);
    return admin === null || admin.status !== "active"
      ? null
      : toAdminView(admin);
  },
});

export const inspectPasswordCredential = internalQuery({
  args: { email: v.string() },
  returns: passwordCredentialDiagnosticsValidator,
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (email === undefined) {
      throw new Error("Enter a valid email address.");
    }
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email),
      )
      .unique();
    if (account === null) {
      return {
        accountExists: false,
        hashStored: false,
        algorithm: null,
        expirationFieldPresent: false,
      };
    }

    const secret = account.secret ?? "";
    const inspection =
      secret.length === 0
        ? { algorithm: "unknown" as const }
        : inspectPasswordHash(secret);
    return {
      accountExists: true,
      hashStored: secret.length > 0,
      algorithm: inspection.algorithm,
      ...(inspection.bcryptCost === undefined
        ? {}
        : { bcryptCost: inspection.bcryptCost }),
      accountCreatedAt: account._creationTime,
      expirationFieldPresent: Object.prototype.hasOwnProperty.call(
        account,
        "expirationTime",
      ),
    };
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

export const bindProvisionedPasswordAccount = internalMutation({
  args: {
    authUserId: v.id("users"),
    authIssuer: v.string(),
    displayName: v.string(),
    email: v.string(),
    role: adminRoleValidator,
    replaceSoleLegacyTokenIdentifier: v.optional(v.string()),
  },
  returns: v.id("adminUsers"),
  handler: async (ctx, args) => {
    const displayName = cleanLine(args.displayName);
    const email = normalizeEmail(args.email);
    let issuerUrl: URL;
    try {
      issuerUrl = new URL(args.authIssuer);
    } catch {
      throw new Error("Provisioned admin identity is invalid.");
    }
    if (
      email === undefined ||
      args.authIssuer.length > 512 ||
      (issuerUrl.protocol !== "https:" && issuerUrl.hostname !== "localhost")
    ) {
      throw new Error("Provisioned admin identity is invalid.");
    }

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email),
      )
      .unique();
    const user = await ctx.db.get(args.authUserId);
    if (
      account === null ||
      account.userId !== args.authUserId ||
      user === null ||
      user.email?.trim().toLowerCase() !== email
    ) {
      throw new Error("Provisioned Password account could not be verified.");
    }

    const stableTokenIdentifier = `${args.authIssuer}|${args.authUserId}`;
    validateAdminProfile(stableTokenIdentifier, displayName, email);

    const stableAdmin = await findAdminByAuthAccount(
      ctx,
      args.authIssuer,
      args.authUserId,
    );
    const firstAdmins = await ctx.db
      .query("adminUsers")
      .withIndex("by_created_at")
      .take(2);

    let adminId: Id<"adminUsers">;
    let summary: string;
    const now = Date.now();

    if (stableAdmin !== null) {
      adminId = stableAdmin._id;
      summary = `${args.role} Password account reprovisioned internally`;
      await ctx.db.patch(stableAdmin._id, {
        tokenIdentifier: stableTokenIdentifier,
        authIssuer: args.authIssuer,
        authUserId: args.authUserId,
        displayName,
        email,
        role: args.role,
        status: "active",
        updatedAt: now,
      });
    } else if (
      args.replaceSoleLegacyTokenIdentifier !== undefined &&
      firstAdmins.length === 1 &&
      firstAdmins[0].tokenIdentifier ===
        args.replaceSoleLegacyTokenIdentifier &&
      firstAdmins[0].authUserId === undefined &&
      firstAdmins[0].role === "owner" &&
      firstAdmins[0].status === "active" &&
      args.role === "owner"
    ) {
      adminId = firstAdmins[0]._id;
      summary = "Placeholder owner rebound to an internal Password account";
      await ctx.db.patch(firstAdmins[0]._id, {
        tokenIdentifier: stableTokenIdentifier,
        authIssuer: args.authIssuer,
        authUserId: args.authUserId,
        displayName,
        email,
        updatedAt: now,
      });
    } else {
      if (firstAdmins.length === 0 && args.role !== "owner") {
        throw new Error("The first provisioned administrator must be an owner.");
      }
      if (
        args.replaceSoleLegacyTokenIdentifier !== undefined &&
        firstAdmins.length > 0
      ) {
        throw new Error("The requested placeholder owner repair is not safe.");
      }

      adminId = await ctx.db.insert("adminUsers", {
        tokenIdentifier: stableTokenIdentifier,
        authIssuer: args.authIssuer,
        authUserId: args.authUserId,
        displayName,
        email,
        role: args.role,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      summary = `${args.role} Password account provisioned internally`;
    }

    await writeAuditEvent(ctx, {
      area: "admins",
      action: "grant",
      resourceType: "admin-user",
      resourceId: adminId,
      summary,
      actorId: adminId,
    });
    return adminId;
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
