# Redesign Code Audit

Audit date: 25 August 2026
Scope: current Next.js implementation in `src/`, its browser contract in `tests/e2e/site.spec.ts`, and the Convex/R2 boundaries that a visual redesign must keep
Mode: read-only audit; no application source was changed

## Design read

Reading this as: a visual-overhaul redesign for a mobile-first student community, with a playful "living sentence" language where typography and participation lead, while supplied photographs act as supporting evidence.

Recommended target dials:

| Dial | Current reading | Redesign target | Reason |
| --- | ---: | ---: | --- |
| `DESIGN_VARIANCE` | 6 | 9 | The current grid offsets are competent, but the same split and row grammar returns too often. |
| `MOTION_INTENSITY` | 2-3 | 7 | Existing motion is limited to one hero reveal, hover scale, navigation, and form feedback. The new brief asks for interaction that carries meaning. |
| `VISUAL_DENSITY` | 4 | 4 | The amount of copy is already appropriate. The composition, rather than content volume, needs to change. |

Redesign mode: **visual overhaul with IA preservation**. Keep the routes, factual copy boundary, SEO structure, form contract, Convex data path, R2 object keys, and accessibility work. Replace the page composition and expressive interaction layer.

## Verdict

The existing site passes the obvious AI-slop check: it has no gradient text, glass-card wall, fake metrics, invented testimonials, or three equal feature cards. It still fails the revised brief. Its personality comes mostly from participant photography, a large blue field, and oversized Bricolage Grotesque. Remove the photos and most sections become conventional headline-copy-link layouts.

The current code is a sound foundation, not the final art direction. The safest redesign is to preserve the server/data shell and replace the visual blocks with a small set of isolated interactive components.

## Audit health score

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Accessibility | 3 / 4 | Axe, keyboard, focus, reduced-motion, and form-state tests pass; the mobile menu still lets focus move into content behind an open overlay. |
| Performance | 3 / 4 | Server Components and `next/image` are used well. No Lighthouse or field measurements exist, and any new motion layer will need its own budget. |
| Responsive design | 4 / 4 | Desktop, Pixel 7, and 320 px route/overflow tests already pass. |
| Theming | 4 / 4 | Semantic OKLCH tokens and system dark mode cover the complete public surface. |
| Anti-patterns | 3 / 4 | Common AI tells are absent, but repeated split headers, repeated image-copy rows, and image-dependent identity conflict with the new direction. |
| **Total** | **17 / 20** | **Good technical base; visual language needs replacement.** |

Issue count: P0 0, P1 0, P2 4, P3 2.

## Current implementation map

### Information architecture

The route tree is coherent and should remain stable:

- `/`: profile, activities, journal preview, and join path.
- `/about`: purpose, working principles, and evidence limits.
- `/activities`: four activity themes backed by cautious source language.
- `/journal` and `/journal/[slug]`: Convex-backed blog index and story detail.
- `/contact`: intent-aware contact form persisted to Convex.

Metadata, canonical URLs, JSON-LD, sitemap, robots, 404, loading, and error states are already present. The redesign does not need new routes or a new CMS model.

### Visual structure

`src/app/globals.css` contains 2,122 lines and supplies one global visual language:

- committed indigo fields, coral actions, cool neutral reading surfaces;
- one variable family, Bricolage Grotesque, for display, body, controls, and wordmark;
- 12-column grids for most wide layouts;
- large two-line mastheads on all primary routes;
- rounded documentary media, hairline separators, and flat surfaces;
- light/dark values swapped through semantic custom properties.

The implementation varies column spans, but much of the site still alternates between two silhouettes: a large headline beside body copy, or photography beside body copy.

### Existing interaction inventory

| Interaction | Location | What it currently communicates |
| --- | --- | --- |
| Sticky navigation and animated underline | `src/components/mobile-nav.tsx`, `globals.css:261-351` | Location and action hierarchy. |
| Mobile disclosure menu | `src/components/mobile-nav.tsx:19-110` | Route access, Escape close, focus return, and body scroll lock. |
| Hero image entrance | `globals.css:433-450` | A single scene reveal through clip and horizontal translation. |
| Hover lift, underline, and image scale | `globals.css:184-259`, `720-730` | Generic control feedback. |
| Mobile photo scroll-snap strip | `src/app/page.tsx:160-181`, `globals.css:2002-2019` | Browsing the supplied photo archive; keyboard scrolling is tested. |
| Contact intent, validation, pending, error, and success | `src/components/contact-form.tsx` | The only interaction tied directly to a real club task. |

