# English Club Assessment Lab — Detailed Delivery Plan

> Historical baseline (25 August 2026): the three-section runtime described below is retained only for legacy `ec-itp-level-1-aligned-v1` compatibility. The current four-skill implementation contract is [`PRACTICE-IBT-IMPLEMENTATION.md`](PRACTICE-IBT-IMPLEMENTATION.md). The original rights, trademark, calibration, accessibility, privacy, and publication gates still apply.

- Status: implementation-ready product plan, pending owner decisions and legal/academic review
- Date: 25 August 2026
- Related research: [`TOEFL-PRODUCT-RESEARCH.md`](TOEFL-PRODUCT-RESEARCH.md)
- Stack: Next.js 16.3.2, Convex 1.45 cloud deployment, Cloudflare R2

## 1. Outcome

Build an English Club-owned academic English practice area with:

1. one complete, original three-section practice assessment aligned to the published TOEFL ITP® Level 1 structure;
2. short Listening, Structure & Written Expression, and Reading quizzes;
3. a short Home quiz about confirmed English Club programmes;
4. an admin workflow for original item authoring, review, media, forms, publication, and aggregate quality signals.

The product must remain useful without making an unsupported score claim. The complete assessment earns its name through section and item completeness, not through an invented conversion to an ETS scale.

## 2. Product promise

Public promise:

> Practise a sustained set of original academic English questions, see exactly how you performed on this form, and leave with a focused review list.

The product does not promise:

- an official TOEFL score;
- a prediction accepted by an institution;
- CEFR placement;
- admission readiness;
- adaptive iBT equivalence;
- a certificate with external validity.

## 3. Fixed decisions for planning

The following defaults keep implementation coherent. A product owner may override them before Phase 1, but a change must update the blueprint, content inventory, result copy, and tests together.

| Area | Planning default |
| --- | --- |
| Product source brand | English Club |
| Product name | English Club Assessment Lab |
| Informational navigation | TOEFL® test preparation, only after trademark review |
| Complete assessment | Original ITP Level 1-aligned structure |
| Complete assessment inventory | 50 Listening, 40 Structure & Written Expression, 50 Reading |
| Standard duration | 35 + 25 + 55 = 115 minutes |
| Result | Raw counts, accuracy, time, skill review |
| Quick quiz | 6–10 items, 5–10 minutes, one area |
| Productive Writing | Separate unscored/human-reviewed follow-up, not MVP total |
| Home quiz | 4–6 confirmed programme-fact questions, untimed |
| Public identity | Home stays local; a stored language attempt obtains an invisible Convex Auth Anonymous identity on Start; named account optional later |
| Admin auth | Existing Convex Auth and role/permission model |
| Media | R2 binary objects; Convex metadata and review state |
| Accessibility | WCAG 2.2 AA, 320 px, keyboard, 200% zoom, reduced motion |
| Motion | State support only, never timed decoration or hidden content |

## 4. Information architecture

### 4.1 Public routes

```text
/
  Home programme quiz section

/practice
  Assessment Lab overview
  Complete assessment route
  Quick quiz routes
  Scope and trademark notice

/practice/full
  Full-form briefing and mode selection

/practice/quick/listening
/practice/quick/structure
/practice/quick/reading
  Quiz briefing or resume state

/practice/attempt/[attemptId]
  Section and question runner

/practice/result/[attemptId]
  Submitted result and review
```

Use `/practice`, not a trademark-led route, so the URL describes the English Club product. Every page that refers to TOEFL must follow the current ETS informational-use rules and carry the approved notice.

### 4.2 Admin routes

```text
/admin/assessments
  Forms, versions, states, quality gates

/admin/assessments/[formId]
  Blueprint coverage, section order, item assignment

/admin/items
  Searchable, paginated item bank

/admin/items/new
/admin/items/[itemId]
  Stimulus, prompt, options, key, explanation, provenance, review

/admin/media
  Audio/image/transcript upload and verification

/admin/reviews
  Academic, rights, accessibility, and publication queues

/admin/programme-quiz
  Home programme content and question order

/admin/assessment-analytics
  Aggregate completion and item-quality signals
```

Admin visuals inherit the project's rounded soft-neobrutalist admin language. The public runner inherits the existing bright Conversation Relay system; it must not imitate ETS visual assets or become a generic learning-dashboard card grid.

## 5. Navigation behaviour

### 5.1 Desktop

- Add one reusable navigation disclosure labelled with the legally approved informational term.
- Trigger uses a Heroicon chevron, not an ASCII symbol.
- Menu contains overview, full assessment, and the three quick quizzes.
- Opening does not shift the header or page.
- Arrow keys, Home, End, Enter, Space, Escape, Tab, and outside pointer dismissal work.
- Focus returns to the trigger after Escape.

### 5.2 Mobile

- Put Assessment Lab and its children inside the existing mobile navigation dialog/disclosure.
- Child links remain 44 px or taller.
- The menu does not create nested scroll traps.
- A tap on a child route closes the navigation before route transition.
- Verify `elementFromPoint` at target centres so no decorative overlay intercepts events.

### 5.3 No-JavaScript baseline

Server HTML includes normal links to the overview and each quiz briefing. The full runner may require JavaScript for autosave/timing, but the requirement is stated before Start.

## 6. Experience direction

### 6.1 Physical scene

A student uses a phone on a bright campus corridor between classes for the short quiz, then uses a laptop at a quiet desk for the full form. The visual system must be readable in daylight, calm under a long timer, and unambiguous under interrupted connectivity.

### 6.2 Public assessment silhouette: The Answer Line

The runner is a ruled working surface, not a stack of cards:

- a slim top line holds section, saved state, mode, and timer;
- a bounded progress track shows answered/current/flagged/unseen without colour-only meaning;
- the stimulus occupies the main reading field;
- the answer group follows the stimulus in DOM and reading order;
- Back, Flag, and Next/Submit form a stable action line;
- on wide screens, a compact question navigator sits beside the field;
- on phones, navigation becomes a bottom sheet/disclosure and the action line remains reachable above safe-area insets.

Avoid:

- equal feature cards;
- gamified streak panels;
- large gradient score rings;
- fake official score sheets;
- copied paper-test styling;
- red countdown motion;
- auto-advance after choosing an answer;
- drag-only ordering tasks;
- animations tied to every question.

### 6.3 Motion

Motion jobs are limited to state replacement and spatial orientation:

- answer selection: 120–160 ms colour/weight response;
- question replacement: 180–240 ms restrained crossfade/clip, content visible by default;
- section transition: maximum 400 ms;
- save state: icon/text change, no perpetual spinner after success;
- timer warnings: no pulsing.

Use `cubic-bezier(0.22, 1, 0.36, 1)`. Under `prefers-reduced-motion`, replace spatial transitions immediately and retain only necessary state text.

## 7. Home programme quiz specification

### 7.1 Purpose

Help a prospective member understand confirmed English Club programmes and choose one next action. It is not an English test and does not contribute to Assessment Lab history.

### 7.2 Content gate

The current repository has no confirmed programme catalogue. Before publication, the content owner must provide for every programme:

