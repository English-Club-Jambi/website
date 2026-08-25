"use client";

import {
  ArrowUpTrayIcon,
  NoSymbolIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useId, useState } from "react";

import { AdminError, humanizeError } from "@/components/admin/admin-ui";
import { useAdminMediaUpload } from "@/components/admin/use-admin-media-upload";

import adminStyles from "../admin-shell.module.css";
import styles from "./assessment-admin.module.css";

export type QuestionIllustrationAsset = {
  _id: string;
  publicUrl?: string;
  alt: string;
  width?: number;
  height?: number;
  originalName: string;
};

export function QuestionIllustrationField({
  assets,
  selectedMediaId,
  disabled = false,
  onChange,
}: {
  assets: ReadonlyArray<QuestionIllustrationAsset>;
  selectedMediaId: string | null;
  disabled?: boolean;
  onChange: (mediaId: string | null) => void;
}) {
  const inputId = useId();
  const uploadMedia = useAdminMediaUpload();
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const selectedAsset =
    assets.find((asset) => asset._id === selectedMediaId) ?? null;

  async function upload() {
    if (file === null) {
      setError("Choose an image before uploading.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const uploaded = await uploadMedia({
        file,
        alt,
        purpose: "assessment-image",
      });
      onChange(uploaded.mediaId);
      setFile(null);
      setAlt("");
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <fieldset className={styles.illustrationField} disabled={disabled || pending}>
      <legend>Question illustration <span>Optional</span></legend>
      <p>
        Choose a reviewed R2 image or upload one here. Alternative text is
        required for every attached image.
      </p>

      <div className={styles.illustrationChoices}>
        <button
          type="button"
          className={styles.illustrationChoice}
          data-selected={selectedMediaId === null}
          aria-pressed={selectedMediaId === null}
          onClick={() => onChange(null)}
        >
          <span className={styles.illustrationChoicePreview}>
            <NoSymbolIcon aria-hidden width={24} height={24} />
          </span>
          <span>No illustration</span>
        </button>
        {assets.map((asset) => (
          <button
            type="button"
            key={asset._id}
            className={styles.illustrationChoice}
            data-selected={asset._id === selectedMediaId}
            aria-pressed={asset._id === selectedMediaId}
            onClick={() => onChange(asset._id)}
          >
            <span className={styles.illustrationChoicePreview}>
              {asset.publicUrl && asset.width && asset.height ? (
                <Image
                  src={asset.publicUrl}
                  alt=""
                  width={asset.width}
                  height={asset.height}
                  sizes="112px"
                />
              ) : (
                <PhotoIcon aria-hidden width={24} height={24} />
              )}
            </span>
            <span>{asset.originalName}</span>
          </button>
        ))}
      </div>

      {selectedMediaId !== null && selectedAsset === null ? (
        <p className={styles.illustrationPending} role="status">
          The uploaded illustration is being added to the reviewed library.
        </p>
      ) : null}

      <div className={styles.illustrationUpload}>
        <label className={adminStyles.field} htmlFor={inputId}>
          <span>Image file</span>
          <input
            id={inputId}
            type="file"
            accept="image/avif,image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className={adminStyles.field}>
          <span>Alternative text</span>
          <input
            value={alt}
            minLength={3}
            maxLength={240}
            placeholder="Describe what the learner needs to see"
            onChange={(event) => setAlt(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={adminStyles.secondaryButton}
          disabled={file === null || alt.trim().length < 3 || pending}
          onClick={() => void upload()}
        >
          <ArrowUpTrayIcon aria-hidden width={18} height={18} />
          {pending ? "Uploading…" : "Upload to R2"}
        </button>
      </div>
      {error ? <AdminError>{error}</AdminError> : null}
    </fieldset>
  );
}
