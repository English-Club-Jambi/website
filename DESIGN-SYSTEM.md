# English Club Design System

Status: integrated public, Practice, and administration implementation contract
Date: 26 August 2026
North star: The Conversation Relay
Primary interaction: Sentence Playground

## 1. Purpose

This document translates `DESIGN.md` into implementation rules for the Next.js interface. It covers the public organisation profile, the Assessment Lab, and the protected administration workspace: semantic tokens, type, layout, components, theme behavior, motion, responsive behavior, accessibility, and rejection criteria.

The system must produce a clean, bright first impression without becoming a generic education template. Language is the visual object. Generated placeholder scenes may supply atmosphere behind the Home and Members openings; documentary photography appears only where it proves something the copy cannot.

The three visual registers share typography discipline, Heroicons, visible focus, 44px targets, and reduced-motion behavior:

- **Public brand:** The Conversation Relay, asymmetric whitespace, language-led interaction, and sparse documentary proof.
- **Practice:** The Answer Line, with ruled response rows and unusually clear save, timer, transcript, section, and raw-result states.
- **Administration:** rounded operational neobrutalism with dense tools, 2px edges, short hard shadows, and namespaced tokens that never inherit a public preview.

## 2. Design dials

| Dial | Value | Implementation consequence |
| --- | ---: | --- |
| Design variance | 8 / 10 | Routes have different opening silhouettes and no universal masthead |
| Motion intensity | 6 / 10 | Selection visibly recomposes content; no constant motion |
| Visual density | 4 / 10 | Five role channels can remain visible while copy and public records stay bounded |

## 3. CSS token contract

The application uses semantic variables so one theme switch changes the whole site.

```css
:root {
  color-scheme: light;

  --page: oklch(0.985 0.006 95);
  --surface: oklch(1 0 0);
  --ink: oklch(0.18 0.025 265);
  --muted: oklch(0.47 0.025 265);
  --line: oklch(0.86 0.018 265);
  --primary: oklch(0.49 0.22 272);
  --primary-strong: oklch(0.40 0.21 272);
  --primary-wash: oklch(0.94 0.035 272);
  --signal: oklch(0.67 0.19 45);
  --signal-ink: oklch(0.18 0.025 265);
  --danger: oklch(0.52 0.19 28);
  --success: oklch(0.45 0.13 150);

  --focus: oklch(0.49 0.22 272);
  --focus-offset: oklch(0.985 0.006 95);
  --header-bg: oklch(0.985 0.006 95 / 0.94);
  --image-filter: none;
}

html[data-theme="dark"] {
  color-scheme: dark;

  --page: oklch(0.15 0.018 265);
  --surface: oklch(0.20 0.022 265);
  --ink: oklch(0.96 0.008 95);
  --muted: oklch(0.73 0.02 265);
  --line: oklch(0.34 0.025 265);
  --primary: oklch(0.72 0.16 272);
  --primary-strong: oklch(0.79 0.12 272);
  --primary-wash: oklch(0.23 0.055 272);
  --signal: oklch(0.76 0.15 55);
  --signal-ink: oklch(0.15 0.018 265);
  --danger: oklch(0.72 0.15 30);
  --success: oklch(0.72 0.12 150);

  --focus: oklch(0.76 0.15 55);
  --focus-offset: oklch(0.15 0.018 265);
  --header-bg: oklch(0.15 0.018 265 / 0.94);
  --image-filter: saturate(0.88) contrast(1.04);
}
```

Do not reference raw palette values inside component selectors when a semantic role exists.

Admin tokens are independent from the public palette:

```css
.admin-shell {
  --admin-page: oklch(0.965 0.012 265);
  --admin-surface: oklch(1 0 0);
  --admin-surface-quiet: oklch(0.93 0.018 265);
  --admin-ink: oklch(0.18 0.025 265);
  --admin-muted: oklch(0.42 0.025 265);
  --admin-line: oklch(0.25 0.03 265);
  --admin-action: oklch(0.58 0.2 272);
  --admin-warning: oklch(0.78 0.14 80);
  --admin-danger: oklch(0.58 0.19 28);
  --admin-success: oklch(0.51 0.14 150);
  --admin-focus: oklch(0.67 0.19 45);
  --admin-shadow: 3px 3px 0 var(--admin-line);
  --admin-radius-control: 10px;
  --admin-radius-panel: 14px;
}
```

## 4. Theme behavior

