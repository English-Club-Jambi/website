# Final Security and Release Audit

Audit date: 26 August 2026
Audited baseline: `59ee581` (`main`), followed by the repaired working tree
Auditor role: independent, read-only release review
Current verdict: **PASS — the repaired current tree is security/privacy ready to stage and commit**

This review did not deploy Convex, mutate R2 or another cloud service, stage or
commit Git changes, or start, stop, restart, or signal the process using port
3987. The only file written by this audit is this report.

The initial pass found two genuine privacy blockers. Both are resolved in the
current tree and were independently rerun. Old binary blobs remain in local Git
history, but the repository has no remote; that separate caveat is documented
below and is not a current-tree or website-deployment blocker.

## 1. Findings and resolutions

### SEC-REL-01 — Public real-person images lack cleared rights and consent

Initial severity: **blocking privacy and publication defect**
Current status: **resolved**

At the audited baseline, `public/images/` contained 20 AVIF/WebP derivatives
for these documentary keys:

- `club-room-group`
- `club-room-portrait`
- `club-room-selfie`
- `club-room-wide`
- `leeds-auditorium`
- `leeds-group`
- `leeds-panel`
- `shared-work`
- `speaking-session`
- `table-conversation`

The same records in `src/content/media.ts` explicitly declared
`rights: "supplied-unverified"` and `consent: "pending"`. They were not merely
unused files: the public Home and About routes selected documentary keys
directly, Activities selected them through `src/content/site-copy.ts`, and the
development Journal seed used three of them as covers.

This contradicted the repository's own publication boundary:

- `R2-SETUP.md` says raw participant media is consent-gated and a public
  derivative must not be released before rights and consent review.
- `docs/MEDIA-DERIVATIVES.md` says documentary derivatives remain local until
  consent clears.
- `docs/ASSET-AUDIT.md` says every supplied asset contains recognisable faces
  and publication consent must be explicit.

Implemented closure:

1. all 20 files are absent from `public/` and exist only in the ignored,
   recoverable `assets/consent-pending-derivatives/` directory;
2. the public manifest type now permits only `rights: "cleared"`,
   `consent: "cleared"`, `provenance: "generated-synthetic"`, and
   `containsRealPeople: false`;
3. every legacy documentary key resolves to a cleared, people-free v2 asset;
4. `tests/unit/media.test.ts` enforces the manifest and exact public allowlist
   and passed 6/6 assertions;
5. all 18 current public rasters and all 172 stage-candidate rasters passed the
   sensitive-metadata scan with zero errors and zero findings;
6. all 12 v2 R2 objects returned HTTP 200, exact AVIF/WebP MIME, exact local
   byte length and SHA-256, and `public, max-age=31536000, immutable`.

### SEC-REL-02 — Tracked admin screenshots expose operator PII

Initial severity: **blocking for repository publication; sensitive evidence hygiene**
Current status: **resolved in the current tree**

Manual review confirmed an operator email address in
`docs/evidence/admin/admin-owner-real-cloud-desktop.png`. A redacted, upscaled
OCR pass also found email-shaped text in these tracked screenshots:

- `journal-block-editor-desktop-chromium.png`
- `journal-block-menu-desktop-chromium.png`
- `journal-featured-image-desktop-chromium.png`
- `journal-image-upload-success-desktop-chromium.png`
- `member-divisions-desktop-chromium.png`
- `page-copy-independent-scroll-desktop-chromium.png`
- `question-bank-illustrated-seed-desktop-chromium.png`
- `question-bank-task-family-groups-desktop-chromium.png`
- `question-bank-listening-editor-desktop-chromium.png`
- `question-bank-seeded-desktop-chromium.png`

No password, private key, signed R2 query, workstation path, or legacy raw
`r2.dev` origin was detected by OCR. The email is not a password, but it is
unnecessary personal data in a distributable evidence set.

The obsolete owner screenshot is deleted. Authenticated evidence was
recaptured with `tests/e2e/helpers/admin-evidence.ts`, which masks the display
name and login identifier at capture time. Upscaled OCR inspected all 37
current admin/final-QA rasters and found zero privacy patterns. The unusually
tall 23,489-pixel Question Bank image was scanned separately as 14 overlapping
tiles: zero email/domain, signed URL, private key, workstation path, or raw R2
origin findings and zero OCR errors. Exact matching of all three local
credential-file email identities against 649 stage-candidate files also
returned zero matches.

## 2. Checks that passed

### Git and credential boundaries

- The audit began from a clean `main` tree at `59ee581`. The repaired tree is
  intentionally unstaged; `git diff --check` passes and the complete set of
  tracked plus untracked, non-ignored stage candidates was included in the
  final secret, identity, path, metadata, and generated-file scans.