- public name;
- one-sentence purpose;
- what a participant does;
- intended audience, if bounded;
- current status;
- destination route or contact intent;
- evidence owner and review date.

No question may infer schedules, prices, outcomes, partnerships, facilities, or eligibility.

### 7.3 Interaction

1. Server renders a heading, summary, first question, and Start/Explore link.
2. Start opens the first of 4–6 questions without scrolling the page unexpectedly.
3. Each question uses a fieldset and legend with 2–4 answer options.
4. Selecting an answer does not auto-advance.
5. Check answer reveals a short explanation and programme link.
6. Next preserves the chosen answer locally.
7. Back returns without losing state.
8. Finish reports details understood and provides one relevant next link.
9. Reset returns to the intro and clears local state.

### 7.4 Result language

Allowed:

- “You understood 4 of 5 programme details.”
- “Review Conversation Practice.”
- “See how the Academic team works.”

Not allowed:

- “You are a Speaking person.”
- “Your English Club personality is…”
- “You belong in…”
- “You scored Advanced.”

### 7.5 Persistence

- Answer state remains in component memory for the current visit.
- Optional session storage may support an accidental refresh, with no personal identifier.
- Convex receives only aggregate start, completion, and chosen destination counters above a privacy threshold.
- Do not store the per-question sequence or create a visitor profile.

### 7.6 Home acceptance criteria

- [ ] Contains 4–6 owner-approved questions based only on published programme facts.
- [ ] Completes without authentication in under three minutes in moderated usability testing.
- [ ] Fieldset, legend, labels, error, explanation, and progress are announced correctly.
- [ ] Back/Next/Reset work by touch and keyboard at 320 px.
- [ ] No answer is selected, checked, or advanced automatically.
- [ ] Completion sends no free text, email, or stable visitor identifier.
- [ ] Missing or unpublished quiz content removes the section cleanly rather than showing test copy.

## 8. Assessment Lab overview specification

### 8.1 First viewport

The first viewport answers:

- What can I practise?
- How long does it take?
- What result will I receive?
- Is it official?

Recommended copy hierarchy:

1. `English Club Assessment Lab`
2. `A full practice form when you have time. A short section when you do not.`
3. One full-assessment link and one quick-quiz disclosure.
4. A visible practice-result limitation beside the actions.

### 8.2 Full versus quick comparison

Use a ruled comparison, not two promotional cards:

| | Full practice | Quick practice |
| --- | --- | --- |
| Time | 115-minute standard mode | 5–10 minutes |
| Areas | All three | One selected area |
| Result | Section and skill review | Focused item review |
| Resume | Yes | Current device/session |

### 8.3 Empty states

- No full form published: `The next full practice form is under academic review. Short quizzes remain available.`
- No quick quiz in one area: show the unavailable area as text, not an enabled control.
- Convex unavailable: keep the explanatory page and offer Retry; do not silently substitute unpublished seed questions.

## 9. Complete assessment specification

### 9.1 Blueprint

| Order | Section | Items | Standard time | MVP scoring |
| ---: | --- | ---: | ---: | --- |
| 1 | Listening Comprehension | 50 | 35 minutes | Objective raw correct |
| 2 | Structure & Written Expression | 40 | 25 minutes | Objective raw correct |
| 3 | Reading Comprehension | 50 | 55 minutes | Objective raw correct |

These numbers describe structural alignment only. Directions and content remain English Club originals.

### 9.2 Briefing state

Show before Start:

- form title and version;
- three sections, item count, and expected time;
- standard, extended, or untimed mode;
- transcript-supported Listening option;
- replay policy;
- save and resume behaviour;
- network requirement;
- result contents and exclusions;
- privacy/retention summary;
- approved trademark notice;
- checkbox acknowledging practice-only status;
- Start assessment button.

The acknowledgement records that the message was shown. It is not a waiver and must not hide confusing product language.

Timing mode and Listening mode are independent. A learner may combine extended
or untimed practice with audio-primary or transcript-supported Listening.

### 9.3 Section intro

Each section intro states:

- number of questions;
- timer rule;
- question types;
- transcript/audio mode;
- whether unanswered questions can be revisited;
- Begin section action.

Starting the first item creates the server deadline. Reading an intro does not consume section time.

### 9.4 Question runner

Every runner screen contains:

- assessment and section names;
- question position as text, e.g. `Question 12 of 50`;
- timer and mode;
- save state: `Saving`, `Saved`, `Offline — saved on this device`, or `Save failed`;
- stimulus;
- fieldset/answer control;
- Flag for review;
- Back and Next;
- question-navigation disclosure;
- Finish section or Submit assessment only at the proper boundary.

In Listening, `Open transcript` is available during every question rather than
only after an audio error. Activating it first records the attempt as
`transcript_supported`, then reveals the transcript without clearing the current
answer. It cannot be switched back to `audio_primary` for result reporting.

Do not move focus on answer selection. On Next/Back, focus the new question heading after state has rendered. Announce section and question position once.

### 9.5 Section boundary

- Show answered, unanswered, and flagged counts.
- List unanswered question numbers as normal buttons/links.
- `Return to questions` is the quiet action.
- `Finish section` is explicit and requires confirmation if unanswered items remain.
- After a section is finalised, answers are read-only in standard timed mode.
- Untimed learning mode may allow reopening until final assessment submission; result records this mode.

### 9.6 Final submission

Submission is an idempotent server mutation:

1. Validate the server-derived attempt owner and current status.
2. Re-read the persisted form version and scoring keys internally.
3. Reject client-provided scores.
4. Mark unanswered items as omitted.
5. Compute raw section and total result.
6. Write immutable result and item review rows or a reproducible result snapshot.
7. Mark attempt submitted in the same transaction where feasible.
8. Return the existing result if the same idempotency key is retried.

The client never sends `correct: true`, a score, an official scale, or a user ID for authorisation.

## 10. Quick quiz specification

### 10.1 Shared contract

- 6–10 published items.
- 5–10 minute expectation, untimed by default.
- One section and one declared learning objective.
- Anonymous use without account.
- A question is not reused from the active full form during the same content release unless the owner accepts exposure.
- Answer key is unavailable until final submission.
- Results use raw counts and item explanations.
- Retake creates a new variant when the pool supports it.

### 10.2 Quick Listening

MVP types:

- choose an appropriate response to a short exchange;
- identify main idea or purpose;
- identify a stated detail;
- make a bounded inference from a short original conversation or announcement.

Rules:

- manual Play only;
- playback policy visible before starting;
- transcript-supported mode available;
- audio failure offers Retry and transcript-supported continuation;
- accents vary through reviewed, intelligible original recordings without caricature.

### 10.3 Quick Structure & Written Expression

MVP types:

- complete a sentence with one correct form;
- identify the segment that prevents standard written English;
- choose a revision that fixes a defined grammar issue;
- order sentence parts through click/tap controls, never drag-only.

Do not label this as essay Writing. Explanations name the grammar decision in plain language.

### 10.4 Quick Reading

MVP types:

