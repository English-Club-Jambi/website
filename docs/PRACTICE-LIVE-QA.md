# Live Practice QA

Last checked: 26 August 2026, Asia/Jakarta

## Scope

This gate covers the learner-facing session and the Question Bank contract behind it:

- Writing responses keep focus while debounced saves run.
- One pinned question recording takes precedence over an older stimulus recording.
- Attempts without a pinned recording still use the legacy stimulus audio.
- Question illustrations remain optional and stay inside the attempt manifest.
- Ready, compatible bank questions inherit each Practice Format's allowed state; an explicit format rule may disable one.
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
| Ready-by-default pool and explicit disable | Pass in Convex tests | Inherited ready question starts allowed; disable rule excludes it; removing the rule restores inheritance |
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

The Writing captures use the current viewport. Playwright full-page capture relocates sticky headers and the skip link into the stitched document, which looks like an overlap even though the viewport doesn't show one.

## Automated proof

Commands run so far:

```sh
npx vitest run tests/unit/attempt-runner-state.test.tsx
npx vitest run tests/convex/question-bank-audio.test.ts tests/convex/assessment-seed.test.ts
RUN_SEEDED_PRACTICE_E2E=1 npx playwright test tests/e2e/practice-seeded-flow.spec.ts --grep "keeps the Writing response focused"
RUN_SEEDED_PRACTICE_E2E=1 RUN_ILLUSTRATED_QUESTION_E2E=1 npx playwright test tests/e2e/practice-seeded-flow.spec.ts --grep "delivers the seeded bank illustration"
RUN_SEEDED_PRACTICE_E2E=1 npx playwright test tests/e2e/practice-seeded-flow.spec.ts --grep "serves one pinned Question Bank recording"
```

Results: the final integrated run passed all 252 unit/contract tests and all 70 backend tests. Writing, illustration, and pinned-audio browser checks passed at desktop, Pixel 7, and 320 px. The full 231-case Playwright matrix finished with 189 passes, 42 intentional project/credential/mutation skips, and no failures.

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
- [x] Push only the authorised Convex development deployment
- [x] Run pinned-audio browser proof at three widths
- [x] Inspect generated audio screenshots, console, Axe, R2 response, and overflow
- [x] Recheck port 3987 without restarting it
