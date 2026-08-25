# Member Extension Direction

Status: implemented; showcase addendum in `MEMBER-SHOWCASE-DECISION.md` is authoritative
Date: 25 August 2026
Route: `/members`
Concept: **The Member Relay**

## 1. Goal

Extend the public English Club profile with a Member page that explains the club's five role codes and can publish verified member profiles from Convex.

> Historical design direction. The final public route has no source-only roster fallback. The named development deployment uses a guarded 15-profile fictional Convex seed to exercise the same grid; production may expose only consent-cleared member records.

The page must feel active before a roster exists. It does this through a complete role atlas, a user-controlled responsibility selector, one atmospheric group scene, and, in development, a 15-profile seeded roster in a true member grid. The temporary identities and portraits are fictional presentation material, not real member evidence.

## 2. Evidence boundary

The user's brief confirms the role taxonomy. The repository does not contain a verified roster, identity-to-photo mapping, biography, term data, or public-profile consent.

Therefore:

- the role atlas is code-owned and may ship now;
- the roster reads only `published` and `cleared` Convex records;
- a successful empty query may show the user-requested fictional roster showcase recorded in `docs/MEMBER-SHOWCASE-DECISION.md`;
- the showcase never appears for an unavailable query and disappears when any real public profile exists;
- supplied documentary photos remain activity evidence and cannot become named portraits;
- the generated hero scene is decorative atmosphere, not evidence of real membership;
- `UPA` remains an acronym because no authoritative expansion was supplied;
- numeric values `0` through `4` are classification codes, not scores, ranks, or a progression path.

Detailed evidence is recorded in:

- `docs/MEMBER-EVIDENCE-AUDIT.md`;
- `docs/MEMBER-CODE-AUDIT.md`;
- `docs/MEMBER-CREATIVE-RESEARCH.md`.

## 3. Confirmed taxonomy

| Code | Label | Confirmed assignment vocabulary |
| ---: | --- | --- |
| `0` | Member | No subtype supplied |
| `1` | Pioneer | Member involved in club management |
| `2` | Coordinator | Academic; Art; Media, Information, and Communication (MIC); Public Relation; Human Resource Development |
| `3` | Core Member | Secretary; Treasury; Vice President; President |
| `4` | Board / Board of Directors | Pembina / Mentor; Kepala UPA / Head of UPA |

Public copy preserves `Art`, `Public Relation`, `Treasury`, and the unresolved Board naming supplied by the user. Internal keys use lower-case kebab-case values only for stable storage.

## 4. Design read

Reading this as: an editorial extension of a public club profile for students and collaborators, with a bright, candid, and assured voice; a language-led composition; and deterministic motion after explicit selection.

| Dial | Value | Consequence |
| --- | ---: | --- |
| Design variance | 8 / 10 | Asymmetric hero, responsibility field, and ruled contact-sheet grid instead of floating cards |
| Motion intensity | 6 / 10 | Short state handoffs and roster reveals, no autoplay or scroll-driven selection |
| Visual density | 4 / 10 | Five roles remain visible; details and roster stay bounded |

The existing Bricolage, cobalt, signal orange, 8 px control radius, 14 px media radius, light/dark tokens, and Heroicons family remain authoritative.

## 5. Page sequence

### Atmospheric opening

- Headline: `Every voice changes the room.`
- Support: `Meet the people who practise, organise, coordinate, and guide English Club.`
- Generated adult group scene sits behind the right side and fades into the page canvas.
- The scene is decorative and replaceable. It does not identify a member.

### Responsibility channels

- One native radio group contains `All roles` plus the five role codes.
- Five equal-height role bands show code, Heroicon, label, and one plain scope sentence.
- Selecting a band changes one companion field with its supplied divisions or positions.
- All role panels remain in server HTML. Without JavaScript, every panel becomes visible.

### Member roster

- The same selection filters the public roster.
- Profiles use a shared-rule responsive contact sheet, not detached floating cards.
- A profile may show display name, role, verified division or position, optional approved bio, and optional approved portrait.
- A missing portrait uses a text monogram derived from the verified display name.
- A successful empty result shows 15 source-only fictional profiles with unique generated portrait cells.
- Public copy reads as an organisation profile; provenance and replacement rules remain in project documentation and source.
- Showcase, real published roster, and backend-unavailable states remain behaviorally distinct.

### Participation handoff

- One Join intent links to `/contact?intent=join`.
- The page does not create another contact intent with different wording.

## 6. Motion contract

| Moment | Purpose | Duration |
| --- | --- | ---: |
| Role control response | Confirm selection | 160 ms |
| Companion replacement | Show changed responsibility context | 300 ms |
| Roster replacement | Make the new result set legible | 300 ms maximum |
| Hero entrance | Establish hierarchy once | 520 ms maximum |

Only transform and opacity travel. Content replacement moves no more than 12 px. Nothing auto-cycles, follows the pointer, binds to scroll position, or hides meaning before hydration.

Under `prefers-reduced-motion: reduce`, travel and stagger disappear. Selection, filtering, focus, and announcements remain intact.

## 7. Convex contract