- The initial unsaved theme is light.
- `localStorage["english-club-theme"]` accepts only `light` or `dark`.
- A script in the document head applies the stored value before first paint.
- The toggle is a native button using Heroicons Sun and Moon SVG components.
- Accessible labels state the resulting action, not the current icon.
- The whole document changes at once. Sections do not own independent schemes.
- Tests clear or set storage explicitly to keep screenshots deterministic.
- The public root layout asks Convex for the current immutable theme snapshot. A safe allowlist serializer writes only the 16 supported semantic tokens for each light/dark mode into the head.
- If no published theme is available, the checked-in Relay Cobalt snapshot is complete and authoritative.
- Appearance edits seven structured OKLCH anchors—canvas, surface, ink, muted ink, line, identity, and response—for both modes together.
- Convex normalizes colours into sRGB-safe structured values, derives the full snapshot, and blocks publication when required contrast or focus pairs fail.
- Publish inserts an immutable version and atomically changes one public pointer. Rollback repoints to an older immutable version and records an event.
- Administrator publication changes the colours behind both public modes; it never changes a visitor's saved `english-club-theme` selection.

## 5. Typography

Use Bricolage Grotesque through the existing Next.js font setup.

| Role | CSS | Usage |
| --- | --- | --- |
| Hero | `clamp(3.7rem, 10.8vw, 10.5rem) / 0.82` | Home `h1`, maximum two lines |
| Route | `clamp(3.25rem, 8vw, 8rem) / 0.88` | About, Activities, Members, Practice, Journal, Contact |
| Section | `clamp(2.1rem, 4.8vw, 5rem) / 0.95` | Major chapter idea |
| Title | `clamp(1.35rem, 2.5vw, 2.5rem) / 1.02` | Activity and story titles |
| Body | `clamp(1rem, 1.3vw, 1.2rem) / 1.55` | Reading copy, maximum 65ch |
| Label | `0.9rem / 1.2` | Controls and metadata |

Display and route headings use negative tracking. Body copy does not. Do not use all caps for repeated labels. Do not use decorative italics or a second family.

Practice uses the same family but lowers the scale after the route heading: item prompts are compact section titles, answer copy uses the body role, and save/timer metadata uses the label role. Admin uses a fixed product scale with sentence-case labels; it does not reuse public hero sizes inside the workspace.

## 6. Spatial system

Base spacing units:

```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-12: 3rem;
--space-16: 4rem;
--space-24: 6rem;
--space-32: 8rem;
```

Page frame:

```css
.page-container {
  width: min(100% - 2rem, 92rem);
  margin-inline: auto;
}
```

At 880px and above, the page frame may use a 12-column grid with gaps from 20 to 32px. A composition can span or overlap columns, but source order must remain logical.

Section spacing is `clamp(5.5rem, 11vw, 10rem)`. Smaller route transitions use `clamp(3.5rem, 7vw, 6rem)`.

## 7. Shape and elevation

| Shape | Radius | Use |
| --- | ---: | --- |
| Square | 0 | Page chapters, large type fields, article regions |
| Compact | 8px | Buttons, inputs, dialog controls |
| Media | 14px | Documentary images only |
| State pill | 999px | Bounded selection controls |

Do not use a large radius on every block. The only floating layer is the open mobile navigation dialog, which may use one compact shadow.

Admin is the bounded exception: controls use a 10px radius, functional panels use 14px, and an active or draggable surface may use one zero-blur `3px 3px` shadow. Public previews inside admin remain visually public, but admin controls keep `.admin-*` tokens. No component combines a 2px edge with a wide soft shadow.

## 8. Core primitives

### Primary action

- Minimum height 48px.
- Signal Orange background and Signal Ink text.
- Compact radius.
- 1px physical bottom edge at rest, removed on press.
- No glow or wide shadow.
- One primary action in a decision area.

### Text link

- Primary colour.
- Underline visible at rest or revealed through a clearly different weight plus underline on hover.
- Arrow icons are optional and use Heroicons, never Unicode or ASCII text glyphs.

### State control

- Native button, practical height at least 44px.
- Inactive: transparent or Primary Wash.
- Selected: Primary background, readable inverse text, and a visible dot or Check icon.
- `aria-pressed` communicates selection.
- Button order is stable across breakpoints.

### Form field

- Visible label above the field.
- Surface background, 1px Line edge, compact radius.
- Minimum 48px input height.
- Error uses text, border, and `aria-describedby`.
- Placeholder supplements the label and never replaces it.

### Documentary image

- Existing `next/image` wrapper, explicit ratio, dimensions, focal point, and `sizes`.
- Radius 14px maximum.
- Natural colour in light mode, restrained saturation adjustment in dark.
- No photo receives decorative text overlay.

