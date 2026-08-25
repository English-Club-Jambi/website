# English Club Setup

Status: Convex Cloud development workflow; production release gates remain
Verified: 26 August 2026
Frontend: Next.js 16.3 line
Backend: Convex Cloud
Storage: Cloudflare R2 Standard

This project does not require a local Convex backend. Next.js runs locally on port 3987 while data, Auth, functions, and deployment environment variables live in the selected Convex Cloud development deployment.

## 1. Responsibility map

| System | Responsibility |
| --- | --- |
| Next.js | Public and admin routes, server rendering, metadata, responsive interaction, theme boot, and controlled Convex provider boundaries |
| Convex Auth | Password identities for administrators; Anonymous identities created only after persisted Practice starts |
| Convex database/functions | Journal, CMS copy, Members, contact submissions, administrator access, themes, Assessment authoring/attempts/results, audit, and reviewed media metadata |
| Public R2 bucket | Reviewed public AVIF/WebP/SVG and published Assessment derivatives read through `https://r2.mukhtada.my.id` |
| Private Assessment R2 bucket | Confidential source audio/images, server verification, and short-lived admin preview; not public and not currently configured |
| Repository | Source, schemas, manifests, deterministic fixtures, reviewed derivatives needed for QA, tests, and documentation |
| Local consent vault | Raw participant/photo/audio masters awaiting rights and consent review; intentionally not tracked in Git |

R2 stores bytes, not publication or consent state. Convex stores an immutable object key and the state needed to decide whether that key may cross a browser boundary.

## 2. Prerequisites

- Node.js 20.9 or newer.
- npm and the lockfile in this repository.
- Access to the correct Convex team/project and its cloud development deployment.
- A Cloudflare account with the existing public R2 bucket.
- For confidential Assessment media, a separate private R2 bucket and bucket-scoped credentials. These are still missing; do not substitute the public bucket.
- Written rights/consent before any real-person media becomes public.

Install pinned dependencies:

```bash
npm install
```

All runtime scripts use port 3987. Do not terminate an existing server on that port unless the operator explicitly asks.

## 3. Select Convex Cloud

Configure the existing cloud development deployment:

```bash
npx convex dev --configure existing --dev-deployment cloud --once
```

The CLI writes the selected deployment values to `.env.local`:

```dotenv
CONVEX_DEPLOYMENT=dev:your-cloud-deployment
CONVEX_URL=https://your-cloud-deployment.convex.cloud
CONVEX_SITE_URL=https://your-cloud-deployment.convex.site
```

`CONVEX_URL` is the server-side query/mutation endpoint. The Next.js server passes that resolved value to the browser provider where needed. A duplicate `NEXT_PUBLIC_CONVEX_URL` is not required. `CONVEX_SITE_URL` is the separate Convex Auth HTTP origin.

Before every command that changes deployment state—`convex env set`, `convex dev --once`, `convex deploy`, or a data mutation—identify the target deployment. Production changes require explicit approval.

Push or watch only when authorized:

```bash
npm run convex:push
npm run convex:dev
```

Do not add `--local`.

## 4. Next.js environment

Start from `.env.example` and keep real values in `.env.local`:

```dotenv
CONVEX_DEPLOYMENT=
CONVEX_URL=
CONVEX_SITE_URL=

NEXT_PUBLIC_SITE_URL=http://localhost:3987
NEXT_PUBLIC_MEDIA_BASE_URL=https://r2.mukhtada.my.id
# NEXT_ALLOWED_DEV_ORIGINS=http://192.168.1.20:3987,qa-phone.local

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_API=

R2_ASSESSMENT_BUCKET_NAME=
R2_ASSESSMENT_ACCESS_KEY_ID=
R2_ASSESSMENT_SECRET_ACCESS_KEY=

R2_PUBLIC_DEV=
R2_AUTH_TOKEN=
```

Rules:

- `CONVEX_URL` is sufficient for Next.js/Convex integration.
- `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_MEDIA_BASE_URL` are intentionally public origins.
- Next.js detects the machine's exact non-internal IPv4 interface hosts when the development server starts, so a phone on the same LAN can load and hydrate `/_next` assets. `NEXT_ALLOWED_DEV_ORIGINS` may add exact HTTP(S) origins or hostnames when discovery cannot see a QA interface. The parser rejects wildcards, credentials, paths, query strings, and fragments; restart the development server after changing this value.
- Account IDs, API endpoints, bucket names, access keys, secrets, auth tokens, JWT keys, and presigned URLs are not public client variables.
- `R2_AUTH_TOKEN` is an optional Cloudflare management token for operators. Application upload functions use S3 credentials and do not read it.
- `R2_PUBLIC_DEV` is a development fallback only. Production public reads use the custom domain.
- Never copy `.env.local`, `convex env list` output, or generated Auth key material into issues, screenshots, commits, or chat.

