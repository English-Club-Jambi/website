import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ProgramLedger } from "@/components/programs/program-ledger";
import { checkedInPrograms } from "@content/programs";
import { getPublicContentDefaults } from "@content/public-content";

const programs = checkedInPrograms.map((program) => ({
  ...program,
  publishedAt: Date.UTC(2026, 7, 26),
  updatedAt:
    "startsAt" in program && program.startsAt !== undefined
      ? program.startsAt
      : Date.UTC(2026, 7, 26),
}));

afterEach(cleanup);

describe("ProgramLedger", () => {
  it("separates documented work, programme lines, and open directions", () => {
    render(
      <ProgramLedger
        programs={programs}
        copy={getPublicContentDefaults("programs")}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "A public record should be specific enough to check.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Useful work can continue without pretending to be a fixed timetable.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Community work starts by listening to the community.",
      }),
    ).toBeVisible();
    expect(screen.getByText("English Club Opening Day")).toBeVisible();
    expect(screen.getByText("Community English Service")).toBeVisible();
  });

  it("opens a ruled programme entry and keeps official evidence beside the claim", async () => {
    const user = userEvent.setup();
    render(
      <ProgramLedger
        programs={programs}
        copy={getPublicContentDefaults("programs")}
      />,
    );

    const opening = screen.getByRole("button", {
      name: /English Club Opening Day/,
    });
    expect(opening).toHaveAttribute("aria-expanded", "false");
    await user.click(opening);
    expect(opening).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("link", { name: /UPT Library Universitas Jambi record/ }),
    ).toHaveAttribute(
      "href",
      "https://librarynew.unja.ac.id/english-club-upt-perpustakaan-resmi-di-bentuk/",
    );
  });

  it("does not render planned community work as a dated completed event", async () => {
    const user = userEvent.setup();
    render(
      <ProgramLedger
        programs={programs}
        copy={getPublicContentDefaults("programs")}
      />,
    );
    const community = screen.getByRole("button", {
      name: /Community English Service/,
    });
    await user.click(community);
    expect(screen.getAllByText("Open direction").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/remains an open programme direction until/i),
    ).toBeVisible();
    expect(community.closest("article")?.querySelector("time")).toBeNull();
  });
});
