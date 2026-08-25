import {
  coordinatorDivisions,
  type MemberDivision,
} from "./member-roles";

export type ManagedDivisionSeed = {
  slug: MemberDivision;
  name: string;
  summary: string;
  sortOrder: number;
  legacyKey: MemberDivision;
};

const divisionSummaries: Record<MemberDivision, string> = {
  academic:
    "Plans discussion prompts, learning sessions, and the academic rhythm of club practice.",
  art:
    "Uses visual work, performance, and creative prompts to give members more ways into a conversation.",
  mic:
    "Keeps club information, media, and communication clear, useful, and easy to find.",
  "public-relation":
    "Builds external relationships and handles invitations, follow-up, and public correspondence.",
  "human-resource-development":
    "Supports member development, shared workload, and the context people need to contribute well.",
};

export const managedDivisionSeeds = coordinatorDivisions.map(
  (division, index): ManagedDivisionSeed => ({
    slug: division.key,
    name: division.label,
    summary: divisionSummaries[division.key],
    sortOrder: (index + 1) * 10,
    legacyKey: division.key,
  }),
);
