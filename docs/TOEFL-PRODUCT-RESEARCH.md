# TOEFL® Test Preparation Product Research

> Historical research decision (25 August 2026): this ITP-oriented recommendation predates the separate four-skill implementation request. Current behavior is specified in [`PRACTICE-IBT-IMPLEMENTATION.md`](PRACTICE-IBT-IMPLEMENTATION.md); the evidence and warnings here still govern trademark use, content rights, and unsupported score claims.

- Status: product direction for review
- Research cut-off: 25 August 2026
- Scope: new assessment area and a short English Club programme quiz on Home
- Implementation constraint: Next.js 16.3.2, Convex cloud, Cloudflare R2

## 1. Decision summary

The requested three-part product is closest to the TOEFL ITP Level 1 structure, not the current TOEFL iBT test. TOEFL ITP Level 1 has Listening Comprehension, Structure and Written Expression, and Reading Comprehension. The current TOEFL iBT test has Reading, Listening, Writing, and Speaking, is adaptive in Reading and Listening, and reports scores on a 1–6 scale.

The first release should therefore be positioned as **English Club Assessment Lab**, with **TOEFL® test preparation** used only as an informational navigation label after trademark review. Its complete assessment should be described as an **original, ITP Level 1-aligned practice assessment**. It must not claim to be a TOEFL test, a TOEFL Prediction test, an official simulation, or an ETS score report.

The result should report:

- questions answered and correct;
- accuracy by section and skill tag;
- time used;
- questions to review;
- a plain explanation that the result is for practice and cannot be sent to an institution.

The result should not report 310–677, 0–120, 1–6, a CEFR level, a pass/fail verdict, or an admission recommendation. Those outputs require evidence that this project does not have: licensed or demonstrably independent content, representative field-test data, form linking, reliability analysis, standard setting, and independent psychometric review.

“Writing” needs an explicit product decision. In the ITP-aligned path it should be renamed **Structure & Written Expression** because it measures recognition of grammar and standard written English; it is not essay writing. If the user intends productive writing, it should become a separate **Writing practice** experience inspired by current academic communication tasks, with human or self-review and no automatic overall score in the MVP.

## 2. Research method

This research uses primary or standards-owner sources only:

- ETS pages and ETS technical documents for test structure, scores, use, intellectual property, and trademarks;
- W3C WCAG 2.2 material for accessibility;
- OWASP guidance for authentication, sessions, and logging;
- Convex documentation and the repository's generated Convex 1.45 guidance for data design;
- Cloudflare documentation for R2 uploads, CORS, lifecycle, and pricing.

Each conclusion below is labelled as one of:

- **Observation** — stated in or directly supported by a source or the repository.
- **Inference** — a product or technical conclusion derived from observations.
- **Recommendation** — a proposed decision that still belongs to the English Club product owner.

No third-party preparation blog, score calculator, commercial “prediction” provider, or copied question bank is treated as evidence.

## 3. What the official products measure

### 3.1 TOEFL ITP Level 1

**Observation.** ETS lists the following Level 1 structure:

| Section | Questions | Administration time | Official section scale |
| --- | ---: | ---: | ---: |
| Listening Comprehension | 50 | 35 minutes | 31–68 |
| Structure and Written Expression | 40 | 25 minutes | 31–68 |
| Reading Comprehension | 50 | 55 minutes | 31–67 |
| Total | 140 | 115 minutes | 310–677 |

