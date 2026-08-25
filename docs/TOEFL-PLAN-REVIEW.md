# Assessment Lab Plan Review

- Review date: 25 August 2026
- Scope: product research, detailed delivery plan, technical architecture, root planning documents, current Next.js route tree, Convex schema/auth/validators, and R2 boundary
- Verdict: ready for an internal synthetic vertical slice after the corrections in this review; not ready for public assessment content or trademark-led navigation
- Severity terms: P0 blocks implementation or release integrity; P1 must be resolved before real learner data or public launch; P2 is a quality and maintainability correction

## 1. Canonical MVP contract

The three planning documents now share one implementation contract.

| Area | Decision |
| --- | --- |
| Product | `English Club Assessment Lab` |
| Public route | `/practice`; no trademark in a route slug or product name |
| Informational label | `TOEFL® test preparation` only after trademark review |
| Full form | Original ITP Level 1-aligned practice: 50 Listening, 40 Structure & Written Expression, 50 Reading |
| Standard timing | Per section: 35, 25, and 55 minutes |
| Result | Raw correct/possible/omitted counts, percentage, time, and review; no official scale, CEFR, prediction, certificate, or admissions claim |
| Quick language quizzes | Listening, Structure & Written Expression, and Reading |
| Productive Writing | Outside the MVP runtime and objective result |
| Home quiz | 4–6 reviewed English Club programme-fact questions; local state and no visitor identity |
| Stored learner identity | Invisible Convex Auth Anonymous sign-in on Start; ownership from server-derived identity |
| Published audio | Public immutable derivative on `r2.mukhtada.my.id` |
| Unpublished media | Private R2 draft/source objects with authorised short-lived admin preview |
| Physical backend | Exact tables and indexes in the technical architecture, not the logical aliases in the delivery plan |

## 2. Evidence reviewed

### Repository evidence

- Next.js is `16.3.2`, Convex is `1.45.0`, and `@convex-dev/auth` is `0.0.95`.
- The current app already separates public routes under `src/app/(site)` and admin routes under `src/app/(admin)/admin`. Assessment routes do not yet exist.
- The current Convex schema has journal, member, contact, admin, CMS, media, and theme tables. It has no assessment tables yet.
- The current auth configuration enables Password only. The installed Convex Auth package includes an Anonymous provider, but it has not been wired or exercised in this app.
- Existing admin validators do not yet include assessment permissions, audit area, or review actions.
- The rate-limiter component proposed by the plan is not installed. The implementation must either add it deliberately or ship a bounded in-app alternative with tests; prose alone does not rate-limit a public mutation.

### Primary-source verification

