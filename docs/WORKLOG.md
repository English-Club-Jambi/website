# English Club Work Log

Updated: 26 August 2026
Status: Admin CMS and Assessment Lab integrated and synced to Convex development cloud; private media, role-matrix, content-review, and production gates remain open

This log records the research, redesign, Member extension, cloud integration, Admin CMS, Assessment Lab, repairs, and verification. Product requirements live in the root documents. File-level evidence lives in the audit ledgers. `QA-REPORT.md` now separates the current 26 August integrated release run from the retained 25 August public-site baseline.

## 26 August integration record

The repository now contains two major product lanes beyond the public organisation profile.

### Protected Admin CMS

- Convex Auth provides Password identities for administrators. The Next.js server resolves the deployment from `CONVEX_URL` and passes it to the scoped provider; a duplicated `NEXT_PUBLIC_CONVEX_URL` is not required.
- Administrator identity creation and CMS authorization now happen through one internal deployment-operator action. The browser exposes sign-in only and rejects Password `signUp` even when called directly.
- Provisioned administrators are bound through the Auth issuer plus Auth user ID, with the legacy complete-token lookup retained for existing records. An identity with no active `adminUsers` row receives no protected data.
- Server-owned roles are `editor`, `publisher`, and `owner`. Publishers can publish general content and review/publish Assessments but cannot author Assessment questions; owners also manage administrators.
- The workspace contains Overview, Pages, Journal, Assessments, Members, Media, Appearance, and Activity. It uses a rounded semi-neobrutal register with reusable custom selects, dialogs, pagination, status chips, and short supporting motion.
- Page copy keeps code-owned keys/component structure and supports at most 200 entries per page/locale. Convex rejects entry 201 and detects an already-invalid 201-row page.
- Journal editing stores validated Tiptap JSON plus plain text, supports reviewed cover/inline media and structured map data, and limits one revision to 40 unique inline images.
- Appearance publishes seven semantic anchors per light/dark scheme as one validated immutable snapshot. Public state advances through one pointer; rollback records a new event.

### English Club Assessment Lab

- Public routes cover `/practice`, one full practice briefing, four quick-skill briefings, an owned attempt, and an owned result. Public navigation calls the area `Practice`.
- The current form has 120 original tasks across Reading, Listening, Writing, and Speaking. It is fixed rather than adaptive. Legacy ITP-shaped records remain `raw-objective`; the four-skill profile uses only `practice-estimate-v1`.
- Exact practice points come from the published bank. Any band or 0-120 value is an uncalibrated English Club estimate for that fixed form. The product makes no ETS affiliation, equivalence, official score, exact prediction, CEFR, certificate, placement, or admission claim.
- The Home programme quiz has four local questions grounded in Activities copy and creates no identity. Persisted practice creates/reuses Anonymous Convex Auth only after Start.
- Every attempt is bound to `identity.tokenIdentifier`. `resolveMine` normalizes a string route ID before typed lookup and gives malformed, missing, and cross-owner IDs the same unavailable result.
- Player projections omit answer keys. Submission is allowed only from the final eligible section. Results report exact bank outcomes with section, time, mode, and estimate limits; answer review is cursor-paginated at 20.
- The authoring backend separates definitions, immutable versions, validation/provenance checks, four approval types, sections, stimuli, items, answer keys, attempts, responses, and immutable result revisions.
- Practice Builder now treats the installed full form and four skill sprints as a fixed catalogue. The admin has no creation entry point: each format controls a versioned allowed Question Bank pool, fixed skill quotas, and aggregate privacy-safe learner flag signals. Questions and order are pinned when a learner starts.
- Public Assessment media must be explicit `public`, ready, correct-purpose, same-version media. Confidential sources require a separate private R2 bucket, distinct credentials, checksum verification, and publisher-only public derivative.

### Integration gates still open

