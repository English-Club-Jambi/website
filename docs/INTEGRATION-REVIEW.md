# Integration review ledger

Last updated: 26 August 2026, Asia/Jakarta

This ledger preserves cross-lane findings for the public site, Admin CMS, Assessment Lab, Convex Cloud, and R2. “Closed” means the source contract and focused evidence named in the row agree. It does not replace the final integrated release run. External configuration or real-cloud checks stay open even when failure-safe source behavior is complete.

## Closed

| Area | Evidence | Resolution |
| --- | --- | --- |
| Convex browser URL | `.env.local` supplies server `CONVEX_URL`; admin provider tests cover server resolution | Admin layout resolves `CONVEX_URL` and passes it to the scoped provider. A duplicate `NEXT_PUBLIC_CONVEX_URL` is not required. Missing configuration names the correct server variable. |
| Admin Auth provider | `/admin` previously mounted an incomplete wrapper | `ConvexAuthProvider` now supplies both Auth and Convex query contexts. The admin layout remains noindex/nofollow. |
| Missing bootstrap query runtime error | The client formerly called `adminUsers:bootstrapState`, which did not exist in the selected cloud functions | Current `AdminSignIn` no longer calls that function or exposes any setup mode. |
| Convex development sync | The browser error showed local source and cloud functions had diverged | The complete function/schema bundle is active on development deployment `perfect-greyhound-270`. Direct `adminUsers:whoAmI` and `assessments:listPublished` calls resolve, and the R2 connection check returns `{ "ok": true }`. |
| Identity versus authorization | A Password sign-up could be mistaken for CMS access | Browser sign-up is rejected. The internal action creates/verifies the Password account and its stable admin binding together; every protected function still requires an active role and permission. |
| Last-owner safety | Owner management could otherwise remove the final recovery path | `adminUsers.setAccess` counts at most two active owners and refuses to disable or demote the last one. Focused Convex tests cover it. |
| Public setup control | Browser setup created orphan identities and encouraged placeholder token copying | Setup was removed from every environment. `npm run admin:provision` invokes an internal action, hides typed passwords, and can generate a one-time credential without storing it in source. |
| Real development owner round trip | The sole legacy owner row was bound to the literal `TOKEN_DARI_UI`, while the intended email had no Password account | Internal provisioning created the intended Password account, safely rebound the exact sole placeholder owner, and recorded the audit event. A real browser completed sign-in, sign-out, and second-session sign-in with the Owner workspace visible and no setup controls or console errors. |
| Contact at 320 px | H1 previously ran beyond the clipped stage | Mobile route-title spans wrap within the viewport. Recorded focused browser evidence measured equal viewport/document width. |
| Public navigation and crawl contract | Practice existed but was missing from `sitemap.ts`; owned routes needed crawler exclusion | `/practice` is now a static sitemap route. `robots.ts` disallows `/admin`, `/practice/attempt/`, and `/practice/result/`. `tests/unit/sitemap.test.ts` covers both contracts. |
| Journal archive scale | One oversized list and body-bearing archive DTO would degrade as posts grow | `posts.listPublishedPage` requires six rows and `maximumRowsRead: 6`, returns summary-only records, and the route uses opaque cursor links. Cursor variants are noindex/follow. Focused backend/E2E tests cover page stability and metadata. |
| Journal companion image | The wide-screen cover could stay stale or drift while scrolling | One bounded reading-line observer plus passive requestAnimationFrame scheduler selects the companion; focus remains an explicit input and normal links remain usable without it. |
| Public CMS freshness | Published page/theme data could remain behind a 300-second Next cache | Server adapters preserve Convex `cache: "no-store"`; React memoization only deduplicates one render. |
| CMS capacity | Practice content exceeded the former 120-row assumption | Public/admin content functions enforce a 200-entry page/locale ceiling. Tests read every current Practice key beyond 120, allow 200, reject entry 201, and detect an over-limit legacy page. |
| Appearance saved-draft boundary | Publish could send the older Convex draft while the form showed unsaved colours | Publish is disabled while local name/recipe differs from the last saved draft. Theme state tests cover both dirty paths. |
| Theme publication safety | Browser colour values could otherwise become raw CSS | Convex normalizes seven light/dark anchors, derives a fixed snapshot, validates readability/safety, publishes immutable versions, and advances one pointer. Root serialization uses a fixed variable allowlist and code fallback. |
| Member edit identity | Editing an existing Member slug could create a second record | Existing slugs are read-only after creation; new records still pass validated normalization. |
| Assessment route-ID privacy | A raw string route ID could reach a typed ID function or reveal cross-owner existence | `resolveMine` normalizes first and applies the owner token before any child access. Malformed, missing, and cross-owner IDs share an unavailable shape; the route resolver has focused unit coverage. |
| Assessment lifecycle | Submit could formerly complete unstarted later sections | Submit now requires the final eligible section. Focused Convex tests prove early submit fails, section expiry closes only the current section, transcript state persists, and keys appear only after final submit. |
| Assessment key/result boundary | Player data could reveal keys or present unsupported score interpretations | Pre-submit projections omit answer keys. Result records/projectors expose raw correct, possible, and omitted counts plus mode/time/section context; review is post-submit and paginated at 20. |
| Assessment media projection | Missing access data, wrong purpose/version, or private media could resolve to a public URL | Public projection requires explicit `access: "public"`, ready status, safe immutable key, supported content type/purpose, same Assessment version, and reviewed derivative lineage. Backend tests reject private, legacy/no-access, wrong-purpose, wrong-version, unsafe, and unverified records. |
| Private-media failure safety | A missing private bucket could leave an orphan reservation or silently use public storage | Reservation checks all `R2_ASSESSMENT_*` configuration before insert. Configuration status reports confidential upload blocked and never falls back to the public bucket. |
| Assessment authoring separation | One broad role could author and approve the same work | Editor has `assessment:edit` without review/publish; publisher has review/publish without edit; owner has both. The academic reviewer is additionally checked against item authorship. |
| Assessment destructive UI | Native browser confirmation broke the Assessment workspace visual and focus language | Assessment reorder/delete uses the reusable rounded confirmation dialog, bounded targets, and focus restoration. Focused unit coverage records these states. |
| Fixed Practice Format catalogue | Arbitrary creation and section editing conflicted with structured random Question Bank delivery | The catalogue has no create action; its legacy `/new` route redirects; ordinary admin creation is rejected server-side. Each installed format now controls a revisioned allowed pool, fixed skill quota, pinned attempt draw, and aggregate learner flags without participant data. |
| Practice Format historical-row overflow | `adminAssessmentPools:getOverview` formerly read 201 global Question Bank rows before narrowing to the selected format, so a valid 140-item paper form failed once historical rows accumulated | The query now uses the profile/status/time index before the bounded read. A Convex regression creates more than 200 global rows and still resolves exactly 140 ready questions for the active paper profile. |
| Question Bank editing workspace | Dense inline editing remained useful for quick corrections but became uncomfortable for longer question and answer revisions | The same reusable editor can now stay inline or open in a focus-contained rounded workspace dialog. Saving either view advances the shared record revision; focused tests cover open/close, form reuse, focus return, and refreshed state. |
| General admin confirmation | Journal, Member, Media, and Theme actions still used four browser-native prompts | One shared async `AdminConfirmationProvider` now covers all four areas and the Assessment primitive. It holds the modal through mutation completion, blocks double submit, exposes recoverable errors, traps/restores focus, and has unit plus desktop/Pixel 7/320 browser evidence. `src` contains no `window.confirm`. |
| Mobile LAN hydration | A phone could render server HTML while every React control remained inert because Next.js returned HTTP 403 for development chunks requested from the LAN origin | The development allowlist now uses exact localhost, loopback, detected LAN IPv4, and validated operator-supplied hosts. Pixel 7 and 320 px touch traces cover public and authenticated Admin controls with no failed Next asset, console error, or page error. |
| Journal mobile composition | Mobile thumbnails occupied the metadata row while their titles began below it, creating a detached picture and an inconsistent vertical gap | Metadata now spans the row above a title-and-thumbnail pair. Real covers and fallbacks share the same bounded geometry, 44 px link target, dark-theme arrow color, and reduced-motion contract. |
| Integrated release run | Earlier evidence predated Admin, Assessment, LAN touch, the repaired Journal archive, and fixed Practice Formats | Current source passes TypeScript, ESLint, 226 Vitest tests, and an effective 173 browser cases with 55 intentional project-specific skips. The full run's sole cloud-latency miss passed after its bounded wait was repaired on all three viewports. Two isolated builds generate all current routes; the three-view Axe/geometry harness passes. |

