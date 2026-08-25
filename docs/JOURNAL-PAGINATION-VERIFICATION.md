# Journal pagination verification

Verified on 25 August 2026 against the running site at `http://127.0.0.1:3987`. The test run reused the existing process. It did not stop, restart, or replace port 3987.

## Result

The journal archive is accepted after three fixes:

1. Mobile titles and thumbnails previously occupied the same grid area. Long titles ran beneath the image at 412 px and 320 px. The mobile layout now gives metadata and the thumbnail one row, then gives the title the full content width.
2. A desktop thumbnail previously set every archive row to about 269 px. The thumbnail now has a 160 px width cap and rows measure 161 px at 1440 px.
3. Convex pagination previously requested six items but did not set a database read ceiling. The public query now requires both `numItems: 6` and `maximumRowsRead: 6`, then passes the pagination object unchanged to `.paginate()`.

The 320 px archive omits excerpts. It keeps the category, date, title, thumbnail, and article link. The article page contains the full summary and body.

## Data contract

The backend test inserts 15 published posts and one draft, then follows every returned cursor.

| Check | Result |
| --- | --- |
| Page target and read ceiling | 6 |
| Pages returned | 3 |
| Published slugs returned | 15 |
| Duplicate slugs | 0 |
| Missing published slugs | 0 |
| Draft rows returned | 0 |
| `body` in archive payload | Absent |
| `status` in archive payload | Absent |
| `createdAt` in archive payload | Absent |

The archive keeps the existing full-post query for article pages and other detail contexts. Only the archive query uses `publicPostSummaryValidator`.

## URL and crawl behavior

- `/journal` is canonical and indexable.
- `after` accepts one trimmed, bounded opaque cursor.
- A repeated or malformed `after` value redirects to `/journal#journal-archive`.
- A well-formed cursor that Convex cannot resolve shows an honest unavailable state. It does not substitute first-page seed posts.
- Cursor pages keep the `/journal` canonical and set `noindex, follow`.
- Pagination uses server-rendered Next links. `Older stories` preserves and encodes the opaque cursor. Cursor pages provide `Newest stories` as a direct route back to the index.

The live deployment currently has three published stories, so the first page ends without an older-page link. The Convex test proves the three-page case. The component test separately proves cursor encoding and both pagination directions.

## Responsive geometry

Measurements come from Playwright after images and the archive heading rendered.

| Viewport | Archive heading top | Row heights | Horizontal overflow | Title and image overlap |
| --- | ---: | --- | --- | --- |
| 1440 × 1000 | 811 px | 161 px each | None | None |
| Pixel 7, 412 × 915 CSS px | 610 px | 210 to 230 px | None | None |
| 320 × 800 | 588 px | 150 to 175 px | None | None |

Every viewport shows the archive heading before the initial viewport ends. All tested rows stay below their density limits of 190 px on desktop, 245 px on Pixel 7, and 190 px at 320 px.

## Accessibility and interaction

- Axe 4.13 reports no WCAG A or AA violations in light or dark theme at 1440 px, Pixel 7, and 320 px.
- The article title is the single keyboard focus stop for each row. The decorative image link is removed from the tab order.
- Enter on the focused first title opens its article and lands on the correct article heading.
- Pagination is a labelled `nav` landmark.
- Article dates use `<time>` with ISO timestamps.
- Heroicons supply every directional and state symbol.
- Under `prefers-reduced-motion: reduce`, hover does not transform the archive image or directional icon. Content remains visible.

## Evidence

- [Desktop light](evidence/journal-pagination-desktop-chromium-light.png)
- [Desktop dark](evidence/journal-pagination-desktop-chromium-dark.png)
- [Pixel 7 light](evidence/journal-pagination-mobile-chromium-light.png)
- [320 px light](evidence/journal-pagination-narrow-chromium-light.png)

All four screenshots were inspected at original resolution. Text stays inside the canvas, media does not cover titles, pagination aligns with the list, and light and dark themes preserve the same hierarchy.

## Verification commands

```text
npx eslint convex/posts.ts src/lib/journal.ts src/app/journal/page.tsx src/components/journal/journal-archive.tsx tests/unit/journal.test.ts tests/unit/journal-archive.test.tsx tests/e2e/journal-pagination.spec.ts tests/convex/backend.test.ts
npm run typecheck
npx vitest run tests/unit/journal.test.ts tests/unit/journal-archive.test.tsx tests/convex/backend.test.ts
npx playwright test tests/e2e/journal-pagination.spec.ts
```

Results:

- TypeScript: passed at the journal checkpoint. A later integrated rerun reached an unrelated concurrent error in `convex/auth.config.ts:6`; the admin/auth owner has been notified.
- Focused Vitest and Convex: 3 files, 18 tests passed.
- Journal Playwright: 16 passed, 2 expected viewport skips.
- Journal geometry follow-up: 3 projects passed.

The updated Convex function still needs the final integrated development-deployment push after the rest of the concurrent backend work lands.

## Impeccable audit

| Dimension | Score | Finding |
| --- | ---: | --- |
| Accessibility | 4/4 | Axe, keyboard activation, semantics, focus, and reduced motion pass. |
| Performance | 4/4 | Archive rows receive summary payloads and lazy images; bodies stay out of the listing. |
| Responsive design | 4/4 | No overflow or media collision at 1440, 412, or 320 px. |
| Theming | 4/4 | The archive uses site tokens and passes Axe in both complete themes. |
| Anti-patterns | 4/4 | The archive remains a ruled editorial list, not a repeated card grid. |
| **Total** | **20/20** | **Accepted after fixes** |

The single `Published notes` label is part of the existing journal cadence. It is not repeated as a section scaffold. No new gradient text, glass surface, decorative shadow, oversized radius, ASCII icon, or placeholder copy was introduced.
