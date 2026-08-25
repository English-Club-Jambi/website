# Journal pagination and density audit

Date: 25 August 2026
Surface: `/journal`
Scope: current route, journal relay, CSS, Convex read path, fallback adapter, tests, and responsive evidence
Change boundary: implementation direction only; no application source was changed during this audit

## Decision

Keep the journal's typographic list and companion preview. They give the route a recognisable reading rhythm without falling back to a card grid. Reduce the repeated story scale, fetch six summaries at a time, and add URL-backed Convex cursor pagination.

The public archive should use these URLs:

```text
/journal
/journal?after=<opaque-convex-cursor>#journal-archive
```

The first URL is the canonical, indexable archive. Cursor URLs are temporary archive positions: they remain shareable and work with Back/Forward, but individual story URLs remain the permanent destinations.

Use **six stories per page** on every viewport. Do not change page size at CSS breakpoints; the same cursor URL must resolve to the same records on desktop and mobile.

Pagination controls should be:

- `Newest stories`, rendered only after the first page and linked to `/journal#journal-archive`;
- `Older stories`, rendered only when Convex reports that another page exists;
- a plain `End of the journal` status on the final page, not a disabled link;
- normal Next.js links with the `#journal-archive` fragment so a page change does not force readers through the masthead again.

Do not manufacture numbered pages. Convex cursors do not provide an offset or a stable total-page count, and computing page `37` would require scanning the preceding archive. If the product later requires an adjacent `Newer stories` link on a directly opened cursor URL, add a durable, unique publication key and keyset pagination. Do not encode a growing cursor history into the URL.

## Evidence ledger

### Source findings

| Evidence | What it establishes |
| --- | --- |
| `src/app/journal/page.tsx:14-16` | The route always asks for 12 records and has no URL or pagination state. |
| `src/lib/journal.ts:20-21` and `src/lib/journal.ts:53-55` | Both local and cloud adapters clamp lists to 12, so a thirteenth published story is unreachable from the archive. |
| `convex/posts.ts:49-67` | The public query is indexed and bounded, but uses `.take(limit)` rather than pagination. |
| `convex/schema.ts:18-38` | `by_status_published_at` already supplies the correct descending public archive order. No new archive index is required. |
| `convex/validators.ts:30-41` | The list response validator includes `body`, even though the archive never renders it. |
| `convex/posts.ts:19-46` | `toPublicPost` projects the full body into every list result. |
| `src/components/play/journal-relay.tsx:112-140` | Every result becomes a large article row with category, date, title, and excerpt. |
| `src/components/play/journal-relay.tsx:27-107` | The companion preview is controlled by a desktop reading-line observer; focus and pointer activation also change it. |
| `src/components/play/journal-relay.tsx:21-24` and `:107` | Active state starts at index zero, but the effect depends only on `posts.length`; two six-item pages can preserve the old index after navigation. |
| `src/components/play/play.module.css:568-632` | Each row uses large vertical padding and a title up to 4.7rem. |
| `src/components/play/play.module.css:740-746` | The companion preview is correctly removed below 1120px. |
| `src/components/play/play.module.css:951-964` | Mobile stacks metadata and still uses display-sized titles. |
| `src/app/globals.css:561-609` and `:1912-1929` | The route masthead consumes most or all of the first viewport before the archive starts. |
| `tests/e2e/site.spec.ts:279-308` | Current E2E coverage protects the desktop reading-line preview, but it does not cover a data-page change. |
| `tests/convex/backend.test.ts:29-55` | Current backend coverage proves order, status filtering, and a fixed limit only. |
| `convex/posts.ts:107-120` | Sitemap entries stop at 100, which becomes a separate discovery limit when the archive grows. |
| `docs/TECH-RESEARCH.md:186-205` | The earlier project contract already called for cursor pagination and a list projection without the post body. The current implementation has not completed that contract. |

### Live measurements

The running server on port 3987 was inspected without restarting or terminating it. Chromium loaded the current `/journal` route at three CSS viewport sizes.

