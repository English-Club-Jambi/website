import {
  isValidMemberAssignment,
  isValidMemberJoinedYear,
  type MemberDivision,
  type MemberPosition,
  type MemberRoleLevel,
} from "../content/member-roles";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

import {
  memberConsentStatusValidator,
  memberDivisionValidator,
  memberPhotoValidator,
  memberPositionValidator,
  memberPreCoordinatorRoleValidator,
  memberProfileStatusValidator,
  memberRecordOriginValidator,
  memberRoleLevelValidator,
  publicMemberValidator,
} from "./validators";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const memberPhotoKeyPattern =
  /^members\/(?:[a-z0-9][a-z0-9_-]*\/)+[a-z0-9][a-z0-9_-]*\.(?:avif|webp)$/;
const focalPointPattern = /^(?:100|[0-9]{1,2})% (?:100|[0-9]{1,2})%$/;

function cleanLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function boundedLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 120;
  }

  return Math.min(120, Math.max(1, Math.floor(value)));
}

function isValidPhoto(
  photo: Doc<"members">["photo"],
): photo is NonNullable<Doc<"members">["photo"]> {
  return (
    photo !== undefined &&
    memberPhotoKeyPattern.test(photo.objectKey) &&
    Number.isInteger(photo.width) &&
    photo.width > 0 &&
    photo.width <= 10_000 &&
    Number.isInteger(photo.height) &&
    photo.height > 0 &&
    photo.height <= 10_000 &&
    cleanLine(photo.alt).length >= 4 &&
    cleanLine(photo.alt).length <= 240 &&
    focalPointPattern.test(photo.focalPoint)
  );
}

function toPublicMember(
  row: Doc<"members">,
  managedDivision: Doc<"memberDivisions"> | null,
) {
  const displayName = cleanLine(row.displayName);
  const shortBio = row.shortBio?.trim();
  const assignment = {
    roleLevel: row.roleLevel as MemberRoleLevel,
    ...(row.division === undefined
      ? {}
      : { division: row.division as MemberDivision }),
    ...(managedDivision === null
      ? {}
      : { divisionKey: managedDivision.slug }),
    ...(row.position === undefined
      ? {}
      : { position: row.position as MemberPosition }),
  };

  if (
    row.profileStatus !== "published" ||
    row.profileConsentStatus !== "cleared" ||
    row.slug !== row.slug.trim().toLowerCase() ||
    row.slug.length < 3 ||
    row.slug.length > 96 ||
    !slugPattern.test(row.slug) ||
    displayName !== row.displayName ||
    displayName.length < 2 ||
    displayName.length > 100 ||
    (row.divisionId !== undefined &&
      (managedDivision === null || managedDivision.status !== "active")) ||
    (shortBio !== undefined &&
      (shortBio.length < 12 || shortBio.length > 280)) ||
    !isValidMemberAssignment(assignment)
  ) {
    return null;
  }

  const photo = row.photo;
  const approvedPhoto =
    row.photoConsentStatus === "cleared" && isValidPhoto(photo)
      ? {
          objectKey: photo.objectKey,
          width: photo.width,
          height: photo.height,
          alt: cleanLine(photo.alt),
          focalPoint: photo.focalPoint,
        }
      : undefined;
  const joinedYear = isValidMemberJoinedYear(row.joinedYear)
    ? row.joinedYear
    : undefined;

  return {
    slug: row.slug,
    displayName,
    roleLevel: row.roleLevel,
    ...(row.division === undefined ? {} : { division: row.division }),
    ...(managedDivision === null
      ? {}
      : {
          divisionKey: managedDivision.slug,
          divisionName: managedDivision.name,
        }),
    ...(row.position === undefined ? {} : { position: row.position }),
    ...(joinedYear === undefined ? {} : { joinedYear }),
    ...(shortBio === undefined ? {} : { shortBio }),
    ...(approvedPhoto === undefined ? {} : { photo: approvedPhoto }),
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
  };
}