- main idea;
- stated detail;
- reference;
- vocabulary in context;
- inference;
- relationship between ideas.

Texts stay visible while answering. At 320 px, the passage and question use a controlled two-state view with clear `Read passage` and `Answer question` controls; no horizontal split is forced.

### 10.5 Post-MVP productive Writing decision record

Do not implement this track in the MVP. If a later product brief confirms that
“Writing” means authored responses, treat it as a separate product change:

- create a separate `/practice/quick/writing` route;
- use original email or academic discussion prompts;
- save drafts explicitly;
- provide a transparent self-review checklist or trained human review;
- never add it to the objective full-form total;
- do not use automated scoring in MVP;
- delete free-text responses after the retention window or on request.

## 11. Question and content model

### 11.1 Construct vocabulary

Use neutral internal vocabulary:

- `assessment` — product container;
- `form` — immutable published selection/order of versioned items;
- `section` — Listening, Structure/Written Expression, or Reading;
- `stimulus` — passage, audio, dialogue, sentence set, or shared context;
- `item` — one scored or unscored question;
- `option` — one selectable response;
- `scoringKey` — internal-only rule for objective scoring;
- `attempt` — one learner's run against one form version;
- `response` — one saved learner answer;
- `practiceResult` — immutable submitted outcome;
- `review` — academic/rights/accessibility decision.

Avoid internal names such as `toeflScore`, `officialResult`, or `predictionBand`.

### 11.2 Supported MVP item types

| Type | Input | Key | Accessibility note |
| --- | --- | --- | --- |
| single-select | radio group | one option ID | fieldset and legend |
| multi-select | checkbox group | option-ID set | state required count |
| sentence-completion | radio group | one option ID | blank named in prompt text |
| error-identification | radio group over text-labelled segments | one segment ID | no colour-only underline |
| click-order | add/move controls | ordered IDs | no drag-only interaction |

Defer free-form scoring, speech recording, hotspot images, and complex matching until their access and review models are defined.

### 11.3 Content lifecycle

```text
draft
  -> academic_review
  -> rights_review
  -> accessibility_review
  -> approved
  -> assigned_to_draft_form
  -> published_in_immutable_form
  -> retired
```

Rejected review returns the item to draft with a required reason. Published item versions are immutable. Editing creates a new version; completed attempts retain the version they received.

### 11.4 Review checklists

Academic review:

- construct match;
- one defensible key;
- distractors plausible but wrong;
- explanation proves the key;
- difficulty judgement recorded as author estimate, not fact;
- no trick based on ambiguity.

Rights review:

- original wording declaration;
- fact sources listed;
- no copied or closely paraphrased protected material;
- voice/image/music rights recorded;
- no ETS logo, directions, item, rubric, or visual imitation.

Accessibility review:

- transcript complete and sequenced;
- audio player label useful;
- item can be operated by keyboard and single pointer;
- answer meaning does not rely on colour or spatial position;
- passage and prompt reflow at 320 px and 200% zoom;
- time/access mode documented.

Bias and sensitivity review:

- no knowledge irrelevant to the construct is required;
- names, accents, settings, and roles avoid stereotypes;
- no traumatic or discriminatory topic without a learning reason and review;
- no item rewards familiarity with one institution's private culture.

## 12. Timer, resume, and offline state machine

### 12.1 Attempt states

```text
created
  -> in_progress
  -> section_review
  -> in_progress (next section)
  -> submitting
  -> submitted

created | in_progress -> abandoned
in_progress -> section_review (section deadline reached)
section_review -> in_progress (next section) | submitting (last section)
submitting -> in_progress (recoverable failure)
```

`submitted` and `abandoned` are terminal except an admin support process that adds an audit event; support does not rewrite a result. A section deadline freezes that section and opens its review/boundary state. It submits the entire attempt only when the expired section is the last section.

### 12.2 Server time

- Store `startedAt`, current `sectionStartedAt`, `sectionDeadlineAt`, `lastSavedAt`, and selected timing mode.
- Calculate deadlines in a Convex mutation.
- Browser displays `deadlineAt - server-synchronised-now`.
- Schedule an internal expiry mutation at the deadline.
- The scheduled function re-reads attempt status and deadline before doing anything.
- Client timeout triggers submission UI but is not the source of authority.

### 12.3 Autosave

- Selecting/changing an answer updates local state immediately.
- Debounced or direct mutation upserts one response document.
- Each save carries `clientRevision`; server rejects a stale revision.
- Save status is textual and polite-live.
- Navigation waits only when losing the unsaved answer would be likely; otherwise queue and reconcile.
- Server response is authoritative after reconnect.

### 12.4 Resume

On return:

- verify the server-derived owner identity;
- fetch current attempt, active section, paginated/section-bounded item view, and response state;
- go to the last visited unanswered item unless the learner explicitly selected another;
- show time remaining before resuming a timed section;
- do not restart audio automatically;
- do not reset option order or item variant.

### 12.5 Offline behaviour

MVP is **resilient online**, not fully offline:

- attempt start requires Convex;
- first section payload and current audio may be prefetched after Start;
- answers queue in memory/IndexedDB while disconnected, without auth tokens;
- banner states `Offline — answers remain on this device until connection returns`;
- standard timer continues against the stored server deadline;
- after the server deadline, local input locks; a queued response received late is not counted merely because it carries an earlier client timestamp;
- preserve a rejected late selection only in the local recovery view until the learner dismisses it, with clear `Not counted` copy;
- final result waits for server confirmation;
- leaving the device or clearing storage may lose unsynced answers, stated plainly.

Do not cache the whole item bank or answer keys in a service worker.

## 13. Scoring and result states

### 13.1 Objective scoring

For each scored item:

```text
single-select: selectedOptionId === keyOptionId
multi-select: selected set exactly equals key set
click-order: selected ordered IDs exactly equal key order
omitted: no committed answer at submission
```

The score function is versioned. A completed result records the form version and scoring-model version so it remains reproducible.

### 13.2 Result summary

Show:

- `Correct / total` for each section;
- overall `Correct / 140` and percentage;
- omitted count;
- time used and timing mode;
- transcript/listening mode;
- skill areas with enough sampled items;
- review link grouped by incorrect, omitted, and flagged;
- practice-only statement and deletion/history controls.

Do not show a giant score ring. Use one clear sentence and a ruled section breakdown.

### 13.3 Skill breakdown rule

A skill tag appears only when the submitted form contains at least five scored items for that tag. Below that threshold, group it under its parent area. The threshold is a product default to avoid overinterpreting one or two questions; it is not a psychometric guarantee.

### 13.4 Review mode

- Show original stimulus, learner answer, correct answer, and explanation.
- Listening transcript becomes available.
- Keep question navigation and section filters.
- Do not reveal unpublished sibling items or internal reviewer notes.
- If an item is later invalidated, mark it `Not counted` and preserve the original result plus a versioned adjusted result event; never silently mutate history.

### 13.5 Error states

