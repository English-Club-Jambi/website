---
name: English Club
description: A bright, language-led identity where conversation becomes interaction, responsibility is shown as a relay, practice uses a ruled answer line, and administration stays visibly operational.
colors:
  relay-cobalt: "oklch(0.49 0.22 272)"
  relay-cobalt-strong: "oklch(0.40 0.21 272)"
  signal-orange: "oklch(0.67 0.19 45)"
  chalk: "oklch(0.985 0.006 95)"
  paper: "oklch(1 0 0)"
  carbon: "oklch(0.18 0.025 265)"
  graphite: "oklch(0.47 0.025 265)"
  pencil: "oklch(0.86 0.018 265)"
  cobalt-wash: "oklch(0.94 0.035 272)"
  dark-room: "oklch(0.15 0.018 265)"
  dark-paper: "oklch(0.20 0.022 265)"
  dark-ink: "oklch(0.96 0.008 95)"
  dark-muted: "oklch(0.73 0.02 265)"
  dark-line: "oklch(0.34 0.025 265)"
typography:
  display:
    fontFamily: '"Bricolage Grotesque", Arial, sans-serif'
    fontSize: "clamp(3.7rem, 10.8vw, 10.5rem)"
    fontWeight: 760
    lineHeight: 0.82
    letterSpacing: "-0.055em"
  route:
    fontFamily: '"Bricolage Grotesque", Arial, sans-serif'
    fontSize: "clamp(3.25rem, 8vw, 8rem)"
    fontWeight: 740
    lineHeight: 0.88
    letterSpacing: "-0.045em"
  headline:
    fontFamily: '"Bricolage Grotesque", Arial, sans-serif'
    fontSize: "clamp(2.1rem, 4.8vw, 5rem)"
    fontWeight: 690
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  title:
    fontFamily: '"Bricolage Grotesque", Arial, sans-serif'
    fontSize: "clamp(1.35rem, 2.5vw, 2.5rem)"
    fontWeight: 650
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Bricolage Grotesque", Arial, sans-serif'
    fontSize: "clamp(1rem, 1.3vw, 1.2rem)"
    fontWeight: 430
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: '"Bricolage Grotesque", Arial, sans-serif'
    fontSize: "0.9rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0"
rounded:
  compact: "8px"
  media: "14px"
  state: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
  12: "48px"
  16: "64px"
  24: "96px"
  32: "128px"
components:
  button-primary:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.carbon}"
    typography: "{typography.label}"
    rounded: "{rounded.compact}"
    padding: "14px 20px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.relay-cobalt}"
    typography: "{typography.label}"
    rounded: "{rounded.compact}"
    padding: "13px 19px"
    height: "48px"
  state-control:
    backgroundColor: "{colors.cobalt-wash}"
    textColor: "{colors.carbon}"
    typography: "{typography.label}"
    rounded: "{rounded.state}"
    padding: "12px 18px"
    height: "46px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.carbon}"
    typography: "{typography.body}"
    rounded: "{rounded.compact}"
    padding: "13px 14px"
    height: "48px"
---

# Design System: English Club

## Overview

**Creative North Star: The Conversation Relay**

The website behaves like language moving through a room. A visitor changes one part of a sentence, receives a prompt, explores how the club practises, reads a story, and passes a clear intent into the contact form.

The primary visual material is language. Documentary photographs confirm that the room and activity exist, but the layout never waits for a photograph to become interesting.

**Key characteristics**

- A clean, bright reading canvas with one committed cobalt.
- Large selectable phrases and clear response states.
- Asymmetrical whitespace instead of a grid of content cards.
- Short, user-controlled motion that explains a choice.
- One generated atmospheric hero layer, followed by sparse documentary proof.
- One global dark theme with the same hierarchy and content.
- One calm Assessment Lab register that makes timing, saving, transcript use, section progress, exact practice points, and estimate limits easy to understand.
- One separate rounded-neobrutalist admin register whose boundaries communicate work state rather than decoration.

## Colours

### Primary

