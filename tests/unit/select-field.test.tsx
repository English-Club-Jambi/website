import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  SelectField,
  type SelectFieldGroup,
} from "@/components/forms/select-field";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: () => false,
  });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: () => undefined,
  });
});

afterEach(cleanup);

const responsibilityGroups: ReadonlyArray<SelectFieldGroup> = [
  {
    label: "Divisions",
    options: [
      { value: "academic", label: "Academic" },
      { value: "art", label: "Art" },
    ],
  },
  {
    label: "Core positions",
    options: [
      { value: "president", label: "President" },
      { value: "treasury", label: "Treasury", disabled: true },
    ],
  },
];

describe("SelectField", () => {
  it("provides a visible label, grouped data, keyboard navigation, and typeahead", async () => {
    const user = userEvent.setup();

    render(
      <SelectField
        label="Position / division"
        defaultValue="academic"
        groups={responsibilityGroups}
      />,
    );

    const trigger = screen.getByRole("combobox", {
      name: "Position / division",
    });
    expect(trigger).toHaveTextContent("Academic");

    await user.click(trigger);
    expect(screen.getByRole("listbox")).toBeVisible();
    expect(screen.getByText("Divisions")).toBeVisible();
    expect(screen.getByText("Core positions")).toBeVisible();
    expect(screen.getByRole("option", { name: "Treasury" })).toHaveAttribute(
      "data-disabled",
    );

    await user.keyboard("art");
    await user.keyboard("{Enter}");

    expect(trigger).toHaveTextContent("Art");
    expect(trigger).toHaveFocus();
  });

  it("shows a custom placeholder and exposes a disabled trigger", () => {
    const { rerender } = render(
      <SelectField
        label="Joined year"
        placeholder="Choose a year"
        options={[{ value: "2026", label: "2026" }]}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Joined year" }),
    ).toHaveTextContent("Choose a year");

    rerender(
      <SelectField
        label="Joined year"
        placeholder="Choose a year"
        disabled
        options={[{ value: "2026", label: "2026" }]}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Joined year" })).toBeDisabled();
  });
});
