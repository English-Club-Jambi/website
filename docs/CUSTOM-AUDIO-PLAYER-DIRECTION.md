# Custom Audio Player Direction

Status: implementation-ready direction for the public Live Practice runner
Surface: `/practice/attempt/[attemptId]`
Visual lane: Answer Line
Date: 28 August 2026

## 1. Decision

Replace every browser-default audio control in the Live Practice runner with one reusable `PracticeAudioPlayer`. Keep the real `<audio>` element as the playback engine, but remove its `controls` attribute and expose owned controls with native buttons and a native range input.

The player is a ruled part of the question, not a card. It uses Bricolage Grotesque, a flat transparent field, cobalt transport state, Carbon and Graphite text, and one 8px radius on each control. Signal Orange remains available to the question's `Next` or `Submit` action; the player does not compete with that action.

The component must not autoplay, change playback rate, store playback position in Convex, or claim that a public R2 file is private.

## 2. Evidence and current defects

The current Live Practice runner has two separate native-control paths:

- `QuestionAudio` renders `<audio controls>` at `src/components/practice/attempt-runner.tsx:75-88`.
- Audio stimuli render another `<audio controls>` branch at `src/components/practice/attempt-runner.tsx:229-243`.
- CSS only gives those browser-owned controls width at `src/components/practice/practice.module.css:975-989` and `src/components/practice/practice.module.css:1106-1128`.

| Priority | Defect | Consequence |
| --- | --- | --- |
| P1 | The stimulus audio element has no explicit accessible name. The question-level wrapper has an `aria-label`, but that label does not name the descendant media control. | A screen-reader user can reach an ambiguously named media control, especially when a stimulus title and a question prompt are both nearby. |
| P1 | Neither native path listens for loading, buffering, duration, ended, or error events. The fallback text inside `<audio>` covers unsupported elements, not a failed R2 request. | A failed or stalled recording can look inert. The learner receives no owned status, recovery action, or reliable announcement. |
| P1 | Browser-owned controls do not inherit the project's token, focus, dark-theme, or minimum-target contract. | Chrome, Firefox, Android, and dark mode can show different geometry, contrast, and target sizes inside the same assessment. |
| P2 | The same recording can appear through different markup and spacing depending on whether it is projected as `player.audio` or `stimulus.mediaUrl`. | Listening questions do not have one predictable audio location or control vocabulary. |
| P2 | The description, play state, timeline, and duration are not one semantic group. | Learners must infer which text belongs to which control; automated tests cannot inspect a stable player contract. |
| P2 | A question change remounts the whole runner by item ID. Native controls reset silently without an explicit reset state. | Resetting to the start is acceptable for unlimited replay, but the current interface gives no clear state boundary. |
| P3 | Generated browser speech has a separate button treatment and no shared status shell. | The rare fallback looks unrelated to reviewed audio. It should share the ruled frame without pretending to have a measurable duration. |

Positive findings to preserve:

- `preload="metadata"` avoids eager audio downloads.
- No audio autoplays.
- Transcript support is already an explicit, persistent attempt choice.
- The current backend contract allows unlimited Listening replay, so a seekable timeline and replay action are valid.
- The public palette, focus tokens, Bricolage setup, and 44px minimum-target rules already exist.

## 3. Physical scene and visual character

A learner is using a phone between classes or a laptop in a shared room. The player should read like one marked line on a listening worksheet: clear enough to operate without inspection, quiet enough to leave the question as the main event.

The object is neither a streaming-app player nor a dashboard widget. It has no cover art, waveform, floating panel, playback statistics, animated equaliser, or branded podcast treatment.

## 4. Reusable component contract

Create:

```ts
type PracticeAudioPlayerProps = {
  src: string;
  title: string;
  unavailableText: string;
  className?: string;
};

export function PracticeAudioPlayer(
  props: PracticeAudioPlayerProps,
): React.ReactElement;
```

The component reads shared labels from `usePracticeContext()`. It owns playback UI state only. The source URL and human description remain supplied by the current public Convex projection.

Deliberate omissions:

- no `autoPlay` prop;
- no playback-rate control;
- no loop mode;
- no download-hiding theatre such as `controlsList="nodownload"`—the source is already a public R2 URL;
- no Convex mutation for progress, volume, or completion;
- no dependency on an audio-player package.

## 5. Component anatomy