- Scoring delayed: `Your answers are submitted. The result is still being prepared.` with retry/status polling.
- Attempt already submitted: route to existing result.
- Form retired after start: existing attempt remains valid against its immutable form version.
- Item invalidated before submission: exclude it transparently and adjust denominator.
- Result unavailable: show attempt ID copy action and support path without leaking internal error text.

## 14. Convex data architecture

The coding agent must read `convex/_generated/ai/guidelines.md` before touching Convex source. The following names describe the product's logical entities, not a second physical schema. The exact physical tables, validators, and indexes in [`TOEFL-TECHNICAL-ARCHITECTURE.md`](TOEFL-TECHNICAL-ARCHITECTURE.md#7-full-convex-schema) are normative for implementation.

| Logical entity in this plan | Normative physical model |
| --- | --- |
| `assessments` | `assessmentDefinitions` plus immutable `assessmentVersions` |
| `assessmentSections`, `stimuli`, `items` | `assessmentSections`, `assessmentStimuli`, `assessmentItems` |
| `itemOptions` | Bounded option arrays inside an `assessmentItems` union branch |
| `itemScoringKeys` | Private `assessmentAnswerKeys` rows |
| `assessmentForms`, `formItems` | One immutable `assessmentVersion` and its child section/item rows |
| `assessmentAttempts`, `attemptResponses` | `assessmentAttempts`, `assessmentAttemptSections`, `assessmentResponses` |
| `attemptItems` | Not stored in MVP; immutable version order is used and option shuffling is disabled |
| `practiceResults`, `practiceResultSections` | `assessmentResults`, `assessmentSectionResults` |
| `itemReviews` | Revision-bound `assessmentVersionApprovals` plus automated `assessmentVersionChecks` |
| programme quiz definitions/items | A `club-program-v1` assessment version whose items pin `siteContentVersions` |
| `assessmentDailyMetrics` | Deferred post-MVP, contention-safe aggregate |

### 14.1 Tables

#### `assessments`

- `slug`
- `title`
- `description`
- `kind`: `full_itp_aligned | quick | programme_orientation`
- `status`: `draft | published | retired`
- `createdBy`, `updatedBy`
- `createdAt`, `updatedAt`

Indexes:

- `by_slug`
- `by_status_and_updated_at`

#### `assessmentSections`

- `assessmentId`
- `sectionKey`: `listening | structure_written | reading`
- `title`
- `position`
- `standardDurationSeconds`
- `targetItemCount`
- `instructionsVersionId`

Indexes:

- `by_assessment_id_and_position`

#### `stimuli`

- `kind`: `text | audio | text_audio`
- `titleInternal`
- `bodyRichTextJson`
- `plainText`
- `audioMediaId` optional
- `transcript`
- `status`
- `version`
- provenance and review references
- author/update timestamps

Indexes:

- `by_status_and_updated_at`
- `by_kind_and_status_and_updated_at`

#### `items`

- `stableKey`
- `version`
- `sectionKey`
- `itemType`
- `stimulusId` optional
- `promptRichTextJson`
- `promptPlainText`
- `skillTagId`
- `authorDifficultyEstimate`
- `status`
- `isScored`
- author/update timestamps

Indexes:

- `by_stable_key_and_version`
- `by_section_key_and_status_and_updated_at`
- `by_skill_tag_id_and_status_and_updated_at`

#### `itemOptions`

- `itemId`
- `stableKey`
- `bodyRichTextJson`
- `plainText`
- `defaultPosition`

Index:

- `by_item_id_and_default_position`

#### `itemScoringKeys` — internal only

- `itemId`
- `scoringModelVersion`
- `correctOptionIds` or `correctOrderedOptionIds`
- `explanationRichTextJson`
- `explanationPlainText`
- `reviewedBy`
- `reviewedAt`

Index:

- `by_item_id_and_scoring_model_version`

No public query returns this document before submission.

#### `skillTags`

- `key`
- `sectionKey`
- `publicLabel`
- `description`
- `status`

Indexes:

- `by_key`
- `by_section_key_and_status`

#### `assessmentForms`

- `assessmentId`
- `version`
- `status`: `draft | review | published | retired`
- `standardDurationSeconds`
- `publishedBy`, `publishedAt`
- `rightsGatePassedAt`
- `academicGatePassedAt`
- `accessibilityGatePassedAt`
- `scoringModelVersion`

Indexes:

- `by_assessment_id_and_version`
- `by_status_and_published_at`

#### `formItems`

- `formId`
- `sectionId`
- `itemId`
- `position`
- `optionShuffleAllowed`

Indexes:

- `by_form_id_and_section_id_and_position`
- `by_item_id_and_form_id`

Never put 140 item IDs in one array field.

#### `assessmentAttempts`

- `formId`
- `ownerTokenIdentifier`, required and derived from `ctx.auth`
- `status`
- `timingMode`: `standard | extended | untimed`
- `timeMultiplier`
- `listeningMode`: `audio_primary | transcript_supported`
- `currentSectionId`
- `currentItemPosition`
- `startedAt`
- `sectionStartedAt`
- `sectionDeadlineAt`
- `lastSavedAt`
- `submittedAt` optional
- `expiresAt`
- `submissionIdempotencyKey` optional

Indexes:

- `by_owner_token_identifier_and_started_at`
- `by_owner_token_identifier_and_status_and_started_at`
- `by_status_and_expires_at`
- `by_form_id_and_status_and_started_at`

The owner is derived from the Convex Auth identity. The public API accepts no owner ID, email, device fingerprint, or bearer capability argument.

#### `attemptItems`

- `attemptId`
- `sectionId`
- `itemId`
- `position`
- exact ordered option keys if shuffling is introduced later
- `visitedAt` optional
- `flagged`

Indexes:

- `by_attempt_id_and_section_id_and_position`
- `by_attempt_id_and_item_id`

This logical entity is not a separate MVP table. A published version fixes item order, and MVP option shuffling is disabled. If shuffling is introduced later, persist the actual ordered option keys rather than a version label so resume reconstructs the same choices exactly.

#### `attemptResponses`

- `attemptId`
- `attemptItemId`
- selected value fields by discriminated union
- `clientRevision`
- `savedAt`
- `firstAnsweredAt` optional

Indexes:

- `by_attempt_id_and_attempt_item_id`
- `by_attempt_id_and_saved_at`

This high-churn table stays separate from `assessmentAttempts`.

#### `practiceResults`

- `attemptId`
- `formId`
- `scoringModelVersion`
- raw total/correct/omitted
- timing/listening mode
- `computedAt`
- `supersedesResultId` optional
- `adjustmentReason` optional

Indexes:

- `by_attempt_id`
- `by_form_id_and_computed_at`

#### `practiceResultSections`

- `resultId`
- `sectionKey`
- `total`
- `correct`
- `omitted`
- `elapsedSeconds`

Index:

- `by_result_id_and_section_key`

#### `itemReviews`

- `itemId`
- `reviewType`: `academic | rights | accessibility | bias`
- `decision`: `approved | changes_requested | rejected`
- `notes`
- `reviewerId`
- `createdAt`

Indexes:

- `by_item_id_and_review_type_and_created_at`
- `by_decision_and_created_at`

#### `programmeQuizDefinitions`