| Viewport | Masthead height | Archive section height | Title size | Current row heights | Sum of three rows | Horizontal overflow |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| 1440 × 1000 | 740px | 1,158px | 60.48px | 300 / 300 / 242px | 842px | none |
| 412 × 915, Pixel 7 CSS size | 849px | 1,025px | 41.2px | 317 / 278 / 254px | 849px | none |
| 320 × 900 | 834px | 1,013px | 32px | 291 / 285 / 261px | 837px | none |

At 1440px the first story begins below the initial 1000px viewport. At Pixel 7 width, the masthead alone occupies 92.8% of the CSS viewport height. The layout does not overflow horizontally, but the reading density does not scale to a long archive.

The current server-rendered HTML was 37,847 bytes for three posts. Searching that response found body-only headings from all three articles (`Listening is part of speaking`, `Keep the conversation moving`, and `Record only what helps`). The browser receives full article bodies that the index does not render. A Medium-level editor with inline media and maps will make this payload grow much faster than the visible list.

### Visual evidence inspected

- `docs/evidence/journal-desktop-final-light.png`
- `docs/evidence/journal-desktop-final-dark.png`
- `docs/evidence/redesign-journal-preview-first.png`
- `docs/evidence/redesign-journal-preview-second.png`
- live 1440px, Pixel 7, and 320px full-page captures stored outside the repository during this audit

The current direction is worth preserving: titles lead, one image supports the active reading line, and mobile does not depend on that image. The scale and data contract are the defects.

## Audit health score

| # | Dimension | Score | Key finding |
| --- | --- | ---: | --- |
| 1 | Accessibility | 3/4 | Semantic story links, focus styles, reduced motion, and the existing Axe suite are sound; pagination still needs a labelled landmark and reliable post-navigation context. |
| 2 | Performance | 2/4 | Reads are indexed and bounded, but every archive row sends the full article body and the fixed cap hides later posts. |
| 3 | Responsive design | 2/4 | No horizontal overflow was found, but one mobile row can consume 317px and the masthead consumes nearly the whole first viewport. |
| 4 | Theming | 4/4 | Journal colors use semantic light/dark tokens and the preview image filter follows the theme. |
| 5 | Anti-patterns | 3/4 | The companion-preview index is distinctive; repeated 60px titles and inactive mobile preview state add display drama where scanning speed should lead. |
| **Total** |  | **14/20** | **Good; fix the data boundary and archive rhythm before adding volume.** |

## Anti-pattern verdict

The journal does not read as a generic AI card gallery. It has a clear, project-specific mechanism: a typographic reading line with one documentary companion. Keep that.

Two decisions weaken it:

1. Every story receives near-hero typography. Repeating display treatment removes hierarchy and makes three records feel like a long archive.
2. Below 1120px the preview disappears, but the first row remains `data-active="true"`. Mobile therefore shows one blue title and arrow for an interaction whose visual result is absent. All story links should have the same resting treatment when there is no companion preview.

The title letter spacing is `-0.042em`, just beyond the project's loaded Impeccable floor of `-0.04em`; the route masthead is tighter still at `-0.052em`. Use `-0.035em` for archive titles and no tighter than `-0.04em` for display headings.

## Findings by severity

### P1 — Later stories become unreachable

**Location:** `src/app/journal/page.tsx:15`, `src/lib/journal.ts:20-21`, `src/lib/journal.ts:53-55`, `convex/posts.ts:49-67`
**Category:** Data access / information architecture
**Impact:** The thirteenth published story exists and may have a detail URL, but no visitor can reach it through `/journal`.
**Recommendation:** Replace the fixed limit contract with a six-item Convex cursor query and render normal links to later cursor pages.

### P1 — Archive responses include full article bodies

**Location:** `convex/validators.ts:30-41`, `convex/posts.ts:19-46`, `src/lib/journal.ts:7-18`
**Category:** Performance / data boundary
**Impact:** Body text, rich editor blocks, inline image metadata, and maps would be serialised once per row even though the archive displays none of them. The problem grows with both post count and article length.
**Recommendation:** Split summary and detail validators/types. The page query returns only slug, title, excerpt, category, author, cover summary, publication/update dates, and featured state. The slug query alone returns body content.

