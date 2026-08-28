# Full Practice result email and certificate UX

Status: implemented interaction contract; production provider smoke test pending
Scope: owned, submitted Full Practice results only
Companion artifact direction: `docs/FULL-PRACTICE-CERTIFICATE-DIRECTION.md`

## 1. Product boundary

The email control is a result utility, not a mailing-list form. A learner asks English Club to prepare one message containing the result statement, score detail, PDF practice record, and private answer-review link.

The PDF records that one English Club Full Practice form was completed. It does not prove identity, English proficiency, admission readiness, passing status, accreditation, an official ETS result, or a predicted TOEFL score.

Quick Practice has no result-email or certificate action.

## 2. Placement on the result page

Place the delivery section after the result limitation and before the per-section review. This order keeps the score boundary visible before the learner meets an action that can create a formal-looking document.

The section has four states:

1. Inline form
2. Preparing
3. Provider accepted
4. Delivery status unclear or definite failure

The result remains readable in every state. Delivery errors never replace the score or answer review.

## 3. Inline form

### Heading

```text
Keep a copy of this result.
```

Support:

```text
Email the score, section notes, a completion certificate, and a private link to the full review.
```

### Fields

The normal path asks for:

- `Name on certificate`
- `Email address`
- one certificate design, with Mendalo Record selected by default
- explicit consent
- completed Cloudflare Turnstile verification

Name help text states that English Club does not verify identity for this record. Email help text says the address is used only for this delivery.

The browser normalizes the name with NFKC, trims it, collapses repeated spaces, and accepts 2 through 80 Unicode characters with no control characters. The server repeats the bounds and the PDF renderer may reject unsupported glyphs or a name that cannot fit the document.

The email field uses:

```html
type="email" inputmode="email" autocomplete="email" spellcheck="false"
```

Do not prefill an address from another product record. Anonymous Practice ownership does not supply a trusted learner email.

### Consent

```text
I agree that English Club may use this name and email address to prepare and send this practice record.
```

Consent is required, recorded as contract version `1`, and followed by a normal `/privacy` link. The retention note says that English Club does not store the plain name or address in its delivery log, that the private grant expires after 30 days, and that Brevo applies its own provider retention.

### Human verification

The form loads Cloudflare Turnstile in explicit mode with the action `full-practice-result-email`, automatic theme, and flexible width. Keep a visible `Human verification` label above the widget.

The primary action stays disabled until the widget supplies a token. If the site key is missing, show:

```text
Email delivery is not configured for this site yet.
```

Before Cloudflare is called, Convex confirms the owned submitted Full Practice attempt and admits at most six Siteverify calls per owner and 500 across the service in ten minutes. It stores a bounded verification event for 24 hours. The action then verifies the token with Cloudflare and requires the exact action and public hostname. The browser result alone is not enough.

### Primary action

```text
Email my result
```

One tap creates one client request ID. While the request runs:

- disable fields, design controls, consent, and submit;
- change the button label to `Preparing email`;
- announce `Preparing your certificate and email.` through a polite live region; and
- keep the score page in place.

The component resets the Turnstile token after each completed or failed attempt.

## 4. Progressive certificate choice

The fast path shows one compact row:

```text
Certificate design
Mendalo Record is ready.
A formal cobalt layout with a quiet batik line.
Choose another design
```

Do not show three full previews before the learner asks. The result page already has dense score and review material.

`Choose another design` opens a native dialog with a focus-contained radio group and a large preview. Choices:

| Key               | Display name    | Direction                                             |
| ----------------- | --------------- | ----------------------------------------------------- |
| `mendalo-record`  | Mendalo Record  | Formal cobalt record with a quiet batik line; default |
| `cobalt-selvedge` | Cobalt Selvedge | Academic layout with a woven cobalt rail              |
| `titik-folio`     | Titik Folio     | Framed folio with batik-inspired corner notation      |

`Keep current design` closes without changing the selected template. `Use this design` applies the radio choice. Selecting or previewing a design never sends a message.

The dialog:

- uses Heroicons, not text symbols;
- restores focus to the trigger on close;
- closes on Escape and backdrop click;
- keeps keyboard focus inside while open;
- uses a 44px minimum target; and
- removes nonessential motion when `prefers-reduced-motion: reduce` is active.

## 5. PDF wording

The document names itself as a practice-completion record. It must include:

```text
Practice record prepared for
Name supplied by participant; identity not verified.
```

The longer limitation states that the certificate records completion of one English Club practice form and is not an official ETS score, proof of proficiency, or admission evidence.

Allowed facts come from the pinned result:

- participant-entered certificate name;
- completion date in Asia/Jakarta;
- timing and listening modes;
- raw correct, possible, and omitted counts;
- elapsed time;
- the English Club paper estimate only when the stored result uses that model;
- per-section values;
- result revision;
- selected allowlisted template; and
- random public certificate ID.

Do not add an invented signature, fake seal, pass language, rank, verified-identity claim, QR code, or UNJA emblem without documented approval for learner-document use.

The PDF must not contain the private review URL. It also excludes the recipient email, attempt/result ID, Auth identity, private media key, and URL annotations. The certificate input type has no `reviewUrl` field.

