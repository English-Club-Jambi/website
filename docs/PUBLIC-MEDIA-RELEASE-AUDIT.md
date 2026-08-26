# Public Media Release Audit

Status: release gate passed for checked-in public media
Reviewed and R2-verified: 26 August 2026
Generator: built-in `image_gen`
Derivative tool: ImageMagick 7 (`-auto-orient -strip`, WebP quality 82, AVIF quality 52)

## Release decision

No photograph with unverified rights or pending participant consent is served by the Next.js public directory or the static media manifest.

The replacement direction is a deliberately artificial paper-and-clay miniature system. It keeps the bright **Conversation Relay** composition while making the boundary obvious: these images are visual metaphors, not records of an event, a member, a partnership, or a result. The six new sources contain no people, hands, faces, humanoid figures, readable text, logos, or third-party marks.

The public manifest now accepts only:

- `rights: "cleared"`;
- `consent: "cleared"`;
- `provenance: "generated-synthetic"`;
- `containsRealPeople: false`.

`tests/unit/media.test.ts` enforces that contract, verifies every derivative exists, checks every legacy key resolves to a cleared replacement, and compares `public/images/` to an explicit release allowlist.

## Runtime set

| Runtime key | Source master | Public derivatives | Dimensions | Uses |
| --- | --- | --- | ---: | --- |
| `conversation-relay-hero-v2` | `docs/evidence/generated-conversation-relay-hero-v2.png` | `public/images/conversation-relay-hero-v2.{avif,webp}` | 1672 × 941 | Home faded hero; Practice overview |
| `activity-speak-relay-v2` | `docs/evidence/generated-activity-speak-relay-v2.png` | `public/images/activity-speak-relay-v2.{avif,webp}` | 1448 × 1086 | Speak activity |
| `activity-exchange-relay-v2` | `docs/evidence/generated-activity-exchange-relay-v2.png` | `public/images/activity-exchange-relay-v2.{avif,webp}` | 1536 × 1024 | Exchange activity; first seeded Journal cover |
| `activity-make-relay-v2` | `docs/evidence/generated-activity-make-relay-v2.png` | `public/images/activity-make-relay-v2.{avif,webp}` | 1448 × 1086 | Make activity; third seeded Journal cover |
| `activity-room-relay-v2` | `docs/evidence/generated-activity-room-relay-v2.png` | `public/images/activity-room-relay-v2.{avif,webp}` | 1448 × 1086 | Room activity; Home handoff; second seeded Journal cover |
| `about-record-relay-v2` | `docs/evidence/generated-about-record-relay-v2.png` | `public/images/about-record-relay-v2.{avif,webp}` | 1402 × 1122 | About record section |

Journal records already stored in Convex may still contain an older cover key. `legacyMediaAliases` in `src/content/media.ts` maps each such value to one of the generated assets above; it never reconstructs or serves an old filename. New seed records use the v2 keys directly.

All 12 v2 derivatives were uploaded under the stable object keys above and verified with `HeadObject`; custom-domain reads return the expected AVIF or WebP MIME type and exact byte size. `resolveMediaUrl` uses `https://r2.mukhtada.my.id` in the configured deployment, while `NEXT_PUBLIC_MEDIA_LOCAL_FALLBACK=1` keeps a byte-identical local QA path.

Reviewed dynamic R2 Journal and Assessment media use a separate Convex path. Their public projection already requires a `ready` media record of the correct purpose. This audit does not weaken that backend contract.

## Visual integration evidence

The running site on port 3987 was inspected without restarting or replacing the process:

- `docs/evidence/public-media-home-v2-desktop.png` — faded hero, copy contrast, first-fold controls;
- `docs/evidence/public-media-home-v2-mobile.png` — Pixel 7 crop, actions, and fixed activity rail;
- `docs/evidence/public-media-activities-v2-desktop.png` — selected Exchange state and companion crop;
- `docs/evidence/public-media-about-v2-desktop.png` — record still life beside the evidence boundary;
- `docs/evidence/public-media-journal-v2-desktop.png` — an old stored `leeds-panel` key resolving to the v2 Exchange cover.

