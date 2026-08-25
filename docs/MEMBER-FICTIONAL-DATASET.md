# Fictional member dataset

Status: superseded recommendation; final dataset is `src/content/member-showcase.ts`
Date: 25 August 2026
Record count: 14 fictional identities

> This file records the first 14-profile writing pass. The implemented roster contains 15 profiles so Pioneer has two entries and the desktop grid resolves to 5 by 3. See `MEMBER-SHOWCASE-DECISION.md` for the final contract.

## Purpose and boundary

This dataset gives the Member page enough believable content for layout, interaction, accessibility, and screenshot review before the club supplies a verified roster. Every identity, assignment, and biography below is fictional. The names are synthetic combinations and are not based on people in `assets/`, the GenBI reference, contact submissions, or any known English Club member.

The data belongs in a source-only demo module. Do not seed it into Convex, publish it as the official roster, pair it with supplied participant photos, or migrate it into production records. A name may coincide with a real person by chance. That coincidence grants no permission and establishes no connection to English Club.

## Coverage

The set uses the exact role codes and assignment labels from the current brief.

| Role code | Coverage | Profiles |
| ---: | --- | ---: |
| `0` | Member | 2 |
| `1` | Pioneer | 1 |
| `2` | Academic, Art, Media, Information, and Communication (MIC), Public Relation, Human Resource Development | 5 |
| `3` | Secretary, Treasury, Vice President, President | 4 |
| `4` | Pembina / Mentor, Kepala UPA | 2 |

The role codes are categories, not scores or seniority points. Pioneer copy does not claim that the fictional person founded the club.

## Copy-ready roster

| ID | Name | Role | Assignment | Public biography |
| --- | --- | --- | --- | --- |
| `demo-nabila-maheswari` | Nabila Maheswari | Member | None | Nabila likes low-pressure prompts and often asks a second question when a conversation stalls. |
| `demo-reza-dananjaya` | Reza Dananjaya | Member | None | Reza brings practical examples to table conversations and helps rephrase an instruction when one word gets in the way. |
| `demo-salsabila-nur-fajri` | Salsabila Nur Fajri | Pioneer | Club management member | Salsabila helps newcomers find a place in the room and keeps small organising tasks from piling up. |
| `demo-dimas-arga-pratama` | Dimas Arga Pratama | Coordinator | Academic | Dimas turns broad topics into short prompts and discussion notes the room can use. |
| `demo-keisya-maharani` | Keisya Maharani | Coordinator | Art | Keisya uses drawing and visual prompts to give a conversation another way in. |
| `demo-farhan-rizky-prabowo` | Farhan Rizky Prabowo | Coordinator | Media, Information, and Communication (MIC) | Farhan writes clear announcements and keeps the club's working media files easy to find. |
| `demo-alya-rahmadani` | Alya Rahmadani | Coordinator | Public Relation | Alya handles invitations and follow-up in plain language that is easy to reply to. |
| `demo-bagas-aditya-wicaksono` | Bagas Aditya Wicaksono | Coordinator | Human Resource Development | Bagas pays attention to how work is shared and checks whether new volunteers have enough context to begin. |
| `demo-raka-satrio-nugraha` | Raka Satrio Nugraha | Core Member | Secretary | Raka records decisions in plain language, then turns them into notes people can find after the meeting. |
| `demo-citra-larasati` | Citra Larasati | Core Member | Treasury | Citra keeps budget notes orderly and explains spending choices without making the numbers feel remote. |
| `demo-nadine-zahra-latifah` | Nadine Zahra Latifah | Core Member | Vice President | Nadine connects the division leads and follows up when a task needs another decision. |
| `demo-muhammad-fikri-aulia` | Muhammad Fikri Aulia | Core Member | President | Fikri keeps meetings focused and makes room for quieter opinions before the club settles on a direction. |
| `demo-mira-ayuningtyas` | Mira Ayuningtyas | Board / Board of Directors | Pembina / Mentor | Mira asks the questions that make a plan specific enough to run without taking the work away from members. |
| `demo-yusuf-kurniawan` | Yusuf Kurniawan | Board / Board of Directors | Kepala UPA | Yusuf helps the club understand institutional boundaries and which decisions need coordination with UPA. |

