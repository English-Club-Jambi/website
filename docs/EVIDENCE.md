# Evidence Ledger

Updated: 25 August 2026

## Purpose and method

This file records every local reference and asset used to plan the English Club website. Observations describe only what is visible in the files or present in repository metadata. Any interpretation is labelled as such. No organisation name, event date, attendance figure, programme, role, or testimonial may enter production copy unless a source supports it.

## Coverage

| Source set | Expected | Reviewed | Status |
| --- | ---: | ---: | --- |
| `docs/references/*.png` and nested PNG files | 19 files / 18 unique visuals | 19 files / 18 unique visuals | Visual pass and independent cross-check complete |
| `assets/*.JPG` | 13 | 13 | Visual, crop, metadata, and privacy cross-check complete |
| `assets/MVI_3166.MOV` | 1 | 1 | Frame, duration, audio-format, and privacy review complete |
| Text documents in `docs/` before this ledger | 0 | 0 | None present |

Detailed reports:

- [`REFERENCE-AUDIT.md`](REFERENCE-AUDIT.md) records the 19-file reference audit, including the byte-identical duplicate.
- [`ASSET-AUDIT.md`](ASSET-AUDIT.md) records technical quality, crop safety, metadata, consent, and publication rules for all 14 assets.
- [`TECH-RESEARCH.md`](TECH-RESEARCH.md) records framework, content model, rendering, SEO, accessibility, and test evidence from primary documentation.
- [`MEDIA-DERIVATIVES.md`](MEDIA-DERIVATIVES.md) maps every served preview derivative back to its master and records metadata-scan and hash evidence.

## Reference inventory

### Full-page organisation and community references

| File | Direct observation | Useful signal | Risk or rejection |
| --- | --- | --- | --- |
| `docs/references/papajos-youth-organization.png` | Indonesian youth-organisation homepage with group-photo hero, long profile copy, vision and mission, activity carousel, committee portraits, contact form, and large footer. Black and white dominate. | Authentic group photography, explicit organisation story, recent-activity path, clear contact block. | Too much committee and profile material on one page; templated rounded panels; several invented portraits in the mock-up. |
| `docs/references/paskibra-organization-website.png` | Indonesian organisation page with grid-paper background, large group photo, activity accordion, logo explanation, masonry gallery, map, join call to action, and dark footer. Red acts as the sole accent. | Strong route content for About, Activities, Gallery, and Contact; authentic photos carry credibility. | Long single-page density, repeated small section labels, decorative grid, and large map before the final action. |
| `docs/references/living-community.png` | Senior-community landing page with search, three explanation cards, paired image-text sections, statistics, process cards, testimonial, and final call to action. Navy and green palette. | Clear answer sequence and repeated action placement. | Category template, equal-card repetition, decorative marks, and unsupported metrics do not fit this project. |
| `docs/references/genbijambi/Pasted image.png` | Desktop homepage for GenBI Jambi. The hero uses a real collage, blue overlay, editorial serif headline, short body, three actions, and an announcement section below. | Strong local precedent for a public Indonesian student organisation with news-led content. | Hero has too many actions and a dense desktop navigation. |
| `docs/references/genbijambi/Pasted image (2).png` | About page with image-backed masthead followed by prose sections for organisation, vision, and mission. | Confirms that organisation details deserve a separate route rather than a homepage dump. | Reusing the same masthead image and treatment across routes can feel mechanical. |
| `docs/references/genbijambi/Pasted image (3).png` | Searchable team directory with filters, grid/list toggle, member portraits, role, body, and year. | Useful future content model for a maintained member directory. | Out of the first release unless the club supplies consented portraits, names, and roles. |
| `docs/references/genbijambi/Pasted image (4).png` | Achievement listing with image-led entries and a masthead. | Supports an editorial list pattern if verified achievements exist. | Facts are unavailable for this English Club; do not create an achievements route now. |
| `docs/references/genbijambi/Pasted image (5).png` | Duplicate view of the achievement listing in image (4). | Confirms the reference, adds no new page state. | Count as a duplicate, not separate evidence. |
| `docs/references/genbijambi/Pasted image (6).png` | Event listing with search, past-event labels, cards, dates, places, and detail actions. | Supports an Events route and a date-aware Convex model. | Three equal cards and repeated masthead treatment should not be copied literally. |
| `docs/references/genbijambi/Pasted image (7).png` | News index with search and sparse editorial rows: thumbnail, category, date, headline, excerpt, detail action. | Best local pattern for the blog index because it favours reading rhythm over a dense card grid. | Excerpts shown are long for mobile; search is unnecessary until the archive grows. |
| `docs/references/genbijambi/Pasted image (8).png` | CMS edit-news screen with sidebar, story editor, quick insert, publication settings, category, comments, and featured image. | Proves the supplied reference expects maintainable editorial content, not hard-coded posts. | A custom admin is outside the public-site first release; Convex functions and seed data should keep a future CMS path open. |

