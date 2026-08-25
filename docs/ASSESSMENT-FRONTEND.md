# English Club Assessment Lab — frontend implementation

## Status

The public Assessment Lab shell, runner, result report, and Home programme quiz are implemented. Public assessment routes only render definitions returned by the reviewed-and-published Convex query. When none are available, the site keeps the route useful without substituting local questions.

The public name is **English Club Assessment Lab** and the navigation label is **Practice**. It may display a transparent English Club fixed-form estimate for the 2026 four-skill profile. It never presents that value as an official ETS score, an exact TOEFL score prediction, a CEFR level, a certificate, or an admission recommendation.

## Route contract

| Route | Purpose |
| --- | --- |
| `/practice` | Server-rendered overview of currently published practice paths |
| `/practice/full` | Full-form briefing and Start settings |
| `/practice/quick/listening` | Listening quiz briefing |
| `/practice/quick/reading` | Reading quiz briefing |
| `/practice/quick/writing` | Writing quiz briefing |
| `/practice/quick/speaking` | Speaking rehearsal and transcript quiz briefing |
| `/practice/attempt/[attemptId]` | Owned, reactive section runner |
| `/practice/result/[attemptId]` | Owned exact result, optional fixed-form estimate, and paginated answer review |

Obviously malformed route parameters are rejected before a Convex query. Every remaining string first passes through `assessmentAttempts.resolveMine`, which normalizes the ID and verifies ownership without revealing whether a missing or cross-owner attempt exists. Only the typed ID returned by that query can reach the player, result, review, or mutation APIs.

## Content ownership

- Public route chrome and interaction wording live in the `practice` page of `content/public-content.ts`. The existing admin page editor receives the page through the shared manifest.
- Home quiz prompts, controls, feedback, and result wording live in the existing `home` manifest page.
- Home quiz answer choices, keys, explanations, and the timetable caveat are assembled from editable Activities manifest fields. They add no outcome or membership claim.
- Assessment titles, instructions, stimuli, questions, options, keys, and explanations remain in assessment authoring. They are not duplicated in the general page-copy CMS.
- If Convex content reads fail, the bounded checked-in manifest defaults remain available. Assessment questions never receive a local fallback.

## Session and data flow

1. Briefings are public server reads.
2. No visitor identity is created while browsing a briefing or using the Home programme quiz.
3. The acknowledged **Start practice** press calls `signIn("anonymous")` only if the device has no current Convex Auth identity.
4. `assessmentAttempts.start` creates an owned attempt with an idempotency key.
5. A section deadline begins only after `assessmentAttempts.beginSection`.
6. Answers and flags use `assessmentAttempts.saveResponse` with a response revision and mutation ID.
7. Question movement uses the separate attempt revision. The current-section navigator never loads the full multi-section form.
8. Opening a Listening transcript first calls `assessmentAttempts.enableTranscript`; only the subsequent reactive player payload reveals the transcript. The updated attempt revision is retained for an immediate Next action.
9. Section completion and final submission use their respective server mutations. The submitted result is server-computed.
10. `assessmentReviews.listMinePage` returns at most 20 owned post-submit review items per page.

Legacy `raw-objective` results retain their raw-result disclaimer and return no estimate object. The 2026 profile uses separate fixed-form estimate wording. Quick forms can show only their section estimate; an overall band or comparable total requires Reading, Listening, Writing, and Speaking in one result.

The browser never receives answer keys or explanations through the pre-submit player DTO.

## Interaction design

The visual direction is **Answer Line**: large editorial headings, ruled answer rows, compact evidence notes, and a bounded orange action signal. It intentionally avoids dashboard-card grids, decorative metrics, score rings, and unbounded motion.

- Heroicons provide all interface symbols.
- Audio never autoplays.
- Answer selection does not move focus.
- Explicit question navigation moves focus to the next prompt heading.
- Native modal dialogs contain only the current section, lock background scrolling, and restore focus to their launcher.
- Answered, unanswered, flagged, and current states are expressed in text and shape, not colour alone.
- Sentence building has add, remove, earlier, and later buttons; it is not drag-only.
- Touch targets are at least 44 CSS pixels.
- The 320 px layout has no horizontal page overflow.
- `prefers-reduced-motion` removes scene and loading motion without hiding controls.

## Environment wiring

The Practice layout resolves the existing server-owned `CONVEX_URL` through `getConvexDeploymentUrl()` and passes it to the client provider. It does not require a duplicate `NEXT_PUBLIC_CONVEX_URL`.

Assessment media URLs arrive as an allowlisted public DTO from Convex. The frontend does not build an R2 URL or receive R2 credentials. The backend projection uses the project’s `r2.mukhtada.my.id` public media origin.

## Verification evidence

Focused automated coverage:

- Anonymous Auth begins only after Start and is skipped for an existing device session.
- The Home programme quiz uses Activities copy and requires an explicit answer check.
- Single choice and button-based sentence ordering render semantically.
- Timer expiry can replace a question with the next server section boundary.
- Transcript support is recorded before transcript text appears.
- Malformed attempt IDs stop before the connected runner.
- Plausible-looking invalid attempt IDs resolve to the same friendly unavailable state without a browser or console error.
- Navigator and finish dialogs lock scroll and restore focus.
- Durations longer than one hour render as `h:mm:ss`.
- Post-submit response labels do not expose internal option keys.
- Practice overview passes serious/critical Axe checks at tested viewports.
- Practice overview has no horizontal overflow at 1440 px, Pixel 7, or 320 px; the Home quiz remains touch-usable at 320 px.
- The display title stays inside the content edge at the 412 px mid-phone breakpoint.
- Legacy raw results never inherit estimate wording, and estimate wording explicitly rejects official-score and exact-prediction use.

Screenshots:

- `docs/evidence/practice-overview-desktop-chromium.png`
- `docs/evidence/practice-overview-mobile-chromium.png`
- `docs/evidence/practice-overview-narrow-chromium.png`
- `docs/evidence/practice-overview-412.png`
- `docs/evidence/programme-quiz-320.png`

The first captured overview showed the honest unavailable state before the development bank was seeded. The selected development deployment now exposes one full form and four quick forms from the typed original bank. This proves route integration, not production review or psychometric validity.
