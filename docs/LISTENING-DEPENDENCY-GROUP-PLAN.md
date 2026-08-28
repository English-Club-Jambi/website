# Listening dependency groups

Status: implemented and verified, 29 August 2026
Target: Convex development deployment `dev:perfect-greyhound-270`
Public storage: `https://r2.mukhtada.my.id`

## Interpreted brief

Use the supplied Listening practice document as evidence for how a listening set behaves, not as a licence to republish its material. A live practice session must choose reviewed questions from the shared Question Bank by skill. When several questions depend on one recording, the recording's anchor question is mandatory and appears first. The session may choose only some follow-ups, but it must never deliver an orphan follow-up. The selected relationship is frozen in the attempt manifest, so later Question Bank edits cannot rewrite an active attempt.

This same contract applies to Full Practice and Quick Listening. Practice Builder must expose the relationship clearly enough for an administrator to understand why one row controls several follow-ups.

## Evidence gathered

### Supplied document

The 76-page PDF contains a Listening section on pages 15 through 22. Its useful structural evidence is:

| Set | Parent media | Questions | Additional replay media | Delivery implication |
| --- | --- | ---: | ---: | --- |
| Academic lecture | One complete lecture recording | 6 | 2 question-specific clips | All six questions depend on the lecture; replay clips add local context but do not replace the parent. |
| Campus conversation | One complete conversation recording | 5 | 1 question-specific clip | All five questions depend on the conversation; the complete conversation remains the shared parent. |