### P1 — Companion state can point at the wrong record after a page change

**Location:** `src/components/play/journal-relay.tsx:21-24`, `:107`
**Category:** State correctness
**Impact:** If page one and page two each contain six items, `activeIndex` can remain at index four or five during navigation. The sticky image and caption can start on an unrelated record from the new page.
**Recommendation:** Remount the relay with a stable page key (`after ?? "first"`) or reset state and refs when `posts[0]?.slug` changes. Test this after activating the last item on page one.

### P2 — Repeated story scale is too large for scanning

**Location:** `src/components/play/play.module.css:568-632`
**Category:** Responsive design / typography
**Impact:** Three rows already consume 842–849px before section padding. With the current scale, a 12-item result would feel like a sequence of landing-page headlines rather than an archive.
**Recommendation:** Move metadata into a narrow desktop rail, reduce title size, and shorten row padding. Keep titles and excerpts complete; do not solve density by hiding the story name.

### P2 — First content is below the fold

**Location:** `src/app/globals.css:561-609`, `src/app/globals.css:151-153`, `src/app/globals.css:1912-1929`
**Category:** Responsive design / task flow
**Impact:** A reader who chose “Journal” sees no story in the first desktop viewport, while mobile spends nearly a full screen on the masthead. Repeating this on each cursor page makes pagination tiring.
**Recommendation:** Give the journal a shorter route-stage override and reduce journal-index top padding. Pagination links must include `#journal-archive`.

### P2 — Invalid cursors can be mistaken for a backend outage

**Location:** `src/lib/journal.ts:61-70`
**Category:** Error handling
**Impact:** The current adapter catches every Convex failure and serves page-one seed content. Once a cursor comes from the URL, a malformed or expired cursor could silently display unrelated records.
**Recommendation:** Validate the query parameter before calling Convex. On a paginated request, return an explicit invalid/unavailable result; never replace it with first-page seeds.

### P2 — Mobile keeps an active state with no preview

**Location:** `src/components/play/play.module.css:615-625`, `:740-746`
**Category:** Interaction clarity
**Impact:** The first mobile title is blue and exposes its arrow because it is “active,” although the companion it controls is hidden. The other titles can look less clickable.
**Recommendation:** At widths below 1120px, give every story link the same resting color and expose the Heroicon arrow consistently. Reserve active color for the desktop companion state.

### P2 — Sitemap discovery stops at 100 stories

**Location:** `convex/posts.ts:107-120`
**Category:** SEO / scale
**Impact:** Once 101 posts publish, older detail URLs disappear from the generated sitemap even though archive pagination may expose them.
**Recommendation:** Move sitemap reads to their own bounded pagination contract and add a 101-post regression test. This can ship immediately after archive pagination if scope must stay narrow.

### P3 — Archive title tracking is over-tight

**Location:** `src/components/play/play.module.css:587-592`
**Category:** Typography
**Impact:** Dense letter shapes become harder to read in long titles and at intermediate widths.
**Recommendation:** Use `letter-spacing: -0.035em` for story titles and keep the display floor at `-0.04em`.

## Target journal structure

```text
Journal masthead, shorter than the current route default

Journal archive header
  “Journal archive” h2
  short archive description
  “6 stories” page status

Journal relay
  desktop: metadata rail + title/excerpt list | sticky documentary preview
  tablet: full-width title/excerpt list
  mobile: stacked metadata + title/excerpt, one consistent link treatment

Pagination nav
  Newest stories | Older stories
  or End of the journal
```

Add a visible archive heading. The route currently moves from the `h1` straight to story `h2`s. With `Journal archive` as `h2`, story titles become `h3`s on this page. `JournalRelay` already accepts `headingLevel`, so this requires no new heading abstraction.

## Density and responsive geometry

### Wide layout, 1120px and above

