# Member Page — Code Integration Audit

Date: 25 August 2026
Scope: read-only audit of the current Next.js + Convex codebase for a new public `/members` route. No application source was changed by this audit.

## Executive finding

The extension can stay small and coherent with the current architecture:

1. Add one `members` table and one public, read-only Convex query.
2. Add one server adapter that converts Convex failure into an explicit directory state.
3. Render `/members` as a Server Component and pass the public records into one focused Client Component for role selection and motion.
4. Add `Members` to the existing desktop/mobile navigation, footer, sitemap, route checks, and accessibility checks.

No Convex React provider, authenticated member area, public write mutation, member detail route, search system, animation library, or generated portrait is needed. The current repository contains no verified member roster, names, role assignments, or consent-cleared member portraits. The complete role atlas can ship immediately, while the directory renders an honest unpublished state until reviewed records exist.

## Evidence and current integration seams

### Route and rendering model

- Route pages are Server Components by default and export page-specific metadata. See `src/app/about/page.tsx:8-15`, `src/app/activities/page.tsx:6-13`, and the async journal pattern at `src/app/journal/page.tsx:7-15`.
- The root layout supplies the sticky header, `main#main-content`, skip link, footer, theme boot script, and site-wide metadata (`src/app/layout.tsx:17-28`, `src/app/layout.tsx:30-51`, `src/app/layout.tsx:53-74`). `/members` should use this shell rather than introduce a nested layout.
- Shared width and link primitives are `PageContainer`, `ButtonLink`, and `TextLink` (`src/components/ui.tsx:18-60`).
- Existing route openings use `.route-stage`, a twelve-column frame, a two-line display heading, and a short support paragraph (`src/app/globals.css:561-609`). At `879px`, that frame becomes one column (`src/app/globals.css:1701-1735`); at `639px`, it becomes a full-height phone opening (`src/app/globals.css:1912-1929`). The new route can share the structural frame while giving the member page its own composition and CSS module.

### Navigation and discoverability

- The single navigation array feeds both desktop and mobile links (`src/components/mobile-nav.tsx:9-13`, `src/components/mobile-nav.tsx:95-114`, `src/components/mobile-nav.tsx:157-175`). Add `{ href: "/members", label: "Members" }` once; typed routes are enabled in `next.config.ts:8-12`.
- Active-state matching already covers nested paths (`src/components/mobile-nav.tsx:15-17`). It will work for `/members` without changes even if a detail route is added later.
- Footer navigation is separate and must be updated explicitly (`src/components/site-footer.tsx:13-18`).
- Static sitemap routes are a literal array (`src/app/sitemap.ts:6-20`). Add `/members`; `robots.ts` already allows it through the global rule (`src/app/robots.ts:5-12`).
- The desktop navigation disappears only below `880px` (`src/app/globals.css:1701-1712`). A fourth text link increases shell width, so the implementation must visually test the header at 880, 900, 1024, and 1440px—not only the three existing Playwright project sizes.

### Convex and server adapter conventions

- The schema is one `defineSchema` object containing `posts`, `events`, and private `contactSubmissions` (`convex/schema.ts:11-67`). An additive `members` table does not rewrite those records.
- Reusable validators live in `convex/validators.ts`; every existing public query declares both `args` and `returns` (`convex/posts.ts:49-67`, `convex/posts.ts:69-83`, `convex/posts.ts:85-105`). Member queries should follow the same rule.
- Public post queries select through indexes, apply bounded limits, and map database documents to an explicit public response instead of returning documents wholesale (`convex/posts.ts:11-17`, `convex/posts.ts:19-47`, `convex/posts.ts:49-65`). This is the correct privacy boundary for member records too.
- Server pages read Convex with `fetchQuery` through an adapter (`src/lib/journal.ts:1-5`, `src/lib/journal.ts:52-65`). There is no application-wide `ConvexProvider`; the new page does not need one because role filtering can happen locally after one server query.
- Journal data has a local seed fallback (`src/lib/journal.ts:19-41`, `src/lib/journal.ts:52-65`). Members must **not** copy that fallback because no verified local roster exists. A missing URL or failed query should return no profiles plus a distinct `unavailable` state, never sample people.
- Convex generated API types identify their regeneration command as `npx convex dev` (`convex/_generated/api.d.ts:1-13`). Adding `convex/members.ts` requires a codegen/dev pass before TypeScript and tests.

### Existing data and privacy boundary

