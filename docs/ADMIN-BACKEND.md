# Admin backend, authentication, and R2 runbook

Status: internal-only administrator provisioning and real development-owner round trip verified; real non-owner and production gates remain
Last verified: 26 August 2026
Runtime: Next.js 16.3.2, Convex 1.45.0, Convex Auth 0.0.95, Cloudflare R2

## What this backend guarantees

The CMS boundary lives in Convex, not in a hidden Next.js route. Every admin query, mutation, and R2 action reads the signed identity from `ctx.auth`, resolves an active `adminUsers` row through the stable Auth issuer plus Auth user ID (with a legacy complete-token fallback), and checks a server-owned permission map. Email, display name, route visibility, and browser-supplied role values are never authority.

The implementation adds:

- Convex Auth with browser sign-in only, internal Password account creation, a twelve-character password minimum, and normalized email validation;
- an internal-only account-and-access provisioning action with exact placeholder recovery;
- owner, publisher, and editor permissions;
- member review, consent, archive, and bounded directory management;
- page-copy drafts, optimistic concurrency, immutable published versions, and a public published-only query;
- structured journal drafts, immutable revisions, publish/archive controls, images by verified media ID, and safe map nodes;
- R2 presigned uploads with server-generated UUID object keys and a required HEAD verification step;
- immutable public-theme versions, server-authoritative colour derivation and accessibility checks, atomic publish/rollback pointers, and theme events;
- a separate CMS audit trail.

No reusable default credential is stored in source. Existing journal posts and public member reads remain valid.

## Authorization matrix

| Capability | Editor | Publisher | Owner |
| --- | ---: | ---: | ---: |
| Read/save page copy | yes | yes | yes |
| Publish page copy | no | yes | yes |
| Read/save journal drafts | yes | yes | yes |
| Publish/archive journal stories | no | yes | yes |
| Read/manage members | yes | yes | yes |
| Read/upload/archive media | yes | yes | yes |
| Read/save theme draft | yes | yes | yes |
| Publish/rollback theme | no | yes | yes |
| Grant or disable admin access | no | no | yes |
| Read the cross-CMS activity log | no | no | yes |

The final active owner cannot be disabled or demoted.

## Convex cloud configuration

`.env.local` selects the cloud deployment for the CLI and supplies public Next.js values. Convex actions do not read local shell secrets after deployment. Set the following values in the intended Convex cloud deployment as deployment environment variables.

Before every `convex env set`, `convex dev --once`, or deploy command, identify and announce the target deployment. Production changes need a fresh explicit approval.

### 1. Auth signing keys

Generate the keys headlessly. Do not run the interactive Convex Auth wizard.

```bash
node -e 'import("jose").then(async({generateKeyPair,exportPKCS8,exportJWK})=>{const k=await generateKeyPair("RS256",{extractable:true});const priv=await exportPKCS8(k.privateKey);const pub=await exportJWK(k.publicKey);process.stdout.write(JSON.stringify({JWT_PRIVATE_KEY:priv.trimEnd().replace(/\n/g," "),JWKS:JSON.stringify({keys:[{use:"sig",...pub}]})}))})' > .convex-auth-jwt-keys.json
```

Set these deployment variables without printing their values into logs:

- `JWT_PRIVATE_KEY`
- `JWKS`
- `SITE_URL=http://localhost:3987` for the current development deployment

Use the deployment dashboard or the quoted `NAME=VALUE` CLI form. A private key starts with dashes, so the two-argument CLI form is unsafe for parsing.

```bash
npx convex env set "JWT_PRIVATE_KEY=<value>"
npx convex env set "JWKS=<value>"
npx convex env set "SITE_URL=http://localhost:3987"
```

Delete `.convex-auth-jwt-keys.json` immediately after the values are stored. It is not application source and must never be committed. `.auth-keys.json` is reserved for the ignored operator-owned admin credential record and must never be overwritten by signing-key output.

For production, set `SITE_URL` to the exact HTTPS site origin and generate a separate key pair. Do not reuse development signing keys.

### 2. R2 credentials

Set these in the Convex cloud deployment:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_API=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

`R2_AUTH_TOKEN` is an account/API management token and is not used by the S3-compatible upload action. Keep it out of the application runtime unless another documented operation needs it. `R2_PUBLIC_DEV` is not used to build asset URLs: published media always resolves through `https://r2.mukhtada.my.id`.

The presigned upload URL must use the R2 S3 endpoint. Cloudflare does not support presigned PUTs through a custom public domain. The custom domain is the read URL after verification.

