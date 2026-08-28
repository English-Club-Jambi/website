"use client";

import {
  ArchiveBoxIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ChevronRightIcon,
  FunnelIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { SelectField, type SelectFieldOption } from "@/components/forms/select-field";
import {
  countAdminMemberFilters,
  defaultAdminMemberFilters,
  filterAdminMembers,
  type AdminMemberFilterState,
} from "@/content/admin-member-filters";
import {
  boardMemberPositions,
  coreMemberPositions,
  getMemberRoleDefinition,
  getMemberSubtypeLabel,
  memberRoleDefinitions,
  type MemberPosition,
  type MemberRoleLevel,
} from "@content/member-roles";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

import {
  AdminEmpty,
  AdminError,
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
  AdminStatus,
  LoadMoreButton,
  formatAdminDate,
  humanizeError,
} from "./admin-ui";
import { useAdminConfirm } from "./admin-confirm-dialog";
import { AdminWorkspaceDialog } from "./admin-workspace-dialog";
import styles from "./admin-shell.module.css";
import { useAdminMediaUpload } from "./use-admin-media-upload";

type MemberRecord = FunctionReturnType<typeof api.adminMembers.listPage>["page"][number];
type DivisionRecord = FunctionReturnType<typeof api.adminMemberDivisions.list>[number];
type CoordinatorCandidate = FunctionReturnType<
  typeof api.adminMemberDivisions.listCoordinatorCandidates
>[number];
type ProfileStatus = MemberRecord["profileStatus"];
type ConsentStatus = MemberRecord["profileConsentStatus"];
type MemberPhoto = NonNullable<MemberRecord["photo"]>;

const statusOptions = [
  { value: "all", label: "All profiles" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

const profileStatusOptions = statusOptions.slice(1);
const consentOptions = [
  { value: "pending", label: "Pending" },
  { value: "cleared", label: "Cleared" },
  { value: "revoked", label: "Revoked" },
] as const;

const divisionStatusOptions = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const;

const roleOptions: ReadonlyArray<SelectFieldOption> = memberRoleDefinitions.map((role) => ({
  value: String(role.level),
  label: role.label,
}));

type MemberFormState = {
  slug: string;
  displayName: string;
  roleLevel: MemberRoleLevel;
  divisionId?: string;
  position?: MemberPosition;
  joinedYear: string;
  shortBio: string;
  photo?: MemberPhoto;
  profileStatus: ProfileStatus;
  profileConsentStatus: ConsentStatus;
  photoConsentStatus: ConsentStatus;
  sortOrder: string;
};

type DivisionFormState = {
  slug: string;
  name: string;
  summary: string;
  status: DivisionRecord["status"];
  sortOrder: string;
  coordinatorMemberId: string;
};

const emptyMember: MemberFormState = {
  slug: "",
  displayName: "",
  roleLevel: 0,
  joinedYear: "",
  shortBio: "",
  profileStatus: "draft",
  profileConsentStatus: "pending",
  photoConsentStatus: "pending",
  sortOrder: "100",
};

const emptyDivision: DivisionFormState = {
  slug: "",
  name: "",
  summary: "",
  status: "active",
  sortOrder: "100",
  coordinatorMemberId: "unassigned",
};

function toFormState(
  member: MemberRecord,
  divisions: ReadonlyArray<DivisionRecord>,
): MemberFormState {
  const divisionId =
    member.divisionId ??
    divisions.find((division) => division.slug === member.division)?._id;
  return {
    slug: member.slug,
    displayName: member.displayName,
    roleLevel: member.roleLevel,
    ...(divisionId ? { divisionId } : {}),
    ...(member.position ? { position: member.position } : {}),
    joinedYear: member.joinedYear ? String(member.joinedYear) : "",
    shortBio: member.shortBio ?? "",
    ...(member.photo ? { photo: member.photo } : {}),
    profileStatus: member.profileStatus,
    profileConsentStatus: member.profileConsentStatus,
    photoConsentStatus: member.photoConsentStatus,
    sortOrder: String(member.sortOrder),
  };
}

function memberStatusTone(status: ProfileStatus) {
  if (status === "published") return "success" as const;
  if (status === "archived") return "danger" as const;
  return "warning" as const;
}

function useCompactMemberWorkspace() {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 980px)");
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return matches;
}

function MemberEditor({
  member,
  divisions,
  surface = "workspace",
  onSaved,
  onArchived,
}: {
  member: MemberRecord | null;
  divisions: ReadonlyArray<DivisionRecord>;
  surface?: "workspace" | "drawer";
  onSaved: (memberId: Id<"members">) => void;
  onArchived: () => void;
}) {
  const saveMember = useMutation(api.adminMembers.saveReviewed);
  const archiveMember = useMutation(api.adminMembers.archive);
  const confirm = useAdminConfirm();
  const uploadMedia = useAdminMediaUpload();
  const [form, setForm] = useState<MemberFormState>(
    member ? toFormState(member, divisions) : emptyMember,
  );
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitAlt, setPortraitAlt] = useState(member?.photo?.alt ?? "");
  const [focalPoint, setFocalPoint] = useState(member?.photo?.focalPoint ?? "50% 50%");
  const [pending, setPending] = useState<"save" | "upload" | "archive" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const assignmentOptions = useMemo(() => {
    if (form.roleLevel === 2) {
      return divisions
        .filter(
          (division) =>
            division.status === "active" || division._id === form.divisionId,
        )
        .map((division) => ({ key: division._id, label: division.name }));
    }
    if (form.roleLevel === 3) return coreMemberPositions;
    if (form.roleLevel === 4) return boardMemberPositions;
    return [];
  }, [divisions, form.divisionId, form.roleLevel]);

  async function uploadPortrait() {
    if (!portraitFile) {
      setError("Choose an AVIF or WebP portrait first.");
      return;
    }
    setPending("upload");
    setError("");
    setMessage("");
    try {
      const upload = await uploadMedia({
        file: portraitFile,
        alt: portraitAlt,
        purpose: "member-photo",
      });
      setForm((current) => ({
        ...current,
        photo: {
          objectKey: upload.objectKey,
          width: upload.width,
          height: upload.height,
          alt: portraitAlt.trim(),
          focalPoint,
        },
        photoConsentStatus: "pending",
      }));
      setPortraitFile(null);
      setMessage("Portrait verified in R2. Confirm portrait consent before publication.");
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(null);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("save");
    setError("");
    setMessage("");
    try {
      if (form.roleLevel === 2 && !form.divisionId) {
        throw new Error("Choose the division this member coordinates.");
      }
      const memberId = await saveMember({
        slug: form.slug,
        displayName: form.displayName,
        roleLevel: form.roleLevel,
        divisionId:
          form.roleLevel === 2
            ? (form.divisionId as Id<"memberDivisions">)
            : null,
        ...(form.position ? { position: form.position } : {}),
        joinedYear: form.joinedYear ? Number(form.joinedYear) : null,
        ...(form.shortBio.trim() ? { shortBio: form.shortBio } : {}),
        ...(form.photo ? { photo: { ...form.photo, focalPoint } } : {}),
        profileStatus: form.profileStatus,
        profileConsentStatus: form.profileConsentStatus,
        photoConsentStatus: form.photo ? form.photoConsentStatus : "pending",
        sortOrder: Number(form.sortOrder),
      });
      setMessage("Member profile saved.");
      onSaved(memberId);
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(null);
    }
  }

  async function handleArchive() {
    if (!member) return;
    await confirm(
      {
        title: `Archive ${member.displayName}'s profile?`,
        description:
          "The profile leaves active member views but remains in the administration archive.",
        confirmLabel: "Archive profile",
        cancelLabel: "Keep profile",
      },
      async () => {
        setPending("archive");
        setError("");
        try {
          await archiveMember({ memberId: member._id });
          setPending(null);
          onArchived();
        } catch (caught) {
          setError(humanizeError(caught));
          setPending(null);
          throw caught;
        }
      },
    );
  }

  return (
    <form onSubmit={handleSave}>
      {surface === "workspace" ? (
        <div className={styles.memberEditorHeading}>
          <div>
            <strong>{member ? `Edit ${member.displayName}` : "Add a member profile"}</strong>
            <span>{getMemberRoleDefinition(form.roleLevel).scope}</span>
          </div>
          {member ? (
            <div className={styles.buttonRow}>
              {member.recordOrigin === "development-seed" ? (
                <AdminStatus tone="neutral">Development seed</AdminStatus>
              ) : null}
              <AdminStatus tone={memberStatusTone(member.profileStatus)}>{member.profileStatus}</AdminStatus>
            </div>
          ) : null}
        </div>
      ) : member ? (
        <div className={styles.memberDrawerStatus} aria-label="Profile record state">
          <span>{getMemberRoleDefinition(form.roleLevel).label}</span>
          <div className={styles.buttonRow}>
            {member.recordOrigin === "development-seed" ? (
              <AdminStatus tone="neutral">Development seed</AdminStatus>
            ) : null}
            <AdminStatus tone={memberStatusTone(member.profileStatus)}>{member.profileStatus}</AdminStatus>
          </div>
        </div>
      ) : null}

      <div className={styles.formGridWide}>
        <label className={`${styles.field} ${styles.spanSix}`}>
          <span>Display name</span>
          <input
            value={form.displayName}
            minLength={2}
            maxLength={100}
            required
            onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
          />
        </label>
        <label className={`${styles.field} ${styles.spanSix}`}>
          <span>Profile slug</span>
          <input
            value={form.slug}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            minLength={3}
            maxLength={96}
            placeholder="approved-public-name"
            readOnly={member !== null}
            required
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase() }))}
          />
          {member ? <small>Profile URLs are fixed after creation.</small> : null}
        </label>
        <div className={styles.spanFour}>
          <SelectField
            label="Role"
            value={String(form.roleLevel)}
            options={roleOptions}
            onValueChange={(next) =>
              setForm((current) => ({
                ...current,
                roleLevel: Number(next) as MemberRoleLevel,
                divisionId: undefined,
                position: undefined,
              }))
            }
          />
        </div>
        {assignmentOptions.length > 0 ? (
          <div className={styles.spanFour}>
            <SelectField
              label={form.roleLevel === 2 ? "Division" : "Position"}
              value={form.divisionId ?? form.position}
              placeholder={form.roleLevel === 2 ? "Choose a division" : "Choose a position"}
              required
              options={assignmentOptions.map((option) => ({ value: option.key, label: option.label }))}
              onValueChange={(next) =>
                setForm((current) =>
                  current.roleLevel === 2
                    ? { ...current, divisionId: next, position: undefined }
                    : { ...current, position: next as MemberPosition, divisionId: undefined },
                )
              }
            />
          </div>
        ) : (
          <div className={`${styles.workspaceFact} ${styles.spanFour}`}>
            <span>Assignment</span>
            <strong>No division or position needed</strong>
          </div>
        )}
        <label className={`${styles.field} ${styles.spanFour}`}>
          <span>Year joined</span>
          <input
            value={form.joinedYear}
            type="number"
            inputMode="numeric"
            min={1900}
            max={new Date().getUTCFullYear()}
            onChange={(event) => setForm((current) => ({ ...current, joinedYear: event.target.value }))}
          />
        </label>
        <label className={`${styles.field} ${styles.spanFull}`}>
          <span>Short biography</span>
          <textarea
            value={form.shortBio}
            minLength={form.shortBio ? 12 : undefined}
            maxLength={280}
            onChange={(event) => setForm((current) => ({ ...current, shortBio: event.target.value }))}
          />
        </label>
      </div>

      <div className={styles.memberPortraitSection}>
        <div className={styles.memberPortraitPreview}>
          {form.photo ? (
            <Image
              src={`https://r2.mukhtada.my.id/${form.photo.objectKey}`}
              alt={form.photo.alt}
              width={form.photo.width}
              height={form.photo.height}
              sizes="144px"
            />
          ) : (
            <PhotoIcon aria-hidden width={34} height={34} />
          )}
        </div>
        <div className={styles.portraitFields}>
          <label className={styles.field}>
            <span>Portrait file</span>
            <input
              type="file"
              accept="image/avif,image/webp"
              onChange={(event) => setPortraitFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className={styles.field}>
            <span>Alternative text</span>
            <input
              value={portraitAlt}
              minLength={3}
              maxLength={240}
              placeholder="Portrait of the member"
              onChange={(event) => setPortraitAlt(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Focal point</span>
            <input
              value={focalPoint}
              pattern="(?:100|[0-9]{1,2})% (?:100|[0-9]{1,2})%"
              placeholder="50% 50%"
              onChange={(event) => setFocalPoint(event.target.value)}
            />
          </label>
          <div className={styles.buttonRow}>
            <button className={styles.secondaryButton} type="button" disabled={pending !== null || !portraitFile} onClick={() => void uploadPortrait()}>
              <PhotoIcon aria-hidden width={18} height={18} />
              {pending === "upload" ? "Uploading…" : "Upload portrait"}
            </button>
            {form.photo ? (
              <button
                className={styles.textButton}
                type="button"
                onClick={() => setForm((current) => ({ ...current, photo: undefined, photoConsentStatus: "pending" }))}
              >
                <TrashIcon aria-hidden width={17} height={17} />
                Remove portrait
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.formGridWide}>
        <div className={styles.spanFour}>
          <SelectField
            label="Profile status"
            value={form.profileStatus}
            options={profileStatusOptions}
            onValueChange={(next) => setForm((current) => ({ ...current, profileStatus: next as ProfileStatus }))}
          />
        </div>
        <div className={styles.spanFour}>
          <SelectField
            label="Profile consent"
            value={form.profileConsentStatus}
            options={consentOptions}
            onValueChange={(next) => setForm((current) => ({ ...current, profileConsentStatus: next as ConsentStatus }))}
          />
        </div>
        <div className={styles.spanFour}>
          <SelectField
            label="Portrait consent"
            value={form.photoConsentStatus}
            options={consentOptions.map((option) => ({ ...option, disabled: option.value === "cleared" && !form.photo }))}
            onValueChange={(next) => setForm((current) => ({ ...current, photoConsentStatus: next as ConsentStatus }))}
          />
        </div>
        <label className={`${styles.field} ${styles.spanFour}`}>
          <span>Sort order</span>
          <input
            value={form.sortOrder}
            type="number"
            min={0}
            max={100_000}
            required
            onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
          />
        </label>
      </div>

      {error ? <AdminError>{error}</AdminError> : null}
      <footer className={styles.formFooter}>
        <p>{message || "A public profile needs published status and cleared profile consent."}</p>
        <div className={styles.buttonRow}>
          {member ? (
            <button className={styles.dangerButton} type="button" disabled={pending !== null} onClick={() => void handleArchive()}>
              <ArchiveBoxIcon aria-hidden width={18} height={18} />
              {pending === "archive" ? "Archiving…" : "Archive"}
            </button>
          ) : null}
          <button className={styles.primaryButton} type="submit" disabled={pending !== null}>
            <CheckCircleIcon aria-hidden width={18} height={18} />
            {pending === "save" ? "Saving…" : "Save profile"}
          </button>
        </div>
      </footer>
    </form>
  );
}

function DivisionEditor({
  division,
  candidates,
  onSaved,
  onRemoved,
}: {
  division: DivisionRecord | null;
  candidates: ReadonlyArray<CoordinatorCandidate>;
  onSaved: (divisionId: Id<"memberDivisions">) => void;
  onRemoved: () => void;
}) {
  const saveDivision = useMutation(api.adminMemberDivisions.save);
  const removeDivision = useMutation(api.adminMemberDivisions.remove);
  const confirm = useAdminConfirm();
  const [form, setForm] = useState<DivisionFormState>(
    division
      ? {
          slug: division.slug,
          name: division.name,
          summary: division.summary ?? "",
          status: division.status,
          sortOrder: String(division.sortOrder),
          coordinatorMemberId:
            division.coordinator?.memberId ?? "unassigned",
        }
      : emptyDivision,
  );
  const [pending, setPending] = useState<"save" | "remove" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const coordinatorOptions = useMemo<ReadonlyArray<SelectFieldOption>>(
    () => [
      { value: "unassigned", label: "No coordinator" },
      ...candidates
        .filter(
          (candidate) =>
            candidate.divisionId === undefined ||
            candidate.divisionId === division?._id,
        )
        .map((candidate) => ({
          value: candidate.memberId,
          label: `${candidate.displayName} · ${getMemberRoleDefinition(candidate.roleLevel).label}`,
        })),
    ],
    [candidates, division?._id],
  );

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("save");
    setError("");
    setMessage("");
    try {
      const divisionId = await saveDivision({
        ...(division ? { divisionId: division._id } : {}),
        slug: form.slug,
        name: form.name,
        ...(form.summary.trim() ? { summary: form.summary } : {}),
        status: form.status,
        sortOrder: Number(form.sortOrder),
        coordinatorMemberId:
          form.coordinatorMemberId === "unassigned"
            ? null
            : (form.coordinatorMemberId as Id<"members">),
      });
      setMessage("Division saved.");
      onSaved(divisionId);
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(null);
    }
  }

  async function handleRemove() {
    if (!division || division.hasMembers) return;
    await confirm(
      {
        title: `Remove ${division.name}?`,
        description:
          "This removes the unused division from the administration catalogue. A division with member assignments cannot be removed.",
        confirmLabel: "Remove division",
        cancelLabel: "Keep division",
      },
      async () => {
        setPending("remove");
        setError("");
        try {
          await removeDivision({ divisionId: division._id });
          onRemoved();
        } catch (caught) {
          setError(humanizeError(caught));
          throw caught;
        } finally {
          setPending(null);
        }
      },
    );
  }

  return (
    <form onSubmit={handleSave}>
      <div className={styles.memberEditorHeading}>
        <div>
          <strong>{division ? `Edit ${division.name}` : "Add a division"}</strong>
          <span>
            A managed division can have one coordinator. Archive it before it
            leaves the active organisation map.
          </span>
        </div>
        {division ? (
          <AdminStatus tone={division.status === "active" ? "success" : "warning"}>
            {division.status}
          </AdminStatus>
        ) : null}
      </div>

      <div className={styles.formGridWide}>
        <label className={`${styles.field} ${styles.spanSix}`}>
          <span>Division name</span>
          <input
            value={form.name}
            minLength={2}
            maxLength={80}
            required
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
        <label className={`${styles.field} ${styles.spanSix}`}>
          <span>Division address</span>
          <input
            value={form.slug}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            minLength={2}
            maxLength={64}
            readOnly={division !== null}
            required
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                slug: event.target.value.toLowerCase(),
              }))
            }
          />
          {division ? <small>Division addresses are fixed after creation.</small> : null}
        </label>
        <label className={`${styles.field} ${styles.spanFull}`}>
          <span>Responsibility summary</span>
          <textarea
            value={form.summary}
            minLength={form.summary ? 12 : undefined}
            maxLength={240}
            onChange={(event) =>
              setForm((current) => ({ ...current, summary: event.target.value }))
            }
          />
        </label>
        <div className={styles.spanSix}>
          <SelectField
            label="Coordinator"
            value={form.coordinatorMemberId}
            options={coordinatorOptions}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                coordinatorMemberId: value,
              }))
            }
          />
        </div>
        <div className={styles.spanThree}>
          <SelectField
            label="Division status"
            value={form.status}
            options={divisionStatusOptions}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                status: value as DivisionRecord["status"],
              }))
            }
          />
        </div>
        <label className={`${styles.field} ${styles.spanThree}`}>
          <span>Sort order</span>
          <input
            value={form.sortOrder}
            type="number"
            min={0}
            max={10_000}
            required
            onChange={(event) =>
              setForm((current) => ({ ...current, sortOrder: event.target.value }))
            }
          />
        </label>
      </div>

      {error ? <AdminError>{error}</AdminError> : null}
      <footer className={styles.formFooter}>
        <p>
          {message ||
            (division?.hasMembers
              ? "Member assignments protect this division from deletion."
              : "Unused divisions can be removed permanently.")}
        </p>
        <div className={styles.buttonRow}>
          {division ? (
            <button
              className={styles.dangerButton}
              type="button"
              disabled={pending !== null || division.hasMembers}
              title={
                division.hasMembers
                  ? "Remove its member assignments before deleting this division"
                  : undefined
              }
              onClick={() => void handleRemove()}
            >
              <TrashIcon aria-hidden width={18} height={18} />
              {pending === "remove" ? "Removing…" : "Remove division"}
            </button>
          ) : null}
          <button className={styles.primaryButton} type="submit" disabled={pending !== null}>
            <CheckCircleIcon aria-hidden width={18} height={18} />
            {pending === "save" ? "Saving…" : "Save division"}
          </button>
        </div>
      </footer>
    </form>
  );
}

