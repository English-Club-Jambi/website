import {
  deriveThemeSnapshot,
  normalizeThemeRecipe,
  type ThemeRecipe,
} from "./theme-contract";

export const DEFAULT_PUBLIC_THEME_RECIPE: ThemeRecipe = {
  contractVersion: 1,
  light: {
    canvas: { l: 0.985, c: 0.006, h: 95 },
    surface: { l: 1, c: 0, h: 0 },
    ink: { l: 0.18, c: 0.025, h: 265 },
    mutedInk: { l: 0.47, c: 0.025, h: 265 },
    line: { l: 0.65, c: 0.025, h: 265 },
    identity: { l: 0.49, c: 0.22, h: 272 },
    response: { l: 0.67, c: 0.19, h: 45 },
  },
  dark: {
    canvas: { l: 0.15, c: 0.018, h: 265 },
    surface: { l: 0.2, c: 0.022, h: 265 },
    ink: { l: 0.96, c: 0.008, h: 95 },
    mutedInk: { l: 0.73, c: 0.02, h: 265 },
    line: { l: 0.5, c: 0.025, h: 265 },
    identity: { l: 0.72, c: 0.16, h: 272 },
    response: { l: 0.76, c: 0.15, h: 55 },
  },
};

export const DEFAULT_PUBLIC_THEME_SNAPSHOT = deriveThemeSnapshot(
  DEFAULT_PUBLIC_THEME_RECIPE,
);

const FIELD_NOTES_RECIPE: ThemeRecipe = {
  contractVersion: 1,
  light: {
    canvas: { l: 0.975, c: 0.016, h: 96 },
    surface: { l: 0.995, c: 0.006, h: 96 },
    ink: { l: 0.18, c: 0.03, h: 150 },
    mutedInk: { l: 0.45, c: 0.03, h: 150 },
    line: { l: 0.64, c: 0.035, h: 150 },
    identity: { l: 0.43, c: 0.14, h: 148 },
    response: { l: 0.64, c: 0.19, h: 39 },
  },
  dark: {
    canvas: { l: 0.145, c: 0.022, h: 150 },
    surface: { l: 0.205, c: 0.026, h: 150 },
    ink: { l: 0.96, c: 0.012, h: 96 },
    mutedInk: { l: 0.74, c: 0.025, h: 145 },
    line: { l: 0.5, c: 0.035, h: 148 },
    identity: { l: 0.73, c: 0.13, h: 148 },
    response: { l: 0.76, c: 0.15, h: 48 },
  },
};

const AFTER_CLASS_RECIPE: ThemeRecipe = {
  contractVersion: 1,
  light: {
    canvas: { l: 0.982, c: 0.012, h: 310 },
    surface: { l: 0.998, c: 0.004, h: 310 },
    ink: { l: 0.17, c: 0.035, h: 305 },
    mutedInk: { l: 0.45, c: 0.035, h: 305 },
    line: { l: 0.65, c: 0.04, h: 305 },
    identity: { l: 0.51, c: 0.2, h: 305 },
    response: { l: 0.75, c: 0.17, h: 120 },
  },
  dark: {
    canvas: { l: 0.14, c: 0.028, h: 305 },
    surface: { l: 0.2, c: 0.035, h: 305 },
    ink: { l: 0.965, c: 0.01, h: 110 },
    mutedInk: { l: 0.74, c: 0.03, h: 305 },
    line: { l: 0.51, c: 0.045, h: 305 },
    identity: { l: 0.72, c: 0.16, h: 305 },
    response: { l: 0.82, c: 0.15, h: 120 },
  },
};

const TIDE_ROOM_RECIPE: ThemeRecipe = {
  contractVersion: 1,
  light: {
    canvas: { l: 0.98, c: 0.015, h: 205 },
    surface: { l: 0.997, c: 0.006, h: 205 },
    ink: { l: 0.17, c: 0.035, h: 235 },
    mutedInk: { l: 0.45, c: 0.035, h: 230 },
    line: { l: 0.65, c: 0.04, h: 225 },
    identity: { l: 0.46, c: 0.16, h: 235 },
    response: { l: 0.68, c: 0.18, h: 25 },
  },
  dark: {
    canvas: { l: 0.14, c: 0.03, h: 235 },
    surface: { l: 0.2, c: 0.035, h: 230 },
    ink: { l: 0.96, c: 0.012, h: 195 },
    mutedInk: { l: 0.74, c: 0.03, h: 215 },
    line: { l: 0.5, c: 0.04, h: 225 },
    identity: { l: 0.74, c: 0.13, h: 225 },
    response: { l: 0.76, c: 0.15, h: 30 },
  },
};

export const PUBLIC_THEME_PRESET_CATALOG = [
  {
    key: "relay-cobalt-v1",
    name: "Relay Cobalt",
    description: "Cobalt conversation cues with a warm orange response signal.",
    recipe: DEFAULT_PUBLIC_THEME_RECIPE,
  },
  {
    key: "field-notes-v1",
    name: "Field Notes",
    description: "Leaf green on warm paper with a vermilion response signal.",
    recipe: FIELD_NOTES_RECIPE,
  },
  {
    key: "after-class-v1",
    name: "After Class",
    description: "Deep plum structure with an electric chartreuse response signal.",
    recipe: AFTER_CLASS_RECIPE,
  },
  {
    key: "tide-room-v1",
    name: "Tide Room",
    description: "Marine blue, pale aqua, and a coral response signal.",
    recipe: TIDE_ROOM_RECIPE,
  },
] as const satisfies ReadonlyArray<{
  key: string;
  name: string;
  description: string;
  recipe: ThemeRecipe;
}>;

const PRESETS = Object.fromEntries(
  PUBLIC_THEME_PRESET_CATALOG.map((preset) => [preset.key, preset.recipe]),
) as Record<(typeof PUBLIC_THEME_PRESET_CATALOG)[number]["key"], ThemeRecipe>;

export type PublicThemePresetKey = keyof typeof PRESETS;

export function getPublicThemePreset(key: PublicThemePresetKey) {
  return normalizeThemeRecipe(PRESETS[key]);
}

export function isPublicThemePresetKey(
  value: string,
): value is PublicThemePresetKey {
  return Object.hasOwn(PRESETS, value);
}