## Open

| Priority | Area | Finding | Required closure evidence |
| --- | --- | --- | --- |
| P1 | Real editor/publisher role matrix | The real owner round trip is complete, but editor and publisher denial paths have only isolated Convex evidence. | Internally provision temporary non-owner identities on a named non-production target; verify each denied capability and its audit behavior; remove or disable those identities through a reviewed owner action. |
| P1 | Private Assessment R2 | The separate private bucket is not configured. No real Cloudflare SHA-256/CORS/preview/derivative evidence exists. | Separate non-public bucket and scoped credentials; exact localhost, `127.0.0.1`, and production CORS; signed PUT headers; matching checksum/MIME/bytes/cache/metadata `HeadObject`; 180-second preview; publisher-only public derivative; no URL leak or public fallback. |
| P1 | Assessment production content | The development seed publishes a typed original bank for end-to-end testing, but it is not a human review record and must not become production approval by implication. | Run the production candidate through validation/checksum and four current-revision approvals; verify academic reviewer independence, catalogue/player behavior, and a result reproduced from immutable keys/responses. |
| P1 | Retention and operations | Contact submissions, Anonymous attempts/results, audit events, and private source media do not yet have an organization-approved production retention schedule. | Approved periods and disclosure copy; bounded cleanup/export process; restore/incident owner; deletion test that does not overclaim Auth-row erasure. |