- The media registry records rights and consent on every asset (`src/content/media.ts:1-15`). Every supplied documentary image currently used for club-room scenes is `consent: "pending"`; for examples see `src/content/media.ts:43-71` and `src/content/media.ts:133-176`. They cannot silently become named member portraits.
- The evidence audit explicitly says not to infer names, roles, or membership from appearance and not to publish them from photographs alone (`docs/ASSET-AUDIT.md:9`, `docs/ASSET-AUDIT.md:160`).
- The current PRD lists member names and roles among facts withheld until supplied (`PRD.md:303`). The prior blueprint defers `/team` (`BLUEPRINT.md:57`), and the database document says member profiles are not stored (`DATABASE.md:18`). The new user instruction supersedes those product decisions; all three documents must be amended in the same change so the implementation and product contract agree.
- The previous evidence decision remains useful as a launch gate: the GenBI reference supports a future member directory, but the repository has no consented names, roles, or portraits (`docs/EVIDENCE.md:36`, `docs/EVIDENCE.md:121`). The route may be implemented now; real profiles should appear only after verified input and explicit public-profile consent.

## Recommended public member contract

### Role taxonomy

Store the requested hierarchy as the numeric union `0 | 1 | 2 | 3 | 4`. Keep labels and explanatory copy in a typed application taxonomy so the database does not duplicate presentation copy:

| Level | Public label | Required subtype |
|---:|---|---|
| 0 | Member | none |
| 1 | Pioneer | none |
| 2 | Coordinator | one division |
| 3 | Core Member | one core position |
| 4 | Board / Board of Directors | one board position |

Recommended enum values:

- Coordinator division: `academic`, `art`, `mic`, `public-relations`, `human-resource-development`.
- Core position: `secretary`, `treasury`, `vice-president`, `president`.
- Board position: `mentor`, `head-of-upa`.

Do not expand the initials `UPA` in code or copy until the organisation supplies the official long form. The source request only confirms the role label “Kepala UPA.”

### Table shape

Recommended additive table in `convex/schema.ts`:

```ts
members: defineTable({
  slug: v.string(),
  displayName: v.string(),
  role: memberRoleValidator,
  division: v.optional(memberDivisionValidator),
  position: v.optional(memberPositionValidator),
  shortBio: v.optional(v.string()),
  photoKey: v.optional(v.string()),
  status: memberStatusValidator,
  consentStatus: memberConsentValidator,
  consentUpdatedAt: v.optional(v.number()),
  sortOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_slug", ["slug"])
  .index("by_status_consent_role_order", [
    "status",
    "consentStatus",
    "role",
    "sortOrder",
  ])
```

Suggested state validators:

- `status`: `draft | published | archived`.
- `consentStatus`: `pending | cleared | revoked`.

`consentStatus` must be indexed with publication state. This lets the public query use index equality for `published + cleared`, instead of collecting rows and filtering personal records in application memory. `consentUpdatedAt` provides audit evidence; a bare boolean does not.

Keep email, phone, student number, private social handles, internal notes, and contact-submission IDs out of the table. The requested public directory does not need them.

### Cross-field rules

Convex field validators validate allowed values but do not express the role/subtype relationship. Enforce this in one shared function used by any internal create/update mutation and again at the public projection boundary:

- Roles `0` and `1`: no `division` or `position`.
- Role `2`: exactly one coordinator `division`, no `position`.
- Role `3`: exactly one core `position`, no `division`.
- Role `4`: exactly one board `position`, no `division`.
- A public record must have `status === "published"`, `consentStatus === "cleared"`, a valid role/subtype combination, a bounded non-empty display name, and a normalized slug.

The second check protects the public page from inconsistent rows inserted manually through the dashboard.

### Public query

Create `convex/members.ts` with one query, for example `listPublished`:

- Args: optional numeric `role`, optional `limit`.
- Return: an explicit `publicMemberValidator[]`.
- Bound `limit` to a small public maximum (for example 120).
- Query `by_status_consent_role_order` with equality on `published` and `cleared`; add role equality only when a role arg is supplied.
- Return only `slug`, `displayName`, `role`, valid `division`/`position`, optional `shortBio`, optional `photoKey`, and `updatedAt`.
- Never return `status`, consent fields, internal timestamps, or full database documents.

For the initial page, fetch all five roles once and filter in the Client Component. Five queries or a query on every button press would add latency without improving a small public directory.

### App adapter

Add `src/lib/members.ts` with:

- the `PublicMember` type inferred or mirrored from the public response;
- the typed role/division/position presentation map;
- `getPublishedMembers()` using `fetchQuery(api.members.listPublished, ...)`;
- a discriminated result such as `{ state: "ready", members } | { state: "unavailable", members: [] }`.

