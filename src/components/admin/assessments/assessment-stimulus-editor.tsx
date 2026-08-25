"use client";

import { CheckCircleIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMemo, useState, type FormEvent } from "react";

import { SelectField } from "@/components/forms/select-field";

import adminStyles from "../admin-shell.module.css";
import { AdminError } from "../admin-ui";
import styles from "./assessment-admin.module.css";

export type AssessmentStimulusInput = {
  stimulusId?: string;
  stimulusKey: string;
  kind: "reading" | "audio" | "image";
  order: number;
  title: string | null;
  body: string | null;
  mediaId: string | null;
  transcript: string | null;
  alt: string | null;
  provenanceJson: string;
};

export type AssessmentStimulusMediaOption = {
  id: string;
  label: string;
  purpose: "assessment-audio" | "assessment-image";
  access: "public" | "assessment-private";
};

function readProvenance(value?: string) {
  if (!value) return { sourceNote: "", rightsNote: "" };
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return {
      sourceNote: typeof parsed.sourceNote === "string" ? parsed.sourceNote : "",
      rightsNote: typeof parsed.rightsNote === "string" ? parsed.rightsNote : "",
    };
  } catch {
    return { sourceNote: "", rightsNote: "" };
  }
}

export function AssessmentStimulusEditor({
  initial,
  media,
  pending,
  error,
  onCancel,
  onSave,
}: {
  initial?: AssessmentStimulusInput;
  media: ReadonlyArray<AssessmentStimulusMediaOption>;
  pending: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (input: AssessmentStimulusInput) => Promise<void> | void;
}) {
  const provenance = readProvenance(initial?.provenanceJson);
  const [stimulusKey, setStimulusKey] = useState(initial?.stimulusKey ?? "");
  const [kind, setKind] = useState<AssessmentStimulusInput["kind"]>(initial?.kind ?? "reading");
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [mediaId, setMediaId] = useState(initial?.mediaId ?? "none");
  const [transcript, setTranscript] = useState(initial?.transcript ?? "");
  const [alt, setAlt] = useState(initial?.alt ?? "");
  const [sourceNote, setSourceNote] = useState(provenance.sourceNote);
  const [rightsNote, setRightsNote] = useState(provenance.rightsNote);
  const [validationError, setValidationError] = useState("");
  const neededPurpose = kind === "audio" ? "assessment-audio" : "assessment-image";
  const mediaOptions = useMemo(
    () =>
      media
        .filter((asset) => asset.purpose === neededPurpose)
        .map((asset) => ({
          value: asset.id,
          label: `${asset.label} (${asset.access === "public" ? "public derivative" : "private draft"})`,
        })),
    [media, neededPurpose],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    if (!Number.isInteger(order)) {
      setValidationError("Order must be a whole number.");
      return;
    }
    if (kind !== "reading" && mediaId === "none") {
      setValidationError("Choose a verified R2 asset for this stimulus.");
      return;
    }
    await onSave({
      ...(initial?.stimulusId ? { stimulusId: initial.stimulusId } : {}),
      stimulusKey: stimulusKey.trim(),
      kind,
      order,
      title: title.trim() || null,
      body: kind === "reading" ? body.trim() || null : null,
      mediaId: kind === "reading" || mediaId === "none" ? null : mediaId,
      transcript: kind === "audio" ? transcript.trim() || null : null,
      alt: kind === "image" ? alt.trim() || null : null,
      provenanceJson: JSON.stringify({
        sourceNote: sourceNote.trim(),
        rightsNote: rightsNote.trim(),
      }),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={adminStyles.formGridWide}>
        <label className={`${adminStyles.field} ${adminStyles.spanFour}`}>
          <span>Stimulus key</span>
          <input value={stimulusKey} minLength={1} maxLength={96} required onChange={(event) => setStimulusKey(event.target.value)} />
        </label>
        <div className={adminStyles.spanFour}>
          <SelectField
            label="Stimulus kind"
            value={kind}
            options={[
              { value: "reading", label: "Reading passage" },
              { value: "audio", label: "Listening audio" },
              { value: "image", label: "Supporting image" },
            ]}
            onValueChange={(value) => {
              setKind(value as AssessmentStimulusInput["kind"]);
              setMediaId("none");
            }}
          />
        </div>
        <label className={`${adminStyles.field} ${adminStyles.spanFour}`}>
          <span>Order</span>
          <input type="number" value={order} min={0} max={199} step={1} required onChange={(event) => setOrder(event.target.valueAsNumber)} />
        </label>
        <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
          <span>Optional title</span>
          <input value={title} maxLength={180} onChange={(event) => setTitle(event.target.value)} />
        </label>
        {kind === "reading" ? (
          <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
            <span>Reading passage</span>
            <textarea value={body} maxLength={50000} required onChange={(event) => setBody(event.target.value)} />
          </label>
        ) : (
          <div className={adminStyles.spanFull}>
            <SelectField
              label="Verified R2 asset"
              value={mediaId}
              options={[{ value: "none", label: "Choose an asset", disabled: true }, ...mediaOptions]}
              required
              onValueChange={setMediaId}
            />
            {mediaOptions.length === 0 ? (
              <p className={styles.fieldNote}>
                No ready asset is linked to this assessment version. The upload pipeline must verify it before selection.
              </p>
            ) : null}
          </div>
        )}
        {kind === "audio" ? (
          <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
            <span>Complete transcript</span>
            <textarea value={transcript} maxLength={50000} required onChange={(event) => setTranscript(event.target.value)} />
          </label>
        ) : null}
        {kind === "image" ? (
          <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
            <span>Image alternative text</span>
            <textarea value={alt} maxLength={500} required onChange={(event) => setAlt(event.target.value)} />
          </label>
        ) : null}
        <label className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <span>Source note</span>
          <textarea value={sourceNote} minLength={3} maxLength={4000} required onChange={(event) => setSourceNote(event.target.value)} />
        </label>
        <label className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <span>Rights note</span>
          <textarea value={rightsNote} minLength={3} maxLength={4000} required onChange={(event) => setRightsNote(event.target.value)} />
        </label>
      </div>
      {validationError || error ? <AdminError>{validationError || error}</AdminError> : null}
      <footer className={adminStyles.formFooter}>
        <p>
          <PhotoIcon aria-hidden width={17} height={17} />
          Draft assets remain private until the R2 review pipeline creates a public derivative.
        </p>
        <div className={adminStyles.buttonRow}>
          <button className={adminStyles.secondaryButton} type="button" disabled={pending} onClick={onCancel}>
            <XMarkIcon aria-hidden width={18} height={18} />
            Cancel
          </button>
          <button className={adminStyles.primaryButton} type="submit" disabled={pending}>
            <CheckCircleIcon aria-hidden width={18} height={18} />
            {pending ? "Saving…" : "Save stimulus"}
          </button>
        </div>
      </footer>
    </form>
  );
}