At 1440 px, Home, Activities, About, and the seeded Journal article produced no horizontal overflow, no WCAG A/AA Axe violations, and zero network requests containing any pending documentary stem. The Pixel 7 Home check also had `scrollWidth === clientWidth`. Visual review found no broken crop, blocked control, text collision, or identifiable person. During this pass, the About label `Proof / limits` exposed a pre-existing 3.07:1 contrast failure; it now uses the brand's strong cobalt token and passes Axe.

## Consent-pending recovery boundary

The following exact derivative pairs were moved out of `public/images/` into the ignored, recoverable directory `assets/consent-pending-derivatives/`:

- `club-room-group.avif` and `club-room-group.webp`;
- `club-room-portrait.avif` and `club-room-portrait.webp`;
- `club-room-selfie.avif` and `club-room-selfie.webp`;
- `club-room-wide.avif` and `club-room-wide.webp`;
- `leeds-auditorium.avif` and `leeds-auditorium.webp`;
- `leeds-group.avif` and `leeds-group.webp`;
- `leeds-panel.avif` and `leeds-panel.webp`;
- `shared-work.avif` and `shared-work.webp`;
- `speaking-session.avif` and `speaking-session.webp`;
- `table-conversation.avif` and `table-conversation.webp`.

The supplied masters under `assets/` were not deleted, renamed, edited, or uploaded. The moved derivatives remain local evidence only. Restoring one to a public path requires a new rights-and-consent review, manifest change, test allowlist change, and release review; moving a file back by itself is not approval.

The existing generated hero, generated Member atmosphere, and generated Member portrait sprite remain under `public/images/` because their project-generation ledger already records cleared generated provenance. The Home and Practice routes now choose the people-free v2 hero.

## Prompt ledger

### Conversation Relay hero

```text
Use case: stylized-concept
Asset type: extra-wide landing-page hero background for the English Club “Conversation Relay” website
Primary request: a deliberately synthetic, hand-built paper-and-clay miniature of an inviting language-club room, with an irregular shared table, empty chairs, open blank notebooks, wordless conversation prompt cards, one tabletop microphone, and a pair of headphones; the room suggests a lively conversation has just paused, but contains no people
Scene/backdrop: bright chalk-white miniature interior with low shelves and a large side window, built from tactile paper, card, matte clay, and painted wood
Style/medium: high-end editorial stop-motion set photography of a clearly artificial miniature, crisp real textures, not documentary photography, no photorealistic people
Composition/framing: panoramic 16:9; all meaningful objects concentrated in the right half and lower-right third; generous calm pale negative space over the entire left half for large cobalt website typography; unobstructed fade area along the bottom; clear depth without clutter
Lighting/mood: soft high-key morning sidelight, candid, curious, assured, bright
Color palette: chalk white and carbon charcoal with disciplined relay cobalt accents and one small signal-orange object
Constraints: no people, no hands, no faces, no humanoid figures, no readable text, no letters, no logo, no watermark, no graduation imagery, no school crest, no flags, no fake screenshot, anatomically irrelevant
Avoid: stock education photography, corporate office, glossy 3D plastic, purple-blue AI glow, bokeh, gradient backdrop, floating UI, decorative typography, legible writing
```

### Speak

```text
Use case: stylized-concept
Asset type: Activity Relay image for the “Speak” state
Primary request: a clearly synthetic hand-built paper-and-clay still life about speaking practice: one matte tabletop microphone, an open blank notebook, several blank word-cards, and two curved cobalt paper ribbons passing across the composition like an exchanged sentence
Scene/backdrop: small chalk-white tabletop set with tactile cut-paper edges
Style/medium: premium stop-motion editorial miniature photography, visibly constructed by hand, non-documentary
Composition/framing: landscape 4:3, decisive close view, microphone slightly off center, calm negative space around the objects, no cropped essential object
Lighting/mood: clean side daylight, curious and focused
Color palette: chalk, carbon, relay cobalt, one restrained signal-orange tab
Constraints: no people, no hands, no faces, no humanoid figures, no readable text, no letters, no logo, no watermark
Avoid: stock photo, classroom, podcast branding, glossy plastic, neon, gradient backdrop, floating UI
```

