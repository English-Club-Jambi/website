import type { JSONContent } from "@tiptap/core";

type LegacyJournalDocument = {
  document: JSONContent;
  plainText: string;
  wordCount: number;
};

const blockStartPattern = /^(?:#{1,3}\s+|>\s?|[-*+]\s+|\d+\.\s+)/u;
const inlineTokenPattern =
  /(\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_|\[([^\]\n]+)\]\(((?:https:\/\/|mailto:)[^)\s]+)\))/giu;

function pushText(nodes: JSONContent[], text: string, marks?: JSONContent["marks"]) {
  if (text.length === 0) return;
  nodes.push({ type: "text", text, ...(marks === undefined ? {} : { marks }) });
}

function parseInline(value: string) {
  const nodes: JSONContent[] = [];
  let cursor = 0;

  for (const match of value.matchAll(inlineTokenPattern)) {
    const index = match.index ?? cursor;
    pushText(nodes, value.slice(cursor, index));

    const bold = match[2] ?? match[3];
    const italic = match[4] ?? match[5];
    const linkText = match[6];
    const href = match[7];
    if (bold !== undefined) {
      pushText(nodes, bold, [{ type: "bold" }]);
    } else if (italic !== undefined) {
      pushText(nodes, italic, [{ type: "italic" }]);
    } else if (linkText !== undefined && href !== undefined && href.length <= 2_048) {
      pushText(nodes, linkText, [{ type: "link", attrs: { href } }]);
    } else {
      pushText(nodes, match[0]);
    }
    cursor = index + match[0].length;
  }

  pushText(nodes, value.slice(cursor));
  return nodes;
}

function inlinePlainText(nodes: JSONContent[]) {
  return nodes.map((node) => node.text ?? "").join("");
}

function textBlock(type: "paragraph" | "heading", value: string, level?: 2 | 3) {
  const content = parseInline(value.trim());
  return {
    node: {
      type,
      ...(level === undefined ? {} : { attrs: { level } }),
      content,
    } satisfies JSONContent,
    text: inlinePlainText(content),
  };
}

export function legacyMarkdownToEditorDocument(body: string): LegacyJournalDocument {
  const lines = body.replace(/\r\n?/gu, "\n").split("\n");
  const content: JSONContent[] = [];
  const textParts: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim().length === 0) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/u.exec(line);
    if (heading !== null) {
      const block = textBlock(
        "heading",
        heading[2],
        heading[1].length >= 3 ? 3 : 2,
      );
      content.push(block.node);
      textParts.push(block.text);
      index += 1;
      continue;
    }

    if (/^>\s?/u.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/u.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/u, "").trim());
        index += 1;
      }
      const block = textBlock("paragraph", quoteLines.join(" "));
      content.push({ type: "blockquote", content: [block.node] });
      textParts.push(block.text);
      continue;
    }

    if (/^[-*+]\s+/u.test(line)) {
      const items: JSONContent[] = [];
      while (index < lines.length && /^[-*+]\s+/u.test(lines[index])) {
        const block = textBlock(
          "paragraph",
          lines[index].replace(/^[-*+]\s+/u, ""),
        );
        items.push({ type: "listItem", content: [block.node] });
        textParts.push(block.text);
        index += 1;
      }
      content.push({ type: "bulletList", content: items });
      continue;
    }

    const ordered = /^(\d+)\.\s+(.+)$/u.exec(line);
    if (ordered !== null) {
      const items: JSONContent[] = [];
      const start = Number(ordered[1]);
      while (index < lines.length) {
        const item = /^\d+\.\s+(.+)$/u.exec(lines[index]);
        if (item === null) break;
        const block = textBlock("paragraph", item[1]);
        items.push({ type: "listItem", content: [block.node] });
        textParts.push(block.text);
        index += 1;
      }
      content.push({
        type: "orderedList",
        attrs: { start: Number.isInteger(start) && start >= 1 ? start : 1 },
        content: items,
      });
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim().length > 0 &&
      !blockStartPattern.test(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    const block = textBlock("paragraph", paragraphLines.join(" "));
    content.push(block.node);
    textParts.push(block.text);
  }

  if (content.length === 0) {
    content.push({ type: "paragraph", content: [] });
  }
  const plainText = textParts.join("\n").trim();
  return {
    document: { type: "doc", content },
    plainText,
    wordCount: plainText.length === 0 ? 0 : plainText.split(/\s+/u).length,
  };
}
