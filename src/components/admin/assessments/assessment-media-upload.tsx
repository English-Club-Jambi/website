"use client";

import { ArrowUpTrayIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useAction, useMutation } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useId, useRef, useState, type FormEvent } from "react";

import { api } from "../../../../convex/_generated/api";

import adminStyles from "../admin-shell.module.css";
import { AdminError, humanizeError } from "../admin-ui";
import {
  executeAssessmentMediaUpload,
} from "./assessment-media-client";
import styles from "./assessment-admin.module.css";

type UploadStep = "idle" | "inspecting" | "reserving" | "uploading" | "verifying" | "complete";

const stepCopy: Record<UploadStep, string> = {
  idle: "Choose an assessment audio or image source.",
  inspecting: "Reading file metadata and computing SHA-256…",
  reserving: "Reserving a private R2 object…",
  uploading: "Uploading with the signed checksum headers…",
  verifying: "Verifying the private R2 object…",
  complete: "Private source verified and ready for review.",
};

export function AssessmentMediaUpload({
  versionId,
  onComplete,
}: {
  versionId: string;
  onComplete?: (mediaId: string) => void;
}) {
  const reserveUpload = useMutation(api.assessmentMedia.reserveUpload);
  const createUploadUrl = useAction(api.assessmentMediaNode.createUploadUrl);
  const verifyUpload = useAction(api.assessmentMediaNode.verifyUpload);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileId = useId();
  const fileHintId = useId();
  const altId = useId();
  const [alt, setAlt] = useState("");
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState("");
  const pending = !["idle", "complete"].includes(step);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file before starting the private upload.");
      return;
    }
    setError("");
    try {
      const mediaId = await executeAssessmentMediaUpload({
        versionId: versionId as Id<"assessmentVersions">,
        file,
        alt,
        reserveUpload,
        createUploadUrl,
        verifyUpload,
        onStep: setStep,
      });
      setStep("complete");
      setAlt("");
      if (inputRef.current) inputRef.current.value = "";
      onComplete?.(mediaId);
    } catch (requestError) {
      setStep("idle");
      setError(humanizeError(requestError));
    }
  }

  return (
    <form className={styles.mediaUploadForm} onSubmit={handleSubmit}>
      <div className={adminStyles.formGridWide}>
        <div className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <label className={adminStyles.fieldLabel} htmlFor={fileId}>Private source file</label>
          <input
            id={fileId}
            ref={inputRef}
            type="file"
            accept="audio/mpeg,audio/mp4,audio/ogg,audio/webm,image/avif,image/jpeg,image/png,image/webp"
            required
            disabled={pending}
            aria-describedby={fileHintId}
          />
          <small id={fileHintId} className={adminStyles.fieldHint}>
            Audio up to 25 MB and 15 minutes. Images up to 10 MB.
          </small>
        </div>
        <div className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <label className={adminStyles.fieldLabel} htmlFor={altId}>Accessible description</label>
          <textarea
            id={altId}
            value={alt}
            minLength={3}
            maxLength={500}
            required
            disabled={pending}
            onChange={(event) => setAlt(event.target.value)}
          />
        </div>
      </div>
      {error ? <AdminError>{error}</AdminError> : null}
      <footer className={adminStyles.formFooter}>
        <p role="status">
          {step === "complete" ? (
            <CheckCircleIcon aria-hidden width={18} height={18} />
          ) : null}
          {stepCopy[step]}
        </p>
        <button className={adminStyles.primaryButton} type="submit" disabled={pending}>
          <ArrowUpTrayIcon aria-hidden width={18} height={18} />
          {pending ? "Working…" : "Upload private source"}
        </button>
      </footer>
    </form>
  );
}