- Real editor and publisher identities have not yet exercised the negative permission matrix against the cloud deployment. The same matrix is green in isolated Convex tests.
- The development-only four-skill seed has published one full form and four quick forms from the typed original bank. It bypasses the human review workflow by design and cannot be promoted as production approval. Production content must still pass the current validation/provenance check plus all four current-revision academic, rights, accessibility, and bias approvals.
- The private Assessment R2 bucket is **not configured**. Its exact CORS, SHA-256 PUT/`HeadObject`, 180-second preview, and public derivative path remain unverified.
- Production retention periods for contact, attempts/results, audit events, and private media remain an organizational decision.

### 26 August release closeout

- The missing `adminUsers:bootstrapState` runtime contract was removed from the client and backend surface, generated bindings were refreshed, and `/admin` returned HTTP 200 without console or page errors.
- Manual testing exposed two setup defects: Convex surfaced its internal `InvalidAccountId` code for an unknown email, and the first allowlist row was accidentally bound to the literal `TOKEN_DARI_UI`. The client now emits one non-enumerating sign-in message, has no sign-up mode, and the internal provisioning path can repair only that exact sole placeholder while recording an audit event.
- The development deployment now has one internally provisioned active owner with a stable Auth-user binding. A real browser completed sign-in, sign-out, and a second sign-in without setup controls, console errors, or role loss. The earlier misspelled Password identity remains unprivileged and was not deleted implicitly.
- The current Convex function/schema bundle was pushed only to development deployment `perfect-greyhound-270`. Direct Admin and Assessment queries resolve. The public development catalogue returns one full form and four quick forms from the explicit dev-only original-bank seed.
- Public R2 returned `{ "ok": true }`; the custom domain serves reviewed derivatives. The separate confidential Assessment bucket remains deliberately unavailable rather than falling back to public storage.
- Four browser-native admin confirmations were replaced by one reusable async rounded-neobrutal modal shared with Assessment. A first browser run found a native-dialog Tab escape; focus containment was repaired and rerun clean.
- Real-phone LAN access had returned HTML while Next.js denied JavaScript chunks with HTTP 403. The exact-host development allowlist now includes detected LAN IPv4 addresses and optional validated hosts. Public and authenticated Admin touch traces pass at Pixel 7 and 320 px without failed Next assets.
- The Journal mobile archive now aligns metadata above a title-and-thumbnail row. The former 50.47 px disconnect is 12 px, and the title and image begin on the same horizontal line.
- Final static and behavior gates passed after the fixed-format revision: TypeScript, ESLint, 162 unit tests, 63 Convex tests, an effective 155 browser cases with 73 intentional project/credential skips, Convex development sync, and an isolated production build. The focused admin harness is Axe-clean at desktop, Pixel 7, and 320 px.
- Port 3987 remained live throughout the closeout and returned HTTP 200 for Home and Admin.

## 25 August public and Member baseline

The former photo-led implementation was rebuilt as **The Conversation Relay**. Light is the default, a saved dark choice applies before paint, language carries the identity, and documentary photographs serve as evidence. This section records the 25 August Member baseline; on 26 August the local showcase was replaced by a guarded 15-profile Convex development seed plus five managed divisions.

Delivered:

- Home, About, Activities, Members, Journal, Journal detail, Contact, loading, error, not-found, sitemap, robots, and generated Open Graph states.
- Sentence Playground, Prompt Mixer, Activity Relay, Journal Relay, Member Relay, theme control, mobile dialog, and an intent-preserving contact path.
- A generated faded homepage scene, a generated Member scene, and a deterministic SVG mark. Exact prompts and decisions are in `GENERATED-ASSET-LEDGER.md`.
- Heroicons 2.2.0 for interface symbols. Authored source contains no text glyph standing in for an icon.
- Convex Cloud for journal, contact, consent-gated Member profiles, and internal R2 signing and verification.
- A 15-profile fictional roster showcase across all five roles, with generated portraits, Heroicons, and complete subtype coverage. This was the 25 August baseline and was migrated to the target-locked Convex development seed on 26 August.
- Cloudflare R2 Standard for six cleared generated derivatives; documentary derivatives remain blocked by consent.
- Research, design, product, architecture, database, setup, cloud, and QA documents synchronized to that baseline implementation.

