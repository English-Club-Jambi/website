"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Bars2Icon,
  Bars3BottomLeftIcon,
  BoldIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentTextIcon,
  H2Icon,
  H3Icon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  MapPinIcon,
  NumberedListIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { JSONContent } from "@tiptap/core";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  type ChangeEvent,
  type CSSProperties,
  type ComponentType,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SVGProps,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { MapEmbed } from "./map-embed-node";
import styles from "./rich-journal-editor.module.css";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const EMPTY_MEDIA_URLS: Readonly<Record<string, string>> = Object.freeze({});
const DEFAULT_MEDIA_HOST = "r2.mukhtada.my.id";
const EMPTY_CONTENT_NODE_TYPES = new Set(["paragraph", "heading"]);

type EditorIcon = ComponentType<SVGProps<SVGSVGElement>>;
type PanelName = "image" | "link" | "map" | null;
type BlockCommandId =
  | "paragraph"
  | "heading2"
  | "heading3"
  | "blockquote"
  | "bulletList"
  | "orderedList"
  | "image"
  | "map";

type BlockCommand = {
  id: BlockCommandId;
  label: string;
  description: string;
  icon: EditorIcon;
  group: "Text" | "Media";
  nodeType?: string;
};

type MenuAnchor = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type CommandMenuState = {
  mode: "add" | "block" | "slash";
  pos: number;
  nodeType: string;
  headingLevel: 2 | 3 | null;
  isFirst: boolean;
  isLast: boolean;
  left: number;
  top: number;
};

const BLOCK_COMMANDS: readonly BlockCommand[] = [
  {
    id: "paragraph",
    label: "Paragraph",
    description: "Body text",
    icon: Bars3BottomLeftIcon,
    group: "Text",
    nodeType: "paragraph",
  },
  {
    id: "heading2",
    label: "Heading 2",
    description: "Main section",
    icon: H2Icon,
    group: "Text",
    nodeType: "heading",
  },
  {
    id: "heading3",
    label: "Heading 3",
    description: "Subsection",
    icon: H3Icon,
    group: "Text",
    nodeType: "heading",
  },
  {
    id: "blockquote",
    label: "Quote",
    description: "Quoted passage",
    icon: ChatBubbleBottomCenterTextIcon,
    group: "Text",
    nodeType: "blockquote",
  },
  {
    id: "bulletList",
    label: "Bullet list",
    description: "Unordered points",
    icon: ListBulletIcon,
    group: "Text",
    nodeType: "bulletList",
  },
  {
    id: "orderedList",
    label: "Numbered list",
    description: "Ordered steps",
    icon: NumberedListIcon,
    group: "Text",
    nodeType: "orderedList",
  },
  {
    id: "image",
    label: "Image",
    description: "Reviewed R2 media",
    icon: PhotoIcon,
    group: "Media",
  },
  {
    id: "map",
    label: "Map",
    description: "Place and coordinates",
    icon: MapPinIcon,
    group: "Media",
  },
] as const;

function approvedMediaPreviewUrl(value: unknown, allowedHost: string) {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === allowedHost
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function JournalImageNodeView({ node }: NodeViewProps) {
  const source =
    typeof node.attrs.mediaId === "string"
      ? approvedMediaPreviewUrl(node.attrs.src, DEFAULT_MEDIA_HOST) ?? ""
      : "";
  const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
  const caption =
    typeof node.attrs.caption === "string" ? node.attrs.caption : "";

  return (
    <NodeViewWrapper className={styles.imageNode} contentEditable={false}>
      {source ? (
        // The URL is injected only after an exact HTTPS host check.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source} alt={alt} draggable={false} />
      ) : (
        <div className={styles.imagePreviewUnavailable} role="img" aria-label={alt}>
          <PhotoIcon width={28} height={28} aria-hidden />
          <span>{alt || "Image preview unavailable"}</span>
        </div>
      )}
      {caption ? <p>{caption}</p> : null}
    </NodeViewWrapper>
  );
}

const JournalImage = Image.extend({
  parseHTML() {
    return [];
  },

  addInputRules() {
    return [];
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: { default: null, rendered: false },
      caption: { default: null, rendered: false },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(JournalImageNodeView);
  },
});

export type JournalEditorImage = {
  mediaId: string;
  publicUrl: string;
  width?: number;
  height?: number;
};

export type JournalEditorChange = {
  document: JSONContent;
  plainText: string;
  wordCount: number;
};

export type RichJournalEditorProps = {
  initialContent?: JSONContent;
  onChange?: (change: JournalEditorChange) => void;
  onImageUpload?: (
    file: File,
    metadata: { alt: string; caption?: string },
  ) => Promise<JournalEditorImage>;
  mediaUrlsById?: Readonly<Record<string, string>>;
  allowedMediaHost?: string;
  disabled?: boolean;
};

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/u).length;
}

