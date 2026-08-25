import { describe, expect, it } from "vitest";

import { themeDraftHasLocalChanges } from "@/components/admin/appearance-manager";
import { DEFAULT_PUBLIC_THEME_RECIPE } from "@content/theme-presets";

describe("admin theme draft state", () => {
  it("blocks publishing when the visible name or recipe differs from the saved draft", () => {
    const savedRecipe = structuredClone(DEFAULT_PUBLIC_THEME_RECIPE);

    expect(
      themeDraftHasLocalChanges(
        "Relay Cobalt",
        structuredClone(savedRecipe),
        "Relay Cobalt",
        savedRecipe,
      ),
    ).toBe(false);

    const editedRecipe = structuredClone(savedRecipe);
    editedRecipe.light.identity.h = 280;

    expect(
      themeDraftHasLocalChanges(
        "Relay Cobalt",
        editedRecipe,
        "Relay Cobalt",
        savedRecipe,
      ),
    ).toBe(true);
    expect(
      themeDraftHasLocalChanges(
        "Evening Relay",
        structuredClone(savedRecipe),
        "Relay Cobalt",
        savedRecipe,
      ),
    ).toBe(true);
  });
});