### Club, editorial, and visual-direction references

| File | Direct observation | Useful signal | Risk or rejection |
| --- | --- | --- | --- |
| `docs/references/wellness-club.png` | Image-led private-club page with oversized display type, asymmetric editorial compositions, experience columns, testimonial, location section, membership panels, and full-bleed photography. | Confident art direction, varied pacing, typography used as composition, and decisive photography. | Cream luxury styling, scripted wordmarks, tiny type, and private-club exclusivity conflict with an open student community. |
| `docs/references/montreval-luxury.png` | Golf club page in forest green, off-white, and burgundy with full-bleed images, layered programme bands, membership feature, crests, texture, and script accents. | Committed colour use and photo-led section changes. | Heritage crests, distressed paper, script, and prestige framing would fabricate institutional history. |
| `docs/references/golf-modern-club.png` | Long modern golf landing page with action-photo hero, black sections, yellow-green accent, benefits, coach images, testimonial, pricing cards, and footer call to action. | High energy, single accent, and a visible community offer. | Sales-heavy copy, fake social proof, pricing grid, and repeated cards do not match available facts. |
| `docs/references/luxury-golf-club.png` | Single hero concept with dark course photograph, fine inset frame, serif headline, small join action, and a supporting image note. | Demonstrates how one photograph can carry the first viewport. | Prestige language and decorative frame should not define the English Club. |
| `docs/references/play-better-golf.png` | Experimental hero with a cut-out golfer on a floating turf island, oversized sans type, annotations, and scattered action points. | Layered depth and active composition can inspire restrained image overlap. | Fake product annotations and composited spectacle would overpower documentary club photography. |
| `docs/references/blue-crest-exploration.png` | Sailing-club hero with aerial photo, large serif headline, member metrics, supporting copy, and membership action. | Strong photo, legible scrim, asymmetric type placement. | Unsupported metrics and elite-club language are unusable. |
| `docs/references/envarn-nonprofit-organization.png` | Moodboard of nonprofit sections using pale green, dark olive, nature imagery, impact metrics, and participation cards. | Shows clear paths for joining, volunteering, and partnership. | Generic cause-marketing imagery, metric cards, and equal contribution cards feel interchangeable. |
| `docs/references/agrob-sustain-blog.png` | Blog page with simple navigation, split intro, wide featured image, six article cards, FAQ accordion, contact lead-in, and dark footer. | Confirms the need for a featured story plus readable archive and a concise footer. | Repeated equal cards, placeholder copy, carousel dots, and an unrelated FAQ block add noise. |

## Asset inventory

### Exchange and public-event photographs

| File | Direct observation | Technical and editorial note | Candidate use |
| --- | --- | --- | --- |
| `assets/IMG_1903.JPG` | Panel conversation with Indonesian and international participants; a screen reads "Leeds the Way: Bridging England and Indonesia" and includes the University of Leeds mark. | 6000 x 4000 landscape; warm indoor cast; foreground furniture limits a low crop. | Blog feature or programme proof, with a crop centred on the speaking participant and screen. |
| `assets/IMG_2017.JPG` | Large mixed group in an auditorium after the same apparent exchange event. | 6000 x 4000; strong horizontal group image; front table and chairs should be reduced but not crop out people at the edges. | Homepage community proof or article gallery. |
| `assets/IMG_2028.JPG` | Smaller posed group in an auditorium, many wearing event lanyards. | 6000 x 4000; symmetrical and easier to crop than `IMG_2017.JPG`; ceiling takes excess space. | About page or event article. |
| `assets/IMG_4945.JPG` | Phone photograph of the panel, clearly showing the event screen and speakers. | 965 x 543; lower resolution but clean composition; EXIF contains GPS data and must be stripped in public derivatives. | Article lead on smaller displays; do not use as a full-width desktop hero. |

### Community-service photograph

| File | Direct observation | Technical and editorial note | Candidate use |
| --- | --- | --- | --- |
| `assets/IMG_3165.JPG` | Group photograph with children under a banner reading "Penyerahan Donasi Rumah Qur'an Ghaza" and "Voices of Joy, Seeds of Hope." | 4608 x 3456; visible camera date conflicts with file metadata and should not be treated as the event date. Contains children, so publication needs confirmed consent. | Hold from the public build by default; document as a possible community story after consent. |

### Informal club-room photographs