```text
section.practiceAudioPlayer
  data-state="loading | ready | playing | paused | buffering | ended | error"
  aria-labelledby=titleId
  aria-describedby=statusId when status is useful
  aria-busy=true only while loading or buffering

  audio.playbackEngine
    ref=audioRef
    src
    preload="metadata"
    no controls
    no autoplay

  button.playControl
    PlayIcon | PauseIcon | ArrowPathIcon
    accessible name changes: Play recording / Pause recording / Play recording again

  div.audioReadout
    p.audioTitle#titleId
    div.timelineRow
      time.elapsed aria-hidden=true
      div.timelineVisual aria-hidden=true
        span.bufferedTrack
        span.playedTrack
      input.timelineInput[type=range]
        label: Recording position
        min=0
        max=finite duration
        step=1
        aria-valuetext="1 minute 12 seconds of 1 minute 58 seconds"
      time.duration aria-hidden=true

  button.muteControl
    SpeakerWaveIcon | SpeakerXMarkIcon
    accessible name changes: Mute recording / Unmute recording

  p.playerStatus#statusId
    visible only for loading, buffering, ended, and error states
    role=alert only for error
    polite status for other exceptional states
```

The timeline uses a real range input over two plain track layers. Do not use a decorative gradient to fake progress. The visual elapsed and total times are hidden from assistive technology because the range's `aria-valuetext` already supplies the complete value.

Use one generated ID set from `useId()` so repeated players never collide. The underlying audio element is not focusable because it has no native controls; the owned controls form the only keyboard path.

## 6. Event and state contract

| Media event or action | UI state | Required behavior |
| --- | --- | --- |
| Mount or `src` change | `loading` | Pause the old source, reset time to zero, clear stale duration/error, disable seek, and show `Loading recording`. |
| `loadedmetadata` | `ready` | Store a finite duration, enable the timeline, and keep playback paused. Do not announce readiness unless loading lasted long enough to expose a status. |
| Play button | `playing` | Call `audio.play()` from the user gesture. If the returned promise rejects, enter `error`. |
| Pause button | `paused` | Call `audio.pause()`. Keep the current position. |
| `timeupdate` | current transport state | Update elapsed time and played percentage. Do not use a live region for each update. |
| `progress` | current transport state | Read the last buffered range that contains or follows current time. Update only the quiet buffered track. |
| `waiting` or `stalled` | `buffering` | Keep the current time, expose one polite `Buffering recording` status, and keep Pause available if playback has not ended. |
| `playing` after buffering | `playing` | Remove the buffering status without an announcement loop. |
| Range input | `paused` or `playing` | Seek to the chosen finite time. Do not force playback to start. |
| Mute button | current transport state | Toggle `audio.muted`; the icon, button name, and `aria-pressed` change together. |
| `ended` | `ended` | Set elapsed to duration. Play control becomes `Play recording again` with `ArrowPathIcon`. Activation seeks to zero and plays. |
| `error` | `error` | Pause, keep controls stable, display `Recording unavailable`, and turn the main control into `Try recording again`. Retry calls `load()` and returns to `loading`. Transcript support remains a separate attempt action. |
| Unmount | none | Pause playback and remove all media listeners. |

Update visual time no more often than the media element's `timeupdate` cadence. Do not create a `requestAnimationFrame` loop while paused.

## 7. Interaction requirements

### Keyboard

- Tab reaches Play/Pause, the range input, and Mute in source order.
- Enter and Space activate Play/Pause, Replay, Retry, and Mute through native button behavior.
- The range keeps native keyboard behavior: Left/Down and Right/Up move by one second; Home and End move to the bounds. A local range handler may make Page Up and Page Down move by ten percent, without installing a document-level shortcut.
- Do not add global J/K/L or number-key shortcuts. They collide with answer entry and screen-reader commands.
- Focus never moves when audio starts, pauses, buffers, ends, or errors.
- A source change leaves focus on the new question heading through the runner's existing navigation contract; it does not focus the player automatically.

### Screen reader

- The player is a labelled section, not a toolbar with an unexplained collection of buttons.
- Every icon is `aria-hidden`; every control has a changing text alternative.
- The range exposes a useful `aria-valuetext`; elapsed time is not a constantly announcing live region.
- Only loading that persists, buffering, ended, and error states enter the polite status. Error uses `role="alert"` once.
- `aria-busy` belongs to the player section, never the whole question.
- Transcript support remains outside the player, immediately after the audio stimulus, because enabling it changes the attempt record rather than playback.

### Touch and pointer

- Play and Mute have a 48px square practical target.
- The range row has a minimum 44px hit area even though the visible rule is 2px.
- The range thumb is at least 20px visually and 44px through the input's hit box.
- Seeking works with a single pointer; no drag-only secondary action exists.
- Apply `touch-action: manipulation` to buttons. Keep native range pointer behavior and do not install a page-level `pointermove` listener or prevent page scrolling outside the range.

