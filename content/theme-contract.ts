import {
  converter,
  differenceEuclidean,
  toGamut,
  wcagContrast,
} from "culori";

export const THEME_CONTRACT_VERSION = 1 as const;

export const THEME_ANCHOR_KEYS = [
  "canvas",
  "surface",
  "ink",
  "mutedInk",
  "line",
  "identity",
  "response",
] as const;

export const PUBLIC_THEME_TOKEN_KEYS = [
  "page",
  "surface",
  "ink",
  "muted",
  "line",
  "primary",
  "primaryStrong",
  "primaryWash",
  "onPrimary",
  "signal",
  "signalInk",
  "danger",
  "success",
  "focus",
  "focusOffset",
  "selection",
] as const;

export type ThemeModeName = "light" | "dark";
export type ThemeAnchorKey = (typeof THEME_ANCHOR_KEYS)[number];
export type PublicThemeTokenKey = (typeof PUBLIC_THEME_TOKEN_KEYS)[number];

export type OklchColor = {
  l: number;
  c: number;
  h: number;
};

export type ThemeRecipeMode = Record<ThemeAnchorKey, OklchColor>;

export type ThemeRecipe = {
  contractVersion: typeof THEME_CONTRACT_VERSION;
  light: ThemeRecipeMode;
  dark: ThemeRecipeMode;
};

export type PublicThemeMode = Record<PublicThemeTokenKey, OklchColor>;

export type PublicThemeSnapshot = {
  contractVersion: typeof THEME_CONTRACT_VERSION;
  light: PublicThemeMode;
  dark: PublicThemeMode;
};

export type ThemeInputIssue = {
  path: string;
  message: string;
};

export type ThemeValidationIssue = {
  severity: "blocking" | "warning";
  code:
    | "invalid-value"
    | "contrast"
    | "surface-separation"
    | "accent-separation";
  mode?: ThemeModeName;
  path: string;
  message: string;
  ratio?: number;
  minimum?: number;
};

export type ThemeValidationResult = {
  ok: boolean;
  blocking: ThemeValidationIssue[];
  warnings: ThemeValidationIssue[];
  normalized?: ThemeRecipe;
  snapshot?: PublicThemeSnapshot;
};

export class ThemeContractError extends Error {
  readonly issues: ThemeInputIssue[];

  constructor(issues: ThemeInputIssue[]) {
    super(issues[0]?.message ?? "Theme recipe is invalid.");
    this.name = "ThemeContractError";
    this.issues = issues;
  }
}

const toSrgbGamut = toGamut("rgb", "oklch");
const toOklch = converter("oklch");
const colorDistance = differenceEuclidean("oklab");

const LOCKED_TOKENS: Record<
  ThemeModeName,
  Pick<PublicThemeMode, "danger" | "success">
