"use client";

import {
  DocumentPlusIcon,
} from "@heroicons/react/24/outline";
import { useId, useState, type FormEvent } from "react";

import { AdminError } from "@/components/admin/admin-ui";
import { SelectField } from "@/components/forms/select-field";

import adminStyles from "../admin-shell.module.css";
import styles from "./assessment-admin.module.css";
import type { AssessmentKind } from "./assessment-admin-ui";

export type CreateAssessmentDefinitionInput = {
  adminTitle: string;
  slug: string;
  kind: AssessmentKind;
  profile: "ec-itp-level-1-aligned-v1" | "club-program-v1";
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

const kindOptions = [
  { value: "full-practice", label: "Full three-section practice" },
  { value: "skill-quiz", label: "Short skill quiz" },
] as const;

const profileLabels: Record<CreateAssessmentDefinitionInput["profile"], string> = {
  "ec-itp-level-1-aligned-v1": "English proficiency practice, revision 1",
  "club-program-v1": "Reviewed English Club programme facts",
};

function profileForKind(
  kind: AssessmentKind,
): CreateAssessmentDefinitionInput["profile"] {
  return kind === "club-program-quiz"
    ? "club-program-v1"
    : "ec-itp-level-1-aligned-v1";
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function AssessmentDefinitionForm({
  pending,
  error,
  onCreate,
}: {
  pending: boolean;
  error?: string;
  onCreate: (input: CreateAssessmentDefinitionInput) => Promise<void> | void;
}) {
  const [adminTitle, setAdminTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [kind, setKind] = useState<AssessmentKind>("skill-quiz");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [instructions, setInstructions] = useState("");
  const [timePolicy, setTimePolicy] = useState<"untimed" | "per-section">(
    "untimed",
  );
  const [defaultTimingMode, setDefaultTimingMode] = useState<
    "standard" | "extended" | "untimed"
  >("standard");
  const [defaultListeningMode, setDefaultListeningMode] = useState<
    "audio-primary" | "transcript-supported"
  >("transcript-supported");
  const [maxAttemptsPerDay, setMaxAttemptsPerDay] = useState(3);
  const profile = profileForKind(kind);
  const titleId = useId();
  const titleHintId = useId();
  const slugId = useId();
  const slugHintId = useId();
  const profileId = useId();
  const profileHintId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate({
      adminTitle: adminTitle.trim(),
      slug: normalizeSlug(slug),
      kind,
      profile,
      title: title.trim(),
      summary: summary.trim(),
      instructions: instructions.trim(),
      locale: "en",
      timePolicy,
      allowResume: true,
      reviewPolicy: "after-submit",
      scorePolicy: "raw-objective",
      defaultTimingMode,
      defaultListeningMode,
      maxAttemptsPerDay,
    });
  }

  return (
    <form className={styles.definitionForm} onSubmit={handleSubmit}>
      <div className={adminStyles.formGridWide}>
        <div
          className={`${adminStyles.field} ${adminStyles.spanSix}`}
        >
          <label className={adminStyles.fieldLabel} htmlFor={titleId}>
            Internal title
          </label>
          <input
            id={titleId}
            aria-describedby={titleHintId}
            value={adminTitle}
            minLength={5}
            maxLength={180}
            autoComplete="off"
            required
            onChange={(event) => {
              const value = event.target.value;
              setAdminTitle(value);
              if (!slugTouched) setSlug(normalizeSlug(value));
            }}
          />
          <small id={titleHintId} className={adminStyles.fieldHint}>
            Editors see this title. Learner-facing wording belongs to the draft version.
          </small>
        </div>

        <div
          className={`${adminStyles.field} ${adminStyles.spanSix}`}
        >
          <label className={adminStyles.fieldLabel} htmlFor={slugId}>
            Route slug
          </label>
          <input
            id={slugId}
            aria-describedby={slugHintId}
            value={slug}
            minLength={3}
            maxLength={96}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            autoComplete="off"
            required
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(normalizeSlug(event.target.value));
            }}
          />
          <small id={slugHintId} className={adminStyles.fieldHint}>
            Lowercase letters, numbers, and single hyphens only.
          </small>
        </div>

        <div className={adminStyles.spanSix}>
          <SelectField
            label="Assessment kind"
            value={kind}
            options={kindOptions}
            onValueChange={(value) => {
              const nextKind = value as AssessmentKind;
              setKind(nextKind);
              if (nextKind === "full-practice") setTimePolicy("per-section");
            }}
          />
        </div>

        <div
          className={`${adminStyles.field} ${adminStyles.spanSix}`}
        >
          <label className={adminStyles.fieldLabel} htmlFor={profileId}>
            Content profile
          </label>
          <input
            id={profileId}
            value={profileLabels[profile]}
            readOnly
            aria-readonly="true"
            aria-describedby={profileHintId}
          />
          <small id={profileHintId} className={adminStyles.fieldHint}>
            The kind fixes its profile so incompatible question formats cannot mix.
          </small>
        </div>

        <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
          <span>Learner-facing title</span>
          <input
            value={title}
            minLength={5}
            maxLength={180}
            autoComplete="off"
            required
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <span>Summary</span>
          <textarea
            value={summary}
            minLength={20}
            maxLength={500}
            required
            onChange={(event) => setSummary(event.target.value)}
          />
        </label>

        <label className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <span>Instructions</span>
          <textarea
            value={instructions}
            minLength={20}
            maxLength={4000}
            required
            onChange={(event) => setInstructions(event.target.value)}
          />
        </label>

        <div className={adminStyles.spanFour}>
          <SelectField
            label="Timing policy"
            value={timePolicy}
            disabled={kind === "full-practice"}
            options={[
              { value: "untimed", label: "Untimed" },
              { value: "per-section", label: "Timed by section" },
            ]}
            onValueChange={(value) =>
              setTimePolicy(value as "untimed" | "per-section")
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
            value={defaultTimingMode}
            options={[
              { value: "standard", label: "Standard" },
              { value: "extended", label: "Extended" },
              { value: "untimed", label: "Untimed accommodation" },
            ]}
            onValueChange={(value) =>
              setDefaultTimingMode(value as typeof defaultTimingMode)
            }
          />
        </div>

        <div className={adminStyles.spanSix}>
          <SelectField
            label="Default listening support"
            value={defaultListeningMode}
            options={[
              { value: "transcript-supported", label: "Transcript supported" },
              { value: "audio-primary", label: "Audio primary" },
            ]}
            onValueChange={(value) =>
              setDefaultListeningMode(value as typeof defaultListeningMode)
            }
          />
        </div>

        <label className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <span>Maximum attempts per day</span>
          <input
            type="number"
            value={maxAttemptsPerDay}
            min={1}
            max={20}
            step={1}
            required
            onChange={(event) => setMaxAttemptsPerDay(event.target.valueAsNumber)}
          />
        </label>

        <div className={`${adminStyles.workspaceFact} ${adminStyles.spanFull}`}>
          <span>Attempt continuity</span>
          <strong>Learners can resume an unfinished attempt</strong>
        </div>
      </div>

      {error ? <AdminError>{error}</AdminError> : null}

      <footer className={styles.definitionFormFooter}>
        <p>
          Creating a definition also creates its first private draft. No learner can
          open it until validation and four current approvals pass.
        </p>
        <button className={adminStyles.primaryButton} type="submit" disabled={pending}>
          <DocumentPlusIcon aria-hidden width={18} height={18} />
          {pending ? "Creating draft…" : "Create private draft"}
        </button>
      </footer>
    </form>
  );
}