- **Relay Cobalt** (`oklch(0.49 0.22 272)`): identity type, active paths, focus, and the selected language state.
- **Relay Cobalt Strong** (`oklch(0.40 0.21 272)`): pressed controls and high-contrast cobalt text on light surfaces.

### Response

- **Signal Orange** (`oklch(0.67 0.19 45)`): the Join action, current response, and successful completion. It is not a general decorative fill.

### Light neutrals

- **Chalk** (`oklch(0.985 0.006 95)`): default page canvas.
- **Paper** (`oklch(1 0 0)`): fields and the few raised functional surfaces.
- **Carbon** (`oklch(0.18 0.025 265)`): primary text.
- **Graphite** (`oklch(0.47 0.025 265)`): metadata and secondary copy.
- **Pencil** (`oklch(0.86 0.018 265)`): separators and field edges.
- **Cobalt Wash** (`oklch(0.94 0.035 272)`): inactive language controls and quiet grouping.

### Dark mapping

- Page: `oklch(0.15 0.018 265)`.
- Surface: `oklch(0.20 0.022 265)`.
- Ink: `oklch(0.96 0.008 95)`.
- Muted ink: `oklch(0.73 0.02 265)`.
- Line: `oklch(0.34 0.025 265)`.
- Cobalt: `oklch(0.72 0.16 272)`.
- Orange: `oklch(0.76 0.15 55)`.

### Colour rules

**The One Room Rule.** A page uses one complete theme. Do not invert unrelated sections independently.

**The Response Rule.** Orange must indicate a response or the Join action. If it does neither, use a neutral or cobalt.

**The No False Green Rule.** Golf, wellness, and environmental greens belong to the references, not this club.

Gradient text, blurred colour blobs, neon glow, and glass surfaces are prohibited. A gradient may be used only as a functional mask that fades hero media into the page canvas.

## Typography

Use Bricolage Grotesque for the whole public experience. Contrast comes from width, weight, scale, spacing, and composition. Do not add a prestige serif, script, pseudo-terminal mono face, or generic second sans.

### Roles

- **Display**: homepage sentence stage only. Maximum two lines.
- **Route**: one route-level heading. Maximum two lines outside article titles.
- **Headline**: one clear section idea.
- **Title**: activities, stories, and interactive companion headings.
- **Body**: reading copy at a maximum 65ch.
- **Label**: controls and metadata in sentence case.

The wordmark may use compact uppercase. Repeated section eyebrows may not.

## Composition

The layout uses a flexible 12-column frame but does not expose a visible card grid. Major elements may cross column boundaries. Blank space is an active part of the rhythm.

Preferred silhouettes:

- **Sentence Stage**: one large phrase over a low-contrast generated room scene, an adjacent response line, controls below, and the primary action within the first viewport.
- **Prompt Mixer**: a bordered language line with replaceable phrase parts and one explicit action.
- **Activity Relay**: a compact vertical or horizontal control rail beside one large companion field.
- **Documentary Handoff**: one quiet image crossing a text edge, never a full gallery.
- **Journal Relay**: linked titles as the main field with one companion preview on wide screens.
- **Member Relay**: five equal responsibility channels beside one changing role companion, followed by a consent-gated editorial roster.
- **Answer Line**: a ruled assessment composition with a briefing, one current prompt, explicit response state, bounded section navigator, and result review.
- **Publication Rail**: a compact admin state strip connecting draft revision, checks, human approvals, published version, and rollback.
- **Intent Close**: three ordinary query-string links arranged as a conversational choice.
- **Secretariat Locator**: an asymmetric ruled address field joined to one live map plane, one external directions action, and small copy controls, never a generic map card.

Three equal columns are never the default. A section must not be wrapped in a rounded container unless the boundary is interactive or functional.

## Shape and elevation

Use square edges for public page regions and typographic fields. Use 8px for public controls and fields, 14px for documentary media, and a pill only for a bounded state selector.

The system is flat at rest. One compact shadow may separate an open mobile dialog. Do not combine a border, large radius, and wide shadow to simulate a generic card.