The Next.js runtime also needs `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, and `R2_API` as server-only variables. It uses them to reject any relay target outside the configured bucket; it does not receive either S3 secret.

### 3. R2 CORS

The current editor sends the file body to the same-origin `/api/admin/media-upload` route. That route accepts only a five-minute Convex-issued PUT URL for the configured HTTPS R2 bucket, checks the signed method, path, size, MIME type, cache control, and signature shape, then streams the body to R2 without following redirects. Convex still performs the final `HeadObject` check before marking the media ready.

This relay keeps the editor working when the bucket has no CORS policy. A direct browser PUT removes one network hop and remains the preferred production path once an origin-specific bucket policy is installed. Add the production origin when it exists; do not replace it with `*`.

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3987",
      "https://YOUR-PRODUCTION-DOMAIN"
    ],
    "AllowedMethods": ["PUT", "HEAD", "GET"],
    "AllowedHeaders": ["Content-Type", "Cache-Control"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The upload action returns `requiredHeaders.contentType` and `requiredHeaders.cacheControl`. The browser must send both exact values with the PUT. A mismatched content type or cache control fails the signature or the verification step.

## Internal administrator provisioning

The `/admin` route has no sign-up state. Announce the deployment, then run:

```bash
npm run admin:provision
```

The terminal prompts for the profile and hides password input. Automation may use `--generate-password`; the generated password is shown once after success and must go directly into a password manager. The script invokes only `internal.adminProvisioning.provisionPasswordAdmin`, which creates or explicitly recovers the Password account and binds the corresponding Auth user to an active `adminUsers` row. The first administrator must be an owner.

The narrow `--repair-placeholder <exact-value>` option can rebind a sole active legacy owner only when its token identifier exactly matches, it has no Auth user binding, and the requested role remains owner. It cannot replace an arbitrary or multi-admin deployment.

`--recover-existing` is only for an interrupted operator flow that already created the named Password account. It must be combined with the exact guarded placeholder repair in that migration case. Recovery binds the verified Auth user first, rotates the password second, and invalidates existing sessions last; normal provisioning must not set this flag.

A provisioned Password credential is persistent. Convex Auth keeps a one-way hash
on `authAccounts`; the application has no password-expiry timer and normal sign-in or
session refresh never rotates it. Expiring or invalidating an `authSession` does not
change the Password account secret. Run automated QA with a separate
development-only administrator rather than recovering a human operator account.

## API contract

### Authentication and administrators

| Function | Reachability | Bound / rule |
| --- | --- | --- |
| `api.adminUsers.whoAmI` | signed or unsigned caller | returns only the caller's identity |
| `api.adminUsers.me` | signed caller | active admin record or `null` |
| `internal.adminProvisioning.provisionPasswordAdmin` | deployment operator only | creates/verifies Password identity and binds reviewed role |
| `internal.adminUsers.bindProvisionedPasswordAccount` | internal action only | verifies exact account/user/issuer before insert or guarded repair |
| `internal.adminUsers.bootstrapOwner` | legacy internal seam | retained for migration/tests; not the account workflow |
| `api.adminUsers.listPage` | owner | cursor page of exactly 20 |
| `api.adminUsers.setAccess` | owner | target token identifier is management data, never caller identity |

### Page copy

| Function | Permission | Contract |
| --- | --- | --- |
| `api.adminContent.getPageWorkspace` | `content:read` | at most 120 indexed keys for one page/locale |
| `api.adminContent.saveDraft` | `content:edit` | expected revision, conflict result, 5,000 plain-text / 50,000 Markdown character cap |
| `api.adminContent.publish` | `content:publish` | inserts immutable version then changes one pointer |
| `api.siteContent.getPublishedPage` | public | returns published values only, at most 120 |

### Journal

| Function | Permission | Contract |
| --- | --- | --- |
| `api.adminPosts.listPage` | `journal:read` | cursor page of exactly 12 |
| `api.adminPosts.getWorkspace` | `journal:read` | one post plus draft/published revision and bounded inline-media projections |
| `api.adminPosts.listRevisions` | `journal:read` | metadata only, newest first, maximum 30 |
| `api.adminPosts.getRevision` | `journal:read` | one selected revision plus at most 40 ready inline-media projections |
| `api.adminPosts.saveDraft` | `journal:edit` | immutable revision and expected-revision conflict result |
| `api.adminPosts.publish` | `journal:publish` | copies one reviewed revision into the public post projection |
| `api.adminPosts.archive` | `journal:publish` | removes the story from public indexed reads |

The editor payload is JSON, not HTML. The backend accepts a fixed Tiptap-compatible subset: doc, paragraphs, level-two/three headings, block quotes, ordered and bullet lists, list items, text, hard breaks, bold, italic, HTTPS/mailto links, verified image media IDs, and coordinate-based map nodes. The persisted image node remains exactly `image` and stores `mediaId`, `alt`, and an optional caption; it deliberately stores no `src`. Raw HTML, script URLs, arbitrary embeds, nested documents, more than 40 unique inline images, unbounded trees, non-finite coordinates, and unknown nodes are rejected.

`getWorkspace` and `getRevision` resolve those IDs into an `inlineMedia` array containing only `{ mediaId, publicUrl, alt, width, height }`. Resolution is permission-checked and bounded to the 40 IDs accepted by the document validator. Only ready `journal-inline` or `page-image` records with verified dimensions are projected. A pending, rejected, or archived record remains referenced in the immutable JSON so the editor can show a missing-asset state, but it receives no usable URL. Revision history stays metadata-only; selecting one row calls `getRevision`, avoiding up to 30 history rows multiplied by media reads.

`api.posts.getPublishedBySlug` performs the same bounded projection against `publishedRevisionId` only. It never follows `draftRevisionId`. Public archive summaries and featured/list cards receive neither `editorJson` nor `inlineMedia`, keeping the list payload small. Draft-only, pending, archived, wrong-purpose, and unrelated media are not included in the public detail projection.

Published journal DTOs retain the legacy optional `coverKey` and add an optional `coverMedia` object with the exact shape `{ mediaId, publicUrl, alt, width, height }`. The detail query, featured query, bounded list, and six-item archive page resolve it from the published post's `coverMediaId`; they never inspect the current draft revision's cover. Only ready `journal-cover` or `page-image` records with verified dimensions are projected. A missing, pending, rejected, archived, or wrong-purpose asset leaves `coverMedia` absent while `coverKey` remains available for checked-in legacy covers. This costs at most one indexed document read per returned story: six for an archive page and twelve for the explicitly capped legacy list.

Cover editing is tri-state: an omitted argument preserves the current revision or
legacy cover, a reviewed media ID replaces it, and `null` records an explicit removal
on the immutable draft revision. Public reads continue following
`publishedRevisionId` until publication. Their `updatedAt` and sitemap value use the
publication timestamp, so saving a private body or cover draft cannot leak editorial
activity into public metadata.

### Media and R2

| Function | Permission | Contract |
| --- | --- | --- |
| `api.r2.createAdminUploadUrl` | `media:upload` | UUID key, fixed MIME allowlist, 10 MiB maximum, five-minute PUT with signed size, MIME type, and cache control |
| `api.r2.verifyAdminUpload` | `media:upload` | HEAD checks content type, byte size, and immutable cache control |
| `api.adminMedia.listPage` | `media:read` | cursor page of exactly 24 for one status and optional purpose |
| `api.adminMedia.archive` | `media:upload` | keeps the R2 object but removes it from ready selection |

Allowed admin upload types are AVIF, JPEG, PNG, and WebP. Member portraits are restricted to AVIF or WebP and use `members/profiles/<uuid>.<ext>`, matching the public member-photo contract. Other CMS media uses `uploads/<purpose>/<uuid>.<ext>`. SVG is intentionally excluded from browser-admin uploads.

AWS SDK versions from 3.729.0 add CRC32 to S3 PUT calls by default. Presigning without a body turns that default into a checksum for an empty payload, which cannot describe the later image bytes. The R2 signer uses `requestChecksumCalculation: "WHEN_REQUIRED"`, binds `content-length`, `content-type`, and `cache-control`, and leaves the payload hash as `UNSIGNED-PAYLOAD`. The same-origin route rejects checksum query parameters it cannot prove against the streamed body; the following HEAD check supplies the authoritative size and metadata gate.

A ready media view returns `https://r2.mukhtada.my.id/<objectKey>`. The database stores the object key, not an old `r2.dev` URL.

