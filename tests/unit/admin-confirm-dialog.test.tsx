import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  AdminConfirmationProvider,
  useAdminConfirm,
} from "@/components/admin/admin-confirm-dialog";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

function ConfirmationHarness({
  execute,
  onResult,
}: {
  execute: () => Promise<void>;
  onResult: (confirmed: boolean) => void;
}) {
  const confirm = useAdminConfirm();

  return (
    <button
      type="button"
      onClick={() => {
        void confirm(
          {
            title: "Archive the reviewed record?",
            description: "The record leaves active views but remains in the archive.",
            confirmLabel: "Archive record",
            cancelLabel: "Keep record",
          },
          execute,
        ).then(onResult);
      }}
    >
      Open confirmation
    </button>
  );
}

describe("shared admin confirmation", () => {
  it("cancels without executing and restores focus to the opener", async () => {
    const user = userEvent.setup();
    const execute = vi.fn(async () => undefined);
    const onResult = vi.fn();
    render(
      <AdminConfirmationProvider>
        <ConfirmationHarness execute={execute} onResult={onResult} />
      </AdminConfirmationProvider>,
    );

    const trigger = screen.getByRole("button", { name: "Open confirmation" });
    await user.click(trigger);
    expect(screen.getByRole("button", { name: "Keep record" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Keep record" }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(execute).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("holds the dialog pending and suppresses a rapid double submit", async () => {
    const user = userEvent.setup();
    let release: (() => void) | undefined;
    const execute = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const onResult = vi.fn();
    render(
      <AdminConfirmationProvider>
        <ConfirmationHarness execute={execute} onResult={onResult} />
      </AdminConfirmationProvider>,
    );

    const trigger = screen.getByRole("button", { name: "Open confirmation" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", {
      name: "Archive the reviewed record?",
    });
    const confirmButton = screen.getByRole("button", { name: "Archive record" });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(execute).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep record" })).toBeDisabled();
    expect(dialog).toHaveAttribute("open");
    expect(onResult).not.toHaveBeenCalled();

    release?.();
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent(dialog, new Event("close"));
    expect(onResult).toHaveBeenCalledOnce();
  });

  it("keeps a failed action recoverable and allows a successful retry", async () => {
    const user = userEvent.setup();
    const execute = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("The archive service is unavailable."))
      .mockResolvedValueOnce(undefined);
    const onResult = vi.fn();
    render(
      <AdminConfirmationProvider>
        <ConfirmationHarness execute={execute} onResult={onResult} />
      </AdminConfirmationProvider>,
    );

    const trigger = screen.getByRole("button", { name: "Open confirmation" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Archive record" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The archive service is unavailable.",
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Archive record" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Keep record" })).toBeEnabled();
    expect(onResult).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Archive record" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(execute).toHaveBeenCalledTimes(2);
    expect(trigger).toHaveFocus();
  });
});