## Workflow gates

| Gate | Evidence | Status |
| --- | --- | --- |
| Reference evidence | All 19 reference PNGs and supplied media audited file by file | Complete |
| Creative research | Primary creative, editorial, cultural, people-directory, and W3C sources recorded with boundaries | Complete |
| Specification | PLAN, PRD, DESIGN, DESIGN-SYSTEM, BLUEPRINT, DATABASE, PRODUCT, and setup guides agree | Complete |
| Foundation | Next.js shell, tokens, theme boot, typed media path, cloud adapters, and R2 contract | Complete |
| Redesign | Seven public route forms plus global and route-specific interactions | Complete |
| Member extension | Numeric taxonomy, Convex table/query, route, true grid, 15-profile showcase, consent state, navigation, and generated media | Complete |
| Cloud integration | Existing Convex Cloud deployment selected; schema/functions pushed; R2 checked and six objects verified | Complete |
| Static verification | ESLint, TypeScript, 6 Vitest files / 23 tests, and production build | Complete |
| Browser verification | 75 cases: 69 passed, 6 intentional viewport-specific skips, 0 failed | Complete |
| Visual review | Fifteen light, dark, mobile, 320 px, selected-role, roster-detail, menu, Activity, and Journal files inspected | Complete |
| Repair and rerun | Initial visual, backend, pointer, motion, and seed findings fixed; full gates rerun | Complete |
| Admin CMS source integration | Auth boundary, role map, content/journal/Member/media/theme workspaces, and audit functions | Implemented; cloud owner round trip complete, real editor/publisher negative checks pending |
| Assessment source integration | Practice routes, Anonymous ownership, player/result, authoring, raw-result contract, and media split | Implemented; content/private-R2/release gates pending |
| Integrated release verification | Full static, backend, browser, accessibility, current Convex development functions, and public R2 evidence from current source | Complete; role matrix, private R2, reviewed content, retention, and production remain separate gates |

## Evidence and research

The redesign wave produced:

- `REDESIGN-REFERENCE-AUDIT.md`: all 19 supplied reference PNGs, including the exact duplicate.
- `CREATIVE-WEB-RESEARCH.md`: primary creative, editorial, cultural, and learning sites with transferable mechanics and rejected patterns.
- `REDESIGN-CODE-AUDIT.md`: the original photo count, repeated layouts, motion limits, focus issue, and bounded preservation plan.
- `REDESIGN-DIRECTION.md`: the consolidated rule, “words are the instrument; photographs are receipts.”

The Member wave produced:

- `MEMBER-EVIDENCE-AUDIT.md`: no verified roster or consent exists; generated people cannot be presented as members.
- `MEMBER-CREATIVE-RESEARCH.md`: official directory and interaction research with deterministic motion and privacy boundaries.
- `MEMBER-CODE-AUDIT.md`: schema, adapter, shell, responsive, accessibility, and test seams.
- `MEMBER-EXTENSION-DIRECTION.md`: the five-channel responsibility atlas and consent-gated roster contract.
- `MEMBER-SHOWCASE-DECISION.md`: the final 15-profile showcase request, evidence boundary, distribution, portrait grid, replacement rule, and verification.

## Implementation record

### Global system

- Replaced the old visual tokens with light and dark OKLCH semantic roles.
- Added a synchronous head script for saved theme state.
- Rebuilt the header, native-dialog mobile navigation, footer, focus states, skip link, and responsive frame.
- Added explicit dialog focus containment, Escape close, body lock, and focus return.
- Replaced layout-shifting padding transitions with transform-based child motion and preserved a global reduced-motion fallback.

### Signature interactions

- Sentence Playground renders a complete server default and exposes four keyboard-operable choices.
- Prompt Mixer uses authored combinations, stores no response, and announces changes politely.
- Activity Relay exposes four Heroicon-labelled buttons, arrow-key navigation, one selected companion, and restrained evidence media.
- Journal Relay keeps normal story links in source. On wide screens, an `IntersectionObserver` selects the story crossing a bounded reading line; focus and pointer activation remain explicit.
- Member Relay uses one native radio group. The five numeric codes classify responsibility and never imply rank, promotion, or authority.