- `slug`
- `version`
- `title`
- `summary`
- `status`: `draft | published | retired`
- `publishedBy`, `publishedAt` optional
- `createdBy`, `updatedBy`
- `createdAt`, `updatedAt`

Indexes:

- `by_slug_and_version`
- `by_status_and_published_at`

#### `programmeQuizItems`

- `definitionId`
- `position`
- `question`
- `options` as a small, hard-bounded discriminated object or separate option rows if the editor needs independent option history
- `correctOptionKey`
- `explanation`
- `programmeContentEntryId`
- `destinationPath`

Index:

- `by_definition_id_and_position`

Keep programme questions in versioned CMS records separate from language assessment items. They have no scoring key that implies language ability. Public projection may include the orientation answer and explanation because this quiz is a content guide, not a secure language item bank; the UI still reveals them only at the intended step.

#### `assessmentDailyMetrics`

- `dateKey`
- `assessmentId`
- starts, completions, resumptions, deletes
- aggregate duration buckets
- no free text or identity

Index:

- `by_assessment_id_and_date_key`

This table is post-MVP. A single definition/day row is a write-contention hot spot, so do not increment it from learner transitions until measured demand justifies analytics. When added, use a sharded counter or another contention-safe aggregate and keep its update atomic with the source transition.

### 14.2 Function boundaries

Public read functions:

- list published assessment summaries, bounded;
- get published briefing;
- get authorised attempt shell/current section;
- get authorised result/review after submission;
- get published programme quiz.

Public mutations:

- create attempt with rate limit;
- begin section;
- save answer;
- toggle flag;
- update position;
- finalise section;
- submit attempt;
- delete learner history.

Internal-only functions:

- score an attempt;
- expire an attempt;
- read scoring keys;
- build daily aggregates;
- clean rejected uploads;
- apply an item invalidation adjustment.

Admin functions:

- all require server-derived identity and existing admin permission helpers;
- draft/list functions are paginated;
- publication verifies every gate in one server transaction;
- audit event is written in the same mutation as the protected state change.

### 14.3 Query scale rules

- No growing table uses unbounded `.collect()`.
- Item banks, attempts, results, reviews, and audit logs use cursor pagination.
- Form item reads use `by_form_id_and_section_id_and_position` with a section bound.
- One response is found with a compound index and `.unique()`; application mutations also prevent duplicates transactionally.
- Counters are maintained transactionally or by an aggregate component, not `.collect().length`.
- Scheduled expiry uses an internal function and rechecks state because auth is not propagated to scheduled calls.

## 15. Admin authoring workflow

### 15.1 Create stimulus

1. Choose section and stimulus type.
2. Write original source text/script.
3. Add fact sources and originality statement.
4. Upload delivery media if needed.
5. Add transcript and accessible label.
6. Save draft.

### 15.2 Create item

1. Select or create stimulus.
2. Choose item type and skill tag.
3. Write prompt and options.
4. Set key in a visually separate restricted field.
5. Write key and distractor rationales.
6. Preview learner rendering at desktop, phone, 320 px, and dark theme.
7. Save as draft.

### 15.3 Review

- Academic reviewer cannot approve an item with missing rationale.
- Rights reviewer sees provenance and similarity declaration.
- Accessibility reviewer sees transcript, focus order, and responsive preview.
- One reviewer may hold multiple roles in a small club, but the system records each decision separately.
- Recommended publication policy: author cannot be the sole academic approver of the same version.

### 15.4 Assemble form

- Start from a versioned blueprint.
- Coverage view uses a matrix of section × skill tag × target/assigned count, not a card grid.
- Missing, duplicate, unapproved, or retired items block publication.
- Reordering supports buttons and keyboard, not drag only.
- Preview never exposes the form to public queries.

### 15.5 Publish

Server validates:

- exact section and item counts;
- unique item assignments;
- all items approved;
- all media verified and ready;
- every audio has a transcript;
- scoring key and explanation present;
- trademark notice version current;
- form and scoring version fixed;
- publishing admin has permission.

Publication writes the immutable version and audit event. Changing content creates a new form version.

## 16. R2 media workflow

### 16.1 Media types

Extend the current image-only media contract deliberately:

- delivery audio: `audio/ogg; codecs=opus` or `audio/mpeg` after browser support review;
- source master: WAV in private storage only;
- transcript: Convex text; optional WebVTT derivative;
- supporting images: AVIF/WebP with width, height, and alt metadata.

Do not add MIME types to production until validators, R2 key rules, size limits, tests, and setup documentation change together.

### 16.2 Upload states

```text
requested -> uploaded -> verifying -> ready
                     -> rejected
requested -> expired
ready -> archived
```

### 16.3 Browser upload

1. Admin selects a reviewed file.
2. Client sends name, exact MIME, bytes, purpose, and checksum metadata to an authorised Convex action.
3. Server validates permission, limits, object key, and existing-key absence.
4. Server signs a short PUT on the R2 S3 API endpoint.
5. Client uploads directly with exact signed headers.
6. Client requests verification.
7. Server `HEAD`s the object, validates type/size/checksum where available, then marks metadata ready.
8. Public form may reference only ready media.

Never log the signed URL. Never send R2 API credentials to Next.js or the browser.

### 16.4 Delivery

- Published public audio can use `https://r2.mukhtada.my.id` with immutable versioned keys.
- Draft and review media uses short signed GET URLs from the private R2 bucket/S3 endpoint.
- Audio preloading is `metadata` until the learner starts a question or section.
- Set correct content type, byte-range support, cache policy, and cross-origin policy.
- Do not autoplay.

### 16.5 Cleanup

- Prefix pending uploads separately.
- Delete unverified objects after 24 hours with R2 lifecycle or scheduled cleanup.
- Retired published media remains while any immutable form references it.
- A reference check precedes deletion.

## 17. Authentication and authorisation

### 17.1 Public learner

The Home programme quiz stays local and needs no identity. When a visitor presses
Start on a stored language attempt, the existing Convex Auth stack signs in with
its `Anonymous` provider. Every function derives `identity.tokenIdentifier` and
the anonymous/user classification server-side. It never accepts a user ID,
email, device fingerprint, or owner capability from the client.

Named accounts and cross-device history are a later opt-in. Convex Auth is beta
in the installed stack, so public launch requires an integration test for the
exact Next.js session/storage path and a verified cleanup policy for the auth
session, account, and user rows created by anonymous sign-in. Until that is
proved, deletion copy must not claim that every auth row is erased.

### 17.2 Admin

Use the existing `adminUsers` record and permission model. Each function derives `identity.tokenIdentifier` from Convex auth, loads the active admin, and checks the specific permission. A hidden route or client-side role is not authorisation.

Suggested permissions:

- `assessment:read`
- `assessment:edit`
- `assessment:review`
- `assessment:publish`
- `assessment:analytics`
- `media:upload`

Update validators, role mapping, audit areas, and tests together if these are added.

## 18. Analytics and item quality

### 18.1 Product metrics

