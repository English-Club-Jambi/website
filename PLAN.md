# Delivery Plan

Last updated: 26 August 2026
Current phase: integrated development release verified; production-only gates remain

## Outcome

Deliver a production-ready English Club organisation profile, landing page, journal, Member directory, Assessment Lab, and protected administration workspace in Next.js. The public experience is clean and bright by default, supports a persistent dark theme, and uses language-led interaction rather than image-led templates.

Convex remains the application database and authorization boundary. Cloudflare R2 Standard stores reviewed public derivatives; confidential Assessment source media requires a separate private R2 bucket. The private Assessment bucket is not configured, so confidential upload and production Assessment release remain blocked. The explicit development seed remains available only for flow testing. The implementation must retain factual restraint, privacy controls, accessibility, and test evidence.

## Current design decision

- North star: **The Conversation Relay**.
- Homepage interaction: **Sentence Playground**.
- Core rule: words are the instrument; photographs are receipts.
- Redesign mode: visual overhaul with route, SEO, backend, form, and media contracts preserved.
- Design dials: variance 8, motion 6, density 4.
- Member extension: **The Member Relay**, a five-channel role atlas plus a consent-gated public roster.
- Assessment extension: **The Answer Line**, a calm ruled practice surface with explicit timing, save, transcript, section, and result states.
- Administration: rounded operational neobrutalism with compact hard edges, short shadows, restrained motion, and no decorative dashboard-card grid.
- Theme publishing: administrators edit seven structured colour anchors for both public modes; Convex derives, validates, versions, publishes, and rolls back the complete semantic palette.

## Deliverables

### Research and specification

- [x] Inventory all 19 reference PNG files and identify the exact duplicate.
- [x] Inventory all supplied photos and video, including consent and metadata risks.
- [x] Audit the existing route, component, Convex, R2, SEO, and test contracts.
- [x] Research current primary creative, editorial, cultural, and learning websites.
- [x] Store file-level reference evidence in `docs/REDESIGN-REFERENCE-AUDIT.md`.
- [x] Store live-site research in `docs/CREATIVE-WEB-RESEARCH.md`.
- [x] Store implementation findings in `docs/REDESIGN-CODE-AUDIT.md`.
- [x] Store the consolidated decision in `docs/REDESIGN-DIRECTION.md`.
- [x] Update `DESIGN.md` and `DESIGN-SYSTEM.md`.
- [x] Synchronise `PRD.md`, `BLUEPRINT.md`, `DATABASE.md`, and setup guides.
- [x] Update `docs/WORKLOG.md` and `docs/QA-REPORT.md` with the redesign result.

### Application

- [x] Add pre-paint persistent light or dark theme selection.
- [x] Rebuild the global header, mobile navigation, and footer.
- [x] Replace the photo-split home hero with Sentence Playground.
- [x] Add the bounded Prompt Mixer.
- [x] Replace repeated activity rows with Activity Relay.
- [x] Recompose About around principles and one optional proof image.
- [x] Recompose Activities around selectable prompts and one active image.
- [x] Recompose Journal around typographic story selection and companion preview.
- [x] Restyle Journal detail while preserving Markdown and metadata.
- [x] Restyle Contact while preserving field order, validation, focus, and Convex persistence.
- [x] Retire obsolete image-gallery, repeated masthead, card-like, and route-close selectors.
- [x] Keep fixed brand/documentary images on the typed source manifest and dynamic Journal, Member, CMS, and Assessment media on reviewed Convex projections; both paths resolve only approved local-QA or R2 objects.

### Verification

- [x] ESLint passes.
- [x] TypeScript passes with no emit.
- [x] Unit and Convex backend tests pass.
- [x] Production build passes.
- [x] Every public route returns and exposes its expected `h1`.
- [x] No route overflows at 320px, Pixel 7, or desktop.
- [x] Sentence, prompt, activity, theme, and mobile menu keyboard tests pass.
- [x] Contact persists a valid consented enquiry to the selected Convex Cloud development deployment.
- [x] Axe finds no representative WCAG A or AA violations.
- [x] Reduced-motion behavior is verified.
- [x] Desktop light, desktop dark, mobile, and selected-state screenshots are captured.
- [x] Screenshots are manually inspected, defects repaired, and affected gates rerun.
- [x] Impeccable detector reports no unwaived authored-source findings.

### Member extension

