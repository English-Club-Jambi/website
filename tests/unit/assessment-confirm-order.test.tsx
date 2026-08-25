import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import {
  assessmentOrderControls,
  assessmentRevisionConflict,
} from "@/components/admin/assessments/assessment-order";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(cleanup);

describe("assessment destructive controls", () => {
  it("keeps reorder targets inside their server bounds", () => {
    expect(assessmentOrderControls(0, 3)).toEqual({
      canMoveUp: false,
      canMoveDown: true,
    });
    expect(assessmentOrderControls(2, 3)).toEqual({
      canMoveUp: true,
      canMoveDown: false,
    });
    expect(assessmentRevisionConflict(12)).toContain("Revision changed to 12");
  });

  it("requires an explicit rounded-dialog confirmation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <AdminConfirmDialog
        open
        title="Remove Reading detail?"
        description="Only an empty section can be removed."
        confirmLabel="Remove empty section"
        pending={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Remove Reading detail?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Remove empty section" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("returns focus to the control that opened a cancelled dialog", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Remove section</button>
          <AdminConfirmDialog
            open={open}
            title="Remove section?"
            description="The published version remains unchanged."
            confirmLabel="Remove empty section"
            pending={false}
            onCancel={() => setOpen(false)}
            onConfirm={() => undefined}
          />
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Remove section" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(trigger).toHaveFocus();
  });
});
