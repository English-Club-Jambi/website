"use client";

import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState, type FormEvent } from "react";

import { SelectField } from "@/components/forms/select-field";

import adminStyles from "../admin-shell.module.css";
import { AdminError } from "../admin-ui";

export type AssessmentSectionInput = {
  sectionId?: string;
  sectionKey: string;
  skill: "listening" | "structure" | "reading" | "writing" | "speaking";
  order: number;
  title: string;
  instructions: string;
  timeLimitSeconds?: number;
  audioReplayPolicy?: "unlimited" | "once" | "twice";
};

export function AssessmentSectionForm({
  initial,
  timed,
  pending,
  error,
  onCancel,
  onSave,
}: {
  initial?: AssessmentSectionInput;
  timed: boolean;
  pending: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (input: AssessmentSectionInput) => Promise<void> | void;
}) {
  const [sectionKey, setSectionKey] = useState(initial?.sectionKey ?? "");
  const [skill, setSkill] = useState<AssessmentSectionInput["skill"]>(initial?.skill ?? "reading");
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    initial?.timeLimitSeconds ? initial.timeLimitSeconds / 60 : 10,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isInteger(order) || (timed && !Number.isInteger(timeLimitMinutes))) return;
    await onSave({
      ...(initial?.sectionId ? { sectionId: initial.sectionId } : {}),
      sectionKey: sectionKey.trim(),
      skill,
      order,
      title: title.trim(),
      instructions: instructions.trim(),
      ...(timed ? { timeLimitSeconds: timeLimitMinutes * 60 } : {}),
      ...(skill === "listening" ? { audioReplayPolicy: "unlimited" as const } : {}),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={adminStyles.formGridWide}>
        <label className={`${adminStyles.field} ${adminStyles.spanFour}`}>
          <span>Section key</span>
          <input value={sectionKey} minLength={1} maxLength={96} required onChange={(event) => setSectionKey(event.target.value)} />
        </label>
        <div className={adminStyles.spanFour}>
          <SelectField
            label="Skill"
            value={skill}
            options={[
              { value: "listening", label: "Listening" },
              { value: "structure", label: "Structure and written expression" },
              { value: "reading", label: "Reading" },
              { value: "writing", label: "Writing" },
              { value: "speaking", label: "Speaking" },
            ]}
            onValueChange={(value) => setSkill(value as AssessmentSectionInput["skill"])}
          />
        </div>
        <label className={`${adminStyles.field} ${adminStyles.spanFour}`}>
          <span>Order</span>
          <input type="number" value={order} min={0} max={7} step={1} required onChange={(event) => setOrder(event.target.valueAsNumber)} />
        </label>
        <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
          <span>Section title</span>
          <input value={title} minLength={2} maxLength={180} required onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
          <span>Instructions</span>
          <textarea value={instructions} minLength={10} maxLength={4000} required onChange={(event) => setInstructions(event.target.value)} />
        </label>
        {timed ? (
          <label className={`${adminStyles.field} ${adminStyles.spanSix}`}>
            <span>Time limit in minutes</span>
            <input type="number" value={timeLimitMinutes} min={1} max={120} step={1} required onChange={(event) => setTimeLimitMinutes(event.target.valueAsNumber)} />
          </label>
        ) : null}
        {skill === "listening" ? (
          <div className={`${adminStyles.workspaceFact} ${adminStyles.spanSix}`}>
            <span>Audio replay</span>
            <strong>Unlimited for this release</strong>
          </div>
        ) : null}
      </div>
      {error ? <AdminError>{error}</AdminError> : null}
      <footer className={adminStyles.formFooter}>
        <p>Section keys and order must stay unique within this draft.</p>
        <div className={adminStyles.buttonRow}>
          <button className={adminStyles.secondaryButton} type="button" disabled={pending} onClick={onCancel}>
            <XMarkIcon aria-hidden width={18} height={18} />
            Cancel
          </button>
          <button className={adminStyles.primaryButton} type="submit" disabled={pending}>
            <CheckCircleIcon aria-hidden width={18} height={18} />
            {pending ? "Saving…" : "Save section"}
          </button>
        </div>
      </footer>
    </form>
  );
}
