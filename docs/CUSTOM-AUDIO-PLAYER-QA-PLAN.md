# Custom Live Practice Audio Player: QA Plan

Status: verified on the authorised development practice surface
Date: 29 August 2026, Asia/Jakarta

## Verification result

The reusable player passed its focused release gate on the existing process at port 3987:

| Gate | Result |
| --- | --- |
| Component and runner unit tests | 13 passed across `custom-audio-player.test.tsx` and `attempt-runner-state.test.tsx` |
| Real-R2 browser matrix | 12 passed: Full and Quick across desktop, Pixel 7, and 320 px, including a reduced-motion case for each route and viewport |
| Media contract | One `r2.mukhtada.my.id` engine, valid byte-range response and metadata, no native controls, no autoplay, no duplicate legacy player |
| Interaction | Play advanced time, pause froze it, desktop keyboard seek worked, mobile coordinate tap seek worked, mute state stayed truthful, and focus exited the player |
| Accessibility and runtime | Axe serious/critical zero in light and dark; console-error and page-error collections empty |
| Responsive design | 44 px controls, no control/answer/navigator overlap, and no horizontal overflow at all three widths |
| Theme and motion | Light Playing and dark paused/muted states inspected; reduced motion removed control transitions without stopping playback |
| Static checks | Focused ESLint, TypeScript, and diff checks passed |

The twelve evidence screenshots listed in section 7 were opened and inspected. The player remains an Answer Line control: flat ruled boundaries, compact Heroicon actions, one visible timeline, and no native-browser or decorative media treatment. Port 3987 remained the same listening process throughout QA.

## 1. Delivery statement

Replace the browser-owned controls in the learner-facing Live Practice session with one reusable English Club audio player. The player must serve both audio paths already accepted by the attempt manifest:

- question-level audio pinned from the Question Bank; and
- the legacy stimulus-audio fallback used when the manifest has no pinned question recording.

The browser `<audio>` element remains the playback engine. It must not expose native `controls`, autoplay, duplicate the pinned and fallback sources, or become the visible interface. The custom surface owns play/pause, elapsed and total time, seeking, mute/unmute, focus, and status feedback.

This QA lane does not cover the admin media preview, post-submit review player, or local microphone rehearsal. Those surfaces may adopt the reusable component later, but they are not part of this release gate.

## 2. Evidence audited before planning

### Design contract

The player follows the existing Answer Line rather than introducing a separate media-player visual language:

- `DESIGN.md` requires one current prompt and at most one related stimulus, forbids audio autoplay, reserves 160 ms for fast control feedback, requires a 44 px practical target, and requires Heroicons instead of Unicode or ASCII symbols.
- `DESIGN-SYSTEM.md` requires practice audio controls to stack without page overflow below 640 px, gives every non-text control an accessible name, requires keyboard and touch operation, preserves an explicit transcript path, and reduces animation and transition durations to `0.01ms` under reduced motion.
- `BLUEPRINT.md` keeps `/practice/attempt/[attemptId]` as the owned client runner backed by the immutable attempt/player DTO. The custom player must not change Question Bank selection or attempt ownership.

The intended visual result is a compact ruled control line with cobalt focus and state, not a generic rounded media card. Play state may use the approved 160 ms response. The timeline may update its fill without moving layout. No waveform, equalizer, glow, glass, gradient text, fake sound bars, or looping decoration belongs in the player.

### Current automated patterns

- `playwright.config.ts` already defines the required `desktop-chromium` at 1440 x 1000, Pixel 7 `mobile-chromium`, and touch-enabled 320 x 800 `narrow-chromium` projects.
- `tests/e2e/practice-seeded-flow.spec.ts` already starts real Full and Quick sessions, distinguishes desktop click from phone/narrow tap, validates the custom R2 host with a byte-range request, waits for media metadata, checks Axe, console/page errors, geometry, and evidence screenshots.
- `tests/e2e/listening-dependency-groups.spec.ts` already proves that Full and Quick draw Listening questions from the real development Question Bank while retaining one R2 recording for a parent-first group.
- `tests/unit/attempt-runner-state.test.tsx` already proves that pinned audio wins over a legacy stimulus duplicate and that the legacy fallback still renders when no pinned audio exists.
- `docs/PRACTICE-LIVE-QA.md` explicitly prohibits stopping or restarting port 3987 during this lane.

