# English Club Work Log

Updated: 26 August 2026
Status: Admin CMS and Assessment Lab integrated and synced to Convex development cloud; private media, real-owner, content-review, and production gates remain open

This log records the research, redesign, Member extension, cloud integration, Admin CMS, Assessment Lab, repairs, and verification. Product requirements live in the root documents. File-level evidence lives in the audit ledgers. `QA-REPORT.md` now separates the current 26 August integrated release run from the retained 25 August public-site baseline.

## 26 August integration record

The repository now contains two major product lanes beyond the public organisation profile.

### Protected Admin CMS

- Convex Auth provides Password identities for administrators. The Next.js server resolves the deployment from `CONVEX_URL` and passes it to the scoped provider; a duplicated `NEXT_PUBLIC_CONVEX_URL` is not required.
- Auth identity creation and CMS authorization are separate. The controlled first identity exposes its complete `tokenIdentifier`; a one-time internal `adminUsers:bootstrapOwner` call creates the first active owner only while the table is empty.
- Production account creation is disabled unless `ADMIN_BOOTSTRAP_ACCOUNT_CREATION=1` opens a supervised bootstrap window. An identity with no active `adminUsers` row receives no protected data.
- Server-owned roles are `editor`, `publisher`, and `owner`. Publishers can publish general content and review/publish Assessments but cannot author Assessment questions; owners also manage administrators.
- The workspace contains Overview, Pages, Journal, Assessments, Members, Media, Appearance, and Activity. It uses a rounded semi-neobrutal register with reusable custom selects, dialogs, pagination, status chips, and short supporting motion.
- Page copy keeps code-owned keys/component structure and supports at most 200 entries per page/locale. Convex rejects entry 201 and detects an already-invalid 201-row page.
- Journal editing stores validated Tiptap JSON plus plain text, supports reviewed cover/inline media and structured map data, and limits one revision to 40 unique inline images.
- Appearance publishes seven semantic anchors per light/dark scheme as one validated immutable snapshot. Public state advances through one pointer; rollback records a new event.

### English Club Assessment Lab

- Public routes now cover `/practice`, full practice, three quick-skill briefings, owned attempt, and owned result. Public navigation calls the area `Practice`.
- Full practice follows the product's original ITP Level 1-aligned shape: Listening 50/35 minutes, Structure & Written Expression 40/25 minutes, and Reading 50/55 minutes. The product makes no ETS affiliation, equivalence, official score, predicted score, CEFR, certificate, placement, or admission claim.
- The Home programme quiz has four local questions grounded in Activities copy and creates no identity. Persisted practice creates/reuses Anonymous Convex Auth only after Start.
- Every attempt is bound to `identity.tokenIdentifier`. `resolveMine` normalizes a string route ID before typed lookup and gives malformed, missing, and cross-owner IDs the same unavailable result.
- Player projections omit answer keys. Submission is allowed only from the final eligible section. Results report raw correct, possible, and omitted counts with section/time/mode context; answer review is cursor-paginated at 20.
- The authoring backend separates definitions, immutable versions, validation/provenance checks, four approval types, sections, stimuli, items, answer keys, attempts, responses, and immutable result revisions.
- Public Assessment media must be explicit `public`, ready, correct-purpose, same-version media. Confidential sources require a separate private R2 bucket, distinct credentials, checksum verification, and publisher-only public derivative.

### Integration gates still open

- A real non-production Password identity → token identifier → one-time owner bootstrap → sign-in/role/audit round trip has not yet been recorded as a complete integrated gate.
- Original Assessment content must pass the current validation/provenance check plus all four current-revision academic, rights, accessibility, and bias approvals before a public version exists. The honest unavailable state remains valid until then.
- The private Assessment R2 bucket is **not configured**. Its exact CORS, SHA-256 PUT/`HeadObject`, 180-second preview, and public derivative path remain unverified.
- Production retention periods for contact, attempts/results, audit events, and private media remain an organizational decision.

### 26 August release closeout

- The missing `adminUsers:bootstrapState` runtime contract was removed from the client and backend surface, generated bindings were refreshed, and `/admin` returned HTTP 200 without console or page errors.
- The current Convex function/schema bundle was pushed only to development deployment `perfect-greyhound-270`. Direct Admin and Assessment queries resolve, while the public Assessment catalogue honestly returns no entries until a reviewed version publishes.
- Public R2 returned `{ "ok": true }`; the custom domain serves reviewed derivatives. The separate confidential Assessment bucket remains deliberately unavailable rather than falling back to public storage.
- Four browser-native admin confirmations were replaced by one reusable async rounded-neobrutal modal shared with Assessment. A first browser run found a native-dialog Tab escape; focus containment was repaired and rerun clean.
- Final static and behavior gates passed: TypeScript, ESLint, 140 unit tests, 39 Convex tests, 142 browser cases with 20 intentional skips, Convex codegen/type validation, zero dependency vulnerabilities, and an isolated 30-route production build.
- Port 3987 remained live throughout the closeout and returned HTTP 200 for Home and Admin.

## 25 August public and Member baseline

The former photo-led implementation was rebuilt as **The Conversation Relay**. Light is the default, a saved dark choice applies before paint, language carries the identity, and documentary photographs serve as evidence. The Member extension uses **The Member Relay**: five equal responsibility channels, one deterministic selector, a role companion, and a 15-profile source-only showcase that yields completely to real consented records.

Delivered:

- Home, About, Activities, Members, Journal, Journal detail, Contact, loading, error, not-found, sitemap, robots, and generated Open Graph states.
- Sentence Playground, Prompt Mixer, Activity Relay, Journal Relay, Member Relay, theme control, mobile dialog, and an intent-preserving contact path.
- A generated faded homepage scene, a generated Member scene, and a deterministic SVG mark. Exact prompts and decisions are in `GENERATED-ASSET-LEDGER.md`.
- Heroicons 2.2.0 for interface symbols. Authored source contains no text glyph standing in for an icon.
- Convex Cloud for journal, contact, consent-gated Member profiles, and internal R2 signing and verification.
- A 15-profile fictional roster showcase across all five roles, with generated portraits, Heroicons, complete subtype coverage, and no Convex writes.
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
| Admin CMS source integration | Auth boundary, role map, content/journal/Member/media/theme workspaces, and audit functions | Implemented; cloud owner round trip pending |
| Assessment source integration | Practice routes, Anonymous ownership, player/result, authoring, raw-result contract, and media split | Implemented; content/private-R2/release gates pending |
| Integrated release verification | Full static, backend, browser, accessibility, current Convex development functions, and public R2 evidence from current source | Complete; real owner, private R2, reviewed content, retention, and production remain separate gates |

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
- Convex Cloud currently returns an empty public list. The route responds with 15 fictional source-only profiles in a true grid. Generated faces, names, and biographies never enter Convex and disappear when any real profile publishes.

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
