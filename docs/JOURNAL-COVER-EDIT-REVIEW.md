# Journal edit and featured-image review

Reviewed: 26 August 2026

## Scope

This is an independent, read-only review of the current journal-edit workspace and its explicit featured-image contract. It covers:

- the exact published story reported in the screenshots;
- legacy-body and saved-revision loading;
- public/admin featured-image parity;
- preserve, replace, and remove semantics;
- published-revision isolation;
- administrator authorization and media validation;
- desktop, Pixel 7, and 320 px geometry;
- reduced motion, client errors, and Axe results.

The separate signed-R2 upload `NetworkError` is tracked in `docs/ACTIVE-FIX-LEDGER.md` and is intentionally outside this lane so its network diagnosis does not overlap the R2 upload work.

## Exact record checked

- Admin route: `/admin/journal/jh78v574sszsndqmec51mxpnqx8d4erd`
- Public route: `/journal/leeds-the-way-bridging-england-and-indonesia`
- Title: `Leeds the Way: Bridging England and Indonesia`
- Loaded editor state: published, revision 1, 191 words
- Standfirst: `A photographed panel brings English practice into a room shaped by questions, listening, and exchange.`
- Body evidence: the editor contains `language changes when it has a real person on the other side`.
- Featured-image alt: `Speakers sit in a panel while one person talks into a handheld microphone.`

The public article and administrator preview resolve to the same stored image, `/images/leeds-panel.webp`.

## Acceptance results

| Contract | Result | Evidence |
| --- | --- | --- |
| Exact edit record loads | Pass | Title, standfirst, 191-word body, category, and byline render in the edit workspace. |
| Previously reported blank editor | Pass | The exact record exposes its body through the accessible `Journal body` textbox. |
| Public cover appears in admin | Pass | Both views resolve the same image and alt text. |
| Cover is explicit | Pass | The cover is a separate revision field; the first inline image is never promoted automatically. |
| Omitted cover input preserves | Pass | `saveDraft` inherits the current draft cover, then the published post cover. |
| Replacement is revision-bound | Pass | Only ready `journal-cover` or `page-image` media can be saved; the revision stores both the media ID and verified object key. |
| Removal is deliberate | Pass | `coverMediaId: null` writes a `coverRemoved` tombstone; the public cover remains unchanged until that revision is published. |
| Draft cover stays private | Pass | A later draft cover does not change public detail, archive, featured-story, or listing payloads before publish. |
| Old revisions stay immutable | Pass | Saves insert a new `postRevisions` row instead of mutating prior revisions. |
| Authorization | Pass | Read, edit, and publish paths require `journal:read`, `journal:edit`, and `journal:publish` respectively. |
| Public media projection | Pass | Only ready cover media with an allowed journal purpose is projected. |
| Responsive geometry | Pass | No document overflow at 1440, 412, or 320 px; featured image remains inside the viewport at approximately 16:9. |
| Reduced motion | Pass | All three contexts report `prefers-reduced-motion: reduce`; admin transitions collapse to near-instant duration. |
| Accessibility | Pass | Axe reports no serious or critical violation inside `main` in all three contexts. |
| Runtime health | Pass | Zero page errors and zero browser console errors in the three exact-route checks. |

### Featured-image measurements

| Context | Viewport | Image box | Inside viewport | Public/admin parity |
| --- | ---: | ---: | --- | --- |
| Desktop Chromium | 1440 × 1000 | 236 × 131 px | Yes | Yes |
| Pixel 7 | 412 × 839 | 348 × 194 px | Yes | Yes |
| Narrow touch | 320 × 800 | 292 × 162.5 px | Yes | Yes |

Repository evidence:

- `docs/evidence/admin/journal-featured-image-desktop-chromium.png`
- `docs/evidence/admin/journal-featured-image-mobile-chromium.png`
- `docs/evidence/admin/journal-featured-image-narrow-chromium.png`

## Backend reasoning

### Saved revision selection

`getWorkspace` loads the post's draft and published revision IDs independently and rejects a revision whose `postId` does not match the requested post. The editor chooses the draft first, then the published revision, and only converts `posts.body` as legacy content when neither revision exists. Opening an old record therefore remains read-only; revision 1 is created only after an explicit save.

### Cover state machine

The current contract has three inputs:

1. Omitted `coverMediaId`: preserve the current draft choice, or fall back to the post's public cover.
2. A media ID: require a ready asset whose purpose is `journal-cover` or `page-image`, then pin its verified object key into the new revision.
3. `null`: write `coverRemoved: true` without removing the current public post cover.

