# Member Page Creative Research

Status: research complete
Access date: 25 August 2026
Scope: public member directory, role hierarchy, interaction, motion, mobile behavior, accessibility, and member privacy

## 1. Research question

How can the English Club show five responsibility levels and a future public roster without turning the page into a corporate org chart, inventing people, or making animation compete with reading?

This research uses current official websites and standards only. Local screenshots and repository evidence remain covered by `docs/REFERENCE-AUDIT.md`, `docs/REDESIGN-REFERENCE-AUDIT.md`, `docs/EVIDENCE.md`, and `docs/ASSET-AUDIT.md`.

## 2. Design read

Reading this as: an editorial extension of a public English Club profile for students and collaborators, with an open and energetic voice, a bright default theme, and user-controlled motion that explains how responsibility moves through the club.

| Dial | Target | Research consequence |
| --- | ---: | --- |
| Design variance | 8 / 10 | Use an asymmetric role field and editorial roster, not an equal-card matrix |
| Motion intensity | 6 / 10 | Make selection and detail changes tactile; keep content static until the visitor acts |
| Visual density | 4 / 10 | Show the five-role system in full, then reveal only the selected roster detail |

The existing creative north star still applies: **The Conversation Relay**. On the member page, the relay moves from participation to coordination and stewardship. Role level describes responsibility scope. It must not imply that one person has more human value than another.

## 3. Source ledger

### 3.1 Direct observations from official people pages

#### Snøhetta People

