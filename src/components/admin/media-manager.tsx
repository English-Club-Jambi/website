"use client";

import {
  ArchiveBoxIcon,
  ArrowUpTrayIcon,
  PhotoIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, usePaginatedQuery } from "convex/react";
import Image from "next/image";
import { useState, type FormEvent } from "react";

import { SelectField } from "@/components/forms/select-field";
import { api } from "../../../convex/_generated/api";

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
import {
  useAdminMediaUpload,
  type AdminMediaPurpose,
} from "./use-admin-media-upload";

type MediaRecord = FunctionReturnType<typeof api.adminMedia.listPage>["page"][number];
type MediaStatus = MediaRecord["status"];

const purposeOptions = [
  { value: "all", label: "All purposes" },
  { value: "journal-cover", label: "Journal cover" },
  { value: "journal-inline", label: "Journal inline" },
  { value: "member-photo", label: "Member portrait" },
  { value: "page-image", label: "Page image" },
  { value: "brand", label: "Brand asset" },
  { value: "assessment-image", label: "Question illustration" },
  { value: "assessment-audio", label: "Listening question audio" },
] as const;

const uploadPurposeOptions = purposeOptions.slice(1);
const mediaStatusOptions = [
  { value: "ready", label: "Ready" },
  { value: "pending", label: "Pending verification" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
] as const;

function formatBytes(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function formatDuration(durationMs: number) {
  const seconds = Math.round(durationMs / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function statusTone(status: MediaStatus) {
  if (status === "ready") return "success" as const;
  if (status === "pending") return "warning" as const;
  return "danger" as const;
}

function MediaUploadForm() {
  const uploadMedia = useAdminMediaUpload();
  const [purpose, setPurpose] = useState<AdminMediaPurpose>("journal-inline");
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!file) {
      setError("Choose a file before uploading.");
      return;
    }
    setPending(true);
    setMessage("");
    setError("");
    try {
      const result = await uploadMedia({ file, alt, purpose });
      setMessage(
        "durationMs" in result
          ? `Verified ${file.name} at ${formatDuration(result.durationMs)}.`
          : `Verified ${file.name} at ${result.width} by ${result.height} pixels.`,
      );
      setFile(null);
      setAlt("");
      formElement.reset();
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleUpload}>
      <div className={styles.formGridWide}>
        <div className={styles.spanFour}>
          <SelectField
            label="Media purpose"
            value={purpose}
            options={uploadPurposeOptions}
            onValueChange={(next) => setPurpose(next as AdminMediaPurpose)}
          />
        </div>
        <label className={`${styles.field} ${styles.spanFour}`}>
          <span>Media file</span>
          <input
            type="file"
            accept={
              purpose === "assessment-audio"
                ? "audio/mpeg,audio/mp4,audio/ogg,audio/webm"
                : purpose === "member-photo"
                  ? "image/avif,image/webp"
                  : "image/avif,image/jpeg,image/png,image/webp"
            }
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className={`${styles.field} ${styles.spanFour}`}>
          <span>
            {purpose === "assessment-audio"
              ? "Audio description"
              : "Alternative text"}
          </span>
          <input
            value={alt}
            minLength={3}
            maxLength={240}
            placeholder={
              purpose === "assessment-audio"
                ? "Name the recording and its listening context"
                : "Describe the visible action"
            }
            required
            onChange={(event) => setAlt(event.target.value)}
          />
        </label>
      </div>
      {error ? <AdminError>{error}</AdminError> : null}
      <footer className={styles.formFooter}>
        <p>{message || "The file transfers to Cloudflare R2, then Convex verifies its type, size, and media metadata."}</p>
        <button className={styles.primaryButton} type="submit" disabled={pending}>
          <ArrowUpTrayIcon aria-hidden width={18} height={18} />
          {pending ? "Uploading and verifying…" : "Upload media"}
        </button>
      </footer>
    </form>
  );
}

function MediaAsset({ asset }: { asset: MediaRecord }) {
  const archive = useMutation(api.adminMedia.archive);
  const confirm = useAdminConfirm();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleArchive() {
    await confirm(
      {
        title: `Archive ${asset.originalName}?`,
        description: "The media record leaves active views. The R2 object will be retained.",
        confirmLabel: "Archive asset",
        cancelLabel: "Keep asset",
      },
      async () => {
        setPending(true);
        setError("");
        try {
          await archive({ mediaId: asset._id });
          setPending(false);
        } catch (caught) {
          setError(humanizeError(caught));
          setPending(false);
          throw caught;
        }
      },
    );
  }

  return (
    <article className={styles.mediaAsset}>
      <div className={styles.mediaPreview}>
        {asset.publicUrl && asset.purpose === "assessment-audio" ? (
          <div className={styles.mediaAudioPreview}>
            <SpeakerWaveIcon aria-hidden width={28} height={28} />
            <audio controls preload="metadata" src={asset.publicUrl}>
              Audio playback is not available in this browser.
            </audio>
          </div>
        ) : asset.publicUrl && asset.width && asset.height ? (
          <Image
            src={asset.publicUrl}
            alt={asset.alt}
            width={asset.width}
            height={asset.height}
            sizes="(max-width: 720px) 45vw, 220px"
          />
        ) : (
          <PhotoIcon aria-hidden width={32} height={32} />
        )}
      </div>
      <div className={styles.mediaCopy}>
        <div>
          <strong title={asset.originalName}>{asset.originalName}</strong>
          <AdminStatus tone={statusTone(asset.status)}>{asset.status}</AdminStatus>
        </div>
        <p>{asset.alt}</p>
        <dl>
          <div><dt>Purpose</dt><dd>{asset.purpose}</dd></div>
          <div><dt>Size</dt><dd>{formatBytes(asset.byteSize)}</dd></div>
          {asset.width && asset.height ? <div><dt>Pixels</dt><dd>{asset.width} x {asset.height}</dd></div> : null}
          {asset.durationMs ? <div><dt>Length</dt><dd>{formatDuration(asset.durationMs)}</dd></div> : null}
          <div><dt>Updated</dt><dd>{formatAdminDate(asset.updatedAt)}</dd></div>
        </dl>
        {error ? <AdminError>{error}</AdminError> : null}
        {asset.status !== "archived" ? (
          <button className={styles.textButton} type="button" disabled={pending} onClick={() => void handleArchive()}>
            <ArchiveBoxIcon aria-hidden width={17} height={17} />
            {pending ? "Archiving…" : "Archive asset"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function MediaManager() {
  const [status, setStatus] = useState<MediaStatus>("ready");
  const [purpose, setPurpose] = useState<"all" | AdminMediaPurpose>("all");
  const queryArgs = purpose === "all" ? { status } : { status, purpose };
  const { results, status: paginationStatus, loadMore } = usePaginatedQuery(
    api.adminMedia.listPage,
    queryArgs,
    { initialNumItems: 24 },
  );

  return (
    <>
      <AdminPageHeading
        title="Media library"
        description="Store approved images and Listening audio in Cloudflare R2 and keep their public URLs on the club's custom media domain."
      />

      <AdminSection title="Upload media" description="Images accept AVIF, JPEG, PNG, and WebP up to 10 MB. Listening audio accepts MP3, M4A, OGG, and WebM up to 25 MB and 15 minutes.">
        <MediaUploadForm />
      </AdminSection>

      <AdminSection title="Reviewed assets" description="Twenty-four assets load at a time.">
        <div className={styles.toolbar}>
          <SelectField label="Status" value={status} options={mediaStatusOptions} onValueChange={(next) => setStatus(next as MediaStatus)} />
          <SelectField label="Purpose" value={purpose} options={purposeOptions} onValueChange={(next) => setPurpose(next as typeof purpose)} />
          <div className={styles.workspaceFact}>
            <span>Loaded assets</span>
            <strong>{results.length}</strong>
          </div>
        </div>
        {paginationStatus === "LoadingFirstPage" ? (
          <AdminLoadingRows label="Loading media library" />
        ) : results.length === 0 ? (
          <AdminEmpty title="No assets in this view" description="Upload an image or choose another status and purpose." />
        ) : (
          <div className={styles.mediaGrid}>
            {results.map((asset) => <MediaAsset key={asset._id} asset={asset} />)}
          </div>
        )}
        {paginationStatus === "CanLoadMore" || paginationStatus === "LoadingMore" ? (
          <div className={styles.listFooter}>
            <LoadMoreButton loading={paginationStatus === "LoadingMore"} onClick={() => loadMore(24)} />
          </div>
        ) : null}
      </AdminSection>
    </>
  );
}
