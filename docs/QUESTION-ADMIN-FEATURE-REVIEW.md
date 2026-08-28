# Question administration feature review

Reviewed on 29 August 2026 against the shared working tree after the Question
Bank deletion, numbered pagination, and Practice Format question-review work
stabilised. The final pass includes the cloud development functions and a real
browser audit at desktop, Pixel 7, and 320 px. Production was not changed.

## Verdict

- **P0:** 0
- **P1:** 1 capacity ceiling
- **P2:** 0
- **Release safety:** the new delete, numbered-pagination, and review-dialog
  paths have no discovered security or data-integrity blocker.
- **Impeccable audit score:** 19/20. Accessibility, responsive composition,
  theme use, anti-slop design, and constructed-response completeness are
  sound. The remaining point is reserved for the existing 200-row Practice
  Format ceiling.

## P1

### Practice Format question pool stops working above 200 records

`getOverview` reads a maximum of 201 ready bank rows, rules, and learner-flag
signals and deliberately throws when any collection exceeds 200
(`convex/adminAssessmentPools.ts:403-439`). The client then filters and paginates
the complete returned array in memory
(`src/components/admin/assessments/assessment-question-pool-manager.tsx:82-125`).

This is bounded and indexed, so it is not an unbounded-read defect. It is a
capacity defect: once the reviewed bank for a profile reaches 201 ready
questions, `/admin/assessments/{id}` cannot load at all. The current Question
Bank catalogue pagination does not remove that ceiling.

Recommended correction: give the Practice Format pool its own indexed,
server-cursor page query and obtain section capacity and rule/flag summaries
through bounded aggregate queries. Do not replace the guard with a larger
`.take()` value. Page totals should either come from a maintained aggregate or
remain explicitly described as a discovered cursor horizon.

## P2 resolved

### Constructed-response review now shows every enforced limit

The protected review contract includes `minimumWords`, preparation time,
response time, and the rubric's minimum word count
(`convex/adminAssessmentPools.ts:155-168`). The dialog now renders all of them
beside response mode, recommended words, character limit, and maximum rubric
points. Zero or absent word limits are labelled `Not set`; absent preparation
and response timers are labelled `Not set` and `Not timed` respectively.

Focused fixtures cover an untimed constructed Writing response and a timed
Speaking response, so the review surface cannot silently drop either kind of
constraint.

## Passed controls

| Control                          | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deletion authorization           | Pass   | `deleteQuestion` requires `admin:manage`; editor, publisher, and anonymous calls are rejected (`convex/adminAssessmentQuestionBank.ts:2193-2222`, `tests/convex/question-bank-delete.test.ts:235-258`).                                                                                                                                                                                                    |
| Optimistic concurrency           | Pass   | Delete requires the last observed `updatedAt` and returns a typed conflict instead of deleting a changed row (`convex/adminAssessmentQuestionBank.ts:2223-2229`, `tests/convex/question-bank-delete.test.ts:260-286`).                                                                                                                                                                                     |
| Referential integrity            | Pass   | Indexed single-row checks cover child questions, version rules, flag history, and attempt snapshots; dependency-set members are also blocked (`convex/adminAssessmentQuestionBank.ts:2230-2285`, `convex/schema.ts:566`, `convex/schema.ts:625`, `convex/schema.ts:647`, `convex/schema.ts:742-745`).                                                                                                      |
| Immutable history                | Pass   | Only the reusable bank row is deleted; source definition/version/section/item, answer key, and media survive, and a delete audit is written (`convex/adminAssessmentQuestionBank.ts:2287-2299`, `tests/convex/question-bank-delete.test.ts:181-233`).                                                                                                                                                      |
| Review authorization and privacy | Pass   | The answer-key/media query requires `assessment:read`, validates definition/profile/source relationships, returns no participant/attempt/response data, and rejects anonymous access (`convex/adminAssessmentPools.ts:619-741`, `tests/convex/question-bank-audio.test.ts:341-405`).                                                                                                                       |
| Review read bounds               | Pass   | Review uses point reads, one indexed unique answer-key lookup, and at most nine section reads (`convex/adminAssessmentPools.ts:645-717`).                                                                                                                                                                                                                                                                  |
| Media and native audio safety    | Pass   | Only ready, public, purpose-matched audio on the fixed R2 host is projected; the native player has controls, `preload="metadata"`, and no autoplay (`convex/lib/media.ts:135-180`, `src/components/admin/assessments/assessment-question-pool-manager.tsx:737-770`).                                                                                                                                       |
| Dialog accessibility             | Pass   | Native modal semantics, unique labels, Escape/backdrop close, focus containment, body-scroll restoration, and opener-focus return are present (`src/components/admin/admin-workspace-dialog.tsx:34-149`, `src/components/admin/assessments/assessment-question-pool-manager.tsx:389-399`).                                                                                                                 |
| Dialog mobile layout             | Pass   | The dialog body owns overflow, review grids collapse to one column, controls become full-width, and audio/images stay fluid. Real Pixel 7 and 320 px runs found no document overflow, clipping, or sub-44 px dialog controls (`src/components/admin/admin-shell.module.css:403-500`, `src/components/admin/assessments/assessment-admin.module.css:774-966`, `tests/e2e/question-administration.spec.ts`). |
| Question Bank read bounds        | Pass   | Each filter combination uses a matching compound index and an enforced 20-row cursor page (`convex/adminAssessmentQuestionBank.ts:1921-1991`).                                                                                                                                                                                                                                                             |
| Numbered cursor correctness      | Pass   | Only discovered pages plus one proven next horizon are shown; filters reset history; terminal deletion truncates stale cursors before returning to the predecessor (`src/components/admin/assessments/question-bank-manager.tsx:202-267`, `src/components/admin/assessments/question-bank-manager.tsx:289-293`, `src/components/admin/assessments/question-bank-manager.tsx:522-584`).                     |
| Honest page counts               | Pass   | The catalogue does not invent a database-wide total. A next page number appears only when the current cursor result says more data exists; the regression suite proves terminal and long-history behavior (`tests/unit/question-bank-pagination.test.tsx:185-330`).                                                                                                                                        |