### Themes

| Function | Permission | Contract |
| --- | --- | --- |
| `api.adminThemes.ensureDraft` | `theme:edit` | creates the single shared draft from current/default recipe |
| `api.adminThemes.getWorkspace` | `theme:read` | fixed draft/current pointer reads and structured validation issues |
| `api.adminThemes.saveDraft` | `theme:edit` | normalizes finite OKLCH data and checks expected revision |
| `api.adminThemes.publishDraft` | `theme:publish` | derives the snapshot server-side and blocks failed contrast checks |
| `api.adminThemes.rollback` | `theme:publish` | repoints to an immutable version; never edits history |
| `api.adminThemes.listVersions` | `theme:read` | newest first, maximum 30 |
| `api.adminThemes.listEvents` | `theme:read` | newest first, maximum 50 |
| `api.publicThemes.getPublished` | public | name, public revision, contract version, snapshot only |

Draft recipes never affect the public pointer. The Convex mutation imports the same pure colour contract used by preview code, normalizes it into sRGB-safe structured OKLCH channels, recomputes derived tokens, and requires every blocking accessibility check to pass. A browser cannot submit CSS, a token name, an actor, a version number, or a trusted snapshot.

## Migration and compatibility

The schema change is additive:

- Convex Auth contributes new auth tables.
- Existing `posts` gain optional revision, media, and actor pointers.
- Existing posts without a revision keep rendering their legacy Markdown `body`.
- New post revisions live in a separate immutable table; large editor history does not grow the post row.
- New content, media, admin, audit, and theme tables do not tighten populated records.
- Public theme and page-copy queries return `null` or an empty list until configured, so checked-in site copy and CSS remain the fallback.

