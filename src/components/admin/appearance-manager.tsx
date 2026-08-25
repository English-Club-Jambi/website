"use client";

import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState, type CSSProperties } from "react";

import {
  THEME_ANCHOR_KEYS,
  serializeOklch,
  validateThemeRecipe,
  type OklchColor,
  type ThemeAnchorKey,
  type ThemeModeName,
  type ThemeRecipe,
} from "@content/theme-contract";
import { api } from "../../../convex/_generated/api";

import { canPublish, useAdminSession } from "./admin-session";
import { useAdminConfirm } from "./admin-confirm-dialog";
import {
  AdminEmpty,
  AdminError,
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
  AdminStatus,
  formatAdminDate,
  humanizeError,
} from "./admin-ui";
import styles from "./admin-shell.module.css";

const anchorLabels: Record<ThemeAnchorKey, { name: string; description: string }> = {
  canvas: { name: "Canvas", description: "Page background" },
  surface: { name: "Surface", description: "Raised sections" },
  ink: { name: "Ink", description: "Primary text" },
  mutedInk: { name: "Muted ink", description: "Supporting text" },
  line: { name: "Line", description: "Rules and boundaries" },
  identity: { name: "Identity", description: "Club actions and links" },
  response: { name: "Response", description: "Prompts and calls to action" },
};

const channelSettings = {
  l: { label: "Lightness", min: 0, max: 1, step: 0.005 },
  c: { label: "Chroma", min: 0, max: 0.4, step: 0.005 },
  h: { label: "Hue", min: 0, max: 360, step: 1 },
} as const;

function copyRecipe(recipe: ThemeRecipe): ThemeRecipe {
  return {
    contractVersion: recipe.contractVersion,
    light: Object.fromEntries(
      THEME_ANCHOR_KEYS.map((key) => [key, { ...recipe.light[key] }]),
    ) as ThemeRecipe["light"],
    dark: Object.fromEntries(
      THEME_ANCHOR_KEYS.map((key) => [key, { ...recipe.dark[key] }]),
    ) as ThemeRecipe["dark"],
  };
}

export function themeDraftHasLocalChanges(
  name: string,
  recipe: ThemeRecipe,
  savedName: string,
  savedRecipe: ThemeRecipe,
) {
  return name !== savedName || JSON.stringify(recipe) !== JSON.stringify(savedRecipe);
}

function colourStyle(colour: OklchColor): CSSProperties {
  return { backgroundColor: `oklch(${colour.l} ${colour.c} ${colour.h})` };
}

function ThemePreview({ recipe, mode }: { recipe: ThemeRecipe; mode: ThemeModeName }) {
  const validation = useMemo(() => validateThemeRecipe(recipe), [recipe]);
  const snapshot = validation.snapshot?.[mode];

  if (!snapshot) {
    return (
      <div className={styles.themePreviewUnavailable}>
        <PaintBrushIcon aria-hidden width={28} height={28} />
        <p>Correct the colour values to restore the preview.</p>
      </div>
    );
  }

  const previewStyle = {
    "--preview-page": serializeOklch(snapshot.page),
    "--preview-surface": serializeOklch(snapshot.surface),
    "--preview-ink": serializeOklch(snapshot.ink),
    "--preview-muted": serializeOklch(snapshot.muted),
    "--preview-line": serializeOklch(snapshot.line),
    "--preview-primary": serializeOklch(snapshot.primary),
    "--preview-on-primary": serializeOklch(snapshot.onPrimary),
    "--preview-signal": serializeOklch(snapshot.signal),
    "--preview-signal-ink": serializeOklch(snapshot.signalInk),
    "--preview-focus": serializeOklch(snapshot.focus),
  } as CSSProperties;

  return (
    <div
      className={styles.themePreview}
      style={previewStyle}
      data-mode={mode}
      role="img"
      aria-label={`Public site preview in ${mode} mode`}
    >
      <div className={styles.themePreviewMasthead}>
        <strong>English Club</strong>
        <span>Speak / Exchange / Make / Stay</span>
      </div>
      <div className={styles.themePreviewBody}>
        <p>CONVERSATION RELAY</p>
        <h3>English grows in company.</h3>
        <span>Practise the sentence you have. The room can work with it.</span>
        <div>
          <b>Join the club</b>
          <u>Meet the club</u>
        </div>
      </div>
      <div className={styles.themePreviewSignal}>
        <strong>Next room</strong>
        <span>Listening circle / Thursday, 16.00</span>
      </div>
    </div>
  );
}

