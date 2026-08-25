"use client";

import { MapPinIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Node } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";

import styles from "./rich-journal-editor.module.css";

export type MapEmbedAttributes = {
  label: string;
  latitude: number;
  longitude: number;
  zoom: number;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mapEmbed: {
      insertMapEmbed: (attributes: MapEmbedAttributes) => ReturnType;
    };
  }
}

function MapEmbedNodeView({ node, deleteNode }: NodeViewProps) {
  const attributes = node.attrs as MapEmbedAttributes;

  return (
    <NodeViewWrapper
      className={styles.mapNode}
      data-map-embed=""
      contentEditable={false}
    >
      <div className={styles.mapNodeIcon} aria-hidden>
        <MapPinIcon width={24} height={24} strokeWidth={1.8} />
      </div>
      <div className={styles.mapNodeCopy}>
        <strong>{attributes.label}</strong>
        <span>
          {attributes.latitude.toFixed(5)}, {attributes.longitude.toFixed(5)} · zoom{" "}
          {attributes.zoom}
        </span>
      </div>
      <button type="button" onClick={deleteNode} aria-label={`Remove map for ${attributes.label}`}>
        <TrashIcon width={18} height={18} strokeWidth={1.8} aria-hidden />
      </button>
    </NodeViewWrapper>
  );
}

export const MapEmbed = Node.create({
  name: "map",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      label: { default: "" },
      latitude: { default: 0 },
      longitude: { default: 0 },
      zoom: { default: 14 },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-map-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      {
        "data-map-embed": "",
        "data-map-label": String(HTMLAttributes.label ?? ""),
        "data-map-latitude": String(HTMLAttributes.latitude ?? ""),
        "data-map-longitude": String(HTMLAttributes.longitude ?? ""),
        "data-map-zoom": String(HTMLAttributes.zoom ?? ""),
      },
    ];
  },

  addCommands() {
    return {
      insertMapEmbed:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: attributes }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MapEmbedNodeView);
  },
});