### Custom select

- Use the shared Radix-backed `SelectField`; no browser-default `<select>` is used for styled filters or admin workspaces.
- Trigger, listbox, option, selected state, label, and focus treatment come from one reusable component contract.
- The content is portalled so it cannot be clipped by an overflow container.
- Keyboard behavior follows listbox expectations; touch targets remain at least 44px.

### Confirmation dialog

- Destructive assessment actions use one labelled modal dialog with an exact resource name and consequence.
- Escape and Cancel close it; focus returns to the launcher; pending state locks duplicate submission.
- A destructive action is never represented only by colour or an unlabeled icon.

### Publication rail

- Show real state only: draft revision, current checks, required human reviews, published version, and rollback or next-draft action.
- Publication and rollback remain explicit. Autosave may save a draft but may never publish it.
- Server readiness is authoritative; the browser does not reconstruct permission or publication policy.

## 9. Signature components

### Sentence Playground

Structure:

```text
section
  decorative generated background image with media fade
  h1 complete server-rendered statement
  p active response line
  div role=group
    four buttons with aria-pressed
  primary link and secondary link
```

The selected word changes weight, position, and response text. A CSS key identifies the state. The background remains decorative and fades into the semantic page colour through one functional gradient mask. The response line uses `aria-live="polite"` only after an explicit selection. Hover may preview a button surface, but it does not change the content state.

### Prompt Mixer

Structure:

```text
section
  heading
  prompt output
  authored phrase legend
  New prompt button
  privacy note
```

The prompt set is deterministic and authored. The client cycles through approved combinations. It stores nothing, does not score the visitor, and has no free-text input.

### Activity Relay

Desktop:

- Control rail occupies 3 or 4 columns.
- One companion field occupies the remaining width.
- One selected image is a small lower corner or side fragment.
- Inactive activity content remains available through the controls and is not duplicated invisibly.

Phone:

- Controls become a horizontally scrollable strip with visible buttons.
- The selected companion follows immediately.
- No drag-only behavior and no hidden carousel pagination.

Arrow Left, Right, Up, and Down move to the adjacent activity and focus its button. Home and End go to the first and last button.

### Member Relay

Desktop:

- One native radio group contains `All roles` and five equal-height role channels.
- Each role channel shows its real numeric code, one Heroicon, label, and scope sentence.
- One companion field occupies the remaining columns and shows the selected role's supplied divisions or positions.
- A separate roster region uses a shared-rule contact sheet for records returned by Convex.
- A successful empty query uses the same grid for 15 source-only fictional profiles. Each card combines one generated portrait cell, a Heroicon role symbol, name, assignment, and short biography.

Phone:

- All role controls form one vertical group. No label depends on horizontal drag.
- The active companion follows the controls in source order.
- The roster remains a two-column grid down to 320 px. Real portrait space appears only when a cleared portrait exists; showcase cards use unique cells from the generated portrait sheet.

The same selection filters the roster without triggering another request. A polite status message announces the result count. Showcase, published, and service-unavailable states remain distinct in source behavior, while public copy stays focused on the organisation. Without JavaScript, all five role panels and supplied subtypes are visible.

Motion is a deterministic state replacement: selected-label response at 160ms, companion and roster replacement at 300ms, and no travel beyond 12px. There is no autoplay, scroll-driven active role, pointer trail, or animated member carousel.

### Journal Relay

- One semantic list of posts.
- Linked title, category, date, and short excerpt remain in source.
- On wide screens, an `IntersectionObserver` bounds the active work while passive scroll and resize events schedule at most one 34% reading-line check per animation frame; keyboard focus updates the preview directly.
- Do not use `mouseenter` as the preview trigger because scrolling under a stationary pointer is inconsistent.
- On phone, each row includes a compact image only when available.
- Preview state never changes the destination URL or hides a title.

### Intent close

Three plain links route to:

- `/contact?intent=join`
- `/contact?intent=partner`
- `/contact?intent=ask`

The composition may change on hover or focus, but no JavaScript is needed.

### Home programme quiz

- Four local questions are assembled from the reviewed Activities manifest and timetable caution.
- One answer is checked only after an explicit action; feedback names the supporting activity and provides a normal `/activities` link.
- It is untimed and creates no Convex identity, attempt, history, metric, or free-text record.
- If the reviewed source set is incomplete, render the Activities handoff without manufacturing a question.

### Assessment briefing and runner