No data backfill is required before the first deployment. Do not make the optional legacy post fields required until every existing record has been migrated and the change has been rehearsed.

## Verification evidence

Completed without starting, stopping, or restarting port 3987:

- `npm run typecheck` — backend checkpoint passed before the admin UI lane landed; the current integrated command exits on typed-route errors in generated Next validation plus `src/components/admin/admin-overview.tsx` and `src/components/admin/admin-session.tsx`. No Convex error is present in that output, but the root workflow must rerun the command after the UI route types are repaired.
- Focused ESLint for the Convex cover/media contract and backend test passes. The current integrated `npm run lint` is gated by a synchronous effect-state update in `src/components/admin/content-manager.tsx`; this backend lane did not modify that UI file.
- `npm run test:backend` — 23 tests passed across public and admin backend suites.
- `npm test` — 62 assertions passed across 11 files, but the integrated command remains a gate because `tests/unit/journal-archive.test.tsx` leaves two React scheduler callbacks after jsdom teardown (`window is not defined`). The journal-archive test owner must clear those unhandled errors before the full suite is considered green.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- Convex authz deterministic scan — no public actor/user ID authorization arguments; every public ID-based admin operation has a server-side admin permission check.

Backend tests prove:

- bootstrap is one-time;
- a matching email with a different token identifier receives no access;
- unauthenticated, unknown, disabled, and insufficient roles are rejected;
- the last owner is protected;
- content conflicts do not overwrite and only published values are public;
- editor roles cannot publish;
- journal revisions reject HTML, JavaScript links, and invalid maps;
- saved image nodes round-trip with the node name `image` and an exact five-field media projection;
- revision media lookup is capped at 40 unique IDs and history rows do not fan out media reads;
- pending or archived assets receive no admin URL, and draft-only media never enters the public DTO;
- the public detail projection follows only the immutable published revision while archive summaries remain media-free;
- published cover projections carry exactly five reviewed fields across detail, featured, list, and archive DTOs while draft, archived, and wrong-purpose covers remain unavailable;
- theme publish/rollback is permissioned and evented;
- R2 signing rejects non-admins before any credential lookup;
- the same-origin relay rejects cross-site requests, foreign hosts, path traversal, altered signature shapes, unsigned metadata, missing sizes, and files over 10 MiB before contacting R2;
- a member portrait cannot publish until its media record is verified;
- ready URLs use `r2.mukhtada.my.id`.

## Remaining operator gates

The backend is deliberately not deployed or bootstrapped by this lane. Before calling the CMS production-ready, the integration owner must still:

1. set Convex Auth and R2 variables on the intended cloud deployment;
2. push the functions/schema to the announced non-production target first;
3. repeat the proven development owner flow on the explicitly approved production deployment;
4. verify editor/publisher negative permissions with real cloud identities;
5. run an actual presigned PUT with the returned required headers, then HEAD verification and custom-domain GET;
6. render the published Tiptap JSON through an allowlisted React renderer—never `dangerouslySetInnerHTML`;
7. protect the Next admin layout for navigation and noindex UX while retaining Convex as the real authorization boundary;
8. add production origins to R2 CORS and use separate production auth keys;
9. run the integrated E2E, Axe, screenshot, and deployment checks in the root workflow.

Convex Auth is currently a beta library. Public Password sign-up is disabled; account creation is a deployment-operator operation. Before production, the club should still decide whether to retain internal Password provisioning or move to a verified institutional identity provider.

## Primary references

- [Convex Auth](https://docs.convex.dev/auth/convex-auth)
- [Convex authentication in functions](https://docs.convex.dev/auth/functions-auth)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)
