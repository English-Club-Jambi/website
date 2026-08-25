import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SingleChoiceItemEditor } from "@/components/admin/assessments/single-choice-item-editor";

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

describe("SingleChoiceItemEditor", () => {
  it("saves authored options, provenance, and a separately marked private key", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SingleChoiceItemEditor pending={false} onSave={onSave} />,
    );

    fireEvent.change(screen.getByLabelText("Item key"), {
      target: { value: "reading-main-01" },
    });
    fireEvent.change(screen.getByLabelText("Question prompt"), {
      target: { value: "Which statement matches the passage?" },
    });
    fireEvent.change(screen.getByLabelText("Option A"), {
      target: { value: "The first statement" },
    });
    fireEvent.change(screen.getByLabelText("Option B"), {
      target: { value: "The second statement" },
    });
    fireEvent.change(screen.getByLabelText("Source note"), {
      target: { value: "Original club-authored passage" },
    });
    fireEvent.change(screen.getByLabelText("Rights note"), {
      target: { value: "Authored for this assessment" },
    });

    await user.click(screen.getByRole("combobox", { name: "Correct option" }));
    await user.click(
      screen.getByRole("option", { name: "A. The first statement" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Save item and private key" }),
    );

    expect(screen.getByText("Private answer key")).toBeVisible();
    expect(document.querySelector("[data-private-answer-key]")).not.toBeNull();
    expect(onSave).toHaveBeenCalledOnce();
    const saved = onSave.mock.calls[0]?.[0];
    expect(saved.correctChoiceKey).toBe("A");
    expect(saved.options).toEqual([
      { key: "A", label: "The first statement" },
      { key: "B", label: "The second statement" },
    ]);
    expect(JSON.parse(saved.provenanceJson)).toEqual({
      sourceNote: "Original club-authored passage",
      rightsNote: "Authored for this assessment",
    });
  });
});
