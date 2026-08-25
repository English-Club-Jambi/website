import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { JournalArchive } from "@/components/journal/journal-archive";
import type { JournalArchivePage } from "@/lib/journal";
import { getPublicContentDefaults } from "@content/public-content";

const copy = getPublicContentDefaults("journal");

const post = {
  slug: "one-clear-question",
  title: "One clear question",
  excerpt: "A short note about listening before answering.",
  category: "Practice notes",
  authorName: "English Club",
  publishedAt: Date.UTC(2026, 7, 25),
  updatedAt: Date.UTC(2026, 7, 25),
  featured: false,
};

afterEach(cleanup);

describe("JournalArchive", () => {
  it("encodes the opaque cursor in a normal older-stories link", () => {
    const page: JournalArchivePage = {
      state: "ready",
      posts: [post],
      isDone: false,
      continueCursor: "opaque+/= cursor",
    };

    render(<JournalArchive page={page} isCursorPage={false} copy={copy} />);

    expect(screen.getByRole("link", { name: "Older stories" })).toHaveAttribute(
      "href",
      "/journal?after=opaque%2B%2F%3D%20cursor#journal-archive",
    );
    expect(screen.getByRole("navigation", { name: "Journal pagination" })).toBeInTheDocument();
  });

  it("offers a server-rendered route back to the newest stories", () => {
    const page: JournalArchivePage = {
      state: "ready",
      posts: [post],
      isDone: true,
      continueCursor: null,
    };

    render(<JournalArchive page={page} isCursorPage copy={copy} />);

    expect(screen.getByRole("link", { name: "Newest stories" })).toHaveAttribute(
      "href",
      "/journal#journal-archive",
    );
    expect(screen.getByText("End of the journal")).toBeInTheDocument();
  });
});
