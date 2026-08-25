# Member Grid Direction

Status: implemented direction; final source authority is `MEMBER-SHOWCASE-DECISION.md`

> Findings about the former 14-row fixture are historical evidence. The final implementation uses 15 source-only identities, all required assignments, and a 5/4/3/2-column contact sheet.

This document turns the current roster into a public organization profile. It is intentionally bounded: keep the existing hero and role map, replace the long placeholder list with one editorial contact sheet, and do not add a second interaction model.

## Design read

Reading this as: a public organization profile for prospective members, collaborators, and campus stakeholders, using an editorial contact-sheet language inside the existing Conversation Relay identity.

Design dials:

- Visual variance: 8/10
- Motion intensity: 6/10
- Information density: 5/10
- Primary accent: existing cobalt
- Signal accent: existing orange, reserved for selection and calls to action

The intended feeling is an annotated club photograph wall, not a staff dashboard and not a startup team template.

## Evidence from the current page

### What is working

- The hero in `docs/evidence/members-desktop-light.png` and `docs/evidence/members-desktop-dark.png` already has a clear editorial voice, a useful image fade, and good theme parity.
- The five-level role map is distinctive and explains hierarchy without drawing an organization chart.
- Native role selection in `src/components/members/member-relay.tsx` is deterministic and understandable.
- Existing theme tokens in `src/app/globals.css` are sufficient. A new color system is not needed.

### What is weakening the page

- The roster is a long one-column list. It reads as administration rather than a public organization profile.
- The repeated icon blocks, numbered voices, and internal status copy dominate the people themselves.
- The mobile state shown in `docs/evidence/members-mobile-roster-light.png` is especially tall. A visitor must scroll through large rows before seeing the breadth of the club.
- The current 14 fixtures in `src/content/member-placeholders.ts` omit Treasury, even though Treasury is part of the supplied Core Member structure.
- The roster header uses a split-heading composition already used by many generic landing pages. It should become one compact editorial stack above the filters.

## Core decision

Use 15 fictional composite identities during design and development. Fifteen is not arbitrary: it covers every supplied responsibility, restores Treasury, and creates a complete five-column by three-row contact sheet at wide desktop sizes.

The roster must be a real CSS Grid, not rows placed inside a grid-like wrapper. Cards share fine rules instead of floating as rounded white boxes. This gives the section the character of a printed contact sheet and avoids the familiar card-wall pattern.

Keep the existing hierarchy:

1. Member
2. Pioneer
3. Coordinator
4. Core Member
5. Board / Board of Directors

Keep the role map above the roster. Selecting a role filters the contact sheet below; it does not replace the companion explanation panel.

## Grid geometry

The grid uses the existing page container, with a maximum width of `92rem`.

| Viewport | Columns | Rule gap | Card information padding | Name size |
| --- | ---: | ---: | ---: | ---: |
| `1280px` and wider | 5 | `1px` | `18px` | `clamp(1.35rem, 1.6vw, 1.75rem)` |
| `960px` to `1279px` | 4 | `1px` | `16px` | `1.35rem` |
| `680px` to `959px` | 3 | `1px` | `14px` | `1.2rem` |
| below `680px` | 2 | `1px` | `12px` | `1.05rem` |

At a `1440px` viewport, the existing container is approximately `1408px` wide. Five columns with four `1px` rules produce cards approximately `280px` wide. At a `320px` viewport, the existing 16px page margins leave approximately `288px`; two columns remain approximately `143px` wide without horizontal overflow.

Implementation geometry:

```css
.memberGrid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  border: 1px solid var(--line);
  background: var(--line);
}

@media (max-width: 79.9375rem) {
  .memberGrid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 59.9375rem) {
  .memberGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 42.4375rem) {
  .memberGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

Important constraints:

- Do not use `auto-fit`. A filtered result must keep the same card width and align to the left rather than stretching to fill the row.
- Preserve DOM order. Do not use CSS ordering to manufacture the 5 by 3 composition.
- Use `minmax(0, 1fr)` so long division labels cannot force horizontal overflow.
- The grid rule is also the outer border. Cards have no individual shadow, floating border, or rounded shell.
- The contact sheet section uses `var(--surface)` on each card and `var(--line)` between cards. The section does not invert into a separate dark band.

## Roster header and controls

Place the roster header in one vertical stack before the role filter:

1. Eyebrow
2. Heading
3. Supporting sentence, maximum `50ch`
4. Role filter
5. Live result count
6. Contact sheet

Do not place a paragraph in a disconnected right column. The relationship between title, explanation, and filter should be immediate.

The existing native radio-group behavior should remain. At desktop widths, controls can sit on one line. Below `680px`, use a horizontally scrollable single row with visible edge affordance, 44px minimum targets, and no hidden scrollbar-only navigation. The selected item must remain visible after selection.

The count should update through a polite status region. Examples:

- `15 profiles`
- `5 Coordinator profiles`
- `Showing 4 Core Member profiles.`

## Card anatomy

Each `li` contains one `article`. A card has two zones only.

### 1. Portrait zone

- Aspect ratio: `4 / 5`
- Width: full card width
- Image behavior: `object-fit: cover`
- Default focal point: `50% 36%`, overridable per portrait
- No circular crop
- No gradient veil over the face
- No text positioned on top of the portrait
- No decorative status dot

### 2. Identity zone

Order:

1. Small Heroicon and role label
2. Full name
3. Assignment or division
4. One concrete contribution sentence

Geometry:

- Minimum height: `9rem` at `680px` and wider
- Minimum height: `8.25rem` below `680px`
- Role line: `0.75rem`, uppercase or tracked label, never a pill
- Name: maximum two lines; reserve space for two lines so adjacent cards retain rhythm
- Assignment: `0.8125rem` to `0.875rem`, muted foreground
- Contribution: `0.875rem`, maximum three lines on desktop and two lines below `680px`

If a card has no action, it is not focusable and must not pretend to be clickable. If a later profile page is added, use one clear text link such as `Read profile`, give it a visible focus state, and keep the whole-card hover treatment supplementary.

## Fictional roster

These are composite identities for the current visual build. They must not carry social handles, credentials, personal history, or affiliations that could be mistaken for claims about a real person.

| Name | Role | Assignment | Contribution line |
| --- | --- | --- | --- |
| Naya Rahmadini | Member | Member | Practices through weekly prompts and helps new voices join the table. |
| Damar Aji Prakoso | Member | Member | Brings questions from daily life into small-group conversation. |
| Sinta Alviana | Pioneer | Pioneer | Keeps shared sessions moving and turns ideas into club routines. |
| Raka Mahendra | Pioneer | Pioneer | Helps first-time participants find an easy way into the room. |
| Kezia Aurellia | Coordinator | Academic | Shapes practice prompts and keeps each session clear and useful. |
| Ilham Fadhlan | Coordinator | Art | Builds visual exercises that give every conversation a subject. |
| Raisa Adinata | Coordinator | Media, Information, and Communication (MIC) | Documents club work and keeps public information clear. |
| Miko Pranadipa | Coordinator | Public Relation | Opens conversations with guests, collaborators, and nearby communities. |
| Nadine Salsabila | Coordinator | Human Resource Development | Looks after participation, handovers, and how teams work together. |
| Sekar Ayuningtyas | Core Member | Secretary | Keeps decisions, notes, and follow-ups easy to find. |
| Dion Aryasatya | Core Member | Treasury | Keeps club spending recorded, legible, and accountable. |
| Farah Nirmala | Core Member | Vice President | Connects divisions and supports the club's working rhythm. |
| Fadhil Wicaksana | Core Member | President | Holds the wider direction and keeps responsibility shared. |
| Ratih Kusumadewi | Board / Board of Directors | Pembina / Mentor | Offers guidance while leaving members room to lead. |
| Harun Wiratama | Board / Board of Directors | Kepala UPA | Connects the club's work with the wider UPA. |

Names should be stored with stable fixture IDs. Filtering, keys, image references, and focus behavior must never depend on array position or the displayed name.

## Portrait direction

Generate 15 distinct fictional portraits as temporary visual assets. The set should feel like photographs made during one club season, not 15 unrelated stock portraits.

Shared direction:

- Adult Indonesian university community
- Club room, campus library, workshop table, corridor, or small event setting
- Soft daylight and practical room light
- Candid or slightly off-axis gaze
- Natural expressions, including neutral concentration and mid-conversation moments
- Everyday clothing with varied colors, patterns, and silhouettes
- Consistent documentary color treatment
- Enough background context to suggest a working club, but no readable signage or logos

Variation requirements:

- Distinct face shapes, hair, headwear, glasses, pose, and wardrobe
- Board portraits may read slightly older than the student roles
- Vary seated, standing, three-quarter, and waist-up crops while preserving face scale
- Avoid repeating the same room corner, gesture, or camera angle more than twice

Reject:

- Corporate headshots on seamless backgrounds
- Graduation props, suits, folded-arm executive poses, and uniform lanyards
- Perfectly centered faces with identical smiles
- AI artifacts in hands, glasses, teeth, text, or jewelry
- Excessive orange and blue wardrobe chosen only to match the interface
- Photos of actual participants used as fictional identities

Master crop: `1200 × 1500` at 4:5. Deliver responsive AVIF or WebP derivatives. Keep focal-point metadata per image.

## Identity and release boundary

The fictional roster is suitable for a design build, screenshot review, and local demonstration. It is not suitable for publication as if these people are members.

Use a non-production notice wherever the fictional roster can be viewed:

> The identities in this design draft are fictional. Replace them with approved member profiles before publication.

The production release rule is strict:

- Fictional fixtures must be disabled in production.
- A real profile can appear only after the member has approved the displayed name, portrait, role, division, and contribution line.
- If no approved profiles exist, render the honest empty state in this document instead of silently falling back to fiction.
- Never merge fictional fixture IDs into the consent-cleared member collection.

## Public copy

The following block is the recommended organization-profile copy intended to appear on the page.

### Hero

Eyebrow:

> English Club members

Heading:

> Every voice changes the room.

Supporting copy:

> Members practise, make, organise, and pass the room forward together.

### Role map

Heading:

> Five ways to carry the club.

Supporting copy:

> Responsibility grows from taking part to helping the whole room move.

### Roster

Eyebrow:

> Club roster

Heading:

> People who carry the conversation.

Supporting copy:

> Each profile shows one part of the club's shared work.

### Empty state

Heading:

> Public profiles are being prepared.

Body:

> Names and portraits appear only with each member's permission.

### Unavailable state

Heading:

> The member directory is temporarily unavailable.

Body:

> The role map is still available above.

### Closing call to action

Eyebrow:

> Join the next session

Heading:

> Bring another voice into the room.

Body:

> Come to practise, share a project, or help the next person speak.

Primary action:

> Join English Club

Secondary action:

> Explore activities

## Motion specification

Motion explains filtering and focus. It must not compete with faces.

### Initial entry

- Cards enter once when the roster first becomes visible.
- Duration: `300ms`
- Properties: `opacity` and `transform` only
- Start state: `opacity: 0`, `translateY(8px)`
- Stagger: `28ms`, capped at `168ms`

### Role filtering

- Outgoing grid: `100ms`, opacity to `0.92`, translate down `4px`
- Content update after the short exit phase
- Incoming cards: `300ms`, opacity from `0`, translate up from `8px`
- Stagger: `24ms`, capped at `144ms`
- Do not animate grid dimensions or card height
- Do not use a scroll listener to decide which portrait is shown

### Hover and focus

- Portrait scale: maximum `1.025`
- Identity zone shift: maximum `2px` upward
- Duration: `160ms`
- Selected or linked cards use border and text contrast, not glow or tilt
- Keyboard focus must be at least as visible as hover

### Reduced motion

Under `prefers-reduced-motion: reduce`:

- Remove transforms, delays, and stagger
- Update filtered results immediately
- Keep only instantaneous color and border changes
- Do not hide information behind an animation-complete event

## Theme behavior

Light and dark themes use the same composition and hierarchy.

- Card surface: `var(--surface)`
- Grid rules: `var(--line)`
- Primary text: `var(--ink)`
- Supporting text: `var(--muted)`
- Active filter and visible focus: existing cobalt primary
- Orange signal: selection marker and primary call to action only

In dark mode, apply only the existing subtle media treatment. Do not add a blue wash over faces. The portrait should remain the highest-detail region of the card in both themes.

## Responsive behavior

### Wide desktop

- Five-column contact sheet, three complete rows
- Role controls on one line
- Contribution line visible
- No card grows when a role filter returns fewer than five profiles

### Tablet and small desktop

- Four or three columns according to the geometry table
- The header remains a single vertical stack
- Long division names wrap below the name and never shrink the portrait

### Mobile

- Two-column contact sheet down to `320px`
- Portrait remains 4:5
- Name reserves two lines
- Contribution clamps to two lines
- Role filter can scroll horizontally, with a visible active state and 44px controls
- No sticky panel, hover dependency, or horizontal page overflow
- At `200%` zoom, content may reflow to one column if required by the browser; information must remain in DOM order

## Accessibility requirements

- Keep `ul`, `li`, and `article` semantics for the roster.
- Keep the role selector as a native radio group with a visible legend.
- Announce the new result count through `role="status"` or a polite live region.
- Use factual image alternatives such as `Portrait of Naya Rahmadini`. Do not repeat the role in the image alternative because it is already adjacent text.
- Do not make a static card focusable.
- Any future profile link needs a descriptive accessible name, such as `Read Naya Rahmadini's profile`.
- Keep controls at least `44px` by `44px`.
- Maintain at least 4.5:1 contrast for body copy and 3:1 for large text and focus indicators.
- Never expose a bio only on hover.
- Keep reading and focus order identical to DOM order.

