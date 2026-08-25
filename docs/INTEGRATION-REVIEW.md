# Integration review ledger

Last updated: 26 August 2026, Asia/Jakarta

This ledger preserves cross-lane findings for the public site, Admin CMS, Assessment Lab, Convex Cloud, and R2. “Closed” means the source contract and focused evidence named in the row agree. It does not replace the final integrated release run. External configuration or real-cloud checks stay open even when failure-safe source behavior is complete.

## Closed

| Area | Evidence | Resolution |
| --- | --- | --- |
| Convex browser URL | `.env.local` supplies server `CONVEX_URL`; admin provider tests cover server resolution | Admin layout resolves `CONVEX_URL` and passes it to the scoped provider. A duplicate `NEXT_PUBLIC_CONVEX_URL` is not required. Missing configuration names the correct server variable. |
| Admin Auth provider | `/admin` previously mounted an incomplete wrapper | `ConvexAuthProvider` now supplies both Auth and Convex query contexts. The admin layout remains noindex/nofollow. |
| Missing bootstrap query runtime error | The client formerly called `adminUsers:bootstrapState`, which did not exist in the selected cloud functions | Current `AdminSignIn` no longer calls that function. Initial setup is controlled by the server prop and the identity-only/one-time internal bootstrap sequence. |
| Convex development sync | The browser error showed local source and cloud functions had diverged | The complete function/schema bundle is active on development deployment `perfect-greyhound-270`. Direct `adminUsers:whoAmI` and `assessments:listPublished` calls resolve, and the R2 connection check returns `{ "ok": true }`. |
| Identity versus authorization | A Password sign-up could be mistaken for CMS access | Account creation yields only an Auth identity. Every protected function derives `identity.tokenIdentifier`, requires an active `adminUsers` row, and checks the server role map. `bootstrapOwner` is internal and succeeds only while the table is empty. |
| Last-owner safety | Owner management could otherwise remove the final recovery path | `adminUsers.setAccess` counts at most two active owners and refuses to disable or demote the last one. Focused Convex tests cover it. |
| Public setup control | Removing sign-up entirely left no safe first-owner path; exposing it continuously would create orphan identities | Non-production setup is available; production requires `ADMIN_BOOTSTRAP_ACCOUNT_CREATION=1`. The pending-identity screen exposes the exact token identifier but no CMS data. Production bootstrap remains an operator gate below. |
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
| General admin confirmation | Journal, Member, Media, and Theme actions still used four browser-native prompts | One shared async `AdminConfirmationProvider` now covers all four areas and the Assessment primitive. It holds the modal through mutation completion, blocks double submit, exposes recoverable errors, traps/restores focus, and has unit plus desktop/Pixel 7/320 browser evidence. `src` contains no `window.confirm`. |
| Integrated release run | Earlier evidence predated Admin and Assessment integration | Current source passes TypeScript, ESLint, 140 unit tests, 39 Convex tests, 142 browser cases with 20 intentional skips, Convex codegen/type validation, and a 30-route isolated production build. Dependency audit reports zero vulnerabilities. |

## Open

| Priority | Area | Finding | Required closure evidence |
| --- | --- | --- | --- |
| P1 | Real first-owner cloud round trip | Source and isolated Convex tests prove the contract, but one actual Password identity → exact token identifier → one-time owner bootstrap → protected sign-in flow must still be recorded against the intended non-production cloud deployment. | Target named; secrets absent from output; identity-only caller denied; bootstrap succeeds once; second bootstrap fails; owner reaches admin; editor/publisher negative permission matrix and audit events pass. |
| P1 | Private Assessment R2 | The separate private bucket is not configured. No real Cloudflare SHA-256/CORS/preview/derivative evidence exists. | Separate non-public bucket and scoped credentials; exact localhost, `127.0.0.1`, and production CORS; signed PUT headers; matching checksum/MIME/bytes/cache/metadata `HeadObject`; 180-second preview; publisher-only public derivative; no URL leak or public fallback. |
| P1 | Assessment release content | Infrastructure must not be confused with reviewed questions. No version may publish without original authored content, a current validation check, and current academic, rights, accessibility, and bias approvals. | Content ledger; passing validation/checksum; four current-revision approvals; academic reviewer independence; public catalogue/player smoke; raw result reproduced from immutable keys/responses. |
| P1 | Retention and operations | Contact submissions, Anonymous attempts/results, audit events, and private source media do not yet have an organization-approved production retention schedule. | Approved periods and disclosure copy; bounded cleanup/export process; restore/incident owner; deletion test that does not overclaim Auth-row erasure. |

## Verification snapshot

Confirmed from current source and focused evidence files:

- `CONVEX_URL` server resolution and provider tests exist; `AdminSignIn` has no `bootstrapState` query.
- Journal backend tests request six-row cursor pages and reject a different `maximumRowsRead`.
- Current sitemap/robots source and unit tests include the Practice/crawler contract.
- Assessment backend tests cover identity ownership, pre-submit key privacy, early-submit rejection, current-section expiry, private/wrong-version media rejection, launch-gate behavior, 200-entry CMS capacity, authoring/review, reorder/delete, and attempt deletion.
- Unit tests cover delayed Anonymous sign-in, programme quiz locality, Assessment media signed headers, route resolution, result label rendering, reusable select behavior, async rounded confirmations, theme safety, and 320 px admin navigation behavior.
- The selected Convex development deployment serves the current functions. `assessments:listPublished` returns a valid reviewed-empty page, `adminUsers:whoAmI` resolves for an unauthenticated caller, and the public R2 bucket check succeeds.
- The complete browser run reports 142 passed and 20 intentional viewport-specific skips across desktop, Pixel 7, and 320 px. The production build generated 30 App Router entries from an isolated copy.

Not yet claimed:

- a real owner bootstrap against the selected cloud deployment;
- a working private Assessment bucket;
- reviewed public Assessment questions or a production release.

Port 3987 was not stopped or restarted during the final integration verification.
