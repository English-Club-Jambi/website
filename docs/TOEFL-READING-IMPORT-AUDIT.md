# TOEFL Reading Question Bank import audit

## Scope

The supplied local reading package contains one browser bundle with embedded structured data. The import reads `topicData` from `<source-directory>/index.html`; it does not copy the source package into this repository.

Source snapshot:

- SHA-256: `2e0db6b8bc419f5271f82c0366e90ba3560fd105dd577d4c183cc24307bc4829`
- 9 topics
- 71 passages
- 501 source question records
- 500 usable single-choice questions
- 1 excluded record

| Topic | Usable questions |
| --- | ---: |
| Health and Medicine | 65 |
| Sports and Leisure | 60 |
| Social Studies | 41 |
| Science and Nature | 57 |
| Music | 44 |
| Literature and Literary Criticism | 66 |
| Arts and Humanities | 55 |
| U.S. History and Politics | 65 |
| Popular Culture | 47 |

The excluded record is `sports_and_leisure/section_07_the_revival_of_the_olympic_games_and_the_panathenaic_stadium/q_442`. All five source choices are empty, including the choice identified by the source answer key. The importer does not invent missing wording.

## Evidence and rights boundary

Every imported question has a prompt, two to eight distinct choices, an answer key that resolves to one choice, and an explanation. Passage paragraphs remain ordered and every imported question retains its source passage relationship.

The package names source PDF files and page numbers but includes no licence, permission record, publisher release, or public redistribution grant. Importing the records is therefore an editorial ingestion step, not publication approval.

All new rows enter development with:

- `status: paused`
- `fullPracticeEligible: false`
- `profile: ec-itp-level-1-aligned-v1`
- `taskFamily: read-academic-passage`
- `origin: bank-authored`
- `seedBatch: toefl-reading:<source-sha256>`
- provenance marked `unverified-review-required`

Paused rows are visible in the protected Question Bank when the status filter is set to Paused. They cannot enter a Quick Reading or complete-practice manifest until an authorised editor clears the content and rights review, changes the row to Ready, and the active Practice Format permits it.

## Data mapping

One source passage becomes one `assessmentStimuli` reading record. Its questions become separate `assessmentItems`, and each answer becomes a private `assessmentAnswerKeys` record. Each item is connected to one `assessmentQuestionBank` row through immutable source IDs.

The source file name, page numbers, topic, section, passage, question number, and dataset checksum are stored in provenance JSON. Local workstation paths are not stored. The internal authoring ledger allocates a complete passage batch to one version and never crosses the 50-item section ceiling.

## Retry and conflict contract

The stable bank key is:

```text
import/toefl-reading/<topic-id>/<section-id>/<question-id>
```

A retry with the same checksum reports existing records and performs no duplicate writes. A stable-key collision from a different snapshot or profile fails the transaction. An active content-fingerprint match is skipped rather than duplicated. Admin copy-on-write edits retain the original stable bank key and seed-batch identity.

## Operator command

The command is development-only and checks both `CONVEX_DEPLOYMENT` and `CONVEX_URL` before the first mutation:

```bash
npm run practice:import-reading -- <source-directory>
```

The server mutation independently rejects any target other than the configured development cloud or the test runtime. After all passage transactions, the verifier recounts the batch through its seed index and validates every item, answer key, section, passage, version, and internal source definition.

## Verification checklist

- [x] Embedded JSON parser rejects malformed relationships and missing answer keys.
- [x] Empty source choices are excluded without generated replacements.
- [x] Convex import is idempotent by stable key and checksum.
- [x] All imported rows default to Paused and outside Practice selection.
- [x] One passage is shared by every item in its source section.
- [x] Answer keys remain in the private answer-key table.
- [x] Batch verification is indexed and bounded to the 501-record source ceiling.
- [x] Development cloud import and exact record recount: 500 records, 71 passages, 500 Paused, 0 Ready, 0 Archived, 0 invalid source graphs, and 0 duplicate skips.
- [x] Full second import completed against the same checksum and returned the same 500-record/71-passage graph without a collision or count change.
- [x] Admin browser review of the Paused filter and one question editor: 20-row page, five answer choices, import/review tags, no serious or critical Axe finding, no horizontal overflow, and no client error.

The post-import scale check exposed an older verifier that read the complete Question Bank with a 500-row ceiling. It now reads only the active Ready pool through the existing profile/status/skill index, capped independently at 200 rows per paper skill. Paused editorial inventory no longer breaks seed verification or changes learner selection.
