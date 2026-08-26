"use client";

import { ArrowUpTrayIcon, MusicalNoteIcon } from "@heroicons/react/24/outline";
import { useId, useState } from "react";

import { AdminError, humanizeError } from "@/components/admin/admin-ui";
import { useAdminMediaUpload } from "@/components/admin/use-admin-media-upload";
import { SelectField } from "@/components/forms/select-field";

import adminStyles from "../admin-shell.module.css";
import styles from "./assessment-admin.module.css";

export type QuestionAudioAsset = {
  _id: string;
  publicUrl?: string;
  alt: string;
  durationMs?: number;
  originalName: string;
};

function formatDuration(durationMs: number | undefined) {
  if (durationMs === undefined) return "Duration unavailable";
  const seconds = Math.round(durationMs / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function QuestionAudioField({
  assets,
  selectedMediaId,
  disabled = false,
  onChange,
}: {
  assets: ReadonlyArray<QuestionAudioAsset>;
  selectedMediaId: string | null;
  disabled?: boolean;
  onChange: (mediaId: string | null) => void;
}) {
  const inputId = useId();
  const descriptionId = useId();
  const uploadMedia = useAdminMediaUpload();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const selectedAsset =
    assets.find((asset) => asset._id === selectedMediaId) ?? null;

  async function upload() {
    if (file === null) {
      setError("Choose an audio file before uploading.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const uploaded = await uploadMedia({
        file,
        alt: description,
        purpose: "assessment-audio",
      });
      onChange(uploaded.mediaId);
      setFile(null);
      setDescription("");
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <fieldset
      className={styles.questionAudioField}
      disabled={disabled || pending}
    >
      <legend>
        Listening audio <span>Required for Listening</span>
      </legend>
      <p>
        Select a reviewed recording or upload an original club recording. A
        Listening question cannot enter a live format without playable audio.
      </p>

      <div className={styles.questionAudioSelection}>
        <SelectField
          label="Reviewed recording"
          value={selectedMediaId ?? "none"}
          disabled={disabled || pending}
          options={[
            { value: "none", label: "No audio attached" },
            ...assets.map((asset) => ({
              value: asset._id,
              label: `${asset.originalName} · ${formatDuration(asset.durationMs)}`,
            })),
          ]}
          onValueChange={(value) => onChange(value === "none" ? null : value)}
        />

        {selectedAsset ? (
          <div className={styles.questionAudioPreview}>
            <MusicalNoteIcon aria-hidden width={24} height={24} />
            <div className={styles.questionAudioPreviewCopy}>
              <strong>{selectedAsset.originalName}</strong>
              <span>
                {formatDuration(selectedAsset.durationMs)} · {selectedAsset.alt}
              </span>
            </div>
            {selectedAsset.publicUrl ? (
              <audio
                aria-label={`Preview ${selectedAsset.originalName}`}
                controls
                preload="none"
                src={selectedAsset.publicUrl}
              >
                Audio playback is not available in this browser.
              </audio>
            ) : null}
          </div>
        ) : (
          <p className={styles.questionAudioEmpty}>
            No recording selected. Keep this question paused until its audio is
            ready.
          </p>
        )}
      </div>

      {selectedMediaId !== null && selectedAsset === null ? (
        <p className={styles.illustrationPending} role="status">
          The uploaded recording is being added to the reviewed library.
        </p>
      ) : null}

      <div className={styles.questionAudioUpload}>
        <label className={adminStyles.field} htmlFor={inputId}>
          <span>Audio file</span>
          <input
            id={inputId}
            type="file"
            accept="audio/mpeg,audio/mp4,audio/ogg,audio/webm"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className={adminStyles.field} htmlFor={descriptionId}>
          <span>Accessible description</span>
          <input
            id={descriptionId}
            value={description}
            minLength={3}
            maxLength={240}
            placeholder="Short campus conversation about meeting after class"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={adminStyles.secondaryButton}
          disabled={file === null || description.trim().length < 3 || pending}
          onClick={() => void upload()}
        >
          <ArrowUpTrayIcon aria-hidden width={18} height={18} />
          {pending ? "Uploading…" : "Upload audio to R2"}
        </button>
      </div>
      <small className={styles.questionAudioHint}>
        MP3, M4A, OGG, or WebM; up to 25 MB and 15 minutes.
      </small>
      {error ? <AdminError>{error}</AdminError> : null}
    </fieldset>
  );
}