- Keep the existing 12-column relay.
- Keep the story list in columns 1–7 and the preview in columns 8–12.
- Inside each story row, use a two-column grid:
  - metadata rail: `clamp(7rem, 9vw, 9rem)`;
  - story copy: remaining width;
  - gap: current `--grid-gap`.
- Category and date stack within the metadata rail, aligned to the row top.
- Title target: `clamp(1.85rem, 2.6vw, 3rem)`, line-height about `1.02`, letter spacing `-0.035em`.
- Row padding target: `clamp(1.1rem, 2vw, 1.7rem)`.
- Excerpt remains complete and capped by editorial input validation rather than CSS truncation.
- Average row-height target with current content: at most 210px at 1440px. Do not set a fixed height.
- Keep one sticky 4:3 preview. It stays decorative because the linked row already contains the title and category.

### Tablet, 640–1119px

- Hide the companion preview as the current implementation does.
- Let the list occupy the full 12-column frame.
- Keep the metadata rail until 719px if it leaves at least 28rem for story copy; otherwise stack it.
- Remove `data-active` resting color below the preview breakpoint.
- Show a 20–22px `ArrowUpRightIcon` on every row, not only the inactive desktop state.

### Mobile, 320–639px

- Stack metadata above the title, but keep category and date on one wrapping row where they fit. The current forced column adds height without helping at 320px.
- Title target: `clamp(1.65rem, 7vw, 2.2rem)` with normal word wrapping.
- Keep at least 44px of interactive height for every title link and 48px for pagination links.
- Page container remains 16px from each edge at 320px.
- No fixed card height, no horizontal swipe, and no preview placeholder.
- Average row-height target with current content: at most 230px at 412px; no current fixture row should exceed 250px.
- After following a pagination link, at least the first three story titles should fit within the next 915px of content.

### Journal-specific vertical rhythm

Suggested starting bounds, to be verified visually rather than copied blindly:

```css
.journal-stage {
  min-height: clamp(28rem, 62svh, 42rem);
}

.journal-index {
  padding-block: clamp(3rem, 6vw, 6rem);
}

@media (max-width: 639px) {
  .journal-stage {
    min-height: clamp(30rem, 68svh, 38rem);
  }

  .journal-index {
    padding-block: 3rem 4.5rem;
  }
}
```

Acceptance decides the final values: at 1440 × 1000 and Pixel 7, some part of the first story title must be visible in the initial viewport. The masthead must still contain its full heading and support copy at 320px and 200% text zoom.

## Convex query contract

### Split summary from detail

Create two public validators and matching TypeScript types:

```text
publicPostSummary
  slug
  title
  excerpt
  category
  authorName
  optional coverKey or future public cover metadata
  publishedAt
  updatedAt
  featured

publicPostDetail
  all summary fields
  body or future editor document
```

`posts.getPublishedBySlug` returns `publicPostDetail`. The archive page query returns `publicPostSummary` only. Private status, creation time, drafts, editor state, and upload internals never cross either public boundary.

### Cursor query

Follow the installed Convex 1.45 API and generated guidelines:

- import `paginationOptsValidator` and `paginationResultValidator` from `convex/server`;
- define object-form `args`, `returns`, and `handler`;
- query `posts` with `by_status_published_at` and `status === "published"`;
- order descending;
- call `.paginate(args.paginationOpts)` without rebuilding the pagination object;
- map `result.page` through the summary projector and preserve pagination metadata;
- require a published record to have `publishedAt` before rollout so post-filtering cannot shorten pages;
- keep the query public because the Next.js server adapter calls it through `fetchQuery`.

The intended signature is:

```text
posts.listPublishedPage({
  paginationOpts: {
    numItems: 6,
    cursor: string | null
  }
}) -> paginationResult<publicPostSummary>
```

`numItems` is a pagination target under Convex's reactive contract, not an absolute runtime maximum. In a stable fixture, tests should receive six. The public function must reject unsupported page-size values while still passing an accepted `paginationOpts` object unchanged to `.paginate()`. The application controls page size; it is not a URL option.

