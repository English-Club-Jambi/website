import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { JournalCover } from "@/components/journal/journal-cover";

afterEach(cleanup);

describe("JournalCover", () => {
  it("renders a reviewed dynamic cover from the custom R2 domain", () => {
    render(
      <JournalCover
        coverMedia={{
          mediaId: "media_cover_1",
          publicUrl: "https://r2.mukhtada.my.id/uploads/journal-cover/room.webp",
          alt: "Members preparing a conversation round",
          width: 1600,
          height: 1067,
        }}
      />,
    );

    expect(screen.getByAltText("Members preparing a conversation round")).toHaveAttribute(
      "src",
      expect.stringContaining("r2.mukhtada.my.id"),
    );
  });

  it("keeps known documentary covers compatible", () => {
    render(<JournalCover coverKey="club-room-wide" />);
    expect(
      screen.getByAltText(
        "People sit around low tables in a library-like room with bookshelves along one wall.",
      ),
    ).toBeVisible();
  });

  it("does not guess a URL for an unknown legacy key", () => {
    const { container } = render(<JournalCover coverKey="unknown-cover" />);
    expect(container).toBeEmptyDOMElement();
  });
});