An empty successful response means “no profiles are published.” A failed query means “the directory is temporarily unavailable.” Keeping those states separate prevents a backend outage from being presented as an editorial fact.

## Recommended UI boundaries

### Files

```text
src/app/members/page.tsx
src/components/members/member-atlas.tsx
src/components/members/member-atlas.module.css
src/lib/members.ts
convex/members.ts
```

Optional only if responsibilities grow:

```text
src/content/member-roles.ts
```

Do not add a member detail route, search input, grid/list toggle, or admin form in this extension.

### Server page

`src/app/members/page.tsx` should:

1. Export `Metadata` with title, description, and canonical `/members`, matching the page conventions at `src/app/about/page.tsx:8-13`.
2. Await `getPublishedMembers()` once.
3. Render the route heading and all five role definitions in initial HTML.
4. Pass only public member fields and the availability state to the client island.
5. Avoid Person/employee JSON-LD until real identities are reviewed and the club explicitly wants that reuse. The conservative Organization JSON-LD currently appears only on the homepage (`src/app/page.tsx:26-43`).

### Interactive island

`member-atlas.tsx` can use the established selection pattern:

- A labelled `role="group"` of real buttons.
- `aria-pressed` for the selected role, as used in `src/components/play/activity-relay.tsx:59-85`.
- Arrow Left/Right/Up/Down plus Home/End selection and focus movement, as implemented at `src/components/play/activity-relay.tsx:25-55`.
- Heroicons imported as React components; no ASCII or Unicode characters standing in for icons.
- All role descriptions remain in the DOM or have a complete server-rendered default. Animation may change emphasis, never access to content.
- The directory heading should state the active filter in visible text. A polite live region may announce the changed result count, but should not contain the full moving panel.
- Use stable `slug` keys. Do not use array position as member identity.

Use either “All roles” plus five role buttons, or five role buttons where the initial view includes everyone. If “All roles” exists, it is a view control—not role level `-1`; never store it in Convex.

### Motion and styling

- Reuse the existing color and motion tokens: `--page`, `--surface`, `--ink`, `--muted`, `--line`, `--primary`, `--signal`, the three duration levels, and the two easing curves (`src/app/globals.css:1-29`, `src/app/globals.css:31-51`). This automatically supports the persistent light/dark theme.
- Put page-specific layout and animation in `member-atlas.module.css`; `src/components/play/play.module.css` is already 976 lines and belongs to the existing conversation instruments.
- Favor transform and opacity for the selected-role handoff. A short stagger can reveal rows after a deliberate selection, but there should be no autoplay, infinite marquee, scroll-jacking, cursor follower, or scroll-dependent identity change.
- Preserve the global reduced-motion override (`src/app/globals.css:2025-2034`). Add a local reduced-motion rule only if the component uses behavior not covered by animation/transition duration, such as smooth programmatic scrolling.
- All controls need the existing 44px minimum target and global focus outline (`src/app/globals.css:137-140`, `src/app/globals.css:178-197`).
- Avoid a generic equal-card wall. A stronger fit with the current “Conversation Relay” is a five-track editorial role index: controls form a numbered role rail; the selected role opens a larger textual companion; verified people appear as asymmetric rows or a contact-sheet strip below. This is visually distinct without changing the architecture.
- If no member records exist, show the complete role atlas plus a compact, honest message and a contact link. Do not create generated portraits or named placeholders. Generated atmosphere art may be decorative, but must not imply a real person holds a role.

## Exact source changes

| File | Bounded change |
|---|---|
| `convex/validators.ts` | Add member role, division, position, publication, consent, and public-return validators. |
| `convex/schema.ts` | Import member validators and append the `members` table plus two indexes. Existing tables remain untouched. |
| `convex/members.ts` | Add the sanitized `listPublished` public query and shared publishability guard. No public mutation. |
| `convex/_generated/*` | Regenerate with Convex tooling; never hand-edit generated files. |
| `src/lib/members.ts` | Add the single server adapter, public type, taxonomy mapping, and distinct empty/unavailable states. |
| `src/app/members/page.tsx` | Add metadata, server query, semantic page structure, and the client island. |
| `src/components/members/member-atlas.tsx` | Add keyboard-operable role selection and deterministic local filtering. |
| `src/components/members/member-atlas.module.css` | Add themed layout, selected-state transitions, responsive rules, and reduced-motion support. |
| `src/components/mobile-nav.tsx` | Add Members once to the shared desktop/mobile link array. |
| `src/components/site-footer.tsx` | Add Members to footer navigation. |
| `src/app/sitemap.ts` | Add `/members` to `staticRoutes`. |
| `tests/convex/backend.test.ts` | Add member publication/privacy/filter/order tests with synthetic test-only fixtures. |
| `tests/unit/members.test.ts` | Test taxonomy completeness, role/subtype formatting, and adapter failure/empty distinctions where practical. |
| `tests/e2e/site.spec.ts` | Add `/members` route, Axe, role-keyboard state, honest empty state, overflow, theme, and screenshots. |
| Product/design docs | Amend first-release exclusions and document the verified-profile/consent gate. |