No new index is needed. `by_status_published_at` already supports the read path. Do not use `.filter()`, an offset, an unbounded `.collect()`, or a second database.

### Server adapter

Replace `getPublishedPosts(limit)` for archive use with a page result:

```text
getPublishedPostsPage(after?: string)
  -> {
       status: "ready" | "fallback" | "unavailable";
       posts: PublicPostSummary[];
       isDone: boolean;
       continueCursor: string | null;
     }
```

Rules:

- no `after` value means Convex cursor `null`;
- accept only a single, non-empty string with a conservative URL-length cap;
- treat arrays, blank strings, and oversized values as invalid and canonicalise to `/journal#journal-archive`;
- never log the cursor;
- if Convex is absent on the first page, return local summaries with `isDone: true`;
- if Convex fails for a cursor page, render a compact unavailable state with a real link back to newest stories; do not substitute page-one seed records;
- keep article-detail fallback separate and unchanged unless the admin work replaces it.

The local seed helper should also have separate summary and detail projections. This prevents test and development fallbacks from restoring the body-payload bug.

## Next.js URL and metadata contract

The installed Next.js 16.3.2 docs state that database pagination belongs in the async page `searchParams` prop. The page therefore becomes request-time rendered:

```text
JournalPage(props: PageProps<"/journal">)
  await props.searchParams
  parse `after`
  fetch one Convex page
```

Use an object-form Next.js `Link` or `URLSearchParams` so the opaque cursor is encoded safely. The older link includes the archive fragment:

```text
/journal?after=<encoded continueCursor>#journal-archive
```

Metadata behavior:

- `/journal` keeps the existing title, description, and canonical URL;
- cursor pages retain canonical `/journal` and use `robots: { index: false, follow: true }`;
- every detail URL remains self-canonical and appears in the sitemap;
- the cursor is navigation state, not a durable content identifier.

Pagination should work in server HTML. JavaScript may preserve focus or add a short preview crossfade, but it must not be required to discover the next page.

## Interaction and motion contract

- Keep the reading-line `IntersectionObserver` at 1120px and above.
- Use no hover-only information. Pointer, focus, and scroll may select the same decorative preview; the title link remains the action.
- Reset `activeIndex` to zero and clear stale refs when the page's first slug changes, or remount the relay with the cursor as its key.
- After a cursor navigation, the first record drives the preview before any scroll occurs.
- Keep the existing transform/opacity preview entrance. Do not animate row height, grid tracks, padding, or page layout.
- Continue using the global reduced-motion behavior and the module's `journalPreviewContent` override.
- Use Heroicons for pagination arrows. Do not use `←`, `→`, chevrons typed as text, or decorative ASCII.
- Do not add infinite scroll. It weakens footer access, URL state, and the reader's sense of archive position.

## Accessible pagination markup

Required semantics:

```text
section#journal-archive[aria-labelledby="journal-archive-title"]
  h2#journal-archive-title
  story headings at h3
  nav[aria-label="Journal pagination"]
    link “Newest stories” when after is present
    link “Older stories” when isDone is false
    text “End of the journal” on the last page
```

Additional rules:

- pagination link targets are at least 48px high and 44px wide;
- visible focus uses the existing global focus token;
- icons are `aria-hidden`; link text supplies the name;
- do not render `aria-disabled` anchors with working `href`s;
- a full server navigation does not need an `aria-live` announcement;
- the archive heading and current records must be present in server HTML;
- Back and Forward must restore the corresponding cursor URL and records;
- the fragment scroll must become instant under `prefers-reduced-motion`, which the current global CSS already enforces.

## File-level implementation map

