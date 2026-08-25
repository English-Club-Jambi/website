"use client";

import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState, type FormEvent } from "react";

import { SelectField } from "@/components/forms/select-field";

import adminStyles from "../admin-shell.module.css";
import { AdminError } from "../admin-ui";

export type AssessmentMetadataInput = {
  title: string;
  summary: string;
  instructions: string;
  locale: "en";
  timePolicy: "untimed" | "per-section";
  allowResume: boolean;
  reviewPolicy: "none" | "after-section" | "after-submit";
  scorePolicy: "raw-objective";
  defaultTimingMode: "standard" | "extended" | "untimed";
  defaultListeningMode: "audio-primary" | "transcript-supported";
  maxAttemptsPerDay: number;
};

export function AssessmentMetadataForm({
  initial,
  fullPractice,
  pending,
  error,
  onCancel,
  onSave,
}: {
  initial: AssessmentMetadataInput;
  fullPractice: boolean;
  pending: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (input: AssessmentMetadataInput) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(initial);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isInteger(draft.maxAttemptsPerDay)) return;
    await onSave({
      ...draft,
      allowResume: true,
      reviewPolicy: "after-submit",
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      instructions: draft.instructions.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={adminStyles.formGridWide}>
        <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
          <span>Public title</span>
          <input
            value={draft.title}
            minLength={5}
            maxLength={180}
            required
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </label>
        <label className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <span>Summary</span>
          <textarea
            value={draft.summary}
            minLength={20}
            maxLength={500}
            required
            onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
          />
        </label>
        <label className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <span>Instructions</span>
          <textarea
            value={draft.instructions}
            minLength={20}
            maxLength={4000}
            required
            onChange={(event) =>
              setDraft({ ...draft, instructions: event.target.value })
            }
          />
        </label>
        <div className={adminStyles.spanFour}>
          <SelectField
            label="Timing policy"
            value={draft.timePolicy}
            disabled={fullPractice}
            options={[
              { value: "untimed", label: "Untimed" },
              { value: "per-section", label: "Timed by section" },
            ]}
            onValueChange={(value) =>
              setDraft({ ...draft, timePolicy: value as AssessmentMetadataInput["timePolicy"] })
            }
          />
        </div>
        <div className={adminStyles.spanFour}>
          <div className={adminStyles.workspaceFact}>
            <span>Review moment</span>
            <strong>After submission</strong>
          </div>
        </div>
        <div className={adminStyles.spanFour}>
          <SelectField
            label="Default timing mode"
            value={draft.defaultTimingMode}
            options={[
              { value: "standard", label: "Standard" },
              { value: "extended", label: "Extended" },
              { value: "untimed", label: "Untimed accommodation" },
            ]}
            onValueChange={(value) =>
              setDraft({
                ...draft,
                defaultTimingMode: value as AssessmentMetadataInput["defaultTimingMode"],
              })
            }
          />
        </div>
        <div className={adminStyles.spanSix}>
          <SelectField
            label="Listening support"
            value={draft.defaultListeningMode}
            options={[
              { value: "transcript-supported", label: "Transcript supported" },
              { value: "audio-primary", label: "Audio primary" },
            ]}
            onValueChange={(value) =>
              setDraft({
                ...draft,
                defaultListeningMode: value as AssessmentMetadataInput["defaultListeningMode"],
              })
            }
          />
        </div>
        <label className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <span>Maximum attempts per day</span>
          <input
            type="number"
            value={draft.maxAttemptsPerDay}
            min={1}
            max={20}
            step={1}
            required
            onChange={(event) =>
              setDraft({ ...draft, maxAttemptsPerDay: event.target.valueAsNumber })
            }
          />
        </label>
        <div className={`${adminStyles.workspaceFact} ${adminStyles.spanFull}`}>
          <span>Attempt continuity</span>
          <strong>Learners can resume an unfinished attempt</strong>
        </div>
      </div>

      {error ? <AdminError>{error}</AdminError> : null}

      <footer className={adminStyles.formFooter}>
        <p>Saving creates a new content revision and makes earlier approvals stale.</p>
        <div className={adminStyles.buttonRow}>
          <button className={adminStyles.secondaryButton} type="button" disabled={pending} onClick={onCancel}>
            <XMarkIcon aria-hidden width={18} height={18} />
            Cancel
          </button>
          <button className={adminStyles.primaryButton} type="submit" disabled={pending}>
            <CheckCircleIcon aria-hidden width={18} height={18} />
            {pending ? "Saving…" : "Save metadata"}
          </button>
        </div>
      </footer>
    </form>
  );
}
