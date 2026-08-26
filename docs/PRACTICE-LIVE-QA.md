# Live Practice QA

Last checked: 26 August 2026, Asia/Jakarta

## Scope

This gate covers the learner-facing session and the Question Bank contract behind it:

- Writing responses keep focus while debounced saves run.
- One pinned question recording takes precedence over an older stimulus recording.
- Attempts without a pinned recording still use the legacy stimulus audio.
- Question illustrations remain optional and stay inside the attempt manifest.
- Ready, compatible bank questions inherit each Practice Format's allowed state; an explicit format rule may disable one.
- Every random section draws only Question Bank rows with the same skill and a task family valid for that skill.
- A started attempt keeps its selected item, image, and audio IDs even after later bank edits.

The gate verifies the authorised Convex development deployment and never targets production. It does not stop or restart the server on port 3987.

## Current result

| Check | Result | Evidence |
| --- | --- | --- |
| Writing, desktop | Pass | Character-by-character input, focus retained, saved, no console error, no horizontal overflow, Axe serious/critical 0 |
| Writing, Pixel 7 | Pass | Touch activation plus the same assertions |
| Writing, 320 px | Pass | Touch activation plus the same assertions |
| Pinned audio replaces duplicate stimulus audio | Pass in unit and Convex tests | Exactly one `<audio>` element; pinned R2 URL wins |
| Legacy stimulus audio fallback | Pass in unit test | Legacy R2 URL renders when the pinned field is absent |
| Optional illustration | Pass in unit and live browser tests | Desktop, Pixel 7, and 320 px; R2 URL, alt text, no overlap or overflow |
| Full bank-backed manifest | Pass in live browser tests | A 50-item full-practice manifest starts on desktop, Pixel 7, and 320 px using click or real touch as appropriate |
| Skill-scoped random selection | Pass in Convex and live browser tests | Full practice pins exactly 50 Reading, 47 Listening, 12 Writing, and 11 Speaking questions; each focused sprint opens only its matching skill |
| Ready-by-default pool and explicit disable | Pass in cloud draft check and Convex tests | A ready inherited question changed to `disabled`/`effectiveAllowed=false`, then returned to `inherit`/`effectiveAllowed=true`; the cleanup query found no remaining rule |
| Attempt manifest immutability | Pass in Convex tests | A bank content/audio edit changes later attempts while the first attempt keeps its original item and audio IDs |
| New Convex contract on the shared dev deployment | Pass | Synced only to `dev:perfect-greyhound-270`; 146 ready records, 121 unique selectable fingerprints, and eight random-bank sections |
| Pinned Question Bank audio in a live cloud attempt | Pass | One custom-domain R2 player and no duplicate legacy player at desktop, Pixel 7, and 320 px |

## Browser evidence

- `docs/evidence/practice-writing-focus-desktop-chromium.png`
- `docs/evidence/practice-writing-focus-mobile-chromium.png`
- `docs/evidence/practice-writing-focus-narrow-chromium.png`
- `docs/evidence/practice-bank-illustration-live-desktop-chromium.png`
- `docs/evidence/practice-bank-illustration-live-mobile-chromium.png`
- `docs/evidence/practice-bank-illustration-live-narrow-chromium.png`
- `docs/evidence/practice-bank-audio-live-desktop-chromium.png`
- `docs/evidence/practice-bank-audio-live-mobile-chromium.png`
- `docs/evidence/practice-bank-audio-live-narrow-chromium.png`
- `docs/evidence/practice-full-bank-live-desktop-chromium.png`
- `docs/evidence/practice-full-bank-live-mobile-chromium.png`
- `docs/evidence/practice-full-bank-live-narrow-chromium.png`

The Writing captures use the current viewport. Playwright full-page capture relocates sticky headers and the skip link into the stitched document, which looks like an overlap even though the viewport doesn't show one.

## Automated proof

Commands run so far:

```sh
npx vitest run tests/unit/attempt-runner-state.test.tsx
npx vitest run tests/convex/question-bank-audio.test.ts tests/convex/assessment-seed.test.ts
npm run test:backend
RUN_SEEDED_PRACTICE_E2E=1 npx playwright test tests/e2e/practice-seeded-flow.spec.ts --grep "keeps the Writing response focused"
RUN_SEEDED_PRACTICE_E2E=1 RUN_ILLUSTRATED_QUESTION_E2E=1 npx playwright test tests/e2e/practice-seeded-flow.spec.ts --grep "delivers the seeded bank illustration"
RUN_SEEDED_PRACTICE_E2E=1 npx playwright test tests/e2e/practice-seeded-flow.spec.ts --grep "serves one pinned Question Bank recording"
RUN_SEEDED_PRACTICE_E2E=1 RUN_ILLUSTRATED_QUESTION_E2E=1 npx playwright test tests/e2e/practice-seeded-flow.spec.ts --grep "starts the public full-practice|delivers the seeded bank illustration|keeps the Writing response focused|serves one pinned" --workers=1
RUN_SEEDED_PRACTICE_E2E=1 npx playwright test tests/e2e/practice-seeded-flow.spec.ts --grep "starts the public full-practice live session|starts every focused sprint" --workers=1
```

