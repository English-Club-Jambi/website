# Member Directory Filter — Code Audit and Patch Map

Date: 25 August 2026
Scope: `/members` filters for Role, Position/Division, and Year joined
Mode: source audit only; this document is the only file changed

> Historical audit. The final implementation added `joinedYear` and dynamic division data end to end, removed the local showcase fallback, and exercises filters against a guarded 15-profile Convex development seed.

## Executive decision

The filter can stay client-side for the current directory contract. The page already fetches one consent-gated, indexed, bounded roster of at most 120 records. Filtering that in memory gives immediate interaction without adding a matrix of Convex indexes or unbounded reads.

`joinedYear` must be optional from storage through rendering. Existing member documents do not contain it. The reviewed upsert must distinguish three cases because it uses `db.replace`:

| Upsert input | Meaning | Stored value |
| --- | --- | --- |
| `joinedYear` omitted | Legacy caller / no change | Preserve `existing?.joinedYear` |
| `joinedYear: null` | Explicit removal | Omit the field |
| `joinedYear: 2024` | Set or update | Store `2024` |

The implementation keeps the field optional and never infers a year for production records. Fictional years exist only in the target-locked development seed; that batch must never be promoted to production.

## Current implementation, with evidence

### Data contract

- `convex/schema.ts:74-90` defines the `members` table without `joinedYear`. The public and role-specific indexes at `convex/schema.ts:91-103` are appropriate for the current read shape.
- `convex/validators.ts:93-103` defines the public projection without `joinedYear`.
- `convex/members.ts:56-109` validates and projects public records. It currently has no year handling.
- `convex/members.ts:152-165` defines the reviewed upsert arguments without a year.
- `convex/members.ts:205-241` builds a complete replacement record and calls `db.replace`. Adding an optional argument without explicit preservation would silently delete a previously stored year when an older caller updates a member.
- `src/lib/members.ts:19-29` mirrors the public response as `PublicMember`; it has no year.
- Historical state: `src/content/member-showcase.ts` supplied a local fallback. The final route reads the guarded Convex development seed and has no source-only fallback.

### Query shape

- `convex/members.ts:30-36` clamps every request to `1..120`, defaulting to 120.
- `convex/members.ts:111-150` uses `by_public_sort` or `by_public_role_sort` and terminates both branches with `.take(limit)`. It does not use `.collect()` or an unindexed `.filter()`.
- `src/lib/members.ts:44-61` applies the same 120-record cap at the Next.js boundary.

This is already bounded and indexed. No `joinedYear`, division, or position index is required for a client-side filter over this bounded result.

### Filter UI

- `src/components/members/member-relay.tsx:43-44` models only `"all" | MemberRoleLevel`.
- `src/components/members/member-relay.tsx:151-191` owns one role selection and filters only on `roleLevel`.
- `src/components/members/member-relay.tsx:217-343` presents that state inside the role atlas, well before the directory. It is labelled as an inspection control, although it also filters the roster.
- `src/components/members/member-relay.tsx:360-371` has only a count/context toolbar and one status announcement. There are no directory-local controls for Role, Position/Division, or Year joined.
- `src/components/members/member-relay.tsx:384-398` treats every empty result as a missing publication. A valid but unmatched multi-filter combination needs a different empty state and a clear action.
- `src/components/members/member-relay.tsx:110-149` renders role, assignment, and biography, but no joined year.

### Taxonomy and layout

- `content/member-roles.ts:5-34` is the canonical typed source for five coordinator divisions, four core positions, and two board positions. Reuse it; do not duplicate string keys in the component.
- `content/member-roles.ts:118-148` proves which assignments are compatible with each role. This can prevent impossible filter combinations.
- `src/components/members/member-relay.module.css:435-450` is the natural insertion seam for a directory filter bar.
- `src/components/members/member-relay.module.css:487-497` renders a real five-column CSS grid. It reduces to two columns at `src/components/members/member-relay.module.css:831-863`, including the 320 px project.
- `src/components/members/member-relay.module.css:1009-1021` already removes member motion under `prefers-reduced-motion`.

### Tests