## Defects caught and resolved during review

- Permanent delete was removed from the focused editor popup, preventing a
  nested confirmation dialog and conflicting body-scroll ownership. It remains
  available in the inline Question Bank editor only
  (`src/components/admin/assessments/question-bank-manager.tsx:509-518`,
  `src/components/admin/assessments/question-bank-manager.tsx:588-608`).
- Deleting the sole question on page 2 or 3 now truncates that page and every
  later cursor before returning to the exact predecessor
  (`src/components/admin/assessments/question-bank-manager.tsx:289-293`,
  `tests/unit/question-bank-pagination.test.tsx:292-330`).
- Repeated visible `Review` buttons now have question-specific accessible names
  (`src/components/admin/assessments/assessment-question-pool-manager.tsx:389-399`).
- Cloud fixtures exposed duplicate prompt text, so accessible names now include
  the visible row number as well as the prompt. This makes every Review trigger
  unambiguous without changing the public question text.
- The first mobile browser run found that a long review heading could flex the
  close control below 44 px. The shared icon-button contract now fixes its basis
  and minimum width at 44 px, and both narrow viewports pass the target-size
  assertion (`src/components/admin/admin-shell.module.css`).
- The audio section uses a per-instance React ID instead of a duplicated static
  ID, and the dependency prompt is exposed only after its source relationships
  are validated (`src/components/admin/assessments/assessment-question-pool-manager.tsx:653-664`,
  `convex/adminAssessmentPools.ts:718-741`).

## Verification record

Passed after pushing the new functions only to development deployment
`dev:perfect-greyhound-270`. Port 3987 remained alive and production was not
changed:

```text
npm test -- --run tests/convex/question-bank-delete.test.ts tests/convex/question-bank-audio.test.ts tests/unit/question-bank-manager.test.tsx tests/unit/question-bank-pagination.test.tsx tests/unit/assessment-question-pool-manager.test.tsx
5 files passed; 32 tests passed.

npm run typecheck
Passed.

npx eslint convex/adminAssessmentPools.ts convex/adminAssessmentQuestionBank.ts convex/schema.ts src/components/admin/assessments/assessment-question-pool-manager.tsx src/components/admin/assessments/question-bank-manager.tsx tests/convex/question-bank-delete.test.ts tests/convex/question-bank-audio.test.ts tests/unit/assessment-question-pool-manager.test.tsx tests/unit/question-bank-manager.test.tsx tests/unit/question-bank-pagination.test.tsx
Passed.

npx playwright test tests/e2e/question-administration.spec.ts --workers=1
6 browser cases passed: desktop, Pixel 7, and 320 px for both Question Bank
pagination/delete and Practice Format Review.
```

The browser pass also recorded zero serious or critical Axe findings, zero
client errors, zero horizontal overflow, correct focus return, 44 px minimum
dialog controls, and a successful metadata request for the protected R2 audio.

## Visual evidence

- `docs/evidence/admin/question-review-desktop-chromium.png`
- `docs/evidence/admin/question-review-mobile-chromium.png`
- `docs/evidence/admin/question-review-narrow-chromium.png`
- `docs/evidence/admin/question-bank-pages-desktop-chromium.png`
- `docs/evidence/admin/question-bank-pages-mobile-chromium.png`
- `docs/evidence/admin/question-bank-pages-narrow-chromium.png`

The sole remaining item is the system-wide Practice Format capacity migration
described under P1. It is intentionally not disguised as a page-only fix: the
admin pool and live attempt selector must move together to preserve the same
deduplication and dependency rules.
