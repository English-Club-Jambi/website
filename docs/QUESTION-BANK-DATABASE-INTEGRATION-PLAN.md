# Question Bank and Database Integration Plan

Status: implementation contract
Target: Convex development deployment `perfect-greyhound-270`
Date: 26 August 2026

## 1. Outcome

English Club will use Convex as the source of truth for four connected areas:

1. the Assessment Lab question bank and the questions selected for each full-practice attempt;
2. the public member directory and the member records edited in Administration;
3. the public theme pointer and the theme recipes available in Appearance;
4. the existing Assessment Lab definitions, media, attempts, responses, and results.

The seed remains a development operation. It writes real records to the configured Convex deployment and real reviewed derivatives to the configured public R2 bucket. Public components do not import a showcase roster or a theme recipe as their normal data source after this work.

## 2. Evidence ledger

### 2.1 Assessment structure

ETS currently describes the updated TOEFL iBT structure as four sections with 50 Reading items, 47 Listening items, 12 Writing tasks, and 11 Speaking tasks. The published task families are:

- Reading: Complete the Words, Read in Daily Life, Read an Academic Passage;
- Listening: Listen and Choose a Response, Listen to a Conversation, Listen to an Announcement, Listen to an Academic Talk;
- Writing: Build a Sentence, Write an Email, Write for an Academic Discussion;
- Speaking: Listen and Repeat, Take an Interview.

Sources:

- <https://www.ets.org/content/ets-org/br/en/home/toefl/test-takers/ibt/about/content.html>
- <https://www.eu.ets.org/pdfs/toefl/toefl-enki-test-specifications-2026.pdf>

Boundary: English Club does not own ETS calibration, adaptive-routing models, operational item statistics, automated speech scoring, or official score conversion. The product may report exact raw results for its own original questions and a clearly named fixed-form practice estimate. It must not claim an official TOEFL score, prediction, certificate, or admissions result.

### 2.2 Question-bank structure

1EdTech QTI separates assessment items, tests, sections, selection, ordering, results, and item-bank exchange. This supports a source model where questions are reusable records and a delivery model where a test receives a selected set rather than owning the only copy of every question.

Source:

- <https://www.1edtech.org/standards/qti/index>

Moodle's maintained question-bank documentation provides two practical constraints that match the requested flow:

- random questions are selected from eligible ready questions;
- the same question must not appear twice in one quiz;
- a bank must contain enough eligible questions for the requested quota;
- versioning and usage visibility are part of question-bank administration.

Sources:

- <https://docs.moodle.org/502/en/Question_banks>
- <https://docs.moodle.org/501/en/Building_Quiz>
- <https://docs.moodle.org/502/en/Random_question_type>

### 2.3 Convex execution

Convex mutations are transactional and deterministic. The default runtime supplies seeded `Math.random()` inside mutations, and retries preserve deterministic effects. The selection therefore belongs in the same start mutation that creates the attempt; the chosen rows are then persisted before the mutation commits.

Sources:

- <https://docs.convex.dev/functions/runtimes>
- <https://docs.convex.dev/functions/mutation-functions>

## 3. Non-negotiable product boundaries

- The public Assessment Lab receives no answer keys.
- The client never chooses question IDs or submits a random seed.
- A started attempt never reads a live bank to decide which question comes next.
- Editing or pausing a bank record never changes an existing attempt.
- One bank question cannot appear twice in one attempt.
- A pool shortage blocks Start before any partial attempt is written.
- Idempotent Start returns the same attempt and the same selection.
- Full practice uses the four current task counts. Quick practice remains fixed in this release.
- Constructed Writing and Speaking responses use the existing transparent English Club rubric estimate. They do not pretend to reproduce ETS machine scoring.
- Development seed records carry internal provenance. Public pages use natural organization copy and do not display QA language.
- Member seed portraits are generated people, never presented as documentary photographs of real English Club members.
- The development seed command refuses non-development targets.

## 4. Source-of-truth matrix

