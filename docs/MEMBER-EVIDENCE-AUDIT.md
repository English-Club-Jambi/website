# Member Page Evidence Audit

Status: implementation input
Date: 25 August 2026
Scope: current user brief, repository documentation, application and Convex source, supplied media, generated placeholders, and design references

## 1. Decision summary

The repository contains **no verified English Club roster**. It has no member names, role-to-person assignments, biographies, profile portraits, tenure data, or public-profile consent records. The only current authority for the organisation structure is the user's new role taxonomy.

The safe extension is therefore two-part:

1. publish a role atlas from the user-supplied taxonomy; and
2. make the people directory read only verified, explicitly published Convex records, with an honest unpublished state until those records exist.

Do not seed fictional names, treat people in supplied photographs as named members, import people from the GenBI reference, or use generated faces as member portraits. A visually complete role page is possible without any of those substitutions.

## 2. Audit method and coverage

The audit searched text and source for names, roster terms, the supplied role labels, divisions, positions, UPA, profile fields, member routes, member queries, and consent rules. Existing pixel and metadata audits were cross-checked against the current media manifest. The GenBI team reference was inspected as a third-party design example, not as English Club data.

| Surface | Coverage | Result relevant to Members |
| --- | ---: | --- |
| Markdown documents | 24 files | Several explicit evidence and consent boundaries; no roster |
| Design reference PNGs | 19 files | One unrelated GenBI member-directory example; no English Club roster |
| Supplied masters in `assets/` | 13 JPEG + 1 MOV | Recognisable participants, but no verified identity-to-role mapping |
| Served image derivatives | 22 AVIF/WebP files | Ten real-photo pairs remain consent-pending; one generated pair is not member evidence |
| TypeScript/TSX in `src/`, `convex/`, `content/`, and `tests/` | 49 files | No Member route, table, validator, query, seed, or test |

Evidence priority for this extension:

1. the user's explicit role taxonomy;
2. verified organisation-supplied roster and consent records, once received;
3. repository records and media audits;
4. third-party screenshots only as interaction references, never content sources.

## 3. What the repository proves

### 3.1 No English Club roster exists yet

| Evidence | Finding |
| --- | --- |
| `PRD.md:31-33` | A public team directory was deliberately excluded until names, roles, portraits, and consent were supplied. |
| `PRD.md:300-304` | Member names, quotes, roles, and counts are explicitly held content. |
| `docs/EVIDENCE.md:101-106` | The evidence ledger lists the committee roster and permission to publish identifiable member photography as unsupported facts. |
| `docs/EVIDENCE.md:121` | The earlier decision rejected a public directory because no consented names, roles, or portraits existed. |
| `DATABASE.md:12-20` | The implemented database scope contains posts, events, and contact submissions and explicitly excludes member profiles. |
| `DATABASE.md:396-403` | Post authors remain organisation labels because no verified team directory exists. |
| `convex/schema.ts:11-67` | The current schema defines only `posts`, `events`, and `contactSubmissions`. |
| `content/seed-posts.ts:38,65,92` | Every seeded public byline is `English Club`, not a person. |
| `src/content/site-copy.ts:97-99` | Existing public copy says names enter the record only after verification. |
| `src/app/sitemap.ts:6` and `src/components/mobile-nav.tsx:9-13` | No member route is currently listed in the sitemap or primary navigation. |

The new user request supersedes the earlier **route non-goal**, but it does not supply the missing person-level records. It authorises the Member feature and its role structure; it does not authorise invented roster content.

### 3.2 The photographs do not identify a roster

`docs/ASSET-AUDIT.md:7-10` states that the visual review does not infer names, roles, nationality, or membership from appearance. The file-level review reinforces the boundary:

- `docs/ASSET-AUDIT.md:37-43` says the group in `IMG_2028.JPG` must not be labelled as committee members or organisers until roles are confirmed.
- `docs/ASSET-AUDIT.md:142-149` records recognisable faces, possibly readable IDs, names or speaker images on screens, QR codes, and third-party marks.
- `docs/ASSET-AUDIT.md:151-160` permits a few event-level observations but explicitly rejects names, roles, membership, and affiliations inferred from pixels or EXIF.
- `docs/MEDIA-DERIVATIVES.md:17-28` marks all ten real-photo derivative pairs as `Pending` for participant consent.
- `src/content/media.ts:43-191` likewise marks every supplied documentary image `rights: "supplied-unverified"` and `consent: "pending"`.

The `Artist` metadata value recorded on three event photographs is a camera/file attribution, not proof of a participant's name, English Club membership, or role. It must not become roster data.