- ETS describes ITP Level 1 as 50 Listening, 40 Structure and Written Expression, and 50 Reading questions with 35, 25, and 55 minute limits. This supports the selected structure but does not license copying ETS items. [ETS TOEFL ITP Test Taker Handbook](https://www.ets.org/content/dam/ets-org/pdfs/toefl-itp-test-taker-handbook.pdf)
- ETS describes Structure and Written Expression as recognition work, not an authored essay. [ETS TOEFL ITP test content](https://www.ets.org/toefl/itp/test-content.html)
- ETS converts raw correct-answer counts to official scaled scores. A locally authored, uncalibrated bank has no basis for that conversion. [ETS TOEFL ITP scoring](https://www.ets.org/toefl/itp/scoring.html)
- The current iBT contract has four skills, adaptive Reading/Listening, and a 1–6 scale. A three-section club form cannot be represented as a complete current iBT assessment. [ETS current iBT content and structure](https://www.ets.org/content/ets-org/language-master/in/home/toefl/institutions/ibt/about/content-structure.html), [ETS score guide](https://www.ets.org/toefl/test-takers/ibt/scores/understand-scores.html)
- ETS trademark guidance makes English Club branding, informational use, registration marking, notice, and review material release conditions. It also rules out using the mark as the product, URL, logo, or social identity. [ETS trademark guidance](https://www.ets.org/legal/trademarks.html)
- ETS licensing guidance does not permit a third party to republish TOEFL questions, passages, audio, directions, or logos merely because the site is educational. [ETS licensing guidance](https://www.ets.org/legal/permissions/licensing.html)
- Cloudflare presigned URLs use the R2 S3 API endpoint and function as bearer credentials. The public custom domain is suitable for deliberately published derivatives, not confidential drafts. [Cloudflare R2 presigned URL documentation](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- R2's free allowance is a billing allowance, not a storage or request hard cap. Capacity and request monitoring still matter. [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- WCAG 2.2 supports the plan's keyboard, reflow, prerecorded-audio alternative, and timing controls. `No autoplay` is a project choice that simplifies compliance, not a verbatim WCAG requirement. [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [prerecorded audio guidance](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded), [timing guidance](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)

This review is an engineering and product-risk review, not legal or psychometric advice. Named accountable reviewers still have to approve public use.

## 3. P0 findings

### P0-1: the documents described two different products

Before correction, the research/delivery plan used `/practice`, an ITP Level 1-aligned objective form, and raw results. The technical plan used `/toefl`, prediction-oriented naming, productive Writing, and human review. Those contracts could not share one schema, route tree, result model, or content review policy.

Correction applied:

- one product name and `/practice` route family;
- one three-section objective taxonomy;
- productive Writing removed from the MVP runtime contract;
- raw question counts replace weighted or prediction-style results.

Remaining gate: a roadmap change that adds productive Writing must create a separate construct, retention policy, review workflow, and result. It cannot silently enter the ITP-aligned total.

### P0-2: trademark and scoring language could imply an ETS product

`/toefl`, `TOEFL Prediction`, official-scale conversion, and a trademark-led product name are not acceptable implementation defaults. The risk is not fixed by a footer disclaimer if the route, headline, or result makes the stronger claim first.

Correction applied:

- English Club remains the source brand;
- the canonical route is `/practice`;
- the mark is informational and gated;
- results explicitly reject official, equivalent, certified, CEFR, admission, and prediction claims;
- ETS materials and visual assets cannot enter the item bank without permission.

Remaining gate: legal/trademark review of the exact navigation label, first prominent use, notice placement, metadata, social cards, and advertising copy.

### P0-3: timer expiry could submit the wrong scope

The delivery plan had per-section durations but sent any expired state directly to whole-attempt submission. That would submit the remaining sections unanswered after the first section deadline.

Correction applied:

- a server-created deadline belongs to one `assessmentAttemptSections` row;
- expiry finalises only that section;
- the next section begins from its own briefing and deadline;
- the attempt submits only after the last section is finalised;
- the scheduled mutation re-reads status and deadline before changing state.

### P0-4: offline reconciliation trusted client time

The prior plan left room to accept a queued answer based on an earlier client timestamp. A learner controls that clock and payload. It cannot decide whether an answer met a server deadline.

Correction applied:

- server receipt and the persisted deadline are authoritative;
- a queued response received late is not backdated;
- the rejected local selection may be shown as `Not counted` for recovery clarity, but it never changes the result.

### P0-5: ownership had two incompatible mechanisms

One plan used Convex Auth identity while another proposed an opaque capability secret. Supporting both doubles the attack surface and complicates deletion, result access, and resume behavior.

Correction applied:

- Home remains local;
- Start creates an invisible Convex Auth Anonymous session for persisted language work;
- queries and mutations derive `identity.tokenIdentifier` and anonymous status server-side;
- public validators accept no owner ID, email, fingerprint, or bearer capability.

Remaining gate: the installed Convex Auth release is beta. Session storage, anonymous row retention, deletion, sign-out, and optional account linking must be tested before public copy promises erasure or cross-device history.

### P0-6: automated checks could masquerade as human rights approval

An automated `assessmentVersionChecks` report cannot prove licensing, academic validity, accessibility judgment, or bias review. The first technical model had no durable human approval contract.

Correction applied:

- `assessmentVersionApprovals` records reviewer, review type, decision, rationale, revision, and time;
- every edit increments `contentRevision` and makes old approvals stale;
- publishing requires a current approved decision for academic, rights, accessibility, and bias review;
- the academic approver differs from the item authors.

Remaining gate: name the reviewers and write the operational review rubric before real content enters a publishable state.

### P0-7: two physical Convex schemas were presented as authoritative

The detailed plan used forms, form items, option rows, attempt items, item reviews, and programme-specific tables. The technical plan used definitions, immutable versions, embedded bounded options, version approvals, and shared profiles. Implementing both would duplicate state and create incompatible APIs.

Correction applied:

- the technical architecture's section 7 is the only normative physical schema;
- the delivery plan now maps its logical vocabulary to those tables;
- a published version fixes order, so MVP does not need `attemptItems`;
- option shuffling is disabled. If added later, the exact option-key permutation must be stored, not an `optionOrderVersion` label.

## 4. P1 findings

### P1-1: the root project documents are stale

This remains unresolved by design because this review was limited to the three assessment documents.

- `PRD.md` excludes scores, learning delivery, and a first-release rich-text admin.
- `BLUEPRINT.md` says an editorial admin is deferred and limits browser JavaScript to the current public islands.
- `DATABASE.md` says learning results and analytics are not stored and treats a separate media asset table as deferred, although the current schema already has `mediaAssets`.
- `PLAN.md` still names Convex Cloud/R2 verification as the current phase and contains no assessment workstream.

Required correction before merge: update PLAN, PRD, BLUEPRINT, DATABASE, DESIGN, DESIGN-SYSTEM, setup, worklog, and QA documents in one documentation pass. Do not leave contradictory statements with equal authority.

### P1-2: resumable lookup could miss an active attempt

Fetching a few newest attempts and filtering status in application code can miss an older active attempt. The normative schema now includes `by_owner_token_identifier_and_status_and_started_at`, so resume can query the exact status and order with a bound.

### P1-3: public catalog lookup used an index without its leading field

The early technical query selected an index beginning with `kind` while trying to list every published kind. The corrected contract uses the visibility-led index for the full catalog or branches by kind when a kind is supplied.

### P1-4: R2 draft and published access were conflated

A signed learner playback URL adds expiry handling without protecting an item bank already delivered to the browser. Conversely, a public custom-domain path does not protect a draft whose key leaks.

Correction applied:

- reviewed publication creates immutable public derivatives;
- draft/source objects remain private and use authorised admin preview;
- no learner playback-ticket service exists in MVP;
- answer keys never enter R2 or the public question projection.

Remaining gate: configure and test the private bucket or private prefix boundary. If it cannot be made private, block confidential draft uploads rather than rely on random keys.

### P1-5: one daily metric row is an OCC hot spot

Incrementing one version/day document from every start, save, failure, and submit creates avoidable contention. `assessmentDailyMetrics` is now post-MVP. If measured demand justifies it, use a sharded counter or contention-safe component and update only meaningful transitions. Do not create an event row for every click or keystroke.

### P1-6: rights provenance was under-specified

Every original stimulus/item now needs bounded provenance metadata, an author, revision-bound approvals, and a source content version for Home programme facts. Automated similarity review can assist, but it cannot approve publication by itself.

### P1-7: the Home quiz cannot be seeded from plausible-sounding copy

No reviewed programme facts were established in the inspected root content contract. The quiz must stay unpublished until 4–6 questions can point to immutable reviewed `siteContentVersions`. The fallback is an ordinary Activities link, not invented copy.

### P1-8: content production is the critical path

The full form needs 140 original reviewed items plus reserve items, listening scripts, audio derivatives, transcripts, answer rationales, and four human approvals at the current revision. The technical shell can be built with clearly internal synthetic fixtures, but a fixture is not a release form.

## 5. P2 findings

### P2-1: timing and listening access were coupled

Extended/untimed timing and transcript-supported Listening solve different needs. The attempt now records independent `timingMode` and `listeningMode` fields. Opening a transcript during any Listening item atomically switches the latter before reveal and preserves the answer.

### P2-2: a 140-button navigator is a mobile and screen-reader burden

The corrected delivery plan limits the dialog to the current section, adds `aria-current="step"`, supplies text alternatives for state, traps and restores focus, handles the safe area, and includes real-tap plus `elementFromPoint` interception checks at 320 px.

### P2-3: decorative complexity was larger than the learning need

Deferred from MVP:

- productive Writing, human scoring, AI feedback, Speaking, and iBT adaptation;
- leaderboards, streaks, certificates, public profiles, and per-keystroke analytics;
- option shuffling and an attempt-item materialization table;
- learner signed-playback tickets;
- analytics infrastructure before traffic evidence;
- a no-code assessment layout builder.

The useful interaction budget goes to save state, section progress, audio controls, transcript access, review, and reliable mobile input.

## 6. Normative backend and API corrections

The exact MVP table surface is:

1. `assessmentDefinitions`
2. `assessmentVersions`
3. `assessmentVersionChecks`
4. `assessmentVersionApprovals`
5. `assessmentSections`
6. `assessmentStimuli`
7. `assessmentItems`
8. `assessmentAnswerKeys`
9. `assessmentAttempts`
10. `assessmentAttemptSections`
11. `assessmentResponses`
12. `assessmentResults`
13. `assessmentSectionResults`

`assessmentDailyMetrics` is a later table, not part of the vertical slice.

API rules that must survive implementation:

- every public function has explicit argument and return validators;
- ownership always comes from auth;
- answer keys, reviewer notes, provenance, admin IDs, and draft media never cross a public projection;
- start and submit use idempotency keys scoped to the authenticated owner;
- save uses one response per attempt/item plus a monotonic client revision;
- every item/section relationship is checked against the frozen version;
- public/admin growing lists use cursor pagination;
- scheduled functions call internal functions and re-read lifecycle state;
- scoring happens from internal answer keys at final submission, never from client score fields;
- publication checks the current content revision, exact blueprint, current approvals, ready media, transcripts, and actor permission in one authoritative mutation.

## 7. Security and privacy release gates

| Gate | Required evidence |
| --- | --- |
| Anonymous identity | Two isolated anonymous identities cannot read or mutate each other's attempts |
| Session lifecycle | Refresh/resume, sign-out, expiry, delete, and anonymous auth-row cleanup tested against `@convex-dev/auth@0.0.95` |
| Answer-key privacy | Public query snapshots contain no keys/explanations before submission |
| Deadline authority | Fake client clocks and late offline queues cannot earn credit |
| Idempotency | Repeated Start and Submit requests return one logical attempt/result |
| Rate limiting | Public start/save/submit abuse path is bounded and tested |
| Admin authorisation | Every assessment/media/review function checks a server-derived active admin and exact permission |
| R2 upload | Exact MIME, size, key, checksum/HEAD verification, CORS origin, expiry, and non-logging tested |
| R2 read | Public immutable derivative and private draft paths tested independently |
| Deletion | UI accurately names retained aggregates/audit/auth rows; no silent promise of total erasure |

## 8. Mobile and accessibility release gates

- 320 px and 200% zoom produce reflow without horizontal scrolling.
- Minimum practical touch targets are 44 px; answer rows use 48 px where space allows.
- A sticky timer/action surface does not obscure focus or the last answer.
- Portal/backdrop layers do not intercept question, transcript, Next, Finish, or Submit taps.
- Focus stays on selection, moves to the new question heading after navigation, and returns to the launcher after the navigator closes.
- Save, offline, timer, and result states are text and polite-live where useful.
- Audio never autoplays; the player is keyboard operable; transcript-supported mode is available without first causing an error.
- Reduced motion removes spatial transitions without hiding status.
- Both current public themes use the same content and interaction order.

## 9. Implementation decision

### Allowed now

- add the exact schema/validator/index surface using internal synthetic fixtures;
- add Anonymous provider integration and isolation tests;
- build `/practice` route shells, question renderer, current-section navigator, timer, save, submit, and raw-result vertical slice;
- extend admin permissions and a minimal single-choice author/review path;
- build the private-draft/public-derivative media boundary.

### Blocked until owner or reviewer evidence exists

- public trademark-led navigation or metadata;
- a public full-form release;
- official, predicted, calibrated, CEFR, certificate, or admissions result language;
- Home programme questions without reviewed CMS facts;
- real learner retention/deletion copy without anonymous auth cleanup evidence;
- publication of any item without current rights, academic, accessibility, and bias approvals;
- confidential draft media on a public R2 path.

## 10. Verification record

- All 26 unique Markdown-linked external sources in the three reviewed planning documents returned HTTP 200 on 25 August 2026.
- Cross-document searches found no remaining `/toefl` implementation route, custom capability ownership scheme, productive-Writing MVP table, learner playback ticket, or official-score output contract.
- Markdown relative links among the three assessment documents resolve.
- The canonical inventory is consistent at 50/40/50 questions, 35/25/55 minutes, 140 questions, 115 minutes, and 4–6 Home questions.
- The review changed documentation only. It did not edit app source, run a deployment, commit, or touch port 3987.

## 11. Required follow-up after the vertical slice

1. Reconcile the root project documents with the implemented assessment surface.
2. Run Convex security, validator, index, and pagination review against the actual code.
3. Exercise two isolated anonymous identities and the exact beta-auth deletion path.
4. Run the real 320 px touch/interception, keyboard, reduced-motion, dark/light, and screen-reader smoke suite.
5. Capture evidence screenshots only after a production build passes; inspect overflow, obscured focus, and misleading official resemblance.
6. Record named legal/trademark, rights, academic, accessibility, bias, privacy, and infrastructure decisions before public content publication.
