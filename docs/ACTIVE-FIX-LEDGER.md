# Active Fix Ledger

Updated: 26 August 2026

This file is the working acceptance ledger for the current administration fixes. It records user-reported symptoms, the evidence behind each diagnosis, and the final proof required before handoff.

## Journal edit compatibility

- [x] Reproduce the blank editor on a published legacy post with no `postRevision` row.
- [x] Confirm the source post still contains its title, excerpt, and Markdown body.
- [x] Load legacy `posts.body` only when neither a valid draft nor published revision exists.
- [x] Keep page opening read-only; create revision 1 only on the first explicit save.
- [x] Cover the legacy-to-revision transition in Convex tests.
- [x] Push the compatibility function to Convex development only.
- [x] Verify the exact reported post renders 191 words and its article headings with zero client errors.
- [x] Re-run the Journal edit regression in the final integrated test pass.

Implementation commit: `9846874 fix: load legacy journal posts in editor`.

## Journal management lifecycle

- [x] Give every administrator with journal access an explicit Edit action.
- [x] Keep immutable revision and audit history intact by using Archive/Restore instead of destructive hard deletion.
- [x] Require publisher or owner permission for Archive/Restore.
- [x] Remove archived stories from public reads and restore the last valid published revision safely.
- [x] Confirm lifecycle transitions, negative permissions, public visibility, and audit records in Convex tests.

## Journal publication retry

- [x] Reproduce the reported `This journal revision is already published` failure by publishing the same saved revision twice.
- [x] Make an exact publication retry idempotent while preserving publisher authorization and optimistic revision checks.
- [x] Return the original publication timestamp and avoid duplicate writes or audit events on retry.
- [x] Mark the current public revision as **Published** in the editor and disable the action until a new revision is saved.
- [x] Verify the reported Leeds edit route at desktop, Pixel 7, and 320 px with no browser errors.
- [x] Push the repaired mutation to `dev:perfect-greyhound-270` only.

## Page Copy scrolling

- [x] Give the content-field rail its own labelled, keyboard-scrollable region on desktop.
- [x] Keep the selected editor in a separate stable pane.
- [x] Reset the editor pane to its top when another field is selected.
- [x] Keep a reusable content-field picker below the tablet breakpoint.
- [x] Prove rail scrolling does not move the editor or document.
- [x] Prove no horizontal overflow at 320 px.

## Journal featured image

- [x] Show the current public cover inside the administrator edit workspace, including legacy `coverKey` records.
- [x] Keep featured media explicit; never promote the first inline image automatically.
- [x] Allow a verified `journal-cover` or `page-image` R2 asset to become the next revision cover.
- [x] Allow the editor to remove a draft cover without losing the legacy public image until publication.
- [x] Keep archive summaries, article detail, social metadata, and modification dates on the immutable published revision.
- [x] Cover selection, removal, legacy fallback, mobile geometry, and public/admin parity in tests.

## Journal image uploads

- [x] Reproduce the editor failure in a real browser and inspect the R2 preflight response.
- [x] Record the root cause: the bucket returns 403 because no CORS policy is configured.
- [x] Keep the browser on the application origin by streaming the file through a constrained Next.js relay.
- [x] Bind the five-minute R2 PUT to the exact bucket, object path, byte length, MIME type, and immutable cache policy.
- [x] Remove the AWS SDK empty-payload CRC32 from presigned journal uploads.
- [x] Keep Convex HEAD verification and the `r2.mukhtada.my.id` read path unchanged.
- [x] Prove upload, insertion, revision save, edit-route reload, custom-domain image persistence, and zero active QA residue on port 3987.

## Administrator credential persistence

- [x] Disable browser account creation; accounts are provisioned internally only.
- [x] Freeze the recovered owner credential and prohibit further automated rotation.
- [x] Store only the password hash in Convex Auth; do not store a recoverable plaintext password in the database.
- [x] Confirm Password accounts have no application-level expiry or automatic rotation.
- [x] Prove the new credential directly against `auth:signIn` without exposing its value.
- [x] Prove two independent browser sign-ins with the same newly reset and frozen password.
- [x] Keep the local handoff credential file ignored by Git and mode `0600`.
- [x] Provision a separate development-only QA owner so later automation never rotates the human owner's password.
- [x] Hand the frozen owner password to the user without rotating it again; repeat it in the final committed handoff.

## Member administration

- [x] Replace the fixed admin-only division dropdown with a managed division catalogue.
- [x] Allow administrators to add, edit, archive/restore, and safely remove an unused division.
- [x] Allow one coordinator per active division and prevent conflicting assignments.
- [x] Preserve legacy static division records while managed division IDs are introduced.
- [x] Add reusable filters for profile status, role, responsibility, and joined year.
- [x] Keep pagination honest and show the count of loaded and matching profiles.
- [x] Seed the existing complete development roster and the default five divisions into the configured Convex development deployment only.
- [x] Verify profile consent and portrait consent remain independent publication gates.
- [x] Verify desktop, Pixel 7, and 320 px layouts, keyboard operation, touch targets, reduced motion, and Axe.

## Contact desk administration

- [x] Keep Join, Propose something together, and Ask a question as three explicit queues matching the public form.
- [x] Add a protected 20-row cursor query backed by exact intent/status indexes; never expose normalized email or source-path fields.
- [x] Add a responsive queue-and-reading-pane workspace with custom status filtering and real email handoff.
- [x] State that status is an internal work note and never sends an email automatically.
- [x] Protect reads and status changes with server-owned permissions and optimistic concurrency.
- [x] Keep contact audit summaries free of names, email addresses, and message bodies.
- [x] Verify the development-cloud route at desktop, Pixel 7, and 320 px with masked PII, touch, Axe, and no overflow.

## Release discipline

- [x] Do not stop or kill port 3987.
- [x] Do not write seed data to production.
- [x] Preserve unrelated working-tree changes.
- [x] Run Convex tests, unit tests, lint, typecheck, production build, and focused browser tests.
- [x] Inspect final screenshots.
- [x] Commit only after the integrated gates are green.
