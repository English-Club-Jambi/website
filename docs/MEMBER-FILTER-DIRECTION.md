# Member Filter Direction

Status: UX and interaction contract for `/members`

Scope: one Filter button beside the directory count, one inline panel for role, division or position, and year joined, synchronized with the existing role atlas and contact-sheet grid.

This document does not authorize a search field, sorting, a grid or list switch, URL query parameters, or a new route.

## Design read

Reading this as: an organization profile for prospective members and campus collaborators, with an editorial contact-sheet language and a quiet filtering layer that supports the portraits instead of turning the page into a dashboard.

Design dials:

- `DESIGN_VARIANCE: 7`
- `MOTION_INTENSITY: 5`
- `VISUAL_DENSITY: 5`

The role atlas remains the expressive interaction. The filter panel is the precise tool.

## Current evidence

### Source observations

- `src/components/members/member-relay.tsx` owns one `selection` state and uses it for both the role atlas and roster filtering.
- The role filter currently supports only `all` or one role level from `0` through `4`.
- The toolbar currently renders a count on the left and plain role context on the right. It has no action control.
- `src/components/members/member-relay.module.css` already implements a true five, four, three, and two-column contact-sheet grid.
- `content/member-roles.ts` already defines every valid Coordinator division, Core Member position, and Board position.
- `PublicMember`, the Convex members table, and the public member validator do not contain a year field.
- `@heroicons/react` is already installed and used across the page.

### Screenshot observations

- `docs/evidence/members-desktop-roster-light.png` shows the contact sheet working at five columns. The weak point is the passive `All roles` text at the toolbar edge.
- `docs/evidence/members-coordinator-desktop-light.png` confirms that the atlas already controls the visible Coordinator roster.
- `docs/evidence/members-320-roster-light.png` shows that the current toolbar stacks `15 members` and `All roles` vertically. This leaves space but provides no clear filter action.
- `docs/evidence/members-desktop-dark.png` confirms that the atlas, directory, and contact sheet share usable dark-theme tokens.

## Core UX decision

Replace the passive toolbar context with one explicit Filter button. The panel opens directly below the toolbar and above the contact sheet.

The panel stays in document flow. It is not a modal, drawer, floating popover, or bottom sheet. This choice keeps the page in the language of an organization profile, avoids focus trapping, and works at 320px without covering portraits.

The roster updates immediately when a control changes. There is no Apply button. The panel stays open until the visitor closes it with the same Filter button or presses Escape.

## Toolbar contract

### Closed, no active filters

Left side:

> 15 members

Right button:

> Filter

### Closed, active filters

Left side:

> 2 members

Supporting line:

> Coordinator, Academic, joined 2025

Right button:

> Filter

The button also shows a small semantic count, such as `3`, when three facets are active. The count is not a decorative dot and not a floating badge. It sits inside the button after the label and has an accessible name through the button.

Suggested accessible label:

> Filter members, 3 active filters

### Geometry

- Toolbar: `display: grid`
- Columns: `minmax(0, 1fr) auto`
- Minimum height: `64px` on desktop, `60px` below `680px`
- Filter button minimum target: `44px` high
- Button maximum practical width at 320px: `108px`
- Button aligns to the right edge of the contact sheet
- Count and summary align to the left edge of the contact sheet
- The summary may wrap within the left column; it never pushes the Filter button onto another row

### Heroicons

- `FunnelIcon` at 20px for the Filter button
- `ChevronDownIcon` at 18px inside each custom-styled native select
- `ArrowPathIcon` at 18px for Clear filters

Use the existing 24px outline family and a consistent `strokeWidth` near `1.75`. Do not add text arrows, emoji, custom SVG paths, or another icon family.

## Filter panel composition

The open panel follows the same horizontal tracks as the contact sheet.

### At 1280px and wider

Use five equal tracks:

- Role spans tracks 1 and 2
- Division / position spans tracks 3 and 4
- Year joined spans track 5

### From 960px to 1279px

Use four equal tracks:

- Role spans tracks 1 and 2
- Division / position occupies track 3
- Year joined occupies track 4

### From 680px to 959px

Use two equal tracks:

- Role occupies track 1
- Division / position occupies track 2
- Year joined spans both tracks on the next row

### Below 680px

Use one column. Order remains Role, Division / position, Year joined, Clear filters.

### Material and alignment

- Outer panel: no radius and no shadow
- Background: `var(--surface)`
- Border: one pixel using `var(--line)`
- Field groups separated by one-pixel rules
- Desktop field padding: `1.25rem`
- Mobile field padding: `1rem`
- Label to control gap: `0.5rem`
- Native select minimum height: `48px`
- Clear action occupies the full panel width beneath the fields and aligns to the right on desktop