export function AppearanceManager() {
  const workspace = useQuery(api.adminThemes.getWorkspace, {});
  const versions = useQuery(api.adminThemes.listVersions, { limit: 20 });

  if (workspace === undefined || versions === undefined) {
    return (
      <>
        <AdminPageHeading title="Appearance" description="Manage the public site's structured colour system." />
        <AdminLoadingRows label="Loading appearance workspace" />
      </>
    );
  }

  if (!hasThemeDraft(workspace)) {
    return <EmptyThemeDraft />;
  }

  return (
    <AppearanceEditor
      key={workspace.draft._id}
      workspace={workspace}
      versions={versions}
    />
  );
}

type ThemeWorkspace = FunctionReturnType<typeof api.adminThemes.getWorkspace>;
type ThemeVersions = FunctionReturnType<typeof api.adminThemes.listVersions>;
type ThemeWorkspaceWithDraft = ThemeWorkspace & {
  draft: NonNullable<ThemeWorkspace["draft"]>;
};

function hasThemeDraft(workspace: ThemeWorkspace): workspace is ThemeWorkspaceWithDraft {
  return workspace.draft !== null;
}

function EmptyThemeDraft() {
  const ensureDraft = useMutation(api.adminThemes.ensureDraft);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function createDraft() {
    setPending(true);
    setError("");
    try {
      await ensureDraft({});
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AdminPageHeading title="Appearance" description="Manage the public site's structured colour system." />
      <AdminSection title="Theme draft" description="The first draft starts from the approved English Club palette.">
        {error ? <AdminError>{error}</AdminError> : null}
        <AdminEmpty title="No working theme yet" description="Create one shared draft before adjusting the light and dark palettes." />
        <div className={styles.emptyAction}>
          <button className={styles.primaryButton} type="button" disabled={pending} onClick={() => void createDraft()}>
            <PaintBrushIcon aria-hidden width={18} height={18} />
            {pending ? "Creating…" : "Create theme draft"}
          </button>
        </div>
      </AdminSection>
    </>
  );
}

function AppearanceEditor({
  workspace,
  versions,
}: {
  workspace: ThemeWorkspaceWithDraft;
  versions: ThemeVersions;
}) {
  const admin = useAdminSession();
  const confirm = useAdminConfirm();
  const saveDraft = useMutation(api.adminThemes.saveDraft);
  const publishDraft = useMutation(api.adminThemes.publishDraft);
  const rollback = useMutation(api.adminThemes.rollback);
  const [name, setName] = useState(workspace.draft.name);
  const [recipe, setRecipe] = useState<ThemeRecipe>(() => copyRecipe(workspace.draft.recipe));
  const [savedName, setSavedName] = useState(workspace.draft.name);
  const [savedRecipe, setSavedRecipe] = useState<ThemeRecipe>(() =>
    copyRecipe(workspace.draft.recipe),
  );
  const [draftRevision, setDraftRevision] = useState(workspace.draft.revision);
  const [publishedVersionId, setPublishedVersionId] = useState<ThemeVersions[number]["_id"] | null>(
    workspace.published?._id ?? null,
  );
  const [mode, setMode] = useState<ThemeModeName>("light");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"save" | "publish" | "rollback" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const validation = useMemo(() => validateThemeRecipe(recipe), [recipe]);
  const hasLocalChanges = themeDraftHasLocalChanges(
    name,
    recipe,
    savedName,
    savedRecipe,
  );

  function updateChannel(
    anchor: ThemeAnchorKey,
    channel: keyof OklchColor,
    value: number,
  ) {
    if (!Number.isFinite(value)) return;
    setRecipe((current) => {
      return {
        ...current,
        [mode]: {
          ...current[mode],
          [anchor]: { ...current[mode][anchor], [channel]: value },
        },
      };
    });
    setMessage("");
  }

  async function saveTheme() {
    setPending("save");
    setError("");
    setMessage("");
    try {
      const result = await saveDraft({
        draftId: workspace.draft._id,
        expectedRevision: draftRevision,
        name,
        source: "custom",
        presetKey: null,
        recipe,
      });
      if (!result.ok) {
        setError(`This draft changed in another session. The current revision is ${result.currentRevision}.`);
        return;
      }
      const normalizedName = name.trim().replace(/\s+/g, " ");
      const normalizedRecipe = copyRecipe(validation.normalized ?? recipe);
      setName(normalizedName);
      setRecipe(normalizedRecipe);
      setSavedName(normalizedName);
      setSavedRecipe(normalizedRecipe);
      setDraftRevision(result.revision);
      setMessage(result.validation.ok
        ? `Draft revision ${result.revision} saved.`
        : `Draft revision ${result.revision} saved with blocking checks.`);
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(null);
    }
  }

  async function publishTheme() {
    if (!validation.ok || hasLocalChanges) return;
    setPending("publish");
    setError("");
    setMessage("");
    try {
      const result = await publishDraft({
        draftId: workspace.draft._id,
        expectedRevision: draftRevision,
        expectedPublishedVersionId: publishedVersionId,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setDraftRevision((current) => current + 1);
      setPublishedVersionId(result.versionId);
      setNote("");
      setMessage(`Version ${result.version} is now live on the public site.`);
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(null);
    }
  }

  async function restoreVersion(versionId: ThemeVersions[number]["_id"], version: number) {
    if (!publishedVersionId) return;
    await confirm(
      {
        title: `Restore public theme version ${version}?`,
        description:
          "This replaces the current public colour recipe with the selected reviewed version.",
        confirmLabel: `Restore version ${version}`,
        cancelLabel: "Keep current theme",
      },
      async () => {
        setPending("rollback");
        setError("");
        setMessage("");
        try {
          const result = await rollback({
            targetVersionId: versionId,
            expectedPublishedVersionId: publishedVersionId,
            ...(note.trim() ? { note: note.trim() } : {}),
          });
          setPublishedVersionId(versionId);
          setNote("");
          setMessage(`Version ${result.version} restored.`);
        } catch (caught) {
          setError(humanizeError(caught));
          throw caught;
        } finally {
          setPending(null);
        }
      },
    );
  }

  const blocking = validation.blocking;
  const warnings = validation.warnings;

  return (
    <>
      <AdminPageHeading
        title="Appearance"
        description="Tune seven colour anchors. The public token system, contrast checks, and light and dark modes are derived from them."
        actions={
          <AdminStatus tone={validation?.ok ? "success" : "danger"}>
            {validation?.ok ? "Ready to publish" : `${blocking.length} blocking`}
          </AdminStatus>
        }
      />

      <AdminSection
        title="Theme workspace"
        description={`Draft revision ${draftRevision}. Public revision ${workspace.publicRevision}.`}
        actions={
          <div className={styles.segmentedControl} aria-label="Preview colour mode">
            {(["light", "dark"] as const).map((option) => (
              <button key={option} type="button" data-active={mode === option} aria-pressed={mode === option} onClick={() => setMode(option)}>
                {option}
              </button>
            ))}
          </div>
        }
      >
        <div className={styles.appearanceWorkspace}>
          <div className={styles.themeControls} id="theme-controls">
            <label className={styles.field}>
              <span>Theme name</span>
              <input value={name} minLength={3} maxLength={80} required onChange={(event) => setName(event.target.value)} />
            </label>

            <div className={styles.anchorList}>
              {THEME_ANCHOR_KEYS.map((anchor) => (
                <fieldset className={styles.anchorRow} key={`${mode}-${anchor}`}>
                  <legend>
                    <span aria-hidden className={styles.colourSwatch} style={colourStyle(recipe[mode][anchor])} />
                    <span>
                      <strong>{anchorLabels[anchor].name}</strong>
                      <small>{anchorLabels[anchor].description}</small>
                    </span>
                  </legend>
                  <div className={styles.channelGrid}>
                    {(Object.keys(channelSettings) as Array<keyof OklchColor>).map((channel) => {
                      const setting = channelSettings[channel];
                      return (
                        <label key={channel}>
                          <span>{setting.label}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={setting.min}
                            max={setting.max}
                            step={setting.step}
                            value={recipe[mode][anchor][channel]}
                            aria-label={`${anchorLabels[anchor].name} ${setting.label}`}
                            onChange={(event) => updateChannel(anchor, channel, event.target.valueAsNumber)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          <aside className={styles.themePreviewColumn}>
            <ThemePreview recipe={recipe} mode={mode} />
            <div className={styles.validationPanel}>
              <div>
                <strong>Accessibility checks</strong>
                <AdminStatus tone={validation?.ok ? "success" : "danger"}>
                  {validation?.ok ? "Pass" : "Blocked"}
                </AdminStatus>
              </div>
              {blocking.length === 0 && warnings.length === 0 ? (
                <p><CheckCircleIcon aria-hidden width={19} height={19} /> Contrast and colour separation checks pass.</p>
              ) : (
                <ul>
                  {[...blocking, ...warnings].map((issue, index) => (
                    <li key={`${issue.path}-${issue.code}-${index}`} data-severity={issue.severity}>
                      <strong>{issue.path}</strong>
                      <span>{issue.message}{issue.ratio ? ` Ratio ${issue.ratio.toFixed(2)}.` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>

        {error ? <AdminError>{error}</AdminError> : null}
        <footer className={styles.editorActionBar}>
          <p>{message || "Save the shared draft before publishing it."}</p>
          <div className={styles.buttonRow}>
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={pending !== null}
              onClick={() => {
                setName(savedName);
                setRecipe(copyRecipe(savedRecipe));
                setError("");
                setMessage("Local changes discarded.");
              }}
            >
              <ArrowPathIcon aria-hidden width={18} height={18} />
              Discard local changes
            </button>
            <button className={styles.primaryButton} type="button" disabled={pending !== null || name.trim().length < 3} onClick={() => void saveTheme()}>
              <CheckCircleIcon aria-hidden width={18} height={18} />
              {pending === "save" ? "Saving…" : "Save draft"}
            </button>
          </div>
        </footer>
      </AdminSection>

      <AdminSection title="Publish and restore" description="Publishing changes the public theme pointer. Earlier versions remain immutable.">
        <div className={styles.publishStrip}>
          <label className={styles.field}>
            <span>Release note (optional)</span>
            <input value={note} minLength={note ? 3 : undefined} maxLength={400} placeholder="What changed in this palette" onChange={(event) => setNote(event.target.value)} />
          </label>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={!canPublish(admin) || !validation?.ok || hasLocalChanges || pending !== null}
            title={
              !canPublish(admin)
                ? "Publisher or owner access is required"
                : hasLocalChanges
                  ? "Save local colour changes before publishing"
                  : undefined
            }
            onClick={() => void publishTheme()}
          >
            <CloudArrowUpIcon aria-hidden width={18} height={18} />
            {pending === "publish" ? "Publishing…" : "Publish saved draft"}
          </button>
        </div>
        {versions.length === 0 ? (
          <AdminEmpty title="No published versions yet" description="Publish the saved draft to create the first immutable public version." />
        ) : (
          <ul className={styles.versionList}>
            {versions.map((version) => {
            const isCurrent = publishedVersionId === version._id;
            return (
              <li key={version._id}>
                <div>
                  <strong>{version.name} / v{version.version}</strong>
                  <span>{formatAdminDate(version.publishedAt)}{version.note ? ` / ${version.note}` : ""}</span>
                </div>
                {isCurrent ? (
                  <AdminStatus tone="success">Live</AdminStatus>
                ) : (
                  <button
                    className={styles.textButton}
                    type="button"
                    disabled={!canPublish(admin) || pending !== null || !publishedVersionId}
                    onClick={() => void restoreVersion(version._id, version.version)}
                  >
                    <ArrowUturnLeftIcon aria-hidden width={17} height={17} />
                    Restore
                  </button>
                )}
              </li>
            );
            })}
          </ul>
        )}
      </AdminSection>
    </>
  );
}
