# Four-Skill Practice Implementation

Status: implemented internal contract; public release gates remain open, 26 August 2026
Target: Convex dev deployment `perfect-greyhound-270` only
Public storage: Cloudflare R2 through `https://r2.mukhtada.my.id`

## Outcome

English Club will publish one full four-skill practice form and four short forms. The full form follows the public 2026 iBT task families and counts, but uses original English Club material and a fixed linear sequence. It returns an exact English Club practice result plus two estimates:

- a section and overall band on the current 1–6 reporting shape;
- a comparable 0–30 section and 0–120 total estimate.

Neither estimate is an ETS score. The interface and result record must state that fact wherever a learner can reasonably mistake the result for official evidence.

Legacy `ec-itp-level-1-aligned-v1` records remain `raw-objective` and keep the existing raw-result disclaimer. The estimate disclaimer is reserved for `ec-ibt-style-2026-v1`; applying it to a legacy result is a contract bug, not a copy refresh.

## Evidence ledger

### Current public test structure

ETS describes the test used after 21 January 2026 as a four-skill test with Reading, Listening, Writing, and Speaking. Its public structure page reports these base counts and times:

| Section | Public task count | Base time | Public task families |
| --- | ---: | ---: | --- |
| Reading | 50 items | 30 minutes | Complete the Words; Read in Daily Life; Read an Academic Passage |
| Listening | 47 items | 29 minutes | Listen and Choose a Response; Conversation; Announcement; Academic Talk |
| Writing | 12 tasks | 23 minutes | Build a Sentence; Write an Email; Write for an Academic Discussion |
| Speaking | 11 tasks | 8 minutes | Listen and Repeat; Take an Interview |

