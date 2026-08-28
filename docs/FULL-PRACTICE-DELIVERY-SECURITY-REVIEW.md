# Full Practice result delivery security review

Review date: 28 August 2026
Scope: the uncommitted Full Practice result-email, certificate, Brevo, and shared-review implementation
Method: read-only source review, current Convex rules, targeted unit tests, typecheck, and primary Brevo and Cloudflare documentation
Release verdict: **do not enable public Brevo delivery yet**

## Executive finding

The ownership boundary is sound: the browser never supplies an owner identifier, the public action reads `identity.tokenIdentifier`, and the reservation mutation rechecks the attempt owner, submitted status, current result, and Full Practice kind. The database also avoids storing the submitted name, plain email address, plain review token, or certificate bytes.

The release is nevertheless blocked by provider idempotency and private-link handling. Brevo idempotency is currently placed in the HTTP request headers, while Brevo documents it inside the transactional message's JSON `headers` object; the value is also prefixed and is no longer a UUID. A lost response can therefore produce a duplicate message. Separately, the certificate carries the full bearer review URL as an invisible PDF link annotation. A participant who shares the certificate also shares access to every answer and answer key in the review.

The expiring review check also uses `Date.now()` in public Convex queries. Convex explicitly prohibits wall-clock reads in queries because cached results do not become stale merely because time advances. The thirty-day boundary is therefore not strict in the current query design.

## Severity model

| Severity | Meaning                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Blocker  | Can duplicate delivery or disclose the private review in an ordinary production path. Must be fixed before the Brevo variables are enabled. |
| High     | Material privacy, authorization-duration, abuse, or certificate-integrity risk. Must be fixed before public launch.                         |
| Medium   | Important resilience, auditability, or privacy-hardening gap. Fix before broad use.                                                         |
| Low      | Defence in depth or future-scale concern. Track and test.                                                                                   |

## Required findings

### B-01 — Brevo idempotency is not sent in the documented request field

**Severity:** Blocker
**Evidence:** `convex/lib/fullPracticeEmail.ts:21-35`, `:202-240`; `convex/assessmentResultEmail.ts:350-365`; `tests/unit/full-practice-delivery.test.ts:152-174`

`buildBrevoTransactionalRequest` puts `Idempotency-Key` in the HTTP headers. The JSON payload has no `headers` member. Brevo's current send-email reference defines custom message headers in the request body, and its idempotency guide shows `headers.idempotencyKey`. It also requires a UUID. The action uses `result-${requestId}`, so even a browser UUID is no longer a UUID. The existing unit test locks in this incorrect transport shape.

This breaks the only provider-side duplicate-send defence. `postToBrevo` retries timeouts, 429 responses, and 5xx responses, exactly the cases where the first request may already have reached Brevo.

**Concrete fix**

1. Generate one server-side UUID provider-attempt ID when a delivery row is reserved and store it on that row.
2. Add a bounded `headers` object to `BrevoTransactionalEmailPayload`, with `idempotencyKey: providerAttemptId` and an operator-safe correlation header such as `X-Ec-Delivery`.
3. Remove the custom HTTP `Idempotency-Key`; keep only `api-key`, `accept`, and `content-type` as HTTP headers.
4. Reuse the stored provider UUID and byte-identical JSON body for every retry of that provider attempt.
5. Do not treat Brevo's `duplicate_parameter` response as a normal terminal failure. Reconcile it as an already-processed or uncertain provider attempt.

