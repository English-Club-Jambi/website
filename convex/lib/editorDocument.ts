type JsonObject = Record<string, unknown>;

type NormalizedNode = {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | null>;
  marks?: Array<{
    type: "bold" | "italic" | "link";
    attrs?: { href: string };
  }>;
  content?: NormalizedNode[];
};

const containerTypes = new Set([
  "doc",
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
]);
const leafTypes = new Set(["text", "hardBreak", "image", "map"]);
const safeHrefPattern = /^(?:https:\/\/|mailto:)/i;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeMarks(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.length > 4) {
    throw new Error("Editor marks are invalid.");
  }
  return value.map((mark) => {
    if (!isObject(mark) || typeof mark.type !== "string") {
      throw new Error("Editor mark is invalid.");
    }
    if (mark.type === "bold" || mark.type === "italic") {
      return { type: mark.type } as const;
    }
    if (mark.type === "link") {
      const href = isObject(mark.attrs) ? mark.attrs.href : null;
      if (
        typeof href !== "string" ||
        href.length > 2_048 ||
        !safeHrefPattern.test(href)
      ) {
        throw new Error("Editor link is invalid.");
      }
      return { type: "link" as const, attrs: { href } };
    }
    throw new Error("Editor mark type is not allowed.");
  });
}

export function validateEditorDocument(editorJson: string) {
  if (editorJson.length < 14 || editorJson.length > 500_000) {
    throw new Error("Editor document size is invalid.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(editorJson) as unknown;
  } catch {
    throw new Error("Editor document is not valid JSON.");
  }

  let nodeCount = 0;
  const mediaIds = new Set<string>();
  const textParts: string[] = [];

  function normalizeNode(value: unknown, depth: number): NormalizedNode {
    nodeCount += 1;
    if (nodeCount > 4_000 || depth > 16 || !isObject(value)) {
      throw new Error("Editor document is too complex.");
    }
    const type = value.type;
    if (
      typeof type !== "string" ||
      (!containerTypes.has(type) && !leafTypes.has(type))
    ) {
      throw new Error("Editor node type is not allowed.");
    }

    if (type === "text") {
      if (
        typeof value.text !== "string" ||
        value.text.length === 0 ||
        value.text.length > 10_000
      ) {
        throw new Error("Editor text node is invalid.");
      }
      textParts.push(value.text);
      const marks = normalizeMarks(value.marks);
      return {
        type,
        text: value.text,
        ...(marks === undefined ? {} : { marks }),
      };
    }

    if (type === "hardBreak") {
      textParts.push("\n");
      return { type };
    }

    if (type === "image") {
      if (!isObject(value.attrs)) {
        throw new Error("Editor image attributes are invalid.");
      }
      const mediaId = value.attrs.mediaId;
      const alt = value.attrs.alt;
      const caption = value.attrs.caption;
      if (
        typeof mediaId !== "string" ||
        mediaId.length < 8 ||
        mediaId.length > 128 ||
        typeof alt !== "string" ||
        alt.trim().length < 3 ||
        alt.length > 240 ||
        (caption !== undefined &&
          (typeof caption !== "string" || caption.length > 300))
      ) {
        throw new Error("Editor image attributes are invalid.");
      }
      mediaIds.add(mediaId);
      if (mediaIds.size > 40) {
        throw new Error("Editor document has too many inline images.");
      }
      textParts.push(alt.trim());
      return {
        type,
        attrs: {
          mediaId,
          alt: alt.trim(),
          ...(caption === undefined ? {} : { caption: caption.trim() }),
        },
      };
    }

    if (type === "map") {
      if (!isObject(value.attrs)) {
        throw new Error("Editor map attributes are invalid.");
      }
      const latitude = asFiniteNumber(value.attrs.latitude);
      const longitude = asFiniteNumber(value.attrs.longitude);
      const zoom = asFiniteNumber(value.attrs.zoom);
      const label = value.attrs.label;
      if (
        latitude === null ||
        latitude < -90 ||
        latitude > 90 ||
        longitude === null ||
        longitude < -180 ||
        longitude > 180 ||
        zoom === null ||
        !Number.isInteger(zoom) ||
        zoom < 1 ||
        zoom > 20 ||
        typeof label !== "string" ||
        label.trim().length < 2 ||
        label.length > 160
      ) {
        throw new Error("Editor map attributes are invalid.");
      }
      textParts.push(label.trim());
      return {
        type,
        attrs: { latitude, longitude, zoom, label: label.trim() },
      };
    }

    const rawContent =
      value.content === undefined && (type === "paragraph" || type === "heading")
        ? []
        : value.content;
    if (!Array.isArray(rawContent) || rawContent.length > 1_000) {
      throw new Error("Editor node content is invalid.");
    }
    const content = rawContent.map((child) =>
      normalizeNode(child, depth + 1),
    );
    if (type === "doc" && depth !== 0) {
      throw new Error("Nested editor documents are not allowed.");
    }
    if (type !== "doc") {
      textParts.push("\n");
    }

    if (type === "heading") {
      const level = isObject(value.attrs) ? value.attrs.level : null;
      if (level !== 2 && level !== 3) {
        throw new Error("Editor heading level is invalid.");
      }
      return { type, attrs: { level }, content };
    }
    if (type === "orderedList") {
      const order = isObject(value.attrs) ? value.attrs.start : undefined;
      if (
        order !== undefined &&
        (typeof order !== "number" ||
          !Number.isInteger(order) ||
          order < 1 ||
          order > 10_000)
      ) {
        throw new Error("Editor ordered list start is invalid.");
      }
      return {
        type,
        ...(order === undefined ? {} : { attrs: { start: order } }),
        content,
      };
    }
    return { type, content };
  }

  const document = normalizeNode(parsed, 0);
  if (document.type !== "doc") {
    throw new Error("Editor document root must be a doc node.");
  }
  const plainText = textParts
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  if (plainText.length > 100_000) {
    throw new Error("Editor document text is too long.");
  }

  return {
    editorJson: JSON.stringify(document),
    plainText,
    mediaIds: [...mediaIds],
  };
}
