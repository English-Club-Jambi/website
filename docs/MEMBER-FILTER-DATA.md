# Member joined-year filter data contract

Status: historical recommendation; implemented through the guarded Convex development seed
Date: 25 August 2026
Reference year for the current fixture: 2026

## 1. Decision

The implemented contract stores `joinedYear` as an optional integer on member records. All 15 fictional development-seed profiles provide a year so the real Convex filter path can be exercised; production records remain evidence-based and optional.

For a real member, `joinedYear` means the first verified calendar year when that person became part of this English Club in a member, committee, coordinator, core, or board capacity. It does not mean admission year, graduation year, cohort, role start, consent date, profile publication date, or the year a photograph was taken.

The public filter label should be `Joined year`. The card label should be `Joined 2024`. Do not use `Batch`, `Class of`, `Generation`, `Tenure`, or `Years of service` because the current brief does not establish those meanings.

## 2. Current evidence

The joined year is a new product field. No current repository source supplies real values.

| Evidence | Current state |
| --- | --- |
| `convex/schema.ts:74-90` | The `members` table has role, assignment, bio, photo, consent, order, and audit timestamps. It has no joined year. |
| `convex/validators.ts:93-103` | The public member view model has no joined year. |
| `convex/members.ts:56-109` | The public mapper validates profile content and consent but cannot return a joined year. |
| `convex/members.ts:152-244` | `upsertReviewed` replaces a full record. An optional joined year needs explicit preserve and clear semantics. |
| `src/lib/members.ts:19-29` | `PublicMember` has no joined year. |
| `src/components/members/member-relay.tsx:43-190` | The roster has one role selection and filters the bounded result in the browser. |
| `content/member-development-seed.ts` | The guarded development seed contains 15 fictional profiles with explicit joined years. |
| `tests/unit/members.test.ts:63-109` | Tests already enforce 15 unique profiles, five role codes, and valid assignments. |

The older `docs/MEMBER-FICTIONAL-DATASET.md` described 14 profiles and omitted Galih Pradipta. The implemented development seed and test contract use 15.

## 3. Field semantics

### Real Convex profile

```ts
joinedYear?: number;
```

- One four-digit Gregorian calendar year.
- Optional permanently, not only during migration.
- Set only from a reviewed club source or the member's approved profile submission.
- Stable when a person changes role. A role change does not reset the joined year.
- For a returning member, use the earliest verified year of English Club association. If the club later needs return periods, add a separate history model.
- For a Board profile, record the first verified year of association with this English Club in that public capacity. Do not use the person's UPA employment year.

### Guarded development seed

All 15 development profiles have a valid `joinedYear`, so the real Convex query and filter path is exercised. The target-locked seeder writes them only to `perfect-greyhound-270` with a synthetic batch marker. These values are development data and must not be promoted, copied, or interpreted as production membership history.

## 4. Recommended fictional distribution

The fixture uses the five-year window 2022 through 2026. Every year contains at least two profiles. Roles overlap across years, so the filter does not imply a fixed promotion path.

| Fictional profile | Role | Assignment | Joined year |
| --- | --- | --- | ---: |
| Nabila Maheswari | Member | No subtype | 2026 |
| Reza Dananjaya | Member | No subtype | 2024 |
| Salsabila Nur Fajri | Pioneer | Club management | 2023 |
| Galih Pradipta | Pioneer | Club management | 2024 |
| Dimas Arga Pratama | Coordinator | Academic | 2025 |
| Keisya Maharani | Coordinator | Art | 2025 |
| Farhan Rizky Prabowo | Coordinator | Media, Information, and Communication (MIC) | 2024 |
| Alya Rahmadani | Coordinator | Public Relation | 2025 |
| Bagas Aditya Wicaksono | Coordinator | Human Resource Development | 2026 |
| Raka Satrio Nugraha | Core Member | Secretary | 2025 |
| Citra Larasati | Core Member | Treasury | 2023 |
| Nadine Zahra Latifah | Core Member | Vice President | 2024 |
| Muhammad Fikri Aulia | Core Member | President | 2022 |
| Mira Ayuningtyas | Board / Board of Directors | Pembina / Mentor | 2022 |
| Yusuf Kurniawan | Board / Board of Directors | Kepala UPA | 2023 |

### Expected year counts

