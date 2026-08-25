# Creative Web Research

Research date: 25 August 2026
Scope: creative, cultural, community, editorial, learning, and studio websites
Project mode: redesign overhaul with the existing route structure and evidence rules preserved

## Decision

The next design should stop using photography as the main composition engine. Photos remain evidence, but they become supporting fragments inside a site whose identity comes from language that visitors can touch.

The strongest direction is a **Sentence Playground**: large responsive type, user-controlled phrase changes, a small conversation-prompt generator, content that can be browsed in more than one way, and motion that explains state. The page should still make sense as ordinary HTML when JavaScript is unavailable.

This is not a recommendation to turn the company profile into a language-learning app. The interaction budget stays small. Each interactive moment has one verb and one purpose:

- Change a sentence to understand the club's personality.
- Generate a conversation prompt to experience the activity for a few seconds.
- Switch the journal between a visual story view and a compact index.
- Carry a chosen intent into the contact form.

The source photos should appear after the first interaction, around activity proof and journal entries. They should not fill the hero or dictate every section silhouette.

## Method and evidence boundary

I visited primary websites rather than award galleries or screenshot roundups. Findings come from the current live pages, first-party project explanations, and controls exposed in their rendered HTML. The sample covers sites active in August 2026, plus two older learning experiments that remain live and useful.

An interaction documented by its maker counts as high-confidence evidence. A layout inferred only from the current page structure is marked as an observation, not a claim about hidden animation. No recommendation below assumes unpublished traffic, conversion, or accessibility data.

## Research set

### 1. The Pudding

