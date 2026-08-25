# Redesign Reference Audit

Audit date: 25 August 2026
Scope: every file under `docs/references/`
Coverage: 19 supplied PNG files, 18 unique visual compositions

## Design read

Reading this as: a visual-overhaul redesign of a public English club site for students and potential collaborators, with a playful conversation-led language, leaning toward native CSS plus isolated motion components rather than a photographic organisation template.

Suggested dials for the redesign:

- `DESIGN_VARIANCE: 9` because the user asked for a creative departure, not a safer refinement of the current image-led composition.
- `MOTION_INTENSITY: 8` because interaction should carry meaning and make language practice feel alive.
- `VISUAL_DENSITY: 4` because the site still needs clear reading and quick mobile decisions.

Physical scene: a student opens the site on a phone after class, taps through a prompt, discovers what people practise together, and understands how to join without reading an institutional brochure.

## Corrected interpretation

The references are an evidence pool, not a visual specification. The files in `assets/` are supporting illustrations and documentary evidence, not the design's centre of gravity. The redesign should therefore:

1. Extract interaction logic and information hierarchy from the references.
2. Refuse their category styling, especially golf prestige, environmental green, institutional blue, and long organisation-profile layouts.
3. Make language, response, rhythm, and participation the primary visual material.
4. Use supplied photographs selectively as proof, atmosphere, or journal media.
5. Preserve the route structure, accessibility work, factual boundaries, and content model already implemented.

## Evidence boundary

The audit distinguishes direct observation from inference:

- Layout, colour families, visible controls, hierarchy, and text density are observed from raster images.
- Animation, hover behaviour, carousel mechanics, and route transitions cannot be proven from still images. They are recorded only as interaction opportunities implied by visible arrows, dots, toggles, accordions, media buttons, filters, and layered compositions.
- Font families cannot be identified reliably from screenshots. The report describes visible classifications such as grotesk, serif, or script.
- Browser chrome surrounding the eight GenBI images is not part of the referenced website.
- `genbijambi/Pasted image (4).png` and `genbijambi/Pasted image (5).png` are byte-identical. Both files are logged, but the duplicate receives no additional design weight.

## Complete inventory

| File | Dimensions | Composition | Audit status |
| --- | ---: | --- | --- |
| `agrob-sustain-blog.png` | 698 x 1717 | Long landing and article archive | Reviewed |
| `blue-crest-exploration.png` | 752 x 564 | Immersive club hero | Reviewed |
| `envarn-nonprofit-organization.png` | 752 x 564 | Nonprofit section moodboard | Reviewed |
| `genbijambi/Pasted image.png` | 1920 x 1080 | Public homepage viewport | Reviewed |
| `genbijambi/Pasted image (2).png` | 1920 x 1080 | About viewport | Reviewed |
| `genbijambi/Pasted image (3).png` | 1920 x 1080 | Team directory viewport | Reviewed |
| `genbijambi/Pasted image (4).png` | 1920 x 1080 | Achievement archive viewport | Reviewed |
| `genbijambi/Pasted image (5).png` | 1920 x 1080 | Exact duplicate of image (4) | Reviewed, deduplicated |
| `genbijambi/Pasted image (6).png` | 1920 x 1080 | Event archive viewport | Reviewed |
| `genbijambi/Pasted image (7).png` | 1920 x 1080 | News archive viewport | Reviewed |
| `genbijambi/Pasted image (8).png` | 1920 x 1080 | CMS editor viewport | Reviewed |
| `golf-modern-club.png` | 752 x 3307 | Long membership landing | Reviewed |
| `living-community.png` | 698 x 4216 | Long service landing | Reviewed |
| `luxury-golf-club.png` | 752 x 564 | Framed prestige hero | Reviewed |
| `montreval-luxury.png` | 698 x 2913 | Cinematic private-club landing | Reviewed |
| `papajos-youth-organization.png` | 752 x 3395 | Long youth-organisation homepage | Reviewed |
| `paskibra-organization-website.png` | 698 x 3566 | Long local-organisation homepage | Reviewed |
| `play-better-golf.png` | 752 x 564 | Interactive hotspot hero | Reviewed |
| `wellness-club.png` | 698 x 3206 | Art-directed lifestyle landing | Reviewed |

## File-by-file evidence

### `agrob-sustain-blog.png`

**Observed**

- A compact pill-like header precedes a split introduction and one wide carousel image.
- Six same-size article cards form a dense 3 by 2 archive.
- A question-led accordion and a substantial multi-column footer close the page.
- White, charcoal, and bright agricultural green establish a predictable sustainability identity.

