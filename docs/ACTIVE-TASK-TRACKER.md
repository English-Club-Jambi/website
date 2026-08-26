# Active delivery tracker

Last updated: 26 August 2026, Asia/Jakarta

This file is the release checklist for the English Club website. A task is marked complete only when the source, persistent data contract, and proportional verification agree. Public demo records are stored in Convex; runtime pages do not depend on hardcoded fallback rosters, posts, programmes, themes, or practice questions.

## Foundation and public site

- [x] Research and audit all files in `docs/references/` without treating supplied images as the brand.
- [x] Record the product plan, PRD, blueprint, design direction, design system, database, setup, R2 setup, and research evidence in Markdown.
- [x] Build the Next.js company and organisation profile with Home, About, Activities, Programs, Members, Practice, Journal, and Contact routes.
- [x] Keep the public design bright, themeable, distinctive, responsive, and free of ASCII-symbol icons.
- [x] Use Heroicons, generated temporary identity assets, restrained motion, reduced-motion behavior, and a faded photographic hero layer.
- [x] Repair the Home hero and activity controls at 320 px, 412 px, and Pixel-sized mobile viewports.
- [x] Remove the mobile hit-test obstruction and verify real touch interaction without stopping port 3987.
- [x] Use port 3987 as the default local port.
- [x] Use `https://r2.mukhtada.my.id` for reviewed public R2 derivatives.

## Members

- [x] Add the five role levels and the supplied Coordinator/Core/Board responsibilities without inventing an expansion for UPA.
- [x] Render the member directory as a true responsive grid.
- [x] Seed the demonstration member identities into Convex and connect the same records to public `/members` and `/admin/members`.
- [x] Add reusable custom role, responsibility, and joined-year filters.
- [x] Keep public-facing copy free of placeholder, sample, test, and implementation-language disclosures.
- [x] Preserve consent and publication controls for real member records.

## Journal and content management

- [x] Make the Journal archive denser and cursor-paginated at six summaries per page.
- [x] Fix the sticky story preview so scroll-driven selection is deterministic.
- [x] Add protected admin management for page copy, global copy, programmes, members, media, themes, audit events, and journals.
- [x] Add a structured Tiptap journal editor with reviewed images and map nodes.
- [x] Store reviewed public images in Cloudflare R2 and metadata/revisions in Convex.
- [x] Replace general-admin `window.confirm` calls with the shared accessible async confirmation dialog.

## Administration and themes

- [x] Use a rounded, semi-neobrutalist admin visual system with responsive navigation and touch-safe controls.
- [x] Resolve Convex from server `CONVEX_URL`; do not require a duplicate `NEXT_PUBLIC_CONVEX_URL`.
- [x] Add protected password authentication, owner bootstrap/provisioning, permission checks, and audit records.
- [x] Add editable, versioned light/dark theme recipes, previews, accessibility checks, publish, rollback, and seeded presets.
- [x] Keep private assessment-source media separate from public reviewed derivatives.
- [x] Seed development members, programmes, journals, content, themes, and practice data into the authorised Convex development deployment.

## Practice and Question Bank: verified

- [x] Add the public Practice menu, quick Listening/Reading/Writing/Speaking routes, full practice, attempts, results, and the Home programme quiz.
- [x] Persist attempts under authenticated ownership and keep answers private.
- [x] Build a real Convex Question Bank and random, duplicate-free immutable attempt manifests.
- [x] Seed a sufficiently large original demonstration bank into the development database.
- [x] Add grouped Task Family dropdown sections for Reading, Listening, Writing, and Speaking.
- [x] Add the Question Bank `Add question` entry point and private answer-key authoring.
- [x] Support an optional reviewed R2 illustration on a bank question and render it in Live Practice.
- [x] Render cloze choices at word level so the surrounding sentence remains intact.
- [x] Fix rapid question navigation so every mutation carries the latest attempt revision.
- [x] Fix the stuck `Preparing` state and verify the start flow against the cloud development deployment.
- [x] Keep practice results clearly labelled as English Club estimates, not official ETS scores or certificates.

## Practice and Question Bank: current release blockers

- [x] Rework Writing autosave so typing a character does not disable/remount the textarea; unit coverage types and saves a complete sentence while focus remains in the field.
- [x] Add reusable Listening audio selection, upload, accessible description, preview, and removal controls to Question Bank.
- [x] Require a valid ready public `assessment-audio` derivative before a Listening bank question can become ready/eligible.
- [x] Pin the chosen audio media ID into every new attempt manifest and render the custom-domain audio in Live Practice.
- [x] Show existing source-assessment audio in Question Bank, not only newly authored audio.
- [x] Replace the fragile source-section edit link with direct Question Bank content editing.
- [x] Use copy-on-write when editing any bank question so published content and existing attempts remain immutable.
- [x] Let the direct editor change common wording and media plus the private answer controls for all five item types.
- [x] Treat reviewed compatible questions as allowed by default for Practice Formats; store only explicit per-format allow/disable overrides.
- [x] Verify that Practice Builder capacity and rules match the exact random pool used by public Live Practice.
- [x] Prove an explicitly disabled question is never selected while default-allowed questions can be selected.
- [x] Add a real browser regression that types a full Writing response character by character on desktop, Pixel 7, and 320 px while focus, save state, Axe, console, and overflow checks remain clean.
- [x] Seed or update the cloud development records needed to demonstrate the final audio/edit/format flow.

## Release gates

- [x] Push the final Convex contract to `dev:perfect-greyhound-270` only; do not deploy production.
- [x] Re-run R2 connectivity and a real upload/playback smoke test on the custom domain.
- [x] Replace every public documentary derivative whose consent is pending with a cleared synthetic asset; keep the original derivatives in the ignored local quarantine only.
- [x] Upload every replacement derivative to the reviewed public R2 path and verify its custom-domain response, content type, and size.
- [x] Remove or regenerate tracked admin evidence that exposes an operator login identifier, then repeat an OCR-assisted evidence audit.
- [x] Run full lint, TypeScript, unit, backend, production build, Playwright, Axe, responsive geometry, and screenshot review from the final source.
- [x] Confirm port 3987 remains listening and returns HTTP 200; do not kill or restart it.
- [x] Run dependency, secret, ignored-file, raw-asset/privacy, absolute-path, file-size, and staged-diff audits.
- [ ] Commit every reviewed change to the local Git repository only after all gates pass.
- [ ] Verify the repository is clean after commit.
- [ ] Read and hand off the development owner password only after the successful commit; do not expose R2 or Convex secrets.