## Schema migration risk

### Low-risk additive changes

- Adding a new table and new validator exports is additive; existing post, event, and contact records do not need backfilling.
- Existing queries name their tables and indexes explicitly, so a new table does not change their result sets.
- No existing route depends on generated member API types.

### Risks requiring explicit checks

1. **Generated API lag.** TypeScript will not know `api.members` until Convex codegen runs. Regenerate before `npm run typecheck`.
2. **Manual invalid rows.** The dashboard can create a published row with a mismatched role/subtype unless a public projection guard rejects it.
3. **Consent revocation.** A revoked profile must disappear through the indexed `consentStatus` predicate without requiring deletion.
4. **Slug duplicates.** `by_slug` is not a uniqueness constraint by itself. Any future internal mutation must query `.unique()` before insert/update. Until that workflow exists, document dashboard entry discipline and test public handling of duplicates.
5. **Photo privacy.** `photoKey` must resolve only to an allow-listed, consent-cleared media entry. An arbitrary R2 URL or a `pending` asset must degrade to a non-identifying monogram/graphic fallback.
6. **Header fit.** Four text links plus theme and Join may collide between 880 and roughly 1024px. Test those widths and adjust the nav breakpoint or gap based on evidence.
7. **Unavailable versus empty.** A caught Convex error cannot use the same wording as a successful zero-row result.
8. **Ordering.** `sortOrder` collisions need a deterministic secondary key in the query projection, such as normalized display name or slug, before rendering.

## Verification matrix

### Convex tests

Add synthetic records only inside `tests/convex/backend.test.ts`:

- published + cleared + valid Member is returned;
- draft, archived, pending-consent, and revoked-consent rows are excluded;
- role `2` without a division and role `3`/`4` with the wrong position family are excluded;
- optional role filter returns only that numeric level;
- bounded limit is respected;
- public response omits status, consent evidence, created time, and any internal-only field;
- sorting is deterministic across levels and equal `sortOrder` values.

### Unit/component tests

- Taxonomy has exactly the integer keys `0, 1, 2, 3, 4` and includes every supplied division/position.
- The acronym label remains `MIC`; the code does not invent an expansion for `UPA`.
- Selecting a role filters an immutable input array without mutating server data.
- Empty and unavailable states have different copy and semantics.
- Keyboard Arrow keys and Home/End move both selection and focus. This can be covered in Playwright if no separate component test is added.

### End-to-end and visual checks

Extend `tests/e2e/site.spec.ts`:

- Add `/members` and its exact H1 to the `routes` table (`tests/e2e/site.spec.ts:6-13`).
- Add `/members` to Axe coverage (`tests/e2e/site.spec.ts:70-81`).
- Verify the desktop and mobile navigation expose Members and mark it `aria-current="page"`.
- Verify role buttons are keyboard operable, have stable `aria-pressed`, and reveal the expected role description.
- Verify the no-record state is visible when the local Convex deployment has no members.
- Verify no horizontal overflow at 320px and at an explicit 900px viewport.
- Capture at least desktop light, desktop dark with a non-default selected role, and phone light. Disable animations for deterministic screenshots as existing evidence tests do (`tests/e2e/site.spec.ts:291-340`).
- Run reduced-motion on a member role transition in addition to the global duration check (`tests/e2e/site.spec.ts:262-271`).
- Manually inspect selected-state alignment, heading wrapping, sticky-header clearance, 200% zoom, focus order, and animation continuity after rapid repeated selection.

## Recommended implementation order