Source: [Snøhetta People](https://www.snohetta.com/people)

**Observation**

- The page provides Grid and List modes, text search, location filters, discipline filters, an explicit `Filter people` action, and `Load more people`.
- Each visible record can expose a portrait, name, title, location, email address, and telephone number.
- The opening sentence states the directory purpose before the controls.

**Inference for English Club**

- Search, view switching, and multiple filter axes are justified for a directory with hundreds of records. They would be premature for an unverified club roster.
- A single role axis is enough for the first club implementation.
- Public email and phone fields solve Snøhetta's business-contact purpose. They do not belong in the English Club public model by default.

**Boundary**

- Do not copy the volume of controls or contact-data exposure.

#### IDEO Leaders

Source: [IDEO Leaders](https://www.ideo.com/leaders)

**Observation**

- The page offers two filters: industry expertise and capability.
- Each person entry combines name, role, location where present, a short first-person scope statement, and relevant expertise labels.
- The rendered page includes a visible `No items found` state for combinations with no result.

**Inference for English Club**

- A short scope statement is more useful than a decorative biography because it tells visitors what a role is responsible for.
- Any filtered roster needs an authored zero-result state. Hiding the whole region would look broken.
- Expertise tags make sense for a multi-disciplinary consultancy. The English Club should use only verified division or position data.

**Boundary**

- Do not add interests, skills, expertise, or biography fields merely to fill a profile.

#### AREA 17 Culture

Source: [AREA 17 Culture](https://area17.com/culture)

**Observation**

- Culture and operating principles appear before the people directory.
- People are grouped under named areas such as Leadership, Strategy, Partnerships, Design, Engineering, Production, and Operations.
- Each group is a labelled semantic list. Each visible person has a name link, role, portrait, and dedicated profile route.
- The live page exposes a skip link, a labelled primary navigation, and Pause buttons for moving media figures.

**Inference for English Club**

- Explain the role system before listing people. The visitor should understand `Coordinator` even when no coordinator profile is published.
- Use section and list semantics as the real structure. Layout can be expressive without weakening the document outline.
- Any moving media needs an explicit pause path. The English Club member page can avoid this requirement by keeping all decorative motion short and non-looping.

**Boundary**

- A large portrait wall would overstate a roster that has not been supplied or consent-cleared.

#### Locomotive Agency

Source: [Locomotive Agency](https://locomotive.ca/en/agency)

**Observation**

- The roster is grouped into Design, Development, and Operations.
- Each group states a people count. Each row gives a name, role, year, and `Read more` button.
- Long individual information is deferred behind an explicit action instead of filling the roster view.

**Inference for English Club**

- Detail-on-demand can keep the roster scannable when verified member stories exist.
- Group counts and join years should be omitted until the club supplies and maintains them.
- The disclosure action should work with keyboard and touch. Hover can add feedback, never exclusive content.

**Boundary**

- Do not invent tenure, member counts, or expandable biographies.

#### Pentagram About

Source: [Pentagram About](https://www.pentagram.com/about)

**Observation**

- The roster uses explicit groups: Partners, Partner at Large, Associates, and Partners Emeriti.
- Detail is not identical across every group. Partners include location, while the long associate and emeriti sections can remain name lists.
- The page gives hierarchy through headings and sequence instead of an org-chart diagram.

**Inference for English Club**

- Responsibility levels can share one visual system while exposing only fields that are verified and appropriate for each role.
- An editorial list is a valid public representation. A missing portrait does not need a fake avatar.

**Boundary**

- The English Club has five user-specified levels. Do not borrow Pentagram's titles or prestige framing.

#### Instrument About

Source: [Instrument About](https://www.instrument.com/about/)

**Observation**

- The page publishes four leadership portraits and roles rather than an exhaustive employee directory.
- The leadership section is followed by `Who we are`, `How we work`, and a culture programme.
- The people content supports the organisation story instead of becoming the whole page.

**Inference for English Club**

- Publishing a bounded, consented subset is more credible than filling every role with a placeholder person.
- The member route still needs useful role content when the public roster is empty.

**Boundary**

- The user requested a club member page, so leadership-only publication must remain a data-state outcome, not a hidden product decision.

### 3.2 Standards and privacy evidence

#### Interaction motion

Source: [W3C Understanding SC 2.3.3, Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

**Observation**

- W3C states that non-essential animation triggered by interaction can be disabled and recommends support for the user's reduced-motion preference.
- It identifies parallax and extra movement tied to scrolling as potential sources of vestibular discomfort.

**Inference for English Club**

- Role selection may crossfade and translate a short distance because it communicates a state change.
- Scroll position must not decide which role or portrait is active. The visitor's explicit selection remains the authority.
- Reduced-motion mode should replace travel with an immediate state change or a near-instant opacity change.

#### Exclusive role choice

Source: [W3C ARIA Authoring Practices, Radio Group Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)

**Observation**

- A radio group represents a set where no more than one option is checked.
- The documented interaction uses Tab to enter or leave the group, Space to select, and arrow keys to move between options.

**Inference for English Club**

- If one role filter is active at a time, an `All roles` option plus the five role levels should use native radio behavior or a complete radio-group implementation.
- The visual design may resemble a relay rail, but the accessible behavior must remain familiar.

#### Result changes

Source: [W3C example, role=status for search results](https://www.w3.org/WAI/WCAG22/working-examples/aria-role-status-searchresults/)

**Observation**

- W3C demonstrates a `role="status"` message for announcing a changed result count after a search action.

**Inference for English Club**

- After role selection, announce a concise result message such as `3 published profiles in Coordinator` without moving focus away from the role control.
- Do not announce decorative copy or every animation frame.

#### Personal data boundary

Source: [Indonesia Law No. 27 of 2022 on Personal Data Protection, official BPK PDF](https://peraturan.bpk.go.id/Home/Download/224884/UU%20Nomor%2027%20Tahun%202022.pdf)

**Observation**

- The official record treats full name as general personal data.
- The explanation of Article 27 describes collection as limited and specific to its stated purpose, legally valid, and transparent. It also calls for clear information about what is processed and how.

**Inference for English Club**

- Public display needs an explicit publication purpose and a clear consent record. Internal membership does not automatically authorize a public profile.
- Name, role, division or position, bio, portrait, and external link should be separately optional where practical.
- The product recommendation is a privacy-oriented design baseline, not legal advice. The club should obtain local legal or institutional review before public launch.

## 4. Local evidence boundary

The repository currently supports the five role definitions supplied by the user. It does not provide a verified public roster, member names, role assignments, biographies, portrait consent, or member contact details.

The member page may state this role taxonomy:

| Level | Public label | Verified subgroup or position vocabulary |
| ---: | --- | --- |
| 0 | Member | No subgroup supplied |
| 1 | Pioneer | Member pengurus club |
| 2 | Coordinator | Academic; Art; Media, Information, and Communication (MIC); Public Relation; Human Resource Development |
| 3 | Core Member | Secretary; Treasury; Vice President; President |
| 4 | Board / Board of Directors | Pembina / Mentor; Kepala UPA |

`UPA` must remain unexpanded because the repository and user request do not define the abbreviation.

## 5. Bounded creative synthesis

### 5.1 Core concept: The Member Relay

The page should present the club as a shared room with different responsibility ranges. Five role channels form one connected field. Selecting a channel moves the visual handoff and recomposes the explanation and published roster below it.

This is a responsibility map, not a pyramid.

### 5.2 Page sequence

1. **Opening statement**
   - One short headline about people carrying conversations forward.
   - One short explanation of shared responsibility.
   - An abstract or documentary visual may support the stage, but it must not pretend to be a member portrait.

2. **Role field**
   - Show all five role levels at once.
   - Each control includes a Heroicon, public label, and one plain-language responsibility sentence.
   - The selected channel controls one companion field with verified subgroups or positions.
   - The numeric level is real data and may be shown. It cannot become decorative section numbering.

3. **Published roster**
   - Default to `All roles` when published profiles exist.
   - Use editorial rows or an asymmetric roster, not three equal portrait cards.
   - Show name, public role, and verified division or position.
   - Add a short bio or profile detail only when supplied and consented.

4. **Honest empty state**
   - If no profiles are published, keep the complete role field visible.
   - State that public member profiles are being prepared and require permission.
   - Do not generate names, faces, member counts, quotes, or achievements.

5. **Participation handoff**
   - End with one existing Join intent link.
   - Do not create a second contact action with the same intent.

### 5.3 Hierarchy without org-chart clichés

- Use five equal-height responsibility bands rather than a pyramid.
- Vary alignment, text measure, and the selected band's visual reach. Do not enlarge Board portraits or shrink Member content.
- Describe what each role does. Avoid prestige adjectives.
- Keep every role reachable in one interaction and one keyboard group.
- Coordinator divisions and Core or Board positions appear as secondary text, not nested mini-cards.

### 5.4 Motion choreography

Motion has four jobs:

| Moment | Communication | Budget | Reduced-motion result |
| --- | --- | ---: | --- |
| Role control press | Confirms selection | 140-180 ms | Immediate selected state |
| Active channel handoff | Shows which responsibility range is in focus | 260-360 ms | No travel; indicator appears in place |
| Companion copy replacement | Explains changed content | 260-360 ms | Near-instant opacity change |
| Roster entry sequence | Makes the new result set readable | Up to 240 ms total stagger | All results appear together |
| Profile disclosure | Connects a person row to its detail | Up to 360 ms | Detail opens immediately |

Implementation direction:

- Animate transform and opacity only.
- Keep movement under roughly 12 px for content replacement.
- Never auto-cycle roles, portraits, or bios.
- Never bind the active role to scroll position.
- Do not use parallax, custom cursors, pointer trails, or full-page scroll hijacking.
- Hover and focus may reveal the same supporting response. Touch must receive the same content through activation.

### 5.5 Mobile behavior

- At 320 px, keep the five role choices in a single vertical group or a composition where every label remains visible without horizontal drag.
- Place the active explanation directly after the control group so selection and response stay adjacent in reading order.
- Do not require a Grid/List switch on the first roster version.
- Portraits, when consented, should reserve aspect-ratio space to prevent layout shift.
- Details open inline or in an accessible disclosure. Avoid a hover-only side preview.
- Touch targets remain at least 44 by 44 px.

### 5.6 Public member data contract

Publish only the fields required for this page:

- name;
- role level and public role label;
- verified coordinator division or core or board position, when applicable;
- optional short bio;
- optional consent-cleared portrait derivative;
- explicit publication status and sort order.

Keep these out of the public response by default:

- email address;
- telephone number;
- student number;
- private social account;
- birth date;
- home address;
- internal attendance or performance data;
- raw portrait file or camera metadata;
- consent notes and administrative audit fields.

Portrait consent and profile-text consent should not be treated as the same switch. A member may approve their name and role without approving a portrait.

## 6. Anti-slop rejection list

- No hierarchy pyramid, orbit of floating faces, or corporate org-chart lines.
- No generated portraits presented as club members.
- No fake names, role assignments, tenure, member counts, quotes, or achievements.
- No three equal profile cards as the page's main composition.
- No oversized role number used as empty decoration.
- No animated gradient mesh, neon glow, glass cards, or decorative status dots.
- No autoplay carousel, random portrait swap, or scroll-dependent active member.
- No `Meet the amazing minds behind...` copy or prestige-heavy role language.
- No email and phone exposure merely because other directories publish them.
- No filter dimensions without maintained source data.
- No motion that hides content before hydration or under reduced motion.

## 7. Testable acceptance criteria

- All five user-supplied role levels and every supplied coordinator, core, and board subtype are visible in server-rendered HTML.
- No unverified member name, portrait, count, biography, contact detail, or role assignment appears.
- One exclusive role selector works with pointer, touch, Tab, Space, and arrow keys.
- Selection changes a visible label, icon treatment, explanation, and roster result without moving keyboard focus.
- A status message reports the new published result count.
- An empty roster still leaves the role taxonomy and Join path useful.
- The page has no required hover state and no drag-only control.
- Reduced motion removes travel and stagger while preserving selected and expanded states.
- Light and dark themes keep the same role hierarchy and selected-state contrast.
- No horizontal overflow occurs at 320 px.
- Portrait rendering is conditional on a consent-cleared public derivative.
- Withdrawal from public display can hide the profile without deleting the internal role taxonomy.

## 8. Decision summary

Adopt a **Member Relay** composed of five responsibility channels and a separate published roster. Keep the taxonomy useful without member data. Add one exclusive role filter when profiles exist. Use short, deterministic selection motion. Publish only consented fields and omit personal contact details.

The strongest source patterns are:

- AREA 17 for semantic grouping and culture before roster;
- Locomotive for detail-on-demand;
- IDEO for authored filter and zero-result behavior;
- Snøhetta for understanding when advanced directory controls become justified;
- Pentagram for hierarchy through editorial grouping;
- Instrument for publishing a bounded subset without pretending the directory is complete.

The page should feel active because responsibility changes the composition. It should not need a moving wall of faces to feel alive.
