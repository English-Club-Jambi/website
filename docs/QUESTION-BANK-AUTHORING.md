# Question Bank authoring and illustration contract

Status: implemented and verified against the `perfect-greyhound-270` development deployment on 26 August 2026.

## Admin flow

`/admin/assessments/questions` exposes one **Add question** action. The builder accepts:

- one of Reading, Listening, Writing, or Speaking;
- a task family valid for that skill;
- a difficulty level;
- a prompt and four distinct single-choice answers;
- one private correct answer;
- optional tags and an answer note;
- either no illustration, one ready Question illustration, or a direct R2 image upload with alternative text.

The task-family select uses labelled skill groups. When a skill is chosen in the builder, only that skill's task families remain selectable. The backend repeats the same check and rejects a mismatched pair.

New questions are not immediately live. One idempotent mutation writes a source `assessmentItems` record, its private `assessmentAnswerKeys` record, and a paused `assessmentQuestionBank` record. The full-practice flag starts false. An administrator must review the result and deliberately change both selection settings before it can enter a public draw.

The internal source ledger is hidden from the Practice Format catalogue. It creates bounded source versions as the bank grows; authoring does not impose a lifetime limit on the number of bank entries.

## R2 illustration boundary

Question illustrations use media purpose `assessment-image`. The upload path is the existing browser-to-R2 relay:

```text
browser dimensions + file checks
  -> Convex signed PUT request
  -> direct PUT to Cloudflare R2
  -> Convex HeadObject verification
  -> ready media record
  -> Question Bank attachment
```

The accepted browser formats are AVIF, JPEG, PNG, and WebP, up to 10 MB. Alternative text is required and stored on the media record. Convex attaches an image only when the record is ready, publicly deliverable, has purpose `assessment-image`, uses an image MIME type, and has positive integer dimensions. The public URL is derived server-side from the object key under `https://r2.mukhtada.my.id`; the browser never stores a signed upload URL in the question.

An image is optional. `illustrationMediaId` remains absent for a text-only question, and Live Session renders no empty media frame.

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
