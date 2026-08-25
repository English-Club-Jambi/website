import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import {
  memberDivisionStatusValidator,
  memberRoleLevelValidator,
} from "./validators";

const divisionSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const divisionLimit = 100;
const coordinatorCandidateLimit = 200;

const coordinatorSummaryValidator = v.object({
  memberId: v.id("members"),
  displayName: v.string(),
});

const divisionAdminViewValidator = v.object({
  _id: v.id("memberDivisions"),
  slug: v.string(),
  name: v.string(),
  summary: v.optional(v.string()),
  status: memberDivisionStatusValidator,
  sortOrder: v.number(),
  coordinator: v.union(v.null(), coordinatorSummaryValidator),
  hasMembers: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const coordinatorCandidateValidator = v.object({
  memberId: v.id("members"),
  displayName: v.string(),
  roleLevel: memberRoleLevelValidator,
  divisionId: v.optional(v.id("memberDivisions")),
});

function cleanLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

async function getDivisionCoordinator(
  ctx: MutationCtx,
  divisionId: Id<"memberDivisions">,
) {
  const coordinators = await ctx.db
    .query("members")
    .withIndex("by_division_id_and_role_level", (q) =>
      q.eq("divisionId", divisionId).eq("roleLevel", 2),
    )
    .take(2);
  if (coordinators.length > 1) {
    throw new Error("This division has conflicting coordinator assignments.");
  }
  return coordinators[0] ?? null;
}

async function setDivisionCoordinator(
  ctx: MutationCtx,
  division: Doc<"memberDivisions">,
  coordinatorMemberId: Id<"members"> | null,
) {
  const current = await getDivisionCoordinator(ctx, division._id);
  if (current?._id === coordinatorMemberId) return;

  const next =
    coordinatorMemberId === null
      ? null
      : await ctx.db.get("members", coordinatorMemberId);
  if (coordinatorMemberId !== null && next === null) {
    throw new Error("The selected coordinator profile was not found.");
  }
  if (next !== null) {
    if (next.profileStatus === "archived") {
      throw new Error("An archived profile cannot coordinate a division.");
    }
    if (next.roleLevel === 3 || next.roleLevel === 4) {
      throw new Error(
        "Core Members and Board members must keep their existing positions.",
      );
    }
    if (
      next.roleLevel === 2 &&
      next.divisionId !== undefined &&
      next.divisionId !== division._id
    ) {
      throw new Error("This member already coordinates another division.");
    }
  }

  const now = Date.now();
  if (current !== null) {
    await ctx.db.patch("members", current._id, {
      roleLevel: current.roleBeforeCoordinator ?? 1,
      division: undefined,
      divisionId: undefined,
      roleBeforeCoordinator: undefined,
      updatedAt: now,
    });
  }

  if (next !== null) {
    await ctx.db.patch("members", next._id, {
      roleLevel: 2,
      division: division.legacyKey,
      divisionId: division._id,
      position: undefined,
      roleBeforeCoordinator:
        next.roleLevel === 0 || next.roleLevel === 1
          ? next.roleLevel
          : next.roleBeforeCoordinator ?? 1,
      updatedAt: now,
    });
  }
}

export const list = query({
  args: { status: v.optional(memberDivisionStatusValidator) },
  returns: v.array(divisionAdminViewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "members:read");
    const rows =
      args.status === undefined
        ? await ctx.db
            .query("memberDivisions")
            .withIndex("by_sort_order")
            .take(divisionLimit + 1)
        : await ctx.db
            .query("memberDivisions")
            .withIndex("by_status_and_sort_order", (q) =>
              q.eq("status", args.status!),
            )
            .take(divisionLimit + 1);
    if (rows.length > divisionLimit) {
      throw new Error("The division catalogue exceeds its supported limit.");
    }

    return await Promise.all(
      rows.map(async (division) => {
        const [coordinators, memberReference] = await Promise.all([
          ctx.db
            .query("members")
            .withIndex("by_division_id_and_role_level", (q) =>
              q.eq("divisionId", division._id).eq("roleLevel", 2),
            )
            .take(2),
          ctx.db
            .query("members")
            .withIndex("by_division_id_and_role_level", (q) =>
              q.eq("divisionId", division._id),
            )
            .take(1),
        ]);
        if (coordinators.length > 1) {
          throw new Error("This division has conflicting coordinator assignments.");
        }
        const coordinator = coordinators[0];
        return {
          _id: division._id,
          slug: division.slug,
          name: division.name,
          ...(division.summary === undefined ? {} : { summary: division.summary }),
          status: division.status,
          sortOrder: division.sortOrder,
          coordinator:
            coordinator === undefined
              ? null
              : {
                  memberId: coordinator._id,
                  displayName: coordinator.displayName,
                },
          hasMembers: memberReference.length > 0,
          createdAt: division.createdAt,
          updatedAt: division.updatedAt,
        };
      }),
    );
  },
});

export const listCoordinatorCandidates = query({
  args: {},
  returns: v.array(coordinatorCandidateValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx, "members:read");
    const rows = await ctx.db
      .query("members")
      .withIndex("by_updated_at")
      .order("desc")
      .take(coordinatorCandidateLimit + 1);
    if (rows.length > coordinatorCandidateLimit) {
      throw new Error("The coordinator candidate list exceeds its supported limit.");
    }
    return rows.flatMap((member) =>
      member.profileStatus !== "archived" && member.roleLevel <= 2
        ? [
            {
              memberId: member._id,
              displayName: member.displayName,
              roleLevel: member.roleLevel,
              ...(member.divisionId === undefined
                ? {}
                : { divisionId: member.divisionId }),
            },
          ]
        : [],
    );
  },
});

