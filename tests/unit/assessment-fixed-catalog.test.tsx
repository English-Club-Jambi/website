import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssessmentCatalogManager } from "@/components/admin/assessments/assessment-catalog-manager";

vi.mock("convex/react", async () => {
  const actual = await vi.importActual<typeof import("convex/react")>("convex/react");
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      page: [],
      continueCursor: "",
      isDone: true,
    })),
  };
});

afterEach(cleanup);

describe("fixed practice format catalogue", () => {
  it("offers format management without a creation entry point", () => {
    render(<AssessmentCatalogManager />);

    expect(screen.getByRole("heading", { name: "Practice Builder" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Question bank" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Assessment media" })).toBeVisible();
    expect(
      screen.getByText(/fixed catalogue is installed internally/i),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /create|new practice format/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create|new practice format/i }),
    ).not.toBeInTheDocument();
  });
});