The biographies describe ordinary working habits. They contain no awards, measured outcomes, founding claims, campus claims, programme history, or real event participation.

## Source-only TypeScript shape

Keep the fictional provenance at module level and in each ID. Do not give these objects Convex IDs or a `published` status.

```ts
export type FictionalMember = {
  id: `demo-${string}`;
  displayName: string;
  preferredName: string;
  roleCode: 0 | 1 | 2 | 3 | 4;
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
  bio: string;
  sortOrder: number;
};

export const memberDatasetProvenance = "fictional-demo" as const;

export const fictionalMembers = [
  {
    id: "demo-nabila-maheswari",
    displayName: "Nabila Maheswari",
    preferredName: "Nabila",
    roleCode: 0,
    bio: "Nabila likes low-pressure prompts and often asks a second question when a conversation stalls.",
    sortOrder: 10,
  },
  {
    id: "demo-reza-dananjaya",
    displayName: "Reza Dananjaya",
    preferredName: "Reza",
    roleCode: 0,
    bio: "Reza brings practical examples to table conversations and helps rephrase an instruction when one word gets in the way.",
    sortOrder: 20,
  },
  {
    id: "demo-salsabila-nur-fajri",
    displayName: "Salsabila Nur Fajri",
    preferredName: "Salsabila",
    roleCode: 1,
    bio: "Salsabila helps newcomers find a place in the room and keeps small organising tasks from piling up.",
    sortOrder: 30,
  },
  {
    id: "demo-dimas-arga-pratama",
    displayName: "Dimas Arga Pratama",
    preferredName: "Dimas",
    roleCode: 2,
    divisionKey: "academic",
    bio: "Dimas turns broad topics into short prompts and discussion notes the room can use.",
    sortOrder: 40,
  },
  {
    id: "demo-keisya-maharani",
    displayName: "Keisya Maharani",
    preferredName: "Keisya",
    roleCode: 2,
    divisionKey: "art",
    bio: "Keisya uses drawing and visual prompts to give a conversation another way in.",
    sortOrder: 50,
  },
  {
    id: "demo-farhan-rizky-prabowo",
    displayName: "Farhan Rizky Prabowo",
    preferredName: "Farhan",
    roleCode: 2,
    divisionKey: "mic",
    bio: "Farhan writes clear announcements and keeps the club's working media files easy to find.",
    sortOrder: 60,
  },
  {
    id: "demo-alya-rahmadani",
    displayName: "Alya Rahmadani",
    preferredName: "Alya",
    roleCode: 2,
    divisionKey: "public-relation",
    bio: "Alya handles invitations and follow-up in plain language that is easy to reply to.",
    sortOrder: 70,
  },
  {
    id: "demo-bagas-aditya-wicaksono",
    displayName: "Bagas Aditya Wicaksono",
    preferredName: "Bagas",
    roleCode: 2,
    divisionKey: "human-resource-development",
    bio: "Bagas pays attention to how work is shared and checks whether new volunteers have enough context to begin.",
    sortOrder: 80,
  },
  {
    id: "demo-raka-satrio-nugraha",
    displayName: "Raka Satrio Nugraha",
    preferredName: "Raka",
    roleCode: 3,
    positionKey: "secretary",
    bio: "Raka records decisions in plain language, then turns them into notes people can find after the meeting.",
    sortOrder: 90,
  },
  {
    id: "demo-citra-larasati",
    displayName: "Citra Larasati",
    preferredName: "Citra",
    roleCode: 3,
    positionKey: "treasury",
    bio: "Citra keeps budget notes orderly and explains spending choices without making the numbers feel remote.",
    sortOrder: 100,
  },
  {
    id: "demo-nadine-zahra-latifah",
    displayName: "Nadine Zahra Latifah",
    preferredName: "Nadine",
    roleCode: 3,
    positionKey: "vice-president",
    bio: "Nadine connects the division leads and follows up when a task needs another decision.",
    sortOrder: 110,
  },
  {
    id: "demo-muhammad-fikri-aulia",
    displayName: "Muhammad Fikri Aulia",
    preferredName: "Fikri",
    roleCode: 3,
    positionKey: "president",
    bio: "Fikri keeps meetings focused and makes room for quieter opinions before the club settles on a direction.",
    sortOrder: 120,
  },
  {
    id: "demo-mira-ayuningtyas",
    displayName: "Mira Ayuningtyas",
    preferredName: "Mira",
    roleCode: 4,
    positionKey: "mentor",
    bio: "Mira asks the questions that make a plan specific enough to run without taking the work away from members.",
    sortOrder: 130,
  },
  {
    id: "demo-yusuf-kurniawan",
    displayName: "Yusuf Kurniawan",
    preferredName: "Yusuf",
    roleCode: 4,
    positionKey: "head-of-upa",
    bio: "Yusuf helps the club understand institutional boundaries and which decisions need coordination with UPA.",
    sortOrder: 140,
  },
] as const satisfies readonly FictionalMember[];
```