### Member data and privacy

- Added the exact role codes 0 through 4 and code-owned valid divisions and positions.
- Added an additive Convex `members` table with public indexes, internal reviewed upsert, and cross-field validation.
- The public query requires `published` plus cleared profile consent and projects only safe fields.
- Portrait metadata crosses the public boundary only when separate photo consent is cleared.
- Historical 25 August state: Convex Cloud returned an empty public list and the route supplied a local showcase. Current state: the development deployment returns 15 fictional, seed-batch-labelled profiles and five managed divisions from Convex; production must remove this batch and use consent-cleared records only.

### Convex Cloud and R2

- Reconfigured the existing project to a Convex Cloud development deployment and stopped using a local backend for QA.
- Centralized server URL resolution on `CONVEX_URL`, retaining the previous public variable only as a compatibility fallback.
- Stored only the five S3 application variables in the selected Convex environment. The Cloudflare management token is not read by application code.
- Added internal Node actions for bucket connection, reviewed presigned PUT creation, and post-upload `HeadObject` verification.
- Added an operator helper that validates key, extension, MIME, size, and immutability; it never prints credentials or the signed URL.
- Uploaded and verified AVIF/WebP pairs for the homepage and Member generated scenes.
- Kept documentary derivatives local because their participant consent remains pending.

## Findings and repairs

| Finding | Repair | Final evidence |
| --- | --- | --- |
| Home identity depended on as many as 14 photographs | Replaced the photo-led hero and repeated rows with language-led interactions; retained selective proof images | Full homepage light/dark/mobile review |
| `Exchange` wrapped as `Exchang` and `e` | Restored normal word breaking, used container-relative type, and widened its composition | Selected Activity screenshot and E2E |
| Activity copy and media felt misaligned | Top-aligned media, changed the column ratio, and stacked below 880 px | Desktop, Pixel 7, and 320 px review |
| Journal image could stay stale while scrolling | Removed hover-driven state and used one desktop reading-line observer | Paired wheel screenshots and E2E |
| Journal sticky caption drifted below the list | Anchored it to the header and aligned grid columns | Desktop inspection |
| Mobile dialog leaked focus | Added first/last focus containment, synchronous initial focus, Escape close, and focus return | Mobile keyboard E2E |
| Contact signal copy missed contrast | Switched from translucent mixing to the complete semantic color | Axe clean in three projects |
| Member role labels intercepted clicks | Expanded each transparent native radio over its complete label | Pointer and keyboard E2E |
| Current Convex CLI wrote `CONVEX_URL` | Added one server-only resolver and updated every server adapter | Journal, Member, and contact cloud paths |
| Cloud Journal started empty | Ran the idempotent three-post seed on the selected deployment | Journal route, detail, sitemap, and E2E |
| Upload fetch could throw with request context | Added a generic catch that never prints the signed URL | Static gate and source review |
| Roster opacity stagger temporarily weakened contrast | Removed opacity from row motion, kept a small transform handoff, and reset delay under reduced motion | Axe clean in all three projects |
| Stale `next dev` occupied the QA port | Stopped the process and reran against `next start` with local byte-identical media | Full browser gate and serial screenshot retakes passed |

## 25 August verification snapshot

- `npm run check` with remote public media disabled for byte-identical QA: ESLint passed, TypeScript passed, 6 Vitest files / 23 tests passed, and Next.js production build passed.
- `npm run test:e2e`: 75 cases, 69 passed, 6 intentional viewport-specific skips, 0 failed.
- Axe: no detectable WCAG A or AA violations on Home, Members, Journal, Journal detail, or Contact in the exercised projects.
- Convex Cloud: the journal seed and queries passed, contact E2E persisted consented enquiries, and the Member query returned a valid empty array; unit and E2E checks prove the preview stays outside Convex.
- R2: `HeadBucket` returned `{ "ok": true }`; six generated derivatives passed `HeadObject`; existing keys were rejected.
- Public generated media resolved through `https://r2.mukhtada.my.id`; DNS, TLS, Cloudflare cache, three representative object reads, production build embedding, and two remote-media browser tests passed.
- Visual evidence: fifteen final production screenshots inspected, including seven Member views and the two repaired Journal reading-line states.