There is no interactive English prompt, responsive type state, activity exploration control, journal preview behavior, or section-to-section choreography. The site reacts to navigation and form submission, but not to the subject of speaking and listening.

## Evidence of image dependence

With four activity themes and the current three seeded posts, the homepage can render **14 photographs**:

- one full-height hero image;
- one image in the purpose section;
- four activity images;
- one featured-journal image;
- four archive-strip images;
- three post-cover images through `StoryRow`.

The dependency is structural, not incidental:

- The hero reserves half of the first viewport for one photograph (`src/app/page.tsx:52-85`, `globals.css:358-450`).
- Every homepage activity row requires a photograph (`src/app/page.tsx:107-132`).
- A second journal promotion repeats an image already used in the activities (`src/app/page.tsx:134-158`).
- The dedicated archive strip adds four more images before the journal list (`src/app/page.tsx:160-181`).
- `/activities` repeats the same four media records in another alternating layout (`src/app/activities/page.tsx:30-49`).
- The About introduction and evidence section both depend on image-copy splits (`src/app/about/page.tsx:30-47`, `69-84`).

This also creates a release dependency: every public media record in `src/content/media.ts` still has `rights: "supplied-unverified"` and `consent: "pending"`. A typography-and-interaction-led design would remain coherent if only one or two approved photos ship later.

## Template-like patterns to retire

### Repeated split-header grammar

`section-heading-split`, `principles-heading`, `journal-masthead-grid`, and `activity-caution-grid` all pair a large left message with smaller right copy. See `globals.css:502-514`, `870-882`, `1022-1048`. The pattern is useful once, but its repetition makes unrelated sections share one scaffold.

### Repeated image-copy rows

The homepage activity list, activity detail list, featured story, About introduction, About record, and Journal lead all reconfigure the same two ingredients. Column offsets change, yet the reading behavior does not. On phones most of them collapse into the same heading-copy-image stack.

### Route mastheads as a single template

About, Activities, Journal, and Contact share the same padding, display scale, and two-line lockup rules (`globals.css:795-838`). Their color changes, but their stage direction does not. Visitors get a different heading and the same opening gesture.

### Identical conversion closures

Home and inner routes close with a large color field, short heading, and button (`src/app/page.tsx:203-209`, `src/app/about/page.tsx:86-91`, `src/app/activities/page.tsx:66-73`). Home also repeats the join intent in the navigation, hero, and closing section. Keep the global Join path, but give the final section a different role or omit it.

## Detailed findings

### [P2] Photographs carry page identity instead of supporting it

- **Location:** Home, About, Activities, Journal, `DocumentaryImage` usages listed above.
- **Impact:** The visual concept weakens when photography is removed, consent-delayed, or seen repeatedly. It also overweights a finite supplied archive.
- **Recommendation:** Limit each route to one decisive evidence image plus optional post thumbnails. Build the primary identity from language, type state, color, and user-controlled interaction.
- **Suggested command:** `$impeccable shape` followed by `$impeccable bolder`.

### [P2] Expressive interaction does not yet match the subject

- **Location:** `src/components/` contains client state only for navigation and the contact form. `globals.css` defines one page-entry keyframe.
- **Impact:** The site describes conversation while behaving like a static publication. The revised creative/interactivity request remains unmet.
- **Recommendation:** Add two or three keyboard-operable client islands whose state represents speaking, listening, choosing a prompt, or previewing a story. Keep all core copy visible in server-rendered HTML.
- **Suggested command:** `$impeccable animate` and `$impeccable delight`.

### [P2] Section layouts repeat across routes

- **Location:** `src/app/page.tsx`, `src/app/about/page.tsx`, `src/app/activities/page.tsx`, and shared grid rules in `globals.css`.
- **Impact:** Individual pages do not gain their own pace or behavior. The code is visually varied at the column level but predictable at the section level.
- **Recommendation:** Give each route one signature interaction and no more than two image-copy splits in sequence. Home should mix kinetic type, a stateful activity explorer, a text-led journal index, and one photographic interlude.
- **Suggested command:** `$impeccable layout`.