The administration workspace is a deliberate exception with its own namespaced tokens: 2px functional edges, 10px controls, 14px panels, and a short `3px 3px 0` hard shadow on active work surfaces. Rounded semi-neobrutalism must remain compact and practical. It does not recolour itself from the public theme, use soft shadows, or turn every datum into a card.

## Interaction

### Sentence Playground

The server renders a complete `h1`, support copy, actions, and four buttons. Selection changes one response line and the visual weight of a related word. Nothing auto-cycles.

### Prompt Mixer

An authored prompt changes only after `New prompt` is activated. The result is announced politely. It does not accept or store an answer.

### Activity Relay

Four buttons control one companion panel. Each panel contains a verb, a prompt, a description, an evidence note, and optional media. Arrow keys may move within the group, while Tab always reaches every control.

### Journal Relay

On wide screens, a bounded `IntersectionObserver` and a passive scroll/resize scheduler select the story crossing a stable reading line; the scheduler performs at most one geometry read per animation frame, and keyboard focus can select a story explicitly. This replaces ambiguous `mouseenter` behavior without updating React state for every raw event. Every story remains a normal link with metadata in the document. Mobile does not depend on the preview.

### Member Relay

One native radio group controls the responsibility companion and the published roster filter. `All roles` is the initial view, followed by role codes `0` through `4`. Every channel contains a Heroicon, public label, and short scope sentence. All role definitions and supplied subtypes remain in server HTML; JavaScript changes emphasis only. A concise status message announces roster updates without moving focus.

The numeric values are classification codes, not scores or ranks. Published real people come only from Convex records with cleared profile consent. A real portrait also requires separately cleared photo consent. The development deployment uses 15 explicitly fictional, seed-batch-labelled Convex profiles and generated portraits to exercise the production-shaped directory. They are never production roster evidence, and an unavailable query remains an honest unavailable state.

### Theme control

Light is the unsaved default. The theme button changes the full document, stores `english-club-theme`, and exposes `Switch to dark theme` or `Switch to light theme` as its accessible name.

### Secretariat locator

The About page renders the place name, street address, and Plus Code in server HTML. A lazy OpenStreetMap iframe adds direct pan and zoom controls without requiring a map credential. Google Maps remains a separate directions action. Address and Plus Code buttons use the Clipboard API as an enhancement, announce success or failure, and leave the complete location readable when the map or copying is unavailable.

### Institutional record

The UNJA emblem appears once, inside a ruled About record that pairs the published formation name and date with direct institutional sources. It is a provenance mark, not a decorative partner logo or a replacement English Club identity. A pale primary wash links the mark column to the larger typographic record; source links form a flat publication rail rather than a logo wall or card cluster.

### Contact and privacy operations

Contact separates two responsibilities. The English Club form is the working route for joining, proposing, and asking; an adjacent operating ledger names the five-working-day review target and 180-day maximum. A second ruled block lists Perpustakaan UNJA channels with an explicit institutional label and verification link. Privacy uses an editorial ledger—numbered record types, plain retention facts, one correction action—not a grid of compliance cards.

### Home programme quiz

The Home quiz is an untimed four-question orientation interaction assembled from reviewed Activities wording. It checks one explicit answer at a time, gives a plain explanation and Activities link, and stores no identity, attempt, score history, or free text. It must disappear or fall back to the Activities link if the supporting copy contract cannot build a complete question set.

### Assessment Lab

The Assessment Lab uses the **Answer Line** direction: large but bounded headings, thin ruled answer rows, compact evidence notes, and Signal Orange only for the next explicit action. Briefings disclose timing mode, Listening mode, privacy, fixed-form behavior, and result limits before Start.

The runner presents one current question and at most one related stimulus. Answer selection keeps focus in place; explicit navigation moves focus to the next prompt heading. The current-section navigator is a contained dialog rather than a wall of every question in a full form. Audio never autoplays. Transcript support is available through an explicit action and permanently labels that attempt and result.