A group-photo publication decision also does not prove which person matches which profile. Using a crop as a member portrait requires both a verified identity mapping and profile-specific publication approval.

### 3.3 Generated people are not members

`docs/GENERATED-ASSET-LEDGER.md:7-10` explicitly says the generated people do not represent members. The generated hero asset may remain decorative atmosphere, but it must never appear as a roster portrait, person record, testimonial source, or evidence of membership.

### 3.4 The team screenshot is an unrelated reference

`docs/references/genbijambi/Pasted image (3).png` shows named GenBI Jambi member cards, portraits, role labels, search, filters, and a grid/list switch. Those people and roles belong to the referenced organisation, not English Club.

The existing interpretation is correct:

- `docs/REFERENCE-AUDIT.md:144-149` keeps the directory pattern only for a sufficiently large consented collection and rejects unsourced committee cards or filters.
- `docs/REDESIGN-REFERENCE-AUDIT.md:168-185` says filters are useful only for a real maintained collection and rejects fabricated people, roles, filter dimensions, and portrait cards.

No names, portraits, counts, years, campuses, roles, or divisions from that screenshot may be copied into the English Club Member page.

## 4. User-supplied role taxonomy

This table records the new brief without adding organisational claims. Numeric values are **data codes**, not scores, progress levels, or proof that one person has more value than another.

| Code | Public label supplied | Supported detail from the brief |
| ---: | --- | --- |
| `0` | Member | Club member; no sub-position supplied |
| `1` | Pioneer | A member involved in club management (`member pengurus club`) |
| `2` | Coordinator | Division coordinator |
| `3` | Core Member | Core management position |
| `4` | Board / Board of Directors | English Club mentors/advisers and the Head of UPA |

Supported Coordinator divisions:

- Academic
- Art
- Media, Information, and Communication (MIC)
- Public Relation
- Human Resource Development

Supported Core Member positions:

- Secretary
- Treasury
- Vice President
- President

Supported Board description:

- Pembina / Mentor
- Kepala UPA / Head of UPA

This taxonomy is sufficient for a role atlas and conditional record validation. It is not a roster and supplies no person counts.

## 5. Ambiguity register

These points must stay out of definitive public copy or be represented conservatively in the schema until organisation data resolves them.

| Ambiguity | Safe treatment now |
| --- | --- |
| Whether codes `0–4` are hierarchy, authority, access, or display order | Store/display them as stable classification codes. Do not call them ranks, levels, seniority, or a progression path. |
| Whether **Pioneer** means founder, founding cohort, general committee, or a named internal programme | Use only the supplied description, `member pengurus club`. Do not claim that Pioneers founded the club. |
| Whether a Pioneer belongs to a division | Do not invent a division or enforce one until a roster record supplies it. |
| Whether one person can hold several roles or appointments | Treat one primary public role as the bounded first model, but do not describe roles as mutually exclusive. Migrate to appointments if real data contains overlap. |
| Official spelling and plurality of **Art**, **Public Relation**, **Secretary**, and **Treasury** | Preserve the user's labels in content. Stable internal keys may be normalised, but public wording should not silently become `Arts`, `Public Relations`, or `Treasurer`. |
| The Coordinator list's missing initial letter in “nformation” | The supplied `(MIC)` and phrase support the editorial repair **Media, Information, and Communication**. Do not expand or redefine MIC beyond that wording. |
| Whether **Board** and **Board of Directors** are interchangeable official names | Keep `Board / Board of Directors` as provisional display copy until the club selects one public name. |
| Whether Pembina and Mentor are equivalent titles or two positions | Preserve `Pembina / Mentor` as one unresolved bilingual label; do not split it into two appointments without data. |
| Whether Kepala UPA is a Board position, an ex-officio seat, or a separate office | The brief places it in the Board description. Represent it there without inferring governance powers. |
| What **UPA** expands to | Keep the acronym `UPA`. The repository and brief do not define its expansion. |
| Role dates, cohorts, terms, current/alumni status, campus, programme, and reporting lines | Omit until supplied and verified. |
| Public biographies, pronouns, contact links, social profiles, and preferred names | Omit until each member supplies or approves them. |

## 6. Safe publication contract

### 6.1 Required evidence before one profile becomes public

- verified public display name;
- verified `roleCode` and, when applicable, the exact division or position;
- an explicit published/draft decision by an authorised club editor;
- documented consent to publish the name and role on the public website;
- approved biography text, if a biography is shown;
- for a portrait: verified identity-to-image mapping, image rights, portrait publication consent, a stripped AVIF/WebP derivative, and a cleared media-manifest entry;
- a withdrawal path that can archive the profile and remove its portrait from public delivery.

