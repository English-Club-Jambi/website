import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  publish: vi.fn(),
  archive: vi.fn(),
  restore: vi.fn(),
  confirm: vi.fn(),
  loadMore: vi.fn(),
  mutationCall: 0,
}));

const programme = {
  _id: "program-1",
  slug: "campus-language-exchange",
  title: "Campus Language Exchange",
  summary:
    "A documented English exchange gives students a real audience for careful questions and cross-cultural listening.",
  category: "exchange",
  deliveryState: "completed",
  status: "published",
  featured: true,
  sortOrder: 10,
  publishedAt: Date.UTC(2025, 7, 20),
  updatedAt: Date.UTC(2026, 7, 26),
  hasWorkingCopy: false,
};

const publishedVersion = {
  _id: "program-revision-1",
  revision: 1,
  slug: programme.slug,
  title: programme.title,
  summary: programme.summary,
  body:
    "Students met visiting speakers for a guided exchange built around listening, direct questions, and practical English. The account stays within the event details supported by the official source.",
  category: "exchange",
  deliveryState: "completed",
  audience: "Universitas Jambi students",
  dateLabel: "20 August 2025",
  startsAt: Date.UTC(2025, 7, 20),
  locationLabel: "Universitas Jambi",
  communityBenefit:
    "A campus-wide opportunity to practise English with people beyond the usual classroom.",
  sourceLabel: "Universitas Jambi news record",
  sourceUrl: "https://www.unja.ac.id/example-programme-record/",
  featured: true,
  sortOrder: 10,
  createdAt: Date.UTC(2026, 7, 26),
};

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => {
    const mutations = [
      mocks.save,
      mocks.publish,
      mocks.archive,
      mocks.restore,
    ];
    return mutations[mocks.mutationCall++]!;
  }),
  usePaginatedQuery: vi.fn(() => ({
    results: [programme],
    status: "Exhausted",
    loadMore: mocks.loadMore,
  })),
  useQuery: vi.fn((_query, args) =>
    args === "skip"
      ? undefined
      : {
          program: programme,
          workingCopy: null,
          publishedVersion,
        },
  ),
}));

vi.mock("@/components/admin/admin-confirm-dialog", () => ({
  useAdminConfirm: () => mocks.confirm,
}));

vi.mock("@/components/admin/admin-session", () => ({
  useAdminSession: () => ({ role: "owner" }),
  canPublish: () => true,
}));

import { ProgramManager } from "@/components/admin/program-manager";

beforeEach(() => {
  mocks.mutationCall = 0;
  mocks.save.mockReset();
  mocks.publish.mockReset();
  mocks.archive.mockReset().mockResolvedValue(null);
  mocks.restore.mockReset();
  mocks.confirm.mockReset().mockImplementation(async (_request, execute) => {
    await execute?.();
    return true;
  });
});

afterEach(cleanup);

describe("ProgramManager", () => {
  it("explains the evidence boundary and opens a published record for editing", async () => {
    const user = userEvent.setup();
    render(<ProgramManager />);

    expect(
      screen.getByRole("heading", { name: "Programs" }),
    ).toBeVisible();
    expect(
      screen.getByText(/Completed work needs a date and an official source/),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "View public programs" }),
    ).toHaveAttribute("href", "/programs");

    await user.click(
      screen.getByRole("button", { name: /Campus Language Exchange/ }),
    );

    expect(screen.getByLabelText("Programme title")).toHaveValue(
      "Campus Language Exchange",
    );
    expect(screen.getByLabelText(/Event date/)).toHaveValue("2025-08-20");
    expect(screen.getByLabelText("Official source address")).toHaveValue(
      "https://www.unja.ac.id/example-programme-record/",
    );
    expect(
      screen.getByText(/Saving creates a private working copy/),
    ).toBeVisible();
  });

  it("archives through the shared confirmation contract", async () => {
    const user = userEvent.setup();
    render(<ProgramManager />);
    await user.click(
      screen.getByRole("button", { name: /Campus Language Exchange/ }),
    );
    await user.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() =>
      expect(mocks.archive).toHaveBeenCalledWith({ programId: "program-1" }),
    );
    expect(mocks.confirm.mock.calls[0]?.[0]).toMatchObject({
      title: "Archive Campus Language Exchange?",
      confirmLabel: "Archive programme",
      cancelLabel: "Keep programme",
    });
  });
});
