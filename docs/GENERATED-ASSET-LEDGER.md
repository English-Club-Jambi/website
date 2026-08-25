# Generated Asset Ledger

Status: temporary design assets with local and R2 derivatives
Date: 25 August 2026
Generator: built-in image generation tool

## 1. Release boundary

These files are useful for composition and testing, but they are not a final brand approval or evidence of a real English Club event. The generated people do not represent members. Before launch, the club may keep the generated atmosphere, commission a replacement, or remove it without changing the page structure.

## 2. Hero atmosphere

### Accepted source

- Evidence master: `docs/evidence/generated-conversation-hero-placeholder.png`
- Local WebP: `public/images/conversation-hero-placeholder.webp`
- Local AVIF: `public/images/conversation-hero-placeholder.avif`
- Dimensions: 1692 by 930 pixels
- Composition: people and table activity on the right; quiet pale field on the left
- Runtime semantics: decorative `alt=""` because the scene sits behind a complete heading and does not provide factual evidence
- Manifest status: generated rights and consent marked `cleared`; capture date remains unverified because it is not a capture

### Final generation prompt

```text
Use case: photorealistic-natural
Asset type: temporary landing-page hero background for an English community club
Primary request: an art-directed candid scene that suggests live conversation and shared learning without looking like stock education photography
Scene/backdrop: a bright library-like community room with pale shelves and a long table, daylight entering from the side
Subject: three or four young adults in a real conversation around the table; natural hand gestures, one open notebook, one closed cobalt-blue book, one small orange paper marker; faces may be partially cropped or softly out of focus so the scene supports typography rather than becoming a portrait
Style/medium: photorealistic editorial documentary photography with restrained film grain and real material texture
Composition/framing: extra-wide horizontal crop, subjects and table activity concentrated in the right half and lower-right third, generous quiet pale negative space across the left half for large website typography, no important subject at the far edges
Lighting/mood: high-key natural morning light, candid, curious, welcoming, assured, clean and bright
Color palette: warm chalk, natural skin and wood, one disciplined cobalt detail, one small orange detail
Constraints: no readable text, no logos, no watermarks, no classroom props, no staged group pose, no graduation imagery, anatomically natural hands, no duplicated people, no exaggerated smiles
Avoid: generic corporate stock photo, glossy coworking office, blue-purple AI lighting, gradient backdrop, floating graphics, bokeh overload, visual clutter
```

### Integration decision

The image fills the Sentence Playground as an absolutely positioned layer. Two CSS colour masks fade its left and bottom edges into the semantic page colour. This is the only allowed gradient use in the public interface. The type, response, controls, and actions remain complete if the asset fails.

## 3. Member relay atmosphere

### Accepted source

- Evidence master: `docs/evidence/generated-member-relay-placeholder.png`
- Local WebP: `public/images/member-relay-placeholder.webp`
- Local AVIF: `public/images/member-relay-placeholder.avif`
- Dimensions: 1774 by 887 pixels
- Composition: overhead-oblique shared table on the right; quiet daylight floor and window field on the left
- Runtime semantics: decorative `alt=""` because the role taxonomy and roster state remain complete in text
- Publication boundary: the adults are generated and do not represent real English Club members

### Final generation prompt

```text
Use case: photorealistic-natural
Asset type: wide background image for the /members hero of a university English Club website
Primary request: a candid overhead-oblique scene of a diverse group of young adult university students in an English conversation club, gathered around one irregular shared table and leaning toward the same conversation
Scene/backdrop: a bright contemporary campus club room with lived-in details, open notebooks, loose paper phrase cards, a microphone resting unused, and one open laptop; the room feels active but not staged
Subject: 8 to 10 young adult students; frame them mainly from above, behind, or in profile so no face reads as an identifiable portrait
Style/medium: natural editorial documentary photography, subtle film grain, believable skin and fabric texture, no polished stock-photo poses
Composition/framing: 2:1 panoramic landscape; activity concentrated across the upper-right and center; generous quiet negative space on the lower-left for a large headline; clear depth and an organic diagonal circulation path
Lighting/mood: clean daylight from windows, curious, social, assured
Color palette: neutral bright room with selective cobalt-blue paper and one burnt-orange object, no neon, no purple glow
Constraints: adults only; no visible institutional logos; no readable text; no watermark; no people looking at camera; no graduation clothing; no classroom lecture setup; no exaggerated smiles; no duplicated people or malformed hands
Avoid: generic corporate stock photo, posed team portrait, equal rows, dark nightclub lighting, glassmorphism, illustration, 3D render, AI-purple gradient
```

### Integration decision

The image fills the Member opening behind the right side of the composition. Horizontal and bottom masks fade it into the semantic page colour. It never appears inside the roster and can be removed without changing the five-role structure or public-directory state.

## 4. Member directory portrait sheet

### Accepted source

- Evidence master: `docs/evidence/generated-member-directory-portraits-v1.png`
- Local WebP: `public/images/member-directory-portraits-v1.webp`
- Local AVIF: `public/images/member-directory-portraits-v1.avif`
- Dimensions: 1254 by 1254 pixels
- Composition: exact 4 by 4 contact sheet with one fictional adult Indonesian student portrait per cell
- Runtime use: 15 unique cells are cropped into 4:5 Member cards; one cell remains unused
- Publication boundary: every person is generated and none represents a real English Club member
- R2 state: both AVIF and WebP uploaded and verified with `HeadObject`

