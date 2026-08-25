# Member Placeholder Roster Decision

Date: 25 August 2026
Status: superseded on 25 August 2026
Superseded by: `MEMBER-SHOWCASE-DECISION.md`

> Historical record only. The public route no longer renders `Voice NN`, placeholder labels, sample labels, or role-icon-only rows. The current implementation uses the documented 15-profile source-only showcase and generated portrait sheet.

## Request change

The user requested roughly a dozen Member placeholders with varied roles after the consent-gated Member page had already been implemented.

The evidence boundary has not changed: no verified English Club roster, identity-to-role assignment, biography, portrait consent, or profile consent exists in the repository. The new request authorizes a layout preview, not invented public membership records.

## Decision

Render 14 code-owned sample slots only when `members.listPublished` succeeds and returns zero records.

- Labels are `Voice 01` through `Voice 14`, not human names.
- Every row visibly says `Placeholder` and `Sample data`.
- The roster heading says the slots are waiting for real names.
- A notice says the slots are not people, member counts, or role assignments.
- Placeholder records are never inserted into Convex and never receive consent-cleared status.
- If Convex is unavailable, the unavailable state still renders. Sample data does not conceal a backend failure.
- When the first real consent-cleared profile is returned, the complete placeholder array disappears automatically.
- Abstract avatars use the existing role Heroicon and a sample number. No generated headshot or documentary face is used.

## Distribution

| Role code | Label | Sample slots | Covered assignment vocabulary |
| ---: | --- | ---: | --- |
| `0` | Member | 2 | No subtype |
| `1` | Pioneer | 2 | No subtype |
| `2` | Coordinator | 5 | Academic, Art, MIC, Public Relation, Human Resource Development |
| `3` | Core Member | 3 | Secretary, Vice President, President |
| `4` | Board / Board of Directors | 2 | Pembina / Mentor, Kepala UPA / Head of UPA |

Total: 14 synthetic layout slots across all five role codes.

## Rendering contract

The public data adapter remains unchanged:

```ts
type MemberDirectoryResult =
  | { state: "ready"; members: PublicMember[] }
  | { state: "unavailable"; members: [] };
```

The client island derives preview mode from `state === "ready" && members.length === 0`. The fixture lives in `src/content/member-placeholders.ts`, outside `convex/`. Real and sample rows share layout, filtering, keyboard, and responsive behavior, but only sample rows carry `placeholder: true` and `sampleCode`.

## Motion and accessibility

- Role selection remains a native radio group.
- Selecting a role filters both real and sample records without another request.
- Sample rows enter with a small transform stagger. Text opacity does not animate because the intermediate alpha state reduced effective contrast during Axe analysis.
- Reduced motion removes row travel and delay.
- The roster notice is a named complementary region.
- Every role avatar is a Heroicon; numbers are labels, not stand-in icons.

## Verification evidence

- Unit coverage asserts 14 unique slots, all five role codes, valid cross-field assignments, and explicit placeholder identity.
- E2E asserts all 14 rows, five Coordinator rows after selection, the sample notice, live-region copy, and the complete default roster in server HTML.
- Targeted Member suite: 12 passed after the contrast repair.
- Axe reports no WCAG A or AA violation on Members at desktop, Pixel 7, or 320 px.
- Updated light, dark, selected Coordinator, mobile, and 320 px screenshots live in `docs/evidence/`.

The complete release gate passed with 23 Vitest checks and 75 browser cases: 69 passed, 6 intentional viewport-specific skips, and 0 failed. Final screenshot paths and boundaries are recorded in `docs/QA-REPORT.md`.