Source: [ETS TOEFL iBT content and structure](https://www.ets.org/content/ets-org/language-master/in/home/toefl/institutions/ibt/about/content-structure.html).

The public 2026 test specification gives a more useful scoring blueprint:

- Reading: 50 items, 35 available raw points, two-stage adaptive delivery.
- Listening: 47 items, 35 available raw points, two-stage adaptive delivery.
- Writing: 10 Build a Sentence items plus two constructed responses, 20 available raw points.
- Speaking: seven Listen and Repeat tasks plus four Take an Interview tasks, 55 available raw points.

Source: [ETS TOEFL 2026 test specifications PDF](https://www.eu.ets.org/pdfs/toefl/toefl-enki-test-specifications-2026.pdf).

### Current public score reporting

ETS reports four section bands and an overall band from 1 to 6 in half-band increments. The overall band is the average of the four section bands rounded to the nearest half band. During the stated transition, score reports also include a comparable 0–120 total.

Sources: [ETS score scale update](https://www.eu.ets.org/toefl/institutions/ibt/score-scale-update.html) and [ETS understanding scores](https://www.ets.org/toefl/test-takers/ibt/scores/understand-scores.html).

### Claims we cannot make

The public sources do not publish an exact raw-answer-to-reported-score algorithm for an arbitrary fixed form. Reading and Listening are adaptive. Official productive responses are evaluated with proprietary scoring systems and trained review processes. ETS also warns that its comparison tables cannot predict an individual score exactly.

Therefore this project will not use the labels “official score,” “actual TOEFL score,” “prediction certificate,” or “admission score.” The application computes a real and reproducible result for this bank, but its external-scale values are estimates.

## Product contract

### Public routes

- `/practice`: catalogue and evidence boundary.
- `/practice/full`: full four-skill briefing.
- `/practice/quick/listening`: short Listening form.
- `/practice/quick/reading`: short Reading form.
- `/practice/quick/writing`: short Writing form.
- `/practice/quick/speaking`: short Speaking form.
- `/practice/attempt/[attemptId]`: owned attempt runner.
- `/practice/result/[attemptId]`: immutable result and paginated review.

### Full form

Working title: **English Club Four-Skill Practice Form 1**.

The form is fixed rather than adaptive. It preserves the public section order, counts, task families, and base section times so the session length and task rhythm are recognisable. Every prompt, passage, conversation, option, explanation, and response example is original to this repository.

| Section | Count | Time | English Club raw points |
| --- | ---: | ---: | ---: |
| Reading | 50 | 30 min | 35 |
| Listening | 47 | 29 min | 35 |
| Writing | 12 | 23 min | 20 |
| Speaking | 11 | 8 min | 55 |
| Total | 120 | 90 min plus directions | 145 |

Reading and Listening points are weighted because the public specification has fewer raw points than item presentations. These weights belong only to this form. They do not reconstruct adaptive calibration.

### Quick forms

| Form | Item/task count | Target time | Coverage |
| --- | ---: | ---: | --- |
| Listening | 8 | 7 min | response choice, conversation, announcement |
| Reading | 8 | 8 min | word completion, daily text, academic text |
| Writing | 5 | 10 min | three sentence builds, email, discussion |
| Speaking | 4 | 5 min | two repeats, two interview responses |

Quick results show a section estimate only. A single short form must never manufacture an overall four-skill band or 0–120 total.

## Question-bank structure

The source bank is a typed, versioned module. Stable keys identify definitions, sections, stimuli, items, and answer keys. The seed mutation converts those keys to Convex IDs in one transaction.

### Full Reading bank

- 10 Complete the Words items.
- 10 questions across practical notices, messages, schedules, or short public information.
- 30 questions across original academic passages.

### Full Listening bank

- 20 Listen and Choose a Response items.
- 12 questions across four conversations.
- 5 questions across announcements.
- 10 questions across two academic talks.

Audio is generated from the original scripts, uploaded to the public R2 assessment derivative path, recorded in `mediaAssets`, and connected to its version and stimulus. Every audio stimulus retains a transcript. Transcript support permanently labels the attempt and result.

### Full Writing bank

- 10 Build a Sentence items, scored exactly.
- 1 Write an Email task, scored against a server-side five-point practice rubric.
- 1 Academic Discussion task, scored against the same five-point practice rubric.

### Full Speaking bank

- 7 Listen and Repeat tasks. The browser can record a rehearsal locally; the learner submits a transcript for scoring. Sequence coverage is scored on a five-point server rubric.
- 4 Interview tasks. The browser can record a rehearsal locally; a submitted transcript is scored on task coverage, development, sentence control, and lexical range.

Audio recordings are not uploaded in this release. The UI must say that the microphone rehearsal stays in the current browser tab. The score cannot assess pronunciation, intonation, or actual delivery fluency, so Speaking confidence is low.

## Data changes

All schema changes are additive so existing three-section practice records remain valid.

### Validators

- Add profile `ec-ibt-style-2026-v1`.
- Add skills `writing` and `speaking`.
- Add score policy `practice-estimate-v1`.
- Add item type `constructed-response` with mode, word limits, and optional preparation/response limits.
- Add response kind `text`.
- Add answer-key kind `text-rubric` with private target terms, sample response, minimum words, and five-point maximum.
- Add optional numeric point weight to objective answer keys.

### Results

`assessmentResults` gains optional estimate fields:

- scoring model;
- weighted earned and possible points;
- overall band estimate;
- comparable total estimate;
- confidence.

`assessmentSectionResults` gains optional weighted points, band estimate, comparable 0–30 estimate, and confidence.

Old results continue to project with `estimate: null`.

## Scoring contract

### Objective tasks

Single choice, multiple select, cloze, and sentence build continue to use exact server-side keys. A correct response earns the private key’s point weight; an incorrect or omitted response earns zero.

### Constructed Writing and Interview tasks

The server normalises plain text, then computes a bounded five-point practice score from:

- minimum completion;
- coverage of task-specific concepts;
- sentence development;
- lexical variety.

The algorithm ignores HTML and does not call an external model. Target-term repetition alone cannot receive full credit. The result page identifies this as a rule-based practice rubric.

### Listen and Repeat tasks

The server compares the submitted transcript to the original phrase using token coverage and word-order similarity. It rounds to half-point increments from 0 to 5. This checks recall of the phrase, not speech quality.

### Section estimates

1. Calculate `ratio = earnedPracticePoints / possiblePracticePoints`.
2. Calculate a transparent comparable section estimate: `round(ratio × 30)`.
3. Convert that number to a 1–6 half-band using the public ETS comparison thresholds for the matching skill.
4. For a four-section result only, average the four bands and round to the nearest 0.5.
5. Sum the four comparable section estimates for the displayed 0–120 estimate.

This model is deterministic and testable. It is not an ETS conversion and has no psychometric calibration.

### Unresolved psychometric risk

The linear point ratio, public comparison thresholds, and rule-based productive-response rubric do not establish reliability, validity, standard error, or individual score predictiveness. The values may be described only as estimates for this original fixed form. Public copy must not call them an official score, a predicted TOEFL score, an equivalent score, a certificate, or admission evidence. Any stronger claim requires a separate calibration study and accountable psychometric review; a disclaimer cannot cure a stronger headline.

### Confidence

- Reading and Listening: `moderate`, because responses are objective but the fixed form is not calibrated or adaptive.
- Writing: `low`, because the rule-based rubric cannot reproduce official response scoring.
- Speaking: `low`, because the submitted transcript does not measure audio delivery.
- Overall: `low` whenever either productive section is present.

## Seed workflow

1. `assessmentSeed.prepareIbtPractice` verifies the confirmation phrase and finds an active admin author through bounded indexes.
2. It checks the five deterministic slugs and content checksum.
3. In one transaction it inserts each missing definition, published version, sections, stimuli, items, and answer keys.
4. A rerun returns the existing IDs when the checksum matches. A slug collision with a different checksum fails instead of overwriting editor work.
5. The local audio pipeline generates MP3 derivatives in a temporary directory, uploads them to the configured public R2 bucket, and sends only metadata to `assessmentSeed.attachPublicAudio`.
6. The attach mutation verifies version, stimulus, checksum, byte size, duration, object key, access, and purpose before upserting `mediaAssets` and linking stimuli.
7. A bounded verification query returns counts by definition, section, item type, skill, audio readiness, and point total.

The seed functions are internal. The runbook names the dev deployment explicitly and forbids running this seed against production.

## UI changes

- Catalogue: four quick routes and a visible full-form duration.
- Briefing: four skill labels, fixed-form/adaptivity note, result-estimate explanation.
- Runner: reusable long-text response, live word count, local microphone rehearsal, generated/public audio fallback, and hidden transcript until support is enabled.
- Result: weighted practice points, section bands, comparable section estimates, overall band/0–120 estimate only for four-skill results, confidence labels, and plain-language limitations.
- Review: constructed responses show the submitted response and an example response, not “correct/incorrect” language.
- Mobile: no horizontal overflow at 320, 412, and 518 pixels; all touch targets at least 44 pixels; dialogs and question navigator retain focus containment.
- Motion: only short opacity/transform state transitions and no essential scroll-driven behaviour; reduced-motion users receive immediate state changes.

## Verification checklist

### Pure and unit tests

- [ ] Bank has exactly 120 full items and correct per-section counts.
- [ ] Full raw-point maxima are 35, 35, 20, and 55.
- [ ] Quick forms remain within 3–12 items.
- [ ] Every item key, stimulus key, section key, and definition slug is unique.
- [ ] Every option answer exists in its item.
- [ ] Text normalisation enforces length bounds and plain text.
- [ ] Repeat similarity, writing rubric, threshold mapping, rounding, and four-band average have boundary tests.
- [ ] No quick form receives an overall estimate.

### Convex tests

- [ ] Existing ITP records and raw-objective results still work.
- [ ] Text responses cannot cross owner, version, section, or item boundaries.
- [ ] Answer keys never reach the player query.
- [ ] Seed rerun is idempotent; mismatched checksum fails closed.
- [ ] Finalisation writes immutable weighted result fields.
- [ ] Reading/Listening objective confidence and productive-section low confidence are correct.
- [ ] Audio attachment rejects wrong version, private access, bad checksum, and non-assessment object keys.

### Browser tests

- [ ] Full and each quick briefing can start an anonymous owned attempt.
- [ ] Radio, cloze, sentence build, writing, speaking rehearsal, flag, navigator, timer, save conflict, section finish, and result flow work.
- [ ] Transcript enablement is permanent and reflected in the result label.
- [ ] Keyboard, touch, focus return, reduced motion, Axe, console errors, and overflow pass at desktop, Pixel 7, and 320 pixels.
- [ ] Result page never contains an official-score or certificate claim.

### Live dev verification

- [x] Convex codegen/typecheck passes before push.
- [x] Target announcement names `perfect-greyhound-270` before the deployment-affecting command.
- [x] Five published definitions appear in the live development catalogue.
- [x] The seed verifier reports all 52 required audio derivatives ready. The public bucket and custom-domain delivery checks pass without printing credentials.
- [ ] A real anonymous browser attempt reaches a saved result.
- [x] Port 3987 remains alive throughout.