Contact-form consent is not profile consent. `contactSubmissions.consentAt` authorises storage of a message for a reply; it does not authorise a public member page.

### 6.2 Data that should remain private or absent

- personal email address or phone number;
- student ID, lanyard details, QR codes, precise location, or raw EXIF;
- internal consent notes and timestamps in the public view model;
- unapproved social handles;
- inferred gender, nationality, academic programme, age, or seniority;
- unpublished/draft/withdrawn profiles;
- portrait object keys that have not passed the R2 consent gate.

### 6.3 Media rule

Cloudflare R2 remains the byte store; Convex should keep only an optional stable `photoKey`. The key must resolve through the typed media contract. A pending or unknown key produces a text/graphic fallback, not a leaked source image. Do not upload raw JPEG/MOV masters or expose R2 credentials.

## 7. Recommended bounded content model

This is a recommendation for implementation, not evidence that records already exist.

```ts
type MemberRoleCode = 0 | 1 | 2 | 3 | 4;

type MemberRecord = {
  slug: string;
  displayName: string;
  roleCode: MemberRoleCode;
  divisionKey?:
    | "academic"
    | "art"
    | "mic"
    | "public-relation"
    | "human-resource-development";
  positionKey?:
    | "secretary"
    | "treasury"
    | "vice-president"
    | "president"
    | "mentor"
    | "head-of-upa";
  bio?: string;
  photoKey?: string;
  status: "draft" | "published" | "archived";
  profileConsentAt?: number;
  photoConsentAt?: number;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};
```

Implementation rules:

- Role labels and descriptions belong in one code-owned taxonomy, not repeated in every member record.
- A public query returns a bounded view model, uses a `status + roleCode + sortOrder` index, and never returns consent timestamps or raw Convex documents.
- Role `2` requires a verified Coordinator division before publication.
- Role `3` requires one verified Core Member position before publication.
- Role `4` requires a verified Board label before publication; `mentor` and `head-of-upa` are provisional safe keys derived directly from the brief.
- Roles `0` and `1` do not receive invented divisions or positions.
- No member seed runs until organisation-supplied records exist. Synthetic names may appear only inside isolated automated tests.
- If a real person has multiple simultaneous appointments, replace the single assignment fields with a separate appointment model rather than discarding information or choosing one silently.

## 8. Safe Member page content now

The route can be visually and functionally complete before the roster is available:

1. Introduce the five role codes as a navigable role atlas.
2. Let explicit pointer, touch, or keyboard selection reveal the supplied description and valid division/position labels.
3. Explain the numeric codes as organisation categories, not status points.
4. Render only published Convex profiles in the people area.
5. When none exist, say that verified profiles are being prepared. Do **not** say “0 members,” because the absence of public records is not an organisation count.
6. Keep the Join action available without implying that every applicant receives a specific role.
7. Use Heroicons or abstract role marks for structural symbols. Do not use ASCII symbols or fake face avatars.
8. Do not add search, year/campus filters, member totals, or grid/list controls until the published collection makes them useful.
9. Keep content readable and controls usable when motion is disabled. Motion can acknowledge a selection; it cannot hide role text or auto-cycle people.

Suggested truthful empty-state copy:

> Member profiles will appear after names, roles, and publishing consent are verified. The role map is available now so visitors can understand how the club works.

## 9. Release checklist

- [ ] An authorised club source supplies the current roster.
- [ ] Every name is mapped to one verified primary role code.
- [ ] Coordinator divisions and Core/Board positions are verified per person.
- [ ] The official public labels for Pioneer, Board, Treasury, Public Relation, and UPA are confirmed or kept exactly provisional.
- [ ] Profile consent is recorded separately from contact-form consent.
- [ ] Portrait identity, rights, consent, metadata stripping, crop, and alt text are reviewed per person.
- [ ] Only `published` profiles reach the public query.
- [ ] No private or consent fields reach the browser.
- [ ] Empty, partial, complete, withdrawn, no-photo, and backend-unavailable states are tested.
- [ ] Keyboard, touch, 320 px width, 200% zoom, dark/light themes, and `prefers-reduced-motion` are tested.
- [ ] Documentation no longer describes `/members` as deferred, while its evidence and consent gates remain explicit.

## 10. Final evidence boundary

The new brief proves the **shape of the organisation**, not the identities inside it. Ship the role structure now, ship people only from verified Convex records, and leave the directory honestly unpublished until the club supplies those records and permissions.