function normalizeEditorialLink(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "mailto:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function toStoredJournalDocument(node: JSONContent): JSONContent {
  const content =
    node.content?.map(toStoredJournalDocument) ??
    (EMPTY_CONTENT_NODE_TYPES.has(node.type ?? "") ? [] : undefined);

  if (node.type === "image") {
    return {
      type: "image",
      attrs: {
        mediaId: node.attrs?.mediaId,
        alt: node.attrs?.alt,
        ...(node.attrs?.caption ? { caption: node.attrs.caption } : {}),
      },
    };
  }

  return {
    ...node,
    ...(content === undefined ? {} : { content }),
  };
}

function addImagePreviewUrls(
  node: JSONContent,
  mediaUrlsById: Readonly<Record<string, string>>,
  allowedMediaHost: string,
): JSONContent {
  const content = node.content?.map((child) =>
    addImagePreviewUrls(child, mediaUrlsById, allowedMediaHost),
  );

  if (node.type === "image" && typeof node.attrs?.mediaId === "string") {
    const candidate = mediaUrlsById[node.attrs.mediaId];
    const approvedUrl = approvedMediaPreviewUrl(candidate, allowedMediaHost);
    if (approvedUrl !== null) {
      return {
        ...node,
        attrs: { ...node.attrs, src: approvedUrl },
      };
    }
  }

  return {
    ...node,
    ...(content === undefined ? {} : { content }),
  };
}

function getMenuPosition(anchor: MenuAnchor) {
  if (typeof window === "undefined") {
    return { left: anchor.left, top: anchor.bottom + 8 };
  }

  const menuWidth = Math.min(336, window.innerWidth - 24);
  const menuHeight = 420;
  const left = Math.max(
    12,
    Math.min(anchor.left, window.innerWidth - menuWidth - 12),
  );
  const top =
    window.innerHeight - anchor.bottom >= menuHeight
      ? anchor.bottom + 8
      : Math.max(12, anchor.top - menuHeight - 8);

  return { left, top };
}

function ToolbarButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const keepEditorSelection = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <button
      type="button"
      className={styles.toolbarButton}
      data-active={active ? "true" : "false"}
      aria-pressed={active === undefined ? undefined : active}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={keepEditorSelection}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

