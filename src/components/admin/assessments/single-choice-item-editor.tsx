"use client";

import {
  CheckCircleIcon,
  LockClosedIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState, type FormEvent } from "react";

import { AdminError } from "@/components/admin/admin-ui";
import { SelectField, type SelectFieldOption } from "@/components/forms/select-field";

import adminStyles from "../admin-shell.module.css";
import styles from "./assessment-admin.module.css";

type EditableOption = {
  key: string;
  label: string;
};

export type SingleChoiceItemDraft = {
  itemId?: string;
  itemKey: string;
  order: number;
  prompt: string;
  required: boolean;
  explanation?: string;
  stimulusId?: string;
  sourceContentVersionId?: string;
  options: ReadonlyArray<EditableOption>;
  correctChoiceKey: string;
  provenanceJson: string;
};

type ProvenanceFields = {
  sourceNote: string;
  rightsNote: string;
};

function readProvenance(value: string | undefined): ProvenanceFields {
  if (!value) return { sourceNote: "", rightsNote: "" };
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return { sourceNote: "", rightsNote: "" };
    }
    const record = parsed as Record<string, unknown>;
    return {
      sourceNote:
        typeof record.sourceNote === "string" ? record.sourceNote : "",
      rightsNote:
        typeof record.rightsNote === "string" ? record.rightsNote : "",
    };
  } catch {
    return { sourceNote: "", rightsNote: "" };
  }
}

function cleanLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function defaultOptions(): EditableOption[] {
  return [
    { key: "A", label: "" },
    { key: "B", label: "" },
  ];
}

function nextOptionKey(options: ReadonlyArray<EditableOption>) {
  const used = new Set(options.map((option) => option.key));
  return "ABCDEFGH".split("").find((key) => !used.has(key)) ?? "";
}