- overview to quiz start rate;
- full-form start, section completion, resume, submit, and deletion rates;
- quick quiz completion rate;
- Home programme quiz completion and destination selection;
- audio load failure and save failure rate;
- median time by section and device class;
- accessibility mode usage in aggregate.

### 18.2 Item signals

After a minimum sample threshold approved by the academic lead:

- facility: proportion correct;
- omission rate;
- median response time;
- distractor selection distribution;
- transcript-supported versus audio-primary performance, reported descriptively;
- invalidation/review reports.

Do not call these item difficulty or discrimination estimates until the academic/psychometric method defines them. Do not show small-cell analytics that could expose an individual.

### 18.3 Event policy

Allowlisted events only:

- `practice_overview_viewed`
- `attempt_started`
- `section_started`
- `attempt_resumed`
- `attempt_submitted`
- `result_viewed`
- `history_deleted`
- `programme_quiz_started`
- `programme_quiz_completed`
- `programme_destination_opened`
- `media_load_failed`
- `answer_save_failed`

Do not place item text, selected answer, writing response, token, email, IP, or presigned URL in analytics payloads.

## 19. Privacy and retention implementation

### 19.1 Before collection

- Briefing names data collected, purpose, retention, and deletion path.
- Optional account/history is off by default for quick quizzes.
- Privacy policy distinguishes English Club result from official ETS data.

### 19.2 Scheduled cleanup

Use Convex scheduled internal mutations in bounded batches:

- anonymous abandoned attempts after 7 days;
- completed anonymous responses after 90 days;
- security events after 30 days;
- orphaned R2 pending uploads after 24 hours;
- daily aggregates after 13 months if owner does not renew the policy.

Every cleanup is idempotent, indexed by status/expiry, bounded, and audited at an aggregate operational level without copying deleted content to logs.

### 19.3 User deletion

- One action deletes or irreversibly disconnects learner attempt history.
- Confirmation names what will remain: de-identified aggregates and required admin/security audit metadata.
- Deletion does not require contacting a club officer if the user is signed in.
- An anonymous identity can delete the attempt it controls while its session remains available.
- Account/session/user-row cleanup created by anonymous Convex Auth is tested and disclosed before the copy promises full erasure.

## 20. Error, empty, and interrupted states

| State | Public response | Recovery |
| --- | --- | --- |
| No published form | Review-in-progress message | Use quick quiz |
| Convex unavailable before start | Do not create local fake attempt | Retry |
| Network lost during item | Keep local answer, show offline banner | Automatic reconcile |
| Answer save rejected as stale | Replace with server state, explain conflict | Let learner reselect |
| Audio not loaded | Keep prompt and controls; no autoplay loop | Retry or transcript-supported mode |
| Timer expires | Lock input, submit persisted answers | Result pending state |
| Submit request duplicated | Return existing result | Route to result |
| Form retired during attempt | Continue immutable started form | None needed |
| Invalidated item | Mark not counted with reason | Adjusted versioned result |
| Anonymous session unavailable | Do not reveal attempt existence | Start new or sign in |
| Result computation delayed | Submitted confirmation | Poll/retry status |
| Admin review queue empty | Plain queue-complete text | Create or filter items |
| R2 upload rejected | Specific type/size/key error | Choose valid file/new key |

Internal stack traces, document IDs unrelated to recovery, environment names, and R2 signed URLs never appear in public copy.

## 21. Responsive behaviour

### 21.1 320–479 px

- One content column.
- Top metadata wraps into two concise rows.
- Timer remains text, never overlays question copy.
- Answer controls use full-width 48 px minimum rows.
- Passage/audio and answer views use explicit controls instead of compressed split panes.
- Bottom action line respects `env(safe-area-inset-bottom)`.
- Question navigator opens in a portal/dialog with focus containment and body-scroll policy that does not block the page incorrectly.
- The navigator renders only the current section's bounded question set, labels the current item with `aria-current="step"`, and groups answered, flagged, and unanswered states in text as well as colour.
- Portal backdrops cannot cover the dialog action layer; mobile E2E tests use real taps plus `elementFromPoint` at each primary action to catch event interception.
- Long English words, MIC-like labels, and answer text use `min-width: 0` and safe wrapping.

### 21.2 480–879 px

- One reading column with a compact top progress rail.
- Question navigator remains a disclosure.
- Passage measure stays below 75ch.
- No fixed-height question area.

### 21.3 880 px and wider

- Main question field plus a compact navigator/section rail.
- Stimulus measure remains 65–75ch; whitespace absorbs extra width.
- Listening controls do not span the entire viewport.
- Admin bank uses dense rows or a data table with responsive column priorities, not oversized cards.

### 21.4 Orientation and resize

- Phone landscape remains operable without hiding Submit below a fixed element.
- Timer state survives resize.
- Open dialogs recalculate available height.
- Text zoom to 200% creates reflow, not horizontal scrolling.

## 22. Accessibility acceptance matrix

| Area | Requirement | Evidence |
| --- | --- | --- |
| Semantics | One `h1`; question `fieldset`/`legend`; section landmarks | DOM/ARIA test |
| Keyboard | All route, audio, answer, flag, navigator, submit controls | Playwright keyboard flow |
| Focus | Logical order; visible; not obscured by sticky controls | Axe + screenshot + computed geometry |
| Audio | No autoplay; keyboard player; transcript-supported mode | Component/E2E test |
| Time | Standard/extended/untimed before start; warnings announced | Unit + fake-clock E2E |
| Touch | Practical targets at least 44 px | Bounding-box assertions |
| Reflow | No overflow at 320 px and 200% zoom | Playwright geometry |
| Colour | 4.5:1 body, 3:1 large/UI; state not colour-only | token test + Axe/manual |
| Motion | Reduced motion removes spatial changes | media-emulation test |
| Errors | Error associated with control and summary when needed | form E2E |
| Status | Save/offline/timer/result messages announced without focus theft | screen-reader-oriented DOM assertions |
| Navigator | Current section only; `aria-current="step"`; state has a text alternative | DOM + keyboard/touch E2E |

## 23. Performance budgets

Recommended initial budgets:

- Assessment overview initial JS: reuse site shell; no editor or admin code in public bundle.
- Runner client JS: timer/audio/answer logic only; lazy-load question navigator extras.
- First public audio fetch begins only on user action or intentional section prefetch.
- Delivery audio target: voice-appropriate compression, with a per-asset size budget defined during content production.
- Send only the current section payload, not all 140 questions at once; never send answer keys before submission.
- Admin item list paginates at 25–50 rows.
- Avoid render on every timer animation frame; update visible seconds at a bounded interval.
- No scroll-linked React state or decorative canvas.

Final numeric web-vital budgets should be based on a measured route after the first vertical slice, not invented in advance.

## 24. Implementation work breakdown

### Phase 0 — decisions and safeguards

Product:

- [ ] Approve ITP Level 1-aligned scope.
- [ ] Record the fixed MVP exclusion of productive Writing from the scored form.
- [ ] Approve product and navigation names.
- [ ] Obtain trademark/legal review.
- [ ] Name academic, rights, and accessibility reviewers.
- [ ] Approve retention defaults.
- [ ] Confirm English Club programme facts.