The [supplied practice PDF](https://www.marianas.edu/media/TestingServices/TOEFL/TOEFL_Practice_Questions.pdf) attributes its practice content to a commercial preparation provider. [ETS licensing guidance](https://www.ets.org/legal/permissions/licensing.html) also states that ETS materials require permission for reproduction. Therefore the implementation copies neither the wording nor linked media. It recreates only the dependency pattern using English Club-authored questions and recordings.

The complete structural inventory is recorded in [`docs/data/toefl-listening-reference-recap.json`](data/toefl-listening-reference-recap.json). It includes all 11 question positions, answer labels, two parent recordings, three replay links, media metadata, and anchor/follow-up edges. Its prompt and option fields are paraphrased summaries, and its rights block explicitly prevents direct public seeding.

### Original academic content source

The first English Club set is an original mini-lecture about room reverberation. A [CDC/NIOSH room-acoustics report](https://www.cdc.gov/niosh/hhe/reports/pdfs/2011-0129-3160.pdf) provides the factual basis: reverberation time measures how long sound takes to fall by 60 decibels; it depends on room volume, surface area, and material absorption; absorbent materials and room size change how speech or music is heard. The script and questions are newly written and retain that source in internal provenance.

The second set will be an original fictional campus conversation about arranging an oral-history recording. It will not make factual or institutional claims about the real English Club.

## Rights and provenance contract

- The supplied PDF URL is stored only as a structural reference in documentation.
- No third-party prompt, answer option, transcript, clip, or audio file is inserted into Convex or R2.
- Every new stimulus records `sourceType: english-club-original`, its authoring batch, factual references where applicable, and an explicit `copiedText: false` / `copiedMedia: false` declaration.
- Generated speech is labelled as a synthetic delivery derivative of an English Club-authored transcript.
- Public audio uses a versioned R2 key and the existing ready-media verification path.
- The seed is safe to rerun and refuses an unexpected bank-key collision.

## Persistent data contract

All fields are optional for backward compatibility. Existing independent questions remain valid without a backfill.

### `assessmentQuestionBank`

- `dependencyGroupKey?: string`: stable identifier shared by one anchor and its follow-ups.
- `dependencyRole?: "anchor" | "follow-up"`: meaning inside the set.
- `parentBankQuestionId?: Id<"assessmentQuestionBank">`: required for a follow-up; absent for its anchor.

### `assessmentAttemptItems`

- `dependencyGroupKey?: string`
- `dependencyRole?: "anchor" | "follow-up"`
- `parentAttemptItemOrder?: number`: immutable order of the selected anchor in this attempt.

These pinned fields make the delivered sequence auditable without re-reading mutable Question Bank metadata.

## Source-integrity rules

A dependency set is eligible only when all of these are true:

1. The anchor and follow-up share profile, skill, and dependency group key.
2. The anchor has role `anchor` and no parent ID.
3. A follow-up has role `follow-up` and points to that anchor.
4. Both source items belong to valid ready/published sources under the existing Question Bank integrity gate.
5. Listening rows resolve to a ready public assessment audio derivative.
6. Listening set members resolve to the same ready parent-audio derivative, even if later copy-on-write edits place their source items in different ledger revisions.
7. No row forms a self-reference, cycle, or cross-skill dependency.
8. Fingerprint deduplication still applies.

Malformed groups are excluded from capacity and selection. They do not silently degrade into independent questions.

## Set-aware selection algorithm

For each random-bank section:

1. Load at most 200 Ready candidates and at most 200 explicit Practice Format rules through the existing indexes.
2. Apply source integrity and fingerprint deduplication.
3. Resolve format rules. A disabled anchor suppresses its follow-ups. A disabled follow-up suppresses only itself.
4. Shuffle candidate rows.
5. When an independent row is encountered, select it if capacity remains.
6. When a follow-up is encountered and its anchor is not selected, reserve two places and insert anchor then follow-up. If only one place remains, skip the follow-up and continue looking for an independent row or anchor.
7. When an anchor is encountered, select it once; later eligible follow-ups may join it while capacity remains.
8. Recompose the final selection into contiguous blocks: anchor first, then the sampled follow-ups in randomized order.
9. Require the exact section quota and validate dependency closure again before writing.
10. Pin each relationship and parent order into `assessmentAttemptItems` in the same transaction as the attempt.

The algorithm does not promise that every child appears. It does guarantee that no child appears without the parent, and that all selected members of one set stay together.

## Original seed content

Batch: `ec-listening-dependency-groups-v1`

### Set A: Hearing the room

- Skill: Listening
- Task family: Listen to an academic talk
- One complete parent recording
- Six single-choice questions: purpose, definition, material comparison, organization, inference, and practical implication
- Factual provenance: CDC/NIOSH room-reverberation report

### Set B: Preserving a campus voice

- Skill: Listening
- Task family: Listen to a conversation
- One complete parent recording
- Five single-choice questions: purpose, requested preparation, reason, next action, and speaker attitude
- Fictional campus scenario with no claim about a real person, department, event, or policy

The first question in each set is the anchor. Remaining questions are follow-ups.

## Admin behavior

- Question Bank rows show `Set anchor` or `Follow-up` and the set label.
- Selecting a follow-up also shows the anchor prompt.
- The Practice Format panel explains that inherited anchors control set availability.
- Disabling an anchor presents the effective consequence without writing redundant child-rule rows.
- Direct editing remains copy-on-write. Relationship metadata survives the replacement source item.
- Add Question stays independent in this iteration; creating arbitrary dependency sets receives a separate, validated authoring workflow rather than hidden free-text IDs.

## Public live-session behavior

- Full Practice and Quick Listening use the same Ready, skill-scoped Question Bank.
- Each attempt receives a different randomized selection when the pool permits, but the manifest is immutable once created.
- A selected set is delivered as a contiguous block with its anchor first.
- The complete parent audio is available throughout every selected question in that set.
- The UI may label the relationship as `Listening set` and `Follow-up`; this supports orientation without revealing answer metadata.
- Existing independent Listening questions continue to render unchanged.

## Verification matrix

### Pure and Convex tests

- Independent questions still fill an exact quota.
- A selected follow-up always inserts its anchor first.
- Multiple selected follow-ups share one anchor and remain contiguous.
- A child is skipped when only one slot remains and its parent is absent.
- Disabled anchor suppresses every child.
- Disabled child does not suppress its anchor or siblings.
- Wrong group, skill, parent, source stimulus, or missing audio is excluded.
- Attempt rows pin group, role, and parent order.
- Rerunning the seed inserts nothing and preserves reviewed edits.
- Bank-key collision from an untrusted source rejects atomically.

### Cloud and browser proof

- Development push target is announced and checked before any Convex command that changes deployment state.
- Seed verification reports two groups, two anchors, nine follow-ups, two ready audio derivatives, and no orphan row.
- Full Practice starts with exact 50/40/50 quotas and a structured Listening block.
- Quick Listening starts with eight questions and either a valid set block or only independent questions; never an orphan.
- Desktop, Pixel 7, and 320 px checks cover real touch, audio playback source, parent-first order, Axe serious/critical zero, no console/page errors, and no horizontal overflow.
- Port 3987 is observed but never killed or restarted by the workflow.

## Implementation order

1. Add validators and optional schema fields.
2. Implement pure relationship validation and structured selection.
3. Pin relationship metadata at attempt creation and expose safe orientation data.
4. Add idempotent internal seed functions and an R2 upload script for the two original recordings.
5. Add Practice Builder relationship labels.
6. Add unit and Convex regression coverage.
7. Run local type, lint, backend, seed-script, and codegen checks.
8. Announce and perform development-only Convex push.
9. Seed, verify exact cloud data, and run browser proof.
10. Review screenshots and diffs, update this plan/tracker with measured evidence, then create a scoped commit.

## Delivery evidence

- Development contract pushed only to `dev:perfect-greyhound-270` for team `nasution`, project `english-club`.
- Seed run created 11 original rows: two anchors and nine follow-ups. The second run inserted zero rows, proving idempotence.
- Both generated parent recordings are ready on `https://r2.mukhtada.my.id`; no media linked from the supplied PDF was downloaded, copied, or published.
- Cloud verification found two dependency groups, 11 selectable rows, two ready recordings, and zero orphan follow-ups.
- Pure selector and Convex dependency regressions pass. The full backend suite passes 13 files and 94 tests; the full unit suite passes 61 files and 259 tests.
- Browser proof passes 6/6 across desktop, Pixel 7, and 320 px, and the combined custom-player plus dependency matrix passes 18/18. Each Full Listening section contains 50 items; each Quick manifest contains eight. Any selected follow-up has its anchor earlier in the same contiguous block and resolves to the same parent recording.
- Every browser project passed real mouse/touch operation, Axe serious/critical zero, zero captured console/page errors, and no horizontal overflow.
- Reviewed screenshots are stored as `docs/evidence/listening-set-{full,quick}-{desktop,mobile,narrow}-chromium.png`.
- Port 3987 stayed available throughout the verification and was never killed or restarted by this workflow.
