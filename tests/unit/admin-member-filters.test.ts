import { describe, expect, it } from "vitest";

import {
  countAdminMemberFilters,
  defaultAdminMemberFilters,
  filterAdminMembers,
  getAdminMemberAssignmentKey,
} from "@/content/admin-member-filters";

const members = [
  {
    displayName: "Nara Pradipta",
    roleLevel: 2 as const,
    divisionId: "division-conversation",
    joinedYear: 2025,
  },
  {
    displayName: "Salsa Wijaya",
    roleLevel: 3 as const,
    position: "secretary" as const,
    joinedYear: 2024,
  },
  {
    displayName: "Bagas Santoso",
    roleLevel: 0 as const,
    joinedYear: 2025,
  },
];

describe("admin member filters", () => {
  it("combines role, managed assignment, and joined year with AND semantics", () => {
    expect(
      filterAdminMembers(members, {
        role: 2,
        assignment: "division:division-conversation",
        joinedYear: 2025,
      }).map((member) => member.displayName),
    ).toEqual(["Nara Pradipta"]);

    expect(
      filterAdminMembers(members, {
        role: "all",
        assignment: "position:secretary",
        joinedYear: "all",
      }).map((member) => member.displayName),
    ).toEqual(["Salsa Wijaya"]);
  });

  it("uses dynamic division IDs and counts only active filters", () => {
    expect(getAdminMemberAssignmentKey(members[0])).toBe(
      "division:division-conversation",
    );
    expect(countAdminMemberFilters(defaultAdminMemberFilters)).toBe(0);
    expect(
      countAdminMemberFilters({
        role: 2,
        assignment: "division:division-conversation",
        joinedYear: 2025,
      }),
    ).toBe(3);
  });
});