export const listPublished = query({
  args: {
    roleLevel: v.optional(memberRoleLevelValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(publicMemberValidator),
  handler: async (ctx, args) => {
    const limit = boundedLimit(args.limit);
    const rows =
      args.roleLevel === undefined
        ? await ctx.db
            .query("members")
            .withIndex(
              "by_public_sort",
              (q) =>
                q
                  .eq("profileStatus", "published")
                  .eq("profileConsentStatus", "cleared"),
            )
            .order("asc")
            .take(limit)
        : await ctx.db
            .query("members")
            .withIndex(
              "by_public_role_sort",
              (q) =>
                q
                  .eq("profileStatus", "published")
                  .eq("profileConsentStatus", "cleared")
                  .eq("roleLevel", args.roleLevel as MemberRoleLevel),
            )
            .order("asc")
            .take(limit);

    const managedDivisions = await Promise.all(
      rows.map((row) =>
        row.divisionId === undefined
          ? Promise.resolve(null)
          : ctx.db.get("memberDivisions", row.divisionId),
      ),
    );

    return rows.flatMap((row, index) => {
      const member = toPublicMember(row, managedDivisions[index] ?? null);
      return member === null ? [] : [member];
    });
  },
});

export const upsertReviewed = internalMutation({
  args: {
    slug: v.string(),
    displayName: v.string(),
    roleLevel: memberRoleLevelValidator,
    division: v.optional(memberDivisionValidator),
    divisionId: v.optional(v.union(v.id("memberDivisions"), v.null())),
    roleBeforeCoordinator: v.optional(memberPreCoordinatorRoleValidator),
    position: v.optional(memberPositionValidator),
    joinedYear: v.optional(v.union(v.number(), v.null())),
    shortBio: v.optional(v.string()),
    photo: v.optional(memberPhotoValidator),
    profileStatus: memberProfileStatusValidator,
    profileConsentStatus: memberConsentStatusValidator,
    photoConsentStatus: memberConsentStatusValidator,
    recordOrigin: v.optional(memberRecordOriginValidator),
    seedBatch: v.optional(v.union(v.string(), v.null())),
    sortOrder: v.number(),
  },
  returns: v.id("members"),
  handler: async (ctx, args) => {
    const slug = args.slug.trim().toLowerCase();
    const displayName = cleanLine(args.displayName);
    const shortBio = args.shortBio?.trim();
    const existing = await ctx.db
      .query("members")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    const nextDivisionId =
      args.divisionId === undefined
        ? existing?.divisionId
        : args.divisionId === null
          ? undefined
          : args.divisionId;
    const managedDivision =
      nextDivisionId === undefined
        ? null
        : await ctx.db.get("memberDivisions", nextDivisionId);
    const assignment = {
      roleLevel: args.roleLevel,
      ...(args.division === undefined ? {} : { division: args.division }),
      ...(managedDivision === null
        ? {}
        : { divisionKey: managedDivision.slug }),
      ...(args.position === undefined ? {} : { position: args.position }),
    };

    if (
      slug.length < 3 ||
      slug.length > 96 ||
      !slugPattern.test(slug) ||
      displayName.length < 2 ||
      displayName.length > 100 ||
      (shortBio !== undefined &&
        (shortBio.length < 12 || shortBio.length > 280)) ||
      !Number.isInteger(args.sortOrder) ||
      args.sortOrder < 0 ||
      args.sortOrder > 100_000 ||
      (args.joinedYear !== undefined &&
        args.joinedYear !== null &&
        !isValidMemberJoinedYear(args.joinedYear)) ||
      !isValidMemberAssignment(assignment) ||
      (nextDivisionId !== undefined &&
        (managedDivision === null || managedDivision.status !== "active"))
    ) {
      throw new Error("Member profile input is invalid.");
    }

    if (
      (args.photo !== undefined && !isValidPhoto(args.photo)) ||
      (args.photoConsentStatus === "cleared" && args.photo === undefined)
    ) {
      throw new Error("Member photo input is invalid.");
    }

    const now = Date.now();
    const nextJoinedYear =
      args.joinedYear === undefined
        ? isValidMemberJoinedYear(existing?.joinedYear)
          ? existing.joinedYear
          : undefined
        : args.joinedYear === null
          ? undefined
          : args.joinedYear;
    const nextSeedBatch =
      args.seedBatch === null
        ? undefined
        : args.seedBatch ?? existing?.seedBatch;
    const record = {
      slug,
      displayName,
      roleLevel: args.roleLevel,
      ...(args.division === undefined ? {} : { division: args.division }),
      ...(nextDivisionId === undefined ? {} : { divisionId: nextDivisionId }),
      ...(args.roleLevel !== 2
        ? {}
        : args.roleBeforeCoordinator !== undefined
          ? { roleBeforeCoordinator: args.roleBeforeCoordinator }
          : existing?.roleBeforeCoordinator === undefined
            ? {}
            : { roleBeforeCoordinator: existing.roleBeforeCoordinator }),
      ...(args.position === undefined ? {} : { position: args.position }),
      ...(nextJoinedYear === undefined ? {} : { joinedYear: nextJoinedYear }),
      ...(shortBio === undefined ? {} : { shortBio }),
      ...(args.photo === undefined
        ? {}
        : {
            photo: {
              ...args.photo,
              alt: cleanLine(args.photo.alt),
            },
          }),
      profileStatus: args.profileStatus,
      profileConsentStatus: args.profileConsentStatus,
      profileConsentUpdatedAt:
        existing === null ||
        existing.profileConsentStatus !== args.profileConsentStatus
          ? now
          : existing.profileConsentUpdatedAt,
      photoConsentStatus: args.photoConsentStatus,
      photoConsentUpdatedAt:
        existing === null || existing.photoConsentStatus !== args.photoConsentStatus
          ? now
          : existing.photoConsentUpdatedAt,
      recordOrigin: args.recordOrigin ?? existing?.recordOrigin ?? "reviewed",
      ...(nextSeedBatch === undefined ? {} : { seedBatch: nextSeedBatch }),
      sortOrder: args.sortOrder,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (existing === null) {
      return await ctx.db.insert("members", record);
    }

    await ctx.db.replace(existing._id, record);
    return existing._id;
  },
});
