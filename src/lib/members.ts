import { fetchQuery } from "convex/nextjs";

import { api } from "../../convex/_generated/api";
import type {
  MemberDivision,
  MemberPosition,
  MemberRoleLevel,
} from "@content/member-roles";
import { getConvexDeploymentUrl } from "@/lib/convex";

export type PublicMemberPhoto = {
  objectKey: string;
  width: number;
  height: number;
  alt: string;
  focalPoint: string;
};

export type PublicMember = {
  slug: string;
  displayName: string;
  roleLevel: MemberRoleLevel;
  division?: MemberDivision;
  position?: MemberPosition;
  joinedYear?: number;
  shortBio?: string;
  photo?: PublicMemberPhoto;
  sortOrder: number;
  updatedAt: number;
};

export type MemberDirectoryResult =
  | { state: "ready"; members: PublicMember[] }
  | { state: "unavailable"; members: [] };

function reportUnavailable(error?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[members] The consent-gated directory is unavailable.",
      error instanceof Error ? error.message : error ?? "Convex URL is not set.",
    );
  }
}

export async function getPublishedMembers(
  limit = 120,
): Promise<MemberDirectoryResult> {
  const boundedLimit = Math.min(120, Math.max(1, Math.floor(limit)));

  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    reportUnavailable();
    return { state: "unavailable", members: [] };
  }

  try {
    const members = await fetchQuery(
      api.members.listPublished,
      { limit: boundedLimit },
      { url: convexUrl },
    );
    return { state: "ready", members };
  } catch (error) {
    reportUnavailable(error);
    return { state: "unavailable", members: [] };
  }
}
