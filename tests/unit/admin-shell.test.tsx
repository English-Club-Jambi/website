import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AdminShellView } from "@/components/admin/admin-session";

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
});

afterEach(cleanup);

const owner = {
  _id: "admin_owner" as never,
  tokenIdentifier: "https://identity.example|english-club-owner",
  displayName: "Site Steward",
  email: "steward@example.org",
  role: "owner" as const,
  status: "active" as const,
  createdAt: 1,
  updatedAt: 1,
};

describe("AdminShellView", () => {
  it("keeps every work area in the reusable admin navigation", () => {
    render(
      <AdminShellView admin={owner} pathname="/admin/journal" onSignOut={vi.fn()}>
        <h1>Journal workspace</h1>
      </AdminShellView>,
    );

    for (const label of [
      "Overview",
      "Pages",
      "Journal",
      "Programs",
      "Practice Builder",
      "Members",
      "Media",
      "Appearance",
      "Audit log",
    ]) {
      expect(screen.getAllByRole("link", { name: new RegExp(`^${label}`) }).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByRole("link", { name: /^Journal/ })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Site Steward")).toBeVisible();
    expect(screen.getByText("Owner")).toBeVisible();
  });

  it("opens and closes the touch navigation without leaving body scroll locked", async () => {
    const user = userEvent.setup();
    render(
      <AdminShellView admin={owner} pathname="/admin" onSignOut={vi.fn()}>
        <h1>Overview</h1>
      </AdminShellView>,
    );

    const trigger = screen.getByRole("button", { name: "Open admin navigation" });
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close admin navigation" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
  });
});