- `.env.local`, `.auth-keys.json`, `.qa-admin-credentials.json`, raw `assets/`,
  `.next/`, `.convex/`, `node_modules/`, Playwright outputs, touch traces, logs,
  coverage, and TypeScript build-info files are ignored.
- `.env.local`, `.auth-keys.json`, `.qa-admin-credentials.json`, and the local
  `$OWNER_CREDENTIALS_PATH` file all had mode `0600` and belonged to the
  current user.
- The owner credential file contained only the expected keys `email`,
  `password`, and `role`; this audit did not print or copy their values.
- Nine unique sensitive value groups were loaded in memory from the local env
  and credential files. Exact-value scanning found **0 matches in current
  tracked or untracked stage candidates** and **0 matches in the complete
  textual Git patch history**.
- A separate signature scan found **0** PEM private-key headers, AWS-style
  access IDs, GitHub, npm, Slack, Stripe, or compact-JWT token shapes.
- No real `/home/<user>/...`, `/Users/<user>/...`, or Windows user-home path appeared in
  tracked project content. Broader `/home/` matches were ETS web URLs, not
  workstation paths.
- No Client Component referenced `process.env`. Browser-exposed variables are
  limited to documented `NEXT_PUBLIC_*` configuration; R2 and Convex secrets
  remain server-side.
- `.env.example` contains empty credential placeholders and the public custom
  media origin; it contains no populated secret.

### Dependencies

Both audits returned exit code 0:

| Scope | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| All dependencies | 0 | 0 | 0 | 0 | 0 |
| Production only (`--omit=dev`) | 0 | 0 | 0 | 0 | 0 |

### Static scanner and manual sink review

`@claude-flow/cli` deep scanning reported 0 critical, 0 high, 4 medium, and 0
low findings. The four medium findings were generic React-XSS warnings for the
only `dangerouslySetInnerHTML` sinks:

| Sink | Manual result |
| --- | --- |
| `src/app/(site)/page.tsx:85` | JSON-LD passes through `serializeJsonLd`, which escapes `<`, U+2028, and U+2029 before insertion. |
| `src/app/(site)/journal/[slug]/page.tsx:86` | Same bounded JSON-LD serializer; no raw HTML renderer. |
| `src/app/layout.tsx:70` | Theme CSS is generated only from finite, range-checked numeric OKLCH channels and fixed token names/selectors. |
| `src/app/layout.tsx:72` | The boot script is a source-code literal; no database, URL, user, or admin content is interpolated. |

The warnings are scanner false positives after sink review, not unresolved XSS
findings. Supporting checks found no other production `innerHTML`, `eval`,
`new Function`, `document.write`, or `javascript:` sink. Rich Journal nodes are
rendered as React elements, links accept only HTTPS or mailto, and fallback
Markdown does not enable raw HTML.

### R2 and Convex secret exposure

- No active legacy `pub-*.r2.dev` URL is present. Remaining `r2.dev` text only
  documents that the development origin is forbidden for production.
- `https://r2.mukhtada.my.id` is the configured public-read origin. Database
  records store object keys rather than credentials or signed URLs.
- R2 access key and secret key reads occur only in Convex Node actions and
  operator seed scripts. The Next upload relay accepts a short-lived signed
  PUT target and validates HTTPS scheme, exact configured R2 hostname, object
  key, content type, content length, immutable cache policy, SigV4 fields,
  five-minute maximum expiry, and same-origin browser requests.
- Sensitive local values did not occur in source, documentation, screenshots
  scanned by OCR, or Git textual history.

### Asset metadata and raw-master boundary

- The repaired public set contains 18 rasters: 12 new v2 relay assets and six
  previously cleared generated derivatives. ImageMagick read every file with
  zero errors and detected **0** GPS, camera/device, author/owner, capture-time,
  or XMP categories.
- A binary marker pass over all public assets found **0** GPS strings,
  camera/vendor or serial markers, source filenames, generator/workstation
  paths, or private-key markers.
- The same checks covered all 172 raster stage candidates and returned zero
  sensitive metadata files, zero errors, and zero binary-marker files.
- There were no JPEG, MOV, MP4, HEIC, TIFF, camera-raw, or other source-master
  extensions in `public/`.
- Raw local `assets/` is ignored. The largest historical Git blobs were
  screenshots/reference images; the ignored 18 MB MOV and multi-megabyte raw
  photographs were not found in Git history.
- The final 200% grayscale OCR pass covered all 37 current admin/final-QA
  rasters. It returned zero email, email-domain, signed-query, private-key,
  workstation-path, or raw-R2-origin findings. The 23,489-pixel-tall image was
  processed separately as 14 overlapping tiles; every tile completed without
  a privacy finding or OCR error.

## 3. Repository size and generated-file hygiene