1. Update product/database/design documentation to mark the new verified public directory in scope.
2. Add validators, table, query, and Convex tests.
3. Run Convex codegen and backend tests.
4. Add the server adapter and its unit tests.
5. Build the server page and complete static empty/unavailable states.
6. Add the role-selection client island and scoped CSS.
7. Wire nav, footer, sitemap, and metadata.
8. Run lint, TypeScript, unit/backend tests, and production build.
9. Run Playwright across desktop, phone, 320px, and the extra 900px shell check.
10. Inspect screenshots in light/dark/reduced-motion states, correct alignment or transition defects, and rerun the complete check.

## Definition of done for this extension

- `/members` is linked, indexed in the sitemap, metadata-complete, responsive, and theme-aware.
- All five role levels and all supplied divisions/positions are represented without invented definitions.
- Only `published + cleared + structurally valid` records can cross the Convex public boundary.
- No supplied pending-consent photograph is presented as a named member portrait.
- Empty and service-unavailable states are honest and distinct.
- Role selection works with pointer, touch, Arrow keys, Home, and End, with visible focus and reduced-motion parity.
- Header alignment is verified at the new link's tightest desktop width.
- Convex, unit, route, Axe, overflow, reduced-motion, theme, and visual checks pass with saved evidence.

---

## Addendum — organization-profile brief and mandatory member grid

Date: 25 August 2026
Audit target: the implemented `/members` route after the latest user direction.

### What changed in the brief

The latest direction explicitly asks for:

- a page that reads like a real organisation profile;
- no test, prototype, or implementation language in the public interface;
- realistic fictional identities as temporary content;
- members displayed in a grid.

This supersedes the earlier recommendation in this report to avoid human placeholder names. The permission applies only to temporary presentation data. It does not change the Convex publication and consent rules for real people.

The current implementation does not meet the new brief. It renders a one-dimensional roster, uses `Voice NN` identities, exposes QA language throughout the page, and removes the roster when Convex is unavailable.

### Audit health score

| Dimension | Score | Current evidence |
|---|---:|---|
| Accessibility | 3 / 4 | Native radio controls, semantic lists, Axe coverage, focus styles, and reduced-motion handling are present. The large live companion can announce more content than needed. |
| Performance | 4 / 4 | Images use `next/image`; motion uses bounded transforms; there is no scroll-linked state or extra animation dependency. |
| Responsive design | 3 / 4 | The row roster adapts to phone widths, but the required grid does not exist and therefore has no desktop/tablet/phone geometry evidence. |
| Theming | 4 / 4 | Member CSS consistently uses the existing theme tokens and has a dark mapping through global variables. |
| Anti-patterns | 2 / 4 | Public QA language, repeated tracked uppercase labels, a side-stripe badge, and spreadsheet-like member rows make the page read as a prototype. |
| **Total** | **16 / 20** | **Good implementation quality, incomplete latest product brief.** |

**Severity count:** 2 P0, 3 P1, 3 P2, 1 P3.

### Anti-pattern verdict

The hero and role instrument have a distinct visual direction, but the directory reads as a test harness. The visible phrases `Roster preview`, `placeholder profiles`, `Sample data`, `Preview only`, `never written to Convex`, and `Directory service unavailable` describe implementation state instead of the club. The desktop evidence at `docs/evidence/members-desktop-light.png` shows that these labels occupy more space than member identity. On mobile, `docs/evidence/members-mobile-roster-light.png` makes the test disclosure the first roster content.

### Detailed findings

#### [P0] The roster is not a member grid

**Location:**

- `src/components/members/member-relay.tsx:407-417`
- `src/components/members/member-relay.module.css:547-568`
- `src/components/members/member-relay.module.css:885-891`
- `src/components/members/member-relay.module.css:1032-1065`

`.memberList` has no grid layout. Each `.memberRow article` is a full-width internal column layout, so the result is a vertical table. Phone rules compress the same row instead of producing responsive profile cards.

**Impact:** The latest mandatory layout is absent. The current structure also gives role metadata and QA copy equal weight with the identity, which works for a schema preview but not an organisation roster.

**Recommendation:** Keep the semantic `<ul><li><article>` structure, rename the presentation classes to `memberGrid` and `memberCard`, and make the list the two-dimensional layout surface:

- four columns at wide desktop when space permits;
- three columns near 1024px;
- two columns on compact tablet;
- one column at 320–639px;
- `minmax(0, 1fr)` on every track to prevent long MIC and HRD labels from forcing overflow.

Use a portrait or monogram, name, role, subtype, and one short sentence. Avoid border-plus-wide-shadow cards, oversized radii, or an icon above every name. A team directory is a legitimate grid affordance; flat profile tiles with clear identity hierarchy will not resemble a generic feature-card wall.

