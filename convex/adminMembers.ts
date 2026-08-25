import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdmin, writeAuditEvent } from "./lib/adminAuth";
import {
  memberConsentStatusValidator,
  memberDivisionValidator,
  memberPhotoValidator,
  memberPositionValidator,
  memberProfileStatusValidator,
  memberRecordOriginValidator,
  memberRoleLevelValidator,
} from "./validators";

const memberAdminViewValidator = v.object({
  _id: v.id("members"),
  slug: v.string(),
  displayName: v.string(),
  roleLevel: memberRoleLevelValidator,
  division: v.optional(memberDivisionValidator),
  divisionId: v.optional(v.id("memberDivisions")),
  position: v.optional(memberPositionValidator),
  joinedYear: v.optional(v.number()),
  shortBio: v.optional(v.string()),
  photo: v.optional(memberPhotoValidator),
  profileStatus: memberProfileStatusValidator,
  profileConsentStatus: memberConsentStatusValidator,
  photoConsentStatus: memberConsentStatusValidator,
  recordOrigin: memberRecordOriginValidator,
  seedBatch: v.optional(v.string()),
  sortOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function toAdminView(member: Doc<"members">) {
  return {
    _id: member._id,
    slug: member.slug,
    displayName: member.displayName,
    roleLevel: member.roleLevel,
    ...(member.division === undefined ? {} : { division: member.division }),
    ...(member.divisionId === undefined ? {} : { divisionId: member.divisionId }),
    ...(member.position === undefined ? {} : { position: member.position }),
    ...(member.joinedYear === undefined
      ? {}
      : { joinedYear: member.joinedYear }),
    ...(member.shortBio === undefined ? {} : { shortBio: member.shortBio }),
    ...(member.photo === undefined ? {} : { photo: member.photo }),
    profileStatus: member.profileStatus,
    profileConsentStatus: member.profileConsentStatus,
    photoConsentStatus: member.photoConsentStatus,
    recordOrigin: member.recordOrigin ?? "reviewed",
    ...(member.seedBatch === undefined ? {} : { seedBatch: member.seedBatch }),
    sortOrder: member.sortOrder,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

export const listPage = query({
  args: {
    status: v.optional(memberProfileStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(memberAdminViewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "members:read");
    if (args.paginationOpts.numItems !== 20) {
      throw new Error("Member admin page size is invalid.");
    }
    const result =
      args.status === undefined
        ? await ctx.db
            .query("members")
            .withIndex("by_updated_at")
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("members")
            .withIndex("by_profile_status_and_updated_at", (q) =>
              q.eq("profileStatus", args.status!),
            )
            .order("desc")
            .paginate(args.paginationOpts);
    return { ...result, page: result.page.map(toAdminView) };
  },
});

export const getById = query({
  args: { memberId: v.id("members") },
  returns: v.union(v.null(), memberAdminViewValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "members:read");
    const member = await ctx.db.get("members", args.memberId);
    return member === null ? null : toAdminView(member);
  },
});

export const saveReviewed = mutation({
  args: {
    slug: v.string(),
    displayName: v.string(),
    roleLevel: memberRoleLevelValidator,
    division: v.optional(memberDivisionValidator),
    divisionId: v.optional(v.union(v.id("memberDivisions"), v.null())),
    position: v.optional(memberPositionValidator),
    joinedYear: v.optional(v.union(v.number(), v.null())),
    shortBio: v.optional(v.string()),
    photo: v.optional(memberPhotoValidator),
    profileStatus: memberProfileStatusValidator,
    profileConsentStatus: memberConsentStatusValidator,
    photoConsentStatus: memberConsentStatusValidator,
    sortOrder: v.number(),
  },
  returns: v.id("members"),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "members:edit");
    const slug = args.slug.trim().toLowerCase();
    const existing = await ctx.db
      .query("members")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (args.divisionId !== undefined && args.divisionId !== null) {
      const division = await ctx.db.get("memberDivisions", args.divisionId);
      if (division === null || division.status !== "active") {
        throw new Error("Choose an active managed division.");
      }
      if (args.roleLevel !== 2) {
        throw new Error("Only a Coordinator can be assigned to a division.");
      }
      const conflictingCoordinator = await ctx.db
        .query("members")
        .withIndex("by_division_id_and_role_level", (q) =>
          q.eq("divisionId", division._id).eq("roleLevel", 2),
        )
        .take(2);
      if (conflictingCoordinator.some((member) => member._id !== existing?._id)) {
        throw new Error("This division already has a coordinator.");
      }
    }
    if (args.photo !== undefined) {
      const media = await ctx.db
        .query("mediaAssets")
        .withIndex("by_object_key", (q) =>
          q.eq("objectKey", args.photo!.objectKey),
        )
        .unique();
      if (
        media === null ||
        media.status !== "ready" ||
        media.purpose !== "member-photo" ||
        media.width !== args.photo.width ||
        media.height !== args.photo.height
      ) {
        throw new Error("Member portrait has not passed media verification.");
      }
    }
    const memberId: Doc<"members">["_id"] = await ctx.runMutation(
      internal.members.upsertReviewed,
      {
        ...args,
        ...(args.roleLevel !== 2
          ? {}
          : {
              roleBeforeCoordinator:
                existing?.roleLevel === 0 || existing?.roleLevel === 1
                  ? existing.roleLevel
                  : existing?.roleBeforeCoordinator ?? 1,
            }),
      },
    );
    await writeAuditEvent(ctx, {
      area: "members",
      action: "update",
      resourceType: "member",
      resourceId: memberId,
      summary: `${args.displayName.trim()} profile saved`,
      actorId: actor._id,
    });
    return memberId;
  },
});

export const archive = mutation({
  args: { memberId: v.id("members") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, "members:edit");
    const member = await ctx.db.get("members", args.memberId);
    if (member === null) {
      throw new Error("Member profile was not found.");
    }
    await ctx.db.patch("members", member._id, {
      profileStatus: "archived",
      ...(member.roleLevel === 2
        ? {
            roleLevel: member.roleBeforeCoordinator ?? 1,
            division: undefined,
            divisionId: undefined,
            roleBeforeCoordinator: undefined,
          }
        : {}),
      updatedAt: Date.now(),
    });
    await writeAuditEvent(ctx, {
      area: "members",
      action: "archive",
      resourceType: "member",
      resourceId: member._id,
      summary: `${member.displayName} profile archived`,
      actorId: actor._id,
    });
    return null;
  },
});
