# Reference Audit

Audit date: 25 August 2026
Scope: `docs/references/`
Coverage: 19 PNG files, 18 unique visual compositions

## Evidence boundary

`genbijambi/Pasted image (4).png` and `genbijambi/Pasted image (5).png` are byte-identical and share SHA-256 prefix `b6ed18cf`. They count as two supplied files but one design reference.

Font names and implemented motion cannot be proven from raster images. Typography is described by visible classification, while motion is inferred only from controls such as arrows, dots, accordions, toggles, and media buttons. Sampled colours include photographic pixels and are reference clues, not source tokens. Browser chrome around the eight GenBI screenshots is not part of the site design.

## Inventory

| File | Dimensions | Reference type |
| --- | ---: | --- |
| `agrob-sustain-blog.png` | 698 x 1717 | Full-page landing and blog |
| `blue-crest-exploration.png` | 752 x 564 | Hero concept |
| `envarn-nonprofit-organization.png` | 752 x 564 | Multi-section moodboard |
| `golf-modern-club.png` | 752 x 3307 | Full-page club landing |
| `living-community.png` | 698 x 4216 | Full-page community service landing |
| `luxury-golf-club.png` | 752 x 564 | Hero concept |
| `montreval-luxury.png` | 698 x 2913 | Full-page private club |
| `papajos-youth-organization.png` | 752 x 3395 | Full-page youth organisation |
| `paskibra-organization-website.png` | 698 x 3566 | Full-page local organisation |
| `play-better-golf.png` | 752 x 564 | Interactive hero concept |
| `wellness-club.png` | 698 x 3206 | Full-page lifestyle club |
| `genbijambi/Pasted image.png` | 1920 x 1080 | Homepage viewport |
| `genbijambi/Pasted image (2).png` | 1920 x 1080 | About viewport |
| `genbijambi/Pasted image (3).png` | 1920 x 1080 | Team directory viewport |
| `genbijambi/Pasted image (4).png` | 1920 x 1080 | Achievement archive viewport |
| `genbijambi/Pasted image (5).png` | 1920 x 1080 | Exact duplicate of image (4) |
| `genbijambi/Pasted image (6).png` | 1920 x 1080 | Event archive viewport |
| `genbijambi/Pasted image (7).png` | 1920 x 1080 | News and blog archive viewport |
| `genbijambi/Pasted image (8).png` | 1920 x 1080 | CMS news editor viewport |

## Individual references

### `agrob-sustain-blog.png`

- **Information architecture:** navigation, split introduction, wide carousel image, six trending articles, FAQ accordion, newsletter and footer.
- **Type and colour:** geometric sans; white, charcoal, and leaf-lime. Approximate raster samples: `#F7F8F7`, `#38403A`, `#6F9245`.
- **Implied interaction:** carousel dots, arrow links, accordion expand/collapse.
- **Keep:** a clearly featured story, a readable archive, and an FAQ only where real questions exist.
- **Reject:** six same-size article cards and category-coded green. The English Club archive should pair one featured story with sparse editorial rows.

### `blue-crest-exploration.png`

- **Information architecture:** full-bleed sailing image, framed hero, navigation, left headline, lower-left metrics, lower-right narrative and membership action.
- **Type and colour:** high-contrast serif with italic plus very small sans UI; navy and white. Approximate samples: `#082A57`, `#264D71`, `#D9DFED`.
- **Implied interaction:** media-led hero, arrow action, continuation into exploration content.
- **Keep:** one decisive photograph and asymmetrical statement placement.
- **Reject:** elite-club language, tiny over-photo copy, fragile inset framing, and unsupported hero metrics.

### `envarn-nonprofit-organization.png`

- **Information architecture:** this is a moodboard rather than a provable page order. It shows a mission hero, organisation summary, proof metrics, participation paths, and a photographic quote.
- **Type and colour:** bold contemporary sans; neutral white, olive, and near-black. Approximate samples: `#E7EAE3`, `#1F251B`, `#46532D`.
- **Implied interaction:** scroll narrative, donation or volunteer form, action cards.
- **Keep:** mission, people, then a clear way to participate.
- **Reject:** generic campaign compositing, environmental colour coding, and equal contribution cards.

### `golf-modern-club.png`

- **Information architecture:** action hero, proof band, reasons to join, accordion benefits, coaches, testimonial, four price plans, closing call to action, footer.
- **Type and colour:** rounded geometric sans; near-black, white, and acid lime. Approximate samples: `#232725`, `#EFF0EF`, `#565B27`.
- **Implied interaction:** benefit accordion, coach and testimonial carousels, membership billing toggle, image hover states.
- **Keep:** a clear path through offer, people, proof, and joining.
- **Reject:** gym-style sales copy, neon sport coding, repeated image cards, pricing tiers without a verified paid model, and fake social proof.

### `living-community.png`