Source: [ETS TOEFL ITP Test Taker Handbook](https://www.ets.org/content/dam/ets-org/pdfs/toefl-itp-test-taker-handbook.pdf).

**Observation.** ETS describes Structure and Written Expression as recognition of selected structural and grammatical points in standard written English. It does not assess an authored essay in this three-section form.

**Observation.** ETS says ITP scores are provided for an institution's internal use and are not shared with other institutions. ETS research also says ITP tests are not fully secure and should not be used for admission in the same way as TOEFL iBT scores. Sources: [ETS ITP administration](https://www.ets.org/toefl/itp/administration.html) and [ETS research on ITP score mapping](https://www.ets.org/Media/Research/pdf/RM-11-33.pdf).

**Inference.** A club-built three-section assessment can be structurally inspired by ITP Level 1, but it cannot inherit the meaning, security, score conversions, or institutional use of an administered TOEFL ITP test.

### 3.2 TOEFL ITP Level 2

**Observation.** ETS lists 30 Listening questions in 22 minutes, 25 Structure and Written Expression questions in 17 minutes, and 40 Reading and Vocabulary questions in 31 minutes. The total is 95 questions in 70 minutes with an official scale of 200–500. Source: [ETS TOEFL ITP test content](https://www.in.ets.org/toefl/itp/test-content.html).

**Inference.** Level 2 is a possible lower-content pilot, but describing it as “complete prediction” would conflict with a product that has otherwise promised the Level 1-aligned 140-question form. It is better kept as a later “foundation form” or an internal content rehearsal.

### 3.3 Current TOEFL iBT after 21 January 2026

**Observation.** The current test has four sections and an approximate base time of two hours. ETS lists:

| Section | Current task types | Base items | Approx. base time |
| --- | --- | ---: | ---: |
| Reading | Complete the Words; Read in Daily Life; Read an Academic Passage | 50 | 30 minutes |
| Listening | Listen and Choose a Response; Conversation; Announcement; Academic Talk | 47 | 29 minutes |
| Writing | Build a Sentence; Write an Email; Write for an Academic Discussion | 12 | 23 minutes |
| Speaking | Listen and Repeat; Take an Interview | 11 | 8 minutes |

Reading and Listening use lower and upper modules, so the operational item count and time can vary. Sources: [ETS current iBT content and structure](https://www.ets.org/content/ets-org/language-master/in/home/toefl/institutions/ibt/about/content-structure.html) and [ETS 2026 test specifications](https://www.eu.ets.org/pdfs/toefl/toefl-enki-test-specifications-2026.pdf).

**Observation.** Official section and overall scores use 1–6 in half-band increments. The overall score is the average of the four section scores rounded to the nearest half band. During a two-year transition after January 2026, official reports also include a comparable overall 0–120 estimate. Source: [ETS understanding TOEFL scores](https://www.ets.org/toefl/test-takers/ibt/scores/understand-scores.html).

**Observation.** ETS maps official 1–6 band scores to CEFR through content alignment, standard-setting studies, field-test data, and score linking. The 2026 technical report describes samples of approximately 500 Writing test takers and 700 Speaking test takers for part of this work. Source: [ETS TOEFL iBT score scale update technical report](https://www.ets.org/content/dam/ets-india/pdfs/toefl/score-scale-update-2026.pdf).

**Inference.** A three-section club quiz cannot produce a current iBT overall estimate: Speaking is absent, productive Writing needs evaluated responses, Reading and Listening are adaptive, and the project has no calibrated item bank or routing model.

## 4. What “TOEFL Prediction” can honestly mean

“Prediction” is not a neutral product label. A user is likely to understand a number shown after a full-looking test as an estimate of an official score. That inference becomes stronger when the interface copies an official section order, timer, score range, or visual identity.

For this project, an honest meaning is:

> An original English practice assessment that samples skills associated with academic Listening, grammar and written expression, and Reading. Its result describes performance on this form only. It is not an ETS test and does not predict an official TOEFL score.

Recommended public terms:

| Requested term | Recommended public term | Reason |
| --- | --- | --- |
| Complete TOEFL Prediction | Full practice assessment | Describes the action without promising an official-score prediction |
| TOEFL quiz | Academic English quick quiz | Keeps the test-maker's mark out of the product name |
| Writing quiz, ITP path | Structure & Written Expression | Matches the construct being practised |
| Predicted score | Practice result | Does not borrow an official scale |
| TOEFL certificate | Completion summary | Cannot be presented to an institution |
| Simulation | Timed practice | Avoids claiming operational equivalence |

If the owner requires the word “prediction” in navigation, use **Practice estimate** in the interface and put the limitation beside the start action, not behind an information icon. A result must repeat the limitation.

### 4.1 Score boundary

The MVP may calculate exact arithmetic on its own items:

- raw correct count;
- raw answered count;
- percentage accuracy, with the denominator visible;
- skill-tag breakdown only when a tag has enough items to be meaningful;
- elapsed or active time;
- item review state.

It may not calculate:

- official or predicted TOEFL ITP section scores;
- an official or predicted TOEFL iBT band;
- a 0–120 equivalent;
- a CEFR level;
- a “likely admission score”;
- pass/fail, because ETS does not set a universal passing TOEFL score and institutions set their own requirements.

### 4.2 Future calibrated estimate gate

A future estimate is a separate research programme, not a formatting change. Before it can ship, require all of the following:

1. A written construct definition and test blueprint.
2. Original or licensed items with provenance.
3. Expert review for content, language, bias, and answer-key uniqueness.
4. Pilot administration to an appropriate, consented sample.
5. Item analysis, reliability estimates, and standard error of measurement.
6. Multiple forms with documented linking or equating.
7. A versioned scoring model that can be reproduced.
8. External psychometric review.
9. Legal review of every TOEFL trademark reference.
10. A result shown as a range with confidence and method, never as an official score.

Until those gates pass, the schema should call the field `practiceResult`, not `predictedScore`.

## 5. Trademark and copyright constraints

### 5.1 Trademark observations

ETS states that:

- TOEFL and TOEFL iBT are registered trademarks;
- a third party must not imply endorsement, sponsorship, or association;
- its own brand must be visibly the source of the product;
- an ETS trademark may not be part of the third party's company or product name, logo, domain name, social username, or advertising keyword;
- ETS logos, product logos, and graphics may not be used;
- the mark should be used as a proper adjective followed by a generic term;
- the first prominent use on each web page should carry the registry symbol;
- a site referencing the mark should carry a visible non-endorsement notice at the bottom of each page;
- ETS asks to review proposed material using its trademark.

Source: [ETS Guidelines for Proper Informational Use of ETS Trademarks](https://www.ets.org/legal/trademarks.html).

### 5.2 Copyright observations

ETS states that TOEFL materials are protected by copyright, reproduction requires a licence, and it does not grant permission to post TOEFL materials on third-party websites. Permission requests for copyrighted test questions and other material must be made in writing. Sources: [ETS TOEFL licensing policy](https://www.ets.org/legal/permissions/licensing.html) and [ETS permission request process](https://www.ets.org/legal/permissions/how-to-request.html).

### 5.3 Product policy

- Write every stimulus, item, option, answer key, explanation, direction, rubric, transcript, and audio script from scratch.
- Do not paste, translate, paraphrase closely, screenshot, trace, scrape, or upload ETS questions or directions.
- Do not reproduce official scoring rubrics or conversion tables inside the application without permission.
- Do not use an ETS logo, the Eight-Point logo, official test UI, or colour treatment that implies association.
- Do not name the product “TOEFL Prediction” or place TOEFL inside the English Club logo.
- Keep a provenance record for every item and source text.
- When a stimulus uses public facts, cite the fact source internally and write a new passage; facts are not a licence to copy expression.
- Require a similarity and rights review before publication.
- Get trademark/legal review before a public route uses the mark. This document is product research, not legal advice.

Recommended notice for legal review, based on the structure ETS supplies for third-party materials:

> TOEFL® is a registered trademark of ETS. This English Club practice product is not endorsed or approved by ETS.

The final wording and placement must be approved by the product owner and legal reviewer against the current ETS guideline.

## 6. User intent and personas

### 6.1 Prospective member on a phone

**Situation.** A student opens a link between classes and wants to understand what English Club does.

**Intent.** Try a short, low-pressure activity and find a relevant club programme.

**Success.** The Home quiz takes no more than three minutes, works without sign-in, explains every answer, and ends with one useful programme link.

### 6.2 Student checking academic English habits

**Situation.** A learner has 5–10 minutes and does not want a two-hour commitment.

**Intent.** Practise one area and know what to study next.

**Success.** A six-to-ten-item quiz starts quickly, saves no personal history by default, and gives item-level explanations after submission.

### 6.3 Student preparing for a longer timed session

**Situation.** A learner wants a realistic period of sustained concentration.

**Intent.** Complete an original three-section practice form and resume safely if the network drops.

**Success.** Expectations, duration, accessibility mode, pause policy, and result limits are clear before starting. Progress is durable and submitting twice cannot create two results.

### 6.4 Academic coordinator or item writer

**Situation.** An authorised club administrator creates and reviews content.

**Intent.** Build a form whose blueprint, rights, answer key, and accessibility assets are complete.

**Success.** Draft content cannot leak into the public bank; one person cannot silently write, approve, and publish a high-impact form without an audit record.

### 6.5 Club leader reading programme interest

**Situation.** A coordinator wants to know which programmes visitors are exploring.

**Intent.** See useful aggregate demand without collecting unnecessary identities or free text.

**Success.** The dashboard reports starts, completions, and chosen programme links above a privacy threshold. It does not expose individual browsing histories.

## 7. Recommended product taxonomy

### 7.1 Public navigation

Use a top-level menu labelled **TOEFL® test preparation** only after trademark review. To keep the English Club identity prominent, the destination page title should be **English Club Assessment Lab**.

Suggested menu:

- Assessment Lab
- Full practice assessment
- Quick Listening
- Quick Structure & Written Expression
- Quick Reading

The route path should use the English Club product, such as `/practice`, rather than putting the ETS mark in the product slug.

### 7.2 Home programme quiz

Add a short section titled **What happens at English Club?** It should be a programme orientation quiz, not a language score.

Recommended rules:

- 4–6 questions;
- only confirmed programme facts managed in the CMS;
- one question at a time, with normal Back and Next controls;
- untimed;
- no sign-in;
- no persistent answer history by default;
- explanation and source programme link after each answer or at the end;
- a result framed as “details understood,” not ability, level, or fit;
- no streaks, leaderboards, confetti, or fake programme claims.

The repository does not contain a confirmed programme catalogue. Publication is blocked until an authorised content owner supplies and approves those facts.

## 8. MVP recommendation

The MVP is bounded to four public experiences and one admin content workflow.

### 8.1 Public MVP

1. Assessment Lab overview with honest scope and preparation paths.
2. One complete original ITP Level 1-aligned practice form: 50 Listening, 40 Structure and Written Expression, and 50 Reading items, 115-minute standard timer.
3. Three quick quizzes with 6–10 items each, drawn from separate published item pools.
4. One 4–6-question Home programme quiz using verified English Club content.
5. Result and review pages using raw performance only.

### 8.2 Admin MVP

1. Create stimuli, items, options, explanations, and skill tags.
2. Upload and verify audio plus transcripts.
3. Assemble versioned forms against a blueprint.
4. Review rights, accuracy, bias, accessibility, and answer-key uniqueness.
5. Publish or retire a form without mutating completed attempts.
6. View aggregate completion and item-quality signals.

### 8.3 Explicit MVP exclusions

- official or predicted TOEFL scores;
- CEFR placement;
- adaptive routing;
- Speaking recording or automated scoring;
- automated essay scoring;
- camera, microphone, screen recording, browser lockdown, or live proctoring;
- certificates represented as externally valid;
- public leaderboards, streaks, or social comparison;
- question imports from ETS or commercial preparation products;
- generative AI publishing items without human review;
- full offline download of the assessment bank.

## 9. Accessibility findings and policy

### 9.1 Standards observations

WCAG 2.2 requires an alternative for prerecorded audio-only content, keyboard operation, a meaningful focus order, visible focus, reflow, and adjustable timing unless a timing exception applies. WCAG 2.2 AA also sets a 24-by-24 CSS pixel minimum target rule with exceptions; this project should retain its stricter 44-pixel practical touch target. Sources: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [W3C audio-only guidance](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded), [W3C timing guidance](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html), and [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### 9.2 Listening without hiding access

Provide two declared modes before a Listening attempt:

- **Listening mode** — audio is the primary stimulus; a transcript becomes available during review.
- **Transcript-supported mode** — the equivalent transcript is available during the question. The result records the mode but does not penalise or shame the learner.

This is a product recommendation, not a claim of equivalence to an official test accommodation. It makes the content usable while preserving an honest distinction between listening-only and reading-supported practice.

Additional requirements:

- audio never autoplays;
- a learner may open the transcript during any Listening question; doing so changes the recorded mode to transcript-supported before the text is revealed and never discards the current answer;
- Play, Pause, replay count, elapsed time, duration, and volume are operable by keyboard and touch;
- screen readers receive a useful audio label and state announcement;
- waveform art is decorative and not the only timeline;
- a failed audio load exposes Retry and transcript-supported continuation;
- controls remain usable at 320 px and 200% text zoom;
- reduced motion removes spatial question transitions;
- time-warning changes are announced once and never only by colour.

### 9.3 Timer accessibility

Before starting, offer:

- standard timed practice;
- extended-time presets owned by the learner;
- untimed learning mode.

Results identify the selected mode. The product must not imply that an untimed or transcript-supported result is an official comparison. Timer changes are locked after the first scored item unless the attempt is converted to learning mode.

## 10. Security, anti-cheat, and privacy

### 10.1 Threat boundary

This is a practice product, not a high-stakes admission test. Security should protect accounts, unpublished content, answer keys, and learner data. It should not imitate invasive proctoring.

Recommended controls:

- keep scoring keys in internal-only Convex records and never return them with public question payloads;
- authorise every stored attempt read and write from a server-derived identity, never a client-supplied user ID;
- use unpredictable attempt identifiers and idempotent submission mutations;
- rate-limit attempt creation, answer writes, upload signing, and submission;
- persist selected item versions and option order when the attempt starts;
- enforce deadlines on the server; the browser clock is only a display;
- make form publication immutable for attempts already started;
- keep draft media private;
- log administrative publication and rights changes without logging answers, tokens, presigned URLs, or full personal data;
- treat an R2 presigned URL as a bearer credential with a short expiry.

Cloudflare says anyone holding a presigned URL can perform its permitted operation until expiry, recommends Content-Type restrictions and CORS, and states that presigned URLs use the R2 S3 API domain rather than a custom domain. Source: [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

OWASP warns against storing session tokens in web storage and recommends protecting session identifiers and excluding tokens and sensitive personal data from logs. Sources: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

### 10.2 What not to call anti-cheat

- Do not collect webcam, microphone, screen, clipboard, face, keystroke cadence, or device fingerprint data.
- Do not treat leaving the tab as proof of misconduct.
- Do not block text selection or browser accessibility tools.
- Do not hide the learner's own saved answer after submission.
- Do not claim a “secure test score”; say “timed practice result.”

### 10.3 Data minimisation and recommended retention

The following are recommended defaults for owner and legal review, not statements of statutory requirements:

| Data | Default retention | Rationale |
| --- | ---: | --- |
| Anonymous abandoned attempt | 7 days | Resume window without building a long-term profile |
| Completed attempt and responses | 90 days | Review and short-term progress history |
| Productive writing response | 90 days or user deletion | Free text may contain personal information |
| Account-linked result summary | User controlled, default 12 months | Longer progress view only with an account |
| De-identified daily aggregate | 13 months | Year-over-year programme planning |
| Security log | 30 days | Abuse investigation with limited exposure |
| Admin audit event | 365 days | Publication accountability |
| Rejected or abandoned R2 upload | 24 hours | Remove unused bearer-upload residue |

Never collect date of birth, government ID, institution target score, admission decision, IP history, or demographic profile for the MVP. An email is needed only when the learner chooses an account. Provide delete-history and account deletion paths.

Anonymous Convex Auth creates auth/session records even when it stores no name or email. The retention promise must say whether those non-PII rows are deleted. Do not claim complete account deletion until cleanup has been verified against the installed beta package.

## 11. Content and media policy

### 11.1 Original-content ledger

Every item needs:

- stable ID and version;
- author and reviewer IDs;
- construct and skill tag;
- source-of-facts citation, when applicable;
- originality declaration;
- rights state;
- sensitivity and bias review state;
- accessibility review state;
- answer-key rationale;
- distractor rationale;
- last review date;
- retirement reason when removed.

AI may support brainstorming or copyediting, but generated content cannot move directly to published. A human author must own the final wording, and a second qualified reviewer must verify the key and explanation.

### 11.2 R2 architecture finding

The current public media domain, `https://r2.mukhtada.my.id`, is appropriate for published public assets. It should not be the only location for unpublished assessment audio because possession of a public object path is enough to fetch it.

Recommended split within Cloudflare R2:

- **public media bucket/domain** — published, reviewed practice derivatives and site images under immutable versioned keys;
- **private assessment bucket** — drafts, source masters, and review-only audio, accessed through short-lived signed S3 URLs.

Both remain Cloudflare R2, so their combined usage must be monitored against the allowance and billing scope shown for the account. A second bucket does not change the database choice. If a separate private bucket cannot be configured in the MVP, block browser upload and publication of confidential drafts rather than pretending random object keys are access control.

Recommended object layout:

```text
assessment/
  audio/<asset-id>/source-v1.wav
  audio/<asset-id>/delivery-v1.opus
  audio/<asset-id>/delivery-v1.mp3
  transcripts/<asset-id>/transcript-v1.vtt
  images/<asset-id>/delivery-v1.webp
```

Use immutable versioned keys. Published records point to reviewed derivatives, never to replaceable “latest” keys. Keep scripts and transcripts in Convex for review/search; keep binary audio in R2.

Cloudflare's Standard free tier currently includes 10 GB-month storage, 1 million Class A operations, 10 million Class B operations, and free direct egress. These are included amounts, not a hard spending cap. Source: [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## 12. Stack fit

### 12.1 Next.js 16

- Server-render overview, legal scope, attempt shell, and initial question state.
- Use client components only for timer, audio, answer selection, autosave status, and question navigation.
- Keep a complete non-JavaScript explanation and start requirements in server HTML.
- Use route-level error and loading states; no content should remain invisible waiting for an animation.
- Never put answer keys, scoring tables, R2 secrets, or admin permissions in public environment variables.

Before implementation, the coding agent must read the relevant local Next.js 16 guides in `node_modules/next/dist/docs/` as required by `AGENTS.md`.

### 12.2 Convex cloud

- Store stable form, item, attempt, response, review, result, and audit documents.
- Add the existing Convex Auth stack's Anonymous provider only when a visitor starts a stored language attempt. Derive ownership from `identity.tokenIdentifier`; Home stays local and stores no visitor identity.
- Put high-churn responses in their own table, not inside an attempt array.
- Use indexes for all attempt/form/item lookups and cursor pagination for growing admin lists.
- Public queries return question view models without keys or draft fields.
- Auth and ownership come from `ctx.auth.getUserIdentity()` and the stable token identifier, not a user argument.
- Convex Auth is beta in the installed stack. Test the exact Next.js session/storage path and document cleanup or retention of anonymous auth rows before public launch.
- Use an internal scheduled mutation to expire a timed attempt; re-check status and deadline idempotently.
- Use transactions for answer upsert and attempt progress changes.
- Maintain aggregate counters transactionally or use a Convex aggregate component; never count with an unbounded collection.

Convex supports cursor-based reactive pagination, and authentication identity is available inside functions. Sources: [Convex paginated queries](https://docs.convex.dev/database/pagination) and [Convex auth in functions](https://docs.convex.dev/auth/functions-auth).

### 12.3 Cloudflare R2

- Browser uploads use a short-lived, admin-authorised presigned PUT on the S3 endpoint.
- Bind the expected Content-Type and verify size/type with `HeadObject` before creating a ready media record.
- CORS allows exact application origins and exact methods/headers.
- Public delivery uses `r2.mukhtada.my.id` only after publication.
- Unused upload keys are removed through a lifecycle rule or scheduled cleanup.

Cloudflare documents exact-origin CORS for browser signed uploads and notes that expired presigned URL errors do not carry CORS response headers. Source: [Cloudflare R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/).

## 13. Roadmap

### Phase 0 — language, legal, and blueprint

- Confirm ITP-aligned versus current iBT-aligned product.
- Approve English Club Assessment Lab as the source brand.
- Get trademark review before public TOEFL references.
- Approve the construct, section blueprint, result language, and retention policy.
- Name the accountable academic reviewer.

### Phase 1 — Home programme quiz

- Confirm programme facts in the CMS.
- Author 4–6 orientation questions and explanations.
- Build anonymous, untimed local interaction.
- Track only aggregate start, completion, and programme-link choice.
- Test at 320 px, keyboard only, screen reader, 200% zoom, and reduced motion.

### Phase 2 — quick practice

- Publish independent 6–10-item Listening, Structure/Written Expression, and Reading pools.
- Add audio/transcript modes, answer autosave, submission, review, and raw-result reporting.
- Keep quick attempts anonymous unless the learner chooses to save them.

### Phase 3 — complete ITP-aligned form

- Finish the 140-item reviewed content inventory.
- Add section transitions, 115-minute timed mode, extended/untimed modes, durable resume, and idempotent finalisation.
- Release only after a full dry run, accessibility audit, answer-key audit, and rights audit.

### Phase 4 — quality and analytics

- Add item facility, distractor selection, omission rate, and timing distributions above privacy thresholds.
- Retire weak items through versioned forms; never rewrite completed attempts.
- Run bias and accessibility reviews on a fixed cadence.

### Phase 5 — calibrated research, optional

- Recruit consented pilot samples.
- Analyse reliability and form comparability with a psychometrician.
- Decide whether a bounded estimate is defensible.
- Keep the existing raw result if evidence is insufficient.

### Phase 6 — current iBT-inspired path, optional

- Add all four skills, not three.
- Treat adaptive Reading/Listening, productive Writing, and Speaking as separate programmes.
- Do not reuse the ITP-aligned score or item model as if the constructs were interchangeable.

## 14. Evidence ledger

| Claim | Evidence | Type | Product consequence |
| --- | --- | --- | --- |
| ITP Level 1 is three sections, 140 items, 115 minutes | [ETS ITP Handbook](https://www.ets.org/content/dam/ets-org/pdfs/toefl-itp-test-taker-handbook.pdf) | Observation | Best structural match for requested L/W/R set |
| ITP “Writing” is recognition of structure/written expression | [ETS ITP Handbook](https://www.ets.org/content/dam/ets-org/pdfs/toefl-itp-test-taker-handbook.pdf) | Observation | Rename the quick quiz or split productive Writing |
| ITP scores are for internal institutional use | [ETS ITP administration](https://www.ets.org/toefl/itp/administration.html) | Observation | Do not present club result as transferable score |
| Current iBT uses four skills and adaptive modules | [ETS iBT content](https://www.ets.org/content/ets-org/language-master/in/home/toefl/institutions/ibt/about/content-structure.html) | Observation | Three sections cannot yield an iBT overall estimate |
| Current official score is 1–6, half bands | [ETS score guide](https://www.ets.org/toefl/test-takers/ibt/scores/understand-scores.html) | Observation | Do not use obsolete 0–120 as the primary current model |
| Official score alignment uses field data and standard setting | [ETS 2026 scale report](https://www.ets.org/content/dam/ets-india/pdfs/toefl/score-scale-update-2026.pdf) | Observation | Raw accuracy cannot be relabelled as official band/CEFR |
| ETS restricts trademark presentation and endorsement implication | [ETS trademark guideline](https://www.ets.org/legal/trademarks.html) | Observation | English Club brand stays primary; review all TOEFL references |
| ETS material needs permission and is not for third-party posting | [ETS licensing](https://www.ets.org/legal/permissions/licensing.html) | Observation | Original item bank only |
| Prerecorded audio needs an equivalent alternative | [WCAG 2.2 audio-only](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded) | Observation + recommendation | Supply a transcript; the two declared modes are the proposed implementation |
| Content-set timing must be adjustable unless an exception applies | [WCAG 2.2 timing](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) | Observation + recommendation | Offer extended and untimed modes instead of relying on an exception |
| Presigned R2 URLs are bearer credentials | [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) | Observation | Short expiry, exact object/action/type, no URL logging |
| Convex queries support cursor pagination | [Convex pagination](https://docs.convex.dev/database/pagination) | Observation | Paginate growing admin banks and histories |
| “Practice result only” is the safest MVP | All above | Inference | Launch value without false score claims |

## 15. Open decisions with recommended defaults

| Decision | Recommended default | Why |
| --- | --- | --- |
| ITP-aligned or current iBT-aligned? | ITP Level 1-aligned MVP | Matches the requested three areas and supports objective scoring |
| Public product name | English Club Assessment Lab | Keeps English Club as the clear source |
| Navigation label | TOEFL® test preparation, subject to review | Satisfies discoverability while avoiding a trademark-led product name |
| “Writing” meaning | Structure & Written Expression in the scored form | Accurate for the ITP-aligned construct |
| Productive Writing | Separate unscored practice after MVP | Needs human/rubric review and cannot join objective score safely |
| Result scale | Raw counts, accuracy, skill review | Fully reproducible from original items |
| Full-form length | 140 items / 115-minute standard mode | Honest structural alignment; content gate prevents a hollow “full” claim |
| Public learner identity | Invisible anonymous Convex Auth only for stored attempts; named account optional later | Keeps ownership server-derived without asking for personal data |
| Timer | Standard, extended, and untimed choices before start | Accessibility and honest mode distinction |
| Pause | No pause in standard timed mode; learner may convert to untimed learning mode | Clear rule without pretending high-stakes security |
| Listening transcript | Review-only in listening mode; available during transcript-supported mode | Accessible alternative with honest construct label |
| Draft media | Separate private R2 bucket | Public custom domain is not draft access control |
| Programme quiz persistence | Aggregate only | No learner profile is needed |
| AI item generation | Ideation only, never direct publication | Human accountability and rights review |

## 16. Unsupported claims deliberately excluded

This plan does not assume:

- that English Club is an ETS partner or authorised test centre;
- that the club has permission to use ETS questions, logos, rubrics, or score conversions;
- that “TOEFL Prediction” is an official ETS product category;
- that a three-section quiz can predict a current iBT overall score;
- that a percentage can be converted to 310–677, 0–120, 1–6, or CEFR;
- that the club has a confirmed programme catalogue, academic reviewer, pilot sample, privacy policy, or assessment licence;
- that R2's free tier is a spending cap;
- that browser lockdown, tab monitoring, or invasive proctoring improves the validity of this low-stakes practice product.

These absences become launch gates in the detailed plan rather than being filled with invented facts.
