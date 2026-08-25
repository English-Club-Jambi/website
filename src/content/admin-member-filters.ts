import type {
  MemberDivision,
  MemberPosition,
  MemberRoleLevel,
} from "@content/member-roles";

export type AdminMemberFilterState = {
  role: "all" | MemberRoleLevel;
  assignment: "all" | `division:${string}` | `position:${MemberPosition}`;
  joinedYear: "all" | number;
};

export type AdminFilterableMember = {
  roleLevel: MemberRoleLevel;
  division?: MemberDivision;
  divisionId?: string;
  position?: MemberPosition;
  joinedYear?: number;
};

export const defaultAdminMemberFilters: AdminMemberFilterState = {
  role: "all",
  assignment: "all",
  joinedYear: "all",
};

export function getAdminMemberAssignmentKey(
  member: AdminFilterableMember,
): Exclude<AdminMemberFilterState["assignment"], "all"> | undefined {
  if (member.divisionId !== undefined) {
    return `division:${member.divisionId}`;
  }
  if (member.division !== undefined) {
    return `division:${member.division}`;
  }
  if (member.position !== undefined) {
    return `position:${member.position}`;
  }
  return undefined;
}

export function filterAdminMembers<T extends AdminFilterableMember>(
  members: ReadonlyArray<T>,
  filters: AdminMemberFilterState,
) {
  return members.filter((member) => {
    if (filters.role !== "all" && member.roleLevel !== filters.role) {
      return false;
    }
    if (
      filters.assignment !== "all" &&
      getAdminMemberAssignmentKey(member) !== filters.assignment
    ) {
      return false;
    }
    if (
      filters.joinedYear !== "all" &&
      member.joinedYear !== filters.joinedYear
    ) {
      return false;
    }
    return true;
  });
}

export function countAdminMemberFilters(filters: AdminMemberFilterState) {
  return (
    Number(filters.role !== "all") +
    Number(filters.assignment !== "all") +
    Number(filters.joinedYear !== "all")
  );
}
