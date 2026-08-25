# Assessment Lab backend runbook

Status: implemented and tested locally on 26 August 2026. This document covers the Convex and R2 contracts only. It does not claim that a publishable question bank exists.

## Product boundary

- Public route: `/practice`.
- Supported definitions: `full-practice` and `skill-quiz`.
- The full form follows the original English Club ITP Level 1-aligned blueprint: Listening, Structure, and Reading.
- Results contain raw objective counts. They are not official, certified, predicted, equivalent, or valid for admission.
- `club-program-quiz` stays local to Home and cannot enter the attempt engine.
- Writing is outside this result model.
- No public seed contains real or fake questions. Synthetic content exists only inside `tests/convex/assessment-backend.test.ts`.

## Identity and ownership

`Anonymous()` and `Password()` are enabled in `convex/auth.ts`. The Start screen creates an anonymous Convex Auth session only after the visitor presses Start.

Every participant function derives its owner from:

1. `ctx.auth.getUserIdentity()`;
2. `getAuthUserId(ctx)`;
3. the server-side `users.isAnonymous` field.

Participant APIs do not accept a user ID, token identifier, actor ID, role, or capability from the browser. Missing and cross-owner attempt IDs use the same response. Route strings must first pass through:

```ts
assessmentAttempts.resolveMine({ attemptId: string })
// null | {
//   attemptId: Id<"assessmentAttempts">;
//   status: "in-progress" | "section-review" | "submitting" |
//           "submitted" | "abandoned";
// }
```

The resolver bounds strings to 128 characters, calls `ctx.db.normalizeId`, and returns `null` for malformed, missing, and cross-owner IDs. UI code uses only the typed ID returned by this query.

## Participant API

Catalog:

- `assessments.listPublished({ paginationOpts: { cursor, numItems: 12 } })`
- `assessments.getPublishedBySlug({ slug })`

Attempt lifecycle:

- `assessmentAttempts.start({ definitionId, versionId, timingMode, timeMultiplier, listeningMode, startRequestId })`
- `assessmentAttempts.resumeCandidate({})`
- `assessmentAttempts.getAttemptState({ attemptId })`
- `assessmentAttempts.beginSection({ attemptId })`
- `assessmentAttempts.getPlayer({ attemptId })`
- `assessmentAttempts.saveResponse({ attemptId, itemId, response, expectedClientRevision, mutationId, flagged })`
- `assessmentAttempts.move({ attemptId, sectionOrder, itemOrder, expectedRevision })`
- `assessmentAttempts.enableTranscript({ attemptId, expectedRevision })`
- `assessmentAttempts.finalizeCurrentSection({ attemptId, expectedRevision })`
- `assessmentAttempts.submit({ attemptId, submitRequestId, expectedRevision })`
- `assessmentAttempts.getResult({ attemptId })`
- `assessmentAttempts.listMine({ paginationOpts: { cursor, numItems: 10 } })`
- `assessmentAttempts.deleteMine({ attemptId })`
- `assessmentReviews.listMinePage({ attemptId, sectionOrder, paginationOpts: { cursor, numItems: 20 } })`

`getPlayer` returns public item data, one optional stimulus, the learner's saved response, a response revision, an attempt revision, and at most 50 navigator states. It never returns an answer key, explanation, provenance record, or draft media URL.

`saveResponse` accepts partial drafts but enforces the item shape. Multiple-select drafts may contain fewer than `selectionMin` choices, but never more than `selectionMax`. Reusing a mutation ID with different content fails. A stale response revision returns a conflict without overwriting the saved response.

Section deadlines are calculated on the server. A late save finalises only the current section. It cannot complete an unstarted section. `submit` works only from the final active section.

`enableTranscript` is owned and idempotent. Once enabled, the attempt stays `transcript-supported`; the transcript becomes visible and the final result uses the matching label.

Post-submit review is section-ordered and paginated. Correct answers and explanations do not have a pre-submit query path.

`deleteMine` deletes one owned attempt and its bounded responses, section progress, result snapshots, and section results in one mutation. It uses the same non-disclosing cross-owner error as other owned functions.

## Admin API and permissions

Permissions are server-derived from `adminUsers`:

| Role | Assessment access |
| --- | --- |
| Editor | read and edit drafts |
| Publisher | read, review, and publish; cannot author assessment content |
| Owner | all assessment permissions |

Workspace and definition functions:

- `adminAssessments.listPage({ visibility, paginationOpts: { cursor, numItems: 20 } })`
- `adminAssessments.getWorkspace({ definitionId })`
- `adminAssessments.create(...)`
- `adminAssessments.updateMetadata({ versionId, expectedContentRevision, ...metadata })`
- `adminAssessments.validateDraft({ versionId, expectedContentRevision })`
- `adminAssessments.recordApproval({ versionId, expectedContentRevision, reviewType, decision, note })`
- `adminAssessments.publish({ versionId, expectedContentRevision })`
- `adminAssessments.createDraftFromPublished({ definitionId })`
- `adminAssessments.resumeDraftClone({ versionId })`
- `adminAssessments.retire({ definitionId })`

Authoring functions:

- `adminAssessments.saveSection(...)`, `moveSection(...)`, `deleteSection(...)`
- `adminAssessments.saveStimulus(...)`, `moveStimulus(...)`, `deleteStimulus(...)`
- `adminAssessmentItems.getSectionWorkspace({ sectionId })`
- `adminAssessmentItems.listPage({ sectionId, paginationOpts: { cursor, numItems: 25 } })`
- `adminAssessmentItems.saveSingleChoice(...)`, `moveItem(...)`, `deleteItem(...)`