- [x] Audit local roster evidence, role ambiguity, consent, and member-photo boundaries.
- [x] Research current official people directories and W3C interaction guidance.
- [x] Audit route, shell, Convex, R2, and test integration seams.
- [x] Store the extension contract in `docs/MEMBER-EXTENSION-DIRECTION.md`.
- [x] Add the numeric `0` through `4` role taxonomy and cross-field validation.
- [x] Add the Convex `members` table, internal reviewed upsert, and public consent-gated query.
- [x] Add the `/members` route, generated atmospheric hero, interactive role channels, and honest roster states.
- [x] Add Members to desktop/mobile navigation, footer, sitemap, metadata, and setup guides.
- [x] Add unit, Convex, route, Axe, motion, theme, responsive, and visual tests.
- [x] Inspect desktop light, desktop dark, selected-role, phone, 320 px, and 900 px evidence.
- [x] Run the complete release gate and update `docs/WORKLOG.md` plus `docs/QA-REPORT.md`.

### Convex Cloud and R2 integration

- [x] Select the existing Convex Cloud development deployment and stop relying on a local backend.
- [x] Push the additive schema, journal, contact, Member, and internal R2 functions.
- [x] Copy the five required public-bucket S3 variables to the selected Convex deployment. The separate private Assessment credentials remain an open gate below.
- [x] Verify the bucket with `HeadBucket` from the Convex Node runtime.
- [x] Add a private operator flow for short-lived presigned PUT uploads and `HeadObject` verification.
- [x] Upload and verify six cleared generated derivatives without exposing credentials or signed URLs.
- [x] Reject existing object keys so public assets remain immutable.
- [x] Seed and query the development cloud Journal, 15 fictional Member profiles, and five managed divisions through their real Convex contracts; keep the seed batch excluded from production.

### Member organisation showcase

- [x] Record the development-only fictional roster and unchanged real-profile consent boundary in `docs/MEMBER-SHOWCASE-DECISION.md`.
- [x] Add 15 fictional identities across all five role codes to the guarded, idempotent Convex development seed.
- [x] Cover all five Coordinator divisions, all four Core positions, and both Board positions.
- [x] Generate a 16-cell portrait sheet, use 15 unique cells, and upload AVIF/WebP derivatives to R2.
- [x] Replace the long roster rows with a true 5/4/3/2-column CSS contact sheet.
- [x] Remove public QA, fixture, database, and placeholder language from the organisation profile.
- [x] Label the development records by seed batch, retain an honest unavailable backend state, and require production to contain only consent-cleared records.
- [x] Add unit and browser assertions for identity uniqueness, role filtering, assignment validity, grid columns, and public copy.
- [x] Run the complete static, browser, Axe, reduced-motion, and visual release gate after the grid change.

### Administration CMS

- [x] Add Convex Auth Password identities and a server-owned `adminUsers` allowlist.
- [x] Remove browser account creation and provision Password identity plus authorization through one internal operator action.
- [x] Add stable Auth-account binding, guarded placeholder recovery, and the owner/editor/publisher permission map.
- [x] Build the protected `/admin` shell, Pages, Journal, Contact desk, Members, Media, Appearance, Assessments, and Activity workspaces.
- [x] Connect the three public Contact intents to a private admin Contact desk with separate queues, bounded pagination, explicit work status, email handoff, optimistic concurrency, and PII-safe audit events.
- [x] Replace code-only journal maintenance with immutable structured revisions, reviewed covers/inline media, safe coordinate map nodes, publish, archive, and cursor pagination.
- [x] Add the public-copy manifest and Convex draft/published version flow with a hard ceiling of 200 entries per page and locale.
- [x] Add reviewed media upload through a validated same-origin streaming relay, Convex metadata verification, immutable object keys, and the `r2.mukhtada.my.id` public read projection.
- [x] Add structured public theme drafts, server-side OKLCH derivation and contrast validation, immutable versions, atomic publish/rollback pointers, and a checked-in fallback.
- [x] Keep admin symbols on Heroicons, controls at least 44px, dialogs focus-contained, and motion reduced under `prefers-reduced-motion`.
- [x] Complete a real internal owner provisioning, sign-in, sign-out, and second-session round trip on the announced non-production cloud deployment.

### Assessment Lab