## 8. Token mapping

All colours come from the public semantic tokens. The component defines geometry, not a private palette.

| Player part | Token |
| --- | --- |
| Field background | transparent over `--page` |
| Top and bottom rules | `--practice-rule` |
| Primary text | `--ink` |
| Description, times, quiet status | `--muted` |
| Play control at rest | `--surface` background, `--ink` edge, `--primary-strong` icon |
| Play control while playing | `--primary` background, `--on-primary` icon |
| Unplayed track | `--line` |
| Buffered track | `--primary-wash` |
| Played track and range thumb | `--primary` |
| Mute control | transparent, `--ink`; selected state uses `--primary-wash` plus icon change |
| Focus | 3px `--focus`, 3px offset using `--focus-offset` |
| Error rule and copy | `--danger` |
| Disabled | existing ink/surface pair at 46% opacity; never colour alone |

Signal Orange is not used inside the player. In the Answer Line, it identifies the next explicit question action. Cobalt identifies transport and active playback.

Shape and type:

- outer field radius: `0`;
- control radius: `8px`;
- visible timeline radius: `0`, a ruled line rather than a pill;
- title: Bricolage label role, `0.9rem`, weight `680–720`;
- time: `0.82rem`, tabular numerals;
- status: `0.82–0.86rem`, normal sentence case;
- no uppercase playback labels.

## 9. Responsive geometry

The player follows the question measure, not viewport width.

| Viewport | Available player width | Layout | Geometry |
| --- | ---: | --- | --- |
| 1440px | up to 48rem / 768px inside the 58rem question field | Two rows: Play, title/readout, Mute on row one; elapsed, timeline, duration aligned under the readout on row two | 48px controls, 16px column gaps, 12px row gap, 16px block padding; target height about 96px |
| Pixel 7 / 412px | about 380px after 16px page margins | Row one: 48px Play, flexible two-line title, 48px Mute. Row two spans all columns with 42px elapsed, flexible timeline, 42px duration | 8px column gaps, 12px row gap, 14px block padding; no clipped UA shadow controls |
| 320px | 300px after the documented 10px margins | Same two-row composition. Title may wrap to two lines. Time labels remain compact; the timeline keeps at least 180px where content permits | 48px controls, 8px gaps, 12px block padding; `min-width: 0` on title/readout and no horizontal scroll |

At 200% zoom, the layout may become three rows: controls, title/status, then time and timeline. Do not hide elapsed time, duration, Mute, or the accessible range to preserve a one-line silhouette.

## 10. Dark theme

The player has no dark-specific hard-coded colours. The document's existing semantic mapping changes page, surface, ink, muted ink, line, cobalt, focus, and wash together.

Dark-mode checks:

- the transparent outer field stays part of the same dark room;
- the resting Play button uses `--surface`, not a light UA control;
- played and buffered tracks remain distinguishable without glow;
- focus uses the dark theme's Signal Orange focus token while the player state remains cobalt;
- error copy uses `--danger` and an icon/text message, never red alone;
- the audio engine remains invisible, so a browser's internal light control cannot leak into the dark composition.

## 11. Motion

Motion conveys transport state only.

- Play/Pause and Mute background, colour, and icon-opacity change in `160ms` with `--ease-standard`.
- Button press may move down `1px`; hover may move up no more than `1px`.
- Played and buffered track widths follow the media state without a long transition. A maximum `80ms` linear interpolation may soften coarse `timeupdate` jumps.
- The loading/buffering `ArrowPathIcon` may rotate at `900ms` linear only while the media is waiting.
- Replay changes icon and accessible name without a flourish.
- No waveform animation, equaliser bars, glow pulse, bouncing play button, or entrance choreography.

Under `prefers-reduced-motion: reduce`:

- icon rotation stops;
- button transforms are removed;
- track interpolation becomes immediate;
- colour changes complete at `0.01ms`;
- every state and label remains visible.

## 12. Public copy additions

Add these labels to the managed Practice content manifest instead of hard-coding them inside the component:

- `Play recording`
- `Pause recording`
- `Play recording again`
- `Mute recording`
- `Unmute recording`
- `Recording position`
- `Loading recording`
- `Buffering recording`
- `Recording finished`
- `Recording unavailable`
- `Try recording again`
- `Duration unavailable`

Keep the existing human description from `audio.description` as the visible title. Keep the existing unavailable sentence as the explanatory error copy. Do not add encouragement, listening streaks, completion praise, or a label such as `Audio experience`.