## 5. Configure Convex Auth

The deployment needs three Convex environment variables:

- `JWT_PRIVATE_KEY`
- `JWKS`
- `SITE_URL`

Generate one matching RS256 key pair using the current `jose` dependency. Write it to a temporary file outside source control, set the deployment variables through a non-logging path, and delete the file immediately. `SITE_URL` must be the exact browser origin:

```text
development: http://localhost:3987
production:  https://YOUR-EXACT-PRODUCTION-ORIGIN
```

Development and production use different key pairs. Do not reuse a development signing key in production. Do not run a wizard that overwrites unrelated deployment configuration.

Convex Auth providers in this project:

- Password: administrator identity.
- Anonymous: owned Practice attempts, created only after Start.

Password sign-in is browser-facing. Password account creation is internal-only, normalizes and validates email, and requires 12–128 characters with upper-case, lower-case, and numeric characters. Identity creation and CMS authorization happen in one deployment-operator command.

## 6. Internal administrator provisioning

The browser never exposes Password sign-up. A deployment operator creates the Auth account and its `adminUsers` authorization record together through one internal Convex action.

1. Confirm and announce the intended Convex deployment.
2. Run the interactive operator command from a trusted terminal:

```bash
npm run admin:provision
```

The command prompts for display name, email, role, and a hidden password. For an operator-generated password, use explicit arguments:

```bash
npm run admin:provision -- \
  --name "Reviewed administrator" \
  --email "admin@example.com" \
  --role owner \
  --generate-password
```

`--generate-password` prints the generated password once after a successful run. Store it in a password manager. The password does not expire automatically; do not put it in shell arguments, source, Markdown, or Git.

If an earlier operator action created the Password account but failed before it could bind the sole legacy placeholder owner, recover that exact account instead of attempting a second sign-up:

```bash
npm run admin:provision -- \
  --name "Reviewed administrator" \
  --email "admin@example.com" \
  --role owner \
  --generate-password \
  --recover-existing \
  --repair-placeholder "THE_EXACT_LEGACY_TOKEN"
```

This recovery is intentionally narrow: the email must already identify a Password account, the legacy deployment must contain exactly one active unbound owner with the exact supplied token, and the requested role must remain `owner`. The account is bound first, then its password is rotated and prior sessions are invalidated. Do not use `--recover-existing` for normal account creation.

The Password provider stores a one-way password hash on the Auth account. The
password itself has no application-level expiry and is never rotated during sign-in,
session refresh, deployment, or normal CMS work. Only the explicit
`--recover-existing` operator command replaces it. Session tokens do expire and may
be invalidated without changing the password. Use a separate development-only admin
for automated browser checks so QA never changes a human administrator's credential.

3. Open `/admin` and sign in with that issued account.
4. Confirm the owner workspace appears, sign out, sign in again, and verify the stable Auth-account binding survives the new session.
5. Verify editor and publisher negative permissions and the audit event.

The internal action uses the installed Password provider to hash the credential and then verifies the resulting Password account before binding it. The explicit recovery path verifies and binds the existing account before rotating its credential. Browser calls with `flow=signUp` are rejected. Protected functions resolve the signed identity against the stable issuer plus Convex Auth user ID, with the legacy complete-token lookup retained only for existing records. The last active owner cannot be demoted or disabled.

The client must not call `adminUsers:bootstrapState`; that deployment-era public function is not part of the current UI contract. `adminUsers:bootstrapOwner` remains a legacy internal migration seam and is not the operator account-creation workflow.

## 7. Configure the public R2 bucket

Set these variables in the selected Convex deployment:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_API
```

Use bucket-scoped S3 credentials. `R2_API` is the S3 API endpoint; browser reads use the custom domain instead. After configuration and an authorized function push, check connectivity:

```bash
npm run r2:check
```

A healthy connection returns `{ "ok": true }`. The existing public bucket and `https://r2.mukhtada.my.id` custom domain have already passed public-object checks; re-run the target-specific check for production.