**Transferable principle**

- Let one story lead before showing the archive.
- Use expandable answers only when a real visitor question benefits from progressive disclosure.

**Do not copy**

- The repeated card matrix, filler copy, bright category green, and oversized footer directory.

**Interaction reinterpretation**

- Replace the image carousel with a phrase carousel whose current prompt can be advanced by buttons, arrow keys, swipe, or a visible progress indicator.
- An FAQ can become a concise "What happens when I join?" disclosure, not a generic knowledge base.

### `blue-crest-exploration.png`

**Observed**

- A single ocean photograph fills a framed hero.
- Navigation is visually subordinate to a large high-contrast serif statement.
- Unsupported member, fleet, tenure, and event metrics occupy the lower left.
- Narrative copy and a membership action sit over the image at lower right.

**Transferable principle**

- Commit the opening viewport to one dominant idea and keep the primary action present within it.

**Do not copy**

- Yacht-club prestige, fragile over-image text, inset decorative framing, italic luxury typography, or any unverified metrics.

**Interaction reinterpretation**

- Use a full-viewport typographic stage where a short English prompt changes in response to pointer, touch, or keyboard input. The stage can feel immersive without borrowing a luxury photograph.

### `envarn-nonprofit-organization.png`

**Observed**

- The file is a board of several section concepts rather than one provable page order.
- It combines a composited mission image, a plain organisation statement, numerical proof, participation options, and a full-bleed photographic quote.
- Olive, near-black, and pale neutral surfaces encode an environmental category immediately.

**Transferable principle**

- Move from purpose to participation, and give each participation mode a distinct action.

**Do not copy**

- Environmental colour coding, generic cause-marketing compositing, unsupported numbers, or three equal contribution cards.

**Interaction reinterpretation**

- Let visitors choose a real intent such as practise, collaborate, or read. One selected intent can recompose the next content panel instead of presenting three static cards.

### `genbijambi/Pasted image.png`

**Observed**

- A utility contact and social bar sits above a crowded public navigation.
- The hero uses a busy photo collage, a blue overlay, a large serif headline, three actions, and carousel dots.
- The next section begins with an announcement label and centred institutional copy.

**Transferable principle**

- The homepage must state the organisation's role quickly and expose public information plus a contact path.

**Do not copy**

- Two header tiers, eight navigation destinations, an admin entry in the public header, three equal hero actions, the recurring collage, or institutional blue as a category default.

**Interaction reinterpretation**

- Keep one public action. Convert the hero from a slideshow into one interactive speaking prompt whose state changes without auto-rotation.

### `genbijambi/Pasted image (2).png`

**Observed**

- The About route repeats the same photographic masthead.
- About, Vision, and Mission are presented as a reading column separated by horizontal rules.

**Transferable principle**

- Organisation purpose belongs on a dedicated route with a comfortable line length.

**Do not copy**

- Repeated route mastheads, formal mission-document rhythm, or a wall of prose.

**Interaction reinterpretation**

- Make the About route a short timeline of how a conversation moves from arriving, to trying, to belonging. Advance through it with scroll or explicit previous and next controls, while leaving all content available without motion.

### `genbijambi/Pasted image (3).png`

**Observed**

- The team route contains a search field, division, campus, and year filters, a grid/list switch, and member cards.
- The filter toolbar is clearer than the repeated route masthead.

**Transferable principle**

- Filters are valuable only when a real collection is large and maintained.

**Do not copy**

- Fabricated people, committee roles, filter dimensions, portrait cards, or an empty directory built before consented data exists.

**Interaction reinterpretation**

- Borrow the filter grammar for the journal or activity archive only after categories have real content. Current small collections should remain an editorial index.

### `genbijambi/Pasted image (4).png`

**Observed**

- Two achievement cards follow another reused masthead.
- The cards contain multiple images, long titles, category and date metadata, summaries, and credited names.
- A grid/list switch is visible even though little content is shown.

**Transferable principle**

- A verified accomplishment deserves enough context to identify the person and activity.

**Do not copy**

- An achievements route without evidence, long equal cards, premature view toggles, or large empty regions.

**Interaction reinterpretation**

- If achievements later exist, use one focused story with a compact expandable chronology. Do not treat them as collectible badges.

### `genbijambi/Pasted image (5).png`

This file is byte-identical to `Pasted image (4).png`, with SHA-256 `b6ed18cf1b33cae8e709e20037148449ad95d033ac534f081d6b94fd9bc1dbb2`. It adds no separate state, principle, or requirement.

### `genbijambi/Pasted image (6).png`

