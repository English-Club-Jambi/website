import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  results: [] as Array<Record<string, unknown>>,
  query: vi.fn(),
  updateStatus: vi.fn(),
  loadMore: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: () => mocks.updateStatus,
  usePaginatedQuery: (_reference: unknown, args: unknown) => {
    mocks.query(args);
    return {
      results: mocks.results,
      status: "Exhausted",
      loadMore: mocks.loadMore,
    };
  },
}));

import { ContactManager } from "@/components/admin/contact-manager";
import { AdminConfirmationProvider } from "@/components/admin/admin-confirm-dialog";

function renderManager() {
  return render(
    <AdminConfirmationProvider>
      <ContactManager />
    </AdminConfirmationProvider>,
  );
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
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
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  });
});

const joinMessage = {
  _id: "contact-join",
  name: "Alya Rahman",
  email: "alya@example.com",
  intent: "join",
  message: "I would like to join the club and take part in weekly practice.",
  status: "new",
  consentAt: Date.UTC(2026, 7, 25, 8),
  createdAt: Date.UTC(2026, 7, 25, 8),
  updatedAt: Date.UTC(2026, 7, 25, 8),
};

const proposalMessage = {
  _id: "contact-partner",
  name: "Bima Pratama",
  email: "bima@example.com",
  intent: "partner",
  message: "Our community would like to propose a shared language workshop.",
  status: "reviewing",
  consentAt: Date.UTC(2026, 7, 24, 8),
  createdAt: Date.UTC(2026, 7, 24, 8),
  updatedAt: Date.UTC(2026, 7, 24, 8),
};

beforeEach(() => {
  mocks.results = [joinMessage, proposalMessage];
  mocks.query.mockReset();
  mocks.updateStatus.mockReset().mockResolvedValue({
    ok: true,
    status: "reviewing",
    updatedAt: Date.UTC(2026, 7, 26),
  });
  mocks.loadMore.mockReset();
});

afterEach(cleanup);

describe("ContactManager", () => {
  it("keeps the three public intentions explicit and opens a clear reading pane", async () => {
    const user = userEvent.setup();
    renderManager();

    for (const label of [
      "Join the club",
      "Propose something together",
      "Ask a question",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("heading", { name: "Alya Rahman" })).toBeVisible();
    expect(screen.getByText(joinMessage.message)).toBeVisible();
    expect(screen.getByRole("link", { name: "Write an email to Alya Rahman" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:alya@example.com"),
    );
    expect(
      screen.getByText("Status is internal. It never sends email."),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Bima Pratama/ }));
    expect(screen.getByRole("heading", { name: "Bima Pratama" })).toBeVisible();
    expect(screen.getByText(proposalMessage.message)).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: "Propose something together",
      }),
    );
    await waitFor(() =>
      expect(mocks.query).toHaveBeenLastCalledWith({ intent: "partner" }),
    );
  });

  it("records status separately from the email handoff", async () => {
    const user = userEvent.setup();
    renderManager();

    const trigger = screen.getByRole("combobox", {
      name: "Record work status",
    });
    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: "In progress" }));

    await waitFor(() =>
      expect(mocks.updateStatus).toHaveBeenCalledWith({
        id: "contact-join",
        status: "reviewing",
        expectedUpdatedAt: joinMessage.updatedAt,
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Marked in progress.");
  });

  it("uses an honest empty state without inventing contact records", () => {
    mocks.results = [];
    renderManager();

    expect(screen.getByText("No messages in this view")).toBeVisible();
    expect(screen.queryByRole("link", { name: /Write an email/ })).toBeNull();
  });

  it("requires an explicit irreversible confirmation before erasing personal data", async () => {
    const user = userEvent.setup();
    mocks.updateStatus.mockResolvedValueOnce({ ok: true, deleted: true });
    renderManager();

    await user.click(
      screen.getByRole("button", { name: "Erase personal data" }),
    );
    expect(
      screen.getByRole("heading", { name: "Erase this contact message?" }),
    ).toBeVisible();
    expect(screen.getByText(/PII-free audit event remains/)).toBeVisible();
    expect(mocks.updateStatus).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog", {
      name: "Erase this contact message?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Erase personal data" }),
    );
    await waitFor(() =>
      expect(mocks.updateStatus).toHaveBeenCalledWith({
        id: "contact-join",
        expectedUpdatedAt: joinMessage.updatedAt,
      }),
    );
  });
});