Technical:

- [ ] Read current local Next.js 16 docs for routing, Server/Client Components, auth, data security, metadata, and forms.
- [ ] Read complete Convex generated guidance before source edits.
- [ ] Audit current admin/auth work for compatible permission extension.
- [ ] Verify the existing Convex Auth Anonymous provider, same-device session path, and anonymous auth-row cleanup.
- [ ] Decide private R2 bucket configuration.

Exit gate: no code starts until public naming, result language, construct, and content ownership have an accountable reviewer.

### Phase 1 — schema and security vertical slice

- [ ] Implement the exact normative schema in `TOEFL-TECHNICAL-ARCHITECTURE.md`: definitions, immutable versions, version checks/approvals, sections, stimuli, items, answer keys, attempts, attempt sections, responses, and immutable results.
- [ ] Add exact indexes named for all index fields.
- [ ] Add admin permissions and audit areas.
- [ ] Implement helpers for admin permission and server-derived attempt ownership.
- [ ] Implement one single-select item end to end.
- [ ] Keep scoring key in an internal-only query path.
- [ ] Add rate limiting for attempt creation/save/submit.
- [ ] Add `convex-test` coverage for unauthorised access, key privacy, stale answer revisions, and idempotent submit.
- [ ] Push only to the announced Convex development deployment after target verification.

Exit gate: one synthetic test fixture can start, save, submit, and return a raw result without exposing its key. No public content claim ships.

### Phase 2 — reusable assessment UI

- [ ] Build server-rendered overview and briefing.
- [ ] Build Answer Line shell.
- [ ] Build reusable question renderer registry by item type.
- [ ] Build answer controls with Heroicons only for symbols.
- [ ] Build progress and navigator components.
- [ ] Build save/offline status.
- [ ] Build standard/extended/untimed timer.
- [ ] Build section review and submit confirmation.
- [ ] Build result summary and review.
- [ ] Add responsive/reduced-motion CSS.

Exit gate: all fixture question types pass desktop, Pixel-class, and 320 px interaction tests without event interception.

### Phase 3 — media and Listening

- [ ] Extend R2 object/MIME validators for approved audio derivatives.
- [ ] Configure exact CORS origins for admin uploads.
- [ ] Configure private draft bucket or block confidential browser upload.
- [ ] Add admin-authorised signed PUT and verification.
- [ ] Build accessible audio player.
- [ ] Build transcript-supported mode and review transcript.
- [ ] Add load failure, expired URL, retry, and offline states.
- [ ] Add orphan upload cleanup.

Exit gate: audio upload and playback are verified through R2 without exposing credentials, signed URLs, or draft media publicly.

### Phase 4 — Home programme quiz

- [ ] Add versioned programme quiz CMS model.
- [ ] Author and approve 4–6 questions from confirmed programme content.
- [ ] Build Home interaction with local state.
- [ ] Add aggregate-only metrics.
- [ ] Test keyboard, touch, 320 px, dark theme, reduced motion, and no-JS fallback.

Exit gate: quiz contains no inferred programme fact and no persistent individual answer history.

### Phase 5 — quick quizzes

- [ ] Produce reviewed pools for all three areas.
- [ ] Add variant selection and retake rule.
- [ ] Add focused results and explanations.
- [ ] Prevent active full-form leakage according to the content policy.
- [ ] Complete cross-area E2E and accessibility coverage.

Exit gate: each area has enough reviewed items to avoid immediate identical retakes, or the UI states that the same set will repeat.

### Phase 6 — full form content and runner

- [ ] Author 140 original items plus reserve items.
- [ ] Record every source/provenance/review.
- [ ] Produce and verify all Listening audio/transcripts.
- [ ] Assemble exact blueprint.
- [ ] Run duplicate, answer-key, rights, and accessibility audits.
- [ ] Run timed dry tests on laptop and phone.
- [ ] Test resume across network interruption and browser restart.
- [ ] Publish immutable form version.

Exit gate: all 140 assigned items pass every review gate; no TODO, sample, placeholder, or unsupported claim is visible.

### Phase 7 — admin quality signals

- [ ] Add paginated item bank and review queues.
- [ ] Add blueprint coverage matrix.
- [ ] Add privacy-thresholded item signals.
- [ ] Add invalidate/adjust workflow.
- [ ] Add export of original English Club item metadata only, never user PII by default.

Exit gate: an admin can trace every published item to author, sources, approvals, media, form versions, and result impact.

### Phase 8 — launch certification

- [ ] Full lint, TypeScript, unit, Convex, component, and Playwright suites.
- [ ] Production build while preserving the existing development process.
- [ ] Axe scan all public and admin assessment routes.
- [ ] Manual screen-reader smoke test.
- [ ] Original screenshots at desktop light/dark, Pixel class, and 320 px.
- [ ] Inspect every screenshot for overflow, focus obstruction, clipping, and accidental official imitation.
- [ ] R2 CORS/upload/read/expiry evidence.
- [ ] Convex cloud function and schema verification.
- [ ] Rights, trademark, academic, privacy, and accessibility sign-off recorded.
- [ ] Update PLAN, PRD, BLUEPRINT, DATABASE, DESIGN, DESIGN-SYSTEM, SETUP/R2, WORKLOG, and QA documentation.

## 25. Test plan

### 25.1 Unit

- validators for every item discriminated union;
- option/key set equality;
- score denominator and omission handling;
- skill tag threshold;
- timer calculation and rounding;
- extended-time multiplier;
- stale client revision rejection helper;
- result copy never contains official scale claims;
- programme quiz local result;
- R2 object key/MIME/size rules.

### 25.2 Convex

- draft forms unavailable publicly;
- published question payload excludes keys, explanations before submit, admin notes, and provenance internals;
- unauthenticated caller cannot read another attempt;
- one anonymous Convex Auth identity cannot access another identity's attempt;
- user ID argument cannot impersonate an owner;
- response upsert remains unique;
- stale saves cannot overwrite newer answers;
- form version persists through retirement;
- submit twice returns one result;
- client-provided score fields are impossible by validator;
- expiry is idempotent;
- item invalidation creates a versioned adjustment;
- admin permission matrix enforced;
- publication blocks incomplete counts/reviews/media;
- paginated admin lists preserve order and cursors;
- cleanup deletes only expired bounded batches.

### 25.3 Component

- each item type with keyboard and pointer;
- no auto-advance on select;
- focus moves only on explicit navigation;
- save/offline live-region behaviour;
- audio player keyboard and transcript mode;
- question navigator open/close/focus return;
- submit confirmation with unanswered items;
- reduced motion.

### 25.4 E2E

Public:

- Home programme quiz complete/reset;
- overview links and limitation visible in server HTML;
- full attempt start, answer, flag, navigate, section review, submit, result, review;
- standard, extended, and untimed modes;
- listening-primary and transcript-supported modes;
- offline answer queue and reconnect;
- refresh/resume;
- duplicate submit;
- timer expiry with fake clock;
- deleted history inaccessible;
- 320 px/no horizontal overflow;
- touch target geometry and `elementFromPoint` centre checks;
- theme and reduced motion;
- Axe A/AA.

