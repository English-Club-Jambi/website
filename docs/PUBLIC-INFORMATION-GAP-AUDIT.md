# Public information gap audit

Status: current implementation review; organisation-wide trust remediation implemented 28 August 2026

Date: 27 August 2026

Scope: public routes, public content manifest, footer, structured data, organisation records, and visitor action paths

## Remediation update — 28 August 2026

The three organisation-wide gaps named in the initial audit are now addressed in the application:

| Gap | Implemented public contract | Operational enforcement |
| --- | --- | --- |
| Official identity and institutional relationship | `/about` publishes the name `English Club UPT Perpustakaan Universitas Jambi`, formation date, a UNJA identity mark, and direct source links. `English Club` remains the clearly explained short public name. | Organization structured data points to the official club and formation records without presenting the UNJA emblem as the club's own logo. |
| Privacy, retention, and contact operations | `/privacy` explains the operator, purposes, member consent boundary, Practice records, service providers, maps, media, correction route, and record-specific retention. `/contact` publishes a five-working-day review target and the 180-day limit. | Convex removes contact submissions after 180 days in bounded scheduled batches. Authorized administrators can permanently erase a verified contact record earlier; the audit event contains no name, email, or message. |
| Verified communication channels | The Contact page identifies the club form as English Club's working channel and separately lists email, telephone, Instagram, and X details published by Perpustakaan Universitas Jambi. Each group explains what it is for and links back to the institutional source. | The separation prevents a library account from being misrepresented as an English Club-owned channel. Privacy requests use the club form and a defined verification instruction. |

Primary evidence:

- [UNJA identity page](https://www.unja.ac.id/identitas/)
- [English Club formation record](https://librarynew.unja.ac.id/english-club-upt-perpustakaan-resmi-di-bentuk/)
- [Perpustakaan Universitas Jambi contact record](https://librarynew.unja.ac.id/struktur-organisasi/)
- [UNJA English Club sharing-session record](https://www.unja.ac.id/upt-perpustakaan-unja-gelar-kegiatan-sharing-session-hadirkan-3-mahasiswa-university-of-leeds/)

## Evidence boundary

This audit separates confirmed facts from information the site still needs.

- The secretariat location was supplied by the club operator as Perpustakaan Universitas Jambi, Mendalo campus.
- The supplied short Google Maps link resolves to Library of Jambi University at approximately `-1.6140602, 103.5174476`.
- The supplied street address and Plus Code are reproduced without inferring a room number, opening time, or visitor policy.
- Every public route below returned HTTP 200 from the current application on port 3987. Each route had one visible `h1`, a canonical URL, a browser title, and a meta description.
- Content inventory was read from the current manifest and source, not inferred from screenshots.

## Current route coverage

| Route | What is already clear | Information still missing or incomplete | Priority |
| --- | --- | --- | --- |
| `/` | Purpose, conversational interaction, activity themes, journal handoff, join action | A current next-session pointer or a verified announcement channel | P1 |
| `/about` | Purpose, working principles, evidence boundary, full secretariat address, Plus Code, directions | Visiting hours, exact room or desk, accessibility route, and whether visitors should arrange a meeting first | P1 |
| `/activities` | Four ways of working and an explicit warning that themes are not a timetable | Current dates, capacity, facilitator, venue, and registration status for the next available activity | P1 |
| `/programs` | Sourced completed records and clearly labelled ongoing or planned programme lines | Current schedule and registration state for active programmes; accountable programme contact | P1 |
| `/members` | Role taxonomy, managed divisions, filters, consent model | Consent-cleared production roster, current governance term, and confirmed office holders | P0 before presenting the directory as a live roster |
| `/journal` and `/journal/{slug}` | Permanent article addresses, category, date, excerpt, structured article content, pagination | Verified author profiles or editorial contact; topic discovery only when archive scale makes it useful | P2 |
| `/practice` | Scope, timing, result limits, privacy notes, original-question boundary, and a site-wide privacy explanation | An approved automatic maximum lifetime for saved attempts; participants can already delete their own attempt records | P1 before long-term production collection |
| `/contact` | Three unambiguous intents, private queue behavior, consent, five-working-day review target, 180-day maximum retention, early deletion route, and separately labelled institutional channels | A club-owned public email or social channel can be added later only after ownership and monitoring are verified | P2 |
| `/privacy` | Responsible operator, record purposes, contact retention, member publication boundary, Practice deletion, providers, map/media requests, and correction/deletion route | Assessment auto-retention remains an explicit policy decision; current user-initiated deletion is documented | P1 |

## Organisation-wide gaps

### 1. Official identity and institutional relationship — resolved

The About page now follows the published formation record exactly: `English Club UPT Perpustakaan Universitas Jambi`, formed on 16 May 2024. The UI explains that `English Club` is the site's short public name. The UNJA emblem is tied to the institution record and official identity source, not substituted for the English Club mark. The page does not invent a broader legal or partnership claim.

### 2. Secretariat visit information

The location is now clear, but a visitor still cannot tell when or how to arrive. Confirm:

- floor, room, desk, or nearby landmark inside the library;
- staffed or visitable hours;
- whether an appointment is required;
- step-free entrance, lift, or other accessibility notes;
- temporary closure or campus-access procedure.

Until those facts exist, the page should offer directions without promising that someone will be present.

### 3. Membership terms

The join form works, but it does not answer several practical questions:

- who is eligible;
- whether membership has a fee;
- expected participation or term length;
- what happens after a join submission;
- where the next orientation or open session is announced.

These are higher-value than adding promotional claims or another homepage section.

### 4. Current programme availability

The site correctly distinguishes themes, documented records, programme lines, and open directions. It still needs a reviewed source of current availability. Each scheduled item should contain:

- date and Jambi time;
- venue or online link;
- audience and capacity;
- facilitator or accountable contact;
- registration status and closing time;
- cancellation or update channel.

If there is no current session, say so directly and name the verified announcement channel instead of publishing an evergreen timetable.

### 5. Privacy, retention, and contact operations — contact lifecycle resolved

The new Privacy page supplies the responsible operator, purposes, service providers, correction route, and record-specific behavior. Contact submissions now have an enforced 180-day ceiling plus verified early deletion. Member profiles retain their existing consent and publication gates. Practice attempts remain participant-owned and deletable; an automatic maximum age for them remains a separate production policy decision and is not falsely claimed.

### 6. Verified communication channels — resolved with a clear boundary

The English Club contact form is now named as the club's working route. Email, telephone, Instagram, and X details published by Perpustakaan Universitas Jambi appear in a separate institutional block with a verification link. The site does not claim those accounts are owned by English Club.

## Technical content findings

- Current manifest field counts remain inside the 200-entry per-page Convex limit: global 28, home 78, practice 173, about 52, activities 33, programs 24, members 44, journal 19, privacy 32, and contact 42.
- About location content is editable through the existing Page Copy workflow. Coordinates, the OpenStreetMap embed, and the confirmed Google Maps destination remain code-owned to prevent arbitrary map or tracking URLs.
- The About page emits `AboutPage`, `Organization`, `Place`, `GeoCoordinates`, and `PostalAddress` structured data. The visible address remains present without JavaScript.
- The interactive map loads from OpenStreetMap when the section nears the viewport. The production privacy notice should name this third-party map request; the visible address and Google Maps action remain usable if the embed fails.
- The footer now links to the institutional record and Privacy page without crowding the primary navigation.
- Search Console and Bing Webmaster Tools still require operator verification, sitemap submission, and deployment of the latest search changes. Code alone cannot prove indexing.
- If the journal grows beyond the current small archive, review the sitemap query cap and introduce topic discovery before adding decorative search controls.

## Recommended information collection order

1. Confirm the secretariat's room or floor, visiting hours, appointment rule, and accessible route.
2. Confirm membership eligibility, fee status, participation expectations, and post-submission process.
3. Approve a maximum retention age for saved Practice attempts if production collection continues long term.
4. Supply the next reviewed programme or activity date and the announcement channel.
5. Replace development member records with consent-cleared production profiles and a governance term.
6. Add a club-owned public email or social account only after ownership and monitoring are clear.

## Do not fill these gaps by inference

- Do not infer opening hours from the library's general hours.
- Do not infer a room or floor from an event venue.
- Do not call membership free because no price is shown.
- Do not convert programme directions into scheduled recurring events.
- Do not publish fictional development profiles as the current committee.
- Do not infer a broader university relationship than the current formation record and official club page support.
- Do not promise a reply time until the responsible team can meet it.
