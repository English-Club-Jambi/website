# Public information gap audit

Status: current implementation review

Date: 27 August 2026

Scope: public routes, public content manifest, footer, structured data, organisation records, and visitor action paths

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
| `/practice` | Scope, timing, result limits, privacy notes, and original-question boundary | A site-wide privacy and retention policy linked from the assessment entry and result surfaces | P0 before collecting production attempt data |
| `/contact` | Three unambiguous intents, private queue behavior, consent, message guidance | Expected response window, responsible contact channel, retention period, deletion request path, and an alternative verified contact method | P0 |

## Organisation-wide gaps

### 1. Official identity and institutional relationship

The public name is currently `English Club`, while source records also use `English Club Universitas Jambi` and refer to UPT or UPA Library. The exact official name and relationship to the university library are not yet stated as a confirmed organisation fact. Confirm:

- official public name;
- responsible university unit;
- whether UPA, UPT, or another current term is correct;
- approved organisation description for partners and search engines.

Do not turn a sourced event record into a legal or institutional relationship claim.

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

### 5. Privacy, retention, and contact operations

The Contact form and Assessment Lab explain local consent at the point of action, but there is no public policy covering the full data lifecycle. Before production collection, publish:

- data controller or responsible unit;
- purpose and legal or organisational basis for each data type;
- retention periods for enquiries, member profiles, media consent, and assessment attempts;
- correction and deletion request route;
- whether service providers or storage regions receive the data;
- a realistic response range for enquiries.

### 6. Verified communication channels

The footer has navigation and intent links but no verified public email, phone, WhatsApp, or social account. Add only accounts the club controls and can keep current. One dependable contact channel is more useful than a row of inactive social icons.

## Technical content findings

- Current manifest field counts remain inside the 200-entry per-page Convex limit: global 26, home 78, practice 173, about 39, activities 33, programs 24, members 44, journal 19, and contact 29.
- About location content is editable through the existing Page Copy workflow. Coordinates and the confirmed Maps destination remain code-owned to prevent arbitrary tracking or malformed map URLs.
- The About page emits `AboutPage`, `Organization`, `Place`, `GeoCoordinates`, and `PostalAddress` structured data. The visible address remains present without JavaScript.
- The footer is a useful future home for a short secretariat link and privacy link, but those additions should follow confirmed visit and policy content.
- Search Console and Bing Webmaster Tools still require operator verification, sitemap submission, and deployment of the latest search changes. Code alone cannot prove indexing.
- If the journal grows beyond the current small archive, review the sitemap query cap and introduce topic discovery before adding decorative search controls.

## Recommended information collection order

1. Confirm the official organisation name and responsible university unit.
2. Approve the privacy, retention, correction, and deletion policy.
3. Confirm the secretariat's room or floor, visiting hours, appointment rule, and accessible route.
4. Confirm membership eligibility, fee status, participation expectations, and post-submission process.
5. Supply the next reviewed programme or activity date and the announcement channel.
6. Replace development member records with consent-cleared production profiles and a governance term.
7. Confirm one monitored email or messaging channel and a realistic response range.
8. Add verified social accounts only after ownership and maintenance are clear.

## Do not fill these gaps by inference

- Do not infer opening hours from the library's general hours.
- Do not infer a room or floor from an event venue.
- Do not call membership free because no price is shown.
- Do not convert programme directions into scheduled recurring events.
- Do not publish fictional development profiles as the current committee.
- Do not infer an official university affiliation, legal name, or contact channel from a logo or an old event page.
- Do not promise a reply time until the responsible team can meet it.