### Exchange

```text
Use case: stylized-concept
Asset type: Activity Relay image for the “Exchange” state and a Journal cover
Primary request: a clearly synthetic hand-built paper miniature about exchange across places: two small stacks of blank postcards connected by a folded cobalt paper path over a simple matte globe fragment, with one orange route marker and a pair of wordless speech-card shapes meeting in the middle
Scene/backdrop: bright chalk-white tabletop stage, tactile deckled paper and matte clay
Style/medium: premium stop-motion editorial miniature photography, visibly artificial and non-documentary
Composition/framing: landscape 3:2, low oblique angle, visual handoff from lower left to upper right, balanced negative space, suitable for multiple responsive crops
Lighting/mood: crisp morning light, open and inquisitive
Color palette: chalk, carbon, relay cobalt, one disciplined signal-orange marker
Constraints: no flags, no readable map labels, no people, no hands, no faces, no humanoid figures, no readable text, no letters, no logo, no watermark
Avoid: travel stock photo, corporate globe icon, graduation imagery, glossy 3D, neon, gradient backdrop
```

### Make

```text
Use case: stylized-concept
Asset type: Activity Relay image for the “Make” state and a Journal cover
Primary request: a clearly synthetic collaborative-making still life with no people: overlapping cut-paper shapes, a partly assembled angular paper object, a blank shared notebook, two binder clips, safe closed scissors, and a cobalt thread linking unfinished pieces; one orange piece marks the current decision
Scene/backdrop: chalk-white worktable built as a miniature studio set
Style/medium: high-end paper-craft stop-motion editorial photography, deliberately constructed, non-documentary
Composition/framing: landscape 4:3 top-down oblique crop, energetic asymmetry without clutter, one clear unfinished object, comfortable crop room
Lighting/mood: bright soft daylight, practical and playful
Color palette: chalk white, carbon, relay cobalt, one signal-orange paper piece
Constraints: no people, no hands, no faces, no humanoid figures, no readable text, no letters, no logo, no watermark
Avoid: children’s craft stock photography, confetti, rainbow palette, glossy 3D, gradient backdrop, floating UI
```

### Stay / Room

```text
Use case: stylized-concept
Asset type: Activity Relay image for the “Stay / Room” state and homepage documentary-handoff replacement
Primary request: a clearly synthetic hand-built miniature of an empty conversation circle after a session: five mismatched paper-and-clay chairs around one irregular low table, open blank notebooks facing one another, a pair of headphones resting at the edge, and several wordless prompt cards passed between places
Scene/backdrop: bright compact club-room stage with a low shelf, made from tactile paper, card, matte clay, and painted wood
Style/medium: premium stop-motion editorial miniature photography, visibly constructed, explicitly non-documentary
Composition/framing: landscape 4:3, overhead-oblique view, table slightly right of center, clear circulation path and calm negative space, suitable for responsive crop
Lighting/mood: high-key soft daylight, familiar and welcoming without people
Color palette: chalk white, carbon, relay cobalt, one small signal-orange token
Constraints: no people, no hands, no faces, no humanoid figures, no readable text, no letters, no logo, no watermark
Avoid: empty corporate meeting room, generic classroom, glossy plastic dollhouse, neon, gradient backdrop, clutter
```

### About record

```text
Use case: stylized-concept
Asset type: About-page record image
Primary request: a clearly synthetic hand-built paper archive still life: one open scrapbook with completely blank image windows, a neat stack of blank index cards, one cobalt thread passing through punched cards, a simple date-stamp tool with no visible letters or numbers, and an orange tab marking one preserved note
Scene/backdrop: chalk-white archive table and shallow paper shelf, tactile deckled edges
Style/medium: premium stop-motion editorial miniature photography, visibly artificial, quiet and precise, non-documentary
Composition/framing: portrait-friendly 5:4 landscape source with the open book and archive cards forming an asymmetrical diagonal, enough clear crop room on every edge
Lighting/mood: soft daylight, reflective, careful, assured
Color palette: chalk white, carbon, relay cobalt, one signal-orange tab
Constraints: all pages and cards blank; no people, no hands, no faces, no humanoid figures, no photographs, no readable text, no letters, no numbers, no logo, no watermark
Avoid: antique beige nostalgia, museum stock photography, identifiable documents, real photographs, graduation props, glossy 3D, gradient backdrop
```