export function SingleChoiceItemEditor({
  initial,
  stimulusOptions = [],
  sourceOptions = [],
  requireContentSource = false,
  pending,
  error,
  onSave,
}: {
  initial?: Partial<SingleChoiceItemDraft>;
  stimulusOptions?: ReadonlyArray<SelectFieldOption>;
  sourceOptions?: ReadonlyArray<SelectFieldOption>;
  requireContentSource?: boolean;
  pending: boolean;
  error?: string;
  onSave: (input: SingleChoiceItemDraft) => Promise<void> | void;
}) {
  const provenance = readProvenance(initial?.provenanceJson);
  const [itemKey, setItemKey] = useState(initial?.itemKey ?? "");
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [required, setRequired] = useState(initial?.required ?? true);
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [stimulusId, setStimulusId] = useState(initial?.stimulusId ?? "none");
  const [sourceContentVersionId, setSourceContentVersionId] = useState(
    initial?.sourceContentVersionId ?? "none",
  );
  const [options, setOptions] = useState<EditableOption[]>(
    initial?.options ? [...initial.options] : defaultOptions(),
  );
  const [correctChoiceKey, setCorrectChoiceKey] = useState(
    initial?.correctChoiceKey ?? "",
  );
  const [sourceNote, setSourceNote] = useState(provenance.sourceNote);
  const [rightsNote, setRightsNote] = useState(provenance.rightsNote);
  const [validationError, setValidationError] = useState("");

  const correctOptions = useMemo(
    () =>
      options
        .filter((option) => cleanLine(option.label).length > 0)
        .map((option) => ({
          value: option.key,
          label: `${option.key}. ${cleanLine(option.label)}`,
        })),
    [options],
  );

  function updateOption(index: number, label: string) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, label } : option,
      ),
    );
  }

  function removeOption(index: number) {
    setOptions((current) => {
      if (current.length <= 2) return current;
      const removed = current[index];
      if (removed?.key === correctChoiceKey) setCorrectChoiceKey("");
      return current.filter((_, optionIndex) => optionIndex !== index);
    });
  }

  function addOption() {
    const key = nextOptionKey(options);
    if (!key) return;
    setOptions((current) => [...current, { key, label: "" }]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    const cleanedOptions = options.map((option) => ({
      key: option.key,
      label: cleanLine(option.label),
    }));
    if (!Number.isInteger(order) || order < 0 || order > 199) {
      setValidationError("Order must be a whole number from 0 to 199.");
      return;
    }
    if (requireContentSource && sourceContentVersionId === "none") {
      setValidationError("Choose a published page-copy source.");
      return;
    }
    if (!cleanedOptions.some((option) => option.key === correctChoiceKey)) {
      setValidationError("Choose a correct option that has answer text.");
      return;
    }
    const distinctLabels = new Set(
      cleanedOptions.map((option) => option.label.toLocaleLowerCase()),
    );
    if (distinctLabels.size !== cleanedOptions.length) {
      setValidationError("Answer options must use distinct wording.");
      return;
    }
    await onSave({
      ...(initial?.itemId ? { itemId: initial.itemId } : {}),
      itemKey: cleanLine(itemKey),
      order,
      prompt: prompt.trim(),
      required,
      ...(explanation.trim() ? { explanation: explanation.trim() } : {}),
      ...(stimulusId === "none" ? {} : { stimulusId }),
      ...(sourceContentVersionId === "none"
        ? {}
        : { sourceContentVersionId }),
      options: cleanedOptions,
      correctChoiceKey,
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
          <span>Item key</span>
          <input
            value={itemKey}
            minLength={1}
            maxLength={96}
            autoComplete="off"
            required
            onChange={(event) => setItemKey(event.target.value)}
          />
        </label>
        <label className={`${adminStyles.field} ${adminStyles.spanFour}`}>
          <span>Order</span>
          <input
            value={order}
            type="number"
            min={0}
            max={199}
            step={1}
            required
            onChange={(event) => setOrder(event.target.valueAsNumber)}
          />
        </label>
        <label className={`${adminStyles.checkbox} ${adminStyles.spanFour}`}>
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          Response required
        </label>

        <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
          <span>Question prompt</span>
          <textarea
            value={prompt}
            minLength={1}
            maxLength={4_000}
            required
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>

        <div className={adminStyles.spanSix}>
          <SelectField
            label="Stimulus"
            value={stimulusId}
            options={[{ value: "none", label: "No stimulus" }, ...stimulusOptions]}
            onValueChange={setStimulusId}
          />
        </div>

        {requireContentSource || sourceOptions.length > 0 ? (
          <div className={adminStyles.spanSix}>
            <SelectField
              label="Published page-copy source"
              value={sourceContentVersionId}
              options={[
                {
                  value: "none",
                  label: requireContentSource
                    ? "Choose a required source"
                    : "No page-copy source",
                  disabled: requireContentSource,
                },
                ...sourceOptions,
              ]}
              required={requireContentSource}
              onValueChange={setSourceContentVersionId}
            />
          </div>
        ) : null}
      </div>

      <div className={styles.editorBlock}>
        <div className={styles.editorHeading}>
          <div>
            <h3>Answer options</h3>
            <p>Use two to eight distinct options. Option keys stay stable after saving.</p>
          </div>
          <button
            className={adminStyles.secondaryButton}
            type="button"
            disabled={options.length >= 8}
            onClick={addOption}
          >
            <PlusIcon aria-hidden width={18} height={18} />
            Add option
          </button>
        </div>
        <div className={styles.optionList}>
          {options.map((option, index) => (
            <div key={option.key} className={styles.optionRow}>
              <span className={styles.optionKey} aria-hidden>
                {option.key}
              </span>
              <label className={adminStyles.field}>
                <span className="visually-hidden">Option {option.key}</span>
                <input
                  value={option.label}
                  minLength={1}
                  maxLength={800}
                  required
                  onChange={(event) => updateOption(index, event.target.value)}
                />
              </label>
              <span className={styles.optionActions}>
                <button
                  className={adminStyles.iconButton}
                  type="button"
                  aria-label={`Delete option ${option.key}`}
                  disabled={options.length <= 2}
                  onClick={() => removeOption(index)}
                >
                  <TrashIcon aria-hidden width={18} height={18} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <section className={styles.privatePanel} data-private-answer-key>
        <header className={styles.privatePanelHead}>
          <LockClosedIcon aria-hidden width={21} height={21} />
          <div>
            <strong>Private answer key</strong>
            <span>
              Convex stores this key in a separate protected table. Learner queries never
              receive it.
            </span>
          </div>
        </header>
        <div className={styles.privatePanelBody}>
          <SelectField
            label="Correct option"
            value={correctChoiceKey || undefined}
            placeholder="Choose the correct option"
            options={correctOptions}
            required
            onValueChange={setCorrectChoiceKey}
          />
        </div>
      </section>

      <div className={adminStyles.formGridWide}>
        <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
          <span>Explanation shown after review</span>
          <textarea
            value={explanation}
            maxLength={4_000}
            onChange={(event) => setExplanation(event.target.value)}
          />
        </label>
        <label className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <span>Source note</span>
          <textarea
            value={sourceNote}
            minLength={3}
            maxLength={4_000}
            required
            onChange={(event) => setSourceNote(event.target.value)}
          />
        </label>
        <label className={`${adminStyles.field} ${adminStyles.spanSix}`}>
          <span>Rights note</span>
          <textarea
            value={rightsNote}
            minLength={3}
            maxLength={4_000}
            required
            onChange={(event) => setRightsNote(event.target.value)}
          />
        </label>
      </div>

      {validationError || error ? (
        <AdminError>{validationError || error}</AdminError>
      ) : null}

      <footer className={adminStyles.formFooter}>
        <p>
          Saving changes increments the version revision and makes earlier approvals stale.
        </p>
        <button className={adminStyles.primaryButton} type="submit" disabled={pending}>
          <CheckCircleIcon aria-hidden width={18} height={18} />
          {pending ? "Saving item…" : "Save item and private key"}
        </button>
      </footer>
    </form>
  );
}
