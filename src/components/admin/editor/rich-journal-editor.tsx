"use client";

import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Bars3BottomLeftIcon,
  BoldIcon,
  ChatBubbleBottomCenterTextIcon,
  H2Icon,
  H3Icon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  MapPinIcon,
  NumberedListIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { JSONContent } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
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

const JournalImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: { default: null, rendered: false },
      caption: { default: null, rendered: false },
    };
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

type PanelName = "image" | "link" | "map" | null;

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
  const content = node.content?.map(toStoredJournalDocument);

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
    if (candidate !== undefined) {
      try {
        const url = new URL(candidate);
        if (url.protocol === "https:" && url.hostname === allowedMediaHost) {
          return {
            ...node,
            attrs: { ...node.attrs, src: url.toString() },
          };
        }
      } catch {
        // Keep the stored media reference; the canvas can still show its alt text.
      }
    }
  }

  return {
    ...node,
    ...(content === undefined ? {} : { content }),
  };
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
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.toolbarButton}
      data-active={active ? "true" : "false"}
      aria-pressed={active === undefined ? undefined : active}
      aria-label={label}
      title={label}
      disabled={disabled}
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
  allowedMediaHost = "r2.mukhtada.my.id",
  disabled = false,
}: RichJournalEditorProps) {
  const editorId = useId();
  const imageInputId = useId();
  const onChangeRef = useRef(onChange);
  const imageUploadPendingRef = useRef(false);
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
        protocols: ["https", "mailto"],
      }),
      JournalImage.configure({ allowBase64: false, inline: false }),
      Placeholder.configure({
        placeholder:
          "Start with the scene, detail, or question that matters.",
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
  }, [disabled, editor]);

  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (currentEditor === null) {
        return null;
      }

      const plainText = currentEditor.getText({ blockSeparator: "\n" });
      return {
        bold: currentEditor.isActive("bold"),
        italic: currentEditor.isActive("italic"),
        heading2: currentEditor.isActive("heading", { level: 2 }),
        heading3: currentEditor.isActive("heading", { level: 3 }),
        bulletList: currentEditor.isActive("bulletList"),
        orderedList: currentEditor.isActive("orderedList"),
        blockquote: currentEditor.isActive("blockquote"),
        link: currentEditor.isActive("link"),
        canUndo: currentEditor.can().chain().undo().run(),
        canRedo: currentEditor.can().chain().redo().run(),
        wordCount: countWords(plainText),
      };
    },
  });

  const togglePanel = (panel: Exclude<PanelName, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel));
    setLinkError("");
    setMapError("");
    setImageMessage("");
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

    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkError("");
    setLinkValue("");
    setOpenPanel(null);
  };

  const removeLink = () => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkValue("");
    setOpenPanel(null);
  };

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    setImageStatus("idle");
    setImageMessage("");
  };

  const submitImage = async () => {
    if (imageUploadPendingRef.current) {
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
      const publicUrl = new URL(uploaded.publicUrl);
      if (publicUrl.protocol !== "https:" || publicUrl.hostname !== allowedMediaHost) {
        throw new Error("The uploaded image did not return the approved media domain.");
      }

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
    const latitude = Number(mapDraft.latitude);
    const longitude = Number(mapDraft.longitude);
    const zoom = Number(mapDraft.zoom);

    if (
      label.length < 2 ||
      label.length > 120 ||
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

    editor
      .chain()
      .focus()
      .insertMapEmbed({ label, latitude, longitude, zoom })
      .run();
    setMapDraft({ label: "", latitude: "", longitude: "", zoom: "14" });
    setMapError("");
    setOpenPanel(null);
  };

  const toolbarDisabled = disabled || editor === null;

  function handlePanelEnter(
    event: KeyboardEvent<HTMLDivElement>,
    submit: () => void | Promise<void>,
  ) {
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

  return (
    <section className={styles.editorShell} aria-labelledby={`${editorId}-label`}>
      <div className={styles.editorHeading}>
        <div>
          <p>Story body</p>
          <h2 id={`${editorId}-label`}>Write for the reading room</h2>
        </div>
        <p aria-live="polite">
          {editorState?.wordCount ?? 0} {(editorState?.wordCount ?? 0) === 1 ? "word" : "words"}
        </p>
      </div>

      <div className={styles.toolbar} role="toolbar" aria-label="Journal formatting">
        <div className={styles.toolbarGroup}>
          <ToolbarButton
            label="Heading 2"
            icon={<H2Icon width={20} height={20} aria-hidden />}
            active={editorState?.heading2 ?? false}
            disabled={toolbarDisabled}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            label="Heading 3"
            icon={<H3Icon width={20} height={20} aria-hidden />}
            active={editorState?.heading3 ?? false}
            disabled={toolbarDisabled}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <ToolbarButton
            label="Paragraph"
            icon={<Bars3BottomLeftIcon width={20} height={20} aria-hidden />}
            active={editor?.isActive("paragraph") ?? false}
            disabled={toolbarDisabled}
            onClick={() => editor?.chain().focus().setParagraph().run()}
          />
        </div>

        <div className={styles.toolbarGroup}>
          <ToolbarButton
            label="Bold"
            icon={<BoldIcon width={20} height={20} aria-hidden />}
            active={editorState?.bold ?? false}
            disabled={toolbarDisabled}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="Italic"
            icon={<ItalicIcon width={20} height={20} aria-hidden />}
            active={editorState?.italic ?? false}
            disabled={toolbarDisabled}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="Link"
            icon={<LinkIcon width={20} height={20} aria-hidden />}
            active={openPanel === "link" || (editorState?.link ?? false)}
            disabled={toolbarDisabled}
            onClick={() => togglePanel("link")}
          />
        </div>

        <div className={styles.toolbarGroup}>
          <ToolbarButton
            label="Bullet list"
            icon={<ListBulletIcon width={20} height={20} aria-hidden />}
            active={editorState?.bulletList ?? false}
            disabled={toolbarDisabled}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="Numbered list"
            icon={<NumberedListIcon width={20} height={20} aria-hidden />}
            active={editorState?.orderedList ?? false}
            disabled={toolbarDisabled}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            label="Quote"
            icon={<ChatBubbleBottomCenterTextIcon width={20} height={20} aria-hidden />}
            active={editorState?.blockquote ?? false}
            disabled={toolbarDisabled}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          />
        </div>

        <div className={styles.toolbarGroup}>
          <ToolbarButton
            label="Add image"
            icon={<PhotoIcon width={20} height={20} aria-hidden />}
            active={openPanel === "image"}
            disabled={toolbarDisabled || onImageUpload === undefined}
            onClick={() => togglePanel("image")}
          />
          <ToolbarButton
            label="Add map"
            icon={<MapPinIcon width={20} height={20} aria-hidden />}
            active={openPanel === "map"}
            disabled={toolbarDisabled}
            onClick={() => togglePanel("map")}
          />
        </div>

        <div className={styles.toolbarGroup}>
          <ToolbarButton
            label="Undo"
            icon={<ArrowUturnLeftIcon width={20} height={20} aria-hidden />}
            disabled={toolbarDisabled || !(editorState?.canUndo ?? false)}
            onClick={() => editor?.chain().focus().undo().run()}
          />
          <ToolbarButton
            label="Redo"
            icon={<ArrowUturnRightIcon width={20} height={20} aria-hidden />}
            disabled={toolbarDisabled || !(editorState?.canRedo ?? false)}
            onClick={() => editor?.chain().focus().redo().run()}
          />
        </div>
      </div>

      {openPanel === "link" ? (
        <div
          className={styles.insertPanel}
          role="group"
          aria-labelledby={`${editorId}-link-panel-title`}
          onKeyDown={(event) => handlePanelEnter(event, submitLink)}
        >
          <div className={styles.insertPanelHeading}>
            <div>
              <strong id={`${editorId}-link-panel-title`}>Add a link</strong>
              <span>Select text first, then enter its destination.</span>
            </div>
            <button type="button" onClick={() => setOpenPanel(null)} aria-label="Close link panel">
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
      ) : null}

      {openPanel === "image" ? (
        <div
          className={styles.insertPanel}
          role="group"
          aria-labelledby={`${editorId}-image-panel-title`}
          onKeyDown={(event) => handlePanelEnter(event, submitImage)}
        >
          <div className={styles.insertPanelHeading}>
            <div>
              <strong id={`${editorId}-image-panel-title`}>Add an image</strong>
              <span>The file is stored in the club&apos;s R2 media library.</span>
            </div>
            <button type="button" onClick={() => setOpenPanel(null)} aria-label="Close image panel">
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
      ) : null}

      {openPanel === "map" ? (
        <div
          className={styles.insertPanel}
          role="group"
          aria-labelledby={`${editorId}-map-panel-title`}
          onKeyDown={(event) => handlePanelEnter(event, submitMap)}
        >
          <div className={styles.insertPanelHeading}>
            <div>
              <strong id={`${editorId}-map-panel-title`}>Add a map</strong>
              <span>Store a place and coordinates, never pasted embed code.</span>
            </div>
            <button type="button" onClick={() => setOpenPanel(null)} aria-label="Close map panel">
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
      ) : null}

      <div className={styles.editorCanvas} data-disabled={disabled ? "true" : "false"}>
        {editor === null ? (
          <p className={styles.editorLoading} role="status">Preparing the editor…</p>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </section>
  );
}
