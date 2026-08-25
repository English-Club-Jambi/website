import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  archive: vi.fn(),
  restore: vi.fn(),
  confirm: vi.fn(),
  loadMore: vi.fn(),
  role: "publisher" as "editor" | "publisher" | "owner",
  results: [] as Array<Record<string, unknown>>,
  mutationCall: 0,
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() =>
    mocks.mutationCall++ % 2 === 0 ? mocks.archive : mocks.restore,
  ),
  usePaginatedQuery: vi.fn(() => ({
    results: mocks.results,
    status: "Exhausted",
    loadMore: mocks.loadMore,
  })),
}));

vi.mock("@/components/admin/admin-confirm-dialog", () => ({
  useAdminConfirm: () => mocks.confirm,
}));

vi.mock("@/components/admin/admin-session", () => ({
  useAdminSession: () => ({ role: mocks.role }),
  canPublish: ({ role }: { role: typeof mocks.role }) => role !== "editor",
}));

import { JournalManager } from "@/components/admin/journal-manager";

const publishedStory = {
  _id: "post-published",
  slug: "a-published-story",
  title: "A published story",
  excerpt: "A reviewed journal story that visitors can read today.",
  category: "Club life",
  authorName: "English Club Editorial",
  status: "published",
  featured: true,
  publishedAt: Date.UTC(2026, 7, 20),
  updatedAt: Date.UTC(2026, 7, 21),
  hasDraft: true,
};

const archivedDraft = {
  _id: "post-archived",
  slug: "an-archived-draft",
  title: "An archived draft",
  excerpt: "A private story waiting for another editorial pass.",
  category: "Practice notes",
  authorName: "English Club Editorial",
  status: "archived",
  featured: false,
  updatedAt: Date.UTC(2026, 7, 19),
  hasDraft: true,
};

beforeEach(() => {
  mocks.role = "publisher";
  mocks.results = [publishedStory, archivedDraft];
  mocks.mutationCall = 0;
  mocks.archive.mockReset().mockResolvedValue(null);
  mocks.restore.mockReset().mockResolvedValue({ status: "draft" });
  mocks.loadMore.mockReset();
  mocks.confirm.mockReset().mockImplementation(async (_request, execute) => {
    await execute?.();
    return true;
  });
});

afterEach(cleanup);

describe("JournalManager", () => {
  it("gives every story an explicit edit route and reversible lifecycle action", async () => {
    const user = userEvent.setup();
    render(<JournalManager />);

    expect(
      screen.getByRole("link", { name: "Edit A published story" }),
    ).toHaveAttribute("href", "/admin/journal/post-published");
    expect(
      screen.getByRole("link", { name: "Edit An archived draft" }),
    ).toHaveAttribute("href", "/admin/journal/post-archived");
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Archive A published story" }),
    );
    await waitFor(() =>
      expect(mocks.archive).toHaveBeenCalledWith({ postId: "post-published" }),
    );
    expect(mocks.confirm.mock.calls[0]?.[0]).toMatchObject({
      title: "Archive “A published story”?",
      confirmLabel: "Archive story",
      cancelLabel: "Keep story",
    });

    await user.click(
      screen.getByRole("button", { name: "Restore An archived draft" }),
    );
    await waitFor(() =>
      expect(mocks.restore).toHaveBeenCalledWith({ postId: "post-archived" }),
    );
    expect(mocks.confirm.mock.calls[1]?.[0]).toMatchObject({
      title: "Restore “An archived draft”?",
      confirmLabel: "Restore draft",
      cancelLabel: "Keep archived",
    });
  });

  it("keeps lifecycle controls out of an editor session while preserving editing", () => {
    mocks.role = "editor";
    render(<JournalManager />);

    expect(screen.getAllByRole("link", { name: /^Edit / })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^Archive / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Restore / })).toBeNull();
  });

  it("warns that restoring an archived publication makes it public again", async () => {
    mocks.results = [
      {
        ...publishedStory,
        status: "archived",
      },
    ];
    const user = userEvent.setup();
    render(<JournalManager />);

    await user.click(
      screen.getByRole("button", { name: "Restore A published story" }),
    );

    expect(mocks.confirm.mock.calls[0]?.[0]).toMatchObject({
      confirmLabel: "Restore publication",
      description:
        "Its last verified published revision returns at the existing journal address. If that revision no longer verifies, the story returns as a private draft.",
    });
  });
});