- **Information architecture:** header and location search, media hero, three reasons, two image stories, statistics, process, testimonial, final action, footer.
- **Type and colour:** heavy friendly sans; white, navy, green, and pastel fills. Approximate samples: `#ECF1EF`, `#1F2227`, `#41986C`.
- **Implied interaction:** search, video playback, horizontal process, testimonial carousel.
- **Keep:** information revealed in an order that matches visitor questions; a real sequence may use numbered steps.
- **Reject:** feature-card repetition, doodles, blobs, ornamental curved dividers, and an overlong homepage.

### `luxury-golf-club.png`

- **Information architecture:** a single full-screen hero with minimal logo/menu, headline, join action, and a small course teaser.
- **Type and colour:** editorial serif and italic plus tiny sans; forest, muted gold, and white. Approximate samples: `#1A1F16`, `#59521F`, `#5C6568`.
- **Implied interaction:** menu overlay and teaser navigation.
- **Keep:** restraint and one dominant photograph.
- **Reject:** prestige copy, low-contrast tiny text, mobile-fragile frame, and private-club cosplay.

### `montreval-luxury.png`

- **Information architecture:** cinematic hero, asymmetrical manifesto, benefit accordion, membership chapter, course philosophy, join action, photographic footer.
- **Type and colour:** decorative serif or script paired with sans; cream, green, and burgundy. Approximate samples: `#E9E2D3`, `#232A24`, `#464A37`.
- **Implied interaction:** accordion, carousel arrows, ticker or marquee, image parallax.
- **Keep:** controlled section changes, confident alignment shifts, and membership explained as an experience.
- **Reject:** script-heavy typography, simulated paper texture, private-club history cues, tiny copy, and beige heritage styling.

### `papajos-youth-organization.png`

- **Information architecture:** slogan and group photo, origin story, profile/vision/mission, recent activities, committee carousel, contact form, footer.
- **Type and colour:** bold geometric sans; light grey, black, and muted photography. Approximate samples: `#E5E6EA`, `#161616`, `#463B3A`.
- **Implied interaction:** activity carousel, committee carousel, form states.
- **Keep:** a real group image, concise organisation story, activity updates, and direct contact.
- **Reject:** long centred paragraphs, generic dark decorative panels, clipped carousels, and unverified member portraits.

### `paskibra-organization-website.png`

- **Information architecture:** group-photo hero, metrics, About, collage, activity accordion, logo meaning, masonry gallery, map/contact, join action, footer.
- **Type and colour:** geometric sans; white-grey, crimson, and charcoal. Approximate samples: `#F0F0F1`, `#292A2D`, `#9F5E5B`.
- **Implied interaction:** counters, accordion, gallery, map, join hover.
- **Keep:** authentic documentation, expandable activity detail, gallery, and a join path.
- **Reject:** a small uppercase kicker on every block, metric overlays, notebook-grid decoration, long centred grey copy, and facts that have not been supplied.

### `play-better-golf.png`

- **Information architecture:** a single interactive hero with central cut-out object, echoed headline, numbered hotspots, side explanations, demo, and action.
- **Type and colour:** oversized grotesk with small UI copy; pale cyan, white, charcoal, orange. Approximate samples: `#E0E8E7`, `#89B7B7`, `#544C2D`.
- **Implied interaction:** hotspots, video demo, 3D or parallax object, directional annotations.
- **Keep:** one focused interactive learning prompt could earn its place later.
- **Reject:** floating-island compositing, tiny annotations, and a hero that becomes a keyboard, mobile, or performance problem.

### `wellness-club.png`

- **Information architecture:** cinematic hero, oversized statement, three experiences, testimonial, full-bleed sport chapter, geography and membership story, membership blocks, final action and footer.
- **Type and colour:** expressive script with very large grotesk; off-white, black, earthy green and gold. Approximate samples: `#F1EDE9`, `#5A5132`, `#8E6F3E`.
- **Implied interaction:** parallax, experience hover, slider, membership carousel.
- **Keep:** typographic confidence, full-bleed photo chapter changes, and different section compositions.
- **Reject:** illegible script, tiny body type, numbered-experience cards, beige lifestyle imitation, and exclusivity language.

## GenBI Jambi reference family

The public screens share an institutional shell: blue utility bar, white navigation, blue image overlay, serif display headings, sans body text, and a pale-blue page surface. The consistency is useful, while repeating the same collage and route masthead makes the archive mechanical.

### `genbijambi/Pasted image.png`

- **Visible IA:** utility contact/social bar; navigation for Home, About, Team, Achievements, Books, Activities, News, and Contact; admin preview; contact action; carousel hero; announcement introduction.
- **Approximate colour samples:** `#EFF2F3`, `#1D325C`, `#43618E`.
- **Keep:** a clear public value statement and direct paths to the organisation and recent news.
- **Reject:** two crowded header tiers, three equal hero actions, and a busy collage competing with the headline. Use one photograph, one main action, and one secondary link.

### `genbijambi/Pasted image (2).png`

- **Visible IA:** internal masthead, About prose, Vision, Mission.
- **Keep:** organisation content on a separate route in a comfortable reading column.
- **Reject:** a document-like wall of text and the same large image masthead on every route. English Club needs a concise origin, purpose, and image evidence.

### `genbijambi/Pasted image (3).png`