Port 3987 was inspected read-only and was listening when this plan was written. This lane will reuse it. It will never stop, restart, replace, or kill that process.

## 3. Stable DOM and accessibility contract requested from implementation

Tests should rely on roles and accessible names. Two stable data attributes are allowed only where browser media internals have no useful role:

```text
[data-practice-audio-player]     reusable visible player root
audio[data-practice-audio-engine] hidden/native playback engine
```

The rendered contract should contain:

- one labelled region using the recording description as context;
- one Play button whose accessible name changes to Pause while playing;
- one range input named `Playback position`;
- one elapsed-time output and one duration output with unambiguous accessible labels;
- one Mute button whose accessible name changes to Unmute while muted;
- Heroicons marked decorative inside the labelled buttons;
- one engine `<audio preload="metadata">` with the real R2 source and without `controls` or `autoplay`;
- a polite, concise status only for load or playback failure, not for every `timeupdate` event.

The visible controls must remain usable when metadata is pending. Play and seek may be disabled until the media is ready; the failure state must say what failed and must not leave a false Playing state.

## 4. Unit and component test plan

Create `tests/unit/practice-audio-player.test.tsx`. Extend `tests/unit/attempt-runner-state.test.tsx` only after the implementation surface is stable.

### 4.1 Media engine harness

JSDOM does not implement media playback. The test harness will provide controlled `HTMLMediaElement` behavior:

- mock `play()` with a resolved or rejected promise;
- spy on `pause()`;
- define writable `currentTime`, `duration`, and `muted` values per test;
- dispatch `loadedmetadata`, `timeupdate`, `play`, `pause`, `ended`, and `error` deliberately;
- restore every prototype property and mock after each test.

No unit assertion may depend on a wall-clock timer or a real network response.

### 4.2 Component cases

| Case | Required proof |
| --- | --- |
| Initial render | One custom player, one engine, no native `controls`, `preload="metadata"`, no autoplay, labelled Play/Mute/timeline controls |
| Metadata | Finite duration enables the timeline and formats elapsed/total time as `m:ss`; unknown duration remains explicit without `NaN` or `Infinity` |
| Play and pause | Play calls the engine once; resolved playback exposes Pause; Pause calls the engine and returns the label to Play |
| Time progress | `timeupdate` changes elapsed text and the range value without replacing the focused control |
| Seek | Input/change updates `currentTime`, clamps between zero and duration, and preserves paused/playing state |
| Mute | Mute toggles the engine property and accessible name; a second activation restores sound |
| Ended | Ended exposes Play, retains a truthful final time, and does not loop or restart |
| Rejected playback | A rejected `play()` promise clears the pending/playing state and produces one useful status message |
| Media error | Error leaves answer controls and question navigation operable; the player does not throw during render |
| Source replacement | A different source resets stale duration/progress and never autoplays |
| Rerender stability | A normal attempt/player query rerender does not replace the active range or mute button node and steal focus |

### 4.3 Attempt-runner integration cases

Update the existing two audio assertions rather than duplicating their manifest setup:

1. Pinned Question Bank audio produces exactly one custom player and one engine using the pinned R2 URL. The legacy URL is absent.
2. A manifest without pinned audio produces exactly one custom player using the legacy stimulus URL.
3. A non-Listening question with no audio produces no player.

The integration assertion must query the visible player by its labelled region or controls. It may inspect the native engine only to prove the selected source and absence of browser controls.

## 5. Real-R2 Playwright plan

The implemented gate is `tests/e2e/custom-audio-player.spec.ts`. It uses the existing development-seed switch rather than silently substituting a local fixture and runs against the current server at `http://127.0.0.1:3987`.

### 5.1 Routes and deterministic setup

Run the same player contract on:

| Route | Deterministic reason |
| --- | --- |
| `/practice/full` | The first published section is Listening; its bank selector requires a ready audio derivative |
| `/practice/quick/listening` | Every selected question is Listening and therefore requires ready Question Bank audio |

For each route:

1. Open the briefing.
2. Activate acknowledgement using click on desktop and a real Playwright tap on Pixel 7 and 320 px.
3. Activate Start and Begin section with the same pointer-mode rule.
4. Assert Question 1 is visible before looking for the player.

The test does not depend on a particular prompt or bank row. Random question selection remains real; the published format contract makes audio availability deterministic.

### 5.2 Real media and custom-control assertions

For the first delivered Listening question:

1. Find exactly one `[data-practice-audio-player]` and exactly one engine in `main`.
2. Assert the engine source starts with `https://r2.mukhtada.my.id/`.
3. Assert no engine in `main` has `controls` or `autoplay`.
4. Issue a Range request for the first 1,024 bytes and require status 200 or 206, `audio/*` content type, and a non-empty body.
5. Poll until `readyState >= HAVE_METADATA`, duration is finite, and duration is greater than zero.
6. Assert the visible duration agrees with the engine duration within one second and the timeline maximum represents that duration.

This prevents a cosmetically correct custom shell from hiding a missing or local-only recording.

### 5.3 Playback state

Use a real user activation for Play:

- desktop uses `click()`;
- Pixel 7 and 320 px use `tap()`.

After activation, poll until `currentTime` advances by at least 0.30 seconds and the button is named Pause. Activate Pause, record `currentTime`, wait 800 ms, and require drift no greater than 0.10 seconds. The elapsed label must remain consistent with the engine time.

The assertion uses polling rather than a fixed expectation immediately after Play because R2 and the browser decoder can start at different speeds.

### 5.4 Seek and mute

- Desktop: focus the timeline and use ArrowRight repeatedly. Require `currentTime` and the visible elapsed label to increase.
- Pixel 7 and 320 px: calculate a point 60% across the visible timeline target and call `touchscreen.tap(x, y)`. Require `currentTime` to land near 60% of duration with a tolerance of 5% or 0.75 seconds, whichever is larger.
- Activate Mute by click/tap, assert the engine is muted and the button is named Unmute; activate again and assert the inverse.

The mobile seek assertion is intentionally coordinate-based. Programmatically assigning the range value would not prove that the touch target works.

### 5.5 Keyboard behavior

Run the complete keyboard pass in `desktop-chromium` for both Full and Quick:

1. Reach Play through sequential Tab navigation; do not call `.focus()` for the primary proof.
2. Press Space to play and Space again to pause.
3. Tab to `Playback position`; use ArrowRight and require progress to change.
4. Tab to Mute; press Enter and require the muted state and accessible name to change.
5. Continue Tab once and prove focus reaches the next answer or question action rather than becoming trapped inside the player.

Every focused control must have a visible focus indicator. The sequence may include an explicitly labelled transcript action, but no hidden engine may enter the tab order.

### 5.6 Responsive geometry and practical targets

At desktop, Pixel 7, and 320 px, record the player and control rectangles and require:

- document and `main` width no more than viewport width plus one pixel;
- the player remains inside the viewport and its question/stimulus section;
- Play/Pause and Mute/Unmute practical hit targets are at least 44 by 44 px;
- the timeline touch wrapper is at least 44 px high even if the drawn track is thin;
- visible controls do not intersect one another;
- the player does not overlap the first answer control, transcript action, or question navigator;
- time labels remain visible and do not force horizontal scrolling;
- no sticky action covers the final visible control at 320 px.

Use rectangle intersection assertions, not screenshot judgment alone.

### 5.7 Accessibility and runtime errors

For every Full/Quick and viewport case:

- collect `pageerror` events and console messages of type `error` from before Start;
- require both collections to remain empty after play, pause, seek, mute, and theme change;
- run Axe on `main` in light and dark modes;
- require zero serious or critical violations;
- assert every visible icon is decorative and every icon-only button has a stable accessible name;
- assert the player region has one name and does not nest another conflicting landmark role.

Media network or decoding failures may not be filtered out of the console collection.

## 6. Theme and motion plan

### Dark mode

Within each Full/Quick and viewport case, pause playback, activate `Switch to dark theme`, and require `html[data-theme="dark"]`. Re-run Axe and geometry assertions. Sample the player surface, text, focus outline, inactive track, active track, and button states through computed styles so the custom player cannot retain a light-only patch.

Capture the dark player with the timeline away from zero and mute enabled. This makes the selected, elapsed, and muted states visible in one frame.

### Reduced motion

Add a second, smaller Full/Quick matrix with `page.emulateMedia({ reducedMotion: "reduce" })` before navigation. After Play and Pause:

- control state still changes;
- progress still reports actual media time;
- no control changes position;
- every animated player descendant reports animation and transition duration at or below the design-system `0.01ms` ceiling;
- the test observes no autoplay or decorative loop.

The playback clock itself is not animation and must continue to advance when the user presses Play.

## 7. Screenshot ledger and manual inspection