The panel is one ruled editorial unit. Do not turn each field into its own floating card.

## Public labels

Panel introduction:

> Show members by

Fields:

> Role

> Division / position

> Year joined

Defaults:

> All roles

> Any division or position

> Any year

Actions:

> Clear filters

Empty result:

> No members match these filters.

> Choose another role, position, or year.

Empty-state action:

> Clear filters

`Year` alone is not an acceptable public label because the current project does not define whether it means joining year, academic year, graduation year, or committee term. This contract defines the facet as the calendar year the person joined English Club and labels it `Year joined` everywhere.

## Control choice

Use three labeled native `select` elements. The existing role atlas remains the richer visual control; the panel should be compact and predictable.

Reasons:

- Long MIC and Human Resource Development labels remain accessible through the native picker on narrow screens.
- A mobile visitor does not need to scroll through a second full copy of the five-role atlas.
- Keyboard and screen-reader behavior stays native.
- The filter does not become a wall of chips or pills.

Apply `appearance: none` only if the Heroicons chevron is positioned inside the same control wrapper. The native select must remain fully clickable, and the icon must use `pointer-events: none`.

## State contract

```ts
type AssignmentFilter =
  | "all"
  | MemberDivision
  | MemberPosition;

type MemberFilterState = {
  role: "all" | MemberRoleLevel;
  assignment: AssignmentFilter;
  joinedYear: "all" | number;
};
```

`panelOpen` is UI state and is not part of the filter value.

There is one filter state for the whole Member page. The role atlas, panel controls, toolbar summary, result count, empty state, and contact sheet all read from it.

Active filter count:

```ts
Number(state.role !== "all") +
Number(state.assignment !== "all") +
Number(state.joinedYear !== "all")
```

Filtering uses AND logic:

1. Match the selected role when role is not `all`.
2. Match either `member.division` or `member.position` when assignment is not `all`.
3. Match `member.joinedYear` when year joined is not `all`.

The existing `sortOrder` remains the only ordering rule. Filtering does not reorder the surviving cards.

## Division and position options

The source taxonomy distinguishes a Coordinator division from Core and Board positions. The public field therefore reads `Division / position`, not only `Position`.

Options are contextual to the selected role:

| Selected role | Available assignment options |
| --- | --- |
| All roles | Disabled control with `Choose a role first` |
| Member | Disabled control with `No named position` |
| Pioneer | Disabled control with `No named position` |
| Coordinator | Any Coordinator division, Academic, Art, Media, Information, and Communication (MIC), Public Relation, Human Resource Development |
| Core Member | Any Core Member position, Secretary, Treasury, Vice President, President |
| Board / Board of Directors | Any Board position, Pembina / Mentor, Kepala UPA / Head of UPA |

Changing the role always resets assignment to `all`. This prevents a hidden Academic filter from surviving after the visitor switches to Core Member.

The disabled assignment control needs helper text associated with `aria-describedby`:

For All roles:

> Choose a role to see its divisions or positions.

For Member or Pioneer:

> This role does not have a named division or position.

## Role atlas synchronization

The atlas and filter panel must not maintain separate role selections.

| Visitor action | Role | Assignment | Year joined | Atlas result |
| --- | --- | --- | --- | --- |
| Select Coordinator in atlas | Coordinator | Reset to any | Keep current year | Coordinator highlighted |
| Select Coordinator in panel | Coordinator | Reset to any | Keep current year | Coordinator highlighted |
| Select Academic in panel | Coordinator | Academic | Keep current year | Coordinator stays highlighted |
| Select Core Member after Academic | Core Member | Reset to any | Keep current year | Core Member highlighted |
| Select All roles in atlas or panel | All roles | Reset to any | Keep current year | All roles selected |
| Select Clear filters | All roles | Any | Any year | All roles selected |

An atlas role choice represents the complete role, so it clears a narrower assignment. Year joined remains active because it is independent of responsibility.

Do not scroll the visitor automatically when atlas state changes. The selected atlas row, companion panel, toolbar summary, and roster count provide sufficient feedback.

## Year joined data prerequisite

The current member model has no year field. A working year filter requires one verified public field before the control ships:

```ts
joinedYear?: number;
```

Required propagation:

- Convex `members` table
- member validator used for writes
- public member validator
- `members.listPublished` return shape
- `PublicMember`
- consent-reviewed member editing or seed path
- fictional showcase fixtures used for local presentation

Rules:

- The value is an integer calendar year.
- It cannot be later than the current calendar year.
- Do not invent a lower bound until the club's founding year is verified.
- It is optional because older records may not have confirmed data.
- A specific year filter excludes records with no confirmed year.
- `Any year` includes records with and without a year.
- Select options are unique years derived from the public roster and sorted newest first.
- Production options come only from consent-cleared public records.
- Fictional showcase years remain fixture data and must not enter Convex.

If the intended meaning is committee term or academic cohort, rename both the field and visible label. Do not reuse `joinedYear` for another concept.

## Result summary and announcement

The toolbar summary is plain text, not a row of removable chips.

Examples:

- `All roles`
- `Coordinator`
- `Coordinator, Academic`
- `Core Member, Secretary, joined 2024`
- `All roles, joined 2025`

Use one polite status region after the toolbar. It should announce the result after every filter change:

- `Showing all 15 members.`
- `Showing 5 Coordinator members.`
- `Showing 1 Coordinator member in Academic.`
- `Showing 2 members who joined in 2025.`
- `No members match Coordinator, Academic, and 2025.`

Do not announce the panel opening. `aria-expanded` already communicates that state.

## Open and close behavior

- Filter button uses `aria-expanded` and `aria-controls`.
- The panel follows the button in DOM order.
- Enter or Space toggles the panel through native button behavior.
- Focus remains on the Filter button after opening. Tab moves to Role.
- Escape closes the panel and returns focus to the Filter button.
- Clicking outside does not close the panel.
- Closing the panel does not clear active filters.
- Clear filters keeps the panel open so the result change is visible.
- When the directory is unavailable or has no profiles, hide the Filter button instead of exposing inactive controls.

## Motion contract

Every animation communicates an explicit state change.

### Panel entrance

- Duration: `180ms`
- Easing: existing `var(--ease-out)`
- Properties: opacity and transform only
- Start: opacity `0`, translateY `-6px`
- End: opacity `1`, translateY `0`

The panel enters at its final layout height. Do not animate height or `grid-template-rows`.

### Panel exit

- Duration: `120ms`
- Properties: opacity and transform only
- End: opacity `0`, translateY `-4px`
- Remove from layout after the exit finishes

### Filtered roster

- Start the update immediately after selection.
- New grid duration: `260ms`
- Card start: opacity `0`, translateY `8px`
- Stagger: `20ms`, capped at `100ms`
- Keep card dimensions and grid tracks fixed.
- Do not animate item width, height, or absolute position.
- Do not tie filtering to scroll position.

### Control feedback

- Button and select focus, border, and color transition: `160ms`
- Filter button active press: translateY `1px` for the press only
- No scale bounce, glow, tilt, or perpetual animation

### Reduced motion

Under `prefers-reduced-motion: reduce`:

- Panel appears and disappears immediately.
- Remove all translation, card stagger, and animation delay.
- Filtered cards render directly in their final position.
- Result announcements and focus behavior remain unchanged.

## Light and dark themes

Use existing semantic variables. Do not introduce separate filter colors.

| Element | Token |
| --- | --- |
| Panel and controls | `var(--surface)` |
| Directory field | existing `var(--primary-wash)` |
| Rules | `var(--line)` |
| Primary text | `var(--ink)` |
| Supporting text | `var(--muted)` |
| Focus and selected control | `var(--primary-strong)` |
| Selected control background | restrained mix of `var(--primary-wash)` and `var(--surface)` |

Orange remains reserved for the existing role-atlas selection edge and primary calls to action. The filter panel does not add a second orange system.

Dark mode uses the same one-pixel composition. Do not add blur, transparency, outer glow, or a floating shadow to separate the panel.

## Contact-sheet behavior

Keep the current true CSS Grid contract:

- Five columns at `1280px` and wider
- Four columns from `960px` to `1279px`
- Three columns from `680px` to `959px`
- Two columns below `680px`
- One-pixel shared rules
- Fixed responsive tracks using `repeat(n, minmax(0, 1fr))`

Filtered results stay left aligned. Do not use `auto-fit` because one or two results would stretch into oversized cards.

The card `key` remains the stable member slug. A separate filter-state key may remount the grid transition wrapper, but array position must never become member identity.

## 320px behavior

- Existing 16px page margins remain.
- Toolbar stays one row with count and summary on the left, Filter button on the right.
- Filter button label does not wrap.
- The panel is one column and exactly matches the contact-sheet width.
- All selects are 100% wide and at least 48px high.
- Long selected assignment text may truncate visually inside the closed select, but the native option and associated label remain complete to assistive technology.
- Clear filters uses a full-width 48px target on mobile.
- The contact sheet remains two columns after filtering.
- No horizontal page overflow, fixed overlay, or body scroll lock is introduced.