| File | Direct observation | Technical and editorial note | Candidate use |
| --- | --- | --- | --- |
| `assets/_MG_7702.JPG` | Seven members making a casual group selfie around laptops in a library or club room. | 6000 x 4000; front-right arm and laptops create depth; one central face has motion blur. | Strong homepage hero candidate because it feels participatory rather than staged. |
| `assets/_MG_7706.JPG` | Larger casual group posing closely in the same room. | 6000 x 4000; good energy and facial visibility; bright window on the right. | Homepage or About community image; safe centre crop needs testing at mobile widths. |
| `assets/_MG_7713.JPG` | Three seated members in front of library shelves; event poster visible behind them. | 6000 x 4000; flash and uneven light; natural horizontal portrait. | Supporting story image, not a hero. |
| `assets/_MG_8143.JPG` | Wide documentary view of members gathered around low tables in a library, with books and game controllers in the foreground. | 6000 x 4000; wide context, soft focus toward the back. | Programme or culture section showing everyday club life. |
| `assets/_MG_8144.JPG` | Blurred frame of members in the same room. | 6000 x 4000 but motion blur makes it unsuitable for prominent publication. | Exclude from the first release. |
| `assets/_MG_8145.JPG` | Mid-range candid view of members working and talking around tables. | 6000 x 4000; usable but foreground subject is cut by the frame. | Blog gallery or small supporting crop. |
| `assets/_MG_8170.JPG` | Small group seated around a table, viewed from above, with library shelves behind. | 6000 x 4000; clear documentary context but faces are not the focus. | Programme detail or gallery. |
| `assets/_MG_8198.JPG` | Three members at the front of the room; one uses a microphone beside a laptop. | 6000 x 4000; central activity is readable and leaves some negative space. | Speaking-practice section or activity story. |

### Video

| File | Review status | Publication rule |
| --- | --- | --- |
| `assets/MVI_3166.MOV` | 9.36-second 1280 x 720 H.264/PCM clip of the same donation group shown in `IMG_3165.JPG`; useful action ends at roughly 7.2 seconds, after which the camera points toward the ceiling. | Hold from the public build. It contains identifiable children and audio. If consent is confirmed later, trim to 0-7.2 seconds, transcode to H.264/AAC or WebM, add a poster and captions, expose controls, and never autoplay with sound. |

## Initial synthesis

### Facts supported now

- The archive contains real student group activity in a library or club room.
- At least one photographed exchange event connects Indonesian participants with visitors associated with the University of Leeds.
- Speaking, discussion, group work, and informal social activity appear repeatedly.
- The supplied references consistently expect About, Activities or Events, Blog or News, and Contact content.

### Facts not supported yet

- Formal organisation name beyond the working label "English Club."
- Campus, city, founding year, membership count, price, schedule, programme names, committee roster, awards, partner list, contact address, or social handles.
- Permission to publish identifiable member photographs, especially the image containing children.
- Any direct quote or testimonial.

### Working design read

Reading this as: an English-first community landing and editorial site for Indonesian students, with candid campus energy and assured publication pacing, built from native CSS tokens in Next.js rather than a stock education template.

Dial hypothesis: `DESIGN_VARIANCE 7`, `MOTION_INTENSITY 5`, `VISUAL_DENSITY 4`. Variation should come from photo crops and section rhythm; motion should explain navigation and reading order, while the blog stays calm.

## Decision log

| Decision | Evidence | Status |
| --- | --- | --- |
| Default register is `brand`. | User asks for company profile, landing page, and blog; references are public marketing and editorial surfaces. | Accepted |
| Use real club photography as the identity anchor. | Thirteen supplied photographs show people and activities; the strongest references are also image-led. | Accepted, pending publication consent |
| Keep About, Activities, Journal, and Contact as separate routes. | GenBI route set, Papajos, Paskibra, and the user request all separate these jobs. | Accepted |
| Avoid a public member directory in the first release. | GenBI demonstrates the pattern, but this repository has no consented names, roles, or portraits. | Accepted |
| Use an editorial row layout for the full blog index. | GenBI news and Agrob references support it; it avoids a repeated equal-card grid. | Accepted |
| Do not publish statistics or testimonials. | References contain them, but local evidence does not. | Accepted |
| Keep content editable through Convex even without a custom CMS. | GenBI CMS reference and user framework preference. | Accepted |

## Open evidence checks

- [x] Complete frame and audio inspection of `MVI_3166.MOV`.
- [x] Merge the independent reference audit and record the exact duplicate.
- [ ] Record final responsive crops for every published image.
- [x] Strip GPS and unnecessary EXIF metadata from local public image derivatives and record the scan.
- [ ] Confirm publication consent before a real deployment.
- [ ] Mark every seeded post as sourced copy or clearly labelled draft content.
