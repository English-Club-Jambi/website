import { ConvexError } from "convex/values";

import type { UserIdentity } from "convex/server";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type AdminPermission =
  | "admin:manage"
  | "content:read"
  | "content:edit"
  | "content:publish"
  | "journal:read"
  | "journal:edit"
  | "journal:publish"
  | "members:read"
  | "members:edit"
  | "media:read"
  | "media:upload"
  | "theme:read"
  | "theme:edit"
  | "theme:publish"
  | "assessment:read"
  | "assessment:edit"
  | "assessment:review"
  | "assessment:publish"
  | "programs:read"
  | "programs:edit"
  | "programs:publish";

const rolePermissions: Record<
  Doc<"adminUsers">["role"],
  ReadonlySet<AdminPermission>
> = {
  editor: new Set([
    "content:read",
    "content:edit",
    "journal:read",
    "journal:edit",
    "members:read",
    "members:edit",
    "media:read",
    "media:upload",
    "theme:read",
    "theme:edit",
    "assessment:read",
    "assessment:edit",
    "programs:read",
    "programs:edit",
  ]),
  publisher: new Set([
    "content:read",
    "content:edit",
    "content:publish",
    "journal:read",
    "journal:edit",
    "journal:publish",
    "members:read",
    "members:edit",
    "media:read",
    "media:upload",
    "theme:read",
    "theme:edit",
    "theme:publish",
    "assessment:read",
    "assessment:review",
    "assessment:publish",
    "programs:read",
    "programs:edit",
    "programs:publish",
  ]),
  owner: new Set([
    "admin:manage",
    "content:read",
    "content:edit",
    "content:publish",
    "journal:read",
    "journal:edit",
    "journal:publish",
    "members:read",
    "members:edit",
    "media:read",
    "media:upload",
    "theme:read",
    "theme:edit",
    "theme:publish",
    "assessment:read",
    "assessment:edit",
    "assessment:review",
    "assessment:publish",
    "programs:read",
    "programs:edit",
    "programs:publish",
  ]),
};

export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new ConvexError({ code: "UNAUTHENTICATED" as const });
  }
  return identity;
}

export async function findAdminByTokenIdentifier(
  ctx: QueryCtx | MutationCtx,
  tokenIdentifier: string,
) {
  return await ctx.db
    .query("adminUsers")
    .withIndex("by_token_identifier", (q) =>
      q.eq("tokenIdentifier", tokenIdentifier),
    )
    .unique();
}

export async function findAdminByAuthAccount(
  ctx: QueryCtx | MutationCtx,
  authIssuer: string,
  authUserId: Id<"users">,
) {
  return await ctx.db
    .query("adminUsers")
    .withIndex("by_auth_issuer_and_auth_user_id", (q) =>
      q.eq("authIssuer", authIssuer).eq("authUserId", authUserId),
    )
    .unique();
}

export async function findAdminForIdentity(
  ctx: QueryCtx | MutationCtx,
  identity: UserIdentity,
) {
  const legacyAdmin = await findAdminByTokenIdentifier(
    ctx,
    identity.tokenIdentifier,
  );
  if (legacyAdmin !== null) return legacyAdmin;

  const rawAuthUserId = identity.subject.split("|")[0];
  const authUserId = ctx.db.normalizeId("users", rawAuthUserId);
  if (authUserId === null) return null;

  return await findAdminByAuthAccount(ctx, identity.issuer, authUserId);
}

export function adminHasPermission(
  admin: Pick<Doc<"adminUsers">, "role" | "status">,
  permission: AdminPermission,
) {
  return admin.status === "active" && rolePermissions[admin.role].has(permission);
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  permission: AdminPermission,
) {
  const identity = await requireIdentity(ctx);
  const admin = await findAdminForIdentity(ctx, identity);

  if (admin === null || admin.status !== "active") {
    throw new ConvexError({ code: "FORBIDDEN" as const });
  }
  if (!adminHasPermission(admin, permission)) {
    throw new ConvexError({ code: "INSUFFICIENT_PERMISSION" as const });
  }
  return admin;
}

export async function writeAuditEvent(
  ctx: MutationCtx,
  event: Omit<Doc<"cmsAuditEvents">, "_id" | "_creationTime" | "createdAt">,
) {
  return await ctx.db.insert("cmsAuditEvents", {
    ...event,
    createdAt: Date.now(),
  });
}