Primary sources: [current homepage](https://pudding.cool/), [About](https://pudding.cool/about/), [From Goat to Despite](https://pudding.cool/2026/07/essential-words/), [resources](https://pudding.cool/resources/)

**Observed:** The homepage treats each story as a specific question rather than forcing every entry into the same marketing card. Its July 2026 essay about English learner vocabulary scatters words through the opening, compares two lists through interactive views, exposes a word-list panel, and lets readers inspect cells. The publication describes its work as visual essays built through research and code.

**Useful here:** Language itself can be the visual material. The English Club hero could begin with a readable sentence whose final clause changes through explicit buttons. A later “word table” can let visitors combine a person, action, and topic into a conversation prompt. Journal stories may earn one custom interaction when their source material supports it.

**Do not copy:** The club has no large dataset, so it should not imitate charts or scatter words as decorative pseudo-data. Custom story code also needs a strict ceiling; three different mini-apps inside one article would make maintenance brittle.

**Confidence:** High. The relevant interaction and data method are visible on the primary essay.

### 2. M+

Primary sources: [M+ homepage](https://www.mplus.org.hk/en/), [M+ interview about its web design](https://www.mplus.org.hk/en/magazine/web-design-is-visual-culture/)

**Observed:** The site pairs Chinese and English content within one identity and organizes exhibitions, events, magazine work, and collection access as separate content modes. In M+'s first-party design interview, the designers explain that the oversized logo reduces into the header on the first scroll and page colour changes as content moves. They also describe a modular system intended to stay expressive below the homepage.

**Useful here:** Let one brand element change role instead of adding decoration. “EC” can begin as part of the hero sentence, then settle into the header once the visitor moves on. A restrained colour-state change can mark the shift from “try a prompt” to “see what the club does.” The deeper routes should retain that behavior rather than becoming static templates.

**Do not copy:** Frequent background changes can damage contrast and make dark mode hard to reason about. Use one controlled state change on the homepage, keep the palette roles stable, and render a normal header immediately for reduced-motion and no-JavaScript states.

**Confidence:** High. The interaction comes from the museum's own design interview.

### 3. Ableton Learning Music

Primary source: [Learning Music](https://learningmusic.ableton.com/)

**Observed:** The first lesson asks the visitor to click musical parts on and off before presenting much explanation. It requires no prior equipment, runs in the browser, and offers a Bahasa Indonesia language option. The first interaction is a small, reversible action with an immediate result.

**Useful here:** “Try before reading” fits an English Club better than a long institutional introduction. A visitor can press a few labelled controls to form a conversation starter, read it aloud if they want, then continue. No score, streak, account, microphone, or personal data is needed.

**Do not copy:** Sound is the subject on Ableton, while it would be an extra burden here. Avoid autoplay and speech recognition in the first redesign. They introduce permission, privacy, latency, and error states without helping the company-profile task.

**Confidence:** High. The lesson instructions and controls are present on the primary page.

### 4. Are.na

Primary source: [Are.na homepage](https://www.are.na/)

**Observed:** Are.na defines itself through changing or cumulative statements, then explains the product through actions such as capture, arrange, search, connect, and network. Its landing page exposes topic buttons and a search field as invitations to follow curiosity; the service also states that discovery is not driven by personalized recommendations.

**Useful here:** Replace the fixed slogan-plus-photo hero with a controlled sentence system. The user can choose a verb such as “ask,” “listen,” “retell,” or “try again,” and the short support line responds. Journal topics can behave as real paths into content instead of inert badges.

**Do not copy:** An infinite rabbit-hole interface would obscure joining. Keep the primary action visible and limit topic exploration to a small, curated set backed by real posts.

**Confidence:** High for content structure and controls; medium for visual-motion behavior not described in the source.

### 5. Dinamo Typefaces

Primary sources: [Dinamo homepage](https://abcdinamo.com/), [Dinamo Pipeline](https://dinamopipeline.com/), [Dinamo Darkroom](https://abcdinamo.com/darkroom)

**Observed:** Dinamo lets visitors type, tap, adjust font controls, and use keyboard shortcuts. Pipeline exposes weight, italic, and mono controls as the experience rather than hiding the type system behind screenshots. The main site also separates practical tools, experiments, releases, and cultural material.

**Useful here:** A type-led interaction does not need a custom cursor or 3D scene. The hero phrase can change in response to focus and clicks while remaining selectable text. Controls must use axes and font features that the shipped font actually contains; otherwise the change should be copy, colour, or position.

**Do not copy:** A type foundry can make every screen a specimen. English Club still needs readable company information. Keep the experimental type to the hero and one activity moment, then return to steady reading typography.

**Confidence:** High. Inputs, keyboard shortcuts, and “tap to try” controls are exposed on the primary sites.

### 6. WePresent

Primary source: [WePresent](https://wepresent.wetransfer.com/)

**Observed:** The platform offers distinct paths through stories, films, series, and artists. Commissioned work receives its own art direction, while the homepage can still be scanned as linked titles and media. A featured work and a compact monthly selection coexist without forcing every item into the same ratio.

**Useful here:** The journal can have a stable shell but allow a featured story to alter colour, type scale, or interaction according to its content. The homepage should distinguish a journal feature from the ordinary archive instead of repeating identical rows.

**Do not copy:** WePresent's subject is commissioned visual culture, so media carries most of its identity. The English Club redesign should use less media: one supporting archive image near activity proof, selected journal covers, and an occasional inline story image.

**Confidence:** High for information architecture; medium for animation because the primary source does not describe every transition.

### 7. It's Nice That

Primary sources: [current homepage](https://www.itsnicethat.com/), [first-party redesign explanation](https://www.itsnicethat.com/features/bureau-for-visual-affairs-introducing-new-its-nice-that-digital-140120)

**Observed:** The current site offers category, discipline, tag, series, search, and live-feed routes into a large archive. Its own redesign article explains the choice to accept different image ratios in one grid and connect stories through subject tags.

**Useful here:** A story archive can change rhythm without losing its taxonomy. A visual “Stories” mode can use uneven title scale and optional media; an “Index” mode can provide dates, categories, and direct links for fast scanning. Both modes point to the same URLs.

**Do not copy:** The club has only a small seed archive. Large filter drawers, a live feed, and dozens of topic links would manufacture depth. Ship the mode switch only when each mode helps the current content; keep category options bounded to published posts.

**Confidence:** High. The grid and tag decisions are explained by the publisher and its design partner.

### 8. Base Design

Primary sources: [Base Design](https://www.basedesign.com/), [Base_test interview](https://www.basedesign.com/press/base-test-interview)

**Observed:** Base separates Feed, Projects, and Index, with search and filtering available as direct navigation modes. Its first-party interview frames public experiments as a working archive rather than polished case studies.

**Useful here:** “Stories” and “Index” can be two honest views of the same journal. An optional “Try it” block on the homepage can also show one small web experiment without pretending it is the club's main service.

**Do not copy:** A studio feed mixes press, awards, work, and events because that reflects its operation. English Club should not merge posts, activities, and contact notices into one noisy stream. It also should not add faux experimental labels around standard components.

**Confidence:** High for the navigation modes and public-test rationale.

### 9. Nicer Tuesdays

Primary source: [Nicer Tuesdays](https://nicertuesdays.itsnicethat.com/)

**Observed:** The site gives current lineups a clear city, date, place, and ticket path, then separates latest talks from most-watched talks. Event information and the talk archive share one brand without sharing the same layout.

**Useful here:** When verified dates exist, an upcoming English Club event should lead with time, place, and one action. Past activity stories belong in a different browse mode. The distinction is more useful than treating every item as a generic card.

**Do not copy:** “Most watched” depends on real analytics. Do not add popularity rankings or attendance numbers without a verified source.

**Confidence:** High. The current event and archive groupings are present in primary HTML.

### 10. The Poetry Project

Primary source: [events archive](https://www.poetryproject.org/events/)

**Observed:** Its event archive uses explicit format, date, and title metadata while explaining how the season is curated. The same page publishes concrete access information about transcription, screen-reader compatibility, masks, and how to request another accommodation.

**Useful here:** Access information should sit with event facts, not in a generic footer promise. A future English Club event view can state venue access, language level expectations, cost if confirmed, and a contact path in plain text.

**Do not copy:** A long chronological wall becomes tiring on a phone. Once event data grows, use year or status controls and pagination while keeping every result as a normal link.

**Confidence:** High for content and access treatment; no claim is made about hidden motion.

### 11. Chrome Music Lab

Primary sources: [Chrome Music Lab](https://musiclab.chromeexperiments.com/), [Google Creative Lab project page](https://experiments.withgoogle.com/music-lab)

**Observed:** Each experiment presents one direct action, works without an account, and aims to run on phones, tablets, and laptops. Some experiences also expose a clear unsupported-browser state. Google provides source links for several experiments.

**Useful here:** One-purpose interactions are easier to understand and test. The prompt generator should open ready to use, provide a reset, and never require sign-in.

**Do not copy:** Chrome Music Lab can justify Web Audio, WebRTC, WebGL, and browser-specific features because experimentation is its product. The company-profile site cannot. Text and CSS should provide the main experience.

**Confidence:** High. The primary FAQ documents the device and technology scope.

### 12. Active Theory, used as a boundary

Primary source: [Active Theory v5](https://v5.activetheory.net/)

**Observed:** The experience depends on WebGL and returns an unsupported-graphics message when the required capability is missing.

**Useful here:** Only as a stress test. It proves that an impressive interaction can also replace the whole site with an error for part of the audience.

**Decision:** Reject WebGL, Three.js, custom cursor physics, and a canvas-only hero for this project. They work against phone-first access, searchable content, and the club's simple maintenance model.

**Confidence:** High. The limitation is stated by the site itself.

## Recommended synthesis

### Creative north star: Sentence Playground

The website should feel like walking into a room where language is already in motion. A sentence responds when the visitor makes a choice; an activity prompt appears; an article can be browsed by topic or as an index. Images confirm that a real group exists, but the interface does not wait for a photo to become interesting.

The existing indigo and coral can survive the redesign because they already form a committed identity. What changes is their job:

- Indigo becomes the room state and large type colour, not a repeated rectangular panel.
- Coral marks the current choice, a successful action, or the single join action.
- Neutral space carries reading and makes the interaction legible.
- Archive photography uses natural colour and appears in isolated proof moments.

### Homepage sequence

#### Hero: a sentence the visitor can alter

Default, complete HTML:

> English starts when somebody speaks.

Four visible buttons replace the final verb or clause. A chosen state might produce “English starts when somebody asks,” while the support sentence and primary link remain stable. The text does not auto-cycle. Pointer hover may preview a state, but keyboard focus and click must do the same work.

The hero needs no background photograph. A small archive image can enter at the edge of the next section, where it confirms the transition from playful claim to real activity.

#### Prompt mixer: experience the method

The visitor combines three bounded choices:

```text
Ask [someone nearby] about [a place] they [would revisit].
```

“New prompt” produces another curated combination. The result uses a polite status announcement only after explicit activation. A plain list of prompts remains visible when JavaScript is absent. No answer is stored.

#### Activity deck: browse by verb

Use four real activity verbs derived from confirmed content. Each control reveals a short explanation and, where available, one supporting image. Desktop may use a sticky text rail with changing content; mobile becomes a normal accordion or scroll-snap row with previous and next controls. Dragging can be a bonus, never the only input.

#### Journal: Stories / Index

“Stories” gives one featured title and a varied list. “Index” compresses the same records into category, date, and title. The selected view belongs in a URL query so Back, Forward, and shared links behave normally. With only a few posts, Index remains useful as a fast scan rather than pretending to be a deep archive.

#### Join close: carry intent forward

The closing interaction asks why the visitor is here: join, collaborate, or ask. Each choice is a normal link to `/contact?intent=...`, so the contact form opens with the matching option selected. This interaction changes state for a practical reason and works without client code.

## Interaction contract

| Interaction | Communicates | Default HTML | Enhanced behavior | Reduced-motion behavior |
| --- | --- | --- | --- | --- |
| Sentence switcher | The club is built around active language | One complete headline and four buttons | Text swaps with a short clipped transition | Instant text replacement |
| Prompt mixer | A concrete example of conversation practice | Curated prompt list | Button recombines approved phrase parts | Instant update with no movement |
| Activity deck | Different forms of participation | Four headed content sections | Sticky selection or scroll-snap with explicit controls | Normal stacked sections |
| Journal mode | Two reading speeds | Story links in one semantic list | Stories / Index view switch, query persisted | Same state change, no transition |
| Contact intent | A shorter route into the right form state | Normal query-string links | Selected intent receives a visible state | No difference required |

Every control must be a native button, link, input, or disclosure. Pointer position never becomes application state. Do not add a custom cursor, drag-only carousel, scroll hijack, autoplay audio, or hover-only information.

## Next.js implementation shape

Keep the page and content as Server Components. Interactivity belongs in small client leaves:

```text
src/components/play/
  sentence-switcher.tsx
  prompt-mixer.tsx
  activity-deck.tsx
  journal-view-switcher.tsx
```

Suggested rules:

- Use CSS custom properties, `transform`, opacity, and clip-path for the short transitions. Do not attach a `scroll` event listener.
- Use `IntersectionObserver` only when the activity deck needs to identify the current section. The API observes visibility without a hand-built loop. [MDN: Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- CSS scroll snap is acceptable for the mobile activity row only when previous and next controls remain present. [MDN: scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type)
- Respect `prefers-reduced-motion` by replacing movement with an immediate state change or a short crossfade. Large panning and scaling can trigger discomfort. [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- Announce a newly generated prompt after the user presses its button, but do not announce hover previews. A status region should not steal focus. [MDN: ARIA status role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role)
- Lazy-load any client leaf below the first viewport. Keep WebGL, canvas render loops, microphone APIs, and animation frameworks out of the first redesign.
- The static state must contain all headings, primary links, event facts, and journal links. JavaScript changes presentation and selection; it does not unlock content.

## Image policy after the redesign

The supplied assets are illustration and proof, not the layout brief.

- No full-height photo hero.
- Use one archive image around the first real-activity proof, selected covers in the journal, and an occasional story image.
- Do not build a homepage gallery merely because many files exist.
- Do not crop every image to the same ratio.
- Consent and privacy rules from `docs/ASSET-AUDIT.md` still control publication.
- If a section works only when a photo is present, its concept is not strong enough yet.

## Explicit rejection list

- A WebGL room, floating 3D letters, or pointer particles.
- Continuous automatic word scrambling.
- Horizontal scroll hijacking.
- Multiple marquees.
- A photo on every fold.
- Equal activity cards with icons above headings.
- Fake progress, streaks, member counts, event popularity, or language-level scores.
- Voice recording, speech recognition, or camera access in the company-profile release.
- Tiny annotation text placed around a hero as decoration.
- Topic chips that do not filter or navigate.

## What to carry into the redesign documents

Update `DESIGN.md`, `DESIGN-SYSTEM.md`, and `BLUEPRINT.md` around these decisions:

- Replace “The Open-Mic Contact Sheet” with “Sentence Playground” as the main interaction metaphor.
- Keep candid photography as supporting evidence and remove the assumption that the site must remain image-led.
- Raise motion from light transitions to user-controlled state choreography, while keeping reduced motion and static HTML first.
- Add the Sentence Switcher, Prompt Mixer, Activity Deck, and Journal View Switcher as named components with full keyboard, loading, empty, and error states where applicable.
- Preserve the current routes, Convex content contract, Cloudflare R2 delivery contract, consent rules, and verified-copy boundary.

## Research conclusion

The useful common thread across The Pudding, Ableton, M+, Are.na, and Dinamo is not visual excess. Each site turns its subject into the interaction: data becomes an essay, music becomes clickable parts, a museum identity changes state, saved ideas become paths, and type becomes a control.

English Club should do the same with sentences. That is a stronger basis for a creative site than another large photograph, and it remains small enough to build, test, and maintain in Next.js.
