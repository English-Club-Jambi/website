import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RichJournalBody } from "@/components/journal/rich-journal-body";

afterEach(cleanup);

describe("RichJournalBody", () => {
  it("renders the allowlisted editor structure and verified media", () => {
    const editorJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "A shared room" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Listen", marks: [{ type: "bold" }] },
            { type: "text", text: " before answering." },
          ],
        },
        {
          type: "image",
          attrs: {
            mediaId: "media_ready_1",
            alt: "Members listening around a table",
            caption: "The room before a speaking round.",
          },
        },
      ],
    });

    render(
      <RichJournalBody
        editorJson={editorJson}
        fallbackBody="Fallback"
        inlineMedia={[
          {
            mediaId: "media_ready_1",
            publicUrl: "https://r2.mukhtada.my.id/uploads/journal-inline/room.webp",
            alt: "Reviewed media alternative text",
            width: 1200,
            height: 800,
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "A shared room" })).toBeVisible();
    expect(screen.getByText("Listen").tagName).toBe("STRONG");
    expect(screen.getByAltText("Members listening around a table")).toHaveAttribute(
      "src",
      expect.stringContaining("r2.mukhtada.my.id"),
    );
    expect(screen.getByText("The room before a speaking round.")).toBeVisible();
  });

  it("drops unknown nodes, unsafe links, and media without a ready projection", () => {
    const editorJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Do not execute",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
        { type: "iframe", attrs: { src: "https://example.com" } },
        { type: "image", attrs: { mediaId: "not-ready", alt: "Hidden image" } },
      ],
    });

    const { container } = render(
      <RichJournalBody editorJson={editorJson} fallbackBody="Fallback" />,
    );

    expect(screen.getByText("Do not execute")).not.toHaveAttribute("href");
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.queryByAltText("Hidden image")).toBeNull();
  });

  it("renders a bounded coordinate map as an explicit outbound link", () => {
    const editorJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "map",
          attrs: {
            label: "UPA Language Room",
            latitude: -6.2,
            longitude: 106.81667,
            zoom: 14,
          },
        },
      ],
    });

    render(<RichJournalBody editorJson={editorJson} fallbackBody="Fallback" />);

    expect(screen.getByLabelText("Map location: UPA Language Room")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open map" })).toHaveAttribute(
      "href",
      expect.stringContaining("openstreetmap.org"),
    );
    expect(document.body.innerHTML).not.toContain("<iframe");
  });

  it("falls back to the legacy Markdown body when editor JSON is malformed", () => {
    render(<RichJournalBody editorJson="{" fallbackBody="## Legacy story" />);
    expect(screen.getByRole("heading", { level: 2, name: "Legacy story" })).toBeVisible();
  });
});
