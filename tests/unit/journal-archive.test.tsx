import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { JournalArchive } from "@/components/journal/journal-archive";
import archiveStyles from "@/components/journal/journal-archive.module.css";
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
  it("keeps a real cover decorative while the title remains the named article link", () => {
    const page: JournalArchivePage = {
      state: "ready",
      posts: [{ ...post, coverKey: "club-room-wide" }],
      isDone: true,
      continueCursor: null,
    };

    const { container } = render(
      <JournalArchive page={page} isCursorPage={false} copy={copy} />,
    );

    expect(screen.getByRole("link", { name: "One clear question" })).toHaveAttribute(
      "href",
      "/journal/one-clear-question",
    );

    const coverLink = container.querySelector('article > a[aria-hidden="true"]');
    expect(coverLink).toHaveClass(archiveStyles.archiveMedia);
    expect(coverLink).toHaveAttribute("href", "/journal/one-clear-question");
    expect(coverLink).toHaveAttribute("tabindex", "-1");
    expect(coverLink?.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("renders an icon fallback without adding a second article link", () => {
    const page: JournalArchivePage = {
      state: "ready",
      posts: [post],
      isDone: true,
      continueCursor: null,
    };

    const { container } = render(
      <JournalArchive page={page} isCursorPage={false} copy={copy} />,
    );

    const fallback = container.querySelector('article > div[aria-hidden="true"]');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveClass(archiveStyles.archiveMedia);
    expect(fallback?.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector('article > a[aria-hidden="true"]')).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

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
