# Full Practice certificate direction

Status: design and product contract for implementation
Date: 28 August 2026
Scope: Full Practice result email, certificate choice, and one-page certificate PDF

## Decision

Add a **certificate of practice completion**, not a language credential.

The existing Practice contract rejects certificates because a formal-looking artifact can overstate an uncalibrated English Club result. The new request changes that contract only within a narrow boundary:

- the certificate records that one Full Practice attempt was completed;
- the score is always labelled as an English Club practice estimate;
- the exact raw count, mode, completion date, and limitation remain visible;
- the authenticated full review remains the source of truth;
- the certificate cannot claim proficiency, prediction, accreditation, admission value, or official ETS status.

The recommended default is **Mendalo Record** (`mendalo-record`). It has the strongest fit with the current Conversation Relay identity, prints well on ordinary office printers, and uses batik influence as a small authored detail rather than an ornamental costume.

## What is evidence and what is direction

### Evidence from this repository

- Full Practice currently delivers 140 questions in three sections: 50 Listening, 40 Structure and Written Expression, and 50 Reading. The attempt manifest is fixed at start.
- A submitted result contains raw correct, possible, omitted, weighted practice points, section results, elapsed time, timing mode, listening mode, and an optional fixed-linear paper estimate.
- The current result disclaimer states that the 310–677 value is an English Club linear estimate and is not an official score, certificate, or admission evidence.
- `PRODUCT.md`, `DESIGN.md`, and `DESIGN-SYSTEM.md` require plain English, Bricolage Grotesque, Relay Cobalt, restrained Signal Orange, 320 px support, WCAG 2.2 AA, and factual institutional representation.
- The formation record identifies the organisation as **English Club UPT Perpustakaan Universitas Jambi**. The public short name remains **English Club**. See the [UPT Perpustakaan formation record](https://librarynew.unja.ac.id/english-club-upt-perpustakaan-resmi-di-bentuk/).
- The current English Club mark is a generated working asset. The UNJA emblem has a deliberately narrow provenance role on About and is not the English Club logo.

### External evidence

- UNESCO describes Indonesian batik as a wax-resist practice built through dots and lines, with diverse patterns and symbolic meanings. This supports using an original dot-and-line textile rhythm, but it does not justify copying or inventing the meaning of a named regional motif. See [UNESCO, Indonesian Batik](https://ich.unesco.org/en/RL/indonesian-batik-00170?RL=00170).
- Harvard administers the use of its names and insignias through a trademark programme and requires accurate, authorised representation. The user's "Harvard" cue therefore informs academic restraint only. No Harvard name, crimson system, shield, seal, Veritas mark, type treatment, or diploma layout may appear. See the [Harvard Trademark Program policies](https://trademark.harvard.edu/pages/policies-forms) and [Harvard use-of-name FAQ](https://trademark.harvard.edu/frequently-asked-questions-use-of-harvards-name).
- WCAG 2.2 sets a 4.5:1 minimum contrast for ordinary text and 3:1 for large text. It also prohibits colour as the sole carrier of meaning. See [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) and [W3C use-of-colour guidance](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color).
- W3C PDF techniques cover text alternatives, reading order, decorative artifacts, headings, link annotations, document language, and document title. See [W3C PDF techniques](https://www.w3.org/WAI/WCAG22/Techniques/#pdf).

### Design inference

"Harvard and formal" is interpreted as an academic archive object: exact hierarchy, controlled rules, ample white space, a strong recipient name, and a restrained record footer. Formality comes from composition and language, not borrowed prestige marks, a serif costume, parchment, gold gradients, or imitation seals.

The batik influence is an original vector system made from dots and short wax-like lines. It remains decorative and occupies no more than 12% of the sheet. It is not labelled as parang, kawung, Jambi batik, or another named motif unless a credited artist supplies and licenses that motif with its meaning.

## Experience contract

The result page adds one clear action after the result limitation and before answer review:

> **Send my result by email**
> Receive a result summary, completion certificate, and a private link to your full review.

The action opens one focused dialog or mobile sheet. It asks for:

1. email address;
2. name on certificate;
3. consent to send and process the email;
4. the certificate design, disclosed progressively rather than presented as three competing choices at first sight.

The design row starts collapsed:

> **Certificate design**
> Mendalo Record is ready. A formal cobalt layout with a quiet batik line.
> **Choose another design**

This is clearer than "Using default design, Change?" because it names the current choice, explains it, and gives the action an object.

Activating **Choose another design** opens a labelled radio group with three previews. The current design remains selected. A choice never sends the email by itself.

Dialog actions:

- primary: **Email my result**
- secondary: **Cancel**
- pending: **Preparing your email…**
- success title: **Your result is on its way.**
- success body: **We sent the summary and certificate to {maskedEmail}. Delivery can take a few minutes.**
- retryable failure: **The email could not be sent. Your result is safe here. Check the address and try again.**

The email field uses browser autocomplete `email`. The certificate-name field does not inherit a guessed name from the address. It accepts Unicode, trims surrounding whitespace, preserves case and diacritics, limits the visible name to 80 characters, and previews a two-line fallback before sending.

## Exact email copy

Subject:

> Your English Club Full Practice result

Preheader:

> Your completion record, practice result, and private review link.

Body:

> **Your practice record is ready.**
>
> {recipientName}, you completed English Club Full Practice on {completedDate}.
>
> **English Club practice estimate**
> {paperEstimate}
>
> {rawCorrect} of {rawPossible} correct · {omitted} omitted · {timeUsed} · {modeLabel}
>
> This estimate describes this attempt. It is not an official ETS score, proof of English proficiency, or admission evidence.
>
> Your {templateName} completion certificate is attached as a PDF.
>
> **Open full review**
>
> This private link shows your answers and explanations. Do not forward it if you do not want other people to see your responses.

Plain-text email must carry the same statement, result detail, limitation, certificate filename, full review URL, and privacy warning. The HTML email cannot be an image of the certificate.

If the result has no paper estimate, omit the estimate row and lead with `{rawCorrect} of {rawPossible} correct`. Never calculate a new score in the email renderer.

## Exact certificate copy

All three templates use the same content and reading order.

```text
English Club

Certificate of practice completion

This record confirms that

{recipientName}

completed English Club Full Practice
on {completedDate} in {modeLabel}.

English Club practice estimate
{paperEstimate}

{rawCorrect} of {rawPossible} correct · {omitted} omitted · {timeUsed}

This certificate records completion of one English Club practice form.
It is not an official ETS score, proof of English proficiency, or admission evidence.

Issued by English Club
English Club UPT Perpustakaan Universitas Jambi

Certificate ID {publicCertificateId}
Review: {shortReviewHost}
```

When no paper estimate exists, replace the estimate block with:

```text
Result on this form
{rawCorrect} of {rawPossible} correct
```

Mode labels are explicit and never shortened to colour or an icon:

- Standard timing
- Extended time
- Untimed practice
- Transcript-supported practice

If transcript support and a timing accommodation both apply, print both as ordinary text.

## Shared artifact specification

### Page and grid

- Format: A4 landscape, `297 × 210 mm`.
- PDF page box: one page, no visible crop marks.
- Preview reference only: `1123 × 794 px` at 96 ppi. Do not rasterise the final certificate to this size.
- Print reference: `3508 × 2480 px` at 300 ppi only for visual regression snapshots. The production PDF keeps type and pattern vectors.
- Safe area: 16 mm on every edge.
- Core text safe area: 22 mm on every edge.
- Optional commercial-print bleed: 3 mm, disabled by default because home and office printers are the main case.
- Long recipient names: maximum two lines, balanced without shrinking below 26 pt. If the name still does not fit, stop generation and ask the user to shorten it.

### Type hierarchy

Use embedded **Bricolage Grotesque** throughout. A separate prestige serif would break the existing identity and make the artifact look borrowed.

| Role                 |     Size | Weight | Leading | Notes                                                                       |
| -------------------- | -------: | -----: | ------: | --------------------------------------------------------------------------- |
| English Club issuer  |    11 pt |    680 |     1.1 | May include the current EC mark when the asset is approved for certificates |
| Certificate title    |    24 pt |    680 |    1.05 | Sentence case, no decorative italic                                         |
| Lead statement       |    11 pt |    430 |    1.35 | Plain English                                                               |
| Recipient name       | 36–42 pt |    680 |     1.0 | Maximum two lines, tracking no tighter than `-0.02em`                       |
| Completion line      |    13 pt |    520 |     1.3 | Format and date remain together when possible                               |
| Estimate             |    26 pt |    680 |     1.0 | Always paired with the label "English Club practice estimate"               |
| Result detail        |  10.5 pt |    520 |    1.35 | Uses tabular numerals                                                       |
| Limitation           |   9.5 pt |    520 |    1.35 | Never smaller or lower contrast than other metadata                         |
| Certificate metadata |   8.5 pt |    520 |     1.3 | ID and review host, not a secret URL                                        |

### Certificate colour tokens

These are fixed artifact tokens. They do not change with the visitor's light or dark theme.

| Token                | OKLCH                   | sRGB fallback | Use                                                          |
| -------------------- | ----------------------- | ------------- | ------------------------------------------------------------ |
| `certificate-sheet`  | `oklch(1 0 0)`          | `#ffffff`     | Main sheet                                                   |
| `certificate-chalk`  | `oklch(0.985 0.006 95)` | `#fbfaf6`     | Small quiet field only                                       |
| `certificate-ink`    | `oklch(0.18 0.025 265)` | `#0c111d`     | Primary text                                                 |
| `certificate-muted`  | `oklch(0.47 0.025 265)` | `#545b69`     | Secondary text; 6.82:1 on white                              |
| `certificate-line`   | `oklch(0.86 0.018 265)` | `#cbd1dd`     | Decorative rules only                                        |
| `certificate-cobalt` | `oklch(0.40 0.21 272)`  | `#2b29b5`     | Identity and selected record                                 |
| `certificate-wash`   | `oklch(0.94 0.035 272)` | `#e3eaff`     | Pattern field                                                |
| `certificate-signal` | `oklch(0.67 0.19 45)`   | `#ef6505`     | Small completion response only; never ordinary text on white |

Carbon on white is 18.86:1, Graphite on white is 6.82:1, and Cobalt Strong on white is 10.06:1 using the repository's `culori` WCAG calculation. Signal Orange is 3.21:1 on white, so it is limited to large marks or a field carrying Carbon text, which reaches 5.87:1.

### Batik influence

Build one reusable vector pattern primitive:

- an 8 mm square module;
- 0.7 mm dots and 0.55 mm short lines;
- a four-direction relay rhythm that visibly passes from dot to line;
- no raster texture, faux paper grain, gold foil, fabric photograph, or `repeating-linear-gradient`;
- no pattern beneath a recipient name, score, limitation, certificate ID, or link;
- decorative PDF tagging as `Artifact`;
- a one-colour fallback for grayscale printing.

The primitive is original to English Club. A named heritage motif needs a separate artist credit, licence, and cultural review.

## Template 1: Mendalo Record

Key: `mendalo-record`
Public name: **Mendalo Record**
Public description: **A formal cobalt record with a quiet batik line.**
Default: **Yes**

### Composition

- White sheet with a 16 mm top issuer zone and a 20 mm bottom record zone.
- EC mark and "English Club" align at top left. The certificate title aligns at top right instead of imitating a centred university diploma.
- Recipient block is centred vertically but left-aligned on a 10-column internal grid.
- One 12 mm batik dot-and-line band moves across the lower third and stops before the limitation copy. It is cobalt on Cobalt Wash at low visual density.
- The score sits to the right of the recipient block and uses a thin horizontal rule to connect the attempt statement to the result.
- Certificate ID and review host share the bottom record line.

### Why it is the default

- It preserves the site's asymmetric Conversation Relay composition.
- It looks formal without a fake seal, signature, or borrowed university shield.
- The mostly white sheet uses little ink and remains legible on grayscale printers.
- The batik treatment is visible at normal size but does not compete with the learner's name.

## Template 2: Cobalt Selvedge

Key: `cobalt-selvedge`
Public name: **Cobalt Selvedge**
Public description: **A bold academic layout with a woven cobalt record rail.**
Default: **No**

### Composition

- A 48 mm cobalt rail occupies the left edge; the rest stays white.
- The EC mark, issue date, and certificate ID sit in the rail with white text.
- The dot-and-line pattern runs vertically inside the rail at 18% opacity and is tagged decorative.
- The main statement, recipient name, and score align left in the remaining field.
- A 4 mm Signal Orange response point marks "completed"; the word **Completed** sits beside it so colour carries no meaning by itself.
- The limitation forms a full-width footer outside the cobalt rail.

### Character

This is the strongest brand expression of the three. It works well on screen and in colour print, but it consumes more ink. It should not be the default for that reason.

## Template 3: Titik Folio

Key: `titik-folio`
Public name: **Titik Folio**
Public description: **A quiet framed folio with batik-inspired corner notation.**
Default: **No**

### Composition

- Chalk sheet with a single 0.75 pt Carbon frame inset 12 mm. There is no faux parchment texture.
- The certificate title and recipient name use a centred axis; supporting content uses a left-aligned 8-column block below it.
- Original dot-and-line clusters occupy the upper-right and lower-left corners only. Each cluster stays outside the 22 mm text safe area.
- A Cobalt rule separates the completion statement from the score detail.
- One small orange square precedes the issuer line. It is a response cue, not a medal or embossed seal.
- The limitation is centred in a 120 mm measure near the bottom, above the certificate metadata.

### Character

Titik Folio is the most ceremonial option, but it stays inside the English Club palette and type system. The centred opening is balanced by a practical record block, which avoids turning the entire sheet into a diploma pastiche.

## Selection preview specification

Each design preview is a real mini-render of sample-neutral structure, not a stock certificate image. Use placeholders that cannot be mistaken for a real issued record:

- name: `Your name`
- estimate: `Not shown`
- date: `Completion date`
- certificate ID: `Issued after email`

The radio's accessible name combines the public name and description. A visible **Default** state appears on Mendalo Record as text, not colour alone. Preview images use empty alt text because the adjacent label describes the option. The selected option uses a checked radio, 2 px edge, and Check icon. Do not use hover-only selection.

On phone, previews stack in one column and remain at least 248 px wide. The dialog scrolls internally only when necessary; its confirmation actions remain in source order after the radio group. Every target is at least 44 px.

## PDF, print, and accessibility gates

### Authoritative formats

1. The authenticated web review is the authoritative result.
2. The email contains an accessible text summary and a private review link.
3. The PDF is a portable completion artifact.

The PDF does not become the only way to read the statement, score, or limitation.

### PDF requirements

- One-page PDF with embedded fonts and selectable text. Do not flatten the page to PNG or JPEG.
- Document title: `{recipientName} | English Club Full Practice completion record`.
- Document language: `en` by default, with passage language tags if Indonesian copy is added later.
- Logical reading order follows the exact certificate copy, regardless of visual template.
- EC mark receives the alternative text `English Club` when it carries issuer identity.
- Batik vectors, rules, and response shapes are tagged as decorative artifacts.
- The full review link uses a PDF Link annotation with the visible host as link text.
- Metadata must not contain the recipient's email, auth token, answer key, private R2 key, or full review token.
- Do not claim PDF/UA conformance until an automated validator and a manual screen-reader reading-order check pass.

### Print requirements

- Test on A4 landscape at 100% and "fit to page". No critical content may enter the common 8 mm non-printable printer edge.
- All rules are at least 0.6 pt. Decorative dots are at least 0.7 mm.
- A grayscale proof must keep issuer, name, score label, limitation, and ID distinct without relying on hue.
- Avoid full-sheet dark backgrounds, metallic simulation, transparency blends over text, and hairline ornament.
- The output remains readable when printed on ordinary white 80 gsm office paper. Premium paper may improve the object, but it is not required for credibility.

### Email and choice UI requirements

- HTML email and plain-text email contain equivalent result content.
- Template previews are decorative beside named radio labels.
- Focus moves into the design dialog, remains contained while modal, returns to **Choose another design**, and respects Escape.
- Status updates use a polite live region after an explicit send action.
- Reduced motion removes preview transitions. The selected design remains evident through radio state, edge, icon, and text.
- At 200% zoom and 320 px viewport width, labels wrap without horizontal scrolling and actions remain reachable.

## Integrity and privacy boundaries

### Certificate identity

- Generate a random, non-enumerable `publicCertificateId`. Do not expose the Convex attempt ID, owner token identifier, result ID, or email address.
- Bind the certificate to one immutable result revision. A corrected result issues a new certificate revision and marks the old public verification record as superseded.
- If the learner deletes the attempt, the private review stops resolving. Any separate public verification record must either be deleted with it or show only `withdrawn`, according to the privacy contract chosen before release.
- Do not add a QR code until a limited public verification route exists. A decorative QR code or a QR code containing a private review token is prohibited.
- A verification view, if added, may show recipient name only after explicit consent. Its minimum useful fields are issuer, completion date, Full Practice label, result-revision status, mode, and certificate ID. It must not expose answers or email.

### Issuer and marks

- Use the English Club wordmark and approved EC mark. The generated placeholder mark needs explicit production approval before it becomes a permanent issuer mark.
- The factual footer may use `English Club UPT Perpustakaan Universitas Jambi`.
- Do not place the UNJA emblem on the certificate without documented approval for this issuance purpose. The emblem would make the artifact appear university-certified.
- Do not add a staff signature, rector signature, mentor signature, embossed seal, accreditation mark, or partner logo unless a real approval and signing workflow exists.
- Do not use Harvard's name, crimson palette, shield, seal, Veritas mark, or signature system.

### Claims

Allowed:

- `Certificate of practice completion`
- `completed English Club Full Practice`
- `English Club practice estimate`
- exact raw counts, omitted count, elapsed time, and mode
- `This certificate records completion of one English Club practice form.`

Prohibited:

- `Certificate of English proficiency`
- `TOEFL certificate`, `TOEFL score`, or `predicted TOEFL score`
- `passed`, `qualified`, `certified`, `accredited`, or a CEFR level
- admission, scholarship, employment, placement, or institutional eligibility claims
- an unqualified 310–677 number without the English Club estimate label and visible limitation
- a fake signature, serial verification claim, or "secure certificate" label without a working verification system

### Full review link

- The review link is separate from the public certificate ID.
- It uses a high-entropy, server-validated capability or verified email session and opens only the completed learner-owned review.
- It never exposes answer keys in the email body, URL query values, analytics events, or certificate PDF metadata.
- The email states that forwarding the link may reveal the learner's responses.
- Rate limiting, resend idempotency, token expiry or revocation, and data retention must be explicit before production. The certificate design must not invent these policy values.

## Decision evaluation

Score: 1 is weak, 5 is strong.

| Direction       | Brand fit | Formal clarity | Print economy | Mobile preview | Cultural restraint | Production complexity | Result               |
| --------------- | --------: | -------------: | ------------: | -------------: | -----------------: | --------------------: | -------------------- |
| Mendalo Record  |         5 |              5 |             5 |              5 |                  5 |                     4 | **Default**          |
| Cobalt Selvedge |         5 |              4 |             2 |              4 |                  4 |                     4 | Strong colour option |
| Titik Folio     |         4 |              5 |             4 |              4 |                  5 |                     4 | Ceremonial option    |

Rejected directions:

- **Harvard replica.** It would borrow protected marks or a recognisable identity and misrepresent the issuer.
- **Ornate batik frame.** It would turn a living craft into generic decoration, increase print noise, and compete with the record.
- **Parchment and gold diploma.** It conflicts with the bright Relay identity and looks like borrowed prestige.
- **Dark certificate.** It consumes excessive ink and weakens office-print reliability.
- **Achievement badge certificate.** Badges, ribbons, crowns, laurels, and score rings imply a proficiency award the practice cannot support.
- **UNJA-emblem certificate by default.** It implies university certification without a documented issuance approval.

## Implementation handoff

Stable template keys:

```text
mendalo-record
cobalt-selvedge
titik-folio
```

Required render data:

```text
recipientName
completedAt
timingMode
listeningMode
rawCorrect
rawPossible
omitted
elapsedSeconds
paperEstimate | null
resultRevision
publicCertificateId
shortReviewHost
```

The server owns every result value. The client submits only the email address, certificate name, consent, and selected template key. The renderer rejects unknown template keys and missing result revisions. It must not accept a score, date, issuer, mode, limitation, or certificate ID from the browser.

Recommended filename:

```text
english-club-full-practice-{publicCertificateId}.pdf
```

Do not place the recipient name or email address in the filename.

## Screenshot QA matrix

Capture with fixed fictional QA values only. Never capture a real email address, private review URL, auth token, answer key, Convex ID, or R2 key.

### Result and certificate choice

- `1440 × 1000`, light: completed Full Practice result with the collapsed **Mendalo Record is ready** row.
- `1440 × 1000`, dark: opened design chooser with all three previews and Mendalo Record selected.
- Pixel 7, light: email fields, consent, collapsed default design, and primary action in one readable flow.
- Pixel 7, dark: opened design chooser, second template selected, confirmation action reachable.
- `320 × 800`, light: two-line certificate name, validation copy, all radio labels, and no horizontal overflow.
- `320 × 800`, reduced motion: selection changes immediately and the live status remains readable.

### Email

- `800 × 1200`: HTML email with statement, estimate, raw detail, limitation, attachment label, and full review action.
- `390 × 844`: the same email at phone width with no cropped result value or URL.
- Plain-text snapshot: subject, statement, result, limitation, certificate filename, review URL, and privacy warning in a logical sequence.

### Certificate artifacts

For each template, render a `3508 × 2480` visual-regression image from the production PDF and capture:

- normal sample name;
- 80-character, two-line name with diacritics;
- no-estimate raw-result fallback;
- extended-time plus transcript-supported modes;
- grayscale proof;
- text extraction and reading-order output alongside the image comparison.

Manual inspection checks the A4 safe area, line weight, pattern collisions, score label, limitation size, certificate ID, link annotation, text selection, embedded fonts, and metadata. A screenshot review does not replace PDF structure inspection.

## Acceptance checklist

- [ ] Only a completed Full Practice result can request this email.
- [ ] The result page states the limitation before the send action.
- [ ] Email, certificate name, consent, and template selection have visible labels.
- [ ] Mendalo Record is selected without forcing the learner to inspect all designs.
- [ ] **Choose another design** exposes three reusable radio options with real previews.
- [ ] Email HTML and plain text contain the same statement, result, limitation, and review destination.
- [ ] The PDF contains selectable text, embedded fonts, title, language, reading order, meaningful link annotation, and decorative artifact tags.
- [ ] No template contains Harvard or UNJA marks, a fake seal, fake signature, or unsupported credential language.
- [ ] Batik influence is an original dot-and-line vector primitive, not a copied or misnamed traditional motif.
- [ ] The limitation remains at least 9.5 pt and 4.5:1 contrast in every template.
- [ ] Long names, diacritics, two-line names, missing estimate, every timing mode, and transcript support render without collision.
- [ ] A4 colour, A4 grayscale, and office-printer proofs keep all critical content inside the safe area.
- [ ] Choice UI passes keyboard, touch, focus-return, 200% zoom, 320 px, reduced-motion, and Axe checks.
- [ ] The PDF passes text extraction, metadata inspection, link inspection, visual regression, and manual reading-order review.
- [ ] No screenshot, email log, PDF metadata, or analytics payload contains credentials, auth tokens, private review tokens, answer keys, or private R2 paths.
- [ ] A resend is idempotent and cannot create duplicate result revisions or unbounded email volume.