- **Visible IA:** team masthead, search, division/campus/year filters, grid/list switch, member cards.
- **Implied interaction:** live filter, search, and view change.
- **Keep later:** a directory only when the number of consented profiles warrants filters.
- **Reject now:** committee cards, role claims, or filters without source data. A small verified team should use an editorial roster instead.

### `genbijambi/Pasted image (4).png`

- **Visible IA:** achievement masthead, grid/list switch, two large achievement stories.
- **Keep later:** a separate verified achievement archive that credits members.
- **Reject now:** long same-size cards, excess white space, and any achievement claim not present in the repository.

### `genbijambi/Pasted image (5).png`

This file is byte-identical to image (4). It does not add a new state or requirement and must not receive double weight in a decision.

### `genbijambi/Pasted image (6).png`

- **Visible IA:** event masthead, search, past-event cards with status, date, location, and detail action.
- **Implied interaction:** search or filter and detail navigation.
- **Keep:** events need readable status, date, place, and action.
- **Reject:** identical visuals on every event, a generic equal-card row, and an archive that gives no stronger treatment to the next session.

### `genbijambi/Pasted image (7).png`

- **Visible IA:** news masthead, search, editorial rows containing thumbnail, category, date, title, excerpt, and detail.
- **Implied interaction:** search and archive pagination.
- **Keep:** this is the strongest local model for `/journal`; use a featured story and shorter list excerpts.
- **Reject:** overly small thumbnails, long excerpts, and public copy that explains the designer's layout rationale.

### `genbijambi/Pasted image (8).png`

- **Visible IA:** protected CMS shell with modules for pages, programmes, agenda, team, news, books, achievements, attendance, and points; block editor; quick insert; publishing controls; feature image.
- **Type and colour:** serif inside the editor, sans interface; approximate samples `#EBEFF2`, `#215C93`, `#262A2F`.
- **Implied interaction:** collapsible sidebar, content-block insertion, publish settings, image URL or upload.
- **Keep:** content should be maintained through a stable post, event, programme, media, and site-settings model.
- **Reject:** building a broad custom CMS before the model stabilises, and copying books, attendance, points, or comments without an actual need.

## Cross-reference synthesis

The reference set has three families:

1. Organisation and community examples: GenBI, Papajos, and Paskibra. These inform routes, real activity proof, events, people, gallery, contact, and future content operations.
2. Lifestyle and private clubs: Blue Crest, Lynwood, Launch Golf, Montreval, and Elysian. These contribute photo confidence and pacing, but their exclusive tone does not fit a student learning community.
3. Content and service pages: Agrob, Envarn, and NextDoor. These contribute archive, mission, FAQ, and question-order patterns.

The chosen direction combines community architecture with publication-like reading rhythm, then borrows only the photographic commitment of the lifestyle references. It does not average their colours: the amount of green in the folder comes from golf and environmental examples, not from English Club evidence.

## Route implications

### First release

- `/` for company profile and conversion landing.
- `/about` for purpose, visible history, and working principles.
- `/activities` for the kinds of work supported by the archive.
- `/journal` and `/journal/[slug]` for the blog.
- `/contact` as the join and partnership path.

An `/events` route becomes useful when verified upcoming dates exist. The code and Convex schema may support it without placing an empty route in the primary navigation.

### Later, only with verified content

- `/team`
- `/achievements`
- `/events`
- `/events/[slug]`
- `/gallery`
- Protected post, event, programme, people, media, and site-settings administration

Do not build membership pricing, attendance, points, book catalogue, complex filters, or comments until those needs appear in a real operating workflow.

## Homepage implications

1. A one-line desktop navigation with About, Activities, Journal, and one Join action.
2. A split hero with one authentic photograph, one short statement, one main action, and one secondary text link.
3. A concise evidence strip drawn from a real archive label or current announcement, never fabricated statistics.
4. A short purpose statement set vertically, not a split heading with filler text.
5. Activity narratives with different compositions according to content, not three repeated icon cards.
6. A curated documentary sequence rather than an indiscriminate gallery.
7. One featured story followed by editorial list rows.
8. A join/contact section and compact footer.

## Accepted patterns

- Real member and activity photography is the main evidence layer.
- Events expose status, date, place, and one clear action.
- Journal pages use editorial rows rather than a uniform card grid.
- Purpose, activities, people, stories, and contact form one coherent narrative.
- A CMS or backend follows the proven content model.
- Carousel or accordion controls stay explicit, keyboard operable, visible without animation, and compatible with reduced motion.

## Rejected patterns

- Reusing one oversized collage masthead on every route.
- Three or four hero actions with equal weight.
- Repeated grids of identical cards.
- Small uppercase kickers above every section heading.
- Decorative `01 / 02 / 03` labels outside a genuine sequence.
- Unverified numbers, ratings, quotes, roles, awards, or partner claims.
- Script or decorative type in body copy and controls.
- Long centred paragraphs.
- Tiny text over photography.
- Generated or stock portraits standing in for real members.
- Beige texture, notebook grid, doodles, ornamental waves, and private-club history cues.
- Pricing tiers without a confirmed paid membership model.
- Public meta-copy that describes design decisions instead of club content.