Results show exact bank outcomes, time used, mode, section order, and paginated review. Four-skill forms may add a clearly separated band and comparable-total estimate; quick forms may add only a section estimate. Full Practice may offer an opt-in email package after the result-limit note and before review. It contains a summary, section detail, one attached practice-completion record, and a private review link. The default certificate choice stays compact: Mendalo Record is ready, with an explicit action to choose another design. The form keeps Cloudflare Turnstile in its own labelled verification row and stays disabled until the widget supplies a token. The certificate records completion of one English Club practice form, says that the participant supplied the printed name and that English Club did not verify it, and contains no private review link. It is not an official score, proof of English proficiency, prediction, calibrated equivalent, CEFR band, placement, or admission evidence. Quick Practice has no certificate delivery. Review keys and explanations have no pre-submit path.

After a successful Brevo response, the inline section names provider acceptance, masks the address, states the grant expiry, and offers review-link revocation. A network or provider response that cannot prove acceptance uses a separate `Delivery status not confirmed` state; the interface does not retry the same send. `Prepare a separate copy` returns to the form and starts a new explicit request.

### Administration workspace

Admin layout, copy, media, theme, and assessment tools share one reusable shell and control set. Native browser selects are replaced by the shared portalled Select component; destructive assessment changes use a labelled modal confirmation with Escape, pending lock, and focus return. Heroicons carry every functional symbol.

Page copy is manifest-bound and capped at 200 stored entries per page and locale. Journal content is structured Tiptap-compatible JSON, never arbitrary HTML; image nodes retain media IDs and factual alt text, and map nodes retain bounded coordinates. Appearance edits seven OKLCH anchors per public mode. Convex derives the complete palette, blocks failed contrast checks, inserts an immutable version, and changes the public pointer atomically.

## Motion

Motion is user-controlled and has one of four jobs: hierarchy, handoff, feedback, or state replacement.

- Fast response: 160ms.
- Standard replacement: 300ms.
- Chapter handoff: 520ms maximum.
- Admin response: 160ms; admin panel/state replacement: 220ms.
- Standard easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Press easing: `cubic-bezier(0.4, 0, 0.2, 1)`.

Do not attach React state to scroll or pointer position. No auto-advancing phrase, continuous scramble, scroll hijack, custom cursor, marquee stack, WebGL, or canvas-only content.

Under reduced motion, transforms and clips become immediate. Opacity may change only at near-instant duration. Smooth scrolling is disabled.

## Photography

Photography is a receipt, not the instrument.

- One generated placeholder scene may sit behind the hero sentence. It fades into the canvas, stays decorative, and must never reduce text contrast or become required for composition.
- Home uses four simultaneous image roles at most: hero atmosphere, one active activity image, one documentary handoff, and one journal preview.
- About uses at most one supporting image.
- Activities displays at most one active image at a time.
- Journal media belongs to the story, not the global identity.
- Assessment delivery media belongs to a published immutable assessment version; draft/source media belongs to a separate private R2 bucket.
- Members may use one generated adult group scene behind its opening. It is decorative atmosphere and cannot be used as a real member portrait.
- A real member portrait uses a reviewed R2 object key only after identity, rights, and portrait consent are cleared.
- A route remains composed when media is absent.
- Consent, EXIF removal, R2 object keys, and factual alt text remain mandatory.

Do not publish held child or video assets. Do not infer a partnership, identity, result, or programme frequency from an image.

## Navigation and controls

The header stays one line at wide sizes. It contains the wordmark, five route links—About, Activities, Members, Practice, and Journal—one Join link, and one theme control. Active routes use weight plus an underline.

The phone menu is either a non-modal disclosure that leaves the page operable or a real modal dialog with contained focus. Body scroll locking without focus isolation is not acceptable.

Every target is at least 44px in practical size. Focus rings use cobalt plus a contrasting offset. A selected state uses shape, weight, or an icon as well as colour.

Functional symbols use Heroicons React SVG components. Do not use Unicode arrows, ASCII glyphs, emoji, or text characters as stand-in icons.

## Content voice

Write plain English for learners. Prefer a concrete action, room, question, or next step. Keep short fragments only when the rhythm earns them.

Do not use inflated claims, manufactured warmth, fake quotes, generic empowerment language, or clever product metaphors. Unknown facts remain absent.

## Do

