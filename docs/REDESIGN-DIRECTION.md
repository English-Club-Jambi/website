# English Club Redesign Direction

Status: approved implementation direction
Date: 25 August 2026
Mode: visual overhaul with route, content, backend, and factual contracts preserved

## 1. Decision

The new visual system is **The Conversation Relay**. Language moves from the hero into a prompt, from a prompt into an activity, from an activity into a story, and from a story into a real contact intent.

The main homepage interaction is the **Sentence Playground**. Visitors can change one part of a complete English sentence, generate a bounded conversation prompt, and explore activity verbs. Nothing is scored, recorded, or personalised.

The design is clean and bright by default. A global theme control switches the complete site between light and dark, saves the choice locally, and preserves the same hierarchy in both modes.

## 2. What changed

The previous direction, The Open-Mic Contact Sheet, relied on participant photography to carry the page identity. The corrected brief makes the supplied images supporting illustrations only.

The redesign therefore changes four structural assumptions:

1. The hero is typographic and interactive, with one generated room scene faded behind it rather than a photo split.
2. Activity content is a stateful language deck, not repeated image and copy rows.
3. Supplied photography appears as selective evidence after the site has established its idea; the generated hero placeholder supplies atmosphere only.
4. Motion describes choice, response, and handoff. It is not a layer of repeated reveal effects.

Convex, Cloudflare R2, the route map, form fields, SEO, seed posts, and the evidence boundary do not change.

## 3. Evidence synthesis

### Supplied references

The complete file-level audit lives in `docs/REDESIGN-REFERENCE-AUDIT.md`. It covers all 19 supplied PNGs and records one byte-identical duplicate. The useful evidence is mechanical rather than stylistic:

| Mechanic | Reference evidence | Translation |
| --- | --- | --- |
| One dominant interactive object | `play-better-golf.png` | A sentence is the hero object; its words are native controls |
| Selection recomposes a companion scene | Montreval, Paskibra, Golf Modern | Activity selection changes copy, prompt, colour accent, and one optional proof image |
| Editorial list with companion preview | GenBI News | Journal titles lead; one quiet image preview supports focus on wide screens |
| Early intent chooser | Living Community | Ask what the visitor wants to practise, without claiming personalisation |
| Different choreography by chapter | Wellness Club | Hero, prompt, activity, story, and join chapters use distinct layouts within one token system |

The audit rejects prestige styling, category green, repeated route mastheads, unverified metrics, equal card grids, long all-in-one homepages, and image-led heroes.

### Primary web research

The source ledger and observations live in `docs/CREATIVE-WEB-RESEARCH.md`. Twelve primary sites were inspected. The strongest transferable ideas are:

- [The Pudding](https://pudding.cool/) makes its subject the interface and keeps each story specific.
- [Ableton Learning Music](https://learningmusic.ableton.com/) begins with one small reversible action before long explanation.
- [M+](https://www.mplus.org.hk/en/magazine/web-design-is-visual-culture/) lets a brand element change role through the experience.
- [Are.na](https://www.are.na/) uses changing statements and concrete verbs as paths into content.
- [Dinamo](https://abcdinamo.com/) proves that type can be interactive without a canvas scene.
- [WePresent](https://wepresent.wetransfer.com/) and [It's Nice That](https://www.itsnicethat.com/) separate editorial modes without forcing one card ratio.
- [Chrome Music Lab](https://musiclab.chromeexperiments.com/) keeps experiments single-purpose, immediate, and account-free.
- [Active Theory v5](https://v5.activetheory.net/) is a boundary example: a WebGL-only stage can replace the whole experience with a capability error.

The shared principle is simple: the interaction comes from the subject. English Club should be interactive through sentences, not through decorative graphics.

### Current implementation

The code audit lives in `docs/REDESIGN-CODE-AUDIT.md`. The current homepage can render 14 photos and repeats image-copy rows across routes. The underlying technical base is sound:

- Server Components already own most public output.
- Convex published queries and contact persistence are typed and tested.
- R2 object keys and local media fallbacks are stable.
- Metadata, JSON-LD, sitemap, error states, keyboard checks, Axe, and responsive tests exist.

The redesign keeps those contracts and replaces the expressive layer.

## 4. Design read

Reading this as: a public company profile and landing page for prospective members and collaborators, used first on phones, with candid and assured language, a clean bright surface, and a playful interaction that demonstrates social English without becoming a learning product.

Design dials:

| Dial | Target | Consequence |
| --- | ---: | --- |
| Design variance | 8 / 10 | Each route gets a distinct opening composition; repeated section templates are retired |
| Motion intensity | 6 / 10 | State changes are visible and tactile; no constant movement or scroll spectacle |
| Visual density | 3 / 10 | Large type, short reading blocks, and generous blank space keep choices clear |

Physical scene: a student opens a shared link after class, changes a phrase with one thumb, tries a prompt, checks what the club does, and reaches a preselected join form.

## 5. Visual north star

**Words are the instrument. Photographs are receipts.**

The page should still look intentional when every image is temporarily removed. Identity comes from:

- large selectable language;
- one cobalt room colour and one orange response colour;
- visible sentence structure;
- asymmetrical whitespace;
- sharp state transitions with restrained overshoot;
- one replaceable generated hero atmosphere and compact documentary images only where they add evidence.

The hero placeholder may cover the opening stage only behind a strong canvas fade and decorative semantics. Supplied photography never forms a gallery wall or repeats merely because an asset exists.

## 6. Palette and themes

### Light default

| Role | Token | Value |
| --- | --- | --- |
| Page | Chalk | `oklch(0.985 0.006 95)` |
| Raised surface | Paper | `oklch(1 0 0)` |
| Primary ink | Carbon | `oklch(0.18 0.025 265)` |
| Muted ink | Graphite | `oklch(0.47 0.025 265)` |
| Line | Pencil | `oklch(0.86 0.018 265)` |
| Room colour | Relay Cobalt | `oklch(0.49 0.22 272)` |
| Response colour | Signal Orange | `oklch(0.67 0.19 45)` |
| Soft cobalt | Cobalt Wash | `oklch(0.94 0.035 272)` |

### Dark alternate

| Role | Value |
| --- | --- |
| Page | `oklch(0.15 0.018 265)` |
| Raised surface | `oklch(0.20 0.022 265)` |
| Primary ink | `oklch(0.96 0.008 95)` |
| Muted ink | `oklch(0.73 0.02 265)` |
| Line | `oklch(0.34 0.025 265)` |
| Room colour | `oklch(0.72 0.16 272)` |
| Response colour | `oklch(0.76 0.15 55)` |
| Soft cobalt | `oklch(0.23 0.055 272)` |

Signal Orange is reserved for the selected response, the Join action, and positive completion. It does not become a second decorative palette.

## 7. Type and shape

Bricolage Grotesque remains the only family. Its slightly irregular construction suits spoken language without importing a classroom or luxury-club costume.

- Display: `clamp(3.7rem, 10.8vw, 10.5rem)`, tightly tracked, maximum two lines.
- Route title: `clamp(3.25rem, 8vw, 8rem)`.
- Section title: `clamp(2.1rem, 4.8vw, 5rem)`.
- Body: `clamp(1rem, 1.3vw, 1.2rem)`, 1.55 line height, maximum 65ch.
- Labels: sentence case. Uppercase is limited to the compact wordmark and never repeated as section decoration.

Corners are mostly 0, 8, or 14 px. Pills are reserved for state controls whose shape improves target clarity. Content does not sit inside generic rounded cards.

## 8. Homepage sequence

### 8.1 Sentence stage

Keep the verified `h1`: **English grows in company.** The sentence remains a complete heading in server HTML. Four buttons, Speak, Listen, Ask, and Try again, change a short adjacent line and the active visual emphasis.

The stage includes:

- one primary Join link above the fold;
- one About text link;
- four native buttons with a clear selected state;
- one generated decorative room image biased away from the main text and faded into the page canvas;
- a thin sentence path that visually hands the active verb toward the next section;
- no photo split, auto-rotation, word scramble, or pointer tracking.

### 8.2 Prompt mixer

A bounded prompt demonstrates what practice can feel like. Three phrase groups combine into one complete prompt. A `New prompt` button advances through authored combinations. No answer is collected.

Default server content includes one complete prompt and the available phrase groups. After explicit activation, the new prompt is announced through `role="status"`.

### 8.3 Activity relay

Four real themes remain: speak without a script, meet across cultures, make something together, and stay for the room. A vertical button rail controls one large companion field.

The selected field includes:

- a short action word;
- a real prompt a visitor could use;
- the existing description;
- one evidence note;
- one optional small photo.

Keyboard users can Tab through every control. Arrow keys move selection within the group. On phones, the controls remain a simple horizontal strip and the companion content stays below them.

### 8.4 Documentary handoff

One candid image appears as proof that the interaction maps to a real room. The image occupies less than half of the section at wide sizes and is not required for comprehension.

### 8.5 Journal relay

Story titles and metadata are the main visual material. On wide screens, a desktop-only `IntersectionObserver` bounds the active work while a passive, requestAnimationFrame-throttled scroll/resize scheduler selects the title crossing the 34% reading line; keyboard focus selects directly. This replaces inconsistent `mouseenter` behavior and prevents threshold-only observer callbacks from leaving the preview stale. Mobile keeps no required companion preview. Every title is a normal link.

### 8.6 Intent close

The final section offers three ordinary links: join, propose something, or ask a question. Each link carries a real query string into the existing contact form.

## 9. Route signatures

| Route | Signature | Photo budget |
| --- | --- | ---: |
| Home | Sentence Stage, Prompt Mixer, Activity Relay | Up to 4 simultaneous roles including the generated hero and story preview |
| About | A sentence assembled from the club principles | 1 optional proof image |
| Activities | Full activity deck with explicit selection and prompts | 1 active image at a time |
| Journal | Typographic story index with companion preview | 1 preview plus article-owned covers |
| Story | Calm reading column with one cover | 1 cover |
| Contact | Intent-aware composition around the existing real form | 0 |

Route openings must not reuse one masthead template. The header and token system supply continuity.

## 10. Theme contract

- Light is the default when the visitor has no saved choice.
- The header exposes one Sun or Moon icon button with a visible accessible name.
- The chosen value is saved to `localStorage` as `english-club-theme`.
- A small pre-hydration script applies the saved value before paint.
- The control changes the full document only. Individual sections do not invent independent dark islands.
- Both themes use complete semantic tokens for background, surfaces, ink, lines, focus, fields, images, and success or error states.

## 11. Motion contract

Motion has four allowed jobs:

1. Show which word or activity became active.
2. Explain a sentence handoff from one chapter to the next.
3. Acknowledge a click, keyboard choice, submit, error, or success.
4. Recompose a companion field when its content changes.

Budgets:

- Control feedback: 140 to 180 ms.
- Content replacement: 260 to 360 ms.
- One chapter handoff: up to 560 ms.
- No loop longer than a short decorative caret blink, and no content auto-advances.

Under `prefers-reduced-motion: reduce`, transforms, clips, smooth scrolling, and animated replacement become instant. Content remains visible in its final position.

## 12. Accessibility and resilience

- Native buttons and links are the interaction primitives.
- Focus and selected states are not colour-only.
- Minimum practical target is 44 by 44 px.
- The mobile navigation uses a real modal pattern with focus containment or a non-modal disclosure without body lock.
- The document remains understandable without JavaScript.
- Hover only adds a preview. It never reveals exclusive content.
- Prompt changes are announced after activation, not during hover.
- No microphone, camera, geolocation, account, WebGL, or canvas is requested.
- A route still looks finished if its optional media fails.

## 13. Anti-slop rejection list

The implementation must reject:

- gradient text, blurred colour blobs, glass panels, and neon glow;
- three equal feature cards, icon-above-title grids, and generic bento boxes;
- floating 3D letters, particles, custom cursors, and cursor-following media;
- decorative labels, fake coordinates, filler microcopy, and section numbering;
- giant radii, wide shadows, and bordered white cards used as default structure;
- fake dashboards, level meters, progress scores, streaks, and member metrics;
- auto-rotating phrases, multiple marquees, and scroll hijacking;
- prestige serif or script styling borrowed from private clubs;
- a photograph on every fold or a full homepage gallery;
- invented events, schedules, partners, outcomes, testimonials, prices, or people.

## 14. Implementation boundary

Keep pages as Server Components. Client islands are limited to:

```text
src/components/play/
  sentence-playground.tsx
  prompt-mixer.tsx
  activity-relay.tsx
  journal-relay.tsx
  theme-toggle.tsx
```

Use React state only for discrete selections. Use CSS variables, transforms, opacity, and clipping for visual feedback. Do not subscribe React state to scroll or pointer position.

## 15. Acceptance

- The first viewport is clean, bright, legible, interactive, and remains sentence-led over a faded supporting image.
- The homepage remains coherent with all optional images removed.
- Light and dark theme controls persist and do not flash the wrong saved scheme.
- Every interactive component works with keyboard, pointer, touch, reduced motion, and JavaScript-disabled server output.
- No public route overflows at 320 px.
- Axe reports no WCAG A or AA violations on representative routes.
- Lint, typecheck, unit tests, Convex tests, production build, and Playwright pass.
- Final desktop, phone, dark, and interaction screenshots are inspected and findings are repaired.
