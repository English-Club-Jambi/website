# Assessment question-pool repair

Date: 26 August 2026

## Incident

Selecting **Allow** in a fixed Practice Format could call
`adminAssessmentPools:setQuestionAllowed` and fail with
`QUESTION_BANK_SKILL_NOT_USED`.

The question skill was valid. The affected working revisions were older clones
whose sections had lost the inherited pool fields:

- `deliveryMode`
- `bankProfile`
- `bankSelectionContract`

Their published source revisions still contained the complete, reviewed
`random-bank` configuration.

## Repair contract

The mutation keeps its skill guard. It repairs a section only when all of the
following are true:

1. the target is a mutable cloned revision;
2. the target section has the legacy missing-field shape;
3. the exact source revision belongs to the same Practice Format;
4. the source section has the same section key and skill;
5. the source is published and has a valid `random-bank` contract for the same
   profile.

The inherited pool configuration and the requested Allow/Disable rule are
written in one Convex transaction. The content revision is incremented once,
validation state is cleared, and an assessment audit event is recorded. A
genuinely unrelated skill still fails closed with
`QUESTION_BANK_SKILL_NOT_USED`.

Clone retries now also repair this exact legacy shape instead of skipping an
existing incomplete section.

## Development-cloud repair

The bounded maintenance mutation repaired three existing working revisions:

- Quick Reading: one section;
- Quick Listening: one section;
- Quick Speaking: one section.

No published version, learner attempt, response, answer key, or question-bank
record was changed. A second run is idempotent and reports zero repairs.

## Verification

- focused assessment seed tests reproduce and remove the original failure;
- inherited default questions become effective without an unnecessary explicit
  rule;
- the repaired section returns to `random-bank` with the expected profile and
  selection contract;
- maintenance is bounded and idempotent;
- all Convex backend tests, TypeScript, ESLint, and Convex dry-run codegen pass;
- port 3987 remains running throughout the repair.