The current public CMS upload does not depend on bucket CORS. The browser sends the body to the same-origin `/api/admin/media-upload` route, which validates the Convex-issued presigned contract and streams to the R2 S3 endpoint; Convex then verifies metadata with `HeadObject`. Exact-origin bucket CORS is still required before switching to a direct browser PUT. See `R2-SETUP.md` for both paths.

## 8. Configure the private Assessment bucket

Confidential source audio/images require three additional deployment variables:

```text
R2_ASSESSMENT_BUCKET_NAME
R2_ASSESSMENT_ACCESS_KEY_ID
R2_ASSESSMENT_SECRET_ACCESS_KEY
```

They must refer to a separate private bucket. They must not reuse the public bucket name or its public-domain access path. `R2_ACCOUNT_ID` and the S3 `R2_API` origin are shared only when both buckets belong to the same Cloudflare account.

The private bucket is **not configured in the current environment**. Until it exists and passes the exact CORS, checksum, PUT, `HeadObject`, preview, and public-derivative smoke path:

- `privateDraftReady` must remain false;
- `confidentialUploadsBlocked` must remain true;
- no operator may describe private Assessment uploads as working;
- no public-bucket fallback is allowed.

See `R2-SETUP.md` for the required checksum and metadata headers.

## 9. Run the application

Start Next.js with the repository script:

```bash
npm run dev
```

Open `http://localhost:3987`.

Public routes:

- `/`
- `/about`
- `/activities`
- `/members`
- `/practice`
- `/practice/full`
- `/practice/quick/listening`
- `/practice/quick/reading`
- `/practice/quick/writing`
- `/practice/quick/speaking`
- `/practice/attempt/[attemptId]`
- `/practice/result/[attemptId]`
- `/journal`
- `/journal/[slug]`
- `/contact`

Protected administration:

- `/admin`
- `/admin/pages`
- `/admin/journal`
- `/admin/assessments`
- `/admin/members`
- `/admin/media`
- `/admin/appearance`
- `/admin/activity`

The five public navigation links are About, Activities, Members, Practice, and Journal. Attempt/result routes are owned by the Anonymous learner identity that created them and are disallowed by robots. Admin is noindex/nofollow and absent from public navigation.

## 10. Initial content and data

Journal seed remains idempotent:

```bash
npx convex run seed:run '{}'
npx convex run posts:listPublished '{"limit":3}'
```

The development deployment uses an idempotent, development-gated Member seed so
the grid, filters, managed divisions, and coordinator workflow can be exercised:

```bash
npm run members:seed:dev
npx convex run members:listPublished '{}'
```

The seed writes 15 explicitly fictional showcase profiles, reviewed portrait
derivatives, and the five initial managed divisions only to the configured Convex
development deployment. It is not a production roster and must be replaced with
consent-cleared organisational records before launch. The command checks the target,
is idempotent, and refuses production.

Assessment does not use a local question fallback. The development deployment may be populated with the checked-in original bank for end-to-end flow testing. Announce and verify the exact non-production target first, install `espeak-ng`, `ffmpeg`, and `ffprobe`, then run:

```bash
npm run practice:seed
npx convex run assessmentSeed:verifyIbtPractice \
  '{"confirm":"seed-ec-ibt-style-2026-v1"}'
```

The seed is checksum-bound and idempotent. It publishes one fixed 120-task four-skill form, four quick forms, and 52 generated MP3 derivatives under `https://r2.mukhtada.my.id/assessments/`. It is a development operator path, not evidence that the production human-review workflow ran. A production candidate still requires the current validation/provenance check and four current-revision academic, rights, accessibility, and bias approvals.

The page-copy CMS supports at most 200 entries for one page/locale. The current Practice manifest fits within that contract. A manifest change that would create entry 201 must be split or redesigned before deployment.

## 11. Media workflow

### General public media

The admin media workspace performs:

1. reserve a reviewed immutable object key;
2. request a short-lived presigned PUT;
3. send the body with exact signed headers to the same-origin upload relay, which validates and streams it to the R2 S3 endpoint;
4. verify object MIME and byte size with `HeadObject`;
5. mark reviewed status before the asset becomes selectable;
6. publish only through the public custom-domain key.

The operator CLI helper remains available for reviewed, immutable public derivatives:

```bash
npm run r2:upload-reviewed -- \
  <reviewed-local-file> \
  images/<versioned-object-name>.webp \
  image/webp
```