### [P2] Open mobile navigation does not isolate keyboard focus

- **Location:** `src/components/mobile-nav.tsx:24-44`, `84-110`.
- **Impact:** The overlay locks body scrolling, but Tab can continue into page controls behind it. Focus restoration on Escape is good, yet the open state can still become confusing for keyboard and screen-reader users.
- **WCAG relation:** focus order and visible focus context, WCAG 2.4.3 and 2.4.7.
- **Recommendation:** Either make it a non-modal disclosure without body lock, or use a real popover/dialog pattern with background inertness and contained focus.
- **Suggested command:** `$impeccable harden`.

### [P3] The stylesheet is too coupled for an overhaul

- **Location:** `src/app/globals.css`, 2,122 lines.
- **Impact:** Route layout, tokens, responsive overrides, controls, form states, and article typography share one file. Replacing one visual family risks selector collisions and leaves retired rules behind.
- **Recommendation:** Keep tokens and base accessibility rules global. Move new route blocks and client islands into colocated CSS Modules; delete retired selectors as each route migrates.
- **Suggested command:** `$impeccable distill`.

### [P3] Content data knows CSS layout names

- **Location:** `src/content/site-copy.ts:3-47` stores `className`, while Home and Activities consume it directly.
- **Impact:** One content record controls two page compositions through old CSS selectors. The redesign cannot give each route its own behavior without adding more conditional layout logic.
- **Recommendation:** Keep activity content plain. Let each view choose its own presentation or use a semantic variant such as interaction role rather than a CSS class string.
- **Suggested command:** `$impeccable polish`.

## What must survive the redesign

### Route, SEO, and content contract

| Contract | Keep |
| --- | --- |
| Public slugs | `/`, `/about`, `/activities`, `/journal`, `/journal/[slug]`, `/contact` |
| One primary heading | One visible semantic `h1` per route; non-story route lockups remain at most two lines at tested widths. |
| Metadata | Route titles, descriptions, canonical links, Open Graph, JSON-LD, robots, and sitemap generation. |
| Fact boundary | No invented counts, schedules, achievements, partnerships, prices, testimonials, or legal facts. |
| Journal content | Convex published queries with typed local seed fallback. Markdown remains raw-HTML-disabled. |

The visible heading strings are currently asserted exactly in `tests/e2e/site.spec.ts:6-13`. Keeping them avoids unrelated test and SEO churn. If the art direction changes a heading intentionally, update metadata and test expectations in the same change, while retaining one `h1` and the two-line limit.

### Convex contract

- Preserve `posts`, `events`, and `contactSubmissions` tables and their indexes in `convex/schema.ts`.
- Keep the published-post view model and fallback behavior in `src/lib/journal.ts`.
- Keep form names and intent values: `name`, `email`, `intent` (`join`, `partner`, `ask`), `message`, `consent`, and honeypot `website`.
- Preserve server-side validation, consent capture, rate checks, errors that retain user text, and success focus transfer.
- Do not turn a visual redesign into a schema migration.

### R2 and media contract

- Keep stable `images/*.webp` and `images/*.avif` object keys.
- Keep `NEXT_PUBLIC_MEDIA_BASE_URL`, the local fallback, and exact `next.config.ts` remote pattern.
- Keep `next/image`, dimensions, focal points, alt text, rights, and consent fields.
- Never move original JPEG/MOV/PNG masters into `public/` or R2.
- Reducing image use does not authorize public upload while consent remains pending.

### Accessibility and responsive contract

- Preserve the skip link, `#main-content`, landmark structure, source-order reading, visible focus, and 44 px minimum targets.
- Every interactive motion component needs a static SSR state and a `prefers-reduced-motion` path.
- No content may depend on hover, pointer position, color, or animation.
- Keep 320 px, Pixel 7, and 1440 px coverage with no horizontal document overflow.
- Maintain form labels, fieldset/legend, conditional `aria-describedby`, focused first error, focused success status, and bilingual consent help.
- Preserve light and dark system themes or replace them only with another token-complete two-scheme system.

## Bounded redesign direction

### Creative rule

