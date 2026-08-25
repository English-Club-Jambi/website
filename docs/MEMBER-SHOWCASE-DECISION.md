# Member Showcase Decision

Status: superseded on 26 August 2026 by the guarded Convex development seed
Date: 25 August 2026
Route: `/members`
Supersedes: `MEMBER-PLACEHOLDER-DECISION.md`

> Historical decision record. The local `src/content/member-showcase.ts` fallback was removed. The same fictional identities now live in `content/member-development-seed.ts` and are written only by the target-locked, idempotent development seed to `perfect-greyhound-270`. Production must contain no development seed batch and may publish only consent-cleared records.

## Request interpreted

The Member page must read as a finished organisation profile before the official roster is ready. The public interface must not expose QA language such as `placeholder`, `sample`, `preview`, `Voice NN`, database state, or implementation notes. The directory must be a real responsive grid, not a long list of rows.

The user also explicitly authorised temporary fictional identities and generated portraits for presentation. That changes the earlier no-name placeholder decision, but it does not change the privacy boundary for real people.

## Evidence boundary

- No verified English Club roster, identity-to-role assignment, or real portrait consent exists in the repository.
- The 15 identities are fictional and are authored in `content/member-development-seed.ts`.
- The guarded development command writes them to Convex with `seedBatch: member-directory-v1`; they are not production data.
- The portrait sheet is generated media. It does not depict or identify English Club members.
- The public route renders only `members:listPublished`; there is no local roster fallback.
- If the query is unavailable, the page shows an honest unavailable state instead of using showcase data to hide the failure.
- Real names still require cleared profile consent. Real portraits still require separate cleared photo consent.

## Final roster composition

| Role code | Public role | Showcase profiles | Assignment coverage |
| ---: | --- | ---: | --- |
| `0` | Member | 2 | General participation |
| `1` | Pioneer | 2 | Club management |
| `2` | Coordinator | 5 | Academic, Art, MIC, Public Relation, Human Resource Development |
| `3` | Core Member | 4 | Secretary, Treasury, Vice President, President |
| `4` | Board | 2 | Pembina / Mentor, Kepala UPA / Head of UPA |

Total: 15 fictional development profiles. This total describes the guarded seed, not the club's actual membership.

## Public presentation

- Heading: `Meet the people behind the club.`
- Cards contain a generated portrait, Heroicon role symbol, role classification, name, assignment, and short working-style biography.
- Copy reads like a public organisation profile and does not discuss fixture provenance.
- Role selection filters the same roster without a new request and announces the result through a visually hidden polite status.
- The generated portrait sheet is cropped into individual 4:5 card fields with deterministic CSS background positions.
- The sheet contains 16 cells; 15 unique cells are used. No portrait repeats.

## Grid contract

The roster is one semantic list with a CSS contact-sheet layout and 1 px shared rules:

| Viewport | Columns |
| --- | ---: |
| `1280px` and wider | 5 |
| `960px` to `1279px` | 4 |
| `680px` to `959px` | 3 |
| Below `680px` | 2 |

The cards do not use floating panels, rounded card shells, shadows, or a grid/list toggle. Motion is limited to a small entrance stagger, a 2 px body response, and a 1.025 image scale after explicit pointer interaction. Reduced motion removes spatial travel and stagger.

## Media contract

| Artifact | Location or object key | State |
| --- | --- | --- |
| Evidence master | `docs/evidence/generated-member-directory-portraits-v1.png` | Local evidence |
| WebP derivative | `public/images/member-directory-portraits-v1.webp` | Local QA and verified in R2 |
| AVIF derivative | `public/images/member-directory-portraits-v1.avif` | Local QA and verified in R2 |
| R2 WebP | `images/member-directory-portraits-v1.webp` | Uploaded and `HeadObject` verified |
| R2 AVIF | `images/member-directory-portraits-v1.avif` | Uploaded and `HeadObject` verified |

The browser uses the WebP sheet because CSS backgrounds do not receive Next Image format negotiation. The AVIF remains available for a future `image-set()` or per-profile derivative pipeline.

## Source authority

- `content/member-development-seed.ts`: fictional development profiles, role assignments, joined years, and portrait cells.
- `convex/developmentSeed.ts`: target lock, idempotent batch write, and verification.
- `src/components/members/member-relay.tsx`: semantic rendering, filtering, and public states.
- `src/components/members/member-relay.module.css`: contact-sheet grid, portrait cropping, responsive behavior, and motion.
- `convex/members.ts`: authoritative public query for every environment.
- `content/member-roles.ts`: role and subtype taxonomy.

## Verification contract

- Unit tests assert 15 unique slugs, names, and portrait cells.
- Unit tests assert all five role codes and every required Coordinator, Core, and Board assignment.
- On `perfect-greyhound-270`, server HTML contains the seeded roster returned by Convex. A successful empty production query renders the honest empty state.
- Browser tests assert 5 columns on desktop and 2 columns on phone and 320 px projects.
- Browser tests assert the public main content does not contain QA disclosure language.
- Role filtering must return five Coordinator profiles and preserve keyboard-native radio behavior.
- Axe, reduced motion, theme, overflow, mobile navigation, and screenshot gates remain part of the full Playwright suite.

## Replacement path

1. Collect the real member's approved display name, role assignment, optional biography, and profile consent.
2. If a portrait is used, record separate photo consent, rights, alt text, dimensions, focal point, and an immutable R2 object key.
3. Upsert through the reviewed internal Convex mutation.
4. Confirm `members:listPublished` returns only approved public fields.
5. Remove or archive the development seed batch before any production import; the production route has no fixture switch or fallback.
6. Decide whether a partial consent-cleared roster should publish immediately or wait for an explicit organisation release policy.
