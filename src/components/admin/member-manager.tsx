"use client";

import {
  ArchiveBoxIcon,
  CheckCircleIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";

import { SelectField, type SelectFieldOption } from "@/components/forms/select-field";
import {
  boardMemberPositions,
  coordinatorDivisions,
  coreMemberPositions,
  getMemberRoleDefinition,
  memberRoleDefinitions,
  type MemberDivision,
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
import styles from "./admin-shell.module.css";
import { useAdminMediaUpload } from "./use-admin-media-upload";

type MemberRecord = FunctionReturnType<typeof api.adminMembers.listPage>["page"][number];
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

const roleOptions: ReadonlyArray<SelectFieldOption> = memberRoleDefinitions.map((role) => ({
  value: String(role.level),
  label: role.label,
}));

type MemberFormState = {
  slug: string;
  displayName: string;
  roleLevel: MemberRoleLevel;
  division?: MemberDivision;
  position?: MemberPosition;
  joinedYear: string;
  shortBio: string;
  photo?: MemberPhoto;
  profileStatus: ProfileStatus;
  profileConsentStatus: ConsentStatus;
  photoConsentStatus: ConsentStatus;
  sortOrder: string;
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

function toFormState(member: MemberRecord): MemberFormState {
  return {
    slug: member.slug,
    displayName: member.displayName,
    roleLevel: member.roleLevel,
    ...(member.division ? { division: member.division } : {}),
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

function MemberEditor({
  member,
  onSaved,
  onArchived,
}: {
  member: MemberRecord | null;
  onSaved: (memberId: Id<"members">) => void;
  onArchived: () => void;
}) {
  const saveMember = useMutation(api.adminMembers.saveReviewed);
  const archiveMember = useMutation(api.adminMembers.archive);
  const confirm = useAdminConfirm();
  const uploadMedia = useAdminMediaUpload();
  const [form, setForm] = useState<MemberFormState>(member ? toFormState(member) : emptyMember);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitAlt, setPortraitAlt] = useState(member?.photo?.alt ?? "");
  const [focalPoint, setFocalPoint] = useState(member?.photo?.focalPoint ?? "50% 50%");
  const [pending, setPending] = useState<"save" | "upload" | "archive" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const assignmentOptions = useMemo(() => {
    if (form.roleLevel === 2) return coordinatorDivisions;
    if (form.roleLevel === 3) return coreMemberPositions;
    if (form.roleLevel === 4) return boardMemberPositions;
    return [];
  }, [form.roleLevel]);

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
      const memberId = await saveMember({
        slug: form.slug,
        displayName: form.displayName,
        roleLevel: form.roleLevel,
        ...(form.division ? { division: form.division } : {}),
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
      <div className={styles.memberEditorHeading}>
        <div>
          <strong>{member ? `Edit ${member.displayName}` : "Add a member profile"}</strong>
          <span>{getMemberRoleDefinition(form.roleLevel).scope}</span>
        </div>
        {member ? <AdminStatus tone={memberStatusTone(member.profileStatus)}>{member.profileStatus}</AdminStatus> : null}
      </div>

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
                division: undefined,
                position: undefined,
              }))
            }
          />
        </div>
        {assignmentOptions.length > 0 ? (
          <div className={styles.spanFour}>
            <SelectField
              label={form.roleLevel === 2 ? "Division" : "Position"}
              value={form.division ?? form.position}
              placeholder={form.roleLevel === 2 ? "Choose a division" : "Choose a position"}
              required
              options={assignmentOptions.map((option) => ({ value: option.key, label: option.label }))}
              onValueChange={(next) =>
                setForm((current) =>
                  current.roleLevel === 2
                    ? { ...current, division: next as MemberDivision, position: undefined }
                    : { ...current, position: next as MemberPosition, division: undefined },
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

export function MemberManager() {
  const [status, setStatus] = useState<"all" | ProfileStatus>("all");
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
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

  return (
    <>
      <AdminPageHeading
        title="Members"
        description="Manage responsibilities and consent as separate facts. A portrait never becomes public just because a profile is approved."
        actions={
          <button className={styles.primaryButton} type="button" onClick={() => setSelectedId("new")}>
            <PlusIcon aria-hidden width={18} height={18} />
            Add member
          </button>
        }
      />

      <AdminSection title="Member workspace" description="Twenty profiles load per page. Select one to review its complete record.">
        <div className={styles.toolbar}>
          <SelectField
            label="Profile status"
            value={status}
            options={statusOptions}
            onValueChange={(next) => {
              setStatus(next as typeof status);
              setSelectedId(null);
            }}
          />
          <div className={styles.workspaceFact}>
            <span>Loaded profiles</span>
            <strong>{results.length}</strong>
          </div>
        </div>
        <div className={styles.splitWorkspace}>
          <div className={styles.workspaceRail}>
            {pageStatus === "LoadingFirstPage" ? (
              <AdminLoadingRows label="Loading member profiles" />
            ) : results.length === 0 ? (
              <AdminEmpty title="No member records here" description="Add a reviewed profile or choose a different status." />
            ) : (
              results.map((member) => (
                <button
                  key={member._id}
                  className={styles.railButton}
                  type="button"
                  data-active={selectedId === member._id}
                  onClick={() => setSelectedId(member._id)}
                >
                  <strong>{member.displayName}</strong>
                  <small>{getMemberRoleDefinition(member.roleLevel).label} / Updated {formatAdminDate(member.updatedAt)}</small>
                </button>
              ))
            )}
            {pageStatus === "CanLoadMore" || pageStatus === "LoadingMore" ? (
              <div className={styles.railLoadMore}>
                <LoadMoreButton loading={pageStatus === "LoadingMore"} onClick={() => loadMore(20)} />
              </div>
            ) : null}
          </div>
          <div className={styles.workspaceCanvas}>
            {selectedId === null ? (
              <AdminEmpty title="Choose a member" description="Select a profile from the directory rail or start a new member record." />
            ) : selectedId !== "new" && selected === undefined ? (
              <AdminLoadingRows label="Loading the selected member" />
            ) : selectedId !== "new" && selected === null ? (
              <AdminEmpty title="Member record unavailable" description="Choose another profile from the directory rail." />
            ) : (
              <MemberEditor
                key={selectedId}
                member={selectedId === "new" ? null : selected ?? null}
                onSaved={(memberId) => setSelectedId(memberId)}
                onArchived={() => setSelectedId(null)}
              />
            )}
          </div>
        </div>
      </AdminSection>
    </>
  );
}