export const save = mutation({
  args: {
    divisionId: v.optional(v.id("memberDivisions")),
    slug: v.string(),
    name: v.string(),
    summary: v.optional(v.string()),
    status: memberDivisionStatusValidator,
    sortOrder: v.number(),
    coordinatorMemberId: v.union(v.id("members"), v.null()),
  },
  returns: v.id("memberDivisions"),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "members:edit");
    const slug = args.slug.trim().toLowerCase();
    const name = cleanLine(args.name);
    const summary = args.summary?.trim();
    if (
      slug.length < 2 ||
      slug.length > 64 ||
      !divisionSlugPattern.test(slug) ||
      name.length < 2 ||
      name.length > 80 ||
      (summary !== undefined && (summary.length < 12 || summary.length > 240)) ||
      !Number.isInteger(args.sortOrder) ||
      args.sortOrder < 0 ||
      args.sortOrder > 10_000
    ) {
      throw new Error("Division input is invalid.");
    }
    if (args.status === "archived" && args.coordinatorMemberId !== null) {
      throw new Error("Remove the coordinator before archiving this division.");
    }

    const existingBySlug = await ctx.db
      .query("memberDivisions")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    const current =
      args.divisionId === undefined
        ? null
        : await ctx.db.get("memberDivisions", args.divisionId);
    if (args.divisionId !== undefined && current === null) {
      throw new Error("The division was not found.");
    }
    if (current !== null && current.slug !== slug) {
      throw new Error("Division addresses are fixed after creation.");
    }
    if (existingBySlug !== null && existingBySlug._id !== current?._id) {
      throw new Error("A division already uses this address.");
    }

    const now = Date.now();
    const divisionId =
      current === null
        ? await ctx.db.insert("memberDivisions", {
            slug,
            name,
            ...(summary === undefined ? {} : { summary }),
            status: args.status,
            sortOrder: args.sortOrder,
            createdAt: now,
            updatedAt: now,
          })
        : current._id;
    if (current !== null) {
      await ctx.db.patch("memberDivisions", current._id, {
        name,
        summary,
        status: args.status,
        sortOrder: args.sortOrder,
        updatedAt: now,
      });
    }
    const division = await ctx.db.get("memberDivisions", divisionId);
    if (division === null) throw new Error("The division could not be saved.");
    await setDivisionCoordinator(ctx, division, args.coordinatorMemberId);
    await writeAuditEvent(ctx, {
      area: "members",
      action: current === null ? "create" : "update",
      resourceType: "member-division",
      resourceId: divisionId,
      summary: `${name} division ${current === null ? "created" : "updated"}`,
      actorId: actor._id,
    });
    return divisionId;
  },
});

export const remove = mutation({
  args: { divisionId: v.id("memberDivisions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "members:edit");
    const division = await ctx.db.get("memberDivisions", args.divisionId);
    if (division === null) throw new Error("The division was not found.");
    const reference = await ctx.db
      .query("members")
      .withIndex("by_division_id_and_role_level", (q) =>
        q.eq("divisionId", division._id),
      )
      .take(1);
    if (reference.length > 0) {
      throw new Error("Remove member assignments before deleting this division.");
    }
    await ctx.db.delete("memberDivisions", division._id);
    await writeAuditEvent(ctx, {
      area: "members",
      action: "delete",
      resourceType: "member-division",
      resourceId: division._id,
      summary: `${division.name} division removed`,
      actorId: actor._id,
    });
    return null;
  },
});