**Words are the instrument; photographs are receipts.** A visitor should be able to play with a phrase before seeing a gallery. Photos confirm that the club exists, but they do not define every fold.

### Home

1. **Living Sentence hero:** preserve the main heading and join action, then let a keyboard-operable word control alter one supporting sentence, type width, or color rhythm. Render a useful default before hydration. Use at most one small photograph as a cameo, not half the viewport.
2. **Practice mixer:** replace four image rows with a tablist or button field for Speak, Listen, Meet, and Make. Selection changes a real prompt, description, and optional small evidence image. All labels remain reachable by arrow keys and Tab.
3. **Call-and-response chapter:** use a short scroll-driven or view-triggered typographic sequence that demonstrates a question becoming an answer. Motion explains sequence; reduced motion presents the final arranged sentence immediately.
4. **Text-led journal stage:** show story titles as the main visual. Desktop hover and keyboard focus may update one supporting cover preview; phone layouts keep an inline thumbnail or no thumbnail. The story link never depends on the preview.

This composition can reduce the homepage from 14 photos to roughly two or three without losing any factual content.

### About and Activities

- Give About a responsive statement system, such as principles that recompose one shared sentence, rather than another image-copy split and ruled list.
- Make Activities an exploratory phrase deck, not a duplicate of the homepage photo rows. Each activity should expose a prompt someone could actually say or answer.
- Use at most one approved archive image on each route. A route remains finished when that image is absent.

### Journal and Contact

- Preserve the journal data and article reading column. Change the index into a typographic selector with optional focus/hover preview, keeping dates and categories plain.
- Keep Contact's working form cycle unchanged. The visual layer may respond to the selected intent by changing a short prompt or typographic composition, but field order, names, validation, focus movement, and submission text remain stable.

## Suggested component boundary

Keep pages as Server Components and isolate only continuous or stateful behavior:

```text
src/components/interactive/
  living-sentence.tsx       # user-controlled word/type state
  practice-mixer.tsx        # keyboard-operable activity selector
  conversation-sequence.tsx # view/scroll choreography with reduced-motion fallback
  journal-preview.tsx       # focus/hover preview; links stay server-rendered
```

Prefer CSS transforms, opacity, variable-font axes, `clip-path`, and `color` changes. If Motion is added, verify it in `package.json`, import from `motion/react`, use motion values for continuous input, and keep each dependency inside a client leaf. Do not add a custom cursor, full-page scroll hijack, pointer-trailing images, decorative WebGL, or repeated marquees.

## Browser-test migration plan

Keep these assertions unchanged:

- every public route returns successfully and exposes its expected `h1`;
- non-story `h1` elements stay within two lines;
- no horizontal overflow at all three projects;
- Axe has no detectable WCAG A/AA violations;
- the skip link focuses `#main-content`;
- contact intent, persistence, success copy, viewport position, and focus pass;
- reduced-motion collapses animation duration.

Adapt only the tests tied to retired visuals:

- If the photo strip is removed, replace `mobile photo strip accepts keyboard scrolling` with a keyboard test for the Practice Mixer.
- Add a reduced-motion assertion for every new animated island, not only the Join control.
- Add one keyboard/focus test for the Living Sentence control and one for journal preview parity.
- Regenerate the existing light evidence screenshots after final polish; add one interaction-state screenshot rather than a long gallery of static pages.

## Implementation order

1. Freeze route, data, SEO, form, and R2 contracts with the existing tests.
2. Extract global tokens/base rules and remove visual rules route by route.
3. Build the Home hero and Practice Mixer as accessible client islands with static server fallbacks.
4. Recompose Activities, About, and Journal around language-led layouts; keep Contact behavior untouched until the visual shell is ready.
5. Replace obsolete photo-strip coverage, run unit/backend/build/browser gates, capture both themes, inspect 320 px, and rerun the Impeccable detector.

## Non-goals

- No route additions or removals.
- No Convex schema rewrite.
- No R2 provisioning, uploads, or public-domain changes.
- No new organisation claims or synthetic testimonials.
- No audio recording, speech recognition, login, member directory, event booking, or gamified score system.
- No dependence on unapproved photographs for layout completeness.

## Positive findings to carry forward

