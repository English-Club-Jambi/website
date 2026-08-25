import { describe, expect, it } from "vitest";

import { legacyMarkdownToEditorDocument } from "@/lib/legacy-journal";

describe("legacyMarkdownToEditorDocument", () => {
  it("turns the existing Markdown story shape into editable Tiptap blocks", () => {
    const converted = legacyMarkdownToEditorDocument(
      [
        "The archive records **Leeds the Way** while members listen together.",
        "",
        "## Listening is part of speaking",
        "",
        "A useful exchange gives every speaker enough room to answer.",
      ].join("\n"),
    );

    expect(converted.document).toMatchObject({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "The archive records " },
            {
              type: "text",
              text: "Leeds the Way",
              marks: [{ type: "bold" }],
            },
            { type: "text", text: " while members listen together." },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [
            { type: "text", text: "Listening is part of speaking" },
          ],
        },
        { type: "paragraph" },
      ],
    });
    expect(converted.plainText).toBe(
      "The archive records Leeds the Way while members listen together.\nListening is part of speaking\nA useful exchange gives every speaker enough room to answer.",
    );
    expect(converted.wordCount).toBe(25);
  });

  it("supports common list and quote blocks without interpreting raw HTML", () => {
    const converted = legacyMarkdownToEditorDocument(
      [
        "> Ask a question worth carrying.",
        "",
        "- Listen before answering",
        "- Leave room for a pause",
        "",
        "<img src=\"https://tracker.example/pixel.gif\">",
      ].join("\n"),
    );

    expect(converted.document.content?.map((node) => node.type)).toEqual([
      "blockquote",
      "bulletList",
      "paragraph",
    ]);
    expect(JSON.stringify(converted.document)).not.toContain('"type":"image"');
    expect(converted.plainText).toContain(
      '<img src="https://tracker.example/pixel.gif">',
    );
  });

  it("returns one valid empty paragraph for a blank legacy body", () => {
    expect(legacyMarkdownToEditorDocument("  \n")).toEqual({
      document: { type: "doc", content: [{ type: "paragraph", content: [] }] },
      plainText: "",
      wordCount: 0,
    });
  });
});
