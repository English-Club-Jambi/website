# Practice Random Question Bank Contract

Date: 28 August 2026
Scope: public Full Practice, public Quick Practice, Practice Format controls, and immutable live-session delivery

## Outcome

Full Practice and every Quick Practice format now draw from the same reviewed Question Bank for their assessment profile. A section can only draw questions whose skill matches that section. Quick Reading cannot receive Listening or Structure questions, and the same boundary applies to every other format.

The public route does not choose questions in the browser. It resolves one published Practice Format and sends its exact definition and version to the authenticated Convex start mutation. Convex builds the random manifest, validates it, and writes it to the attempt before the learner enters the first question.

## Default and override rules

A Question Bank row is inherited by a Practice Format when all of these conditions hold:

- the format is a Full or Quick practice format, not the Home programme quiz;
- the bank row is `Ready`;
- the format and bank row use the same assessment profile;
- the section and bank row use the same skill;
- the task family belongs to that skill;
- the source item, private answer key, source version, and source section are intact;
- Listening rows have a verified, ready audio derivative;
- any referenced illustration is safe for public delivery.

Practice Format rules are evaluated after that inherited default. An explicit disable wins for every duplicate fingerprint. An explicit allow can restore a compatible reviewed question. Returning a rule to inherit removes the exception.

Rows imported as `Paused` remain visible to administrators but never enter a live session until they are reviewed and marked `Ready`.

## Structured random selection

For each random-bank section, Convex:

1. reads a bounded, indexed candidate set for the exact profile, status, and skill;
2. applies Practice Format overrides;
3. verifies source, answer-key, task-family, and media integrity;
4. collapses duplicate content fingerprints;
5. shuffles the eligible set with Fisher-Yates;
6. takes exactly the section quota;
7. validates the selected count, skill, task family, and fingerprint uniqueness;
8. stores the selection in `assessmentAttemptItems` with selection contract `1`.

The stored rows pin the source item, bank question, optional illustration, optional audio, section, and order. Editing the bank or starting another attempt cannot redraw an existing attempt.

Current published paper-format quotas are:

| Format | Listening | Structure | Reading |
| --- | ---: | ---: | ---: |
| Full Practice | 50 | 40 | 50 |
| Quick Listening | 8 | 0 | 0 |
| Quick Structure | 0 | 8 | 0 |
| Quick Reading | 0 | 0 | 8 |

The quotas belong to the published Practice Format. Bank capacity can be larger and is expected to grow.

## Public integration path

```text
/practice
  -> published Practice Format summary from Convex
  -> /practice/full or /practice/quick/{skill}
  -> anonymous Convex Auth identity on Start
  -> assessmentAttempts.start(definitionId, versionId, preferences)
  -> server-side eligible pool and random selection
  -> immutable assessmentAttemptItems manifest
  -> /practice/attempt/{attemptId}
  -> player reads only the pinned manifest
```

## Verification

The Convex regression in `tests/convex/assessment-seed.test.ts` proves:

- Full Practice receives 140 unique bank questions in the required 50/40/50 structure;
- every Quick Practice receives exactly eight questions from its matching skill;
- Quick manifests include compatible reviewed questions beyond the eight questions originally authored inside that Quick format;
- no selected manifest contains duplicate fingerprints;
- source items and task families match their bank records;
- two Reading Quick attempts receive different manifests;
- starting the second attempt does not alter the first manifest;
- unauthenticated starts are rejected;
- a repeated start request returns the same attempt rather than creating a new draw.

The development deployment verifier reported 164 `Ready` rows: 58 Listening, 48 Structure, and 58 Reading. The published formats contain six random-bank sections and retain their exact 50/40/50 Full quotas.

Post-push browser verification covered Full, Quick Listening, Quick Structure, and Quick Reading on desktop, Pixel 7, and 320-pixel viewports. All six Full/Quick project cases passed against `perfect-greyhound-270`. The run used the existing Next server on port 3987; it did not restart or replace that process.
