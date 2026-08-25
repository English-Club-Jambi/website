# Practice Format Control Plan

Date: 26 August 2026
Status: implemented and verified on the Convex development deployment

## Decision

The five canonical Practice formats are fixed. Administrators cannot add another format from the browser. A format is a reviewed delivery blueprint for one full or quick practice path; Question Bank is the reusable inventory that supplies its questions.

The working sequence is:

    Question Bank
      -> fixed Practice Format
      -> skill-specific allowed pool
      -> structured random draw at Start
      -> question IDs and order pinned to the attempt

The words “draft” and “assessment definition” are implementation language. The admin interface uses “working revision” and “Practice Format”.

## Current evidence

- assessmentQuestionBank already records skill, task family, difficulty, source, global status, and full-practice eligibility.
- A random-bank section currently selects ready questions by profile, skill, and global eligibility.
- assessmentAttemptItems stores the selected bank question, delivered item, order, timestamp, and selection contract when Start succeeds. The draw does not rerun during that attempt.
- A learner flag currently means “mark this question for my own review”. It is saved on assessmentResponses and contributes to the section’s flagged count. It is not an error report and has no reason field.
- Assessment versions already have a mutable working revision, immutable publication, automated validation, four current-revision human approvals, and conflict checks.

## New control boundary

### Per-version pool rule

A Practice Format working revision may explicitly allow or disable a Question Bank entry.

- The rule belongs to assessmentVersions, not the mutable definition.
- A published version and every attempt already started from it remain unchanged.
- A rule change increments contentRevision, clears validation/checksum state, and makes prior approvals stale.
- “Allow” never bypasses a paused or archived global bank record, a missing source item/key, a mismatched profile/skill, or private/unreviewed media.
- An inherited rule follows the canonical default:
  - Full practice inherits fullPracticeEligible.
  - A quick skill format inherits questions authored for that canonical definition.
- A working revision may temporarily have too few allowed questions. Validation blocks publication until every skill pool meets its section quota.

### Flag signal

The admin does not receive participant identity, answers, attempt IDs, or free text. It receives an aggregate editorial signal per fixed Practice Format and bank question:

- current flag count;
- total flag activations;
- most recent flag time;
- editorial state: open, reviewed, or dismissed.

The interface labels this accurately: a flag is a revisit signal, not proof that a question is incorrect. A new flag reopens a previously reviewed signal. Reviewers may mark the signal reviewed or dismissed; editors may separately disable the question in the next working revision.

## Detail-page structure

1. **Format contract**
   - fixed format identity, target skill(s), item quota, timing, and current working revision;
   - no “create format”, “add section”, or destructive structure controls.
2. **Question pool**
   - filters for skill and pool state;
   - quota, allowed count, disabled count, and spare capacity;
   - paginated question rows with task family, difficulty, prompt, source, and effective state;
   - Allow/Disable changes only the current working revision.
3. **Flag signals**
   - visible in the same question rows and through a Flagged filter;
   - current/total counts and review state;
   - reviewer action without participant data.
4. **Validation and release**
   - pool shortage is a blocking validation result;
   - exact revision validation, four approvals, and publication remain unchanged.

## Responsive behavior

- Desktop uses a ruled split between pool summary and question rows.
- At Pixel 7 width the filters wrap to two columns; at 320px they stack.
- Question prompts wrap normally and never force horizontal scroll.
- Allow/Disable and review actions remain at least 44px.
- Status is communicated with text and icons, not colour alone.
- Pool state changes use opacity/translate only and become instant under reduced motion.

## Verification

- Convex tests:
  - anonymous and publisher cannot change pool rules;
  - editor can alter only the active working revision;
  - a rule invalidates validation and approvals by revision;
  - published selection obeys its immutable rules;
  - shortage blocks validation and Start;
  - a flag transition updates only the aggregate signal;
  - no participant identity or response appears in the admin DTO;
  - reviewer state reopens after a later flag.
- Unit tests:
  - fixed catalogue has no create action;
  - skill/state filters and pagination;
  - allow/disable labels and disabled states;
  - truthful flag explanation and review action.
- Browser tests:
  - desktop, Pixel 7, and 320px;
  - touch, keyboard, Axe, reduced motion, no overflow, no client errors;
  - Question Bank -> Format -> pinned attempt explanation remains visible.

### 26 August implementation evidence

- The catalogue and its compatibility route expose no Create Practice Format action. The server rejects `adminAssessments.create` unless an operator deliberately enables the undocumented internal maintenance mode.
- The selected development deployment remains `perfect-greyhound-270`. It exposes one full format and four skill sprints; the Question Bank verification reports 146 ready records and eight random-bank sections.
- Backend regression: 8 files, 63 tests passed.
- Unit regression: 45 files, 162 tests passed.
- Responsive Practice Builder harness: desktop, Pixel 7, and 320 px passed with no overflow, minimum 44 px controls, reduced motion, and zero Axe violations.
- Integrated browser regression: 152 cases passed on the first run; three stale roster-source assertions were corrected to the already-migrated Convex source and passed on all three viewports. Effective result: 155 passed, 73 intentional project/credential skips, zero unresolved failures.
- Full ESLint, TypeScript, diff checks, and an isolated Next 16 production build passed. Port 3987 remained live throughout.

## Rejected approaches

- A definition-level exclusion that silently changes a live published format.
- Treating a learner revisit flag as a complaint or incorrect-answer report.
- Returning participant answers or identity to make the flag list look more informative.
- Allowing a format rule to revive a globally paused or unreviewed bank entry.
- Loading an unbounded response history and grouping it in the browser.
- Letting administrators create arbitrary new Practice formats from the catalogue.
