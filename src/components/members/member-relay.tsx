"use client";

import {
  AcademicCapIcon,
  ArrowPathIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloudIcon,
  FlagIcon,
  FunnelIcon,
  KeyIcon,
  Squares2X2Icon,
  UserPlusIcon,
  ViewColumnsIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import type { PublicContentFor } from "@content/public-content";

import {
  SelectField,
  type SelectFieldOption,
} from "@/components/forms/select-field";
import {
  getMemberInitials,
  getMemberRoleDefinition,
  getMemberSubtypeLabel,
  isMemberRoleLevel,
  memberRoleDefinitions,
} from "@content/member-roles";
import { resolveMediaUrl } from "@/content/media";
import {
  countActiveMemberFilters,
  defaultMemberFilters,
  filterMemberRoster,
  getMemberAssignmentOptions,
  getMemberFilterAnnouncement,
  getMemberJoinedYearOptions,
  normalizeMemberFilters,
  type MemberAssignmentSelection,
  type MemberFilterState,
  type MemberJoinedYearSelection,
} from "@/content/member-filters";
import {
  type MemberDirectoryResult,
  type PublicMember,
} from "@/lib/members";

import styles from "./member-relay.module.css";

type DisplayMember = PublicMember;

const roleIcons = {
  0: ChatBubbleLeftRightIcon,
  1: FlagIcon,
  2: Squares2X2Icon,
  3: KeyIcon,
  4: AcademicCapIcon,
} as const;

const memberCardRoleLabels = {
  0: "Member",
  1: "Pioneer",
  2: "Coordinator",
  3: "Core Member",
  4: "Board",
} as const;

function MemberIdentity({ member }: { member: DisplayMember }) {
  if (member.photo === undefined) {
    return (
      <span className={styles.memberMonogram} aria-hidden>
        {getMemberInitials(member.displayName)}
      </span>
    );
  }

  return (
    <span className={styles.memberPhoto}>
      <Image
        src={resolveMediaUrl(member.photo.objectKey)}
        alt={member.photo.alt}
        fill
        sizes="(max-width: 479px) 42vw, (max-width: 679px) 50vw, (max-width: 1023px) 34vw, 20vw"
        style={{ objectPosition: member.photo.focalPoint }}
      />
    </span>
  );
}

function MemberCard({
  member,
  index,
  copy,
}: {
  member: DisplayMember;
  index: number;
  copy: PublicContentFor<"members">;
}) {
  const subtype = getMemberSubtypeLabel(member);
  const RoleIcon = roleIcons[member.roleLevel];
  const assignmentFallback = {
    0: copy.memberActivityFallback,
    1: copy.pioneerActivityFallback,
    2: copy.coordinatorActivityFallback,
    3: copy.coreActivityFallback,
    4: copy.boardActivityFallback,
  } as const;

  return (
    <li
      className={styles.memberCard}
      style={{ "--member-index": index } as CSSProperties}
      data-role={member.roleLevel}
    >
      <article>
        <div className={styles.memberVisual}>
          <MemberIdentity member={member} />
        </div>
        <div className={styles.memberCardBody}>
          <div className={styles.memberRoleLine}>
            <RoleIcon width={19} height={19} strokeWidth={1.75} aria-hidden />
            <span>{memberCardRoleLabels[member.roleLevel]}</span>
            <span className={styles.memberRoleCode}>Role {member.roleLevel}</span>
          </div>
          <h3>{member.displayName}</h3>
          <p className={styles.memberAssignment}>
            {subtype ?? assignmentFallback[member.roleLevel]}
          </p>
          {member.joinedYear === undefined ? null : (
            <p className={styles.memberJoinedYear}>
              <CalendarDaysIcon
                width={17}
                height={17}
                strokeWidth={1.8}
                aria-hidden
              />
              <span>Joined {member.joinedYear}</span>
            </p>
          )}
          {member.shortBio === undefined ? null : (
            <p className={styles.memberBio}>{member.shortBio}</p>
          )}
        </div>
      </article>
    </li>
  );
}

export function MemberRelay({
  directory,
  copy,
}: {
  directory: MemberDirectoryResult;
  copy: PublicContentFor<"members">;
}) {
  const rosterMembers: ReadonlyArray<DisplayMember> = directory.members;
  const memberRoleFilterOptions: ReadonlyArray<SelectFieldOption> = [
    { value: "all", label: copy.allRoles },
    ...memberRoleDefinitions.map((role) => ({
      value: String(role.level),
      label: role.label,
    })),
  ];
  const [filters, setFilters] = useState<MemberFilterState>(defaultMemberFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selection = filters.role;
  const activeRole =
    selection === "all" ? undefined : getMemberRoleDefinition(selection);
  const ActiveIcon = selection === "all" ? ViewColumnsIcon : roleIcons[selection];
  const assignmentOptions = useMemo(
    () => getMemberAssignmentOptions(rosterMembers, filters.role),
    [filters.role, rosterMembers],
  );
  const joinedYearOptions = useMemo(
    () => getMemberJoinedYearOptions(rosterMembers),
    [rosterMembers],
  );
  const assignmentFilterOptions = useMemo<ReadonlyArray<SelectFieldOption>>(
    () => [
      { value: "all", label: copy.allResponsibilities },
      ...assignmentOptions.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    ],
    [assignmentOptions, copy.allResponsibilities],
  );
  const joinedYearFilterOptions = useMemo<ReadonlyArray<SelectFieldOption>>(
    () => [
      { value: "all", label: copy.allYears },
      ...joinedYearOptions.years.map((year) => ({
        value: String(year),
        label: String(year),
      })),
      ...(joinedYearOptions.includesUnknown
        ? [{ value: "unknown", label: copy.yearNotListed }]
        : []),
    ],
    [copy.allYears, copy.yearNotListed, joinedYearOptions],
  );
  const filteredMembers = useMemo(
    () => filterMemberRoster(rosterMembers, filters),
    [filters, rosterMembers],
  );
  const activeFilterCount = countActiveMemberFilters(filters);
  const announcement = getMemberFilterAnnouncement(
    filteredMembers.length,
    filters,
    assignmentOptions,
  );

  function applyFilters(nextFilters: MemberFilterState) {
    setFilters(normalizeMemberFilters(nextFilters, rosterMembers));
  }

  function chooseRole(nextSelection: MemberFilterState["role"]) {
    applyFilters({ ...filters, role: nextSelection });
  }

  function chooseRoleFromSelect(value: string) {
    const numericRole = Number(value);
    chooseRole(
      value === "all" || !isMemberRoleLevel(numericRole)
        ? "all"
        : numericRole,
    );
  }

  function chooseJoinedYear(value: string) {
    const nextSelection: MemberJoinedYearSelection =
      value === "all" || value === "unknown" ? value : Number(value);
    applyFilters({ ...filters, joinedYear: nextSelection });
  }

  function clearFilters() {
    setFilters(defaultMemberFilters);
  }

  const directoryHeading =
    directory.state === "unavailable"
      ? copy.directoryLabel
      : `${filteredMembers.length} ${
          filteredMembers.length === 1 ? copy.memberSingular : copy.memberPlural
        }`;
  return (
    <>
      <section
        id="member-role-map"
        className={styles.roleSection}
        aria-labelledby="role-map-title"
      >
        <div className={`page-container ${styles.roleFrame}`}>
          <header className={styles.roleHeader}>
            <h2 id="role-map-title">{copy.rolesTitle}</h2>
            <p>{copy.rolesSupport}</p>
          </header>

          <div className={styles.roleInstrument}>
            <fieldset className={styles.roleSelector}>
              <legend className="visually-hidden">
                {copy.roleSelectorLegend}
              </legend>

              <label
                className={styles.allRolesChoice}
                data-active={selection === "all"}
              >
                <input
                  className={styles.roleInput}
                  type="radio"
                  name="member-role"
                  value="all"
                  checked={selection === "all"}
                  onChange={() => chooseRole("all")}
                />
                <ViewColumnsIcon
                  width={20}
                  height={20}
                  strokeWidth={1.8}
                  aria-hidden
                />
                <span>{copy.allRoles}</span>
              </label>

              <div className={styles.roleChannels}>
                {memberRoleDefinitions.map((role) => {
                  const Icon = roleIcons[role.level];
                  const selected = selection === role.level;

                  return (
                    <label
                      key={role.level}
                      className={styles.roleChoice}
                      data-active={selected}
                    >
                      <input
                        className={styles.roleInput}
                        type="radio"
                        name="member-role"
                        value={role.level}
                        checked={selected}
                        onChange={() => chooseRole(role.level)}
                      />
                      <span className={styles.roleCode} aria-hidden>
                        {role.level}
                      </span>
                      <span className={styles.roleIdentity}>
                        <Icon
                          width={28}
                          height={28}
                          strokeWidth={1.7}
                          aria-hidden
                        />
                        <strong>{role.label}</strong>
                      </span>
                      <span className={styles.roleScope}>{role.scope}</span>
                      <span className={styles.roleSubtypes}>
                        {role.subtypes.length === 0
                          ? copy.worksAcrossClub
                          : role.subtypes.map((subtype) => subtype.label).join(", ")}
                      </span>
                      <ChevronRightIcon
                        className={styles.roleChevron}
                        width={21}
                        height={21}
                        strokeWidth={2}
                        aria-hidden
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <aside className={styles.roleCompanion} aria-live="polite">
              <div className={styles.companionInner} key={selection}>
                <span className={styles.companionCode} aria-hidden>
                  {selection === "all" ? "All" : selection}
                </span>
                <ActiveIcon
                  className={styles.companionIcon}
                  width={42}
                  height={42}
                  strokeWidth={1.5}
                  aria-hidden
                />
                <p className={styles.companionLabel}>
                  {selection === "all" ? copy.clubStructure : `Role ${selection}`}
                </p>
                <h3>
                  {activeRole?.label ?? copy.sharedResponsibilityTitle}
                </h3>
                <p>
                  {activeRole?.detail ?? copy.sharedResponsibilityBody}
                </p>
                {activeRole === undefined ? (
                  <p className={styles.companionNote}>
                    {copy.roleCodesNote}
                  </p>
                ) : activeRole.subtypes.length === 0 ? (
                  <p className={styles.companionNote}>
                    {copy.roleWithoutAssignmentNote}
                  </p>
                ) : (
                  <ul className={styles.companionList}>
                    {activeRole.subtypes.map((subtype) => (
                      <li key={subtype.key}>
                        <CheckCircleIcon
                          width={19}
                          height={19}
                          strokeWidth={1.8}
                          aria-hidden
                        />
                        <span>{subtype.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section
        className={styles.directorySection}
        aria-labelledby="member-directory-title"
      >
        <div className={`page-container ${styles.directoryFrame}`}>
          <header className={styles.directoryHeader}>
            <h2 id="member-directory-title">{copy.directoryTitle}</h2>
            <p>{copy.directorySupport}</p>
          </header>

          <div className={styles.directoryToolbar}>
            <p>{directoryHeading}</p>
            <button
              type="button"
              className={styles.filterToggle}
              aria-expanded={filtersOpen}
              aria-controls="member-filter-panel"
              disabled={directory.state === "unavailable"}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <FunnelIcon width={18} height={18} strokeWidth={1.9} aria-hidden />
              <span>{copy.filterButton}</span>
              {activeFilterCount === 0 ? null : (
                <span className={styles.filterCount} aria-label={`${activeFilterCount} active filters`}>
                  {activeFilterCount}
                </span>
              )}
              <ChevronDownIcon
                className={styles.filterChevron}
                data-open={filtersOpen}
                width={16}
                height={16}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </div>

          {filtersOpen && directory.state !== "unavailable" ? (
            <section
              id="member-filter-panel"
              className={styles.filterPanel}
              aria-labelledby="member-filter-title"
            >
              <header className={styles.filterHeader}>
                <FunnelIcon width={24} height={24} strokeWidth={1.7} aria-hidden />
                <div>
                  <h3 id="member-filter-title">{copy.filterTitle}</h3>
                  <p>{copy.filterSupport}</p>
                </div>
                <button
                  type="button"
                  className={styles.filterClose}
                  aria-label={copy.closeFiltersLabel}
                  onClick={() => setFiltersOpen(false)}
                >
                  <XMarkIcon width={20} height={20} strokeWidth={2} aria-hidden />
                </button>
              </header>

              <div className={styles.filterFields}>
                <SelectField
                  id="member-role-filter"
                  label={copy.roleFilterLabel}
                  value={String(filters.role)}
                  options={memberRoleFilterOptions}
                  onValueChange={chooseRoleFromSelect}
                />

                <SelectField
                  id="member-assignment-filter"
                  label={copy.assignmentFilterLabel}
                  value={filters.assignment}
                  options={assignmentFilterOptions}
                  disabled={assignmentOptions.length === 0}
                  onValueChange={(value) =>
                    applyFilters({
                      ...filters,
                      assignment: value as MemberAssignmentSelection,
                    })
                  }
                />

                <SelectField
                  id="member-joined-year-filter"
                  label={copy.yearFilterLabel}
                  value={String(filters.joinedYear)}
                  options={joinedYearFilterOptions}
                  onValueChange={chooseJoinedYear}
                />
              </div>

              <footer className={styles.filterFooter}>
                <p>{announcement}</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={activeFilterCount === 0}
                >
                  <ArrowPathIcon width={18} height={18} strokeWidth={1.9} aria-hidden />
                  <span>{copy.clearFilters}</span>
                </button>
              </footer>
            </section>
          ) : null}

          <p className="visually-hidden" role="status">
            {announcement}
          </p>

          {directory.state === "unavailable" ? (
            <div className={styles.directoryEmpty} role="status">
              <CloudIcon width={70} height={70} strokeWidth={1.25} aria-hidden />
              <div>
                <h3>{copy.unavailableTitle}</h3>
                <p>{copy.unavailableBody}</p>
              </div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className={styles.directoryEmpty} role="status">
              <FunnelIcon width={70} height={70} strokeWidth={1.25} aria-hidden />
              <div>
                <h3>{copy.noMatchesTitle}</h3>
                <p>{copy.noMatchesBody}</p>
                <button type="button" onClick={clearFilters}>
                  <ArrowPathIcon width={18} height={18} strokeWidth={1.9} aria-hidden />
                  <span>{copy.clearFilters}</span>
                </button>
              </div>
            </div>
          ) : (
            <ul
              className={styles.memberGrid}
              key={`${filters.role}-${filters.assignment}-${filters.joinedYear}`}
              data-member-roster
              data-roster-source="convex"
            >
              {filteredMembers.map((member, index) => (
                <MemberCard
                  key={member.slug}
                  member={member}
                  index={index}
                  copy={copy}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={styles.memberClose} aria-labelledby="member-close-title">
        <div className={`page-container ${styles.memberCloseFrame}`}>
          <UserPlusIcon width={42} height={42} strokeWidth={1.5} aria-hidden />
          <h2 id="member-close-title">{copy.closeTitle}</h2>
          <p>{copy.closeBody}</p>
          <Link href="/contact?intent=join">
            <span>{copy.closeLink}</span>
            <ArrowUpRightIcon width={24} height={24} strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
