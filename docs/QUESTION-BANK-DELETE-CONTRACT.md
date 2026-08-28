# Question Bank deletion contract

Question deletion is a permanent, owner-only operation for unused Question
Bank rows. It is intentionally stricter than pausing or archiving a question.

## Convex API

`adminAssessmentQuestionBank.deleteQuestion`

- Arguments: `bankQuestionId` and the row's last observed `expectedUpdatedAt`.
- Success: `{ ok: true, deletedBankQuestionId }`.
- Concurrent edit: `{ ok: false, code: "conflict", currentUpdatedAt }`.
- Protected reference: `{ ok: false, code: "blocked", reason }`, where `reason`
  is `dependency_group`, `dependent_question`, `version_rule`, `flag_history`,
  or `attempt_history`.
- Missing rows and authorization failures are Convex errors.

Only an active owner with `admin:manage` can call the mutation. The mutation
uses indexed, single-row reference checks inside one transaction, so a new
reference cannot race the final delete.

## Retention boundary

Deletion removes only the `assessmentQuestionBank` row. Source definitions,
versions, sections, immutable assessment items, answer keys, and media assets
remain available for audit and provenance. A successful deletion writes a
`cmsAuditEvents` record with the `delete` action.

Questions that already participate in a dependency set, revision-specific
format rule, learner-flag history, or attempt snapshot must be retained. Admins
can pause or archive those questions instead.