Results: the final integrated run passed all 254 unit/contract tests and all 70 backend tests. The focused cloud command passed 12/12 cases in 2.8 minutes: full manifest, Writing focus, illustration, and pinned audio at desktop, Pixel 7, and 320 px. The final 231-case Playwright matrix finished with 191 passes, 40 intentional project-specific skips, and no failures.

The skill-scoping follow-up also passed the 70-test backend suite. The full-form start passed at desktop, Pixel 7, and 320 px, and one desktop browser pass started all four focused sprints. The selected development pool contained 51 eligible Reading, 47 Listening, 12 Writing, and 11 Speaking fingerprints; the live full form still pins the fixed 50/47/12/11 manifest.

## Audit score

The score applies only to the Live Practice surface tested here. The backend contract and reviewed audio derivative were verified on the shared development deployment; production was not deployed.

| Dimension | Score | Finding |
| --- | ---: | --- |
| Accessibility | 4/4 | Labelled controls, keyboard focus, alt text, native audio, and no serious or critical Axe failures |
| Performance | 3/4 | Input stays local while saves coalesce; the full-form illustration search still needs many authenticated moves |
| Responsive design | 4/4 | No horizontal overflow at 1440 px, Pixel 7, or 320 px; controls remain usable by touch |
| Theming | 3/4 | Practice components use shared tokens; this lane hasn't rerun every assertion in dark mode |
| Anti-patterns | 4/4 | The task surface uses a restrained editorial layout and standard controls without decorative motion or novelty affordances |
| **Total** | **18/20** | **Verified on the development deployment** |

## Findings

### P2: Concurrent illustration scan can exceed a test-only timeout

Location: `tests/e2e/practice-seeded-flow.spec.ts`

Three parallel browser projects each walked a 50-question manifest. Pixel 7 reached question 44 while a valid Convex move was still pending, then the former 120-second test deadline expired. The same case passed alone in 28.1 seconds. The gate now gives this exhaustive scan 300 seconds. This changes test tolerance only; learner timers and UI behaviour stay unchanged.

Suggested command: `$impeccable harden` if this scan later becomes slow in serial runs.

### Resolved: question-level audio projection on shared development

The authorised development push completed, and the browser found one public custom-domain R2 audio control inside the labelled question-audio section at all three widths. The same checks confirmed that no second legacy audio control was rendered.

### Resolved: format override round trip leaves no rule behind

The cloud draft check started from a compatible ready Speaking question with `allowedByDefault=true`, `ruleState=inherit`, and `effectiveAllowed=true`. The official pool mutation changed revision 5 to 6 and projected `ruleState=disabled` with `effectiveAllowed=false`. Restoring inheritance changed revision 6 to 7; the final projection returned to `inherit`/`true`, and a direct read found zero matching rule rows. Published-manifest exclusion, duplicate-fingerprint protection, and restoration are covered by the atomic Convex regression because an unpublished working draft must not alter a public attempt.

### Resolved: every random draw is skill-scoped

Each section queries the ready bank through the exact profile, status, and skill index before applying Practice Format rules and content-fingerprint deduplication. The selected batch is checked again for quota, unique fingerprints, matching skill, and a valid skill-to-task-family mapping. A second guard runs before the immutable attempt rows are written, so a cross-skill item cannot enter a Live Practice manifest even if an earlier selector regresses.

The Convex regression audits every item in the 120-question full form and every item in the four focused sprints. It resolves each pinned bank row and source item, checks the owning section skill, and verifies the task-family relationship. The live browser then starts the full form at all three responsive widths and starts Listening, Reading, Writing, and Speaking focused sprints from their public routes.

## Positive findings

The Writing fix removes the original failure mechanism: autosave no longer disables the textarea after each keystroke. Local state updates immediately, the latest response snapshot wins, and navigation waits until the queued save settles.

Image delivery behaves the same at each checked width. The R2 asset keeps its alt text, respects the content column, and doesn't push answer controls beneath the navigation boundary.

## Release gate

- [x] Focus retention unit test
- [x] Pinned audio precedence unit test
- [x] Legacy audio fallback unit test
- [x] Optional illustration unit test
- [x] Convex default/override and immutable-manifest tests
- [x] Writing browser proof at three widths
- [x] Illustration browser proof at three widths
- [x] Full bank-backed manifest browser proof at three widths
- [x] Skill-scoped random manifest proof for the full form and all four focused sprints
- [x] Push only the authorised Convex development deployment
- [x] Run pinned-audio browser proof at three widths
- [x] Round-trip one explicit format disable and verify zero residual rule rows
- [x] Inspect generated audio screenshots, console, Axe, R2 response, and overflow
- [x] Recheck port 3987 without restarting it