## Accessibility contract

- Use a native `button` for Filter.
- Use real `label` elements associated with each native `select`.
- Group the controls in a `form` or labeled region without making submission necessary.
- Use `aria-expanded` and `aria-controls` on the Filter button.
- Associate disabled assignment helper text through `aria-describedby`.
- Use one polite live region for result changes.
- Preserve visible focus indicators with at least 3:1 contrast.
- Keep every control at least 44px by 44px.
- Do not use color as the only active-state signal.
- Do not auto-scroll after a selection.
- Do not trap focus because the panel is inline and non-modal.
- Ensure Escape returns focus to the opening button.
- Keep the DOM and reading order Role, Division / position, Year joined, Clear filters, results.

## Empty, unavailable, and data-change states

### No match

Keep the chosen values and show the filter-specific empty state. Do not silently relax a filter.

### Directory unavailable

Keep the existing unavailable message and hide the Filter button and panel.

### No published profiles

Show the consent-aware directory empty state and hide filtering controls.

### Selected year no longer exists

If refreshed public data no longer contains the chosen year, reset only year joined to `all`, retain compatible role and assignment values, and announce the new result.

## Anti-slop guardrails

Do not add:

- A row of role chips above the contact sheet
- Removable filter pills below the toolbar
- Counts beside every option
- A search field for a 15-profile showcase
- Sort controls
- Grid and list view controls
- A floating glass panel
- A full-screen mobile drawer
- Rounded cards around each field
- Decorative status dots
- A custom checkbox or radio built from divs
- Lucide icons, emoji, ASCII arrows, or hand-drawn SVG paths
- Automatic scrolling from the atlas to the directory
- Motion tied to page scroll

The page already has a rich atlas and a strong portrait grid. The filter should be exact, quiet, and easy to close.

## Implementation acceptance checklist

- [ ] One Filter button replaces passive role context in the directory toolbar.
- [ ] The button uses Heroicons `FunnelIcon` and exposes `aria-expanded` and `aria-controls`.
- [ ] The open panel sits between the toolbar and contact sheet in document flow.
- [ ] The panel contains Role, Division / position, and Year joined controls.
- [ ] The visible year label is `Year joined`, not `Year`.
- [ ] `joinedYear` exists in the consent-cleared public data path before the year control ships.
- [ ] Role atlas and filter panel read and update one shared role state.
- [ ] Changing role resets assignment and preserves year joined.
- [ ] Selecting All roles resets assignment.
- [ ] Clear filters resets all three facets and the atlas.
- [ ] Position options follow the exact role taxonomy in `content/member-roles.ts`.
- [ ] Member and Pioneer do not receive invented positions.
- [ ] Filter logic uses AND across active facets.
- [ ] The toolbar count and summary update after every selection.
- [ ] One polite live region announces result changes.
- [ ] No-match state keeps the selected controls and offers Clear filters.
- [ ] The roster remains a true five, four, three, and two-column CSS Grid.
- [ ] A filtered one-card result does not stretch across the grid.
- [ ] Stable member slugs remain card keys.
- [ ] Panel and roster motion use opacity and transform only.
- [ ] Reduced-motion mode removes translation, stagger, and delays.
- [ ] Filter controls remain usable with keyboard only.
- [ ] Escape closes the panel and returns focus to the Filter button.
- [ ] Light and dark modes preserve contrast and the same hierarchy.
- [ ] The panel aligns exactly with the contact-sheet edges.
- [ ] At 320px, toolbar stays aligned, selects fit, and no horizontal overflow appears.
- [ ] No chips, filter tags, search, sorting, view switch, modal, or drawer is added.
- [ ] Desktop light, desktop dark, and 320px open-panel screenshots are reviewed after implementation.

## Verification matrix for implementation

| Case | Expected evidence |
| --- | --- |
| Desktop light, panel closed | Count at left, one Filter button at right, five-column roster |
| Desktop light, panel open | Three aligned fields above the contact sheet, no shadow or card shells |
| Desktop Coordinator and Academic | Atlas highlights Coordinator, panel shows Coordinator and Academic, roster shows the matching cards |
| Desktop Core Member after Academic | Assignment resets, Core Member atlas row highlights, year remains unchanged |
| Desktop dark, active year | Panel and controls remain legible with existing tokens |
| 320px, panel open | One-column fields, toolbar stays aligned, two-column roster below |
| Keyboard | Button, three controls, Clear filters, and cards follow DOM order |
| Reduced motion | Instant panel and roster update with no transforms or stagger |
| No match | Honest empty state, selections preserved, Clear filters works |
| Unavailable | Existing unavailable copy, no Filter button or panel |