## 6. Email content

Subject:

```text
Your English Club Full Practice result
```

Preheader:

```text
Your completion record, practice result, and private review link.
```

The HTML version uses a plain, email-safe table layout and system fonts. The text version contains the same result facts and limitation.

Content order:

1. Practice record ready statement
2. Learner-entered name and completion date
3. Result label, main result, raw detail, elapsed time, and modes
4. Per-section rows
5. Practice-result limitation
6. Attached certificate name and identity limitation
7. `Open full review` link
8. Private-link warning and English Club issuer line

The one primary link stays in the email, not the PDF. It contains a 256-bit access token after `/practice/review#access=`.

The message has no remote hero image, social strip, marketing prompt, or second call to action. The Brevo recipient object sets `contactPixelTrackingConsent: false`.

That field does not configure the Brevo account. Brevo says it is ignored until per-contact pixel-tracking consent is enabled. Production must prove one provider-side path: anonymous tracking is active for Transactional Emails, or per-contact consent is active for transactional API sends and the payload's `false` value prevents identifiable open/click tracking. Source code cannot make or verify this dashboard choice.

The private access fragment sits inside the email body. Brevo says logs and previews are retained indefinitely by default, so production must set an approved log-retention rule and select `Never store previews` before sending. Preview changes affect only later messages; delete any private preview created during an earlier test.

## 7. Reply behavior

The address the learner types goes in Brevo's `to` field. It is where the result arrives.

Optional `BREVO_REPLY_TO_EMAIL` goes in `replyTo`. It tells an email client where to send a reply from the learner. Use a monitored English Club mailbox. When it is absent, omit `replyTo` so replies follow the verified sender. Never use the learner's own address for `From` or `Reply-To`.

## 8. Accepted state

Brevo acceptance is a queue/API result, not inbox proof. Use:

```text
Your email is on its way.
Brevo accepted the message for {maskedEmail}. It may take a few minutes to arrive.
The private review link expires on {expiryDate}.
```

Actions:

- `Open review here` jumps to the same-device review on the result page;
- `Send another copy` clears the email and consent before returning to the form; and
- `Revoke private review link` invalidates every active emailed grant and review session for this attempt.

Mask the displayed address. Do not place the full address in a status message, screenshot, analytics payload, or console call.

Revocation changes the link state, not the delivered email or downloaded PDF. If revocation fails, leave the button available and say that the link remains active until another attempt succeeds or it expires.

## 9. Uncertain state

A timeout or ambiguous provider response may mean Brevo accepted the exact message even though the server did not receive a usable confirmation. Automatic retry risks a duplicate.

Show a separate persistent state:

```text
Delivery status is unclear.
Brevo may already have accepted this message. We will not resend it automatically. Check your inbox and spam folder first.
```

The only action is:

```text
Prepare a separate copy
```

That action returns to the form and creates a new request only after the learner submits again. Do not label this state as failed or invite a blind retry.

## 10. Definite errors

Keep errors inside the delivery section. Never expose a provider response body, API key, message ID, token, stack trace, or deployment name.

| Condition                    | Browser copy                                                   | Request behavior                 |
| ---------------------------- | -------------------------------------------------------------- | -------------------------------- |
| Invalid name                 | `Enter the name to print on the certificate.`                  | Focus name                       |
| Invalid email                | `Enter a valid email address.`                                 | Focus email                      |
| Missing consent              | `Confirm that we may use these details for this delivery.`     | Focus consent                    |
| Unsupported certificate name | `That name cannot fit this certificate yet...`                 | New explicit request after edit  |
| PDF failure                  | `The certificate could not be prepared, so no email was sent.` | Definite failure; grant revoked  |
| Rate limit                   | `This result was emailed recently...`                          | No provider call                 |
| Ownership unavailable        | `This result is no longer available from this session.`        | No provider call                 |
| Missing configuration        | `We could not confirm delivery...`                             | Fail closed                      |
| Missing Turnstile site key   | `Email delivery is not configured for this site yet.`          | Submit disabled                  |
| Invalid Turnstile response   | Bounded generic unavailable state                              | No reservation and no Brevo call |

The exact request ID stays stable only when a retry is safe. The UI clears it after a definite provider/certificate failure. An uncertain result keeps its own stored request state and does not auto-retry it.

## 11. Private review experience

The emailed URL opens the noindex `/practice/review` route with the access token in the fragment. The client must remove that fragment with `history.replaceState` before calling Convex.

Redemption returns a separate random review-session token. Store only that session token in `sessionStorage`; do not store the email access token. Review actions accept only the session token and use server time for expiry checks.

Policy:

- access grant: 30 days;
- access-token exchanges: at most five successful redemptions in total;
- review session: at most 30 minutes and never past grant expiry;
- sixth redemption: unavailable, even before the 30-day expiry;
- result owner: can revoke grants and active sessions; and
- invalid, missing, expired, revoked, deleted, changed-result, and redemption-exhausted cases: same unavailable view.

The review route sets `noindex`, `nofollow`, `nocache`, and `no-referrer`. `robots.txt` disallows `/practice/review`.