| Surface | Read source after this work | Admin write source | Fallback |
| --- | --- | --- | --- |
| `/practice` catalogue | published Convex definitions and versions | Assessments | honest unavailable state |
| full-practice questions | immutable attempt-selection records referencing ready bank entries | Question Bank | no fallback |
| quick-practice questions | published version items | Assessments | no fallback |
| `/members` | published and cleared Convex member rows | Members | honest unavailable or empty state |
| member portraits | public R2 object keys stored on Convex member rows | Media and Members | monogram |
| public colour scheme | published Convex theme pointer | Appearance | compiled safe theme only when Convex is unavailable |
| Appearance presets | source-reviewed recipes exposed through a Convex preset catalogue and materialized versions | Appearance | bundled recipe only before first seed |

## 5. Data model

### 5.1 `assessmentQuestionBank`

One row represents one eligible, versioned source question.

Fields:

- `bankKey`: stable seed/import key;
- `sourceItemId`: immutable `assessmentItems` row used for delivery;
- `sourceVersionId`: source version for traceability;
- `sourceDefinitionId`: source definition for admin navigation;
- `skill`: Reading, Listening, Writing, or Speaking;
- `taskFamily`: current English Club task-family key;
- `difficulty`: foundational, developing, or advanced;
- `status`: ready, paused, or archived;
- `profile`: eligible assessment profile;
- `promptSearch`: normalized, bounded prompt excerpt for admin display;
- `tags`: bounded list of normalized tags;
- `seedBatch`: optional development-seed batch identifier;
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`.

Indexes:

- unique lookup by `bankKey`;
- lookup by `sourceItemId`;
- pool read by `profile`, `status`, and `skill`;
- admin paging by `status` and `updatedAt`;
- admin paging by `skill`, `status`, and `updatedAt`.

The pool read is capped at 80 candidates per skill. The current seed contains 58 Reading, 55 Listening, 17 Writing, and 15 Speaking candidates, which is above the full-form quotas without approaching the cap.

### 5.2 `assessmentAttemptItems`

One row freezes one selected question in one attempt.

Fields:

- `attemptId`;
- target `sectionId`;
- selected `bankQuestionId`;
- selected source `itemId`;
- `order` within the target section;
- `selectedAt`;
- `selectionContract`: literal version `1`.

Indexes:

- unique lookup by `attemptId`, `sectionId`, and `order`;
- lookup by `attemptId` and `itemId` for response authorization;
- lookup by `attemptId` and `bankQuestionId` for duplicate prevention;
- bounded usage lookup by `bankQuestionId` and `selectedAt`.

### 5.3 Assessment sections

Add optional delivery metadata:

- `deliveryMode`: `fixed` or `random-bank`;
- `bankProfile`: only required for `random-bank`;
- `bankSelectionContract`: literal `1`;
- `bankSeedBatch`: optional seed lineage for audit.

Existing rows without these fields are fixed. This keeps every existing assessment and test fixture backward-compatible.

### 5.4 Members

Add internal provenance fields:

- `recordOrigin`: `reviewed` or `development-seed`;
- `seedBatch`: optional stable batch key.

Public member DTOs omit both fields. Admin DTOs show provenance so an operator can replace seeded profiles deliberately. Publishing rules remain consent-gated. The development seed is permitted to mark generated portraits and fictional profiles cleared only because the seed command is target-gated and the records are explicitly tagged internally.

### 5.5 Themes

Theme versions already provide immutable recipes and a mutable public pointer. Extend the source preset catalogue with distinct accessible recipes:

- Relay Cobalt: current bright cobalt and orange identity;
- Field Notes: leaf green, warm paper, vermilion response;
- After Class: deep plum, cool paper, electric lime response;
- Tide Room: marine blue, pale aqua, coral response.

The seed creates immutable versions for each preset if absent, publishes Relay Cobalt only when no public pointer exists, and leaves the working draft aligned with the active version. Appearance exposes these presets as reusable starting points. Selecting a preset changes the local editor state; Save writes the normal Convex draft and Publish uses the existing validated pointer flow.

## 6. Random-selection algorithm

### 6.1 Entry conditions

The start mutation first verifies:

1. authenticated anonymous or account identity;
2. idempotency key reuse contract;
3. published definition/version relationship;
4. daily-attempt quota;
5. valid contiguous section order;
6. bank pool sufficiency for every random section.

No attempt row is inserted until all pools pass.

### 6.2 Candidate collection

For each random section:

1. query `assessmentQuestionBank` with the compound profile/status/skill index;
2. take at most 80 rows;
3. remove duplicate `sourceItemId` values;
4. verify each source item and answer key still exist;
5. verify the source stimulus, when present, is still readable and its media is ready;
6. require at least `section.itemCount` eligible rows.

### 6.3 Selection

Use an in-mutation Fisher-Yates shuffle over the bounded candidate array, powered by Convex's deterministic mutation `Math.random()`. Take the first quota rows. A response never receives the random seed.

Why this is safe:

- mutation retries reproduce the same committed result;
- the idempotency lookup runs before selection;
- selected rows are persisted transactionally with the attempt;
- later requests read only persisted selection rows.

### 6.4 Delivery

For a random section, question navigation loads `assessmentAttemptItems` ordered by `order`, then hydrates the referenced immutable source items. For a fixed section, the existing `assessmentItems` query remains unchanged.

Response authorization checks selection membership for random sections and version/section membership for fixed sections. Result scoring reads the same selected rows and their private answer keys.

### 6.5 Review

The result review hydrates the exact source item and stimulus selected for that attempt. It never re-runs selection and never substitutes a newer bank record.

## 7. Question Bank administration

### 7.1 Routes

- `/admin/assessments/questions`: question-bank catalogue;
- source edit links continue to the existing assessment section editor;
- `/admin/assessments` receives a visible Question Bank action.

### 7.2 Catalogue anatomy

The catalogue is a dense reusable table/contact sheet, not a dashboard card wall.

Each row shows:

- skill and task family;
- prompt excerpt;
- item type and point value;
- difficulty;
- state;
- source assessment;
- bounded usage count;
- last update.

Controls:

- custom reusable Select fields for Skill, Difficulty, and Status;
- 20-row cursor pagination;
- edit action opening an inline metadata editor;
- source-question link;
- Pause, Ready, and Archive actions behind the shared confirmation dialog where destructive.

### 7.3 Mutation rules

- `ready` requires a valid source item and private answer key;
- a ready audio item requires ready public assessment media;
- changing tags/difficulty does not mutate source content;
- pausing/archiving affects future selection only;
- archived rows remain available to historical attempts;
- every mutation writes the existing owner audit trail.

## 8. Seed design

### 8.1 One command

Add `npm run data:seed:dev`.

The command:

1. validates `CONVEX_DEPLOYMENT` starts with `dev:` and matches `perfect-greyhound-270`;
2. validates the R2 endpoint/account/bucket without printing credentials;
3. ensures the existing five Assessment definitions and 52 audio derivatives;
4. imports all unique items from the five published forms into the question bank;
5. enables random-bank delivery only on the full practice sections;
6. crops the generated 4-by-4 portrait sheet into 15 individual WebP portraits;
7. uploads those immutable portraits to `members/development-seed-v1/` in R2;
8. verifies every portrait through `r2.mukhtada.my.id`;
9. records each portrait in `mediaAssets` as ready `member-photo`;
10. upserts the 15 fictional member profiles into `members`;
11. creates the four immutable theme preset versions and the active pointer/draft;
12. verifies counts, unique keys, public queries, and idempotency.

### 8.2 Idempotency

Stable keys:

- bank: `ec-ibt-bank-v1/<definition-slug>/<section-key>/<item-key>`;
- member: current stable member slug;
- portrait: content-addressed object key under the seed batch;
- theme: preset key and version lineage.

Running the seed again may update mutable development-seed metadata but must not duplicate rows, versions, media, or themes.

### 8.3 Rollback

The seed provides a verification report, not a destructive rollback command. Seeded members and bank rows can be archived through Administration. Theme versions remain immutable and can be restored through the existing pointer workflow.

## 9. Public integration

### 9.1 Members

Remove the source showcase decision from `MemberRelay`. The server directory result determines the roster. When Convex returns zero published records, show a concise organization-appropriate empty state. When Convex is unavailable, show a service state; do not silently substitute source fixture identities.

The card grid remains visually identical because the Convex records contain the same intended names, biographies, roles, joined years, and individual portraits.

### 9.2 Practice

The catalogue still lists the five published definitions. Starting the full form now creates a selection manifest. Quick forms continue to read their fixed published items. A small line in the full-practice start panel explains that each session draws a fresh reviewed set from the bank; it does not expose implementation jargon.

### 9.3 Theme

The root layout continues to fetch only `publicThemes.getPublished`. The seed does not bypass theme validation. Theme selection in Appearance writes to the same draft/publish APIs as manual edits.

## 10. Verification matrix

### 10.1 Unit

- deterministic shuffle has no duplicates;
- pool shortage rejects before writes;
- source prompt/tags normalization;
- theme presets all normalize and pass blocking checks;
- public members no longer choose the source showcase;
- task-family inference is stable for all seed item keys.

### 10.2 Convex

- bank seed inserts and then becomes idempotent;
- 145 source items produce the expected unique bank count;
- full attempt creates exactly 120 selections in 50/47/12/11 sections;
- two distinct start keys can produce different ordering or membership;
- one start key returns the same attempt/manifest;
- duplicate selection is impossible;
- paused/archived questions are excluded from new attempts;
- an existing attempt continues after its bank row is paused;
- response to an unselected source item is rejected;
- scoring uses only selected items;
- quick forms retain fixed behavior;
- non-admin bank reads/mutations fail;
- members seed to exactly 15 public/admin rows without duplication;
- all member portraits resolve to ready media records;
- four theme presets exist and the active pointer resolves.

### 10.3 Browser

- owner signs in and sees published assessments without first changing a misleading empty default;
- Question Bank opens from the Assessment heading;
- filters, keyboard navigation, mobile touch, focus return, and no-result state work;
- bank metadata update is reflected without a reload;
- `/members` and `/admin/members` show the same 15 records;
- Appearance exposes four presets and loading one updates both light and dark preview;
- public theme changes only after Publish;
- full practice starts, displays selected questions, saves, submits, and reviews;
- a second full attempt has a different manifest when the pool permits;
- no horizontal overflow at 320, 412, Pixel 7, and desktop;
- Axe reports no critical or serious issue;
- no console or page errors.

### 10.4 Release gates

- target deployment printed and confirmed as development before push/seed;
- no secret values appear in logs, docs, screenshots, or Git;
- R2 raw credentials remain only in `.env.local`;
- full lint, typecheck, unit, backend, production build, and Playwright suite pass;
- Convex codegen dry-run passes;
- public and admin screenshot evidence reviewed visually;
- final Git candidate secret/large-file scan passes;
- commit is the final repository mutation.

## 11. File map

Expected backend work:

- `convex/schema.ts`;
- `convex/assessmentValidators.ts`;
- `convex/assessmentQuestionBank.ts`;
- `convex/adminAssessmentQuestionBank.ts`;
- `convex/assessmentAttempts.ts`;
- `convex/lib/assessmentEngine.ts`;
- `convex/lib/assessmentModel.ts`;
- `convex/assessmentSeed.ts`;
- `convex/members.ts` and `convex/adminMembers.ts`;
- `convex/adminThemes.ts` and a development seed module.

Expected frontend work:

- new Question Bank route and reusable manager;
- Assessment catalogue action/default-state correction;
- member relay database-only rendering;
- Appearance preset chooser;
- focused CSS using the existing rounded neobrutalist admin system.

Expected operational work:

- one idempotent dev data seed script;
- R2 portrait crop/upload verification;
- database verification command;
- focused and integrated tests;
- setup/database/product documentation updates.

## 12. Completion checklist

- [ ] Question-bank schema and validators landed.
- [ ] Admin bank APIs authenticated, bounded, and audited.
- [ ] Full-attempt selection persisted transactionally.
- [ ] Player, response, scoring, and review use the manifest.
- [ ] Admin Question Bank route usable on desktop and mobile.
- [ ] Published assessments visible by default in the admin catalogue.
- [ ] Fifteen portraits uploaded and verified on custom R2 domain.
- [ ] Fifteen members stored in Convex and visible on both sides.
- [ ] Hardcoded public roster fallback removed.
- [ ] Four accessible preset recipes available in Appearance.
- [ ] Theme versions and active pointer seeded in Convex.
- [ ] Development target guard tested.
- [ ] Seed rerun proves no duplication.
- [ ] Public full-practice flow completed from Start to Result.
- [ ] Admin/public integration checked with real cloud data.
- [ ] Full regression suite green.
- [ ] Security and Git candidate audits green.
- [ ] New admin credential provisioned and browser-verified.
- [ ] Final changes committed once.
