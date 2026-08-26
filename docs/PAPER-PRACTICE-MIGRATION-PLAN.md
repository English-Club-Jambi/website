# Paper-based practice migration plan

Date: 26 August 2026

## Goal

Replace the active four-skill full practice with a versioned three-section paper-based form while preserving every previously delivered attempt. Align the public Practice area, random Question Bank selection, Practice Builder, scoring, cloud seed data, and documentation around one contract.

## Release contract

| Area | New active contract |
| --- | --- |
| Profile | `ec-itp-level-1-aligned-v1` |
| Full form | Listening 50, Structure 40, Reading 50 |
| Timing | 35, 25, and 55 minutes |
| Full total | 140 questions, 115 minutes |
| Quick forms | Listening, Structure, Reading |
| Score policy | `paper-estimate-v1` |
| Result model | `ec-paper-linear-v1` |
| Total estimate | 310–677 |
| Question delivery | Random, without duplicate fingerprints, pinned per attempt and skill |
| Admin default | All ready, compatible questions inherit eligibility; explicit disable wins |

## Migration invariants

1. Published versions and submitted attempts are immutable.
2. Existing four-skill results remain renderable using `ec-ibt-style-v1`.
3. New attempts can start only from the paper profile.
4. A selected item must match the active profile, section skill, reviewed state, and media requirements.
5. Listening selections require ready public audio.
6. One content fingerprint can appear at most once in an attempt.
7. The 140-item selection manifest is written before the learner sees the first item.
8. Admin overrides apply to the current paper profile and cannot rewrite a published attempt manifest.
9. A failed seed or migration leaves the previous published state usable.
10. The score method and disclaimer are server-owned, not accepted from the client.

## Work sequence

### 1. Research and claim boundary

- Record ETS section, timing, score range, no-penalty rule, equating statement, and total formula.
- Separate official facts from the English Club fixed-linear estimator.
- Add public wording that avoids official-score and exact-prediction claims.

### 2. Data and scoring contract

- Add `paper-estimate-v1` without removing historical score policies.
- Add `ec-paper-linear-v1` result fields as optional schema additions.
- Implement pure section and total estimate functions with endpoint, rounding, malformed-input, and ordering tests.
- Branch finalization by version score policy.
- Keep historical iBT fields and rendering.

### 3. Original paper question bank

- Create 50 Listening, 40 Structure, and 50 Reading selectable records.
- Reuse only English Club-authored material with documented provenance.
- Add three original Listening items so the pool reaches 50.
- Add 40 original Structure questions split across sentence completion and written-expression recognition.
- Add `structure-sentence-completion` and `structure-written-expression` task families.
- Keep old Writing and Speaking rows for historical traceability, but exclude them from the active paper profile.

### 4. New versioned definitions

- Seed a new full-practice definition and three quick definitions.
- Publish only after validation, provenance, media, and review gates pass.
- Retire the old four-skill public definitions after the new paper definitions are published.
- Preserve old definitions, versions, sections, items, answer keys, attempts, and results.

### 5. Public Practice migration

- Show three quick-practice choices.
- Present the paper section order, counts, timing, score range, and estimation caveat.
- Reject legacy quick Writing and Speaking URLs as unavailable.
- Render paper result estimates and raw correct counts.
- Continue rendering historical four-skill results with their old model.

### 6. Practice Builder migration

- Default the Question Bank to the paper profile.
- Show capacity targets 50 / 40 / 50.
- Group Task Family options under Listening, Structure, and Reading.
- Allow creating and editing Structure questions.
- Keep optional illustration support and required Listening audio.
- Make all ready compatible paper questions allowed by default; an explicit disable remains authoritative.
- Show three-section format facts and paper score policy in assessment metadata.

### 7. Cloud migration

- Push schema and functions to `dev:perfect-greyhound-270` only.
- Run the versioned paper seed and media attachment process.
- Verify exact definitions, section counts, ready capacity, published status, random section flags, and scoring policy.
- Run an idempotent second seed and confirm no duplicate definitions, bank rows, items, or media ledgers.

### 8. Verification

- Backend unit and Convex tests for scoring, eligibility, random selection, explicit disable, fingerprint dedupe, media gates, migration idempotency, and historical result compatibility.
- Public browser flow on desktop, Pixel 7, and 320 px: start full practice, inspect 140-item manifest, confirm 50/40/50 skills, answer/submit, inspect 310–677 result, Axe, console, touch, and overflow.
- Admin browser flow: three-section capacity, Structure task-family grouping, create/edit controls, enable/disable round trip, and public-manifest integration.
- Full typecheck, lint, backend/unit tests, production build, and diff check.

## Rollback

- The old definitions are retired, not deleted.
- If the new publication fails, restore the old definition status pointer without changing historical rows.
- Paper results are tagged with a distinct model, so rollback does not reinterpret prior scores.
- Seed operations use stable keys and are idempotent; partial media attachment can resume safely.

## Acceptance checklist

- [x] No active full-practice Speaking section.
- [x] Full practice contains exactly 50 Listening, 40 Structure, and 50 Reading questions.
- [x] Full duration is 115 minutes in standard mode.
- [x] Quick practice offers only Listening, Structure, and Reading.
- [x] Result total is always an integer from 310 through 677.
- [x] Perfect raw counts return 68 / 68 / 67 and 677.
- [x] Zero raw counts return 31 / 31 / 31 and 310.
- [x] Result copy states that the estimate is not official or ETS-equated.
- [x] Admin capacity and Task Family controls use the same three skills.
- [x] Random delivery is scoped by section skill and has no duplicate fingerprints.
- [x] Listening selections always include ready audio.
- [x] Old four-skill attempts and results still load.
- [x] Development cloud seed and rerun both pass.
- [x] Public browser evidence passes at desktop, Pixel 7, and 320 px; Admin pool and popup interaction contracts pass focused Convex and React tests.
- [x] Final tree passes security, tests, build, and Git diff checks.

## Adjustment ledger

- [x] Keep quick-practice scoring raw (`correct / 8` plus percentage); never apply the 310–677 total formula to a one-section sprint.
- [x] Scope Practice Format pool reads to the selected profile and ready status before applying the 200-row safety ceiling, so historical bank rows cannot block a 140-item paper workspace.
- [x] Preserve the split Question Bank workspace for fast inline edits and add a reusable focus-contained popup for longer question revisions.
- [x] Push the scoped pool query to the named development deployment and reproduce the historical-row overflow shape in a Convex regression; the active 140-question overview remains readable when the global catalogue exceeds 200 rows.
- [x] Exercise the popup's open, close, form reuse, focus return, and stale-revision remount in React; keep the credential-gated desktop/mobile browser contract ready without claiming an unavailable authenticated session.