**Observed**

- An event archive offers a search field and three equal event cards.
- Each card exposes past status, date, title, short description, location, and a detail action.
- The same collage masthead is repeated again.

**Transferable principle**

- Event status, date, place, and one next action should be visible before opening a detail page.

**Do not copy**

- Identical cards, identical event images, all events receiving the same emphasis, or search before the collection needs it.

**Interaction reinterpretation**

- Build an agenda rail where the next verified activity expands in place and previous sessions compress into a quiet archive. Keyboard focus should trigger the same state as hover.

### `genbijambi/Pasted image (7).png`

**Observed**

- Search precedes an editorial list of stories.
- Each row shows a small thumbnail, category, date, headline, excerpt, and detail action.
- The first excerpt is long enough to slow scanning.
- Visible public copy describes the intended layout, which is implementation commentary rather than club content.

**Transferable principle**

- Editorial rows are a better archive baseline than a wall of equal cards.

**Do not copy**

- Tiny thumbnails, long repeated excerpts, public design commentary, or search on a three-item seed archive.

**Interaction reinterpretation**

- On pointer or keyboard focus, let a larger story preview appear in a fixed companion pane. On phones, the same information remains inline and tap-safe.

### `genbijambi/Pasted image (8).png`

**Observed**

- A protected CMS shell separates public content modules from the website.
- A story editor, quick block insertion, image URL and upload options, publishing controls, category, comments, and featured media are visible.
- The sidebar includes many modules that have no demonstrated need in the English Club brief.

**Transferable principle**

- Content maintenance should be separated from the public experience and organised around stable models.

**Do not copy**

- A custom administration suite, comments, attendance, points, books, or programme modules before an operating need is verified.

**Interaction reinterpretation**

- Keep Convex and R2 as the operational layer. The creative public interface must not expose CMS grammar or admin controls.

### `golf-modern-club.png`

**Observed**

- The long page moves through a sports hero, metrics, four reasons, a benefit accordion with an image, overlapping coach panels, a testimonial slider, four pricing cards, a final call to action, and a large footer.
- Acid lime is used against black and white throughout.
- Section silhouettes vary more than the average organisation landing page.

**Transferable principle**

- Different content jobs deserve different compositions.
- An active accordion can update a companion visual instead of opening more text alone.

**Do not copy**

- Fitness-sales language, neon sports styling, metrics, testimonials, pricing tiers, repeated image cards, or avatar-based social proof.

**Interaction reinterpretation**

- An activity selector can change a central prompt, timing cue, and small supporting media fragment. This makes the choice visible without imitating the reference's golf imagery or sales funnel.

### `living-community.png`

**Observed**

- The hero is organised around a location search rather than only a slogan.
- Three equal feature blocks lead into alternating image and copy sections, metrics, a video, a horizontal process, a testimonial slider, and a large final action.
- Organic dividers and doodle-like marks decorate the page.

**Transferable principle**

- Put a useful action early when visitors arrive with a concrete task.
- Order the page around questions the visitor actually asks.

**Do not copy**

- Three-feature scaffolding, ornamental curves and doodles, invented metrics, a four-step card row, or the length of the full funnel.

**Interaction reinterpretation**

- The early task can be "What do you want to practise?" Selecting a response reveals a relevant activity and route. It should guide rather than pretend to personalise outcomes.

### `luxury-golf-club.png`

**Observed**

- One landscape image fills the screen behind a thin inset frame.
- A serif and italic headline, minimal logo, menu trigger, small join action, and tiny teaser create a restrained prestige composition.

**Transferable principle**

- One strong opening idea is more memorable than a crowded feature stack.

**Do not copy**

- Private-club prestige, framed-photo cosplay, italic luxury type, dark forest colours, or small low-contrast text over photography.

**Interaction reinterpretation**

- Preserve the single-purpose viewport, but let live language be the dominant object. A word can shift meaning or pronunciation state through user input, with text remaining readable at rest.

### `montreval-luxury.png`

**Observed**

- A cinematic image hero gives way to generous pale sections, a stacked benefit accordion, a full-photo membership chapter, image frames, a horizontal identity strip, a joining panel, and a photographic footer.
- Cream, deep green, burgundy, scripts, crests, and texture construct a private-club heritage identity.
- The active benefit panel reveals a large image, implying stateful storytelling rather than static cards.

**Transferable principle**

- Pacing can change by section while the underlying voice stays coherent.
- A selected item can transform the entire section rather than change only one button.

**Do not copy**

- Paper texture, crests, scripts, beige heritage colour, private-club nostalgia, decorative identity strips, or staged prestige photography.

