# Admin journal block editor

Last updated: 26 August 2026

## Why this changed

The previous journal workspace treated writing as a form field inside a bordered admin card. The title, excerpt, metadata, toolbar, and body competed for attention. On a wide screen, the body looked like an empty input box rather than a page. On a phone, the permanent toolbar used much of the available width before the writer had entered a sentence.

The revised workspace separates two kinds of work:

- writing happens on an open editorial page;
- publishing controls, metadata, uploads, and lifecycle actions remain explicit administration tools.

The visual evidence for the original problem is the user-supplied screenshot `codex-clipboard-59956093-3f62-4e87-9675-44933ab44f12.png`. It shows the body surrounded by a heavy section card and a full-width toolbar, with a second card around the story metadata.

## Research ledger

Only primary product documentation informed the interaction model.

| Source | Observed capability | Decision for English Club |
| --- | --- | --- |
| [Tiptap Drag Handle](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle) | A handle follows the active block and can expose block controls without placing them in the document. | Use the official React drag-handle extension for the desktop block gutter. |
| [Tiptap slash dropdown menu](https://tiptap.dev/docs/ui-components/components/slash-dropdown-menu) | An empty line can open a contextual block command menu. | `/` opens the same data-driven command set as the block handle. The slash character is not stored. |
| [Tiptap Bubble Menu](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu) | Inline formatting can follow a text selection. | Bold, italic, and link appear only when relevant on desktop. |
| [BlockNote side menu](https://www.blocknotejs.org/docs/react/components/side-menu) | Block-level add and drag actions can live beside each block. | The per-block add/handle model is useful, but a BlockNote migration is not: it would replace the established Tiptap JSON and media contract. |
| [Editor.js block tools](https://editorjs.io/tools-api/) and [Block Tunes](https://editorjs.io/block-tunes-api/) | A block can have insertion tools and block-specific actions. | Preserve the concept, not the library. Tiptap already handles the stored document and custom map/image nodes. |

## Product decision

The editor remains Tiptap. Replacing it with Editor.js or BlockNote would add a second document model, require a content migration, and put existing Convex revisions at risk. The interface changes around the existing allowlisted JSON instead:

1. The title and standfirst are unboxed, auto-growing text areas.
2. Slug, category, author, and featured placement sit inside a collapsible Story settings row.
3. The article body is a continuous 50rem reading column with no enclosing border, radius, or shadow.
4. Desktop writers get a contextual plus button and drag handle beside the active block.
5. Touch devices get a sticky current-block toolbar with 44px controls.
6. Selecting text opens a small inline formatting menu.
7. Link, image, and map details use focused inspector surfaces; those operational controls may be bounded because they are not the writing page.

## Block contract

The command registry is one data structure shared by slash and block menus. It contains only nodes accepted by the journal backend:

- paragraph;
- heading level 2;
- heading level 3;
- block quote;
- bullet list;
- numbered list;
- reviewed R2 image;
- coordinate-based map note.

Heading level 1, raw HTML, code blocks, dividers, iframe embeds, arbitrary image URLs, and pasted base64 images are not available.

### Add

- Typing `/` in an empty paragraph opens Add a block.
- Pressing the plus control beside a block opens the same menu for an insertion after that block.
- Opening and closing the menu does not create an empty paragraph. A new block is created only after the writer chooses a command.

### Change

- The handle menu converts the current text block in place.
- Selecting an image or map opens its inspector at the chosen insertion point.
- The selected block remains the source of truth while an inspector has focus.

### Arrange

- The block menu exposes Move up, Move down, and Delete block.
- Deleting the only block replaces it with one valid empty paragraph, so the document can never become structurally empty.
- The official drag handle supports pointer reordering on desktop.

### Format

- Bold and italic operate on the current selection.
- Links accept `https:` and `mailto:` only.
- Pasted HTTP and relative links are kept as text rather than becoming invalid marks.
- The link control is unavailable at a collapsed caret unless the caret is already inside a link.
- The inline formatting menu is hidden on coarse pointers; equivalent controls remain in the touch toolbar.

### Media

- Images must be AVIF, JPEG, PNG, or WebP and no larger than 10 MiB.
- Upload remains locked against duplicate Enter/tap submission.
- Stored image nodes contain `mediaId`, alt text, and optional caption. They never persist `src`.
- Preview URLs are accepted only from `https://r2.mukhtada.my.id`.
- Pasted HTML images, Markdown image input rules, base64 images, and remote tracking URLs cannot create image nodes or trigger previews.
- If the workspace enters a save-disabled state while an upload is in flight, the late upload cannot mutate the saved document.
- A map stores label, latitude, longitude, and zoom. Blank coordinates are rejected rather than coerced to `0,0`.

### Storage compatibility

Tiptap legitimately represents an empty paragraph or heading without a `content` property. The client normalizes those text containers to `content: []` before serialization, and the Convex validator also canonicalizes the standard Tiptap shape. Empty drafts, trailing paragraphs, and an empty heading therefore remain valid without weakening the document allowlist.

## Keyboard and touch behavior

| Input | Result |
| --- | --- |
| `/` on an empty paragraph | Open Add a block without inserting `/`; ignore the key during IME composition. |
| Arrow Up or Arrow Down in a block menu | Move focus through enabled commands. |
| Home or End | Focus the first or last enabled command. |
| Escape | Close the active menu or inspector and return focus to the editor. |
| Tab | Leave the block menu through the normal tab order. |
| Enter in an inspector field | Submit that inspector, except while an IME composition is active. |
| Touch tap | Use the tapped control as the menu anchor; do not infer position from `document.activeElement`. |

All icon controls use Heroicons. There are no ASCII characters standing in for icons.

## Responsive layout

### Desktop

- The writing measure is capped at 50rem.
- The block gutter stays outside the text measure and appears on hover or focus.
- The inline text toolbar follows a selection.
- Story actions remain in a sticky publication bar below the page.

### Touch and narrow screens

- The desktop gutter is removed because hover is unavailable.
- The current-block toolbar appears before the canvas and sticks below the 66px mobile admin header while its editor remains in view. It wraps into a compact two-row cluster at 320px and stops before publication actions.
- Block and inspector menus become bottom sheets with viewport-bounded height.
- The Story settings grid becomes one column.
- The page keeps zero horizontal overflow at 320px.
- Interactive targets are at least 44px in both dimensions.

### Reduced motion

Menu and inspector entrances use opacity and short translation only. Under `prefers-reduced-motion: reduce`, their duration and state transitions collapse to 0.01ms. Reordering and formatting do not depend on animation.

## Journal management

Every journal row has an explicit Edit link. Publisher and owner accounts can remove a story from the public journal through Archive and reverse the action with Restore. Editor accounts can revise stories but cannot change public availability.

Permanent deletion is not exposed. A post owns an open-ended immutable revision history and may reference reviewed R2 media and audit events. A synchronous hard delete would either orphan those records or erase editorial evidence. Archive is therefore the deletion policy for this release: public reads stop immediately, while administrators retain the record and can recover it. The complete lifecycle contract is in [ADMIN-JOURNAL-LIFECYCLE.md](./ADMIN-JOURNAL-LIFECYCLE.md).

## Source map

- `src/components/admin/editor/rich-journal-editor.tsx`: Tiptap extensions, block registry, menus, inspectors, storage normalization, and interaction state.
- `src/components/admin/editor/rich-journal-editor.module.css`: page typography, block gutter, menus, touch toolbar, inspectors, and reduced motion.
- `src/components/admin/journal-workspace.tsx`: title, standfirst, settings, body canvas, save/publish/archive actions, and revision history.
- `src/components/admin/journal-manager.tsx`: edit and archive/restore controls.
- `convex/adminPosts.ts`: authorized archive/restore mutations and audit events.

## Verification matrix

| Gate | Evidence |
| --- | --- |
| Module recovery | `/admin/journal/new` and edit-route module graphs resolve the editor and its CSS; the live dev route returns 200. |
| Stored JSON | Unit tests round-trip empty standard Tiptap blocks through the Convex validator, assert images store `mediaId` and not `src`, and assert map nodes store bounded fields with no iframe HTML. |
| Slash menu | Unit tests assert the menu opens, `/` is not inserted, arrow focus works, and Escape restores editor focus. |
| Paste and media safety | Unit tests cover rejected remote images and unsafe pasted link marks, the exact public host, IME Enter, duplicate upload locking, save-state upload races, and blank coordinate rejection. |
| Lifecycle authorization | Convex tests cover unauthenticated, editor, publisher, and owner access. |
| Public removal | Convex tests prove archived stories disappear from public reads and valid publications can be restored. |
| Responsive browser | The authenticated Playwright gate passes desktop, Pixel 7, and 320px, including zero overflow, at-least-44px targets, Axe, real block insertion, no console/page errors, and reviewed screenshots in `docs/evidence/admin/journal-block-editor-*.png`. |

Commands:

```bash
npx vitest run tests/unit/rich-journal-editor.test.tsx
npx vitest run tests/unit/journal-manager.test.tsx
npx vitest run tests/convex/admin-post-lifecycle.test.ts
npm run typecheck
npm run lint
ADMIN_JOURNAL_CREDENTIALS_PATH=/secure/path/admin.json npx playwright test tests/e2e/admin-journal-editor.spec.ts
```

The credential file is private, mode `0600`, and ignored by Git. Browser tests never create or publish a story; they exercise the unsaved editor only.