#### [P0] Test language is visible in metadata, headings, cards, status copy, and accessible names

**Location:**

- metadata: `src/app/members/page.tsx:10-14`
- placeholder identity and card flags: `src/components/members/member-relay.tsx:54-67`, `src/components/members/member-relay.tsx:100-122`
- announcements and directory headings: `src/components/members/member-relay.tsx:141-192`
- directory header, toolbar, and notice: `src/components/members/member-relay.tsx:330-373`
- error and empty states: `src/components/members/member-relay.tsx:379-405`

**Visible phrases to remove:**

- `clearly marked roster preview`
- `Placeholder NN`
- `Sample data`
- `sample profiles`
- `placeholder profiles`
- `Roster preview`
- `Fourteen places, waiting for real names.`
- `synthetic slots test the directory's rhythm`
- `Directory service unavailable`
- `Sample data, never written to Convex`
- `Consent-gated Convex records`
- `Preview only.`
- `layout placeholders, not people`
- `The role map is ready. The directory is not.`
- `member service could not be reached`
- `cleared publication`

**Impact:** Visitors are asked to read internal risk controls before meeting the club. Search metadata also describes a preview rather than the organisation.

**Recommendation:** Remove these terms from visible text, metadata, ARIA labels, and live-region output. Keep technical detail in logs, tests, and documentation. Use ordinary organisation copy:

- metadata: describe English Club members, roles, divisions, and leadership;
- section heading: introduce the people and their responsibilities;
- toolbar: `All members` or the selected role label;
- live region: `Showing five Coordinator profiles.`;
- failure handling: continue to show the temporary roster and log the backend error privately.

One quiet editorial disclosure should remain because the identities are fictional: for example, `Temporary names and portraits are shown until the official club roster is confirmed.` This is a content-status statement, not test language. Show it once near the roster heading or at the end of the grid; do not repeat it on every card.

#### [P1] `Voice NN` does not satisfy “realistic fictional identities”

**Location:** `src/content/member-placeholders.ts:10-161`.

The file contains fourteen code slots named `Voice 01` through `Voice 14`, with bios written as `Sample slot for...`. `MemberIdentity` renders role icons and numeric sample codes instead of a plausible person (`src/components/members/member-relay.tsx:54-67`).

**Recommendation:** Replace this content with a local, deterministic temporary roster:

- plausible Indonesian display names that are not copied from supplied photographs or known public figures;
- concise role-specific bios without awards, tenure, metrics, quotes, contact details, or invented events;
- `temporary: true` or `source: "temporary"` in code;
- a stable slug and sort order;
- monograms by default, or generated fictional portraits stored under a clearly separate temporary asset prefix.

Rename `member-placeholders.ts` to `member-temporary-roster.ts`, `PlaceholderMember` to `TemporaryMember`, and `isPlaceholderMember` to `isTemporaryMember`. The public interface never needs to expose those source names.

If generated portraits are used, store them under a prefix such as `images/member-fictional/`, record them in the generated-asset ledger, and never write them to the reviewed `members/` R2 namespace. Do not crop identifiable people from the supplied archive into fictional profiles.

#### [P1] The current fourteen profiles omit Treasury

**Location:**

- required core positions: `content/member-roles.ts:19-24`
- current temporary core profiles: `src/content/member-placeholders.ts:107-138`

The temporary roster includes Secretary, Vice President, and President, but no Treasury profile. All five Coordinator divisions and both Board positions are covered.

**Impact:** The role atlas says there are four Core Member positions while the visible roster demonstrates only three. A visitor could interpret the missing card as a real vacancy.

**Recommendation:** Use at least fifteen temporary identities so every supplied subtype appears once:

- 2 Members;
- 2 Pioneers;
- 5 Coordinators, one per division;
- 4 Core Members, one per position;
- 2 Board members, one per supplied position.

The number is a temporary layout set, not a member count. The single disclosure must make that clear without card-level QA badges.

#### [P1] Backend failure removes the required grid

**Location:**

- mode selection: `src/content/member-placeholders.ts:169-176`
- unavailable branch: `src/components/members/member-relay.tsx:379-389`
- server adapter: `src/lib/members.ts:31-65`

`getMemberRosterMode` returns `unavailable`, then `MemberRelay` replaces the roster with a cloud-error panel. This violates the instruction that members must appear as a grid and exposes infrastructure state publicly.

**Recommendation:** Keep `MemberDirectoryResult` and private development logging unchanged, but select the temporary roster for both a successful empty query and an unavailable query. The public page stays useful; the server log retains the diagnostic. When real profiles are ready, switch through an explicit editorial release flag rather than the first returned row.