Publishing reads the selected draft revision, rejects stale revision numbers, verifies body media again, and copies that revision's cover decision into the public post. The public story uses `publishedRevisionId` for structured body media, so unsaved and unpublished inline media remain private.

### Security checks

- Every administrator query and mutation has argument and return validators.
- Client-supplied actor IDs are not used; `requireAdmin` derives identity server-side.
- Cover and inline media IDs are normalized or strongly validated against the `mediaAssets` table.
- Cover and inline image purposes are checked independently.
- A publisher cannot publish a stale or already-published revision.
- Public media projections exclude private admin metadata such as uploader, original filename, checksum, and object-ledger timestamps.

## Findings

### Resolved during review — public modification time advanced on a private draft save

Location: `convex/adminPosts.ts:411` and `convex/posts.ts:73`.

An existing post's internal `updatedAt` still records private editorial activity, but public journal DTOs and sitemap entries now derive their modification time from the immutable `publishedAt` pointer. A focused regression proves that saving revision 1 for a legacy published story leaves the public body, public modification time, and sitemap modification time unchanged.

Recheck: pass.

### Resolved during review — the browser-test sign-in helper had a mobile timing race

Location: `tests/e2e/admin-current-fixes.spec.ts:33`.

`locator.isVisible()` did not wait. On desktop, the sign-in form usually existed before the check; on Pixel 7 and 320 px, the route could still be rendering `AdminLoading`, so the helper skipped credential entry and later timed out on the untouched sign-in screen. A hydration marker now gives credentialed tests an explicit readiness boundary before checking for the form.

Recheck: the repository Playwright regression now passes in its original parallel mode across desktop, Pixel 7, and narrow touch contexts using the ignored QA-owner credential file.

### Resolved during review — unavailable stored covers had contradictory status copy

Location: `src/components/admin/journal-workspace.tsx:501`.

The cover status now derives from renderability. A known local asset or ready R2 projection reports `Cover ready`; a non-null but unresolvable record reports `Cover unavailable`; and an absent selection reports `No cover`.

Recheck: the exact public cover remains resolvable and reports `Cover ready` at all three required widths.

### Resolved during review — featured-image heading used an invalid phrasing-content wrapper

Location: `src/components/admin/journal-workspace.tsx:493`.

The `h2` now sits inside a `div` using the dedicated `storyCoverIntroText` class. The invalid `span > h2` relationship is gone without changing the visual grouping.

Recheck: Axe still reports no serious or critical issue at 1440, Pixel 7, or 320 px.

## Audit health

| Dimension | Score | Note |
| --- | ---: | --- |
| Accessibility | 4/4 | Labelled fields, semantic heading exposed, useful alt, keyboard-reachable controls, zero serious/critical Axe results. |
| Performance | 4/4 | Bounded queries, bounded media reads, `next/image`, and no observed client/runtime errors. |
| Responsive design | 4/4 | Exact route has no horizontal overflow at all required widths; cover remains bounded and proportional. |
| Theming | 4/4 | Featured-image UI uses the administration token system and remains legible in the reviewed light workspace. |
| Anti-patterns | 4/4 | The separate image field is functional, compact, and aligned with the editor task; no decorative image-card wall or automatic media behavior. |
| **Total** | **20/20** | The scoped UI passes; findings are data-integrity and state-copy hardening rather than a visual redesign. |

## Commands and results

Focused backend contract:

```text
npm run test:backend -- tests/convex/admin-backend.test.ts -t "legacy|cover"
1 test file passed; 4 focused tests passed; 56 unrelated tests skipped.
```

The focused backend test was repeated after the review repairs with the same result: all four focused contracts pass.

The repository Playwright regression was repeated after the readiness fix in its original three-worker mode:

```text
ADMIN_CURRENT_FIXES_CREDENTIALS_PATH=.qa-admin-credentials.json npx playwright test tests/e2e/admin-current-fixes.spec.ts --grep "legacy story body"
3 tests passed: desktop Chromium, Pixel 7 Chromium, and narrow 320 px Chromium.
```

A separate race-free, read-only Chromium run was also repeated after the repairs and passed the exact public and admin routes at 1440, Pixel 7, and 320 px with reduced motion, cover parity, body evidence, geometry checks, Axe, and client-error collection enabled.

## Release recommendation

The featured-image implementation is suitable to retain: use a separate explicit cover field, never infer it from the first body image, and preserve public media until the selected revision is published. All scoped defects found in this review are resolved, and the exact regression now passes through the repository test suite at every required viewport.
