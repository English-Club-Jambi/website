export const memberRoleLevels = [0, 1, 2, 3, 4] as const;

export type MemberRoleLevel = (typeof memberRoleLevels)[number];

export const coordinatorDivisions = [
  { key: "academic", label: "Academic" },
  { key: "art", label: "Art" },
  {
    key: "mic",
    label: "Media, Information, and Communication (MIC)",
  },
  { key: "public-relation", label: "Public Relation" },
  {
    key: "human-resource-development",
    label: "Human Resource Development",
  },
] as const;

export const coreMemberPositions = [
  { key: "secretary", label: "Secretary" },
  { key: "treasury", label: "Treasury" },
  { key: "vice-president", label: "Vice President" },
  { key: "president", label: "President" },
] as const;

export const boardMemberPositions = [
  { key: "mentor", label: "Pembina / Mentor" },
  { key: "head-of-upa", label: "Kepala UPA / Head of UPA" },
] as const;

export type MemberDivision = (typeof coordinatorDivisions)[number]["key"];
export type CoreMemberPosition = (typeof coreMemberPositions)[number]["key"];
export type BoardMemberPosition = (typeof boardMemberPositions)[number]["key"];
export type MemberPosition = CoreMemberPosition | BoardMemberPosition;

export type MemberRoleDefinition = {
  level: MemberRoleLevel;
  key: "member" | "pioneer" | "coordinator" | "core-member" | "board";
  label: string;
  scope: string;
  detail: string;
  subtypes: ReadonlyArray<{ key: string; label: string }>;
};

export const memberRoleDefinitions = [
  {
    level: 0,
    key: "member",
    label: "Member",
    scope: "Takes part in English practice and the everyday life of the club.",
    detail:
      "Members practise English, exchange ideas, and take part in the club's shared activities.",
    subtypes: [],
  },
  {
    level: 1,
    key: "pioneer",
    label: "Pioneer",
    scope: "A club member involved in organising club work.",
    detail:
      "Pioneers help organise the club's work and support collaboration across teams.",
    subtypes: [],
  },
  {
    level: 2,
    key: "coordinator",
    label: "Coordinator",
    scope: "Coordinates one of the five named divisions.",
    detail:
      "Each Coordinator leads one division and turns its plans into clear shared work.",
    subtypes: coordinatorDivisions,
  },
  {
    level: 3,
    key: "core-member",
    label: "Core Member",
    scope: "Holds one of the four core club positions.",
    detail:
      "Core Members keep the club's direction, administration, and finances aligned.",
    subtypes: coreMemberPositions,
  },
  {
    level: 4,
    key: "board",
    label: "Board / Board of Directors",
    scope: "Includes Pembina / Mentor and the Head of UPA.",
    detail:
      "The Board provides guidance, institutional context, and continuity for the club.",
    subtypes: boardMemberPositions,
  },
] as const satisfies ReadonlyArray<MemberRoleDefinition>;

const divisionKeys = new Set<string>(
  coordinatorDivisions.map((division) => division.key),
);
const corePositionKeys = new Set<string>(
  coreMemberPositions.map((position) => position.key),
);
const boardPositionKeys = new Set<string>(
  boardMemberPositions.map((position) => position.key),
);

export function isMemberRoleLevel(value: unknown): value is MemberRoleLevel {
  return typeof value === "number" && memberRoleLevels.includes(value as MemberRoleLevel);
}

export function isMemberDivision(value: unknown): value is MemberDivision {
  return typeof value === "string" && divisionKeys.has(value);
}

export function isMemberPosition(value: unknown): value is MemberPosition {
  return (
    typeof value === "string" &&
    (corePositionKeys.has(value) || boardPositionKeys.has(value))
  );
}

export function isValidMemberJoinedYear(
  value: unknown,
  referenceYear = new Date().getUTCFullYear(),
): value is number {
  return (
    Number.isInteger(value) &&
    typeof value === "number" &&
    value >= 1900 &&
    value <= referenceYear
  );
}

export function isValidMemberAssignment({
  roleLevel,
  division,
  position,
}: {
  roleLevel: MemberRoleLevel;
  division?: MemberDivision;
  position?: MemberPosition;
}) {
  if (roleLevel === 0 || roleLevel === 1) {
    return division === undefined && position === undefined;
  }

  if (roleLevel === 2) {
    return division !== undefined && position === undefined;
  }

  if (roleLevel === 3) {
    return (
      division === undefined &&
      position !== undefined &&
      corePositionKeys.has(position)
    );
  }

  return (
    division === undefined &&
    position !== undefined &&
    boardPositionKeys.has(position)
  );
}

export function getMemberRoleDefinition(level: MemberRoleLevel) {
  return memberRoleDefinitions[level];
}

export function getMemberSubtypeLabel({
  division,
  position,
}: {
  division?: MemberDivision;
  position?: MemberPosition;
}) {
  if (division !== undefined) {
    return coordinatorDivisions.find((item) => item.key === division)?.label;
  }

  if (position !== undefined) {
    return [...coreMemberPositions, ...boardMemberPositions].find(
      (item) => item.key === position,
    )?.label;
  }

  return undefined;
}

export function getMemberInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "EC";
  }

  if (words.length === 1) {
    return Array.from(words[0]).slice(0, 2).join("").toLocaleUpperCase("en");
  }

  return `${Array.from(words[0])[0] ?? ""}${
    Array.from(words.at(-1) ?? "")[0] ?? ""
  }`.toLocaleUpperCase("en");
}
