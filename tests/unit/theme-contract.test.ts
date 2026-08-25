import { wcagContrast } from "culori";
import { describe, expect, it } from "vitest";

import {
  PUBLIC_THEME_TOKEN_KEYS,
  ThemeContractError,
  deriveThemeSnapshot,
  normalizeThemeRecipe,
  serializePublicThemeCss,
  validateThemeRecipe,
  type OklchColor,
} from "../../content/theme-contract";
import {
  DEFAULT_PUBLIC_THEME_RECIPE,
  PUBLIC_THEME_PRESET_CATALOG,
  getPublicThemePreset,
} from "../../content/theme-presets";

function culoriColor(color: OklchColor) {
  return { mode: "oklch" as const, ...color };
}

describe("public theme contract", () => {
  it("derives a complete, publishable paired theme from the default recipe", () => {
    const result = validateThemeRecipe(DEFAULT_PUBLIC_THEME_RECIPE);

    expect(result.ok).toBe(true);
    expect(result.blocking).toEqual([]);
    expect(result.snapshot?.contractVersion).toBe(1);
    expect(Object.keys(result.snapshot?.light ?? {})).toEqual(
      PUBLIC_THEME_TOKEN_KEYS,
    );
    expect(Object.keys(result.snapshot?.dark ?? {})).toEqual(
      PUBLIC_THEME_TOKEN_KEYS,
    );
  });

  it.each(PUBLIC_THEME_PRESET_CATALOG)(
    "keeps $name within the publishable theme contract",
    ({ recipe }) => {
      const result = validateThemeRecipe(recipe);

      expect(result.ok).toBe(true);
      expect(result.blocking).toEqual([]);
    },
  );

  it("normalizes hue and maps high-chroma anchors into the sRGB gamut", () => {
    const input = structuredClone(DEFAULT_PUBLIC_THEME_RECIPE);
    input.light.identity = { l: 0.6, c: 0.4, h: -30 };

    const normalized = normalizeThemeRecipe(input);

    expect(normalized.light.identity.h).toBeGreaterThanOrEqual(0);
    expect(normalized.light.identity.h).toBeLessThan(360);
    expect(normalized.light.identity.c).toBeLessThan(0.4);
  });

  it.each([
    ["NaN", Number.NaN],
    ["positive infinity", Number.POSITIVE_INFINITY],
    ["negative lightness", -0.01],
    ["excessive lightness", 1.01],
  ])("rejects %s before deriving browser CSS", (_label, l) => {
    const input = structuredClone(DEFAULT_PUBLIC_THEME_RECIPE);
    input.light.canvas.l = l;

    expect(() => normalizeThemeRecipe(input)).toThrow(ThemeContractError);
    expect(validateThemeRecipe(input)).toMatchObject({
      ok: false,
      blocking: [
        expect.objectContaining({
          code: "invalid-value",
          path: "light.canvas.l",
        }),
      ],
    });
  });

  it("rejects unsupported anchors and CSS-shaped values", () => {
    const input = structuredClone(DEFAULT_PUBLIC_THEME_RECIPE) as unknown as {
      contractVersion: number;
      light: Record<string, unknown>;
      dark: Record<string, unknown>;
    };
    input.light.canvas = "oklch(1 0 0);background:url(example)";
    input.light["--injected-token"] = { l: 0, c: 0, h: 0 };

    const unknownAnchorResult = validateThemeRecipe(input);

    expect(unknownAnchorResult.ok).toBe(false);
    expect(
      unknownAnchorResult.blocking.map((issue) => issue.path),
    ).toContain("light");

    delete input.light["--injected-token"];
    const cssValueResult = validateThemeRecipe(input);

    expect(cssValueResult.ok).toBe(false);
    expect(cssValueResult.blocking.map((issue) => issue.path)).toContain(
      "light.canvas",
    );
  });

  it("blocks a palette whose body text or structural line is unreadable", () => {
    const input = structuredClone(DEFAULT_PUBLIC_THEME_RECIPE);
    input.light.mutedInk = { l: 0.9, c: 0.006, h: 95 };
    input.light.line = { l: 0.9, c: 0.006, h: 95 };

    const result = validateThemeRecipe(input);

    expect(result.ok).toBe(false);
    expect(result.blocking).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "light.mutedInk", minimum: 4.5 }),
        expect.objectContaining({ path: "light.line", minimum: 3 }),
      ]),
    );
  });

  it("derives readable foregrounds instead of trusting accent colours as text", () => {
    const input = structuredClone(DEFAULT_PUBLIC_THEME_RECIPE);
    input.light.identity = { l: 0.88, c: 0.08, h: 272 };
    input.light.response = { l: 0.86, c: 0.1, h: 45 };

    const snapshot = deriveThemeSnapshot(input).light;

    expect(
      wcagContrast(
        culoriColor(snapshot.primaryStrong),
        culoriColor(snapshot.page),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      wcagContrast(
        culoriColor(snapshot.onPrimary),
        culoriColor(snapshot.primary),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      wcagContrast(
        culoriColor(snapshot.signalInk),
        culoriColor(snapshot.signal),
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("serializes only the fixed public token allowlist", () => {
    const css = serializePublicThemeCss(
      deriveThemeSnapshot(DEFAULT_PUBLIC_THEME_RECIPE),
    );

    for (const token of [
      "--page",
      "--primary-strong",
      "--signal-ink",
      "--selection",
    ]) {
      expect(css).toContain(token);
    }
    expect(css).not.toContain("url(");
    expect(css).not.toContain("<");
    expect(css.match(/--[a-z-]+:/g)).toHaveLength(
      PUBLIC_THEME_TOKEN_KEYS.length * 2,
    );
  });

  it("returns a detached preset copy", () => {
    const first = getPublicThemePreset("relay-cobalt-v1");
    first.light.canvas.l = 0;

    const second = getPublicThemePreset("relay-cobalt-v1");

    expect(second.light.canvas.l).toBe(DEFAULT_PUBLIC_THEME_RECIPE.light.canvas.l);
  });
});
