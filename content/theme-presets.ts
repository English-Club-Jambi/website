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

const PRESETS = {
  "relay-cobalt-v1": DEFAULT_PUBLIC_THEME_RECIPE,
} satisfies Record<string, ThemeRecipe>;

export type PublicThemePresetKey = keyof typeof PRESETS;

export function getPublicThemePreset(key: PublicThemePresetKey) {
  return normalizeThemeRecipe(PRESETS[key]);
}

export function isPublicThemePresetKey(
  value: string,
): value is PublicThemePresetKey {
  return Object.hasOwn(PRESETS, value);
}
