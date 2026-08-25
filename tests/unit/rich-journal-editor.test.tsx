import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormEvent } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { RichJournalEditor } from "@/components/admin/editor/rich-journal-editor";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: () => ({}),
    }),
  });
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }),
  });
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () =>
      document.activeElement instanceof Element
        ? document.activeElement
        : document.body,
  });
});

afterEach(cleanup);

describe("RichJournalEditor", () => {
  it("exposes a labelled editor and reports structured changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichJournalEditor onChange={onChange} />);

    const editor = await screen.findByRole("textbox", { name: "Journal body" });
    await user.click(editor);
    await user.type(editor, "A room learns by listening.");

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        plainText: "A room learns by listening.",
        wordCount: 5,
        document: expect.objectContaining({ type: "doc" }),
      }),
    );
  });

  it("inserts a bounded map node without accepting embed HTML", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichJournalEditor onChange={onChange} />);
    await screen.findByRole("textbox", { name: "Journal body" });

    await user.click(screen.getByRole("button", { name: "Add map" }));
    await user.type(screen.getByRole("textbox", { name: "Place name" }), "UPA Language Room");
    await user.type(screen.getByRole("spinbutton", { name: "Latitude" }), "-6.20000");
    await user.type(screen.getByRole("spinbutton", { name: "Longitude" }), "106.81667");
    await user.click(screen.getByRole("button", { name: "Insert map" }));

    expect(await screen.findByText("UPA Language Room")).toBeVisible();
    expect(document.querySelector("[data-map-embed]")).not.toBeNull();
    expect(document.body.innerHTML).not.toContain("<iframe");
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({ type: "map" }),
            ]),
          }),
        }),
      ),
    );
  });

  it("uploads approved image files and inserts only the approved media host", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onImageUpload = vi.fn().mockResolvedValue({
      mediaId: "media_01jvroomlistening",
      publicUrl: "https://r2.mukhtada.my.id/journal/2026/room-listening-v1.webp",
    });
    render(<RichJournalEditor onChange={onChange} onImageUpload={onImageUpload} />);
    await screen.findByRole("textbox", { name: "Journal body" });

    await user.click(screen.getByRole("button", { name: "Add image" }));
    const file = new File([new Uint8Array([1, 2, 3])], "room.webp", {
      type: "image/webp",
    });
    await user.upload(screen.getByLabelText("Image file"), file);
    await user.type(
      screen.getByRole("textbox", { name: "Alternative text" }),
      "Members listening around a shared table",
    );
    await user.type(
      screen.getByRole("textbox", { name: /^Caption/ }),
      "A listening practice session",
    );
    await user.click(screen.getByRole("button", { name: "Upload and insert" }));

    await waitFor(() =>
      expect(onImageUpload).toHaveBeenCalledWith(file, {
        alt: "Members listening around a shared table",
        caption: "A listening practice session",
      }),
    );
    const image = await screen.findByAltText("Members listening around a shared table");
    expect(image).toHaveAttribute(
      "src",
      "https://r2.mukhtada.my.id/journal/2026/room-listening-v1.webp",
    );
    await waitFor(() => {
      const lastChange = onChange.mock.calls.at(-1)?.[0];
      const imageNode = lastChange?.document?.content?.find(
        (node: { type?: string }) => node.type === "image",
      );
      expect(imageNode).toEqual({
        type: "image",
        attrs: {
          mediaId: "media_01jvroomlistening",
          alt: "Members listening around a shared table",
          caption: "A listening practice session",
        },
      });
    });
  });

  it("ignores IME Enter and prevents duplicate image uploads while one is pending", async () => {
    const user = userEvent.setup();
    let releaseUpload: (() => void) | undefined;
    const uploadGate = new Promise<void>((resolve) => {
      releaseUpload = resolve;
    });
    const onImageUpload = vi.fn(async () => {
      await uploadGate;
      return {
        mediaId: "media_01jtouchgate",
        publicUrl: "https://r2.mukhtada.my.id/journal/2026/touch-gate.webp",
      };
    });

    render(<RichJournalEditor onImageUpload={onImageUpload} />);
    await screen.findByRole("textbox", { name: "Journal body" });
    await user.click(screen.getByRole("button", { name: "Add image" }));
    await user.upload(
      screen.getByLabelText("Image file"),
      new File([new Uint8Array([1, 2, 3])], "touch-gate.webp", {
        type: "image/webp",
      }),
    );
    const alt = screen.getByRole("textbox", { name: "Alternative text" });
    await user.type(alt, "Members sharing a listening prompt");

    fireEvent.keyDown(alt, { key: "Enter", isComposing: true });
    expect(onImageUpload).not.toHaveBeenCalled();

    await user.keyboard("{Enter}{Enter}");
    await waitFor(() => expect(onImageUpload).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Uploading…" })).toBeDisabled();

    releaseUpload?.();
    expect(
      await screen.findByAltText("Members sharing a listening prompt"),
    ).toBeVisible();
  });

  it("rejects insecure editorial links", async () => {
    const user = userEvent.setup();
    render(<RichJournalEditor />);
    await screen.findByRole("textbox", { name: "Journal body" });

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByRole("textbox", { name: "Destination" }), "http://example.com");
    await user.click(screen.getByRole("button", { name: "Apply link" }));

    expect(
      screen.getByText("Use an HTTPS address or an email link.")
    ).toHaveAttribute("role", "alert");
  });

  it("keeps insertion panels valid inside the story form and contains Enter", async () => {
    const user = userEvent.setup();
    const submitStory = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    render(
      <form aria-label="Story revision" onSubmit={submitStory}>
        <RichJournalEditor />
      </form>,
    );
    await screen.findByRole("textbox", { name: "Journal body" });

    await user.click(screen.getByRole("button", { name: "Link" }));
    const panel = screen.getByRole("group", { name: "Add a link" });
    expect(panel.tagName).toBe("DIV");
    expect(panel.querySelector("form")).toBeNull();

    const destination = screen.getByRole("textbox", { name: "Destination" });
    fireEvent.keyDown(destination, { key: "Enter", isComposing: true });
    expect(submitStory).not.toHaveBeenCalled();

    await user.type(destination, "http://example.com");
    await user.keyboard("{Enter}");

    expect(
      screen.getByText("Use an HTTPS address or an email link."),
    ).toHaveAttribute("role", "alert");
    expect(submitStory).not.toHaveBeenCalled();
  });

  it("offers only the heading levels accepted by the journal backend", async () => {
    render(<RichJournalEditor />);
    await screen.findByRole("textbox", { name: "Journal body" });

    expect(screen.getByRole("button", { name: "Heading 2" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Heading 3" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Heading 1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Code block" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Divider" })).toBeNull();
  });
});