Admin:

- unauthorised route and function rejection;
- author item, request changes, approve gates, assemble form;
- publish blocked on missing transcript/key/review/count;
- signed upload exact type and expired URL recovery;
- publish and retire immutable form;
- paginated item bank and filters with reusable custom selects;
- keyboard reorder alternative;
- audit event visible.

### 25.5 Content QA

- exact item counts and section order;
- duplicate prompt/stimulus similarity review;
- every option non-empty and unique within item;
- every key belongs to the item;
- one key for single-select;
- explanations prove keys;
- transcripts match final delivery audio;
- names/pronunciations reviewed;
- rights/provenance complete;
- forbidden trademark/logo/copied-direction scan;
- public forbidden-copy scan for `official score`, `predicted TOEFL score`, `ETS approved`, `certificate`, placeholder/test harness language.

## 26. Definition of done

The feature is done only when:

- [ ] The product is clearly sourced from English Club.
- [ ] Every TOEFL reference has current legal/trademark approval and notice placement.
- [ ] Public content is original and its provenance is reviewable.
- [ ] Full form contains 50 + 40 + 50 approved items and uses the declared timer.
- [ ] No public or API response calls raw performance an official/predicted TOEFL score or CEFR level.
- [ ] Keys and draft content never appear in public pre-submission payloads.
- [ ] Standard, extended, untimed, and transcript-supported choices work as documented.
- [ ] Resume, offline queue, expiry, and duplicate submission are deterministic.
- [ ] Home programme quiz uses confirmed facts only and stores no individual history by default.
- [ ] Admin authoring, four review gates, immutable publication, retirement, and audit work.
- [ ] R2 upload, verification, private draft delivery, public published delivery, and cleanup are proven.
- [ ] All controls work at desktop, Pixel-class mobile, and 320 px by touch and keyboard.
- [ ] Reduced motion, 200% zoom, focus, audio alternative, and timing access pass.
- [ ] No error state shows a secret, token, signed URL, internal stack, or another learner's attempt.
- [ ] Automated suites and inspected screenshots are recorded in the QA report.
- [ ] Normative project documents match the implemented schema and copy.

## 27. Risk register

| Risk | Probability | Impact | Mitigation | Release gate |
| --- | --- | --- | --- | --- |
| Users read result as official prediction | High | High | Rename product/result; adjacent limitation; no official scale | Copy/legal review |
| Mixing ITP and current iBT constructs | High | High | Lock ITP-aligned blueprint; separate productive Writing/iBT roadmap | Academic review |
| Copyrighted questions enter bank | Medium | High | Provenance, originality declaration, rights review, similarity scan | Rights gate |
| Trademark presentation implies ETS association | Medium | High | English Club primary brand, no ETS assets, approved notice/review | Legal gate |
| Answer keys leak in public query | Medium | High | Internal table/function, public view validators, security tests | Backend test |
| Public R2 domain exposes drafts | High with one bucket | High | Separate private bucket/signed GET; publication-only public keys | Media architecture gate |
| Audio inaccessible | Medium | High | Transcript-supported mode, accessible player, failure fallback | Accessibility gate |
| Long attempt loses answers | Medium | High | per-answer persistence, revisioning, offline queue, resume tests | Reliability gate |
| Timer unfair under disconnect | Medium | Medium | visible policy, server deadline, untimed mode, reconciliation tests | UX gate |
| 140-item content cost delays launch | High | Medium | ship Home/quick verticals first; never fake complete form | Content gate |
| Admin publishes incomplete form | Medium | High | server-side exact blueprint/review/media checks | Publication test |
| Analytics becomes learner surveillance | Low/Medium | High | allowlist, aggregation, thresholds, retention, deletion | Privacy review |
| Mobile overlay intercepts actions | Medium | High | portal/z-index contract, real taps, `elementFromPoint` tests | E2E gate |
| R2 free allowance exceeded | Low initially | Medium | media budget, dashboard alerts, lifecycle cleanup; free tier not cap | Operations review |

## 28. Open decisions and deadlines

| Decision | Owner needed | Recommended answer | Must be settled before |
| --- | --- | --- | --- |
| Is productive Writing part of the MVP result? | Product + academic | No. Use objective Structure & Written Expression in the full form; consider productive Writing only in a separately reviewed later phase | Roadmap change |
| Is the complete form Level 1-aligned? | Product + academic | Yes, 140/115 | Blueprint |
| Can the TOEFL mark appear in main navigation? | Legal/product | Only informationally after ETS-guideline review | Public navigation |
| Are learners allowed anonymous full attempts? | Product/privacy/security | Yes, invisible same-device Convex Auth Anonymous identity; named account optional | Attempt auth |
| How many replays in listening-primary mode? | Academic/accessibility | One default plus transcript-supported alternative; validate in pilot | Audio UI/content |
| Is standard mode pausable? | Product/accessibility | No; offer convert-to-untimed with clear result mode | Timer implementation |
| Private R2 bucket available? | Infrastructure | Yes | Draft media upload |
| Who signs academic/rights/accessibility reviews? | Club leadership | Named people, separate recorded decisions | Content authoring |
| What programmes exist on Home quiz? | Club leadership | Only current verified CMS entries | Home quiz publication |
| Retention defaults approved? | Privacy/product | 7/90/365-day plan from research | First real attempt |

## 29. First implementation sprint after approvals

The safest first sprint is a vertical slice, not the 140-item bank:

1. Add the neutral assessment data model and security helpers.
2. Create one synthetic test-only Reading item in `convex-test`, never public seed data.
3. Prove public payload privacy, answer save revisioning, idempotent submit, and raw result.
4. Build the overview, briefing, one single-select runner, and result on the existing brand system.
5. Test keyboard, real mobile tap, 320 px, reduced motion, Axe, and offline save state.
6. Review the slice for official-test imitation, false score language, and mobile overlays.
7. Fix findings before adding new item types, audio, or content.

This slice retires the highest technical risks early while the academic team works on original content and review ownership.

## 30. Research anchors

- [ETS TOEFL ITP Test Taker Handbook](https://www.ets.org/content/dam/ets-org/pdfs/toefl-itp-test-taker-handbook.pdf)
- [ETS current TOEFL iBT content and structure](https://www.ets.org/content/ets-org/language-master/in/home/toefl/institutions/ibt/about/content-structure.html)
- [ETS 2026 TOEFL iBT test specifications](https://www.eu.ets.org/pdfs/toefl/toefl-enki-test-specifications-2026.pdf)
- [ETS 2026 score-scale technical report](https://www.ets.org/content/dam/ets-india/pdfs/toefl/score-scale-update-2026.pdf)
- [ETS trademark guidelines](https://www.ets.org/legal/trademarks.html)
- [ETS TOEFL licensing policy](https://www.ets.org/legal/permissions/licensing.html)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Convex paginated queries](https://docs.convex.dev/database/pagination)
- [Convex auth in functions](https://docs.convex.dev/auth/functions-auth)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