function DivisionManager() {
  const divisions = useQuery(api.adminMemberDivisions.list, {});
  const candidates = useQuery(
    api.adminMemberDivisions.listCoordinatorCandidates,
    {},
  );
  const [status, setStatus] = useState<"all" | DivisionRecord["status"]>("all");
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const visibleDivisions = useMemo(
    () =>
      (divisions ?? []).filter(
        (division) => status === "all" || division.status === status,
      ),
    [divisions, status],
  );
  const selected =
    selectedId === null || selectedId === "new"
      ? null
      : (divisions ?? []).find((division) => division._id === selectedId) ?? null;

  return (
    <AdminSection
      title="Division workspace"
      description="Manage the club's working divisions and one accountable coordinator for each active division."
      actions={
        <button className={styles.primaryButton} type="button" onClick={() => setSelectedId("new")}>
          <PlusIcon aria-hidden width={18} height={18} />
          Add division
        </button>
      }
    >
      <div className={styles.toolbar}>
        <SelectField
          label="Division status"
          value={status}
          options={[{ value: "all", label: "All divisions" }, ...divisionStatusOptions]}
          onValueChange={(value) => {
            setStatus(value as typeof status);
            setSelectedId(null);
          }}
        />
        <div className={styles.workspaceFact}>
          <span>Managed divisions</span>
          <strong>{visibleDivisions.length}</strong>
        </div>
      </div>
      <div className={styles.splitWorkspace}>
        <div className={styles.workspaceRail}>
          {divisions === undefined ? (
            <AdminLoadingRows label="Loading divisions" />
          ) : visibleDivisions.length === 0 ? (
            <AdminEmpty
              title="No divisions in this view"
              description="Add a division or choose another status."
            />
          ) : (
            visibleDivisions.map((division) => (
              <button
                key={division._id}
                className={styles.railButton}
                type="button"
                data-active={selectedId === division._id}
                aria-current={selectedId === division._id ? "true" : undefined}
                onClick={() => setSelectedId(division._id)}
              >
                <strong>{division.name}</strong>
                <small>
                  {division.coordinator?.displayName ?? "Coordinator not assigned"} / {division.status}
                </small>
              </button>
            ))
          )}
        </div>
        <div className={styles.workspaceCanvas}>
          {selectedId === null ? (
            <AdminEmpty
              title="Choose a division"
              description="Select a division to edit its responsibilities and coordinator."
            />
          ) : candidates === undefined || divisions === undefined ? (
            <AdminLoadingRows label="Loading division editor" />
          ) : selectedId !== "new" && selected === null ? (
            <AdminEmpty
              title="Division unavailable"
              description="Choose another division from the catalogue."
            />
          ) : (
            <DivisionEditor
              key={selectedId}
              division={selectedId === "new" ? null : selected}
              candidates={candidates}
              onSaved={(divisionId) => setSelectedId(divisionId)}
              onRemoved={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </AdminSection>
  );
}

export function MemberManager() {
  const [view, setView] = useState<"profiles" | "divisions">("profiles");
  const [status, setStatus] = useState<"all" | ProfileStatus>("all");
  const [filters, setFilters] = useState<AdminMemberFilterState>(
    defaultAdminMemberFilters,
  );
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const compactWorkspace = useCompactMemberWorkspace();
  const divisions = useQuery(api.adminMemberDivisions.list, {});
  const queryArgs = status === "all" ? {} : { status };
  const { results, status: pageStatus, loadMore } = usePaginatedQuery(
    api.adminMembers.listPage,
    queryArgs,
    { initialNumItems: 20 },
  );
  const selected = useQuery(
    api.adminMembers.getById,
    selectedId && selectedId !== "new"
      ? { memberId: selectedId as Id<"members"> }
      : "skip",
  );
  const filteredResults = useMemo(
    () => filterAdminMembers(results, filters),
    [filters, results],
  );
  const assignmentOptions = useMemo<ReadonlyArray<SelectFieldOption>>(() => {
    const options: SelectFieldOption[] = [{ value: "all", label: "All responsibilities" }];
    if (filters.role === "all" || filters.role === 2) {
      for (const division of divisions ?? []) {
        if (division.status === "active") {
          options.push({
            value: `division:${division._id}`,
            label: division.name,
          });
        }
      }
    }
    if (filters.role === "all" || filters.role === 3) {
      options.push(
        ...coreMemberPositions.map((position) => ({
          value: `position:${position.key}`,
          label: position.label,
        })),
      );
    }
    if (filters.role === "all" || filters.role === 4) {
      options.push(
        ...boardMemberPositions.map((position) => ({
          value: `position:${position.key}`,
          label: position.label,
        })),
      );
    }
    return options;
  }, [divisions, filters.role]);
  const joinedYearOptions = useMemo<ReadonlyArray<SelectFieldOption>>(() => {
    const years = Array.from(
      new Set(
        results.flatMap((member) =>
          member.joinedYear === undefined ? [] : [member.joinedYear],
        ),
      ),
    ).sort((left, right) => right - left);
    return [
      { value: "all", label: "All joined years" },
      ...years.map((year) => ({ value: String(year), label: String(year) })),
    ];
  }, [results]);
  const divisionNameById = useMemo(
    () => new Map((divisions ?? []).map((division) => [division._id, division.name])),
    [divisions],
  );

  function chooseView(next: "profiles" | "divisions") {
    setView(next);
    setSelectedId(null);
    setEditorOpen(false);
  }

  function chooseMember(memberId: string | "new") {
    setSelectedId(memberId);
    if (compactWorkspace) setEditorOpen(true);
  }

  const editorState =
    selectedId === null ? (
      <AdminEmpty title="Choose a member" description="Select a profile from the member table or start a new member record." />
    ) : selectedId !== "new" && selected === undefined ? (
      <AdminLoadingRows label="Loading the selected member" />
    ) : divisions === undefined ? (
      <AdminLoadingRows label="Loading managed divisions" />
    ) : selectedId !== "new" && selected === null ? (
      <AdminEmpty title="Member record unavailable" description="Choose another profile from the member table." />
    ) : (
      <MemberEditor
        key={selectedId}
        member={selectedId === "new" ? null : selected ?? null}
        divisions={divisions}
        surface={compactWorkspace ? "drawer" : "workspace"}
        onSaved={(memberId) => setSelectedId(memberId)}
        onArchived={() => {
          setSelectedId(null);
          setEditorOpen(false);
        }}
      />
    );

  const selectedEditorTitle =
    selectedId === "new"
      ? "Add member"
      : selected && selectedId !== null
        ? `Edit ${selected.displayName}`
        : "Member profile";
  const selectedEditorDescription =
    selected && selectedId !== "new"
      ? getMemberRoleDefinition(selected.roleLevel).scope
      : "Review identity, responsibility, consent, and publication details.";

  return (
    <>
      <AdminPageHeading
        title="Members"
        description="Manage responsibilities and consent as separate facts. A portrait never becomes public just because a profile is approved."
        actions={
          <>
            <div className={styles.segmentedControl} aria-label="Member administration view">
              <button
                type="button"
                data-active={view === "profiles"}
                aria-pressed={view === "profiles"}
                onClick={() => chooseView("profiles")}
              >
                <UserGroupIcon aria-hidden width={17} height={17} />
                Profiles
              </button>
              <button
                type="button"
                data-active={view === "divisions"}
                aria-pressed={view === "divisions"}
                onClick={() => chooseView("divisions")}
              >
                <BuildingOffice2Icon aria-hidden width={17} height={17} />
                Divisions
              </button>
            </div>
            {view === "profiles" ? (
              <button className={styles.primaryButton} type="button" onClick={() => chooseMember("new")}>
                <PlusIcon aria-hidden width={18} height={18} />
                Add member
              </button>
            ) : null}
          </>
        }
      />

      {view === "divisions" ? (
        <DivisionManager />
      ) : (
        <AdminSection title="Member workspace" description="Twenty profiles load per page. Filter the loaded directory, then select one complete record to review.">
          <div className={styles.memberFilterToolbar} role="region" aria-label="Filter member profiles">
            <div className={styles.memberFilterHeading}>
              <FunnelIcon aria-hidden width={20} height={20} />
              <div>
                <strong>Filter profiles</strong>
                <span>{countAdminMemberFilters(filters)} active</span>
              </div>
            </div>
            <SelectField
              label="Profile status"
              value={status}
              options={statusOptions}
              onValueChange={(next) => {
                setStatus(next as typeof status);
                setSelectedId(null);
                setEditorOpen(false);
              }}
            />
            <SelectField
              label="Role"
              value={String(filters.role)}
              options={[{ value: "all", label: "All roles" }, ...roleOptions]}
              onValueChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  role: value === "all" ? "all" : (Number(value) as MemberRoleLevel),
                  assignment: "all",
                }))
              }
            />
            <SelectField
              label="Division or position"
              value={filters.assignment}
              options={assignmentOptions}
              disabled={assignmentOptions.length === 1}
              onValueChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  assignment: value as AdminMemberFilterState["assignment"],
                }))
              }
            />
            <SelectField
              label="Year joined"
              value={String(filters.joinedYear)}
              options={joinedYearOptions}
              onValueChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  joinedYear: value === "all" ? "all" : Number(value),
                }))
              }
            />
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={countAdminMemberFilters(filters) === 0}
              onClick={() => setFilters(defaultAdminMemberFilters)}
            >
              Clear filters
            </button>
            <div className={styles.workspaceFact}>
              <span>Matching / loaded</span>
              <strong>{filteredResults.length} / {results.length}</strong>
            </div>
          </div>
          <div className={`${styles.splitWorkspace} ${styles.memberWorkspace}`}>
            <div className={`${styles.workspaceRail} ${styles.memberDirectory}`} role="region" aria-label="Member table">
              <div className={styles.memberTableHeader} aria-hidden="true">
                <span>Member</span>
                <span>Responsibility</span>
              </div>
              {pageStatus === "LoadingFirstPage" ? (
                <AdminLoadingRows label="Loading member profiles" />
              ) : results.length === 0 ? (
                <AdminEmpty title="No member records here" description="Add a reviewed profile or choose a different status." />
              ) : filteredResults.length === 0 ? (
                <AdminEmpty title="No profiles match these filters" description="Clear a filter or load another page of member records." />
              ) : (
                filteredResults.map((member) => {
                  const assignment =
                    (member.divisionId
                      ? divisionNameById.get(member.divisionId)
                      : undefined) ?? getMemberSubtypeLabel(member);
                  return (
                    <button
                      key={member._id}
                      className={`${styles.railButton} ${styles.memberTableRow}`}
                      type="button"
                      data-active={selectedId === member._id}
                      aria-current={selectedId === member._id ? "true" : undefined}
                      onClick={() => chooseMember(member._id)}
                    >
                      <span className={styles.memberTablePrimary}>
                        <strong>{member.displayName}</strong>
                        <small>Updated {formatAdminDate(member.updatedAt)}</small>
                      </span>
                      <span className={styles.memberTableResponsibility}>
                        <strong>{getMemberRoleDefinition(member.roleLevel).label}</strong>
                        <small>{assignment ?? "General membership"}</small>
                      </span>
                      <span className={styles.memberTableAction}>
                        <AdminStatus tone={memberStatusTone(member.profileStatus)}>{member.profileStatus}</AdminStatus>
                        <ChevronRightIcon aria-hidden width={18} height={18} />
                      </span>
                    </button>
                  );
                })
              )}
              {pageStatus === "CanLoadMore" || pageStatus === "LoadingMore" ? (
                <div className={styles.railLoadMore}>
                  <LoadMoreButton loading={pageStatus === "LoadingMore"} onClick={() => loadMore(20)} />
                </div>
              ) : null}
            </div>
            <div className={`${styles.workspaceCanvas} ${styles.memberDesktopCanvas}`}>
              {editorState}
            </div>
          </div>
          <AdminWorkspaceDialog
            open={compactWorkspace && editorOpen && selectedId !== null}
            variant="drawer"
            eyebrow={selectedId === "new" ? "New profile" : "Member record"}
            title={selectedEditorTitle}
            description={selectedEditorDescription}
            closeLabel="Close member editor"
            onClose={() => setEditorOpen(false)}
          >
            {compactWorkspace ? editorState : null}
          </AdminWorkspaceDialog>
        </AdminSection>
      )}
    </>
  );
}