> = {
  light: {
    danger: { l: 0.52, c: 0.19, h: 28 },
    success: { l: 0.45, c: 0.13, h: 150 },
  },
  dark: {
    danger: { l: 0.72, c: 0.15, h: 30 },
    success: { l: 0.72, c: 0.12, h: 150 },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roundChannel(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function normalizeHue(value: number) {
  const normalized = ((value % 360) + 360) % 360;
  return roundChannel(normalized);
}

function colorForCulori(color: OklchColor) {
  return {
    mode: "oklch" as const,
    l: color.l,
    c: color.c,
    h: color.h,
  };
}

function mapToSrgb(color: OklchColor): OklchColor {
  const mapped = toOklch(toSrgbGamut(colorForCulori(color)));

  if (mapped === undefined) {
    throw new ThemeContractError([
      { path: "color", message: "The colour could not be mapped to sRGB." },
    ]);
  }

  return {
    l: roundChannel(mapped.l),
    c: roundChannel(Math.max(0, mapped.c ?? 0)),
    h: normalizeHue(mapped.h ?? color.h),
  };
}

function normalizeColor(value: unknown, path: string): OklchColor {
  if (!isRecord(value)) {
    throw new ThemeContractError([
      { path, message: `${path} must be an OKLCH colour object.` },
    ]);
  }

  const unknownKeys = Object.keys(value).filter(
    (key) => key !== "l" && key !== "c" && key !== "h",
  );
  const l = value.l;
  const c = value.c;
  const h = value.h;
  const issues: ThemeInputIssue[] = [];

  if (unknownKeys.length > 0) {
    issues.push({
      path,
      message: `${path} contains unsupported colour fields.`,
    });
  }
  if (typeof l !== "number" || !Number.isFinite(l) || l < 0 || l > 1) {
    issues.push({
      path: `${path}.l`,
      message: `${path}.l must be a finite number between 0 and 1.`,
    });
  }
  if (typeof c !== "number" || !Number.isFinite(c) || c < 0 || c > 0.4) {
    issues.push({
      path: `${path}.c`,
      message: `${path}.c must be a finite number between 0 and 0.4.`,
    });
  }
  if (typeof h !== "number" || !Number.isFinite(h)) {
    issues.push({
      path: `${path}.h`,
      message: `${path}.h must be a finite angle.`,
    });
  }

  if (issues.length > 0) {
    throw new ThemeContractError(issues);
  }

  return mapToSrgb({
    l: l as number,
    c: c as number,
    h: normalizeHue(h as number),
  });
}

function normalizeMode(value: unknown, mode: ThemeModeName): ThemeRecipeMode {
  if (!isRecord(value)) {
    throw new ThemeContractError([
      { path: mode, message: `${mode} must contain every theme anchor.` },
    ]);
  }

  const allowedKeys = new Set<string>(THEME_ANCHOR_KEYS);
  const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new ThemeContractError([
      {
        path: mode,
        message: `${mode} contains unsupported theme anchors.`,
      },
    ]);
  }

  const result = {} as ThemeRecipeMode;
  const issues: ThemeInputIssue[] = [];

  for (const key of THEME_ANCHOR_KEYS) {
    try {
      result[key] = normalizeColor(value[key], `${mode}.${key}`);
    } catch (error) {
      if (error instanceof ThemeContractError) {
        issues.push(...error.issues);
      } else {
        throw error;
      }
    }
  }

  if (issues.length > 0) {
    throw new ThemeContractError(issues);
  }

  return result;
}

export function normalizeThemeRecipe(input: unknown): ThemeRecipe {
  if (!isRecord(input)) {
    throw new ThemeContractError([
      { path: "recipe", message: "Theme recipe must be an object." },
    ]);
  }

  const allowedKeys = new Set(["contractVersion", "light", "dark"]);
  const unknownKeys = Object.keys(input).filter((key) => !allowedKeys.has(key));
  const issues: ThemeInputIssue[] = [];

  if (unknownKeys.length > 0) {
    issues.push({
      path: "recipe",
      message: "Theme recipe contains unsupported fields.",
    });
  }
  if (input.contractVersion !== THEME_CONTRACT_VERSION) {
    issues.push({
      path: "contractVersion",
      message: `Theme contract version must be ${THEME_CONTRACT_VERSION}.`,
    });
  }

  let light: ThemeRecipeMode | undefined;
  let dark: ThemeRecipeMode | undefined;

  try {
    light = normalizeMode(input.light, "light");
  } catch (error) {
    if (error instanceof ThemeContractError) {
      issues.push(...error.issues);
    } else {
      throw error;
    }
  }

  try {
    dark = normalizeMode(input.dark, "dark");
  } catch (error) {
    if (error instanceof ThemeContractError) {
      issues.push(...error.issues);
    } else {
      throw error;
    }
  }

  if (issues.length > 0 || light === undefined || dark === undefined) {
    throw new ThemeContractError(issues);
  }

  return {
    contractVersion: THEME_CONTRACT_VERSION,
    light,
    dark,
  };
}

function mixHue(a: number, b: number, amount: number) {
  const distance = ((b - a + 540) % 360) - 180;
  return normalizeHue(a + distance * amount);
}

function mixColor(a: OklchColor, b: OklchColor, amount: number) {
  const bounded = Math.max(0, Math.min(1, amount));
  return mapToSrgb({
    l: a.l + (b.l - a.l) * bounded,
    c: a.c + (b.c - a.c) * bounded,
    h: mixHue(a.h, b.h, bounded),
  });
}

function contrast(a: OklchColor, b: OklchColor) {
  return wcagContrast(colorForCulori(a), colorForCulori(b));
}

function chooseBestForeground(
  backgrounds: OklchColor[],
  candidates: OklchColor[],
) {
  return candidates.reduce((best, candidate) => {
    const score = Math.min(
      ...backgrounds.map((background) => contrast(candidate, background)),
    );
    const bestScore = Math.min(
      ...backgrounds.map((background) => contrast(best, background)),
    );
    return score > bestScore ? candidate : best;
  });
}

function deriveReadableIdentity(mode: ThemeRecipeMode) {
  const backgrounds = [mode.canvas, mode.surface];
  const candidates = [mode.identity];

  for (let step = 1; step <= 20; step += 1) {
    candidates.push(mixColor(mode.identity, mode.ink, step / 20));
  }

  return chooseBestForeground(backgrounds, candidates);
}

function deriveMode(modeName: ThemeModeName, recipe: ThemeRecipeMode) {
  const primaryStrong = deriveReadableIdentity(recipe);
  const onPrimary = chooseBestForeground(
    [recipe.identity],
    [recipe.ink, recipe.canvas, recipe.surface],
  );
  const signalInk = chooseBestForeground(
    [recipe.response],
    [recipe.ink, recipe.canvas, recipe.surface],
  );
  const focus = chooseBestForeground(
    [recipe.canvas, recipe.surface],
    [recipe.identity, recipe.response, primaryStrong, recipe.ink],
  );
  const focusOffset = chooseBestForeground(
    [recipe.identity, recipe.response],
    [recipe.canvas, recipe.surface, recipe.ink],
  );

  return {
    page: recipe.canvas,
    surface: recipe.surface,
    ink: recipe.ink,
    muted: recipe.mutedInk,
    line: recipe.line,
    primary: recipe.identity,
    primaryStrong,
    primaryWash: mixColor(
      recipe.canvas,
      recipe.identity,
      modeName === "light" ? 0.14 : 0.2,
    ),
    onPrimary,
    signal: recipe.response,
    signalInk,
    ...LOCKED_TOKENS[modeName],
    focus,
    focusOffset,
    selection: mixColor(
      recipe.canvas,
      recipe.response,
      modeName === "light" ? 0.38 : 0.46,
    ),
  } satisfies PublicThemeMode;
}

export function deriveThemeSnapshot(recipe: ThemeRecipe): PublicThemeSnapshot {
  const normalized = normalizeThemeRecipe(recipe);

  return {
    contractVersion: THEME_CONTRACT_VERSION,
    light: deriveMode("light", normalized.light),
    dark: deriveMode("dark", normalized.dark),
  };
}

function addContrastIssue(
  issues: ThemeValidationIssue[],
  mode: ThemeModeName,
  path: string,
  foreground: OklchColor,
  background: OklchColor,
  backgroundLabel: string,
  minimum: number,
) {
  const ratio = contrast(foreground, background);

  if (ratio + Number.EPSILON < minimum) {
    issues.push({
      severity: "blocking",
      code: "contrast",
      mode,
      path: `${mode}.${path}`,
      message: `${path} needs more contrast against ${backgroundLabel}.`,
      ratio: roundChannel(ratio),
      minimum,
    });
  }
}

function validateMode(
  modeName: ThemeModeName,
  recipe: ThemeRecipeMode,
  snapshot: PublicThemeMode,
) {
  const blocking: ThemeValidationIssue[] = [];
  const warnings: ThemeValidationIssue[] = [];

  for (const background of [
    ["page", snapshot.page],
    ["surface", snapshot.surface],
  ] as const) {
    addContrastIssue(
      blocking,
      modeName,
      "ink",
      snapshot.ink,
      background[1],
      background[0],
      4.5,
    );
    addContrastIssue(
      blocking,
      modeName,
      "mutedInk",
      snapshot.muted,
      background[1],
      background[0],
      4.5,
    );
    addContrastIssue(
      blocking,
      modeName,
      "identity",
      snapshot.primaryStrong,
      background[1],
      background[0],
      4.5,
    );
    addContrastIssue(
      blocking,
      modeName,
      "line",
      snapshot.line,
      background[1],
      background[0],
      3,
    );
    addContrastIssue(
      blocking,
      modeName,
      "focus",
      snapshot.focus,
      background[1],
      background[0],
      3,
    );
  }

  addContrastIssue(
    blocking,
    modeName,
    "identity foreground",
    snapshot.onPrimary,
    snapshot.primary,
    "identity",
    4.5,
  );
  addContrastIssue(
    blocking,
    modeName,
    "response foreground",
    snapshot.signalInk,
    snapshot.signal,
    "response",
    4.5,
  );
  addContrastIssue(
    blocking,
    modeName,
    "focus offset",
    snapshot.focusOffset,
    snapshot.primary,
    "identity",
    3,
  );
  addContrastIssue(
    blocking,
    modeName,
    "focus offset",
    snapshot.focusOffset,
    snapshot.signal,
    "response",
    3,
  );

  const surfaceRatio = contrast(snapshot.surface, snapshot.page);
  if (surfaceRatio < 1.08) {
    warnings.push({
      severity: "warning",
      code: "surface-separation",
      mode: modeName,
      path: `${modeName}.surface`,
      message: "Surface and page colours may be hard to distinguish.",
      ratio: roundChannel(surfaceRatio),
      minimum: 1.08,
    });
  }

  const accentDistance = colorDistance(
    colorForCulori(recipe.identity),
    colorForCulori(recipe.response),
  );
  if (accentDistance < 0.08) {
    warnings.push({
      severity: "warning",
      code: "accent-separation",
      mode: modeName,
      path: `${modeName}.response`,
      message: "Identity and response colours may be hard to tell apart.",
    });
  }

  return { blocking, warnings };
}

export function validateThemeRecipe(input: unknown): ThemeValidationResult {
  let normalized: ThemeRecipe;

  try {
    normalized = normalizeThemeRecipe(input);
  } catch (error) {
    if (!(error instanceof ThemeContractError)) {
      throw error;
    }

    const blocking = error.issues.map(
      (issue): ThemeValidationIssue => ({
        severity: "blocking",
        code: "invalid-value",
        path: issue.path,
        message: issue.message,
      }),
    );

    return { ok: false, blocking, warnings: [] };
  }

  const snapshot = deriveThemeSnapshot(normalized);
  const light = validateMode("light", normalized.light, snapshot.light);
  const dark = validateMode("dark", normalized.dark, snapshot.dark);
  const blocking = [...light.blocking, ...dark.blocking];
  const warnings = [...light.warnings, ...dark.warnings];

  return {
    ok: blocking.length === 0,
    blocking,
    warnings,
    normalized,
    snapshot,
  };
}

const CSS_TOKEN_NAMES: Record<PublicThemeTokenKey, string> = {
  page: "--page",
  surface: "--surface",
  ink: "--ink",
  muted: "--muted",
  line: "--line",
  primary: "--primary",
  primaryStrong: "--primary-strong",
  primaryWash: "--primary-wash",
  onPrimary: "--on-primary",
  signal: "--signal",
  signalInk: "--signal-ink",
  danger: "--danger",
  success: "--success",
  focus: "--focus",
  focusOffset: "--focus-offset",
  selection: "--selection",
};

export function serializeOklch(color: OklchColor) {
  const normalized = normalizeColor(color, "color");
  return `oklch(${normalized.l} ${normalized.c} ${normalized.h})`;
}

function serializeMode(mode: PublicThemeMode) {
  return PUBLIC_THEME_TOKEN_KEYS.map(
    (key) => `${CSS_TOKEN_NAMES[key]}:${serializeOklch(mode[key])}`,
  ).join(";");
}

export function serializePublicThemeCss(snapshot: PublicThemeSnapshot) {
  if (snapshot.contractVersion !== THEME_CONTRACT_VERSION) {
    throw new ThemeContractError([
      {
        path: "contractVersion",
        message: `Theme contract version must be ${THEME_CONTRACT_VERSION}.`,
      },
    ]);
  }

  return [
    `html[data-site-theme="published"]{${serializeMode(snapshot.light)}}`,
    `html[data-site-theme="published"][data-theme="dark"]{${serializeMode(snapshot.dark)}}`,
  ].join("");
}