| Year | Profiles |
| ---: | ---: |
| 2026 | 2 |
| 2025 | 4 |
| 2024 | 4 |
| 2023 | 3 |
| 2022 | 2 |

Useful combined-filter fixtures:

- Coordinator plus 2025 returns Dimas, Keisya, and Alya.
- Core Member returns one profile in each year from 2022 through 2025.
- Member plus 2024 returns Reza.
- Board plus 2026 returns an intentional empty state.

The fixture's oldest year, 2022, does not establish a founding year or prove that English Club existed then. It is a demo value chosen to exercise five filter options.

## 5. Validation bounds

Use `v.optional(v.number())` in the table and public return validator. Convex `v.number()` also accepts non-integers, so the reviewed mutation and public mapper need a semantic integer check.

```ts
export const MIN_MEMBER_JOINED_YEAR = 1900;

export function isValidMemberJoinedYear(
  value: unknown,
  currentYear: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_MEMBER_JOINED_YEAR &&
    value <= currentYear
  );
}
```

Runtime rules:

- Minimum real-data bound: `1900`.
- Maximum: the current UTC calendar year.
- On 25 August 2026, valid values end at `2026`; `2027` is invalid.
- Reject `NaN`, infinities, decimals, numeric strings, zero, negative values, and future years.
- Derive the server reference with `new Date(Date.now()).getUTCFullYear()`.
- Pass `2026` explicitly in deterministic fixture and unit tests. Tests should not change behavior on 1 January.

The lower bound is a technical sanity check, not a claim about the club's age. Do not raise it to 2022. The demo window and real-data validator have different jobs.

## 6. Backward-compatible Convex contract

### Schema and public view model

Add the optional field to the table and response shape.

```ts
// members table
joinedYear: v.optional(v.number()),

// publicMemberValidator
joinedYear: v.optional(v.number()),

// PublicMember
joinedYear?: number;
```

Existing rows remain valid. A missing year is legitimate data, not a schema error. Do not make the field required after backfill because the organisation may not be able to verify every historical year.

### Reviewed upsert

The current mutation uses `ctx.db.replace`. A plain optional argument would erase a stored year whenever an older caller omitted the field. Use a three-state input.

```ts
joinedYear: v.optional(v.union(v.number(), v.null())),
```

Interpret it this way:

| Input | Existing record | New record |
| --- | --- | --- |
| field omitted | Preserve the stored value | Store no year |
| `null` | Remove the stored value | Store no year |
| valid integer | Replace with the reviewed year | Store the reviewed year |

Resolve the value before building the replacement object.

```ts
const nextJoinedYear =
  args.joinedYear === undefined
    ? existing?.joinedYear
    : args.joinedYear === null
      ? undefined
      : args.joinedYear;
```

Validate a numeric value against the mutation's current UTC year. Never coerce a string. Reject the whole reviewed write when a supplied value is invalid.

### Public mapping

- Missing year: return no `joinedYear` property.
- Valid year: return the number.
- Invalid legacy value: omit the year and record a non-personal development warning or migration finding. Do not expose it.
- Do not reject an otherwise consented profile only because its optional year is absent.
- Do not infer or repair a bad value from another timestamp.

## 7. Query and index decision

The current page requests at most 120 public profiles once and performs its role filter on that bounded array. Joined-year filtering should use the same array for now.

Reasons:

- the UI needs the complete published result to derive stable year options;
- role and year selections can combine without another request;
- 120 is the existing hard cap;
- one browser filter does not justify two more compound indexes.

Do not add a server query argument or index for this release. Derive filter options from `directory.members` or the source showcase, then apply role and joined-year predicates together.

If the roster later uses server pagination, add indexed query paths. Do not filter after taking the first page. The relevant future indexes would be:

```ts
.index("by_public_joined_year_sort", [
  "profileStatus",
  "profileConsentStatus",
  "joinedYear",
  "sortOrder",
])
.index("by_public_role_joined_year_sort", [
  "profileStatus",
  "profileConsentStatus",
  "roleLevel",
  "joinedYear",
  "sortOrder",
])
```

Those indexes are deferred, not part of the current contract.

## 8. Client filter contract

Use a separate year selection alongside the existing role radio group.

```ts
type JoinedYearSelection = "all" | "unknown" | number;
```

Rules:

- Default to `all`.
- Build distinct valid years from the full roster and sort them descending.
- Keep the year options stable when the role changes. Do not rebuild the options from the already role-filtered subset.
- Show `Year not listed` only when at least one real public profile has no joined year.
- `All years` includes profiles with and without a year.
- A numeric year includes only an exact match.
- `Year not listed` includes only profiles without a valid public year.
- Combine role and year with logical AND.
- Never auto-select another year when the result becomes empty.
- Keep the control usable with keyboard, touch, and reduced motion. Content must not depend on a transition.

A native select is the smallest clear control for five years:

```text
Joined year
All years
2026
2025
2024
2023
2022
Year not listed    only when needed
```

## 9. Public copy

Recommended visible labels:

| Context | Copy |
| --- | --- |
| Control label | `Joined year` |
| Default option | `All years` |
| Missing-year option | `Year not listed` |
| Card metadata | `Joined 2024` |
| Directory context | `All roles · Joined 2024` |
| Empty result | `No published profiles match this role and joined year.` |
| Empty help | `Choose another role or year to continue.` |

Recommended screen-reader status:

```text
Showing 3 members. Role: Coordinator. Joined year: 2025.
```

For one result, use `1 member`. When the Convex roster is unavailable, keep the current service message and disable or omit roster filters. Do not turn an unavailable service into a zero-result message.

Avoid these phrases:

- `Class of 2024`
- `2024 generation`
- `Batch 2024`
- `Four years of service`
- `Senior member`
- `Joined since 2024`

`Joined since` is awkward for a single year and may imply uninterrupted membership. `Joined 2024` states only the reviewed field.

## 10. Consent and evidence boundary

Joined year is public profile data. Add or change it only when the profile approval covers that field. It does not need a separate consent status, but an editor must not assume that an older approval for name and role also covers membership history.

Never derive `joinedYear` from:

- `createdAt` or `updatedAt`;
- `profileConsentUpdatedAt` or `photoConsentUpdatedAt`;
- first profile publication;
- post or event dates;
- image EXIF, filename numbers, or visible banners;
- academic admission year or graduation year;
- role level, role start, or `sortOrder`;
- the fictional distribution in this document.

The development batch must keep its synthetic provenance and production-target guard. Do not copy its years into production Convex records or include them in organisation history, structured data, analytics claims, member totals, or About-page copy.

## 11. Verification matrix

| Test | Expected result |
| --- | --- |
| Seed completeness | All 15 development profiles have an integer joined year |
| Seed years | Distinct set is exactly `2022, 2023, 2024, 2025, 2026` |
| Seed counts | `2, 3, 4, 4, 2` for 2022 through 2026 |
| Current-year bound | `2026` passes and `2027` fails with reference year 2026 |
| Lower bound | `1900` passes and `1899` fails |
| Type checks | `2024.5`, `"2024"`, `NaN`, and infinities fail |
| Optional real row | Missing year remains public under `All years` |
| Unknown filter | Missing-year row appears only under `Year not listed` and `All years` |
| Combined filter | Coordinator plus 2025 returns exactly three seeded development profiles |
| Intentional empty | Board plus 2026 renders the filter empty state |
| Upsert omitted | Existing joined year is preserved |
| Upsert null | Existing joined year is removed |
| Invalid legacy value | Public mapper omits the year without leaking the invalid value |
| Privacy | Consent and audit fields remain absent from `PublicMember` |
| Service failure | Directory unavailable state remains distinct from zero matches |

## 12. Implementation order

1. Add the shared year validator with an explicit reference-year argument.
2. Add optional `joinedYear` to the Convex table, public validator, public mapper, and `PublicMember`.
3. Add the tri-state reviewed-upsert semantics.
4. Add the recommended years to all 15 guarded development-seed profiles.
5. Derive stable year options from the full roster and combine them with the role filter.
6. Add unit, Convex, and browser tests from the verification matrix.
7. Update `DATABASE.md`, `PRD.md`, `BLUEPRINT.md`, `DESIGN.md`, `DESIGN-SYSTEM.md`, `SETUP.md`, and the two fictional-data ledgers.
8. Record screenshots for all years, one combined result, the intentional empty result, mobile layout, dark theme, and reduced motion.

The safe default for real records remains no year. A missing value says the club has not verified it. It does not say the person is new.
