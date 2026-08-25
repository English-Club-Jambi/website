# Assessment administration workspace

## What shipped

The admin assessment lane is a Convex-backed control and release workspace for the fixed Practice Format catalogue. Administrators manage which reviewed Question Bank items may appear in each format; they do not create additional formats. The workspace never writes to a published version, and starting a working revision does not bypass the content or review gates.

Routes:

- `/admin/assessments` — cursor-paged fixed catalogue, visibility filter, Question Bank entry point, and media entry point. It has no Create Practice Format action.
- `/admin/assessments/questions` — capacity ledger, cursor-paged bank, Add Question builder, skill-grouped task-family control, optional reviewed R2 illustration, and activation settings.
- `/admin/assessments/new` — compatibility redirect back to the fixed catalogue; it cannot create a format.
- `/admin/assessments/[assessmentId]` — fixed skill structure, versioned allow/disable rules, aggregate learner flags, validation, four review decisions, publication gates, and next-revision lifecycle.
- `/admin/assessments/[assessmentId]/sections/[sectionId]` — ordered stimuli and questions, protected answer keys, and version-scoped public media selectors.
- `/admin/assessments/media` — private-source upload, short-lived review preview, and reviewed public derivative workflow.

The Home programme quiz is intentionally absent from the persisted Assessment catalogue. Its questions are derived from reviewed Activities wording and are managed from **Pages**.

## Permission boundary

| Role | Read | Author | Review | Publish / derivative |
|---|---:|---:|---:|---:|
| Editor | Yes | Yes | No | No |
| Publisher | Yes | No | Yes | Yes |
| Owner | Yes | Yes | Yes | Yes |

The UI hides unavailable actions, but Convex remains the authority for every read and mutation.

## Safe authoring lifecycle

1. Choose one of the installed formats and start its next private working revision when changes are needed.
2. Adjust learner-facing metadata and decide which eligible Question Bank items are allowed or disabled for that exact revision. Every change includes `expectedContentRevision`.
3. Keep the installed skill structure and quotas fixed. A live attempt draws an eligible set at Start and permanently pins the selected question IDs and order to that attempt.
4. Run automated validation for the exact revision.
5. Record academic, rights, accessibility, and bias decisions for that same revision.
6. Publish only when `publishReadiness.ready` is true on the server. The browser does not reproduce publication policy.
7. A published version remains immutable. **Start next revision** starts the bounded clone. `cloning` closes authoring; `clone-failed` offers the idempotent **Resume revision copy** action.

Correct answers are returned only by administrator queries and edited in a visually separate protected-key panel. Public practice queries never receive that key data.

Question Bank authoring is separate from Practice Format creation. A newly authored single-choice question creates its source item, private answer key, and bank metadata together, then remains paused and excluded from full practice. An editor can attach no image, choose an existing ready Question illustration, or upload a new image directly to R2 with required alternative text. Live attempts pin the selected media ID together with the question manifest.

## Assessment R2 setup and gate

Confidential source media must use a bucket and token that are separate from the public delivery bucket. Set these in the selected Convex Cloud deployment:

```text
R2_ACCOUNT_ID
R2_API=https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ASSESSMENT_BUCKET_NAME
R2_ASSESSMENT_ACCESS_KEY_ID
R2_ASSESSMENT_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_PUBLIC_DEV=https://r2.mukhtada.my.id
```

The assessment credentials need object read/write access only to the private assessment bucket. The ordinary R2 credentials serve the reviewed public derivative bucket.

`assessmentMediaNode.getConfigStatus` is checked before an upload control appears. Missing private configuration blocks confidential upload without blocking existing public derivatives. Missing public configuration disables derivative creation without hiding the ledger.

The upload contract is:

1. Read image dimensions or audio duration and compute SHA-256 in the browser.
2. Reserve a version-pinned private object in Convex.
3. Request a short-lived signed R2 `PUT` and send only its exact required headers.
4. Verify object bytes and metadata through Convex.
5. A publisher opens a short-lived signed source preview.
6. After review, Convex creates or reuses the immutable public derivative at `r2.mukhtada.my.id`.

Stimulus selectors use `adminMedia.listAssessmentPage` with the exact assessment version, public access, purpose, and ready status. Unrelated global media pages cannot hide a valid assessment asset.

## Interaction and verification evidence

- All action controls meet the existing 44 px admin touch target.
- Ordered content has named Heroicon controls with explicit first/last disabled states.
- Destructive changes use a labelled modal confirmation, Escape/cancel handling, pending lock, and focus return.
- Layout contracts cover 1120, 760, and 360 px breakpoints plus reduced motion.
- Fixed-format UI result: 3 files, 10 tests passed.
- Integrated unit result: 45 files, 163 tests passed.
- Integrated backend result: 8 files, 63 tests passed.
- Next route generation and full TypeScript check passed.
- Fixed-format visual harness: desktop, Pixel 7, and 320 px; no horizontal overflow; controls are at least 44 px; Axe returned zero violations; reduced motion enabled.

Evidence:

- `docs/evidence/admin/assessment-workspace-desktop-chromium.png`
- `docs/evidence/admin/assessment-workspace-mobile-chromium.png`
- `docs/evidence/admin/assessment-workspace-narrow-chromium.png`

The visual harness is deliberately authenticated but data-isolated. It proves the admin layout without requiring a real administrator identity or writing test content to Convex Cloud.