`R2_API` may be copied from a Cloudflare dashboard URL that includes the bucket path. Operator scripts validate the account hostname and reduce that value to the S3 account origin before constructing SDK requests; browser reads never use the S3 endpoint.

### Journal

The structured editor stores Tiptap JSON and plain text. It accepts reviewed cover/inline media references, an optional structured map, and no arbitrary HTML. A revision may reference no more than 40 unique inline media assets.

### Assessment

The confidential path is reserve → private presigned PUT → exact-header upload → verification → short-lived private preview → reviewed immutable public derivative → stimulus reference. A stimulus never points at the private source media ID.

Raw masters in `/assets/` are local consent-gated inputs and are intentionally excluded from Git. Do not assume a fresh clone contains them. Public reviewed derivatives and their evidence records are separate deliverables.

## 12. Verification

Static and isolated gates:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:backend
npm run build
```

Aggregate gate:

```bash
npm run check
```

Browser gate:

```bash
npm run test:e2e
```

The integrated evidence must cover:

- public routes at 320, 375, 768, 1024, 1440, and 1920 CSS pixels;
- touch and keyboard navigation, reusable custom selects/dialogs, reduced motion, and Axe;
- Journal six-row cursor pages and noindex cursor variants;
- Password sign-in, identity-only denial, owner/editor/publisher permissions, and audit writes;
- 200-entry CMS ceiling and publication freshness;
- theme save/publish/rollback and safe root serialization;
- Anonymous identity created only after Practice Start;
- malformed/missing/cross-owner attempt parity, answer-key privacy, final-section submit, legacy raw-result reproduction, fixed-form estimate limits, 20-item review, and owned deletion;
- public R2 upload/read and separate private Assessment upload/checksum/derivative flows.

Do not claim a final green integrated run from an earlier pre-Admin/pre-Assessment snapshot. Current evidence and open gates are recorded in `docs/WORKLOG.md` and `docs/INTEGRATION-REVIEW.md`.

## 13. Production environment

Next.js host:

```dotenv
CONVEX_URL=https://your-production-deployment.convex.cloud
CONVEX_SITE_URL=https://your-production-deployment.convex.site
NEXT_PUBLIC_SITE_URL=https://YOUR-EXACT-PRODUCTION-ORIGIN
NEXT_PUBLIC_MEDIA_BASE_URL=https://r2.mukhtada.my.id
```

Convex production deployment:

```text
JWT_PRIVATE_KEY
JWKS
SITE_URL=https://YOUR-EXACT-PRODUCTION-ORIGIN
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_API
R2_ASSESSMENT_BUCKET_NAME
R2_ASSESSMENT_ACCESS_KEY_ID
R2_ASSESSMENT_SECRET_ACCESS_KEY
```

Use a production-only Auth key pair, exact HTTPS origin, least-privilege bucket credentials, and independently configured public/private R2 policies.

## 14. Release checklist

- [ ] Target production Convex deployment is named, approved, and has the intended functions/schema.
- [ ] Production Auth keys are separate from development; `SITE_URL` is the exact HTTPS origin.
- [ ] One real owner provisioning round trip, role-negative checks, and last-owner guard pass.
- [ ] Browser Password sign-up is rejected and the internal provisioning command succeeds only on the named target.
- [ ] Public R2 bucket connection, browser CMS upload, `HeadObject`, immutable key, and custom-domain read pass.
- [ ] Separate private Assessment bucket and least-privilege credentials are configured.
- [ ] Private bucket exact dev/prod CORS, SHA-256 metadata, PUT, verification, preview, and derivative release path pass.
- [ ] Original Assessment content passes validation/provenance checks plus the four academic, rights, accessibility, and bias approvals.
- [ ] Result wording shows raw counts only and no official/predicted claim.
- [ ] Journal content, map, linked media, Member profiles, joined years, role assignments, and separate profile/photo consent are reviewed.
- [ ] Raw masters remain outside Git and no held media is served.
- [ ] Contact, Assessment, media, and audit retention policies are approved.
- [ ] `npm run check` and integrated browser/accessibility suites pass from the release commit.
- [ ] Sitemap includes `/practice`; private attempt/result routes and `/admin` remain non-indexable.
- [ ] No secret appears in a client bundle, repository, screenshot, shell history, or log.

The public R2 custom domain is active. The private Assessment bucket is not configured, and production release remains blocked on the unchecked items above.