Capture viewport screenshots, not stitched full-page screenshots, after the player is scrolled into view:

```text
docs/evidence/practice-audio-player-full-desktop-chromium-light.png
docs/evidence/practice-audio-player-full-desktop-chromium-dark.png
docs/evidence/practice-audio-player-full-mobile-chromium-light.png
docs/evidence/practice-audio-player-full-mobile-chromium-dark.png
docs/evidence/practice-audio-player-full-narrow-chromium-light.png
docs/evidence/practice-audio-player-full-narrow-chromium-dark.png
docs/evidence/practice-audio-player-quick-desktop-chromium-light.png
docs/evidence/practice-audio-player-quick-desktop-chromium-dark.png
docs/evidence/practice-audio-player-quick-mobile-chromium-light.png
docs/evidence/practice-audio-player-quick-mobile-chromium-dark.png
docs/evidence/practice-audio-player-quick-narrow-chromium-light.png
docs/evidence/practice-audio-player-quick-narrow-chromium-dark.png
```

The light capture should show active playback. The dark capture should show paused, muted playback after a seek. Disable animations only at screenshot time; playback behavior must be tested before that option is used.

Manual inspection must reject:

- a generic white rounded player card;
- native Chromium controls peeking through;
- truncated time or slider labels;
- focus rings clipped by the ruled section;
- a thin mobile hit target that only looks large;
- controls distributed too widely at desktop or cramped at 320 px;
- a dark-mode patch with light inputs or unreadable inactive track;
- waveform, fake level animation, glow, glass, or gradient decoration;
- ASCII, Unicode, or emoji substitutes for Play, Pause, volume, or mute icons.

## 8. Execution order after implementation handoff

1. Review the final component props and DOM; adjust selectors without weakening accessible-name assertions.
2. Add the media-engine unit harness and component cases.
3. Update pinned/fallback assertions in `attempt-runner-state.test.tsx`.
4. Run focused unit tests and lint.
5. Add the Full/Quick real-R2 Playwright matrix.
6. Run desktop first to stabilize playback tolerances without changing product behavior.
7. Run Pixel 7 and 320 px with real tap/seek.
8. Run dark and reduced-motion passes.
9. Inspect every screenshot and report concrete geometry or visual defects to the implementation lane.
10. Re-run the full focused matrix after fixes.
11. Update `docs/PRACTICE-LIVE-QA.md` only with observed results, not planned claims.

Proposed commands after the source handoff:

```sh
npx vitest run tests/unit/custom-audio-player.test.tsx tests/unit/attempt-runner-state.test.tsx
npx eslint src/components/practice tests/unit/custom-audio-player.test.tsx tests/unit/attempt-runner-state.test.tsx tests/e2e/custom-audio-player.spec.ts
RUN_SEEDED_PRACTICE_E2E=1 npx playwright test tests/e2e/custom-audio-player.spec.ts --project=desktop-chromium --workers=1
RUN_SEEDED_PRACTICE_E2E=1 npx playwright test tests/e2e/custom-audio-player.spec.ts --project=mobile-chromium --project=narrow-chromium --workers=1
RUN_SEEDED_PRACTICE_E2E=1 RUN_LISTENING_DEPENDENCY_E2E=1 npx playwright test tests/e2e/custom-audio-player.spec.ts tests/e2e/listening-dependency-groups.spec.ts --workers=1
```

The existing 3987 process is a prerequisite. None of these commands may stop, replace, or restart it.

## 9. Release gate

- [x] One reusable custom player serves pinned and legacy Live Practice audio.
- [x] Exactly one real-R2 audio engine is present; native controls and autoplay are absent.
- [x] Metadata, play, pause, seek, mute, ended, error, and source-change unit cases pass.
- [x] Full and Quick playback advance and pause correctly on desktop, Pixel 7, and 320 px.
- [x] Touch seek is proven with a real screen tap on both mobile projects.
- [x] Keyboard operation and focus exit are proven for Full and Quick.
- [x] Light and dark Axe serious/critical count is zero.
- [x] Console error and page-error collections stay empty.
- [x] No player, control, answer, transcript action, or navigator overlap is detected.
- [x] No horizontal overflow occurs at any required viewport.
- [x] Reduced motion removes player transition movement without disabling playback.
- [x] Twelve light/dark screenshots are inspected and accepted.
- [x] Port 3987 remains the same running process throughout QA.