### Stored record

```ts
type MemberRecord = {
  slug: string;
  displayName: string;
  roleLevel: 0 | 1 | 2 | 3 | 4;
  division?:
    | "academic"
    | "art"
    | "mic"
    | "public-relation"
    | "human-resource-development";
  position?:
    | "secretary"
    | "treasury"
    | "vice-president"
    | "president"
    | "mentor"
    | "head-of-upa";
  shortBio?: string;
  photo?: {
    objectKey: string;
    width: number;
    height: number;
    alt: string;
    focalPoint: string;
  };
  profileStatus: "draft" | "published" | "archived";
  profileConsentStatus: "pending" | "cleared" | "revoked";
  profileConsentUpdatedAt?: number;
  photoConsentStatus: "pending" | "cleared" | "revoked";
  photoConsentUpdatedAt?: number;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};
```

### Cross-field rules

- Codes `0` and `1` have no division or position.
- Code `2` requires exactly one Coordinator division and no position.
- Code `3` requires exactly one Core Member position and no division.
- Code `4` requires exactly one Board position and no division.
- `published` plus `cleared` profile consent is required for any public response.
- Portrait data crosses the public boundary only when photo consent is also `cleared`.
- Public output omits all consent status, audit timestamps, internal status, system fields, and administrative data.

### Query behavior

- `members.listPublished` accepts optional `roleLevel` and a bounded limit.
- It reads an index constrained by publication and profile consent.
- It never uses an unbounded `collect()` or a JavaScript privacy filter.
- Invalid role and subtype combinations are rejected again at the projection boundary.
- A Next.js server adapter distinguishes `ready` from `unavailable`. Only `ready` plus an empty array activates the code-owned showcase; `unavailable` never does.

## 8. R2 contract

- The generated hero atmosphere lives at `images/member-relay-placeholder.webp` and `.avif`.
- The generated portrait sheet lives at `images/member-directory-portraits-v1.webp` and `.avif`.
- Real member portraits use a versioned `members/` object prefix beneath the configured R2 media base.
- Convex stores object keys and reviewed rendering metadata, never bytes or credentials.
- Only stripped derivatives may be uploaded. Raw JPEG or MOV masters stay private.
- Profile consent and photo consent remain separate. Revoking photo consent removes the portrait from the public view without requiring the name and role to disappear.

## 9. Accessibility contract

- Native radios expose the exclusive role choice and browser-standard keyboard behavior.
- Every styled label provides at least a 44 px target.
- The roster update uses one concise `role="status"` announcement and does not move focus.
- No content requires hover, drag, pointer tracking, or animation.
- All five roles and supplied subtypes remain available without JavaScript.
- Light and dark states preserve contrast and hierarchy.
- The page supports 320 px width and 200 percent zoom without horizontal overflow.

## 10. Anti-slop guardrails

- No pyramid, org-chart connector web, orbiting faces, or prestige hierarchy.
- No three-equal-card member wall.
- No generic `Meet the amazing minds` copy.
- Fictional names, portraits, and short biographies remain limited to the documented source-only showcase. No member count, quote, achievement, term, or contact detail is invented.
- No glass panels, neon glow, gradient text, decorative status dots, custom cursor, marquee, or scroll cue.
- No search, grid/list switch, campus, year, or extra division filters until a maintained roster makes them useful.

## 11. Verification checklist

- [x] All five role codes and supplied subtype labels are present in server HTML.
- [x] Convex returns only published, profile-consented, structurally valid records.
- [x] Portraits require a second cleared consent gate.
- [x] Showcase and service-unavailable states are distinct.
- [x] Fifteen fictional profiles cover all five role codes and every supplied subtype without entering Convex.
- [x] The public roster is a real 5/4/3/2-column CSS grid with no QA language.
- [x] Native radio selection works with pointer, touch, Tab, Space, and arrow keys.
- [x] Motion is deterministic and reduced-motion safe.
- [x] Members appears in desktop/mobile navigation, footer, sitemap, and metadata.
- [x] Header fits at 880, 900, 1024, and 1440 px.
- [x] No horizontal overflow occurs at 320 px.
- [x] Axe reports no WCAG A or AA violations.
- [x] Desktop light, desktop dark, mobile light, mobile roster, 320 px, and selected-role states are captured and inspected.
- [x] Lint, TypeScript, Vitest, Convex push, production build, and Playwright pass.

## 12. Source basis

Creative pattern evidence comes from the official people pages of [AREA 17](https://area17.com/culture), [IDEO](https://www.ideo.com/leaders), [Snøhetta](https://www.snohetta.com/people), [Pentagram](https://www.pentagram.com/about), [Instrument](https://www.instrument.com/about/), and [Locomotive](https://locomotive.ca/en/agency). Interaction and motion behavior follows the [W3C radio group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) and [WCAG animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

The privacy baseline also considers [Indonesia Law No. 27 of 2022 on Personal Data Protection](https://peraturan.bpk.go.id/Home/Download/224884/UU%20Nomor%2027%20Tahun%202022.pdf). This product contract is not legal advice; institutional or legal review is still required before a real roster is published.