## Verification snapshot

Confirmed from current source and focused evidence files:

- `CONVEX_URL` server resolution and provider tests exist; `AdminSignIn` has no `bootstrapState` query.
- Journal backend tests request six-row cursor pages and reject a different `maximumRowsRead`.
- Current sitemap/robots source and unit tests include the Practice/crawler contract.
- Assessment backend tests cover identity ownership, pre-submit key privacy, early-submit rejection, current-section expiry, private/wrong-version media rejection, launch-gate behavior, 200-entry CMS capacity, authoring/review, reorder/delete, and attempt deletion.
- Unit tests cover delayed Anonymous sign-in, programme quiz locality, Assessment media signed headers, route resolution, result label rendering, reusable select behavior, async rounded confirmations, theme safety, and 320 px admin navigation behavior.
- The selected Convex development deployment serves the current functions. The active catalogue contains one 140-question paper form and three raw-objective quick forms; earlier four-skill forms are retired and remain available only to their historical attempts. `adminUsers:whoAmI` resolves for an unauthenticated caller, and the public R2 bucket check succeeds.
- One real internally provisioned owner reaches the Admin workspace across two Password sessions. The guarded `TOKEN_DARI_UI` repair left one active owner row with a stable issuer/Auth-user binding and a recorded grant event.
- The bounded full browser run passed 172 cases and intentionally skipped 55 project-specific cases across desktop, Pixel 7, and 320 px. Its sole miss was the Contact success response crossing the former five-second wait under load; the repaired bounded wait passed on all three viewports, yielding an effective 173 verified cases with no open failure.

Not yet claimed:

- a real editor/publisher negative-permission round trip against the selected cloud deployment;
- a working private Assessment bucket;
- production-approved Assessment questions or a production release. The four visible development forms come from the explicit internal seed and do not close that gate.

Port 3987 was not stopped or restarted during the final integration verification.