## 13. File and API integration map

### New reusable surface

| File | Responsibility |
| --- | --- |
| `src/components/practice/practice-audio-player.tsx` | Media ref, state machine, event cleanup, time formatting, accessible controls, retry, mute, and seek behavior |
| `src/components/practice/practice-audio-player.module.css` | Ruled Answer Line player, token mapping, responsive geometry, range styling, dark-token inheritance, and reduced motion |
| `tests/unit/practice-audio-player.test.tsx` | Deterministic media-event, accessible-name, error, replay, seek, mute, source-reset, and cleanup coverage |

### Existing integration points

| File | Change |
| --- | --- |
| `src/components/practice/attempt-runner.tsx` | Replace the native audio in `QuestionAudio` and the `stimulus.mediaUrl` branch with `PracticeAudioPlayer`. Keep `GeneratedPracticeAudio` only for the reviewed-audio failure path. Place transcript support after the player. |
| `src/components/practice/practice.module.css` | Remove native `audio` width selectors from `.audioStimulus` and `.questionAudio`; keep only section placement. Do not duplicate player internals here. Let both wrappers use the reusable player at `width: min(100%, 48rem)`. |
| `content/public-content.ts` | Add the owned player labels listed above so admins can manage public wording without changing control semantics. |
| `tests/unit/attempt-runner-state.test.tsx` | Assert both audio projections reach the same player component, transcript switching remains separate, and question changes reset the source without autoplay. |
| `tests/e2e/listening-dependency-groups.spec.ts` | Assert no Live Practice `<audio>` exposes native `controls`; play, pause, seek, replay, error-safe layout, parent/follow-up recording consistency, and screenshots at 1440px, Pixel 7, and 320px. |

### Existing data contract: no backend change

`api.assessmentAttempts.getPlayer` already supplies what the player needs:

- question audio: `player.audio.publicUrl` and `player.audio.description`;
- stimulus audio: `player.stimulus.mediaUrl` plus the stimulus title or section title;
- transcript policy: `player.listeningMode` and `player.stimulus.transcript`.

Do not extend the Convex schema for playback UI state. Public R2 URLs, question dependencies, selection manifests, and attempt scoring remain unchanged.

### Later consistency pass, outside Live Practice scope

`src/components/practice/result-view.tsx` still uses native audio for submitted review. Reuse the same player there in read-only review mode after the Live Practice implementation is stable. Admin media previews and source-review tools may keep native controls until a separate dense-workspace player contract is designed; do not import the public Answer Line styling into admin by accident.

## 14. Verification contract

### Unit

- initial state never calls `play()`;
- metadata enables seek and formats elapsed/total time;
- rejected `play()` enters a visible, announced error state;
- Play, Pause, Replay, Retry, and Mute names match their current action;
- `timeupdate`, `progress`, `waiting`, `playing`, `ended`, `error`, and `volumechange` produce the expected state;
- range changes seek without starting playback;
- source changes reset time, error, buffer, and label;
- unmount pauses audio and leaves no media listeners;
- repeated `timeupdate` events do not create live-region chatter.

### Browser and visual evidence

- real R2 audio plays only after user activation;
- Full and Quick Listening use the same component;
- a parent and its follow-up questions expose the same recording URL while each question starts at a clear zero state;
- 1440px, Pixel 7, and 320px have no horizontal overflow;
- visible focus survives light and dark themes;
- range and buttons remain operable with keyboard and touch;
- 200% zoom reflows without clipped title, time, or controls;
- reduced motion removes rotation and travel;
- Axe reports no serious or critical violations;
- screenshots show no browser-default media chrome.

## 15. Anti-AI-slop rejection list

Reject the implementation if it introduces any of the following:

- a rounded audio card floating inside the ruled question field;
- glass, blur, glow, soft shadow, colour blob, or decorative gradient;
- a fake waveform or equaliser made from repeating bars;
- cover art, podcast metadata, listening streaks, or playback analytics;
- a giant circular Play button that overpowers the question;
- Signal Orange on every playback state;
- a pill-shaped timeline or every datum enclosed in a chip;
- icons made from Unicode, ASCII, emoji, or CSS triangles;
- bounce, elastic easing, continuous pulse, or autoplay;
- hidden controls at 320px to keep the player looking sparse;
- custom keyboard shortcuts that interfere with answer fields;
- a playback-rate menu in an assessment with a fixed Listening contract;
- hard-coded light colours that break the published theme;
- control copy that sounds like a prototype, test harness, or streaming product.

The shipped player should look inevitable inside the Answer Line: one recording, one ruled field, one clear transport path.