## Internal disclosure policy

### Source and environment

- Put the array in a plainly named module such as `src/content/fictional-members.ts`.
- Start the module with `SYNTHETIC DEMO DATA. NOT A VERIFIED CLUB ROSTER.`
- Load it only when a server-side flag such as `MEMBER_DATA_MODE=fictional-demo` is set explicitly.
- Keep the normal and production path on the Convex query. Missing records should produce the verified-profile empty state.
- Never use this dataset as a Convex fallback after a query error. A backend outage must remain distinguishable from demo mode.
- Add `MEMBER_DATA_MODE` to `.env.example` or setup documentation with an empty default and a production warning.

### Runtime safety

- Keep `memberDatasetProvenance` in the server data result and strip it before individual cards reach client analytics.
- If fictional mode is used for a hosted review URL, mark that deployment `noindex` and record the mode in the QA report.
- Fail the release checklist when the public production deployment has `MEMBER_DATA_MODE=fictional-demo`.
- Use `demo-` IDs only. Real records must receive fresh slugs or Convex IDs, even when a real member happens to share a display name.

### Media and identity

- Leave `photoKey` absent for every fictional record.
- Render initials or abstract role artwork. Do not crop faces from supplied photographs and do not generate realistic headshots for these names.
- Do not infer pronouns from a name. The dataset has no pronoun field.
- Do not add email, phone, social accounts, campus, year, course, or location.

### Copy

- Public biographies must read as ordinary profile copy. Do not expose `Lorem ipsum`, `Jane Doe`, `test user`, `sample member`, numbered names, or QA instructions inside cards.
- Keep the fictional disclosure in source, environment configuration, QA notes, and release checks. Do not disguise the dataset's provenance inside engineering records.
- Never claim achievements, awards, founding history, measured outcomes, attendance, or participation in the photographed events.
- Keep UPA as an acronym. The available brief does not define its expansion.

## Validation checklist

- [x] Fourteen unique IDs and display names
- [x] Role codes `0` through `4` represented
- [x] All five Coordinator divisions represented once
- [x] All four Core Member positions represented once
- [x] Both supplied Board labels represented once
- [x] No portraits, contacts, social links, dates, awards, or event claims
- [x] No generated-placeholder names such as Jane Doe or public test-language
- [ ] Demo-mode unit test rejects duplicate IDs and invalid role assignments
- [ ] Production configuration test rejects `fictional-demo`
- [ ] Convex remains empty until the club supplies verified roster data

## Replacement plan

When the club supplies a roster, create fresh Convex records from the verified source. Do not edit these fictional objects until they resemble real members. Delete the demo import from the Member route, remove the opt-in flag from review environments, and keep this document as provenance for old screenshots.