- Overview and briefings are useful server HTML even when no reviewed assessment is published.
- Start exposes timing and Listening modes, the raw-result claim, and an acknowledgement before Anonymous Auth begins.
- One current prompt and at most one related stimulus occupy the reading field. Audio never autoplays.
- Answer selection does not move focus. Explicit navigation moves focus to the next prompt heading.
- The current-section navigator is a focus-contained dialog; answered, unanswered, flagged, and current states use text and shape in addition to colour.
- Transcript support is explicit, persists for the attempt, and is reflected in the result label.
- Result rows show raw correct/possible/omitted counts and time. Post-submit review is section ordered and cursor paginated.

### Administration shell

- A fixed sidebar becomes a focus-contained mobile dialog below the desktop workspace threshold.
- Pages, Journal, Assessments, Members, Media, Appearance, and Activity use one navigation, heading, toolbar, field, status, pagination, and error system.
- Journal authoring stores allowlisted structured JSON. Media nodes hold verified IDs and alt text; map nodes hold finite bounded coordinates.
- Assessment authoring separates metadata, ordered sections, stimuli, protected keys, validation, four review decisions, publication, and next-draft cloning.
- Configuration gates remain visible as operational states. Missing private Assessment R2 credentials disable confidential upload without hiding the media ledger.

## 10. Route composition

| Route | First moment | Main body | Close |
| --- | --- | --- | --- |
| Home | Sentence Playground over a generated faded room scene | Prompt Mixer, Activity Relay, proof image, Journal Relay | Three intent links |
| About | Large sentence with an offset principle clause | Four principles that assemble one thought, one evidence boundary | Activities link |
| Activities | Full-width route phrase and active verb | Activity Relay plus timetable caution | Ask intent link |
| Members | Asymmetric statement over a generated faded group scene | Five responsibility channels, one role companion, consent-gated editorial roster | Existing Join intent |
| Journal | Typographic title field | Journal Relay and honest empty state | Global footer |
| Story | Calm article title and metadata | Optional cover and narrow Markdown body | Journal return |
| Contact | Direct route phrase | Context plus existing form cycle | Form success state |
| Practice | Assessment Lab statement and claim boundary | Published full/quick paths, briefing, owned Answer Line runner, raw result/review | Back to Practice or another reviewed path |
| Admin | Compact workspace identity and current access | Pages, Journal, Assessments, Members, Media, Appearance, and Activity tools | Save/publish state rather than a marketing close |

No shared route masthead selector should force these openings into the same geometry.

## 11. Motion

```css
--duration-fast: 160ms;
--duration-state: 300ms;
--duration-scene: 520ms;
--duration-admin-state: 220ms;
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
```

Allowed properties are transform, opacity, clip-path, colour, background colour, border colour, and variable-font axes supported by the loaded font.

Do not animate layout dimensions for repeated content. Do not use an unbounded raw `scroll` event listener for visual state; Journal Relay's passive, requestAnimationFrame-bounded reading-line check is the sole documented exception. Do not continuously write React state from pointer movement.

Practice and admin state must remain visible before any animation starts. Admin press feedback may travel `2px`; question/section transitions may travel at most 12px. Neither uses bounce, autoplay, animated counters, or route-load choreography.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 12. Responsive rules

### Up to 639px

- Header is compact and the menu control remains at least 44px.
- Hero uses available width and a minimum, not fixed, viewport height.
- Display text stays within the document with overflow wrapping disabled only for known short words.
- Page side padding is 16px.
- Activity controls may scroll horizontally, while the page itself may not.
- Member role controls remain vertical and every role label stays visible without horizontal drag.
- Contact form is one column.
- Practice answer rows, audio controls, navigator actions, and result summaries use one column with no sticky control covering the final answer.
- Admin navigation is a modal dialog, forms are one column, data tools wrap, and no table is the only way to complete an action.

### 640px to 879px

- Page padding grows to 24px.
- Two-column compositions may begin only when both columns retain readable measure.
- Journal preview can remain inline rather than sticky.
- Practice briefing comparisons and result sections may form two columns only when every label keeps a readable measure.
- Admin preview/check panels move into source-order tabs or stacked sections.

### 880px to 1119px

- Desktop navigation is available.
- 12-column composition begins.
- Hero control and response line remain above the fold at a 768px height.

### 1120px and above

- Maximum page width is 92rem.
- Journal companion preview and activity field can become sticky within their own section.
- Text does not expand beyond its measure merely because space exists.
- Admin may use a 220–248px navigation rail and a flexible work canvas; Appearance may add a bounded inspector column.