export function RichJournalEditor({
  initialContent,
  onChange,
  onImageUpload,
  mediaUrlsById = EMPTY_MEDIA_URLS,
  allowedMediaHost = DEFAULT_MEDIA_HOST,
  disabled = false,
}: RichJournalEditorProps) {
  const editorId = useId();
  const imageInputId = useId();
  const onChangeRef = useRef(onChange);
  const imageUploadPendingRef = useRef(false);
  const disabledRef = useRef(disabled);
  const openSlashMenuRef = useRef<
    ((pos: number, anchor: MenuAnchor) => void) | null
  >(null);
  const pendingSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const commandMenuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [hoveredBlockPos, setHoveredBlockPos] = useState<number | null>(null);
  const [commandMenu, setCommandMenu] = useState<CommandMenuState | null>(null);
  const [openPanel, setOpenPanel] = useState<PanelName>(null);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAlt, setImageAlt] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [imageStatus, setImageStatus] = useState<
    "idle" | "uploading" | "error"
  >("idle");
  const [imageMessage, setImageMessage] = useState("");
  const [mapDraft, setMapDraft] = useState({
    label: "",
    latitude: "",
    longitude: "",
    zoom: "14",
  });
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editorContent = useMemo(
    () =>
      addImagePreviewUrls(
        initialContent ?? {
          type: "doc",
          content: [{ type: "paragraph" }],
        },
        mediaUrlsById,
        allowedMediaHost,
      ),
    [allowedMediaHost, initialContent, mediaUrlsById],
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        heading: { levels: [2, 3] },
        horizontalRule: false,
        link: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        enableClickSelection: true,
        autolink: false,
        linkOnPaste: false,
        protocols: ["https", "mailto"],
        isAllowedUri: (value) => normalizeEditorialLink(value) !== null,
      }),
      JournalImage.configure({ allowBase64: false, inline: false }),
      Placeholder.configure({
        includeChildren: true,
        showOnlyCurrent: true,
        placeholder: ({ node }) =>
          node.type.name === "paragraph"
            ? "Write a paragraph or type / for blocks"
            : "Continue writing",
      }),
      MapEmbed,
    ],
    content: editorContent,
    editorProps: {
      attributes: {
        id: editorId,
        role: "textbox",
        "aria-label": "Journal body",
        "aria-multiline": "true",
        class: styles.editorContent,
      },
      handleKeyDown(view, event) {
        if (event.key !== "/" || event.defaultPrevented || event.isComposing) {
          return false;
        }

        const { selection } = view.state;
        const { $from } = selection;
        if (
          !selection.empty ||
          $from.parent.type.name !== "paragraph" ||
          $from.parent.content.size !== 0 ||
          $from.depth < 1
        ) {
          return false;
        }

        event.preventDefault();
        const coords = view.coordsAtPos(selection.from);
        const pos = $from.before(1);
        window.requestAnimationFrame(() => {
          openSlashMenuRef.current?.(pos, {
            left: coords.left,
            right: coords.right,
            top: coords.top,
            bottom: coords.bottom,
          });
        });
        return true;
      },
    },
    onUpdate({ editor: currentEditor }) {
      const plainText = currentEditor.getText({ blockSeparator: "\n" });
      onChangeRef.current?.({
        document: toStoredJournalDocument(currentEditor.getJSON()),
        plainText,
        wordCount: countWords(plainText),
      });
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
    disabledRef.current = disabled;
    if (!disabled) {
      return;
    }
    pendingSelectionRef.current = null;
    const resetTask = window.setTimeout(() => {
      setCommandMenu(null);
      setOpenPanel(null);
    }, 0);
    return () => window.clearTimeout(resetTask);
  }, [disabled, editor]);

  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (currentEditor === null) {
        return null;
      }

      const plainText = currentEditor.getText({ blockSeparator: "\n" });
      const { $from } = currentEditor.state.selection;
      const currentBlockPos = $from.depth >= 1 ? $from.before(1) : null;
      const currentBlockType =
        currentBlockPos === null
          ? null
          : currentEditor.state.doc.nodeAt(currentBlockPos)?.type.name ?? null;

      return {
        bold: currentEditor.isActive("bold"),
        italic: currentEditor.isActive("italic"),
        heading2: currentEditor.isActive("heading", { level: 2 }),
        heading3: currentEditor.isActive("heading", { level: 3 }),
        bulletList: currentEditor.isActive("bulletList"),
        orderedList: currentEditor.isActive("orderedList"),
        blockquote: currentEditor.isActive("blockquote"),
        link: currentEditor.isActive("link"),
        selectionEmpty: currentEditor.state.selection.empty,
        canUndo: currentEditor.can().chain().undo().run(),
        canRedo: currentEditor.can().chain().redo().run(),
        currentBlockPos,
        currentBlockType,
        wordCount: countWords(plainText),
      };
    },
  });

  const openCommandMenuAt = useCallback(
    (
      mode: CommandMenuState["mode"],
      pos: number,
      anchor: MenuAnchor,
    ) => {
      if (editor === null || disabled) {
        return;
      }

      const node = editor.state.doc.nodeAt(pos);
      if (node === null) {
        return;
      }

      const blockIndex = editor.state.doc.resolve(pos).index(0);
      const position = getMenuPosition(anchor);
      setOpenPanel(null);
      setCommandMenu({
        mode,
        pos,
        nodeType: node.type.name,
        headingLevel:
          node.type.name === "heading" &&
          (node.attrs.level === 2 || node.attrs.level === 3)
            ? node.attrs.level
            : null,
        isFirst: blockIndex === 0,
        isLast: blockIndex >= editor.state.doc.childCount - 1,
        ...position,
      });
    },
    [disabled, editor],
  );

  useEffect(() => {
    openSlashMenuRef.current = (pos, anchor) => {
      openCommandMenuAt("slash", pos, anchor);
    };

    return () => {
      openSlashMenuRef.current = null;
    };
  }, [openCommandMenuAt]);

  useEffect(() => {
    if (commandMenu === null) {
      return;
    }

    const firstItem =
      commandMenuRef.current?.querySelector<HTMLButtonElement>(
        '[data-command-primary]:not(:disabled)',
      ) ??
      commandMenuRef.current?.querySelector<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      );
    firstItem?.focus();

    const closeOnPointerOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        (commandMenuRef.current?.contains(event.target) ||
          (event.target instanceof Element &&
            event.target.closest("[data-journal-block-trigger]")))
      ) {
        return;
      }
      setCommandMenu(null);
    };
    const closeOnViewportChange = () => setCommandMenu(null);
    const closeOnOuterScroll = (event: Event) => {
      if (
        event.target instanceof Node &&
        commandMenuRef.current?.contains(event.target)
      ) {
        return;
      }
      setCommandMenu(null);
    };

    document.addEventListener("pointerdown", closeOnPointerOutside);
    window.addEventListener("resize", closeOnViewportChange);
    document.addEventListener("scroll", closeOnOuterScroll, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerOutside);
      window.removeEventListener("resize", closeOnViewportChange);
      document.removeEventListener("scroll", closeOnOuterScroll, true);
    };
  }, [commandMenu]);

  useEffect(() => {
    if (openPanel === null) {
      return;
    }

    const firstField = panelRef.current?.querySelector<HTMLInputElement>(
      'input:not([type="hidden"])',
    );
    firstField?.focus();
  }, [openPanel]);

  const storeCurrentSelection = () => {
    if (editor === null) {
      return;
    }
    const { from, to } = editor.state.selection;
    pendingSelectionRef.current = { from, to };
  };

  const restorePendingSelection = () => {
    if (editor === null || pendingSelectionRef.current === null) {
      return;
    }

    const max = editor.state.doc.content.size;
    const from = Math.min(pendingSelectionRef.current.from, max);
    const to = Math.min(pendingSelectionRef.current.to, max);
    editor.commands.setTextSelection({ from, to });
  };

  const focusBlock = (pos: number) => {
    if (editor === null) {
      return false;
    }

    const node = editor.state.doc.nodeAt(pos);
    if (node === null) {
      return false;
    }

    const target = Math.min(pos + 1, editor.state.doc.content.size);
    const selection = node.isAtom
      ? NodeSelection.create(editor.state.doc, pos)
      : TextSelection.near(editor.state.doc.resolve(target), 1);
    editor.view.dispatch(editor.state.tr.setSelection(selection));
    editor.view.focus();
    return true;
  };

  const insertParagraphAfter = (pos: number) => {
    if (editor === null) {
      return null;
    }

    const node = editor.state.doc.nodeAt(pos);
    const paragraph = editor.state.schema.nodes.paragraph;
    if (node === null || paragraph === undefined) {
      return null;
    }

    const insertPos = pos + node.nodeSize;
    const transaction = editor.state.tr.insert(insertPos, paragraph.create());
    transaction.setSelection(
      TextSelection.near(transaction.doc.resolve(insertPos + 1), 1),
    );
    editor.view.dispatch(transaction);
    editor.view.focus();
    return insertPos;
  };

  const openAddMenu = (
    pos: number,
    anchor: MenuAnchor,
    mode: "add" | "slash" = "add",
  ) => {
    openCommandMenuAt(mode, pos, anchor);
  };

  const openInspector = (panel: Exclude<PanelName, null>, pos?: number) => {
    if (editor === null) {
      return;
    }
    if (pos !== undefined) {
      focusBlock(pos);
    }
    storeCurrentSelection();
    setCommandMenu(null);
    setOpenPanel(panel);
    setLinkError("");
    setMapError("");
    setImageMessage("");
  };

  const togglePanel = (panel: Exclude<PanelName, null>) => {
    if (openPanel === panel) {
      setOpenPanel(null);
      return;
    }
    openInspector(panel);
  };

  const closeInspectorAndReturnFocus = () => {
    pendingSelectionRef.current = null;
    setOpenPanel(null);
    window.setTimeout(() => editor?.commands.focus(), 0);
  };

  const runBlockCommand = (id: BlockCommandId, pos: number) => {
    if (editor === null) {
      return;
    }

    const targetPos = commandMenu?.mode === "add" ? insertParagraphAfter(pos) : pos;
    if (targetPos === null) {
      return;
    }

    if (id === "image" || id === "map") {
      openInspector(id, targetPos);
      return;
    }

    const node = editor.state.doc.nodeAt(targetPos);
    if (node === null || node.isAtom || !focusBlock(targetPos)) {
      return;
    }

    const chain = editor.chain().focus().clearNodes();
    if (id === "paragraph") chain.setParagraph().run();
    if (id === "heading2") chain.setHeading({ level: 2 }).run();
    if (id === "heading3") chain.setHeading({ level: 3 }).run();
    if (id === "blockquote") chain.setBlockquote().run();
    if (id === "bulletList") chain.toggleBulletList().run();
    if (id === "orderedList") chain.toggleOrderedList().run();
    setCommandMenu(null);
  };

  const moveBlock = (direction: "up" | "down", pos: number) => {
    if (editor === null) {
      return;
    }

    const { doc } = editor.state;
    const node = doc.nodeAt(pos);
    if (node === null) {
      return;
    }

    const index = doc.resolve(pos).index(0);
    if (direction === "up" && index === 0) {
      return;
    }
    if (direction === "down" && index >= doc.childCount - 1) {
      return;
    }

    const target =
      direction === "up"
        ? pos - doc.child(index - 1).nodeSize
        : pos + doc.child(index + 1).nodeSize;
    const transaction = editor.state.tr
      .delete(pos, pos + node.nodeSize)
      .insert(target, node);
    const selection = node.isAtom
      ? NodeSelection.create(transaction.doc, target)
      : TextSelection.near(transaction.doc.resolve(target + 1), 1);
    transaction.setSelection(selection);
    editor.view.dispatch(transaction);
    editor.view.focus();
    setCommandMenu(null);
  };

  const deleteBlock = (pos: number) => {
    if (editor === null) {
      return;
    }

    const { doc, schema } = editor.state;
    const node = doc.nodeAt(pos);
    const paragraph = schema.nodes.paragraph;
    if (node === null || paragraph === undefined) {
      return;
    }

    const transaction =
      doc.childCount === 1
        ? editor.state.tr.replaceWith(pos, pos + node.nodeSize, paragraph.create())
        : editor.state.tr.delete(pos, pos + node.nodeSize);
    const selectionPos = Math.min(pos + 1, transaction.doc.content.size);
    transaction.setSelection(
      TextSelection.near(transaction.doc.resolve(selectionPos), 1),
    );
    editor.view.dispatch(transaction);
    editor.view.focus();
    setCommandMenu(null);
  };

  const submitLink = () => {
    if (editor === null) {
      return;
    }

    const href = normalizeEditorialLink(linkValue);
    if (href === null) {
      setLinkError("Use an HTTPS address or an email link.");
      return;
    }

    restorePendingSelection();
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkError("");
    setLinkValue("");
    setOpenPanel(null);
    pendingSelectionRef.current = null;
  };

  const removeLink = () => {
    restorePendingSelection();
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkValue("");
    setOpenPanel(null);
    pendingSelectionRef.current = null;
  };

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    setImageStatus("idle");
    setImageMessage("");
  };

  const submitImage = async () => {
    if (imageUploadPendingRef.current || disabledRef.current) {
      return;
    }
    if (editor === null || imageFile === null || onImageUpload === undefined) {
      setImageStatus("error");
      setImageMessage("Choose an image before uploading.");
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.has(imageFile.type) || imageFile.size > MAX_IMAGE_BYTES) {
      setImageStatus("error");
      setImageMessage("Use an AVIF, JPEG, PNG, or WebP image no larger than 10 MB.");
      return;
    }
    if (imageAlt.trim().length < 3 || imageAlt.trim().length > 240) {
      setImageStatus("error");
      setImageMessage("Write concise alternative text between 3 and 240 characters.");
      return;
    }

    imageUploadPendingRef.current = true;
    setImageStatus("uploading");
    setImageMessage("Uploading image…");

    try {
      const alt = imageAlt.trim();
      const caption = imageCaption.trim();
      const uploaded = await onImageUpload(imageFile, {
        alt,
        ...(caption.length === 0 ? {} : { caption }),
      });
      if (disabledRef.current) {
        throw new Error(
          "The story changed state while the image uploaded. Reopen Image to insert it.",
        );
      }
      const publicUrl = new URL(uploaded.publicUrl);
      if (publicUrl.protocol !== "https:" || publicUrl.hostname !== allowedMediaHost) {
        throw new Error("The uploaded image did not return the approved media domain.");
      }

      restorePendingSelection();
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: {
            src: publicUrl.toString(),
            alt,
            mediaId: uploaded.mediaId,
            caption: caption || null,
          },
        })
        .run();

      setImageFile(null);
      setImageAlt("");
      setImageCaption("");
      setImageStatus("idle");
      setImageMessage("Image added to the story.");
      setOpenPanel(null);
      pendingSelectionRef.current = null;
    } catch (error) {
      setImageStatus("error");
      setImageMessage(
        error instanceof Error ? error.message : "The image could not be uploaded.",
      );
    } finally {
      imageUploadPendingRef.current = false;
    }
  };

  const submitMap = () => {
    if (editor === null) {
      return;
    }

    const label = mapDraft.label.trim();
    const latitudeInput = mapDraft.latitude.trim();
    const longitudeInput = mapDraft.longitude.trim();
    const latitude = Number(latitudeInput);
    const longitude = Number(longitudeInput);
    const zoom = Number(mapDraft.zoom);

    if (
      label.length < 2 ||
      label.length > 120 ||
      latitudeInput.length === 0 ||
      longitudeInput.length === 0 ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180 ||
      !Number.isInteger(zoom) ||
      zoom < 1 ||
      zoom > 20
    ) {
      setMapError("Add a place name, valid coordinates, and a zoom level from 1 to 20.");
      return;
    }

    restorePendingSelection();
    editor
      .chain()
      .focus()
      .insertMapEmbed({ label, latitude, longitude, zoom })
      .run();
    setMapDraft({ label: "", latitude: "", longitude: "", zoom: "14" });
    setMapError("");
    setOpenPanel(null);
    pendingSelectionRef.current = null;
  };

  const toolbarDisabled = disabled || editor === null;

  function handlePanelEnter(
    event: KeyboardEvent<HTMLDivElement>,
    submit: () => void | Promise<void>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeInspectorAndReturnFocus();
      return;
    }
    if (event.key !== "Enter" || event.defaultPrevented) {
      return;
    }
    if (event.nativeEvent.isComposing) {
      event.preventDefault();
      return;
    }
    if (!(event.target instanceof HTMLInputElement) || event.target.type === "file") {
      return;
    }
    event.preventDefault();
    void submit();
  }

  const handleCommandMenuKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      commandMenuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "Escape") {
      event.preventDefault();
      setCommandMenu(null);
      editor?.commands.focus();
      return;
    }
    if (event.key === "Tab") {
      setCommandMenu(null);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    if (items.length === 0) return;
    if (event.key === "Home") items[0]?.focus();
    if (event.key === "End") items.at(-1)?.focus();
    if (event.key === "ArrowDown") {
      items[(currentIndex + 1 + items.length) % items.length]?.focus();
    }
    if (event.key === "ArrowUp") {
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    }
  };

  const renderPanel = () => {
    if (openPanel === null || disabled) {
      return null;
    }

    if (openPanel === "link") {
      return (
        <div
          ref={panelRef}
          className={styles.insertPanel}
          role="group"
          aria-labelledby={`${editorId}-link-panel-title`}
          onKeyDown={(event) => handlePanelEnter(event, submitLink)}
        >
          <div className={styles.insertPanelHeading}>
            <div>
              <strong id={`${editorId}-link-panel-title`}>Add a link</strong>
              <span>Select the words first, then add their destination.</span>
            </div>
            <button type="button" onClick={closeInspectorAndReturnFocus} aria-label="Close link panel">
              <XMarkIcon width={20} height={20} aria-hidden />
            </button>
          </div>
          <label>
            Destination
            <input
              type="text"
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              placeholder="https://example.org/story"
              aria-describedby={linkError ? `${editorId}-link-error` : undefined}
            />
          </label>
          {linkError ? (
            <p id={`${editorId}-link-error`} className={styles.formError} role="alert">
              {linkError}
            </p>
          ) : null}
          <div className={styles.panelActions}>
            <button type="button" onClick={submitLink}>Apply link</button>
            <button type="button" onClick={removeLink} disabled={!editorState?.link}>
              Remove current link
            </button>
          </div>
        </div>
      );
    }

    if (openPanel === "image") {
      return (
        <div
          ref={panelRef}
          className={styles.insertPanel}
          role="group"
          aria-labelledby={`${editorId}-image-panel-title`}
          onKeyDown={(event) => handlePanelEnter(event, submitImage)}
        >
          <div className={styles.insertPanelHeading}>
            <div>
              <strong id={`${editorId}-image-panel-title`}>Add an image</strong>
              <span>Upload reviewed media with useful alternative text.</span>
            </div>
            <button type="button" onClick={closeInspectorAndReturnFocus} aria-label="Close image panel">
              <XMarkIcon width={20} height={20} aria-hidden />
            </button>
          </div>
          <label htmlFor={imageInputId}>
            Image file
            <input
              id={imageInputId}
              type="file"
              accept="image/avif,image/jpeg,image/png,image/webp"
              onChange={selectImage}
            />
          </label>
          <div className={styles.panelFieldGrid}>
            <label>
              Alternative text
              <input
                type="text"
                value={imageAlt}
                maxLength={240}
                onChange={(event) => setImageAlt(event.target.value)}
              />
            </label>
            <label>
              Caption <span>Optional</span>
              <input
                type="text"
                value={imageCaption}
                maxLength={240}
                onChange={(event) => setImageCaption(event.target.value)}
              />
            </label>
          </div>
          <div className={styles.panelActions}>
            <button
              type="button"
              disabled={imageStatus === "uploading"}
              onClick={() => void submitImage()}
            >
              {imageStatus === "uploading" ? "Uploading…" : "Upload and insert"}
            </button>
          </div>
          <p
            className={imageStatus === "error" ? styles.formError : styles.formStatus}
            role={imageStatus === "error" ? "alert" : "status"}
          >
            {imageMessage}
          </p>
        </div>
      );
    }

    return (
      <div
        ref={panelRef}
        className={styles.insertPanel}
        role="group"
        aria-labelledby={`${editorId}-map-panel-title`}
        onKeyDown={(event) => handlePanelEnter(event, submitMap)}
      >
        <div className={styles.insertPanelHeading}>
          <div>
            <strong id={`${editorId}-map-panel-title`}>Add a map</strong>
            <span>Add a place with coordinates. Embed code is never stored.</span>
          </div>
          <button type="button" onClick={closeInspectorAndReturnFocus} aria-label="Close map panel">
            <XMarkIcon width={20} height={20} aria-hidden />
          </button>
        </div>
        <label>
          Place name
          <input
            type="text"
            value={mapDraft.label}
            maxLength={120}
            onChange={(event) =>
              setMapDraft((current) => ({ ...current, label: event.target.value }))
            }
          />
        </label>
        <div className={styles.mapFieldGrid}>
          <label>
            Latitude
            <input
              type="number"
              min="-90"
              max="90"
              step="any"
              value={mapDraft.latitude}
              onChange={(event) =>
                setMapDraft((current) => ({ ...current, latitude: event.target.value }))
              }
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              min="-180"
              max="180"
              step="any"
              value={mapDraft.longitude}
              onChange={(event) =>
                setMapDraft((current) => ({ ...current, longitude: event.target.value }))
              }
            />
          </label>
          <label>
            Zoom
            <input
              type="number"
              min="1"
              max="20"
              step="1"
              value={mapDraft.zoom}
              onChange={(event) =>
                setMapDraft((current) => ({ ...current, zoom: event.target.value }))
              }
            />
          </label>
        </div>
        {mapError ? <p className={styles.formError} role="alert">{mapError}</p> : null}
        <div className={styles.panelActions}>
          <button type="button" onClick={submitMap}>Insert map</button>
        </div>
      </div>
    );
  };

  const menuStyle = commandMenu
    ? ({ left: commandMenu.left, top: commandMenu.top } satisfies CSSProperties)
    : undefined;
  const activeBlockIsAtom =
    commandMenu?.mode === "block" &&
    (commandMenu.nodeType === "image" || commandMenu.nodeType === "map");

  return (
    <div className={styles.editorShell}>
      {editor !== null ? (
        <DragHandle
          editor={editor}
          className={styles.dragHandlePortal}
          computePositionConfig={{ placement: "left-start", strategy: "fixed" }}
          onNodeChange={({ node, pos }) => {
            if (node !== null) setHoveredBlockPos(pos);
          }}
        >
          <div className={styles.blockGutter} aria-label="Block controls">
            <button
              type="button"
              draggable={false}
              data-journal-block-trigger
              aria-label="Add block after"
              title="Add block after"
              disabled={toolbarDisabled || hoveredBlockPos === null}
              onDragStart={(event) => event.preventDefault()}
              onClick={(event) => {
                if (hoveredBlockPos === null) return;
                openAddMenu(hoveredBlockPos, event.currentTarget.getBoundingClientRect());
              }}
            >
              <PlusIcon width={18} height={18} aria-hidden />
            </button>
            <button
              type="button"
              data-journal-block-trigger
              aria-label="Drag block or open block options"
              title="Drag block or open block options"
              disabled={toolbarDisabled || hoveredBlockPos === null}
              onClick={(event) => {
                if (hoveredBlockPos === null) return;
                openCommandMenuAt(
                  "block",
                  hoveredBlockPos,
                  event.currentTarget.getBoundingClientRect(),
                );
              }}
            >
              <Bars2Icon width={18} height={18} aria-hidden />
            </button>
          </div>
        </DragHandle>
      ) : null}

      {editor !== null ? (
        <BubbleMenu
          editor={editor}
          className={styles.inlineToolbar}
          options={{ placement: "top", strategy: "fixed" }}
          shouldShow={({ editor: menuEditor, from, to }) =>
            menuEditor.isEditable &&
            from !== to &&
            !menuEditor.isActive("image") &&
            !menuEditor.isActive("map")
          }
        >
          <div role="toolbar" aria-label="Text formatting">
            <ToolbarButton
              label="Bold"
              icon={<BoldIcon width={19} height={19} aria-hidden />}
              active={editorState?.bold ?? false}
              disabled={toolbarDisabled}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              label="Italic"
              icon={<ItalicIcon width={19} height={19} aria-hidden />}
              active={editorState?.italic ?? false}
              disabled={toolbarDisabled}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              label="Link"
              icon={<LinkIcon width={19} height={19} aria-hidden />}
              active={editorState?.link ?? false}
              disabled={toolbarDisabled}
              onClick={() => openInspector("link")}
            />
          </div>
        </BubbleMenu>
      ) : null}

      {renderPanel()}

      {commandMenu !== null && !disabled ? (
        <div
          ref={commandMenuRef}
          className={styles.blockMenu}
          style={menuStyle}
          role="menu"
          aria-label={commandMenu.mode === "block" ? "Block options" : "Add a block"}
          onKeyDown={handleCommandMenuKeys}
        >
          <header>
            <div>
              <strong>{commandMenu.mode === "block" ? "Block options" : "Add a block"}</strong>
              <span>
                {commandMenu.mode === "slash"
                  ? "Choose what this line becomes."
                  : "Change the current block or insert media."}
              </span>
            </div>
            <button
              type="button"
              role="menuitem"
              aria-label="Close block menu"
              onClick={() => {
                setCommandMenu(null);
                editor?.commands.focus();
              }}
            >
              <XMarkIcon width={18} height={18} aria-hidden />
            </button>
          </header>

          {!activeBlockIsAtom ? (
            <div className={styles.blockCommandGrid}>
              {BLOCK_COMMANDS.map((command) => {
                const Icon = command.icon;
                const active =
                  commandMenu.mode !== "add" &&
                  (command.id === "heading2"
                    ? commandMenu.headingLevel === 2
                    : command.id === "heading3"
                      ? commandMenu.headingLevel === 3
                      : command.nodeType === commandMenu.nodeType);
                return (
                  <button
                    key={command.id}
                    type="button"
                    role="menuitem"
                    data-command-primary
                    data-active={active ? "true" : "false"}
                    aria-current={active ? true : undefined}
                    onClick={() => runBlockCommand(command.id, commandMenu.pos)}
                  >
                    <Icon width={20} height={20} aria-hidden />
                    <span>
                      <strong>{command.label}</strong>
                      <small>{command.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className={styles.atomBlockNote}>
              This media block can be moved or removed. Add another block for text.
            </p>
          )}

          {commandMenu.mode === "block" ? (
            <footer>
              <button
                type="button"
                role="menuitem"
                disabled={commandMenu.isFirst}
                onClick={() => moveBlock("up", commandMenu.pos)}
              >
                <ArrowUpIcon width={18} height={18} aria-hidden />
                Move up
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={commandMenu.isLast}
                onClick={() => moveBlock("down", commandMenu.pos)}
              >
                <ArrowDownIcon width={18} height={18} aria-hidden />
                Move down
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.deleteBlockButton}
                onClick={() => deleteBlock(commandMenu.pos)}
              >
                <TrashIcon width={18} height={18} aria-hidden />
                Delete block
              </button>
            </footer>
          ) : null}
        </div>
      ) : null}

      {editor !== null ? (
        <div className={styles.mobileBlockBar} role="toolbar" aria-label="Current block controls">
          <ToolbarButton
            label="Add block after current"
            icon={<PlusIcon width={20} height={20} aria-hidden />}
            disabled={toolbarDisabled || editorState?.currentBlockPos === null}
            onClick={(event) => {
              const pos = editorState?.currentBlockPos;
              if (pos === null || pos === undefined) return;
              openAddMenu(pos, event.currentTarget.getBoundingClientRect());
            }}
          />
          <ToolbarButton
            label="Open current block options"
            icon={<DocumentTextIcon width={20} height={20} aria-hidden />}
            disabled={toolbarDisabled || editorState?.currentBlockPos === null}
            onClick={(event) => {
              const pos = editorState?.currentBlockPos;
              if (pos === null || pos === undefined) return;
              openCommandMenuAt("block", pos, event.currentTarget.getBoundingClientRect());
            }}
          />
          <ToolbarButton
            label="Bold"
            icon={<BoldIcon width={20} height={20} aria-hidden />}
            active={editorState?.bold ?? false}
            disabled={toolbarDisabled}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="Italic"
            icon={<ItalicIcon width={20} height={20} aria-hidden />}
            active={editorState?.italic ?? false}
            disabled={toolbarDisabled}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="Link"
            icon={<LinkIcon width={20} height={20} aria-hidden />}
            active={openPanel === "link" || (editorState?.link ?? false)}
            disabled={
              toolbarDisabled ||
              ((editorState?.selectionEmpty ?? true) && !(editorState?.link ?? false))
            }
            onClick={() => togglePanel("link")}
          />
          <ToolbarButton
            label="Undo"
            icon={<ArrowUturnLeftIcon width={20} height={20} aria-hidden />}
            disabled={toolbarDisabled || !(editorState?.canUndo ?? false)}
            onClick={() => editor.chain().focus().undo().run()}
          />
          <ToolbarButton
            label="Redo"
            icon={<ArrowUturnRightIcon width={20} height={20} aria-hidden />}
            disabled={toolbarDisabled || !(editorState?.canRedo ?? false)}
            onClick={() => editor.chain().focus().redo().run()}
          />
        </div>
      ) : null}

      <div className={styles.editorCanvas} data-disabled={disabled ? "true" : "false"}>
        {editor === null ? (
          <p className={styles.editorLoading} role="status">Preparing the editor…</p>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </div>
  );
}