- The route and content architecture is small enough to redesign without migration work.
- Server Components are already the default; client code is isolated.
- Form validation, honest failure states, focus transfer, and Convex persistence are worth keeping intact.
- Media objects retain alt text, focal points, rights state, consent state, and local/R2 URL resolution.
- Semantic design tokens already cover light and dark modes.
- Responsive and Axe tests provide a useful regression fence for a much more experimental visual layer.

## Follow-up audit: Activity Relay, Journal, icons, and motion

This follow-up is based on the two latest review screenshots, the current source, and a fresh 1440 x 1000 browser measurement. It separates fixes that are already present from work that remains.

### 1. Activity Relay

#### The broken `Exchange` word is already fixed in source

The earlier break was caused by the global `p, li, dd { overflow-wrap: anywhere; }` rule reaching `.activityVerb` while the text column was too narrow. The current local rule correctly wins over it:

```css
.activityVerb {
  font-size: clamp(3.75rem, 19cqi, 7rem);
  overflow-wrap: normal;
  white-space: nowrap;
  word-break: normal;
}
```

Keep this rule. Do not add manual `<br>` elements, soft hyphens, a smaller fixed font size, or `word-break: break-all`. The vocabulary is controlled, so container units plus `nowrap` are an appropriate fit. Verify `Exchange` at 1440, 1120, 880, 640, and 390 pixels.

#### The remaining problem is media proportion and vertical anchoring

The current `.activityCompanion` gives the text and media columns a `1.45fr / 0.55fr` split, then pins `.activityMedia` to the bottom. This makes the photograph read as a narrow attachment instead of a companion to the active text. The Exchange image itself is 2000 x 1333 and is rendered at `3 / 2`, so its aspect ratio is already correct. Changing its focal point or applying a tighter crop would treat the wrong cause.

Recommended desktop adjustment:

```css
.activityCompanion {
  grid-template-columns: minmax(25rem, 1.2fr) minmax(17rem, 0.8fr);
  align-items: start;
}

.activityMedia {
  align-self: start;
  padding: clamp(1.5rem, 3vw, 2.5rem) 0 1.5rem clamp(1rem, 2vw, 1.5rem);
}
```

Stack the companion earlier instead of compressing both halves between 640 and 879 pixels:

```css
@media (max-width: 879px) {
  .activityCompanion {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .activityMedia {
    width: min(78%, 32rem);
    margin-left: auto;
    padding: 1rem 0 1.5rem;
  }
}
```

Keep `ratio="3 / 2"` for `leeds-panel` and the media-record focal point. The proposed column width and top alignment address the screenshot without inventing a new crop.

### 2. Journal list and preview under the sticky header

The static grid is vertically aligned in the current build. At 1440 x 1000, `.journalList` and `.journalPreview` both start at `898.39px`, and the first item content and `.journalPreviewContent` both start about `41.6px` later. The visible mismatch appears after the preview becomes sticky.

The current sticky rule applies two vertical offsets:

- `top: calc(var(--header-height) + 2rem)` puts the preview box 32 pixels below the header.
- `padding-top: clamp(1.5rem, 3vw, 2.6rem)` adds another 24 to 41.6 pixels before the image.

Keep the shared internal padding, but remove the duplicate external gap:

```css
.journalPreview {
  top: var(--header-height);
}
```

This places the preview content one row-padding below the 70-pixel header instead of roughly 74 pixels below it. It also preserves the exact content alignment when the preview has not yet stuck.

There is also a measured horizontal void of about 150 pixels between the list edge (`815.38px`) and preview edge (`965.78px`) because column 8 is unused. If the screenshot's detached preview is not intentional, use the column as controlled spacing rather than an empty track:

```css
.journalPreview {
  grid-column: 8 / -1;
  padding-left: var(--grid-gap);
}

.journalItem {
  scroll-margin-top: calc(var(--header-height) + 1.5rem);
}
```

The `scroll-margin-top` protects keyboard and anchor-driven arrival under the header. Ordinary list rows will still pass behind the sticky header while scrolling; that is expected. A scrolling row and a sticky preview cannot stay top-aligned at every scroll position without scroll-linked positioning. If exact pair alignment is more important than persistence, the bounded alternative is `position: static; top: auto;` on `.journalPreview`.