These numbers predate the complete Admin and Assessment source integration. They remain valid evidence for the public/Member baseline only and must not be presented as a green current-release run.

## Handoff and release boundary

The integrated source is present. Public production release still requires:

- written consent for every public Member profile and participant photograph;
- canonical site domain; the custom R2 media domain is already active;
- production Convex deployment variables and a production R2 connection check;
- production Convex Auth keys, exact `SITE_URL`, and a real owner/role permission round trip;
- the separate private Assessment bucket, credentials, exact CORS, and checksum/derivative verification;
- original Assessment questions plus all required current-revision approvals;
- upload of any newly cleared derivatives under immutable versioned keys;
- verified legal organisation name, retention period, public contact, and social links intended for publication;
- post-deployment form, administration, Practice ownership/result, accessibility, media, metadata, cache, and responsive smoke tests.

Raw participant/photo/audio masters are local consent-gated inputs and are intentionally excluded from Git. A fresh clone contains only reviewed public derivatives and evidence intended for the repository; it must not be treated as a source-media archive.

No public production deployment was performed.

## 26 August 2026 — Question Bank authoring and illustrated Live Session

- Added a real Add Question path to the protected Question Bank. It writes a source item, private answer key, and paused bank entry to Convex with request-id and content-fingerprint guards.
- Reused the grouped Select contract so task families are visibly separated by skill and invalid cross-skill values are rejected again on the server.
- Added optional Question illustration selection and direct reviewed R2 upload. Text-only questions remain first-class and do not render an empty attachment region.
- Pinned the selected illustration media ID in the random attempt manifest and projected only ready public image records into Live Session.
- Seeded one illustrated Reading question through the real admin interface on the development deployment. The bank now contains 146 records, with 121 eligible for full practice and a Reading capacity of 51 for a quota of 50.
- Browser verification exercised Add Question at desktop, Pixel 7, and 320 px, then waited for the illustrated question to appear through the random public bank draw at the same widths.
- A narrow rapid-navigation run exposed a stale attempt-revision race. The client now carries the revision returned by each move mutation instead of waiting only for the reactive query, and a focused regression test covers two immediate Next actions.
- One duplicate media ledger row created during a failed idempotency test was archived. The selected R2 object remains ready and attached; the public attempt continued to resolve it.

## 26 August 2026 — Final integrated development release

- Closed the reported legacy Journal edit failure: published Markdown records now open with their title, standfirst, body, and existing cover, while the first explicit save creates revision 1.
- Replaced the boxed Journal body form with a page-like block editor, per-block toolbox, explicit featured-image control, reviewed inline image/map blocks, and reversible Archive/Restore lifecycle.
- Reproduced the Journal image failure as a Cloudflare R2 CORS 403. The current upload path uses a constrained same-origin streaming relay, preserves Convex HEAD verification, reloads the custom-domain image after save, and leaves no active QA media.
- Added independent Page Copy rail/editor scrolling, a touch-friendly field picker, managed Member divisions, coordinator assignment, reusable filters, and the guarded 15-profile development seed.
- Froze the human owner credential and moved automation to a separate ignored QA owner. Normal login, session refresh, and deployment do not rotate Password credentials.
- The final integrated gate passes TypeScript, ESLint, 226 Vitest tests, and an effective 173 Playwright cases with 55 intentional project-specific skips. The full browser run's only miss was a Contact server-action response crossing its former five-second wait; the bounded 20-second repair passed at all three viewports. Two isolated builds generate all current routes.
- The Playwright development worker count is bounded at three because eight fully parallel workers saturated one reused `next dev` process; no application behavior changed.
- Port 3987 remained available throughout the final run. No public production deployment was performed.