Anyone who obtains the access link can spend one of the five redemptions and read the review during the issued session. The email must warn the learner not to forward it.

## 12. Responsive and accessible behavior

### Desktop

Name and email may share a row only when both keep useful width. The certificate choice remains a ruled summary row. The dialog may place option rail and preview beside each other.

### Phone and 320px

- Stack name and email.
- Keep the design action full-width when needed.
- Stack consent copy without shrinking the checkbox target.
- Let the Turnstile widget use flexible width.
- Stack accepted-state actions.
- Keep certificate previews inside the viewport; the page must not scroll horizontally.
- Long names and addresses may wrap in summaries without widening the page.

### Keyboard and screen reader

- Tab order follows name, email, design trigger, consent, Turnstile, Privacy, then submit.
- All icons are decorative beside real button text.
- Validation errors connect through `aria-describedby`; the summary uses `role="alert"`.
- Preparing copy uses a polite status region.
- Accepted heading receives focus after the state changes.
- The picker uses a labelled dialog and radio group.
- Uncertain, revocation success, and revocation failure use visible text, not color alone.

## 13. Configuration checklist

Convex deployment:

```text
BREVO_API_KEY
BREVO_SENDER_EMAIL
BREVO_SENDER_NAME
RESULT_DELIVERY_PUBLIC_ORIGIN
RESULT_DELIVERY_RECIPIENT_HASH_KEY
TURNSTILE_SECRET_KEY
```

Optional Convex value:

```text
BREVO_REPLY_TO_EMAIL
```

Next.js/Vercel:

```text
NEXT_PUBLIC_TURNSTILE_SITE_KEY
```

`RESULT_DELIVERY_RECIPIENT_HASH_KEY` must be independent and at least 32 characters. Turnstile action and hostname validation are mandatory for a new public send. No SMTP value is needed.

Brevo dashboard settings are a separate gate, not environment variables:

- anonymous Transactional Email tracking or enabled per-contact pixel consent with verified `false` behavior;
- approved transactional-log retention; and
- `Never store previews` before any message containing a private fragment is sent.

## 14. QA acceptance

- [ ] Delivery appears only for the owner of a submitted Full Practice result.
- [ ] Quick Practice has no certificate action.
- [ ] Missing Turnstile site key disables submit with plain copy.
- [ ] Wrong Turnstile action, hostname, and token create no delivery and make no Brevo call.
- [ ] A seventh owner verification inside ten minutes stops before Siteverify, the global 500-call bound is covered, and verification events disappear after 24 hours.
- [ ] Default design is ready without opening the picker.
- [ ] The picker restores focus, supports Escape, traps focus, and works at 320px.
- [ ] Name, email, and consent errors focus the first invalid field.
- [ ] The same accepted request returns the accepted state without a second Turnstile or Brevo call.
- [ ] Brevo receives a UUID in JSON `headers.idempotencyKey`, not an HTTP idempotency header.
- [ ] An exact transient retry reuses the identical serialized request body.
- [ ] Ambiguous delivery becomes uncertain and is never retried automatically.
- [ ] Email HTML, plain text, and PDF use the same pinned result values.
- [ ] The PDF says that the participant supplied the name and identity was not verified.
- [ ] The PDF contains no private URL, QR code, recipient email, private ID, or URL annotation.
- [ ] The attachment stays below 2 MiB.
- [ ] The fragment disappears before redemption and the raw access token never enters session storage.
- [ ] A review session expires after 30 minutes and a grant after 30 days.
- [ ] The sixth redemption fails closed; no sixth session is created.
- [ ] Owner revocation invalidates both the grant and active sessions.
- [ ] Delivery metadata cleanup removes rows after 180 days in bounded passes.
- [ ] No delivery webhook claim appears in UI or documentation.
- [ ] Brevo account evidence proves anonymous Transactional Email tracking or active per-contact consent handling; tests do not treat the payload's `false` field as account-setting proof.
- [ ] Brevo uses the approved log-retention rule and `Never store previews`; any preview created before the setting was saved has been deleted.
- [ ] Desktop, Pixel-size, 320px, dark, keyboard, reduced-motion, email, and PDF outputs receive visual inspection.
- [ ] Automated tests stub Cloudflare and Brevo; they never send real email.
- [ ] A live send goes only to an operator-owned mailbox after the sender domain and production Turnstile widget are verified.

## 15. Rejection list

Reject these shortcuts:

- putting the access token in `/practice/review/{token}` or a query string;
- placing the review link or QR code inside the PDF;
- keeping the email access token in local or session storage;
- calling Brevo before server-side Turnstile verification;
- calling Siteverify without the owner/global admission limiter;
- using the Brevo API key as the recipient-digest key;
- putting `idempotencyKey` in the HTTP headers;
- retrying an uncertain send automatically;
- claiming inbox delivery without a provider delivery event;
- describing the certificate as identity-verified, official, predicted, proficiency-bearing, passing, accredited, or admission evidence; or
- treating the learner's recipient address as `From` or `Reply-To`; or
- claiming source code can enable Brevo anonymous tracking, per-contact consent, log retention, or preview storage settings.
