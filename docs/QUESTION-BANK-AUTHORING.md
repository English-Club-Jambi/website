# Question Bank authoring, media, and format contract

Status: implemented and verified on the authorised Convex development deployment on 26 August 2026. No production deployment was performed.

## Admin flow

`/admin/assessments/questions` exposes one **Add question** action. The builder accepts:

- one of Reading, Listening, Writing, or Speaking;
- a task family valid for that skill;
- a difficulty level;
- a prompt and four distinct single-choice answers;
- one private correct answer;
- optional tags and an answer note;
- either no illustration, one ready Question illustration, or a direct R2 image upload with alternative text;
- for Listening, one reviewed recording selected from the shared custom Select or uploaded directly to R2 with an accessible description.

The task-family select uses labelled skill groups. When a skill is chosen in the builder, only that skill's task families remain selectable. The backend repeats the same check and rejects a mismatched pair.

New questions are not immediately live. One idempotent mutation writes a source `assessmentItems` record, its private `assessmentAnswerKeys` record, and a paused `assessmentQuestionBank` record. An administrator reviews the result and changes its status to Ready before it can enter a public draw. There is no global “full practice” checkbox in the UI.

The internal source ledger is hidden from the Practice Format catalogue. It creates bounded source versions as the bank grows; authoring does not impose a lifetime limit on the number of bank entries.

## Direct editing and immutable history

Every Question Bank row opens one direct editor. The editor never sends an administrator to the source section route, so a published source, an older source version, and a Question Bank original all remain editable from the same workspace.

The protected row payload contains a discriminated content shape for single choice, multiple select, cloze select, sentence build, or constructed response. The UI exposes the matching private answer controls for each type. It also exposes common prompt, answer-note, illustration, and Listening-audio controls. The item type itself cannot change during an edit.

Saving content performs a copy-on-write update. Convex inserts a new authoring-source item and answer key, then points the bank row to that revision. Existing attempts keep their pinned source item, image, and audio IDs. Optimistic concurrency uses `expectedUpdatedAt`, and the UI carries the returned timestamp into a following settings save.

## R2 illustration boundary

Question illustrations use media purpose `assessment-image`. The upload path is the existing constrained same-origin relay:

```text
browser dimensions + file checks
  -> Convex signed PUT request
  -> same-origin Next.js streaming relay
  -> signed PUT to Cloudflare R2
  -> Convex HeadObject verification
  -> ready media record
  -> Question Bank attachment
```

The accepted browser formats are AVIF, JPEG, PNG, and WebP, up to 10 MB. Alternative text is required and stored on the media record. Convex attaches an image only when the record is ready, publicly deliverable, has purpose `assessment-image`, uses an image MIME type, and has positive integer dimensions. The public URL is derived server-side from the object key under `https://r2.mukhtada.my.id`; the browser never stores a signed upload URL in the question.

An image is optional. `illustrationMediaId` remains absent for a text-only question, and Live Session renders no empty media frame.

## Listening audio boundary

Listening audio uses media purpose `assessment-audio`. The picker loads only reviewed, ready, public records and previews one selected file at a time. It accepts MP3, M4A, OGG, or WebM, up to 25 MB and 15 minutes. The upload relay records duration and an accessible description before Convex verifies the R2 object.

A Listening row cannot become Ready or enter a random pool without a valid playable audio derivative. Paused rows may temporarily have no audio while an administrator is revising them. Existing source-stimulus audio is projected into the same picker, so imported and Question Bank-authored Listening items use one editing flow.

## Practice Format integration

A Ready question with the matching profile, skill, valid source, and required Listening audio is allowed by default. Practice Builder stores only explicit per-format allow or disable rules. The Question Bank explains this inheritance and links to Practice Formats instead of exposing the retired global eligibility control.

Public Start samples the effective allowed pool without duplicates. The resulting attempt manifest pins the chosen bank row, source item, illustration ID, and audio ID. Later bank edits do not redraw or mutate an in-progress or completed attempt.

## Live Session integration

At Start, the published Practice Format randomly samples eligible bank entries without duplicates. Each selected row becomes an `assessmentAttemptItems` record containing the bank question, delivered source item, target section, order, and optional illustration media ID. Navigation and resume read this manifest instead of drawing again.

The Player response projects the pinned illustration only after the media record passes the ready/public/image checks. It contains `publicUrl`, `alt`, `width`, and `height`, but no object-store credential, answer key, author identity, or review metadata. The image appears before the question heading and uses its stored alternative text.

Archiving a media record removes it from public projection even when an older attempt pinned its ID. This availability gate is intentional: an immutable attempt may not force delivery of media that an administrator has withdrawn.

## Development evidence

The real development flow created one illustrated Reading question through the admin UI, uploaded its image to Cloudflare R2, activated it, and raised the ready Reading pool to 51 for a quota of 50. Public full-practice attempts then selected the item randomly from Convex and displayed the R2 image on desktop, Pixel 7, and 320 px layouts.

Automated coverage proves:

- request retry idempotency and duplicate-content rejection;
- private answer-key separation;
- wrong skill/task-family and wrong-purpose media rejection;
- paused-by-default authoring and explicit activation;
- random bank delivery without redraw;
- illustration ID pinning when bank metadata changes later;
- text-only and illustrated Player rendering;
- rapid Next navigation carries the latest Convex revision;
- no horizontal overflow, no answer/action overlap, and no serious or critical Axe findings at the three exercised widths.

Evidence files:

- `docs/evidence/admin/question-bank-add-desktop-chromium.png`
- `docs/evidence/admin/question-bank-add-mobile-chromium.png`
- `docs/evidence/admin/question-bank-add-narrow-chromium.png`
- `docs/evidence/admin/question-bank-illustrated-seed-desktop-chromium.png`
- `docs/evidence/practice-bank-illustration-live-desktop-chromium.png`
- `docs/evidence/practice-bank-illustration-live-mobile-chromium.png`
- `docs/evidence/practice-bank-illustration-live-narrow-chromium.png`

The final development catalogue contains 146 ready rows and 121 unique selectable fingerprints across eight random-bank sections. The browser proved one pinned custom-domain Question Bank recording without duplicate legacy audio at desktop, Pixel 7, and 320 px. Final integrated evidence is 252 unit/contract tests, 70 backend tests, and a 231-case Playwright matrix with 189 passes, 42 intentional skips, and no failures.
