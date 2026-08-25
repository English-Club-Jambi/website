# English Club administration UI

## Scope

The administration workspace lives under `/admin` and uses its own layout. It does not render the public header or footer.

| Route | Purpose |
| --- | --- |
| `/admin` | Work-area overview and current access level |
| `/admin/pages` | Named public copy from the shared content manifest |
| `/admin/journal` | Paginated story archive |
| `/admin/journal/new` | New structured journal revision |
| `/admin/journal/[postId]` | Story editing, inline media, publishing, and revision history |
| `/admin/members` | Filtered Member records, responsibilities, consent, portraits, and managed divisions/coordinators |
| `/admin/media` | R2 uploads, verification status, and archival |
| `/admin/appearance` | Structured light and dark theme recipes |
| `/admin/activity` | Owner-only audit trail |

The interface is a bright, rounded neobrutalist work surface. Two-pixel rules, compact type, shallow hard shadows, and one cobalt action colour establish hierarchy without gradients or a grid of decorative dashboard cards. All interface symbols use Heroicons.

## Authentication and access

`src/app/(admin)/admin/layout.tsx` resolves the deployment with `getConvexDeploymentUrl()` on the server and passes that public URL to the client provider. The environment therefore needs `CONVEX_URL`; it does not need a duplicate `NEXT_PUBLIC_CONVEX_URL`.

The installed Convex Auth Next.js wrapper does not mount the auth state provider required by its own hook. The admin shell uses the package's client-side `ConvexAuthProvider`, which mounts both the auth state and Convex query providers. This keeps password sign-in and reactive admin queries in one provider tree.

There is no browser sign-up control. Every administrator account is created through the internal provisioning command described in [ADMIN-BACKEND.md](./ADMIN-BACKEND.md). An authenticated identity without an active `adminUsers` record sees a clear access-pending screen, not an identity-management or self-registration path.

Convex checks authorization again for every query and mutation. UI controls mirror that result:

- Editors prepare page copy, journal revisions, member profiles, media, and theme drafts.
- Publishers can also publish content, journal revisions, and themes.
- Owners have publisher rights and can read the audit trail.

## Page copy contract

The Pages workspace reads `content/public-content.ts`. Page labels, keys, formats, default text, and maximum lengths come from that single manifest. It includes the global header and footer copy.

An empty Convex deployment still displays every approved field. Each field opens with the checked-in public text and revision `0`; saving creates its first Convex draft. Stored keys that are absent from the manifest remain visible for diagnosis but are labelled as unused by the public site and cannot be published from the UI.

On desktop, the field rail and selected editor are separate labelled scroll regions;
scrolling a long Home catalogue does not move the copy canvas or document. Selecting
another field resets only the editor pane. Touch layouts replace the rail with the
shared custom Content field picker and retain a single document scroll.

## Journal editor

The journal editor stores the allowlisted Tiptap JSON contract, not HTML. It supports paragraphs, H2 and H3 headings, bold, italic, HTTPS or email links, lists, quotes, reviewed inline images, and bounded coordinate map notes.

An image upload sends its alternative text to the R2 upload contract. The stored node contains `mediaId`, alternative text, and optional caption. Resolved `inlineMedia` URLs hydrate those media IDs when a saved revision is reopened. Captions remain editor-node metadata.

Featured media is an explicit revision field beside the story settings. The editor
shows the current public or legacy cover, lets an administrator upload a reviewed
replacement or deliberately remove it, and never guesses that the first inline image
is the cover. Saving records the choice privately; only publishing that exact revision
changes archive cards, article metadata, and the public header. Private draft work
does not advance the public modification timestamp or sitemap date.

The archive requests 12 rows at a time and provides explicit Edit plus reversible
Archive/Restore controls. Revision history requests at most 20 metadata rows. Large
bodies and inline-media projections are fetched only for the open story.

## R2 media flow

The browser requests a short-lived upload contract from Convex, then sends the exact body and signed metadata to the same-origin `/api/admin/media-upload` route. That route validates the configured bucket and signature contract before streaming to Cloudflare R2; Convex then verifies object metadata. A verified asset uses the public domain `https://r2.mukhtada.my.id`.

General CMS images accept AVIF, JPEG, PNG, and WebP up to 10 MB. Member portraits accept AVIF or WebP. A member portrait keeps profile consent and portrait consent as separate fields.

The Member workspace has two reusable views. Profiles can be filtered by review
status, role, division/position, and joined year without changing the cursor-page
truth shown to the editor. Divisions form a managed catalogue: an administrator can
create or edit a division, select one accountable Coordinator, archive it, and remove
it only after every Member reference is cleared. Coordinator replacement restores
the previous Coordinator's saved Member/Pioneer role instead of silently erasing it.

## Appearance contract

Appearance edits the seven anchors defined by `content/theme-contract.ts`: canvas, surface, ink, muted ink, line, identity, and response. Light and dark modes share the same control structure.

The client preview derives the public token snapshot with the shared contract. Contrast and colour-separation failures are shown beside the preview. Convex normalizes the recipe and repeats validation before publication. Published versions are immutable and may be restored by a publisher or owner.

## Responsive and motion behaviour

- The desktop workspace uses a fixed sidebar and bounded main canvas.
- Below 980 px, navigation moves into a native modal dialog with focus containment, background-scroll locking, and focus restoration.
- Forms collapse to one column below 720 px.
- Controls keep a minimum 44 px touch height.
- The narrow acceptance viewport is 320 px.
- Motion is limited to state transitions, loading feedback, and the navigation entrance. `prefers-reduced-motion` reduces every admin animation and transition.

## Verification evidence

The following checks were completed without starting, stopping, or restarting port 3987:

- `npx next typegen`
- `npm run typecheck`
- focused ESLint for all admin routes, components, and tests
- `npm run test:unit`, 58 assertions across 15 files
- focused admin, manifest, provider, navigation, and rich-editor tests
- `npx playwright test tests/e2e/admin.spec.ts`, three browser projects passed
- Axe WCAG A and AA scan on the hydrated sign-in route
- client console and page-error checks
- touch input checks and horizontal-overflow checks at 320 px, Pixel 7, and 1440 px
- HTTP `200` smoke check for `/admin`

Screenshots:

- [Desktop sign-in](./evidence/admin/admin-sign-in-desktop-chromium.png)
- [Pixel 7 sign-in](./evidence/admin/admin-sign-in-mobile-chromium.png)
- [320 px sign-in](./evidence/admin/admin-sign-in-narrow-chromium.png)

Authenticated screens require an internally provisioned administrator. No reusable default credential is stored in screenshots or source.
