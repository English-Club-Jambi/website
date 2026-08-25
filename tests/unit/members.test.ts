import { describe, expect, it } from "vitest";

import {
  getMemberInitials,
  getMemberRoleDefinition,
  getMemberSubtypeLabel,
  isValidMemberAssignment,
  isValidMemberJoinedYear,
  memberRoleDefinitions,
} from "@content/member-roles";
import {
  filterMemberRoster,
  getMemberAssignmentOptions,
  getMemberJoinedYearOptions,
} from "@/content/member-filters";
import {
  developmentSeedMembers,
} from "@content/member-development-seed";

const seededRoster = developmentSeedMembers.map((member) => ({
  ...member,
  updatedAt: 0,
}));

describe("member role contract", () => {
  it("preserves the five supplied role classifications", () => {
    expect(memberRoleDefinitions.map(({ level, label }) => ({ level, label })))
      .toEqual([
        { level: 0, label: "Member" },
        { level: 1, label: "Pioneer" },
        { level: 2, label: "Coordinator" },
        { level: 3, label: "Core Member" },
        { level: 4, label: "Board / Board of Directors" },
      ]);
    expect(getMemberRoleDefinition(2).subtypes).toHaveLength(5);
    expect(getMemberRoleDefinition(3).subtypes).toHaveLength(4);
    expect(getMemberRoleDefinition(4).subtypes).toHaveLength(2);
  });

  it("accepts only subtype combinations valid for each code", () => {
    expect(isValidMemberAssignment({ roleLevel: 0 })).toBe(true);
    expect(
      isValidMemberAssignment({ roleLevel: 0, division: "academic" }),
    ).toBe(false);
    expect(
      isValidMemberAssignment({ roleLevel: 2, division: "mic" }),
    ).toBe(true);
    expect(isValidMemberAssignment({ roleLevel: 2 })).toBe(false);
    expect(
      isValidMemberAssignment({ roleLevel: 3, position: "president" }),
    ).toBe(true);
    expect(
      isValidMemberAssignment({ roleLevel: 3, position: "mentor" }),
    ).toBe(false);
    expect(
      isValidMemberAssignment({ roleLevel: 4, position: "head-of-upa" }),
    ).toBe(true);
  });

  it("uses verified names for initials and exact subtype labels", () => {
    expect(getMemberInitials("Alya Putri Nasution")).toBe("AN");
    expect(getMemberInitials("Alya")).toBe("AL");
    expect(getMemberSubtypeLabel({ division: "public-relation" })).toBe(
      "Public Relation",
    );
    expect(getMemberSubtypeLabel({ position: "head-of-upa" })).toBe(
      "Kepala UPA / Head of UPA",
    );
  });

  it("accepts only plausible integer joined years", () => {
    expect(isValidMemberJoinedYear(2026, 2026)).toBe(true);
    expect(isValidMemberJoinedYear(1900, 2026)).toBe(true);
    expect(isValidMemberJoinedYear(2027, 2026)).toBe(false);
    expect(isValidMemberJoinedYear(2024.5, 2026)).toBe(false);
    expect(isValidMemberJoinedYear("2024", 2026)).toBe(false);
    expect(isValidMemberJoinedYear(Number.NaN, 2026)).toBe(false);
  });
});

describe("member organization roster", () => {
  it("keeps fifteen fictional profiles valid, complete, and varied", () => {
    expect(developmentSeedMembers).toHaveLength(15);
    expect(new Set(developmentSeedMembers.map((member) => member.slug)).size).toBe(15);
    expect(new Set(developmentSeedMembers.map((member) => member.displayName)).size).toBe(15);
    expect(
      new Set(
        developmentSeedMembers.map(
          (member) => `${member.portraitCell.column}:${member.portraitCell.row}`,
        ),
      ).size,
    ).toBe(15);
    expect(new Set(developmentSeedMembers.map((member) => member.roleLevel))).toEqual(
      new Set([0, 1, 2, 3, 4]),
    );
    expect(
      developmentSeedMembers.reduce<Record<number, number>>((counts, member) => {
        counts[member.joinedYear] = (counts[member.joinedYear] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ 2022: 2, 2023: 3, 2024: 4, 2025: 4, 2026: 2 });
    expect(
      developmentSeedMembers.some(
        (member) => "position" in member && member.position === "treasury",
      ),
    ).toBe(true);

    for (const member of developmentSeedMembers) {
      expect(isValidMemberJoinedYear(member.joinedYear, 2026)).toBe(true);
      expect(member.displayName).not.toMatch(/voice|placeholder|sample|test/i);
      expect(member.shortBio).not.toMatch(/placeholder|sample|test|convex/i);
      expect(
        isValidMemberAssignment({
          roleLevel: member.roleLevel,
          ...("division" in member ? { division: member.division } : {}),
          ...("position" in member ? { position: member.position } : {}),
        }),
      ).toBe(true);
    }
  });

  it("combines role, responsibility, and joined year filters", () => {
    const coordinatorOptions = getMemberAssignmentOptions(seededRoster, 2);
    expect(coordinatorOptions).toHaveLength(5);
    expect(getMemberJoinedYearOptions(seededRoster)).toEqual({
      years: [2026, 2025, 2024, 2023, 2022],
      includesUnknown: false,
    });

    expect(
      filterMemberRoster(seededRoster, {
        role: 2,
        assignment: "all",
        joinedYear: 2025,
      }).map((member) => member.displayName),
    ).toEqual([
      "Dimas Arga Pratama",
      "Keisya Maharani",
      "Alya Rahmadani",
    ]);

    expect(
      filterMemberRoster(seededRoster, {
        role: 4,
        assignment: "all",
        joinedYear: 2026,
      }),
    ).toHaveLength(0);
  });
});