An explicit `temporary | live` roster mode is safer than `directory.members.length > 0`: the current rule removes all temporary identities as soon as one reviewed profile publishes, which can leave a one-card “official” roster. The release flag should change only when the official set is ready.

#### [P1] Realistic fictional names can be indexed or mistaken for real people

**Location:** new temporary roster, `/members` metadata, and sitemap behavior.

**Impact:** A plausible name and leadership title may coincide with a real person. Search engines can repeat the association without the page context.

**Recommendation:**

- keep the one visible temporary-roster disclosure;
- omit Person, employee, alumni, or staff JSON-LD for temporary identities;
- do not create temporary member detail routes;
- do not add contact details, social handles, qualifications, or institutional claims;
- consider `noindex, follow` for `/members` until the official roster replaces the fictional set, then restore indexing and sitemap inclusion deliberately.

The Convex privacy boundary must remain unchanged. Fictional records must not be inserted with `profileConsentStatus: "cleared"`; that field represents a real publication decision.

#### [P2] The role section speaks like schema documentation

**Location:**

- `src/components/members/member-relay.tsx:202-208`
- `src/components/members/member-relay.tsx:260-264`
- `src/components/members/member-relay.tsx:278-307`
- `content/member-roles.ts:45-87`

Phrases such as `These numbers classify responsibility`, `No named division or position`, `Read the system`, `Role NN`, `verified division`, `supplied`, and `code` explain the data model rather than club life.

**Recommendation:** Keep role levels numeric in TypeScript and Convex, but lead the public UI with role names. Rewrite the companion around concrete work: taking part, organising, coordinating a division, running core operations, and mentoring the club. The number can remain visually quiet or be removed from visitor-facing copy; the original request requires it as a role model, not as a public score.

#### [P2] The tests are coupled to the discarded prototype language and row layout

**Location:**

- server HTML assertions: `tests/e2e/site.spec.ts:71-90`
- role and roster interaction: `tests/e2e/site.spec.ts:191-231`
- member screenshots: `tests/e2e/site.spec.ts:370-434`
- temporary roster unit tests: `tests/unit/members.test.ts:63-94`

Current tests require `Voice 01`, `Preview only.`, fourteen rows, `data-placeholder="true"`, `not people`, `Showing 5 sample Coordinator profiles.`, and five `Sample data` labels.

**Recommendation:** Replace those assertions with contracts that match the new product:

- server HTML includes all five role labels and at least one realistic temporary identity;
- `[data-member-grid]` is present in server HTML;
- the public `main` does not contain `sample`, `placeholder`, `preview only`, `synthetic`, `test data`, `Convex`, `service unavailable`, or `consent-gated`;
- the temporary disclosure appears exactly once;
- the default temporary roster contains fifteen unique names and every division/position, including Treasury;
- Coordinator filtering yields five cards and Core Member filtering yields four;
- desktop cards share rows in a grid; at 320px the grid becomes one column with no horizontal overflow;
- selected-role, light/dark, phone, 320px, and reduced-motion evidence is recaptured after the grid rewrite.

Keep `Synthetic...` and test-only copy inside `tests/convex/backend.test.ts:162-294`. The user asked to remove test language from the UI, not from isolated backend fixtures.

#### [P2] Product and design documents prohibit the newly requested temporary identities

**Location:**

- `PRODUCT.md:24`, `PRODUCT.md:50-52`
- Member Relay and Do/Do not sections in `DESIGN.md`
- `PRD.md:192-205`
- `DATABASE.md:341`, `DATABASE.md:491-492`

These documents currently require `Voice NN`, repeated sample disclosure, no human placeholder names, and removal after the first real profile. They will send future work back toward the prototype the user just rejected.

**Recommendation:** Update the documents in the same change as the UI. Preserve the rules that temporary identities stay local, real profiles require consent, temporary portraits never enter the reviewed R2 prefix, and uncertain facts remain absent.

#### [P3] Repeated uppercase labels and a side-stripe badge weaken the organisation register

**Location:**

- repeated tracked uppercase: `src/components/members/member-relay.module.css:63-70`, `src/components/members/member-relay.module.css:110-118`, `src/components/members/member-relay.module.css:443-450`, `src/components/members/member-relay.module.css:647-653`
- side-stripe badge: `src/components/members/member-relay.module.css:662-674`

**Recommendation:** Keep at most one compact hero label. Use sentence case for role and member metadata. Removing the sample badge also removes the prohibited `border-left: 2px` treatment.