The current desktop-only `IntersectionObserver` is a reasonable way to keep the preview paired with the row nearest the 34-percent reading line. Keep that observer rather than adding a raw scroll handler. It changes selected content, not geometry, so the sticky offset should still be corrected in CSS.

Post-audit QA note, 25 August 2026: a user-like two-step wheel test reproduced a stale preview because threshold-only observer callbacks do not necessarily fire when the 34-percent line crosses between already-visible rows. The final implementation keeps the observer, adds passive scroll and resize listeners, and throttles geometry work to one requestAnimationFrame. React state changes only when the selected index changes. This evidence supersedes the earlier no-scroll-listener recommendation.

### 3. Unicode and ASCII glyph audit

The current source no longer uses Unicode or ASCII characters as interface icons. The actionable icon roles now use Heroicons:

- sentence, handoff, prompt, activity, and journal arrows;
- sun and moon theme controls;
- mobile menu open and close controls;
- contact success and submit affordances.

The two remaining non-ASCII characters are the ellipses in `Opening the journal…` and `Sending…`. They are status punctuation, not icons, and should remain text. The visible `/` characters in the wordmarks and `content: "/"` after a story tag are separators, not interactive affordances. No replacement is needed.

Repeat this guard scan before handoff and inspect any result by role, not merely by character:

```sh
rg -n '[^[:ascii:]]|content[[:space:]]*:' src --glob '*.{tsx,ts,css}'
```

### 4. Motion and reduced-motion behavior

The token system is coherent (`160ms`, `300ms`, and `520ms`), and the global reduced-motion query collapses animation and transition duration. Two refinements will make state changes feel smoother without weakening that safeguard.

#### Stop animating layout properties

Padding transitions move neighboring content and create a small reflow on every hover. In the reviewed interaction set, remove them from `.sentenceControl` and `.activityControl`; move only a child with `transform`:

```css
.sentenceControl {
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
}

.sentenceControl:hover {
  padding-left: 1rem;
}

.sentenceControl > span,
.activityControlLabel {
  transition: transform var(--duration-fast) var(--ease-out);
}

.sentenceControl:hover > span,
.activityControl:hover .activityControlLabel {
  transform: translateX(0.3rem);
}

.activityControl {
  padding-inline: 0.8rem;
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
}

.activityControl:hover,
.activityControl[aria-pressed="true"] {
  padding-inline: 0.8rem;
}
```

Apply the same rule in the later cleanup pass to `.mobile-menu-link`, `.intent-links a`, `.principle-relay-row`, and `.intent-option`, all of which currently transition padding.

#### Make media replacement calm and explicit

`sentenceEcho`, `promptOutput`, `activityMedia`, and `journalPreviewContent` remount on state change. Their animation only covers the incoming node; there is no outgoing crossfade. The current `media-enter` also combines opacity, translation, rotation, and `clip-path`, which makes rapid Activity or Journal selection look busier than the interaction warrants.

Use one composited entrance:

```css
@keyframes media-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 0.65rem, 0) scale(0.995);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
```

If a true crossfade is required, keep the outgoing and incoming media in the same positioned wrapper for a short overlap. A keyed single node cannot produce an exit animation with CSS alone.

The global `0.01ms !important` reduced-motion rule is a valid safety net. Add a component-level reset so interactive transforms do not jump to displaced hover or active states when motion is reduced:

```css
@media (prefers-reduced-motion: reduce) {
  .sentenceEcho,
  .sentenceBackdrop,
  .promptOutput,
  .activityPanel > *,
  .activityMedia,
  .journalPreviewContent {
    animation: none;
    clip-path: none;
    transform: none;
  }

  .relayDot,
  .themeToggle,
  .sentenceControl > span,
  .activityControlLabel,
  .activityControl svg,
  .journalTitle svg {
    transition: none;
  }

  .themeToggle:hover,
  .themeToggle:active,
  .sentenceControl:hover > span,
  .activityControl:hover .activityControlLabel,
  .activityControl[aria-pressed="true"] .activityControlLabel svg,
  .activityControl[aria-pressed="true"] > svg,
  .journalItem[data-active="true"] .journalTitle svg,
  .journalTitle a:hover svg,
  .journalTitle a:focus-visible svg {
    transform: none;
  }
}
```

Keep color and visibility changes in reduced-motion mode. Remove only the travel, rotation, clipping, and scale effects.