- [x] Publish the canonical `/practice` route family under the English Club Assessment Lab name.
- [x] Implement reviewed catalog reads, one three-section paper full form and three quick-quiz briefings, an owned attempt runner, exact-result report with bounded optional estimates, and paginated post-submit review.
- [x] Keep the Home programme quiz local and derive its questions from reviewed Programs wording; it creates no visitor identity or Convex attempt.
- [x] Add Anonymous Convex Auth only after the visitor presses Start on a persisted assessment.
- [x] Derive participant ownership from server auth, normalize route IDs before typed access, and return the same unavailable state for malformed, missing, and cross-owner IDs.
- [x] Keep answer keys, explanations, provenance, draft media, admin IDs, and scoring authority out of pre-submit public payloads.
- [x] Implement per-section deadlines, revision conflicts, idempotent Start/Submit, transcript-supported mode, owned deletion, and bounded result snapshots.
- [x] Preserve exact correct, possible, omitted, and practice-point values with time and mode labels; keep the fixed-linear paper estimate from 310 to 677 non-official and unusable as a proficiency credential or admission evidence.
- [x] Add the opt-in Full Practice result-email path: one server-validated delivery request, summary and section detail, a narrowly worded completion record, and a 30-day private review grant. Quick Practice remains outside this path.
- [x] Require Cloudflare Turnstile for every new send, verify the exact action and hostname server-side, then apply indexed per-attempt, per-recipient-digest, and global limits before Brevo is called.
- [x] Rate-limit Turnstile Siteverify before the provider call with bounded owner/global verification events, then remove those events after 24 hours through the existing daily cleanup.
- [x] Keep the emailed access token in a URL fragment, scrub it before redemption, issue only hashed 30-minute review sessions, and fail closed after five total grant redemptions.
- [ ] Configure the verified Brevo REST sender/domain, dedicated recipient-hash key, production Turnstile widget, and approved Convex/Vercel environment values. In Brevo, prove anonymous Transactional Email tracking or enabled per-contact consent handling for the payload's `false` value, set approved log retention, and select `Never store previews`. Then verify the attachment, JSON idempotency UUID, provider acceptance, 30-day link expiry, 30-minute session expiry, and 180-day delivery-record cleanup with an operator-owned mailbox.
- [x] Add assessment authoring, current-revision validation, academic/rights/accessibility/bias approvals, immutable publication, safe reorder/delete, and bounded next-draft cloning.
- [x] Lock the four active Practice Formats as an internally installed catalogue: one 50/40/50 paper form plus Listening, Structure, and Reading quick forms. Retire rather than delete the earlier four-skill catalogue.
- [x] Add versioned per-format Question Bank allow/disable rules, fixed skill quotas, structured random draws pinned at Start, shortage validation, and privacy-safe aggregate flag review.
- [x] Add real Question Bank authoring with idempotent Convex writes, private answer keys, duplicate fingerprints, skill-grouped task families, and a paused-by-default review state.
- [x] Add a development-locked Reading dataset importer that preserves passage relationships, rejects incomplete source choices, writes private answer keys, and keeps every unlicensed source record paused until editorial and rights review.
- [x] Add optional Question illustration selection/direct R2 upload, validate the media contract server-side, pin its ID in each random attempt manifest, and render it accessibly in Live Session.
- [x] Add a separate private-source/public-derivative media contract and a UI configuration gate.
- [ ] Create and configure the separate private Assessment R2 bucket, apply exact-origin CORS, and prove checksum-aware PUT, preview, verification, and public derivative delivery against Cloudflare.
- [ ] Publish a real assessment only after original content, rights, academic, accessibility, and bias approvals are complete.

### Integrated release gate

- [x] Remove the stale `adminUsers:bootstrapState` call and every browser setup choice; `/admin` is sign-in only.
- [x] Use server-side `CONVEX_URL` for Next adapters and pass the resolved deployment URL into scoped browser providers. `NEXT_PUBLIC_CONVEX_URL` is not required.
- [x] Preserve port `3987` while running focused admin, public mobile, journal, and Practice checks.
- [x] Push the final integrated Convex schema/functions to the announced development deployment after all lanes are stable.
- [x] Run the final integrated lint, typecheck, unit, backend, production-build, Playwright, Axe, reduced-motion, responsive, and screenshot gates.
- [ ] Run a secret scan and commit only reviewed source and documentation.

## Working rules

1. Evidence precedes implementation. Every supplied reference remains traceable.
2. Unknown claims stay absent. Fictional identities are allowed only in the guarded development seed and never in production; metrics, dates, partners, testimonials, schedules, outcomes, and real-member claims are not invented.
3. Language leads the identity. A route must remain visually finished without optional media.
4. Motion must communicate hierarchy, handoff, feedback, or state change.
5. Client code stays inside discrete interactive leaves. Server HTML carries core content and links.
6. The default is bright. Theme selection changes the complete document and is saved locally.
7. Every control works with keyboard, pointer, touch, and reduced motion.
8. Each verification gate runs explicitly and leaves evidence.
9. Production media remains blocked until consent is cleared, regardless of local preview quality.
10. Every admin capability rechecks the signed identity and permission inside Convex; route visibility is never authority.
11. Assessment results describe original English Club practice only. Fixed-form estimates cannot be relabelled as an official score, predicted TOEFL score, calibrated equivalent, proficiency credential, or admission evidence. A Full Practice completion record may state only that one English Club form was completed and must retain that boundary; legacy raw results retain their separate raw-only disclaimer.
12. Public R2 media and confidential Assessment sources use separate access boundaries. Missing private configuration blocks the write before a reservation row is created.