- The repaired stage-candidate set is approximately 98.64 MiB: 69.82 MiB under
  `docs/evidence/`, 23.29 MiB under `docs/references/`, 1.50 MiB under
  `public/`, and the remainder source/configuration.
- Thirty-two stage candidates exceeded 1 MiB; one exceeded 5 MiB. The largest was
  `docs/evidence/redesign-reference-contact-sheet.png` at 6,815,137 bytes.
- `.git` was approximately 121 MB. This is not a security defect by itself,
  but repeated screenshot revisions are the dominant repository-weight risk.
  Future evidence should use an artifact store or Git LFS, with a small
  reviewed index committed to the repository.
- No tracked `.next`, `node_modules`, coverage, Playwright result, trace, log,
  TypeScript build-info, Python bytecode, or cache artifact was found.
- The tracked `.agents/skills` and `.claude/skills` trees are versioned Convex
  agent instructions recorded by `skills-lock.json`, not runtime caches.

## 4. Commands and evidence ledger

The following read-only commands were run from the repository root. Custom
Node scanners reported only variable labels, file paths, counters, and metadata
categories; they never printed a secret, password, coordinate, or matched OCR
text.

```bash
git status --short
git status --branch --porcelain=v2
git diff --stat
git diff --cached --stat
git diff --check
git log -8 --oneline --decorate
git status --ignored --short
git check-ignore -v .env.local .auth-keys.json .qa-admin-credentials.json \
  .next tsconfig.tsbuildinfo playwright-report test-results assets \
  docs/evidence/mobile-touch-traces
stat -c '%a %U:%G %n' .env.local .auth-keys.json \
  .qa-admin-credentials.json "$OWNER_CREDENTIALS_PATH"
jq -r 'keys | join(",")' "$OWNER_CREDENTIALS_PATH"
```

```bash
npx --no-install @claude-flow/cli security scan --depth full
npx --no-install @claude-flow/cli security scan --check input-validation
npm audit --json --audit-level=low
npm audit --json --audit-level=low --omit=dev
```

```bash
rg -n 'dangerouslySetInnerHTML|innerHTML|outerHTML|document\.write|eval\(|new Function|javascript:' \
  src convex scripts tests
rg -n '/home/[A-Za-z0-9._-]+|/Users/[A-Za-z0-9._-]+' --hidden \
  --glob '!node_modules/**' --glob '!.next/**' --glob '!.git/**' .
rg -n 'pub-[a-z0-9]+\.r2\.dev|r2\.dev' --hidden \
  --glob '!node_modules/**' --glob '!.next/**' --glob '!.git/**' .
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '$1 == "blob" {print $3 "\t" $4}' | sort -nr
```

Additional bounded scanners performed these operations:

1. parsed `.env.local` and the three credential JSON files in memory;
2. selected only secret-like variables (`TOKEN`, `SECRET`, `PASSWORD`,
   `PRIVATE`, `ACCESS_KEY`, `DEPLOY_KEY`, and `ACCOUNT_ID`);
3. searched every current tracked text file and `git log --all -p` for exact
   values while emitting only labels and paths;
4. scanned tracked text for well-known key/token signatures;
5. ran `identify -verbose` over public and tracked raster files and emitted
   category names only;
6. ran Tesseract at 200% grayscale over all 37 current admin/final-QA evidence
   rasters, with the unusually tall image split into 14 overlapping tiles;
7. verified all 12 public v2 objects using unauthenticated read-only GETs from
   the custom R2 domain, comparing HTTP status, MIME, byte length, cache policy,
   and SHA-256 with the local release ledger;
8. enumerated all tracked and untracked, non-ignored stage candidates and
   checked them for large files and generated/cache output.

## 5. Release decision and local-history caveat

The repaired current tree passes the independent privacy/security boundary and
is safe to stage and commit after the maintainer reviews the intended diff.
The parent release workflow separately reports 254 frontend/unit tests and 70
backend tests passing, a successful 26-route production build, Playwright at
191 passed and 40 deliberately skipped, zero dependency-audit findings, all R2
checks passing, and the existing port-3987 service returning HTTP 200. This
audit did not restart that service or rerun deployment-affecting commands.

One non-blocking repository-publication caveat remains: the original photo and
unmasked screenshot blobs still exist in the **local, unpushed Git history**.
There is no configured remote. They are absent from the repaired checkout and
cannot be served by the website build, so they do not block the current tree,
commit, or deployment. Before publishing the entire historical repository,
the maintainer should choose either a clean squashed publication history or an
explicitly authorized history rewrite. This audit did not rewrite history.

**Final verdict: PASS for the repaired current tree.** No credential, private
key, PII screenshot, consent-pending public media, sensitive image metadata,
unreviewed XSS sink, dependency vulnerability, or generated/cache artifact
remains in the stage-candidate boundary.
