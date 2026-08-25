import {
  getMemberRoleDefinition,
  getMemberSubtypeLabel,
  isValidMemberJoinedYear,
  type MemberDivision,
  type MemberPosition,
  type MemberRoleLevel,
} from "@content/member-roles";

type FilterableMember = {
  roleLevel: MemberRoleLevel;
  division?: MemberDivision;
  divisionKey?: string;
  divisionName?: string;
  position?: MemberPosition;
  joinedYear?: number;
};

export type MemberAssignmentSelection =
  | "all"
  | `division:${string}`
  | `position:${MemberPosition}`;

export type MemberJoinedYearSelection = "all" | "unknown" | number;

export type MemberFilterState = {
  role: "all" | MemberRoleLevel;
  assignment: MemberAssignmentSelection;
  joinedYear: MemberJoinedYearSelection;
};

export type MemberAssignmentOption = {
  value: Exclude<MemberAssignmentSelection, "all">;
  label: string;
  roleLevel: MemberRoleLevel;
};

export const defaultMemberFilters: MemberFilterState = {
  role: "all",
  assignment: "all",
  joinedYear: "all",
};

export function getMemberAssignmentKey(
  member: FilterableMember,
): Exclude<MemberAssignmentSelection, "all"> | undefined {
  if (member.divisionKey !== undefined || member.division !== undefined) {
    return `division:${member.divisionKey ?? member.division}`;
  }

  if (member.position !== undefined) {
    return `position:${member.position}`;
  }

  return undefined;
}

export function getMemberAssignmentOptions(
  members: ReadonlyArray<FilterableMember>,
  role: MemberFilterState["role"],
) {
  const options = new Map<
    Exclude<MemberAssignmentSelection, "all">,
    MemberAssignmentOption
  >();

  for (const member of members) {
    if (role !== "all" && member.roleLevel !== role) {
      continue;
    }

    const value = getMemberAssignmentKey(member);
    const label = getMemberSubtypeLabel(member);
    if (value === undefined || label === undefined) {
      continue;
    }

    options.set(value, { value, label, roleLevel: member.roleLevel });
  }

  return Array.from(options.values()).sort(
    (left, right) =>
      left.roleLevel - right.roleLevel || left.label.localeCompare(right.label),
  );
}

export function getMemberJoinedYearOptions(
  members: ReadonlyArray<FilterableMember>,
) {
  const years = new Set<number>();
  let includesUnknown = false;

  for (const member of members) {
    if (isValidMemberJoinedYear(member.joinedYear)) {
      years.add(member.joinedYear);
    } else {
      includesUnknown = true;
    }
  }

  return {
    years: Array.from(years).sort((left, right) => right - left),
    includesUnknown,
  };
}

export function normalizeMemberFilters(
  filters: MemberFilterState,
  members: ReadonlyArray<FilterableMember>,
): MemberFilterState {
  if (filters.assignment === "all") {
    return filters;
  }

  const selectedAssignment = getMemberAssignmentOptions(
    members,
    filters.role,
  ).find((option) => option.value === filters.assignment);

  return selectedAssignment === undefined
    ? { ...filters, assignment: "all" }
    : filters;
}

export function filterMemberRoster<T extends FilterableMember>(
  members: ReadonlyArray<T>,
  filters: MemberFilterState,
) {
  return members.filter((member) => {
    if (filters.role !== "all" && member.roleLevel !== filters.role) {
      return false;
    }

    if (
      filters.assignment !== "all" &&
      getMemberAssignmentKey(member) !== filters.assignment
    ) {
      return false;
    }

    if (filters.joinedYear === "unknown") {
      return !isValidMemberJoinedYear(member.joinedYear);
    }

    if (
      typeof filters.joinedYear === "number" &&
      member.joinedYear !== filters.joinedYear
    ) {
      return false;
    }

    return true;
  });
}

export function countActiveMemberFilters(filters: MemberFilterState) {
  return Number(filters.role !== "all") +
    Number(filters.assignment !== "all") +
    Number(filters.joinedYear !== "all");
}

export function getMemberFilterAnnouncement(
  count: number,
  filters: MemberFilterState,
  assignmentOptions: ReadonlyArray<MemberAssignmentOption>,
) {
  if (
    filters.role === "all" &&
    filters.assignment === "all" &&
    filters.joinedYear === "all"
  ) {
    return `Showing all ${count} members.`;
  }

  if (
    filters.role !== "all" &&
    filters.assignment === "all" &&
    filters.joinedYear === "all"
  ) {
    const roleLabel = getMemberRoleDefinition(filters.role).label;
    return `Showing ${count} ${roleLabel} ${count === 1 ? "member" : "members"}.`;
  }

  const context = [
    filters.role === "all"
      ? undefined
      : `Role: ${getMemberRoleDefinition(filters.role).label}.`,
    filters.assignment === "all"
      ? undefined
      : `Position or division: ${
          assignmentOptions.find((option) => option.value === filters.assignment)
            ?.label ?? "Selected assignment"
        }.`,
    filters.joinedYear === "all"
      ? undefined
      : filters.joinedYear === "unknown"
        ? "Joined year: Not listed."
        : `Joined year: ${filters.joinedYear}.`,
  ].filter((item): item is string => item !== undefined);

  return `Showing ${count} ${count === 1 ? "member" : "members"}. ${context.join(" ")}`;
}