## Workflow

### Gate A: Evidence

- [x] Read the product and factual boundaries.
- [x] Review the reference contact sheet and each original file.
- [x] Re-audit all supplied references after the brief changed.
- [x] Audit current visual repetition, image count, interaction, and focus behavior.
- [x] Browse primary creative websites rather than copy a design gallery.

Exit condition: local evidence, external evidence, and rejected patterns are written down. **Met.**

### Gate B: Design contract

- [x] Choose the creative north star.
- [x] Define the homepage interaction sequence.
- [x] Define light and dark semantic palettes.
- [x] Set typography, shape, spacing, motion, and photo limits.
- [x] Define route signatures and interactive component boundaries.
- [x] Write the anti-slop rejection list.
- [x] Cross-read all root documents for naming, token, route, and backend agreement.

Exit condition: code can proceed without a visual or architectural choice being invented mid-build.

### Gate C: Global foundation

- [x] Replace global visual tokens and base CSS.
- [x] Add pre-paint theme script and theme toggle.
- [x] Rebuild navigation and fix focus isolation.
- [x] Keep skip link, main focus target, metadata, font loading, and page frame.
- [x] Confirm both themes meet contrast requirements.

Exit condition: one route renders the new shell without flash, overflow, or keyboard regressions.

### Gate D: Signature interactions

- [x] Build Sentence Playground with complete server HTML.
- [x] Build Prompt Mixer with authored combinations and polite announcements.
- [x] Build Activity Relay with `aria-pressed`, arrow keys, and one active image.
- [x] Build Journal Relay with link-first content and optional preview.
- [x] Add unit tests for data and interaction state where useful.

Exit condition: every interaction has keyboard, touch, reduced-motion, and no-JavaScript behavior.

### Gate E: Route recomposition

- [x] Home.
- [x] About.
- [x] Activities.
- [x] Journal index.
- [x] Journal detail.
- [x] Contact.
- [x] Loading, error, not-found, Open Graph image, and footer.

Exit condition: all routes have distinct first moments but one coherent system.

### Gate F: Static and backend verification

- [x] `npm run lint`.
- [x] `npm run typecheck`.
- [x] `npm run test:unit`.
- [x] `npm run test:backend`.
- [x] `npm run build`.
- [x] Convex Cloud seed, journal, Member, contact, and R2 paths remain operational.

Exit condition: source, types, backend contracts, and production output pass.

### Gate G: Browser and visual verification

- [x] Route contract at desktop, Pixel 7, and 320px.
- [x] Mobile menu focus isolation and focus return.
- [x] Theme persistence.
- [x] Signature-interaction keyboard tests.
- [x] Contact success focus and persistence.
- [x] Axe representative scans.
- [x] Reduced-motion checks.
- [x] Evidence screenshots.
- [x] Manual crop, spacing, hierarchy, overflow, focus, and anti-slop review.
- [x] Repair and rerun.

Exit condition: screenshots and machine checks agree that the final experience is usable and visually intentional.

### Gate H: Admin CMS

- [x] Add the auth provider, internal provisioning action, stable allowlist binding, and permission checks.
- [x] Add reusable admin shell, custom form controls, structured journal editor, media flow, public-copy editor, theme editor, and assessment workspace.
- [x] Validate admin layout at desktop, Pixel 7, and 320px through focused tests and an authenticated data-isolated visual harness.
- [x] Exercise internal identity provisioning, owner binding, sign-in, sign-out, and second-session access against the selected cloud deployment.
- [ ] Verify editor and publisher negative permissions with real cloud identities; the isolated authorization matrix is already green.

Exit condition: a real owner can sign in and manage reviewed content without any browser-supplied value becoming authorization.

### Gate I: Assessment vertical slice