| File | Required change |
| --- | --- |
| `convex/validators.ts` | Add separate public summary and detail validators. |
| `convex/posts.ts` | Add/replace the archive list with `listPublishedPage`; project summaries; keep slug detail and sitemap reads separate. |
| `convex/schema.ts` | No archive index change. Preserve `by_status_published_at`. |
| `src/lib/journal.ts` | Split summary/detail types and local projectors; add a cursor-page adapter and explicit cursor failure states. |
| `src/app/journal/page.tsx` | Await `searchParams`, fetch one page, add archive heading/status, pass heading level 3 and a page key, render pagination nav. |
| `src/components/play/journal-relay.tsx` | Reset/remount active preview state on page changes; otherwise preserve the reading-line behavior. |
| `src/components/play/play.module.css` | Add the metadata rail, smaller title scale, tighter row rhythm, consistent non-preview link state, and pagination styles if they remain module-owned. |
| `src/app/globals.css` | Add journal-specific masthead/index spacing only if it cannot stay co-located with the journal component. |
| `tests/convex/backend.test.ts` | Prove cursor order, privacy projection, page boundaries, and last-page state. |
| `tests/unit/journal.test.ts` | Prove cursor parsing, fallback policy, and summary/detail separation. |
| `tests/e2e/site.spec.ts` | Add URL, keyboard, state-reset, density, responsive, Axe, and screenshot checks. |
| `docs/TECH-RESEARCH.md` and product docs | Mark the existing cursor/no-body contract implemented and record page size six. |

## Test matrix

### Convex tests

Use at least 15 published records plus draft and archived records in `convex-test`.

1. First call with `{ numItems: 6, cursor: null }` returns six published summaries newest first.
2. The result contains no `body`, `status`, `createdAt`, upload token, or editor state.
3. Calling with the returned cursor yields the next stable page with no duplicate slugs.
4. Following cursors until `isDone` returns all 15 published records exactly once.
5. Draft, archived, and published-without-date records never appear.
6. Unsupported `numItems` values are rejected before a large read.
7. A malformed cursor fails safely and does not return page one under a paged URL.
8. `getPublishedBySlug` still returns body content for one published detail and rejects private states.

### Unit tests

1. `after` accepts one bounded string and rejects arrays, blanks, and oversized values.
2. Local first-page fallback returns summaries and `isDone: true`.
3. A paged cloud failure returns `unavailable`, not seed page one.
4. Pagination URL construction preserves the opaque cursor and `#journal-archive`.
5. Summary types do not expose `body`; detail types do.

### Browser tests

Run against a disposable Convex preview deployment seeded with more than six public posts. Do not add test-only rows to the shared public development archive.

| Case | Desktop 1440 × 1000 | Pixel 7 | 320px |
| --- | --- | --- | --- |
| First page server HTML | six story summaries, no body-only text | same records | same records |
| Older link | URL receives encoded `after` and fragment; next six render | 48px touch target | no overflow |
| Back / Forward | restores exact page-one/page-two slugs | same | same |
| Newest link | returns to page one and archive anchor | same | same |
| Preview reset | activate last page-one row, navigate, preview starts on first page-two row | preview absent | preview absent |
| End state | no fake disabled link; `End of the journal` appears | same | same |
| Long content | 90-character title and 180-character excerpt wrap without overlap | row stays under target | no clipped title |
| Keyboard | Tab order follows story links then pagination links | visible focus | visible focus |
| Axe | no WCAG A/AA violations | no WCAG A/AA violations | no WCAG A/AA violations |
| Reduced motion | preview swaps without motion | fragment jump is instant | fragment jump is instant |

### Screenshot evidence to produce after implementation

- `docs/evidence/journal-pagination-desktop-page-1-light.png`
- `docs/evidence/journal-pagination-desktop-page-2-light.png`
- `docs/evidence/journal-pagination-desktop-page-2-dark.png`
- `docs/evidence/journal-pagination-mobile-page-1-light.png`
- `docs/evidence/journal-pagination-mobile-page-2-light.png`
- `docs/evidence/journal-pagination-320-page-1-light.png`
- `docs/evidence/journal-pagination-long-title.png`

Inspect each image; generating the file is not evidence by itself.

## Acceptance checklist

### Data and scale