- `tests/unit/members.test.ts:16-60` covers role taxonomy and assignment validity; `tests/unit/members.test.ts:63-110` covers the showcase roster. There is no filter or joined-year contract test.
- `tests/convex/backend.test.ts:162-294` covers public gating, assignment validation, indexed role reads, idempotent upsert, and portrait consent. It does not protect optional-field preservation through `db.replace`.
- `tests/e2e/site.spec.ts:71-91` checks server HTML, `tests/e2e/site.spec.ts:192-237` checks the role-driven roster, and `tests/e2e/site.spec.ts:239-250` checks grid columns. There is no combined filter, clear, no-results, keyboard, touch-target, or narrow-width filter coverage.
- `tests/e2e/site.spec.ts:93-103` already includes `/members` in the axe scan, while `tests/e2e/site.spec.ts:389-472` has desktop, dark, mobile, and 320 px evidence seams that can capture active filters.

## Findings by priority

### P0 — `joinedYear` is absent end-to-end

The requested year control cannot be truthful until the year exists in the Convex schema, projection validator, public TypeScript type, reviewed mutation, temporary showcase, and card UI. A UI-only year inferred from `createdAt`, `updatedAt`, role, or sort order would be fabricated and must not be used.

### P0 — a naïve optional upsert field loses stored data

`upsertReviewed` replaces the whole document at `convex/members.ts:241`. If `joinedYear` is added as `v.optional(v.number())` and copied only when present, any legacy caller that omits it will erase an existing year. The mutation needs explicit preserve/set/clear semantics before the field is deployed.

### P1 — the directory has only a remote, role-only control

The current role atlas is an explanatory instrument, not a complete directory filter. All three actual filters should be co-located immediately before the results so users can see the active query and result count together. Keep role-atlas inspection state separate from directory filter state. This removes the hidden coupling where “inspect a role” unexpectedly changes a roster further down the page.

### P1 — multi-filter combinations need deterministic state and recovery

Use AND semantics across dimensions:

```text
role matches
AND (division matches OR position matches)
AND joinedYear matches
```

Within a dimension, `All` is the neutral value. A member without `joinedYear` remains visible under `All years` and is excluded only when a specific year is selected. This preserves legacy documents without pretending that their year is known.

When Role changes, reset an incompatible Position/Division selection to `all`. For example, `Coordinator + secretary` must not remain as a silent impossible combination. Also provide a visible `Clear filters` button whenever any filter is active.

### P1 — live-region and empty-state behavior will regress without adjustment

`src/components/members/member-relay.tsx:294` currently puts the full role companion in `aria-live="polite"`, while `src/components/members/member-relay.tsx:369-371` announces roster changes. Multi-filter updates would create competing announcements. Keep one concise, atomic roster status and remove live behavior from the explanatory companion.

An unmatched filter result is not the same as “profiles are being prepared.” It needs copy such as “No members match these filters” plus `Clear filters`. The existing unavailable and genuinely empty-publication states should remain distinct.

### P2 — long assignment labels can overflow narrow layouts

There are 11 assignment values plus `All`, including “Media, Information, and Communication (MIC)” and “Human Resource Development.” Controls must wrap text, keep `min-width: 0`, and never widen the page at 320 px. A wrapped chip grid is safer than a clipped, scrollbar-hidden strip. Every interactive target should be at least 44 × 44 CSS px.

## Required data contract

### Schema and validator

Add an optional integer year, not a required field:

```ts
// convex/schema.ts — members table
joinedYear: v.optional(v.number()),

// convex/validators.ts — publicMemberValidator
joinedYear: v.optional(v.number()),
```

An optional schema field is backward-compatible with existing documents and requires no data backfill. It still requires a normal Convex schema push/deployment and regenerated types. Do not hand-edit `convex/_generated/*`.

### Reviewed write semantics

Use a tri-state mutation argument:

```ts
joinedYear: v.optional(v.union(v.number(), v.null())),
```

Validate a supplied number as a finite integer from 1900 through `new Date().getUTCFullYear()`. There is no verified club founding year in the audited source, so a narrower lower bound would be an unsupported assumption. If the product later supplies a documented founding year, replace 1900 with that value.

Resolve the stored value only after loading the existing document:

```ts
const joinedYear =
  args.joinedYear === undefined
    ? existing?.joinedYear
    : args.joinedYear === null
      ? undefined
      : args.joinedYear;
```

Conditionally include the resolved number in the replacement record. The same rule must apply on both insert and update: omitted on insert means unknown; omitted on update means preserve; `null` means clear.

### Public projection and adapter

Add `joinedYear?: number` to `publicMemberValidator`, `toPublicMember`, and `PublicMember`. The public projection should include only a valid integer year. If a manually inserted legacy record somehow carries an invalid optional year, omit that optional field rather than hiding an otherwise valid consent-cleared member. The mutation remains the enforcement point for all reviewed writes.

### Query and index policy

Keep `listPublished` as the only fetch needed by `/members`:

