import { MapPinIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import type { ReactNode } from "react";

import { MarkdownBody } from "@/lib/markdown";

import styles from "./rich-journal-body.module.css";

type JsonObject = Record<string, unknown>;

type RichJournalNode = {
  type: string;
  text?: string;
  attrs?: JsonObject;
  marks?: Array<{ type?: unknown; attrs?: JsonObject }>;
  content?: RichJournalNode[];
};

export type RichJournalMedia = {
  mediaId: string;
  publicUrl: string;
  alt: string;
  width: number;
  height: number;
};

type RichJournalBodyProps = {
  editorJson?: string;
  inlineMedia?: RichJournalMedia[];
  fallbackBody: string;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDocument(value: string): RichJournalNode | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isObject(parsed) || parsed.type !== "doc" || !Array.isArray(parsed.content)) {
      return null;
    }
    return parsed as RichJournalNode;
  } catch {
    return null;
  }
}

function safeLink(value: unknown) {
  if (typeof value !== "string" || value.length > 2_048) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "mailto:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function finiteCoordinate(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : null;
}

function applyMarks(
  text: ReactNode,
  marks: RichJournalNode["marks"],
  path: string,
) {
  if (!Array.isArray(marks)) {
    return text;
  }

  return marks.reduce<ReactNode>((child, mark, index) => {
    if (mark.type === "bold") {
      return <strong key={`${path}-bold-${index}`}>{child}</strong>;
    }
    if (mark.type === "italic") {
      return <em key={`${path}-italic-${index}`}>{child}</em>;
    }
    if (mark.type === "link") {
      const href = safeLink(mark.attrs?.href);
      if (href !== null) {
        const external = href.startsWith("https:");
        return (
          <a
            key={`${path}-link-${index}`}
            href={href}
            rel={external ? "noreferrer" : undefined}
            target={external ? "_blank" : undefined}
          >
            {child}
          </a>
        );
      }
    }
    return child;
  }, text);
}

function renderChildren(
  node: RichJournalNode,
  mediaById: ReadonlyMap<string, RichJournalMedia>,
  path: string,
) {
  if (!Array.isArray(node.content)) {
    return null;
  }
  return node.content.map((child, index) =>
    renderNode(child, mediaById, `${path}-${index}`),
  );
}

function renderNode(
  node: RichJournalNode,
  mediaById: ReadonlyMap<string, RichJournalMedia>,
  path: string,
): ReactNode {
  if (!isObject(node) || typeof node.type !== "string") {
    return null;
  }

  if (node.type === "text") {
    return typeof node.text === "string"
      ? applyMarks(node.text, node.marks, path)
      : null;
  }
  if (node.type === "hardBreak") {
    return <br key={path} />;
  }

  const children = renderChildren(node, mediaById, path);
  if (node.type === "paragraph") {
    return <p key={path}>{children}</p>;
  }
  if (node.type === "heading") {
    return node.attrs?.level === 2 ? (
      <h2 key={path}>{children}</h2>
    ) : node.attrs?.level === 3 ? (
      <h3 key={path}>{children}</h3>
    ) : null;
  }
  if (node.type === "blockquote") {
    return <blockquote key={path}>{children}</blockquote>;
  }
  if (node.type === "bulletList") {
    return <ul key={path}>{children}</ul>;
  }
  if (node.type === "orderedList") {
    const start = node.attrs?.start;
    return (
      <ol
        key={path}
        start={
          typeof start === "number" && Number.isInteger(start) && start >= 1
            ? start
            : undefined
        }
      >
        {children}
      </ol>
    );
  }
  if (node.type === "listItem") {
    return <li key={path}>{children}</li>;
  }
  if (node.type === "image") {
    const mediaId = node.attrs?.mediaId;
    const media = typeof mediaId === "string" ? mediaById.get(mediaId) : undefined;
    if (media === undefined) {
      return null;
    }
    const alt =
      typeof node.attrs?.alt === "string" && node.attrs.alt.trim().length >= 3
        ? node.attrs.alt.trim()
        : media.alt;
    const caption =
      typeof node.attrs?.caption === "string" ? node.attrs.caption.trim() : "";
    return (
      <figure key={path} className={styles.mediaFigure}>
        <Image
          src={media.publicUrl}
          alt={alt}
          width={media.width}
          height={media.height}
          sizes="(max-width: 879px) calc(100vw - 2rem), 760px"
        />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }
  if (node.type === "map") {
    const latitude = finiteCoordinate(node.attrs?.latitude, -90, 90);
    const longitude = finiteCoordinate(node.attrs?.longitude, -180, 180);
    const zoom = node.attrs?.zoom;
    const label = node.attrs?.label;
    if (
      latitude === null ||
      longitude === null ||
      typeof zoom !== "number" ||
      !Number.isInteger(zoom) ||
      zoom < 1 ||
      zoom > 20 ||
      typeof label !== "string" ||
      label.trim().length < 2
    ) {
      return null;
    }
    const mapUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=${zoom}/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`;
    return (
      <aside key={path} className={styles.mapCard} aria-label={`Map location: ${label.trim()}`}>
        <MapPinIcon width={28} height={28} strokeWidth={1.8} aria-hidden />
        <div>
          <strong>{label.trim()}</strong>
          <span>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
        </div>
        <a href={mapUrl} target="_blank" rel="noreferrer">
          Open map
        </a>
      </aside>
    );
  }
  if (node.type === "doc") {
    return children;
  }
  return null;
}

export function RichJournalBody({
  editorJson,
  inlineMedia = [],
  fallbackBody,
}: RichJournalBodyProps) {
  if (editorJson === undefined) {
    return <MarkdownBody body={fallbackBody} />;
  }

  const document = parseDocument(editorJson);
  if (document === null) {
    return <MarkdownBody body={fallbackBody} />;
  }

  const mediaById = new Map(inlineMedia.map((media) => [media.mediaId, media]));
  return (
    <div className={`article-body ${styles.richBody}`}>
      {renderNode(document, mediaById, "journal")}
    </div>
  );
}