## Integrity

```text
0b828c56293062a215f20917fba3d6fa11dc64fa78c04c8bab36b5b4efcf6e02  generated-conversation-relay-hero-v2.png
fe16365c4b5a71aee291b0db7385711c5c1ce0fa989d1da4b266baae967fa919  generated-activity-speak-relay-v2.png
c7a198e46ab1a5fb3def06270050885175138bc3d532219e16d0c688c1b7367e  generated-activity-exchange-relay-v2.png
8467c08efe3d925c794c59c96f11bbe6776ad3c18f19cfd28c807bef91996570  generated-activity-make-relay-v2.png
e941746df1ee0826cea363d88e5783d99b862c3e46f738dd88369bb90477faec  generated-activity-room-relay-v2.png
109dfbc9fea5af8a91a63ab8d2859c72dbaf8e3fb0f01c2dbcd71e18c3c4882d  generated-about-record-relay-v2.png
57599d4c14e1cd9023d2c104611f38e70dc9bb75a757c71c06f63d00581a0263  conversation-relay-hero-v2.avif
2a434cf344f69673b52e91c4dbfa32119c56d921b9589b0bcaf584ce40a70370  conversation-relay-hero-v2.webp
b5ed97be85379fa577354de77d1fbb3db135fadf9a9f9cf831876578b365219d  activity-speak-relay-v2.avif
de76519403d9893a54ea7a77109ca08a4bc8263bdfd882bf41ffca8cf1f24cb1  activity-speak-relay-v2.webp
dabdce8706cb6d0f9b784f4a2a9adb92ae6b1d86a43d4e9421ecdf3dd15145a8  activity-exchange-relay-v2.avif
ebc6c8ea6e38fbe652343c19ac034e32207750550ceeabafe2640a62809a68be  activity-exchange-relay-v2.webp
22b4dae1d3116d5b3af795a27b621ddc33fb707d91f3d585709469c3bedd0dcf  activity-make-relay-v2.avif
6d5329be28754b95057a560b70721fb20664c9fa438dec6681a3dce6b208bf65  activity-make-relay-v2.webp
a3eec6c216de1a22af1ef8b7b75b7ea651a3c4733dab8bd22b876e528d2ad4d1  activity-room-relay-v2.avif
b1a2657c89130fb03cb05440edfc4652ca8e6b342be8c6c814903521c0a00a12  activity-room-relay-v2.webp
b34259adedcbe3ceeb772836f666c272d049d3b64ae6510c2f33a4eeb932c805  about-record-relay-v2.avif
8cea854b2b3e09e2288940a9a29ad6cacb59ed3dcbfbc2eeea1af94d32abfa9a  about-record-relay-v2.webp
```

ImageMagick reported the intended dimensions and sRGB colour space for every derivative. The conversion used `-strip`; a binary scan found none of `GPS`, `OpenAI`, `Trufo`, `C2PA`, generator paths, or source identifiers in a public derivative. The environment did not provide ExifTool, so the check used ImageMagick profile inspection plus binary scanning.

## Verification checklist

- [x] Inspect all six generated masters at full frame.
- [x] Confirm no people, faces, hands, text, logos, or documentary claims appear in the imagery.
- [x] Generate versioned AVIF and WebP derivatives with metadata stripping.
- [x] Move all 20 pending documentary derivatives out of the browser-addressable directory.
- [x] Preserve raw masters and moved derivatives in the ignored `assets/` trust zone.
- [x] Replace Home, Practice, Activities, About, and seeded Journal mappings.
- [x] Keep old Convex cover keys functional through cleared aliases.
- [x] Enforce the public allowlist and manifest policy in a focused unit test.
- [x] Upload all 12 v2 derivatives to R2 and verify object MIME type and byte size.