- [ ] A seventh published post is reachable from `/journal` through a normal link.
- [ ] Fifteen fixture posts traverse three cursor calls with no duplicates or omissions.
- [ ] Archive results contain no full body/editor document.
- [ ] The query uses `by_status_published_at` and `.paginate()`; no `.filter()` or offset scan.
- [ ] Page size is controlled at six and cannot be raised from the URL.
- [ ] Invalid cursor input never becomes page-one seed content.

### Layout and interaction

- [ ] At 1440 × 1000 and Pixel 7, the first story title begins inside the initial viewport.
- [ ] Current-content rows average no more than 210px at 1440 and 230px at Pixel 7.
- [ ] No current mobile row exceeds 250px after the density pass.
- [ ] No horizontal overflow occurs at 1440, 1120, 880, 640, 412, 375, or 320px.
- [ ] Mobile rows have one consistent resting link treatment when the preview is hidden.
- [ ] Every icon comes from Heroicons; no typed arrow or ASCII symbol is used.
- [ ] The first preview on a new page belongs to the first record on that page.
- [ ] Reduced motion removes preview entrance and smooth fragment scrolling.

### Navigation and accessibility

- [ ] Pagination is a labelled `nav` with real links.
- [ ] Cursor URLs survive reload and direct open.
- [ ] Back and Forward restore the expected records.
- [ ] Pagination links include `#journal-archive` and meet 44 × 48px target geometry.
- [ ] Page one is self-canonical; cursor pages are `noindex,follow` and canonicalise to page one.
- [ ] Server HTML contains the archive heading and every visible story link.
- [ ] Axe reports no WCAG A/AA violations on first, middle, and final pages.

### Verification

- [ ] `npm run typecheck`
- [ ] `npm run test:backend`
- [ ] `npm run test:unit`
- [ ] `npm run build`
- [ ] Convex cloud push completes cleanly after `npx tsc --noEmit`.
- [ ] Browser tests reuse the existing server on port 3987; the process is not terminated.
- [ ] All seven screenshots are inspected at original resolution.

## Risks and boundaries

1. **Opaque cursors are archive positions, not permalinks.** Detail slugs remain the durable URLs. Cursor pages should not be indexed.
2. **Native pagination does not provide a total count or arbitrary page jump.** Do not add fake `1 2 3` controls without a separate, measured product decision and data design.
3. **A directly opened cursor URL cannot derive the immediately preceding Convex cursor.** The honest control is `Newest stories`; sequential visitors use browser Back for the adjacent prior page. A durable publication key is the upgrade path if adjacent bidirectional controls become mandatory.
4. **Reactive pagination can return a page around the target size during concurrent updates.** Tests use stable fixtures; UI must remain fluid if a page contains more than six temporarily.
5. **The sitemap has its own 100-item cap.** Archive pagination does not fix it automatically.
6. **Rich-editor bodies and media maps belong to the detail/admin contract.** The archive consumes summaries only and must not know editor internals.

## Positive findings to preserve

- Public post reads already use named indexes and bounded operations.
- Public list rows are projected rather than returning raw Convex documents.
- The route is a Server Component and ships ordinary story links in HTML.
- The preview is decorative; journal comprehension does not depend on it.
- Mobile removes the sticky preview rather than forcing a cramped split layout.
- Scroll work is requestAnimationFrame-throttled and disabled outside the wide layout.
- Existing motion has a reduced-motion fallback.
- Current 1440px, Pixel 7, and 320px pages have no horizontal overflow.
- Existing E2E coverage catches the previously stale reading-line preview and should be extended, not replaced.

## Recommended implementation order

1. **P1 — data boundary:** split summary/detail validators and add the paginated Convex query.
2. **P1 — route contract:** parse `after`, render archive pagination, and handle invalid/unavailable cursor states honestly.
3. **P1 — state correctness:** remount or reset `JournalRelay` on page changes.
4. **P2 — responsive density:** add the metadata rail, type scale, journal-specific masthead, and mobile resting state.
5. **P2 — discovery:** remove the sitemap's 100-story blind spot.
6. **Final polish:** run backend, unit, E2E, Axe, reduced-motion, long-title, and screenshot checks; inspect every result.