## Anti-slop guardrails

Do not add:

- Rounded white cards with soft shadows
- Circular avatars
- Role-colored rainbow badges
- Glass panels or blurred backdrops
- Gradient text
- Decorative counters or oversized profile numbers
- An icon centered inside an empty rounded square
- Hover-only biographies
- Mouse-following effects, tilt, particles, or motion trails
- Generic headings such as `Meet the minds` or `Faces behind the club`
- Internal data, storage, or quality-assurance language in public copy

The only repeated geometry should be the contact-sheet cell itself. Personality comes from portraits, names, assignments, and the one-pixel editorial rules.

## Acceptance checklist

- [ ] The roster uses CSS Grid with five columns at `1280px` and wider.
- [ ] The full roster contains 15 profiles and forms a 5 by 3 desktop sheet.
- [ ] Member, Pioneer, all five Coordinator divisions, all four Core Member positions, and both Board responsibilities are represented.
- [ ] Treasury is present.
- [ ] No card stretches when a filter returns fewer items.
- [ ] No horizontal overflow occurs at `320px`.
- [ ] Portraits use a consistent 4:5 crop with unique focal points.
- [ ] The page renders correctly in light and dark themes.
- [ ] Role filtering is deterministic and announces its result count.
- [ ] Initial entry and filter motion use only opacity and transform.
- [ ] Reduced-motion mode removes stagger and movement.
- [ ] Public page copy contains no numbered voices, data-source labels, or internal review language.
- [ ] Fictional identities cannot appear in production.
- [ ] The empty state appears when no consent-cleared member profiles exist.
- [ ] Desktop light, desktop dark, and `320px` mobile screenshots are reviewed after implementation.