- [x] Add the additive assessment schema, bounded APIs, Anonymous Auth ownership, original-content publication gates, legacy raw-result compatibility, and the separate fixed-form estimate contract.
- [x] Build `/practice`, full/quick briefings, runner, result review, Home programme quiz, and the assessment authoring workspace.
- [x] Verify malformed/cross-owner IDs, key privacy, section lifecycle, transcript persistence, deletion, publication approvals, clone recovery, and media relationship guards in isolated tests.
- [ ] Configure and smoke-test the private Assessment R2 bucket without falling back to the public bucket.
- [x] Supply a typed original development bank and prove one complete paper form plus three quick flows without treating the seed as production approval.
- [ ] Move any production candidate through current validation/provenance plus academic, rights, accessibility, and bias approvals.

Exit condition: the technical path is proven and every content, rights, retention, and private-media gate is explicit.

### Gate J: Integrated certification

- [x] Generate Convex types and push the final schema/functions to the announced cloud development deployment.
- [x] Run every static and browser gate on the combined public, admin, journal, Member, theme, and Assessment surfaces.
- [x] Inspect desktop, phone, 320px, light, dark, reduced-motion, admin, Practice, and unavailable/configuration-gate screenshots.
- [x] Reconcile `docs/QA-REPORT.md`, `docs/WORKLOG.md`, and `docs/INTEGRATION-REVIEW.md` with the final command output.

Exit condition: source, cloud behavior, documents, and evidence describe the same release state.

## Risks

| Risk | Likelihood | Impact | Control |
| --- | --- | --- | --- |
| Interaction hides server content | Medium | High | Complete SSR default; client state changes presentation only |
| Theme flashes on load | Medium | Medium | Inline pre-paint storage script and deterministic tests |
| Experimental type overflows phones | Medium | High | Fluid type bounds plus 320px route assertions |
| Mobile menu traps or leaks focus | Medium | High | Real dialog focus loop or non-modal disclosure, browser test |
| Motion creates discomfort | Low | High | User-controlled motion and global reduced-motion fallback |
| Photos regain visual dominance | Medium | Medium | The generated hero layer is decorative, heavily faded, replaceable, and capped alongside route-level image budgets |
| Pending consent reaches production | Low | High | Typed consent state, upload checklist, and release blocker |
| R2 free-tier overage | Low | Medium | Standard storage, custom-domain caching, monthly metrics review |
| Invalid role and subtype reaches the directory | Low | High | Internal cross-field guard plus projection-boundary validation |
| Unconsented profile or portrait reaches production | Low | High | Indexed profile-consent gate and a separate portrait-consent gate |
| New navigation link crowds tablet widths | Medium | Medium | Explicit 880, 900, 1024, and 1440 px shell checks |
| Backend extension regresses existing data | Low | Medium | Additive member table, generated types, Convex push, and complete backend regression suite |
| Browser account creation is mistaken for authorization | Low | High | No browser sign-up, internal account-and-role provisioning, stable server binding, and permission checks |
| An assessment draft leaks through the public R2 bucket | Medium until configured | High | Separate private bucket and credentials; confidential reservation and upload controls stay blocked when absent |
| Practice wording implies an official score | Medium until copy review | High | Exact bank outcomes, model-specific disclaimers, no predicted-TOEFL claim, and an explicit warning that the linear/rule-based estimate is uncalibrated |
| Anonymous attempts outlive the promised retention period | Medium | High | Do not promise automatic deletion; approve and test cleanup before public launch |
| Public result-email action is abused or sends from an unauthenticated domain | Medium | High | Verify Brevo sender/domain, keep the dedicated digest key server-only, require exact-host Turnstile validation, and retain bounded per-attempt, recipient-digest, and global limits |
| A provider timeout causes a duplicate result email | Medium | Medium | Keep the same Brevo JSON idempotency UUID for the exact retry, record the outcome as `uncertain`, and require the learner to request a separate copy instead of retrying automatically |
| CMS page growth truncates Practice copy | Low | Medium | Indexed read of 201, explicit failure above 200, and refusal to create a 201st entry |

## Release boundaries

Code completion does not authorise public deployment. Release still requires:

- cleared consent for every public participant image;
- canonical public site domain and a production recheck of the already-active `r2.mukhtada.my.id` media domain;
- verified organisation details that are currently omitted;
- versioned derivative upload to Cloudflare R2;
- production Convex deployment variables;
- separate production Convex Auth signing keys and exact `SITE_URL`;
- a tested first-owner provisioning policy and recovery owner;
- a separate private Assessment R2 bucket with least-privilege credentials and exact CORS;
- approved retention and anonymous-auth cleanup behavior;
- original reviewed Assessment content with current academic, rights, accessibility, and bias approvals;
- post-deployment accessibility, form, media, and metadata smoke tests.