- preserve `withIndex("by_public_sort", ...)` and `.take(limit)`;
- preserve the hard maximum of 120 in both Convex and `getPublishedMembers`;
- do not add `ctx.db.query("members").filter(...).collect()`;
- do not add year/division/position indexes for client-side filtering;
- do not pass all three transient UI filters to Convex in this iteration.

The trade-off is explicit: filters cover the fetched roster, whose product cap is 120. If the club can exceed 120 public profiles, this design becomes a paginated-directory problem. At that point, design server pagination first and add query-specific compound indexes such as public/year/sort or public/division/sort; do not remove the bound.

## UI state contract

### Types

Use explicit, serializable values:

```ts
type RoleFilter = "all" | MemberRoleLevel;
type AssignmentFilter = "all" | MemberDivision | MemberPosition;
type JoinedYearFilter = "all" | number;

type MemberFilters = {
  role: RoleFilter;
  assignment: AssignmentFilter;
  joinedYear: JoinedYearFilter;
};
```

Extract pure option-building and filtering code into `src/lib/member-filters.ts`. This keeps the client component readable and makes semantics testable without rendering the page.

### Options

- Role options come from `memberRoleDefinitions`.
- Position/Division options come from `coordinatorDivisions`, `coreMemberPositions`, and `boardMemberPositions`.
- When a role is active, show only assignments compatible with that role; Roles 0 and 1 have no assignment choices beyond `All`.
- Joined-year options come from valid known member years, deduplicated and sorted descending. Never derive a year from timestamps.
- The guarded development seed contains an explicitly fictional year spread so the real query and filter path has useful default states. These years are test data, not production evidence.

### Interaction

- Render each mutually exclusive dimension as a native `<fieldset>` with a visible `<legend>` and native radio inputs visually styled as buttons. This provides checked state and arrow-key behavior without custom roving-tabindex code.
- Suggested accessible names: `Filter members by role`, `Filter members by position or division`, and `Filter members by year joined`.
- Keep the role atlas state as `rolePreview`; keep directory state as `filters`. Selecting the atlas must not move focus, scroll the page, or silently mutate the directory filters.
- Put all directory filters between the directory heading and count toolbar.
- Use a Heroicon for the clear action if an icon is shown. Do not use ASCII arrows, crosses, or symbols as icons.
- Use a single result transition (opacity/transform) and retain stable DOM order. Respect the existing global reduced-motion behavior.
- Do not key the entire grid by the filter object solely to replay entrance animations; frequent remounts can interrupt assistive technology and image loading. Animate only changed visibility or a lightweight results wrapper.

### Result status and card content

- One `role="status" aria-live="polite" aria-atomic="true"` message should announce the new count and active filters after a user change.
- Do not announce on initial render if the visible count already conveys the default state.
- Show `Joined 2024` on a card when the value exists. Omit the line for an unknown year; do not render `Unknown` on every legacy card.
- Keep separate states for backend unavailable, reviewed roster genuinely empty, and filters returning no matches.

## Exact patch map