- Make the subject interactive through real sentences and prompts.
- Keep Practice visually related to the public brand while making save, timer, transcript, section, and result states more restrained than the landing pages.
- Keep admin tokens independent from the palette being edited and make publication state visible before an irreversible action.
- Keep the Join path visible without repeating a large CTA at every chapter.
- Use whitespace and type scale to separate chapters.
- Let one selected state recompose an entire companion field.
- Explain every confirmed role even when no member profile is public yet.
- Keep the Member roster visually credible: generated portraits, real working-style biographies, shared card rules, and no QA language in public copy.
- Keep profile-text and portrait consent as separate public gates.
- Keep server HTML complete and useful.
- Preserve keyboard, touch, hover, reduced-motion, and no-JavaScript parity.
- Treat light and dark as complete token mappings.

## Do not

- Do not build equal icon cards, a bento dashboard, or a feature checklist.
- Do not add fake scores, levels, streaks, metrics, schedules, testimonials, or partner marks.
- Do not publish official, predicted, calibrated, CEFR, proficiency, placement, or admission language for an English Club practice result. A Full Practice completion record is the one narrow exception: it may state that the learner completed one form, must retain the result limit, and must not look like a credential, award, pass result, university diploma, or verified qualification.
- Do not present development-seeded fictional profiles as sourced roster evidence or copy them into production. Do not invent member totals, terms, achievements, testimonials, or contact details.
- Do not turn the five role codes into a pyramid, prestige ladder, floating-card wall, or filter-heavy directory product. The contact sheet remains one ruled composition.
- Do not use gradient text, decorative gradients, glow, glass, 3D letters, particles, or cursor-following images. The single hero media fade is the exception.
- Do not decorate sections with tiny labels, coordinates, numbers, or filler metadata.
- Do not create a homepage gallery or put a photograph on every fold.
- Do not add microphone, camera, geolocation, a learner-facing account prompt, audio autoplay, or speech recognition to the public experience. Anonymous assessment identity begins only after Start; administrator sign-in remains inside `/admin`.
- Do not expose assessment answer keys, private media URLs, admin identity data, or signed R2 URLs through public payloads or visual evidence.
- Do not borrow private-club scripts, beige prestige styling, or environmental category green.

## Acceptance checklist

- [x] The default first paint is bright and does not flash a saved dark choice.
- [x] Hero heading and primary action fit within common desktop and phone first viewports.
- [x] No non-article `h1` exceeds two lines at tested widths.
- [x] Every interactive state is keyboard and touch operable.
- [x] Reduced motion removes spatial transition without removing meaning.
- [x] Home remains visually complete when optional images are unavailable.
- [x] No route overflows at 320px.
- [x] Axe finds no WCAG A or AA violations on representative routes.
- [x] Final desktop, phone, dark, and interaction screenshots have been inspected.
- [x] Member role selection, showcase/unavailable roster states, portrait consent, true grid layout, and server-HTML parity are verified.
- [x] The expanded header is inspected at 880, 900, 1024, and 1440 px.
- [x] Member desktop light, desktop dark, phone, 320 px, selected-role, and roster-detail screenshots are inspected.
- [x] Practice overview, briefing, question controls, dialogs, result limits, and 320 px behavior have focused automated coverage.
- [ ] Full Practice email delivery is checked with an approved Brevo configuration, active exact-host Turnstile widget, pre-Siteverify limiter, real attachment, fragment access link, 30-minute review-session expiry, 30-day grant expiry, uncertain-provider state, and a 320 px result-page review. Brevo account evidence also proves anonymous or per-contact consent-aware tracking, approved log retention, and `Never store previews`; source code cannot enforce those provider settings.
- [x] Admin and Assessment workspaces use the rounded operational neobrutalist system, reusable controls, Heroicons, and reduced-motion rules.
- [x] Public theme publication accepts only structured numeric tokens and preserves the visitor's independent light/dark choice.
- [ ] Confidential Assessment upload remains disabled until the separate private R2 bucket and credentials are configured and smoke-tested.
- [ ] A public assessment remains blocked until original content and all four current-revision human approvals exist.