### Accepted generation brief

```text
Create one square 4 by 4 contact sheet containing exactly 16 distinct photorealistic editorial head-and-shoulders portraits of fictional adult Indonesian university students. Keep every person centered within a clean equal cell, use varied genders, hairstyles, modest contemporary campus clothing, natural expressions, and bright soft daylight. Maintain a candid university-organisation portrait language with warm neutral backgrounds and selective cobalt or orange wardrobe details. No repeated face, no child, no text, no logo, no watermark, no badge, no graduation clothing, no corporate stock-photo polish, no neon, no fantasy styling, and no malformed features.
```

### Integration decision

One immutable sprite reduces 15 additional image requests while the pre-seed showcase is active. CSS background-position values are deterministic and tested for uniqueness. The sheet never becomes a real-member asset: reviewed profiles use individual `members/` object keys and the separate Convex consent path.

### Integrity

```text
e8c4567fffab71899f095d527de120d45aec418a460a61990ae8fcc8c3ce9d16  generated-member-directory-portraits-v1.png
21692fef77353d11e05703454365b7e4cb79cefa0a0fb1ceb52628b0b5ddadb6  member-directory-portraits-v1.webp
743196303209330e0eeefdf22887b7ae93ba80abd8b1c037b11b7c101ba00406  member-directory-portraits-v1.avif
```

## 5. Logo exploration

### Generated concept

- Evidence concept: `docs/evidence/generated-logo-concept.png`
- Dimensions: 1536 by 1024 pixels with alpha
- Accepted idea: angular `EC` handoff geometry with one orange response point
- Rejected execution: the generated raster retained glow and tonal variation after a flattening pass, so it was not shipped in the header

### First logo prompt

```text
Use case: logo-brand
Asset type: temporary website logo mark for English Club
Primary request: an original geometric monogram symbol for the initials EC, expressing a conversation passed from one person to another
Core metaphor: two open speech-shaped frames hand a small response point across the negative space; the geometry should subtly read as E and C without becoming a literal speech-bubble icon
Style/medium: vector-friendly flat logo mark, minimal, crisp, strong silhouette, balanced negative space, professional identity design
Composition/framing: one single centered mark only, generous transparent margin, no board, no mockup, no wordmark
Color palette: Relay Cobalt #4937E8 as the dominant flat color with one very small Signal Orange #F27A26 response point
Constraints: genuinely transparent background, no text, no extra symbols, no gradient, no shadow, no 3D, no bevel, no watermark, scalable and legible at 24 pixels, original design only
Avoid: generic chat bubbles, quotation marks, globes, books, graduation caps, microphones, sparkles, random arrows, startup swoosh, crest, mascot, visual clutter
```

### Flattening prompt

```text
Use case: precise-object-edit
Asset type: final temporary website logo mark
Input image: edit target, preserve the exact EC monogram geometry and central response dot
Primary request: flatten the existing mark into a crisp vector-style logo
Constraints: remove every glow, blur, light bloom, transparency halo, shading, depth, and gradient; preserve the current EC silhouette and spacing; fill the EC geometry with one uniform flat Relay Cobalt #4937E8; fill the central dot with one uniform flat Signal Orange #F27A26; keep a genuinely transparent background; hard antialiased edges; no shadow; no outline; no texture; no text; no extra elements; no watermark; generous transparent margin; legible at 24 pixels
Avoid: neon, luminous edges, black backdrop, blue-purple variation, 3D, bevel, soft focus
```

### Shipped placeholder mark

- Runtime file: `public/brand/english-club-mark-placeholder.svg`
- Method: deterministic flat SVG redraw of the accepted EC geometry
- Colours: `#4937E8` and `#F27A26`
- Reason for redraw: a logo needs clean edges, exact colour, and reliable 24-pixel legibility; the raster concept could not meet those constraints without residual glow
- Replacement rule: keep the filename or update `SiteHeader` when a final approved identity is supplied

## 6. Icon system

Functional symbols are not generated. The interface uses the official `@heroicons/react` 2.2.0 SVG package so arrows, menu controls, theme controls, activity symbols, prompt refresh, send, and success states remain consistent and accessible. Unicode arrows, ASCII symbols, and emoji are prohibited as icon substitutes.

## 7. Verification checklist

- [x] Workspace contains every consumed generated asset.
- [x] Hero has AVIF and WebP derivatives.
- [x] Member relay atmosphere has AVIF and WebP derivatives.
- [x] Member directory portrait sheet has AVIF and WebP derivatives.
- [x] Both portrait derivatives are uploaded and verified in R2.
- [x] Hero remains decorative and the page works without it.
- [x] The raster logo concept is retained as evidence but not served publicly.
- [x] The served SVG is flat and deterministic.
- [x] No generated asset contains readable text, watermark, or third-party mark.
- [x] No generated scene is described as documentary evidence.
- [x] Generated faces are limited to the documented fictional pre-seed showcase and are never represented as verified roster evidence.
- [ ] Final organisation approval before public release.