### Positive findings to preserve

- `src/app/members/page.tsx:25-47` uses one strong generated group scene with a functional fade, clear heading, and restrained motion.
- `src/components/members/member-relay.tsx:211-276` uses native radios, so Arrow-key behavior is provided without a custom focus implementation.
- Role icons are Heroicons, not ASCII, Unicode arrows, or emoji (`src/components/members/member-relay.tsx:3-17`, `src/components/members/member-relay.tsx:46-52`).
- The role and subtype contract is typed and complete in `content/member-roles.ts`.
- Convex reads are indexed and bounded, and public projection excludes publication and consent state (`convex/members.ts:111-150`).
- Profile and portrait consent remain separate in schema and projection (`convex/schema.ts:74-102`, `convex/members.ts:86-108`).
- Current member animations are bounded, user-triggered, transform-based, and covered by reduced-motion CSS (`src/components/members/member-relay.module.css:753-777`, `src/components/members/member-relay.module.css:1086-1094`).
- Header geometry, Axe, theme, reduced motion, server HTML, and 320px evidence already have test seams that can be adapted rather than rebuilt.

### Bounded file-change map

| File | Required change |
|---|---|
| `src/app/members/page.tsx` | Rewrite metadata as organisation copy; keep the hero; consider temporary-mode `noindex`. |
| `src/content/member-placeholders.ts` | Replace with a fifteen-person realistic fictional roster, rename temporary types/functions, add Treasury, remove sample bios/codes. |
| `src/components/members/member-relay.tsx` | Remove all public QA branches and Beaker/sample UI; use temporary roster for empty/unavailable mode; render profile cards; simplify announcements and role copy. |
| `src/components/members/member-relay.module.css` | Replace row/table layout with responsive member grid; remove placeholder notice/badge styles; keep token-based theme and reduced motion. |
| `src/lib/members.ts` | Keep the result contract and private logging; no fictional identity belongs in the adapter or Convex response. |
| `convex/members.ts` | No functional change required for temporary identities. Do not seed them or weaken consent checks. |
| `tests/unit/members.test.ts` | Test fifteen unique temporary identities and complete subtype coverage. |
| `tests/e2e/site.spec.ts` | Remove prototype-string assertions; add forbidden-public-copy and computed grid-geometry checks; recapture evidence. |
| `PRODUCT.md`, `DESIGN.md`, `PRD.md`, `DATABASE.md` | Replace the `Voice NN` contract with local fictional temporary identities and an explicit editorial release gate. |

### Grid-specific regression risks

1. **Long subtype labels.** MIC and Human Resource Development can widen a card. Use `minmax(0, 1fr)`, allow wrapping, and test Indonesian/English label lengths.
2. **One-column phone rhythm.** A 320px card must not retain desktop aspect, fixed width, or horizontal role metadata.
3. **Uneven bios.** Clamp temporary bios to a consistent visual length or align card content with grid rows; do not hide essential role text.
4. **Filter reflow.** Changing from fifteen cards to five or four should not move keyboard focus or scroll the visitor unexpectedly.
5. **Motion replay.** `key={selection}` currently remounts the whole roster (`src/components/members/member-relay.tsx:407-410`). Keep any stagger below roughly 500–700ms total and remove spatial movement under reduced motion.
6. **Mixed data release.** Do not switch from the complete temporary roster to a single real profile automatically. Use an editorial live flag.
7. **Generated-portrait confusion.** Temporary images need a separate asset namespace and one page-level disclosure. Never use pending-consent archive photos.
8. **SEO association.** Plausible fictional names with leadership titles should not receive Person JSON-LD or detail URLs; use temporary noindex if the route will be publicly crawlable before official replacement.

### Revised definition of done

- The first public roster view is a real CSS grid, not full-width data rows.
- Fifteen realistic temporary identities cover every supplied division and position, including Treasury.
- No public metadata, visible copy, ARIA label, or live message contains prototype/test vocabulary.
- One understated disclosure explains that names and portraits are temporary.
- Empty and unavailable Convex states still render the same temporary grid; infrastructure details stay in server logs.
- Real Convex profiles still require published status, cleared profile consent, valid assignment, and separate portrait consent.
- Temporary identities never enter Convex or the reviewed R2 member namespace.
- Desktop, tablet, phone, and 320px checks prove the grid geometry and absence of overflow.
- Role filtering, theme, reduced motion, server HTML, Axe, and screenshot evidence pass after the rewrite.