Test 320x800, Pixel 7, 768x1024, 1024x768, 1440x1000, and 1920px wide.

## 13. Accessibility

- WCAG 2.2 AA.
- Body contrast target at least 7:1 where practical.
- Focus indicator at least 2px with 3:1 state contrast.
- Every non-text control has an accessible name.
- Selected state uses `aria-pressed`, `aria-selected`, or a native checked control as appropriate.
- Dynamic prompt output uses a polite status only after activation.
- Skip link and `#main-content` focus remain.
- Mobile menu focus cannot escape behind a modal layer.
- Hover never unlocks information.
- At 200% zoom, controls reflow without clipped labels.
- Timed practice offers declared timing modes before Start; deadline authority remains on the server.
- Audio has an equivalent transcript path, never autoplays, and remains operable with keyboard and touch.
- Admin and assessment dialogs contain focus, lock background scrolling only while modal, and restore focus.

## 14. Content and media limits

- Home: at most four simultaneous image roles, including the generated hero background and journal preview.
- About: at most one image.
- Activities: one active image.
- Members: one decorative generated hero scene plus consent-cleared roster portraits where records provide them.
- Contact: no required image.
- Article: one cover plus content-owned inline media only when supported.
- Assessment: one current stimulus; published delivery media only after version/purpose/access/status checks.
- Admin: previews may show reviewed media, but signed URLs, private object keys, credentials, answer keys, and audit identities never enter screenshots or public payloads.

Fixed brand and documentary images remain in the typed source manifest. Journal, Member, CMS, and Assessment media use reviewed `mediaAssets` projections from Convex. Both paths resolve through an approved local-QA or R2 object path and respect rights, purpose, access, status, version, and consent; pending or private media never gains production eligibility from presentation alone.

General CMS media and published derivatives use `https://r2.mukhtada.my.id`. Confidential Assessment drafts require a separate private R2 bucket and short-lived S3 URLs. That bucket is not configured; the upload control must remain blocked and no public-bucket fallback is allowed.

## 15. Anti-slop detector

Reject before review:

- three equal feature cards;
- generic rounded containers for every section;
- gradient text, decorative gradients, glow, blobs, and glass; one functional hero media fade is allowed;
- repeated uppercase eyebrows;
- decorative section numbers;
- fake UI, fake metrics, or fake quotes;
- fictional Member showcase material presented as reviewed roster evidence, or any invented count, tenure, achievement, or contact detail;
- score rings, accuracy-as-proficiency, official-scale conversions, CEFR badges, certificate graphics, or admission language for Practice;
- decorative admin dashboard cards, giant outlined headings, sticker piles, or publication progress that is not tied to stored state;
- hierarchy pyramids, orbiting face walls, or three equal profile cards;
- 3D, particles, WebGL, canvas-only hero, and custom cursor;
- more than one marquee on a page;
- photography on every fold;
- auto-rotating content;
- a light and dark patchwork inside one page;
- a button label that describes a vague state instead of an action.

## 16. Verification checklist

- [x] Theme persists and applies before paint.
- [x] Header and mobile menu pass keyboard focus tests.
- [x] Sentence, prompt, and activity controls pass keyboard and touch tests.
- [x] Reduced motion removes spatial movement.
- [x] All routes remain useful when optional images fail.
- [x] No document overflow at 320px.
- [x] Axe representative scans are clean.
- [x] Authored source passes the Impeccable anti-pattern detector.
- [x] Light, dark, desktop, phone, and selected-interaction screenshots are manually inspected.
- [x] Member native-radio behavior, server-rendered role content, and distinct roster service states are verified.
- [x] Member profile and portrait consent gates pass Convex tests.
- [x] The five-link header fits at the tested tablet and desktop stress widths and collapses before controls collide.
- [x] Member light, dark, phone, 320px, selected-role, and roster-detail screenshots are manually inspected.
- [x] Practice overview and Home programme quiz reflow without horizontal overflow at desktop, Pixel 7, 412px, and 320px evidence widths.
- [x] Assessment authoring uses reusable order controls, a reusable confirmation dialog, version-scoped media selectors, and visible clone/configuration states.
- [x] Public theme drafts, immutable versions, validation, publish, rollback, and checked-in fallback use one semantic contract.
- [x] CMS public/admin reads fail explicitly above 200 entries and refuse a 201st new key.
- [ ] Private Assessment R2 CORS, checksum PUT, signed preview, verification, and derivative creation require a real Cloudflare smoke test before release.