Deletion is relationship-safe: an item deletes its private answer key in the same mutation; a referenced stimulus cannot be deleted; a section must have no items or stimuli. Reorder mutations compact their sibling order and bump `contentRevision`.

After publication, `createDraftFromPublished` copies at most 8 sections and 200 stimuli/items/keys in scheduled batches. Published rows remain immutable. Version-bound media is deliberately not copied; the next version needs a new reviewed delivery derivative. A failed stage marks the draft `clone-failed`. `resumeDraftClone` resets it to `cloning` and reruns the idempotent stages.

`getWorkspace.publishReadiness` is the server source of truth for the admin UI. Publication requires:

- a current passing validation check with no blocker;
- the current content revision;
- approved academic, rights, accessibility, and bias reviews at that revision;
- an academic reviewer who did not author an item;
- `reviewPolicy: "after-submit"`;
- resumable attempts;
- no whole-assessment timer;
- unlimited listening replay for this MVP;
- strict section, item, answer-key, stimulus, and media relationships.

## R2: private source and public derivative

The existing public bucket and `https://r2.mukhtada.my.id` serve reviewed immutable delivery objects. Draft audio and images require a separate private bucket with no custom public domain.

Set these Convex Cloud environment variables in addition to the existing public R2 variables:

```text
R2_ACCOUNT_ID
R2_API
R2_ASSESSMENT_BUCKET_NAME
R2_ASSESSMENT_ACCESS_KEY_ID
R2_ASSESSMENT_SECRET_ACCESS_KEY
```

Do not put these values in a `NEXT_PUBLIC_` variable. Do not substitute the public bucket when the private variables are missing.

`assessmentMediaNode.getConfigStatus({})` returns only three booleans:

```ts
{
  privateDraftReady: boolean;
  publicDerivativeReady: boolean;
  confidentialUploadsBlocked: boolean;
}
```

`assessmentMedia.reserveUpload` also checks the private configuration before inserting a row, so a missing private bucket cannot leave an orphan reservation.

Upload flow:

1. `assessmentMedia.reserveUpload({ assessmentVersionId, purpose, contentType, byteSize, originalName, alt, checksumSha256, durationMs? })`
2. `assessmentMediaNode.createUploadUrl({ mediaId })`
3. Browser PUT with every returned required header.
4. `assessmentMediaNode.verifyUpload({ mediaId, width?, height? })`
5. Admin preview through `assessmentMediaNode.createPreviewUrl({ mediaId })`.
6. Publisher creates an immutable public object with `assessmentMediaNode.publishDerivative({ sourceMediaId })`.
7. A stimulus references the returned public `mediaId`, never the private source ID.

The server enforces purpose/MIME matching, exact byte length, SHA-256, a 25 MiB and 15-minute audio bound, image dimensions, version ownership, object-key safety, private/public access, and ready status. R2 SHA-256 support still needs a real Cloudflare smoke test before launch.

Private-bucket CORS for local admin development must allow the headers signed by the current PUT contract:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3987",
      "https://YOUR_PRODUCTION_ORIGIN"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": [
      "Content-Type",
      "Cache-Control",
      "x-amz-checksum-sha256",
      "x-amz-meta-checksum-sha256",
      "x-amz-meta-duration-ms"
    ],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Range"],
    "MaxAgeSeconds": 3600
  }
]
```

Presigned URLs are bearer credentials. Do not write them to Convex rows, application logs, analytics, screenshots, or error reports.

The bounded media selector is:

```ts
adminMedia.listAssessmentPage({
  assessmentVersionId,
  access: "assessment-private" | "public",
  purpose?: "assessment-audio" | "assessment-image",
  status,
  paginationOpts: { cursor, numItems: 24 }
})
```

It uses version/access/purpose/status indexes. It does not scan or client-filter a global media page.

## Retention and deletion policy

The implemented deletion path is immediate and user-controlled through `deleteMine`. Automatic retention is not active in this slice.

Deployment policy until a cleanup job is approved:

- preview and internal QA only;
- do not promise automatic erasure in public copy;
- disclose that an anonymous attempt remains until the learner deletes it or an operator removes it under the approved data policy;
- do not claim that deleting an attempt also deletes the Convex Auth anonymous user row;
- public launch remains blocked until the owner approves the proposed 7-day abandoned-attempt and 90-day completed-attempt policy, or approves another schedule and its cleanup job.

## CMS page bound

The Practice manifest has 142 editable fields. Public and admin page reads now support at most 200 entries. A new key is refused when a page already has 200 entries; a legacy page with more than 200 fails explicitly instead of returning a truncated list.

## Verification

Local commands:

```bash
npx eslint convex tests/convex/assessment-backend.test.ts
npx tsc --noEmit --pretty false
npm run test:backend -- --reporter=verbose
```

Focused evidence in `tests/convex/assessment-backend.test.ts` covers:

- unauthenticated access and two independent anonymous owners;
- malformed and cross-owner route IDs;
- pre-submit key privacy and post-submit review;
- stale response and authoring revisions;
- mutation and submit retry;
- timer expiry and premature-submit rejection;
- daily attempt quota;
- transcript persistence and result labelling;
- owned graph deletion;
- private, wrong-purpose, wrong-MIME, wrong-version, missing, and unsafe media;
- missing private R2 configuration without an orphan row;
- admin role separation, four approvals, publish readiness, immutable publication, and draft cloning;
- safe delete/reorder authoring contracts;
- React-hook-shaped pagination with server hard caps;
- 142-field Practice CMS reads and the 200-entry ceiling.

No deployment, environment mutation, database seed, or public question publication is part of this runbook.