Brevo sources: [send-email request schema](https://developers.brevo.com/reference/send-transac-email) and [transactional email idempotency](https://developers.brevo.com/docs/heterogenous-versions-batch-emails).

**Tests**

- Assert the serialized JSON contains one UUID at `headers.idempotencyKey` and that the HTTP header map does not.
- Simulate a response-lost timeout followed by a retry; assert the URL, body, and provider UUID are identical.
- Simulate Brevo's duplicate-idempotency response and prove the application does not issue a new provider UUID.
- Run one controlled sandbox/live smoke request and inspect the Brevo activity record for the correlation header. Redact the address and key from evidence.

### B-02 — The shareable certificate embeds the private bearer review token

**Severity:** Blocker
**Evidence:** `convex/assessmentResultEmail.ts:229-240`, `:291-322`; `convex/lib/fullPracticeCertificate.ts:593-607`, `:760-786`; `tests/unit/full-practice-certificate.test.ts:38-61`, `:126-138`

The same raw bearer URL used by the email is passed into the PDF generator and stored in a clickable link annotation. The visible text shows only the host, so a participant can reasonably share the certificate without realizing that the PDF contains the complete private token. Anyone receiving that PDF can open the Full Practice result, responses, correct answers, explanations, transcripts, and media until the grant expires.

This is a normal-use disclosure path, not a token-guessing scenario. The email already supplies the requested full-review link; the portable certificate does not need it.

**Concrete fix**

- Remove the private review URL from `FullPracticeArtifactInput`, the PDF annotation, and the PDF test contract.
- Keep the private review button and plain-text URL in the email only.
- Let the certificate show its non-sensitive certificate ID. Add a public verification URL only if a separate verification record is designed to disclose no answers, email, or bearer token.

**Tests**

- Parse every generated PDF and assert there is no URI annotation containing `/practice/review/`.
- Search PDF bytes, metadata, annotations, and extracted text for a known QA token and assert zero matches.
- Keep the email HTML/text tests proving the private link is still present there.

### H-01 — Review expiry relies on wall-clock reads inside cached queries

**Severity:** High
**Evidence:** `convex/assessmentResultDelivery.ts:93-115`, `:353-367`, `:369-452`; `convex/_generated/ai/guidelines.md:328-333`

`validGrantForToken` calls `Date.now()` and is used by both public review queries. Convex queries are cached and reactive, but time passing does not invalidate a cached query. A response computed just before expiry can remain usable after the intended boundary. Passing a client-provided `now` would not be an authorization fix because a caller could submit an old timestamp.

**Concrete fix**

Use a public action for every bearer-token redemption and page request. The action may read `Date.now()`, hash and validate the token, and call a bounded internal query for the result or review page. Manage pagination cursor state in the client instead of `usePaginatedQuery`. As an additional backstop, schedule a precise internal revocation at grant creation; do not rely on the daily purge for the authorization decision.

**Tests**

- Use a fake clock around `expiresAt - 1`, `expiresAt`, and `expiresAt + 1`; the exact boundary must deny.
- Prime a pre-expiry read, advance time without changing the token, and prove the next action denies rather than serving a cached query value.
- Prove both summary and paginated answer review use the same expiry decision.

### H-02 — The retry state machine can both strand retries and duplicate ambiguous sends

**Severity:** High
**Evidence:** `convex/assessmentResultDelivery.ts:132-163`, `:302-350`; `convex/assessmentResultEmail.ts:154-191`, `:246-271`, `:377-396`; `src/components/practice/result-email-delivery.tsx:499-527`; `tests/unit/result-email-delivery.test.tsx:165-186`

The UI intentionally reuses one request ID after a provider failure. The reservation mutation returns every existing `failed` row as `failed`, so that retry can never perform work again. The UI unit test passes because it mocks the backend and therefore does not exercise this state transition.

The opposite risk exists after an ambiguous provider outcome. A timeout or exhausted 5xx retry is marked terminal `failed`. Editing the form or choosing “Send another copy” creates a new client request and provider key, even though Brevo may already have accepted the earlier message. That can send a duplicate after the provider's idempotency window.

**Concrete fix**

- Add an `uncertain` status and classify network timeouts, malformed success bodies, and exhausted 5xx attempts as uncertain.
- Complete the current partial request comparison with an immutable fingerprint covering attempt ID, pinned result ID/revision, normalized recipient digest, design, normalized certificate name, and consent version. The current comparison checks only attempt, design, and recipient digest.
- Permit same-request recovery only for failures known to occur before a provider request, such as certificate rendering or local configuration validation.
- Require operator/provider-log reconciliation for uncertain sends. Do not mint a new provider attempt automatically.
- Keep state transitions monotonic and record when a provider request began.

**Tests**

- Integration-test UI retry against the real reservation mutation, not a mocked `onSend` only.
- Prove render failure can be retried safely with the same application request.
- Prove timeout plus a new browser request cannot call Brevo again until reconciliation.
- Prove request-ID reuse with a different recipient, result, or template returns an idempotency conflict.

### M-09 — The recipient HMAC reuses the Brevo API credential and is described inaccurately

**Severity:** Medium
**Evidence:** `convex/assessmentResultEmail.ts:109-114`, `:116-152`, `:229-241`; `convex/schema.ts:787-811`; `content/public-content.ts:2000-2004`; `SETUP.md:124-128`

The database correctly omits the plain email address, and the current HMAC is materially safer than raw SHA-256 for a guessable email. It nevertheless uses `BREVO_API_KEY` as its HMAC key. A provider credential should not double as a long-lived pseudonymization key. Routine Brevo key rotation changes every future recipient digest, resets cross-row recipient-rate history, and makes retention behavior depend on an unrelated external credential. Calling the digest “non-identifying” also overstates the privacy property. It remains pseudonymous personal data retained with attempt, result, owner, status, and provider identifiers for up to 180 days.

**Concrete fix**

- Compute `HMAC-SHA-256(RESULT_DELIVERY_RECIPIENT_HASH_KEY, normalizedEmail)` with a deployment secret that is never client-exposed.
- Document a key-rotation/migration rule because rotating the key resets cross-row rate history.
- Change public and setup copy from “non-identifying” to “pseudonymous keyed digest,” and state the 180-day delivery-log retention separately from the 30-day review grant.
- Keep the domain-separation prefix and continue using plain SHA-256 for the 256-bit random review token; its input already has sufficient entropy.

**Tests**

- Assert a known email does not produce its public SHA-256 digest and that changing the Brevo API key does not change the recipient digest.
- Assert equal normalized addresses map to the same HMAC within one deployment and different keys produce different digests.
- Secret-scan client bundles and generated evidence for the HMAC key.

### H-04 — Anonymous identities can exhaust the global quota or use the service for unsolicited mail

**Severity:** High
**Evidence:** `convex/auth.ts:14-17`; `src/components/practice/start-assessment.tsx:127`; `convex/assessmentResultDelivery.ts:34-39`, `:182-227`; `SETUP.md:128`

Full Practice uses anonymous Convex Auth identities. A bot can create new identities, complete or fast-submit attempts, vary recipient addresses, and consume the 250-message rolling global limit. Per-owner limits do not hold across fresh anonymous identities. Per-recipient and per-attempt checks reduce harassment but do not protect Brevo credits or the deployment-wide availability budget. The current setup document acknowledges that a human check is not implemented.

**Concrete fix**

- Require Cloudflare Turnstile for anonymous send requests and verify each token server-side before reservation. Validate the expected action and production hostname; tokens are single-use and expire after five minutes.
- Keep application and provider limits after the human check. Add an owner-wide limit and the planned 15-minute attempt/result/recipient/design cooldown.
- Prefer `@convex-dev/rate-limiter` for per-key quotas instead of hand-scanning operational rows. It avoids a deployment-wide index range becoming a write-contention point.
- Add an operator kill switch and alert before the global budget reaches exhaustion.

Cloudflare source: [mandatory server-side Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

**Tests**

- Reject missing, expired, replayed, wrong-action, and wrong-hostname Turnstile tokens before any delivery row or Brevo request.
- Prove one valid token can authorize only one reservation.
- Drive concurrent requests across distinct anonymous identities and prove every rate bucket holds.

### H-05 — The certificate asserts a person's identity without verifying that identity

**Severity:** High
**Evidence:** `convex/assessmentResultEmail.ts:193-220`, `:302-322`; `convex/lib/fullPracticeCertificate.ts:400-415`, `:418-500`, `:568-582`

The action verifies ownership of an anonymous attempt, but the certificate name is arbitrary input. The PDF then says “This record confirms that [name] completed English Club Full Practice” and “Issued by English Club.” A participant can issue the same completed attempt under several unrelated names. The disclaimer limits score and proficiency claims, but it does not disclose that the printed identity was self-entered and unverified.

**Concrete fix**

Choose one explicit integrity contract:

1. for anonymous practice, use “Practice record prepared for [self-entered name]” and print “Name supplied by participant; identity not verified”; or
2. issue a named completion certificate only to an account with a verified, locked display name and a documented correction flow.

Bind one certificate identity and certificate ID to the pinned result revision. Do not allow six different names to appear as separate confirmations for one attempt.

**Tests**

- Anonymous certificate snapshots must include the self-entered/unverified identity statement.
- Reusing one attempt with a different name must be rejected or explicitly replace a not-yet-issued draft, never create another confirmed identity.
- A corrected result must produce a new certificate revision without silently mutating the old artifact.

### H-06 — Bearer tokens appear in URL paths and therefore in ordinary infrastructure history

**Severity:** High
**Evidence:** `convex/assessmentResultEmail.ts:229-240`, `:291`; `src/app/(site)/practice/review/[token]/page.tsx:5-16`; `src/components/practice/result-view.tsx:531-562`

The raw grant token is part of `/practice/review/{token}`. `noindex`, `robots.txt`, and `Referrer-Policy: no-referrer` are worthwhile, but they do not remove the token from browser history, copied URLs, Vercel request logs, reverse-proxy access logs, RSC payloads, screenshots, or support reports. The token is also passed as a public Convex query argument.

**Concrete fix**

- Put the initial bearer in a URL fragment so it is not sent to Next.js or normal HTTP access logs.
- Exchange it through a dedicated non-cacheable action for a shorter-lived review session; send subsequent reads with that session rather than keeping the long-lived bearer in the route.
- Keep `no-referrer`, `noindex`, and the robots exclusion as defence in depth.
- Add log-redaction rules for the exchange action and never emit the raw body/token in custom logs.

**Tests**

- Assert the request path, server logs, RSC response, and referrer contain no raw QA token.
- Assert browser back/forward and copied certificate files do not recover the long-lived bearer.
- Assert an exchanged/revoked/expired token has one indistinguishable unavailable response.

## Medium findings

### M-01 — Consent is checked but not versioned or auditable

**Evidence:** `convex/assessmentResultEmail.ts:193-220`; `convex/assessmentResultDelivery.ts:118-131`, `:229-249`; `convex/schema.ts:787-825`

The boolean must be true, but no consent-contract version or consent timestamp is stored. A delivery row therefore cannot show which privacy wording authorized the Brevo transfer. Store a literal consent version and server timestamp without adding the plain name or email. Reject unknown versions.

**Tests:** exact accepted version, missing/old/future version rejection, and audit-row projection without PII.

### M-02 — Brevo open-tracking consent is left to account defaults

**Evidence:** `convex/lib/fullPracticeEmail.ts:21-30`, `:202-216`

The recipient object omits `contactPixelTrackingConsent`. Brevo says an omitted value is treated as unknown and may be identified if the account is configured to track unknown-consent contacts. The form asks for delivery consent, not identifiable open tracking. Set `contactPixelTrackingConsent: false` on the sole recipient. This retains aggregate open counts where supported and avoids silently broadening consent.

Brevo source: [transactional tracking-consent behavior](https://developers.brevo.com/changelog/2026/7/21).

**Tests:** payload snapshot must contain exactly one recipient with `contactPixelTrackingConsent: false`.

### M-03 — Provider response classification is too coarse

**Evidence:** `convex/assessmentResultEmail.ts:154-191`, `:377-396`; `convex/assessmentResultDelivery.ts:302-350`

All non-retryable HTTP responses collapse to one false result; 401/403 configuration errors, invalid input, provider throttling, and ambiguous transport failures all become `provider_unavailable`. A 2xx body without a non-empty `messageId` is marked accepted. Fixed 700 ms retries ignore Brevo's rate-limit reset headers. Add explicit provider outcomes: accepted, safe terminal failure, configuration failure, rate-limited, and uncertain. Require a valid message ID before accepted, parse only bounded/sanitized fields, and honor a bounded reset delay.

**Tests:** 201 valid, 201 malformed, 400, 401, 403, 429 with valid/invalid reset, 500/503, timeout, invalid JSON, and oversized body.

### M-04 — There is no participant-controlled review-link revocation

**Evidence:** `convex/assessmentResultDelivery.ts:302-350`, `:353-452`; `convex/assessmentAttempts.ts:1082-1183`

A link can be revoked only indirectly by a failed send, expiry purge, or deletion of the entire attempt. If a participant forwards or loses the link, there is no way to revoke only that grant while preserving their result. Add an owner-authenticated `revokeMine(deliveryId)` mutation that verifies the delivery's owner through the attempt and changes the grant to revoked. Keep invalid, expired, and revoked public responses indistinguishable.

**Tests:** owner revoke, cross-owner denial, repeat idempotency, immediate shared-read denial, and attempt preservation.

### M-05 — Purge timing and public retention wording are incomplete

**Evidence:** `convex/assessmentResultDelivery.ts:34-40`, `:454-490`; `convex/crons.ts:14-19`; `content/public-content.ts:958-962`, `:2000-2004`; `SETUP.md:124-128`

The daily cron deletes an expired grant in the next batch, so physical deletion can occur up to roughly one day after logical expiry. Delivery rows remain for 180 days, but public privacy copy mentions only the link's 30-day expiry and calls the digest non-identifying. State logical access expiry, physical deletion window, 180-day pseudonymous status retention, and Brevo's separate operator-configured retention.

**Tests:** grant access ends at the exact boundary, purge batches delete expired/revoked rows, old delivery rows cascade safely, and repeated scheduled continuations terminate.

### M-06 — Application quotas are hand-rolled and miss planned dimensions

**Evidence:** `convex/assessmentResultDelivery.ts:34-40`, `:182-227`; `convex/_generated/ai/guidelines.md:317-324`

The mutation uses bounded indexed scans, which is better than an unbounded collect, but it has no owner-wide one-minute or daily bucket and no 15-minute attempt/result/recipient/design cooldown. The global requested-at range is read by every send and can become an OCC contention surface. Use the Convex rate-limiter component for fixed keys and keep the delivery table as an audit log rather than the quota counter.

**Tests:** concurrent burst tests at every boundary, including different attempts for one owner and different identities for one recipient.

### M-07 — Certificate IDs are only a 48-bit prefix of the review-token hash

**Evidence:** `convex/assessmentResultDelivery.ts:289-298`; `convex/lib/fullPracticeCertificate.ts:584-591`

`EC-${tokenHash.slice(0, 12)}` is deterministic, only 48 bits, and coupled to the private grant. It is not currently a lookup key, so this does not expose the review token, but it is weaker than the documented random, non-enumerable, independently revocable certificate identity. Generate and store a separate 128-bit-or-greater public certificate ID bound to result revision. Never accept the display ID as authorization for a private review.

**Tests:** uniqueness/property test at scale, separation from token hashes, result-revision binding, and no use as a private-access credential.

### M-08 — The new Convex/provider tests preserve unsafe behavior and leave critical cases uncovered

**Evidence:** `tests/convex/assessment-backend.test.ts:774-1015`; `tests/unit/full-practice-delivery.test.ts:152-174`; `tests/unit/result-email-delivery.test.tsx:165-186`

The current branch now has valuable `convex-test` coverage for one stubbed successful send, hashed storage, grant reads, expiry, request-payload mismatch, and the per-attempt rate limit. However, the successful-send test explicitly expects the incorrect HTTP `Idempotency-Key` and the PDF bearer URL, so it protects both release blockers. The UI retry test can still pass while the real reservation mutation refuses every failed retry. There is no provider ambiguity, purge, cross-owner public-action, revocation, anonymous-abuse, or strict cached-expiry test.

Minimum matrix: cross-owner denial, quick-practice denial, submitted/current-result enforcement, idempotency/fingerprint conflict, every quota, high-entropy token hash only, exact expiry, revocation, bounded pagination, purge continuation, provider ambiguity, no plaintext email/token in stored rows, and attempt deletion cascade.

## Low findings

### L-01 — No explicit PDF attachment ceiling

**Evidence:** `convex/lib/fullPracticeEmail.ts:182-216`; `convex/assessmentResultEmail.ts:324-365`

The current one-page deterministic PDF is small, but the payload builder rejects only an empty attachment. Add the architecture's 2 MB raw-PDF ceiling before base64 conversion so a future font/image change cannot inflate action memory or Brevo payload size.

### L-02 — Public invalid-token queries are an unmetered indexed-read surface

**Evidence:** `convex/assessmentResultDelivery.ts:93-110`, `:353-380`

The 256-bit token prevents guessing, but arbitrary valid-shape tokens still cause a digest and indexed lookup. Once access moves to a dedicated action/exchange boundary, add edge/CDN request limits and observability for invalid-token volume without logging token values.

### L-03 — Sender display-name validation does not reject control characters

**Evidence:** `convex/assessmentResultEmail.ts:116-152`; `convex/lib/fullPracticeEmail.ts:265-271`

The sender value is deployment-controlled and JSON, so this is not a browser injection path. Still, reject C0/C1 controls and collapse whitespace before reservation to turn an operator typo into a clear configuration error rather than a failed provider attempt.

## Positive findings to preserve

- `assessmentResultEmail.send` derives identity from `ctx.auth`; no owner ID is accepted from the browser (`convex/assessmentResultEmail.ts:193-244`).
- `reserve` rechecks owner token, submitted state, current result, and Full Practice kind before inserting anything (`convex/assessmentResultDelivery.ts:165-180`).
- Reusing an application request ID with a different attempt, certificate design, or recipient digest is rejected (`convex/assessmentResultDelivery.ts:132-147`).
- Reservation, snapshot, status changes, and purge are internal functions. Only the deliberately bearer-protected review reads are public.
- Function arguments and returns have validators. Reads use declared indexes and bounded `take`/pagination operations.
- The review token has 32 random bytes and only its full SHA-256 digest reaches Convex storage (`convex/assessmentResultEmail.ts:229-241`; `convex/schema.ts:813-825`). Plain token hashing is appropriate for this high-entropy value.
- The delivery and grant tables contain no submitted name, plain recipient email, raw token, email body, or PDF. The attachment filename also excludes the participant name.
- HTML interpolations for learner and content-controlled text are escaped, and the email includes an equivalent plain-text body (`convex/lib/fullPracticeEmail.ts:66-179`, `:273-285`).
- Sender, recipient, and optional Reply-To are separate. The entered learner address is never used as the sender.
- Configuration is server-only, validates a verified-shape sender/reply address, and accepts only an exact HTTPS origin before reservation (`convex/assessmentResultEmail.ts:116-152`, `:221-227`).
- Provider errors and response bodies are not returned to the browser or written to custom logs.
- The shared route declares `noindex`, `nofollow`, `nocache`, and `no-referrer`, and robots excludes the route. Preserve these controls after removing tokens from paths.
- Purge reads and writes are bounded and continuation is scheduled through `internal.assessmentResultDelivery.purgeExpired`.
- Attempt deletion includes delivery and review-grant rows and verifies attempt ownership before deletion.

## Test evidence from this review

Commands were run without a live Brevo request and without changing deployment state:

```text
npm run typecheck
Result: passed

npm test -- --run tests/unit/full-practice-delivery.test.ts tests/unit/full-practice-certificate.test.ts tests/unit/result-email-delivery.test.tsx
Result: 3 files passed, 20 tests passed

npm test -- --run tests/convex/assessment-backend.test.ts
Result: 1 file passed, 23 tests passed
```

These passing tests establish builder, component, reservation, grant, and one stubbed-provider path. They do not lower the severity of B-01 or B-02 because the assertions currently encode those unsafe behaviors, and the provider-failure/security matrix remains incomplete.

## Release gate

Do not set production Brevo variables until all of the following are evidenced:

- [ ] B-01 provider idempotency uses the documented JSON field, a stored stable UUID, and ambiguity tests.
- [ ] B-02 removes the private bearer link from every certificate design and PDF annotation.
- [ ] H-01 proves strict server-authoritative grant expiry without wall-clock queries.
- [ ] H-02 has safe retry, immutable request fingerprinting, and an uncertain state.
- [ ] M-09 separates the recipient HMAC from the Brevo API credential and corrects privacy copy.
- [ ] H-04 verifies a human-check token server-side for anonymous sends and proves concurrent quotas.
- [ ] H-05 makes the anonymous self-entered identity boundary explicit or requires a verified name.
- [ ] H-06 removes long-lived bearer values from route paths and ordinary logs.
- [ ] Convex and provider integration tests cover ownership, idempotency, expiry, purge, privacy, and provider ambiguity.
- [ ] One operator-owned smoke email proves sender authentication, accessible HTML/text, PDF attachment, private review, and redacted evidence.
- [ ] Brevo transactional-log retention is set deliberately and message previews are disabled or accepted as a documented privacy decision.

## Self-review of this report

- Every finding cites the current source file and line range inspected on 28 August 2026.
- Findings distinguish intended bearer access from accidental bearer disclosure.
- The report does not claim that SHA-256 is weak for the random review token; it requires key separation for the email-address HMAC and accurate pseudonymous-data wording.
- No secret value, recipient address, real token, deployment log, or provider response was read or copied.
- No source file, deployment, Git state, or port 3987 process was changed. This report is the only authored file.
- The official provider contract was checked against Brevo's current send-email, idempotency, and tracking-consent documentation; Turnstile guidance is from Cloudflare's server-side validation documentation.

## Remediation appendix: minimum secure implementation contract

This appendix narrows H-01, H-02, H-04, H-06, and B-01 into an implementation contract. Names are illustrative, but the states, trust boundaries, and negative tests are release requirements.

### A. Replace cached-query wall clocks with a server-time action boundary

Do not call `Date.now()` in any Convex query. Public review reads must be actions, because an action is not a cached reactive read and can establish server time. The action must hash the presented secret and pass both the hash and its server-generated `now` to an internal query. The browser must never supply `now`.

Use short-lived review sessions so the 30-day email bearer is presented once instead of on every paginated read:

```ts
const unavailableValidator = v.object({
  ok: v.literal(false),
  code: v.literal("unavailable"),
});

const redeemResultValidator = v.union(
  unavailableValidator,
  v.object({
    ok: v.literal(true),
    sessionToken: v.string(), // 32 random bytes, base64url
    sessionExpiresAt: v.number(), // min(grant expiry, now + 30 minutes)
    grantExpiresAt: v.number(),
    result: attemptResultValidator,
  }),
);

export const redeem = action({
  args: { token: v.string() },
  returns: redeemResultValidator,
  // Normalize exactly 43 base64url characters, hash, set now = Date.now(),
  // generate sessionToken, then call one internal mutation.
});

export const listReviewPage = action({
  args: {
    sessionToken: v.string(),
    sectionOrder: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.union(
    unavailableValidator,
    v.object({
      ok: v.literal(true),
      page: paginationResultValidator(reviewItemValidator),
    }),
  ),
});
```

Add a session table containing only `grantId`, full SHA-256 `sessionHash`, `status: "active" | "revoked"`, `createdAt`, and `expiresAt`; index full `sessionHash`, `grantId + createdAt`, and `expiresAt`. Store no raw grant or session token. The internal exchange mutation must atomically require an active, unexpired grant; a submitted attempt; and the grant's pinned result. It may keep at most five sessions per grant, deleting the oldest before inserting a sixth, and must rate-limit exchanges by grant so a stolen token cannot create sustained write churn. Session expiry is at most 30 minutes and never later than grant expiry. Revoking a grant invalidates all sessions on the next read. Purge expired sessions with the same bounded/continued cron pattern as grants.

Every internal result/page query accepts `{ sessionHash, now }`, where only the public action supplies `now`, and rechecks session active/unexpired, grant active/unexpired, submitted attempt, and pinned result before returning the minimum projection. Invalid shape, missing, expired, revoked, deleted-attempt, and wrong-result cases all return the same `unavailable` union; do not reveal which check failed. Existing `useQuery`/`usePaginatedQuery` callers must become action calls with an explicit cursor state.

Negative tests:

- mock Convex query time/cache behavior and prove a token accepted at `expiresAt - 1` is rejected at exactly `expiresAt` without a deployment or data write;
- reject a browser-provided `now` argument at the public boundary and verify the internal query is not publicly callable;
- reject malformed grant/session tokens before a database call; reject expired or revoked grant/session, deleted attempt, non-submitted attempt, and result mismatch with identical public output;
- prove at most five sessions remain after repeated redemption, expiry never exceeds the grant, revocation takes effect on the next page, purge is bounded, and no raw token appears in stored documents or thrown/logged messages.

### B. Put the 30-day review token in a URL fragment, not a route path

The email URL must be exactly `${origin}/practice/review#token=${reviewToken}`. The public route is `/practice/review`; remove the dynamic `[token]` route after compatibility handling. A client component must read `location.hash` once, immediately call `history.replaceState(null, "", "/practice/review")`, redeem the token, and keep only the returned 30-minute session token in `sessionStorage`. Clear the value on `unavailable`. Do not use `localStorage`, cookies readable by unrelated routes, analytics parameters, server-component props, or custom logs for either secret. Preserve `noindex`, `nofollow`, `noarchive`, `nocache`, and `Referrer-Policy: no-referrer`. The certificate PDF must contain neither the long-lived URL nor either bearer token.

The fragment prevents the token from being sent in the HTTP request line, Vercel route logs, access logs, or `Referer`; it does not defend against malicious browser scripts. Therefore the route must not load third-party analytics/chat scripts, and the existing content-security policy must restrict scripts and connections to the application and Convex origins needed by this page.

For an old path link, the compatibility page may render a client-only bridge that reads the path token, replaces the URL before any third-party code runs, and redeems it; it must not redirect with the token in a query string or render the token into metadata/RSC payload. Remove this bridge after the old grant lifetime has elapsed.

Negative tests:

- request `/practice/review#token=secret` through a test server and prove the server sees only `/practice/review`; assert generated email HTML/text contains no `/practice/review/<token>` and no query-token form;
- assert `replaceState` runs before the redeem call, a successful redeem leaves no fragment/path token, refresh uses only the session token, and unavailable clears storage;
- inspect PDF bytes/annotations and prove they contain no review origin, route, grant token, or session token;
- verify route HTML, metadata, RSC output, application logs, and analytics calls contain no bearer value.

### C. Make provider outcomes monotonic and ambiguity-safe

Persist a server-generated UUID v4 `providerAttemptId` before the first Brevo request. Send it inside the Brevo JSON payload as `headers.idempotencyKey`; do not put the idempotency key in the HTTP request headers. Every transport retry for that delivery must use the identical payload, attachment, recipient, and provider ID.

```ts
const deliveryStatusValidator = v.union(
  v.literal("preparing"),
  v.literal("sending"),
  v.literal("accepted"),
  v.literal("uncertain"),
  v.literal("failed"),
);

type ProviderOutcome =
  | { kind: "accepted"; messageId: string }
  | { kind: "duplicate" }
  | { kind: "retryable"; reason: "rate_limited"; retryAt?: number }
  | { kind: "rejected"; reason: "invalid_request" | "authentication" }
  | {
      kind: "uncertain";
      reason: "timeout" | "network" | "server_error" | "malformed_success";
    };

export const beginProviderAttempt = internalMutation({
  args: {
    deliveryId: v.id("assessmentResultDeliveries"),
    providerAttemptId: v.string(), // strict UUID v4
    now: v.number(),
  },
  returns: v.union(
    v.object({ state: v.literal("send"), providerAttemptId: v.string() }),
    v.object({ state: v.literal("accepted") }),
    v.object({ state: v.literal("in_progress") }),
    v.object({ state: v.literal("uncertain") }),
  ),
});

export const recordProviderOutcome = internalMutation({
  args: {
    deliveryId: v.id("assessmentResultDeliveries"),
    providerAttemptId: v.string(),
    outcome: providerOutcomeValidator,
    now: v.number(),
  },
  returns: v.null(),
  // Reject an ID mismatch and enforce the transition table transactionally.
});
```

Required transitions are `preparing -> sending -> accepted | failed | uncertain`. `accepted` is terminal. `uncertain` is terminal to the public action and can move only through an authenticated operator/internal reconciliation to `accepted` or a confirmed `failed`. A `sending` row older than ten minutes becomes `uncertain` through a bounded cron, not `failed`. A confirmed 429 may be retried after its provider delay with the same row, body, and `providerAttemptId`; do not create a new delivery or key.

Classify only a Brevo success response with a non-empty, length-bounded string `messageId` as `accepted`. A success without that ID is `uncertain`. After bounded same-key retries, network errors, timeouts, and 5xx are `uncertain`, because Brevo may have accepted the message before the client lost the response. A documented duplicate response is `duplicate`; if the row already has its previously stored message ID it remains accepted, otherwise duplicate maps to `uncertain`, never a fresh success. Confirmed 400 validation errors and 401/403 authentication failures are `failed`; do not expose provider response bodies. The browser receives `accepted`, `in_progress`, `rate_limited`, `uncertain`, or a generic `provider_unavailable`, and must never claim delivery for `uncertain`.

Store an immutable request fingerprint covering attempt/result revision, recipient digest, certificate design, consent version, and the normalized content inputs that affect the payload. Reuse of the application request ID with a different fingerprint is rejected. Replay of the same accepted request returns the stored success without Turnstile, PDF generation, or a provider call.

Negative tests:

- assert the UUID appears in `payload.headers.idempotencyKey`, not HTTP headers; retry bodies and attachments are byte-identical;
- exercise 201 with ID, 201 without ID, documented duplicate with/without prior ID, 400, 401, 403, 429 with reset, timeout before/after a simulated provider accept, network error, 500, malformed/oversized JSON, and action crash after `sending`;
- prove timeout/5xx/unknown duplicate cannot create a second delivery or idempotency key, `uncertain` is not shown as delivered, accepted cannot regress, and only the operator reconciliation function can resolve uncertainty;
- assert response bodies, API keys, recipient addresses, and bearer tokens never appear in database failure fields, client errors, or captured logs.

### D. Verify Turnstile before reservation or durable PII-derived writes

Add `turnstileToken: v.string()` to the public send action and reject empty or over-2,048-character values locally. Configure the browser widget with `action="full-practice-result-email"`. After authentication, local field/config validation, and an accepted-request idempotency fast path—but before generating a review token, reserving a delivery, producing a PDF, or calling Brevo—POST it to Cloudflare Siteverify with `secret`, `response`, and a server-generated UUID `idempotency_key`. Use a strict timeout. Never persist or custom-log the token. The fast-path lookup must be an internal read that binds current owner, application request ID, and the full immutable request fingerprint; it cannot return another owner's delivery or accept a changed recipient/template/result.

Require:

```ts
type TurnstileResult =
  { ok: true } | { ok: false; code: "invalid" | "unavailable" };

// Environment, read only in the action:
// TURNSTILE_SECRET_KEY
// TURNSTILE_EXPECTED_HOSTNAMES  (comma-separated exact hostnames)
// TURNSTILE_EXPECTED_ACTION    (must be "full-practice-result-email")
```

Accept only `success === true`, an exact allow-listed `hostname`, and exact `action`. Do not use suffix/wildcard hostname matching. Missing configuration and Siteverify network/timeout/5xx/malformed responses fail closed as `configuration_unavailable` or a generic temporary `verification_unavailable`. `success: false`, wrong host/action, or replay is `verification_failed`. Do not forward a client-supplied IP; Convex has no trusted direct-client IP in this action. Production must have no bypass. Development/tests should use Cloudflare's published test keys, not a conditional skip.

Turnstile is not a quota system. Keep owner, attempt, recipient, and global rate limits after verification. Because Turnstile tokens are single-use and expire after five minutes, the UI must reset the widget after every non-idempotent send attempt and obtain a new token for retry; it must not reuse a token stored in React state. A replay of an already accepted application request may return the stored result before verification because it causes no new side effect.

Negative tests:

- reject missing, empty, oversized, expired, already-used, or invalid tokens; `success: false`; wrong/missing hostname; wrong/missing action; malformed JSON; non-2xx; timeout; and network error;
- for every failure above, spy that reservation, token generation, PDF generation, email construction, Brevo fetch, and database writes were not called;
- prove an accepted application-request replay skips both Siteverify and Brevo, while a failed/uncertain/new request requires a fresh Turnstile token;
- run concurrent valid challenges against owner/attempt/recipient/global limits and prove Turnstile cannot bypass quotas.

### Second-pass self-review

- The contract removes wall-clock reads from cached queries instead of merely passing a browser timestamp into them.
- The fragment design explicitly separates the 30-day grant token from a bounded 30-minute session and removes certificate leakage.
- Provider `accepted`, `duplicate`, `uncertain`, `retryable`, and confirmed rejection are not conflated; every retry preserves one UUID and one payload.
- Turnstile is placed before reservation and other expensive/durable side effects while preserving a harmless accepted-request replay fast path.
- The appendix requires bounded session storage, indexes, purge, validators, generic public errors, and negative tests; it does not require a deployment, source edit, Git operation, or port change.

## Post-remediation independent re-review — 28 August 2026

This pass reviewed the current source after the fragment/session, Turnstile, provider-state, certificate-claim, and keyed-digest changes. It was read-only except for this audit note. No deployment, environment, Git, package, or running port was touched.

### Release conclusion

No P0 or P1 source-code defect remains in the reviewed result-delivery path. R-01 and R-02 below were found during the first post-remediation pass and were closed before final handoff. R-03 remains an operator release gate because application source cannot inspect Brevo account settings.

#### R-01 — Revocation fails closed when authentication is missing (resolved)

**Current evidence:** `convex/assessmentResultEmail.ts`; `convex/assessmentResultDelivery.ts`; `tests/convex/assessment-backend.test.ts`; `src/components/practice/result-email-delivery.tsx`

The public action now throws `AUTH_REQUIRED` when the anonymous Auth session is missing. The internal mutation verifies attempt ownership, scans the bounded delivery set, and revokes every active grant and active review session before returning. The client confirms revocation only after that action resolves; authentication and network failures keep the link marked active and show recoverable error copy.

Automated evidence proves:

- unauthenticated revocation rejects with `AUTH_REQUIRED`;
- authenticated revocation invalidates the active grant and all five bounded review sessions;
- the UI does not present success after a rejected revocation request.

#### R-02 — Siteverify is protected by an indexed preflight (resolved)

**Current evidence:** `convex/assessmentResultEmail.ts`; `convex/assessmentResultDelivery.ts`; `convex/schema.ts`; `convex/crons.ts`; `tests/convex/assessment-backend.test.ts`

After the accepted or uncertain idempotency fast path, an internal mutation now proves that the attempt belongs to the authenticated owner, is submitted, has a current result, and is Full Practice before any Cloudflare request. It records an indexed verification event and permits at most six Siteverify calls per owner and 500 across the service in ten minutes. Events contain only attempt ID, owner token identifier, and creation time; the daily bounded cleanup removes them after 24 hours.

Automated evidence proves:

- missing and unsubmitted attempts cause zero provider fetches and zero verification events;
- six invalid Turnstile checks reach Siteverify, while the seventh is rate-limited before another fetch;
- accepted and uncertain application-request replays remain side-effect free.

The 501st global verification attempt and 24-hour cleanup boundary remain worthwhile direct regression tests, but their absence is an evidence-depth follow-up rather than a source release blocker.

Cloudflare source: [server-side validation and validation-flood rate limiting](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

#### R-03 — Brevo click-log privacy is an operator release gate, not a code guarantee (P1 privacy/contract)

**Evidence:** `convex/lib/fullPracticeEmail.ts:97-100`, `:168-175`, `:233-246`; `SETUP.md:140`, `:495-498`; `content/public-content.ts:2006-2010`

The payload now sets `contactPixelTrackingConsent: false`, which closes identifiable open-pixel tracking. The message still contains the private fragment-bearing review link. Brevo documents recipient-linked open and click tracking as its default and provides account-level anonymous tracking. Source code cannot prove the deployed Brevo account's click-log, message-preview, or retention settings. Until the operator evidence exists, the bearer may appear in provider click/message logs and the public phrase “only to prepare and deliver” is stronger than the verified behavior.

Bounded fix/release evidence:

- enable and capture evidence of Brevo anonymous transactional tracking, or disable recipient-linked click tracking for this sender/account where supported;
- deliberately configure transactional-log retention and message previews, and record the accepted provider-access boundary;
- make the privacy text say that Brevo processes the message and link under the documented operator settings instead of promising delivery-only processing before those settings are proven;
- click a canary fragment link through the real provider smoke test and verify the transactional log/export does not expose the recipient, message ID, clicked URL, or bearer.

Brevo source: [anonymous tracking for transactional opens and clicks](https://help.brevo.com/hc/en-us/articles/11643306229906-Can-I-anonymize-the-tracking-of-opens-and-clicks-for-my-emails).

### Findings closed in the current source

- **Ownership and scope:** send derives `identity.tokenIdentifier`; reservation rechecks attempt owner, submitted status, current result, and Full Practice kind. Public review reads are deliberately bearer-session scoped, while all durable delivery mutations are internal.
- **Turnstile binding and replay:** Siteverify is server-side, time-bounded, and requires the exact action and exact public hostname. New sends fail closed; accepted/uncertain application replay creates no side effect and may bypass a second challenge.
- **PII and key separation:** plain name, recipient address, PDF, grant token, and session token are absent from application tables. Recipient/name digests use a dedicated secret rather than the Brevo credential. The digest remains pseudonymous operational data and is retained for at most 180 days.
- **Private review lifecycle:** the 256-bit grant token is in a URL fragment, scrubbed before exchange, hashed at rest, and exchanged for a hashed 30-minute session. Server actions establish time; cached queries never call `Date.now()`. Grant expiry is 30 days, owner revocation is checked on every session read, and total redemption is now capped at five rather than rotating sessions indefinitely.
- **Provider ambiguity:** one persisted UUID v4 is sent in JSON `headers.idempotencyKey`; bounded retries reuse the exact body. Network, timeout, 5xx, duplicate-without-known-acceptance, and malformed-success outcomes freeze as `uncertain` and are not automatically resent.
- **Certificate boundary:** the PDF contains a separate 128-bit certificate ID, no private link or link annotation, an explicit participant-supplied/unverified-name statement, and clear non-ETS/non-proficiency limitations. Attachment size is capped.
- **Retention and bounds:** delivery/grant/session scans are indexed and bounded; expiry is enforced logically at read time and physical cleanup is scheduled in bounded batches.