| File and current seam | Bounded change | Regression guard |
| --- | --- | --- |
| `convex/schema.ts:74-90` | Add optional `joinedYear` to `members`; retain current indexes. | Existing records validate without migration. |
| `convex/validators.ts:93-103` | Add optional `joinedYear` to the public response validator. | Query return validation stays aligned with projection. |
| `convex/members.ts:21-54` | Add a small year validator/helper. | Reject non-integers, implausible past values, and future years. |
| `convex/members.ts:56-109` | Conditionally project a valid `joinedYear`. | Invalid optional legacy data cannot break the entire directory. |
| `convex/members.ts:152-165` | Add optional number-or-null mutation arg. | Supports preserve, set, and clear. |
| `convex/members.ts:200-241` | Resolve the year after the indexed slug lookup and include it in the replacement record. | Omitted legacy updates preserve a stored year. |
| `src/lib/members.ts:19-29` | Add `joinedYear?: number` to `PublicMember`; keep the existing bounded fetch API. | No query/index expansion. |
| Guarded development seed | Add explicit fictional joined years with useful distribution. | Unit-test integer range and multiple available years; reject production targets. |
| `src/lib/member-filters.ts` (new) | Build assignment/year options and implement the pure AND predicate. | Unit tests cover legacy unknown years and all combinations. |
| `src/components/members/member-relay.tsx:21-44` | Import canonical taxonomy/types and define separate preview/filter state. | No duplicated string taxonomy. |
| `src/components/members/member-relay.tsx:110-149` | Render joined year when known. | Legacy cards remain valid without the line. |
| `src/components/members/member-relay.tsx:151-199` | Replace role-only roster state with three directory filters and derived options/results; keep role preview separate. | Stable, deterministic AND semantics; incompatible assignment resets. |
| `src/components/members/member-relay.tsx:217-343` | Make the atlas inspection-only and remove its broad live region. | No duplicate announcements or remote hidden filtering. |
| `src/components/members/member-relay.tsx:347-410` | Add three labelled button-style radio groups, active count, clear action, atomic status, and filter-specific empty state. | Keyboard, focus, and no-results recovery are explicit. |
| `src/components/members/member-relay.module.css:435-497` | Add responsive filter-group/chip/clear styles before the grid. | 44 px targets, wrapping long labels, no 320 px overflow. |
| `src/components/members/member-relay.module.css:565-624` | Add a quiet joined-year line without inflating every card excessively. | Check equal rhythm at five and two columns. |
| `src/components/members/member-relay.module.css:831-1007` | Add mobile wrapping/stacking rules for filter groups and toolbar. | Preserve the current 2-column narrow grid unless visual testing proves it unreadable. |
| `src/components/members/member-relay.module.css:1009-1021` | Include new result/filter motion selectors in reduced-motion overrides if they animate. | No non-essential motion under reduce. |
| `tests/unit/members.test.ts` | Add showcase-year and pure-filter suites. | Semantics are protected without browser timing. |
| `tests/convex/backend.test.ts:162-294` | Add joined-year projection, preserve, clear, and rejection cases. | Protects the `db.replace` compatibility boundary. |
| `tests/e2e/site.spec.ts:71-91,192-250` | Add accessible filter groups, combined filtering, clear, no-results, focus, and grid checks. | Covers visible behavior and SSR markup. |
| `tests/e2e/site.spec.ts:389-472` | Capture active-filter desktop/light, dark, mobile, and 320 px states. | Visual evidence catches overflow and wrapping regressions. |

## Test matrix

### Unit

1. Default `all/all/all` returns every member, including records without `joinedYear`.
2. Role, assignment, and year combine with AND semantics.
3. An assignment matches either `division` or `position`, never an unrelated field.
4. A specific year excludes a member whose year is absent.
5. Year options are integers, unique, and descending.
6. Changing to an incompatible role clears the assignment filter.
7. Clear returns all three dimensions to `all`.
8. Showcase values include multiple years and remain within the accepted range.

### Convex

1. A legacy upsert with no `joinedYear` succeeds and the public response omits it.
2. A numeric year is stored and projected.
3. A later upsert that omits `joinedYear` preserves the stored number.
4. `joinedYear: null` clears it.
5. Fractional, non-finite, pre-1900, and future years are rejected.
6. The public response still excludes consent/status fields.
7. `listPublished({ limit })` remains bounded and role reads continue through the existing compound index.

### Browser and accessibility

1. The three fieldsets have distinct accessible names and default `All` radios are checked.
2. Native Arrow keys move within each radio group.
3. A combined filter produces the expected members and exactly one concise live announcement.
4. A no-match combination shows `Clear filters`; activating it restores the full roster.
5. Filter changes do not move focus or auto-scroll.
6. Every filter target is at least 44 × 44 CSS px.
7. At 320 px, `scrollWidth <= clientWidth`, long labels wrap, and the two-column member grid remains usable.
8. Light, dark, mobile, and reduced-motion states pass existing axe and motion checks.

## Verification sequence

Run after implementation:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:backend
npm run test:e2e -- --project=desktop-chromium --project=mobile-chromium --project=narrow-chromium
npm run build
```

Before any deployment-affecting Convex command, confirm the target deployment. A local `convex-test` pass proves the contract but does not replace a reviewed schema deployment.

## Acceptance checklist

- [ ] `joinedYear` is optional in storage and public types.
- [ ] Omitted reviewed updates preserve an existing year.
- [ ] `null` is the only explicit clear signal.
- [ ] The public read remains indexed and capped at 120.
- [ ] Role, Position/Division, and Year joined controls sit together above the roster.
- [ ] Filters use AND semantics and clear incompatible assignment state.
- [ ] Unknown legacy years remain visible under `All years`.
- [ ] One live region announces results; the role companion is not live.
- [ ] Long assignment controls fit at 320 px with 44 px targets.
- [ ] No-result, unavailable, and genuinely empty states remain distinct.
- [ ] Unit, Convex, axe, responsive, reduced-motion, screenshot, and build checks pass.