**Interaction reinterpretation**

- Create a conversation lab where selecting "speak", "listen", or "build" changes the section's colour field, phrase, and interaction. Preserve one accessible document order underneath every state.

### `papajos-youth-organization.png`

**Observed**

- The page opens with a multi-weight uppercase slogan and a large group photograph.
- A long centred origin story is followed by profile, vision, and mission blocks.
- Activities and committee members appear in horizontal rails.
- A dark split contact area combines explanation and a form.

**Transferable principle**

- Real activity, recent updates, and a direct contact path are stronger proof than abstract claims.
- A horizontal rail can communicate a wider collection without making the whole page taller.

**Do not copy**

- The full organisation dossier on one page, long centred paragraphs, generic member portraits, oversized all-caps slogans, or dark decorative panels.

**Interaction reinterpretation**

- A small swipeable story rail can reveal journal material, but should not become a people carousel. Photos remain supporting evidence and must have consent.

### `paskibra-organization-website.png`

**Observed**

- A narrow page uses a graph-paper background, a group hero, a floating metric bar, an introduction, multiple photo collages, activity and logo accordions, a masonry gallery, map, contact prompt, and oversized dark footer.
- An active activity row reveals both a red panel and an overlapping image.

**Transferable principle**

- Progressive disclosure works best when selecting an item changes the spatial composition, not only the text height.
- Location is useful when a verified physical meeting place exists.

**Do not copy**

- Fake metrics, grid-paper decoration, tiny repeated labels, logo symbolism as filler, a full gallery wall, or an unverified map.

**Interaction reinterpretation**

- Use a small set of expandable activity verbs. Each selected verb can move one phrase into a new sentence position, showing language as action rather than revealing another photo card.

### `play-better-golf.png`

**Observed**

- A cut-out athlete occupies the centre of a pale cyan stage.
- An oversized repeated headline sits behind the figure.
- Numbered hotspots connect the figure to side explanations, a demo action, and one primary action.

**Transferable principle**

- A central interactive object can carry the whole hero when every hotspot teaches something meaningful.

**Do not copy**

- Floating-island compositing, decorative numbered hotspots, tiny annotations, cursor-dependent interaction, or sport-specific measurement theatre.

**Interaction reinterpretation**

- This is the strongest seed for a non-photographic English Club hero. Replace the athlete with an oversized sentence whose words are focusable targets. Selecting a word reveals a short pronunciation, meaning, or conversational variation only when verified content exists. Pointer, touch, and keyboard states must be equivalent.

### `wellness-club.png`

**Observed**

- The page changes visual treatment repeatedly: panoramic hero, giant typographic statement, three numbered experiences, testimonial, full-bleed sport chapter, geographical story, membership blocks, image-led final action, and a large cropped wordmark footer.
- Script lettering, oversized grotesk, warm photography, and earthy neutrals create a highly art-directed luxury identity.

**Transferable principle**

- Sections can have distinct choreography and composition when each marks a real narrative change.
- A full-bleed scene can act as punctuation rather than become the background of every section.

**Do not copy**

- Exclusive lifestyle language, scripts, prestige photography, numbered section cards, giant all-caps filler, testimonials, or beige luxury cues.

**Interaction reinterpretation**

- Borrow its pacing, not its appearance. Let the page alternate between a kinetic phrase stage, a direct reading section, an interactive activity, and a compact documentary moment. One orchestrated transition between modes is enough.

## Cross-reference pattern map

### Repeated patterns that should not determine the redesign

| Saturated pattern | Files showing it | Decision |
| --- | --- | --- |
| Large photograph as hero background | Blue Crest, GenBI family, golf references, wellness, Montreval | Do not make photography the default hero material |
| Prestige serif or script headline | Blue Crest, luxury golf, Montreval, wellness, GenBI | Reject as category costume |
| Equal card grids | Agrob, Envarn, golf-modern, living-community, GenBI team/events | Replace with stateful composition or editorial index |
| Unverified metrics | Blue Crest, Envarn, golf-modern, living-community, Paskibra | Prohibited until supplied and verified |
| Repeated route masthead | GenBI internal routes | Give routes distinct first moments |
| Very long all-in-one homepage | golf-modern, living-community, Montreval, Papajos, Paskibra, wellness | Keep focused routes and shorter homepage |
| Green or beige category palette | golf, environment, senior living, luxury references | Do not average reference colours |
| Image carousel as default motion | Agrob, GenBI, golf-modern, Papajos | Avoid auto-rotation; use user-controlled state |

### Interaction mechanics worth translating

| Mechanic | Evidence source | English Club translation |
| --- | --- | --- |
| Focusable hotspots around one object | `play-better-golf.png` | Focusable words inside an oversized conversational phrase |
| Active accordion changes companion image | `golf-modern-club.png`, `paskibra-organization-website.png` | Selecting an activity changes phrase, colour field, and contextual explanation |
| Active stacked panel expands into a scene | `montreval-luxury.png` | Conversation lab modes expand while the inactive modes compress |
| Editorial list with a companion preview | GenBI news archive | Journal rows drive one large preview on wide screens |
| Search as an early task | `living-community.png` | A bounded "What do you want to practise?" chooser, not fake personalisation |
| Horizontal collection | Papajos and golf-modern | Swipeable journal or session rail with explicit controls |
| Art direction changes by chapter | `wellness-club.png` | Each fold uses a different interaction family while sharing tokens and voice |
| Clear event metadata | GenBI event archive | An agenda rail exposing verified date, status, and location |

## New direction that does not imitate the references

### Creative north star: The Conversation Relay

The website should feel like language moving between people, not like a photo archive or a campus administration portal. A sentence travels across the page, changes when the visitor acts, and passes from the hero into activities, stories, and the join path.

The visual object is live language. Photography is supporting evidence. UI copy is concrete and factual.

### Core interaction sequence

1. **Prompt stage.** The hero presents one short, legible sentence. Its words respond to pointer, touch, and focus without hiding the default meaning.
2. **Complete the thought.** One bounded interaction lets the visitor choose or arrange a response. It demonstrates the club's social practice without grading the user.
3. **Activity modes.** Selecting a mode such as speak, listen, or build recomposes one section. The selected state changes content and composition, not only colour.
4. **Community proof.** One or two supplied images appear as quiet evidence after the interaction has established the idea. They do not become a gallery wall.
5. **Journal handoff.** A compact editorial index pairs focused rows with one companion preview on wide screens.
6. **Join response.** The final form completes the relay by changing its label and confirmation state in direct response to the visitor's action.

### Motion responsibilities

Every proposed motion must communicate one of four things:

- **Hierarchy:** the current word or activity becomes the clear focus.
- **Story:** a sentence passes from one participant or section to the next.
- **Feedback:** tap, selection, submit, success, and error states visibly acknowledge an action.
- **State transition:** selecting a mode recomposes the associated content.

Avoid generic fade-in on every section. Avoid scroll listeners tied to React state. Use isolated client leaves with Motion values, CSS scroll-driven animation where support is safe, or IntersectionObserver. Reduced motion must preserve all content and substitute immediate state changes or a restrained crossfade.

### Asset role after correction

| Placement | Asset role | Limit |
| --- | --- | --- |
| Homepage community proof | A documentary cameo after the interactive stage | One decisive image or one compact pair |
| Activity explanation | Optional small contextual image | Only when the image adds evidence |
| Journal | Featured media and thumbnails | Content-owned, not decorative |
| About | One supporting moment | No full gallery |
| Hero | Not required to be photographic | Prefer live language or a generated interactive scene |

This preserves real imagery without making the supplied archive responsible for the entire identity.

## Guardrails for the redesign

- Preserve `/`, `/about`, `/activities`, `/journal`, `/journal/[slug]`, and `/contact` unless a later product decision changes information architecture.
- Keep one public join or contact intent per page.
- No invented member counts, results, testimonials, events, awards, prices, partners, or programme names.
- No custom cursor, hover-only information, auto-rotating carousel, or essential scroll hijack.
- No repeated equal cards, tiny uppercase labels over every section, decorative numbering, gradient text, glass panels, fake interfaces, or prestige typography.
- No raw participant media in public output. Consent and derivative rules remain in force.
- Keyboard, touch, and pointer users receive equivalent state changes.
- Mobile collapses into a direct single-column story without losing the interactive premise.
- `prefers-reduced-motion` preserves meaning and control.
- The journal and contact paths remain usable when all enhancement scripts fail.

## Decision summary

The reference set supports a more interactive site, but it does not support copying any one look. Its strongest evidence is mechanical:

- A single dominant stage is more memorable than a crowded hero.
- Stateful sections are more expressive than repeated card grids.
- Editorial rows are better for a small archive.
- Real actions should determine the page sequence.
- Section rhythm can change without losing one coherent voice.

The redesign should therefore move from **Open-Mic Contact Sheet**, where photography carried the identity, toward **The Conversation Relay**, where live language and participation carry the identity and images provide selective proof.
