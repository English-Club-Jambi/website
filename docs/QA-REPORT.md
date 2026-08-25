# English Club QA Report

Verified: 26 August 2026
Scope: integrated public site, Admin CMS, Assessment Lab, production Next.js build, Convex Cloud development deployment, Cloudflare R2 public delivery, responsive Chromium automation, accessibility, motion, focus, security, and manual screenshot inspection
Verdict: **integrated development release candidate complete; no known P0 or P1 source defect**

This verdict does not authorize a public production release. A real first-owner Auth round trip, a separate private Assessment R2 bucket, reviewed Assessment content, retention decisions, real Member consent, and verified organisation facts remain release inputs.

## 26 August integrated verification

| Gate | Command or method | Current result |
| --- | --- | --- |
| Type safety | `npm run typecheck` | Passed |
| Static analysis | `npm run lint` | Passed |
| Unit and component behavior | `npm test` | 37 files / 140 tests passed |
| Convex behavior | `npm run test:backend` | 3 files / 39 tests passed |
| Complete browser matrix | `npm run test:e2e` | 162 cases: 142 passed, 20 intentional viewport-specific skips, 0 failed |
| Production build | `npm run build` in an isolated source copy | Passed; 30 App Router entries generated. The live development `.next` directory was not touched. |
| Convex bundle | `npx convex codegen --dry-run --typecheck=enable` | Schema, functions, generated bindings, and TypeScript validation passed |
| Convex Cloud development sync | `npm run convex:push` | Functions ready on `perfect-greyhound-270` for team `nasution`, project `english-club` |
| Former Admin runtime failure | Direct cloud query plus `/admin` browser smoke | `bootstrapState` is absent from the client and generated bindings; `/admin` returns 200 with no page or console error |
| Public Assessment catalogue | Direct `assessments:listPublished` query | Function exists and returns a valid empty page because no reviewed Assessment version is published |
| Public R2 | `npm run r2:check` plus custom-domain object read | Bucket check returned `{ "ok": true }`; `r2.mukhtada.my.id` returned the reviewed WebP derivative over HTTPS |
| Admin confirmation | Unit plus three-project Playwright | One reusable async modal covers Journal, Member, Media, Theme, and Assessment actions; pending, retry, focus trap/return, Escape, touch, Axe, and 320 px geometry passed |
| Dependency audit | `npm audit --omit=dev` | 0 vulnerabilities |
| Development server | listener and HTTP probes after every final gate | Port 3987 remained live; Home and Admin returned HTTP 200 |

The public Assessment catalogue intentionally remains in its reviewed-empty state. Confidential Assessment uploads intentionally remain disabled while `R2_ASSESSMENT_*` credentials are absent. No administrator identity or owner row was fabricated merely to make a screenshot look complete.

## 25 August public-site baseline

The table below is retained as the earlier public/Member baseline. The integrated results above supersede its test counts without invalidating its route-specific evidence.

| Gate | Command or method | Result |
| --- | --- | --- |
| Aggregate static gate | `npm run check` | ESLint, TypeScript, 6 Vitest files / 23 tests, and production build passed |
| Production output | `next build` inside the aggregate gate | 11 route entries generated; `/members`, Contact, Journal, and sitemap retained their intended dynamic boundaries |
| Browser suite | `NEXT_PUBLIC_MEDIA_LOCAL_FALLBACK=1 npm run test:e2e` | 78 cases: 72 passed, 6 intentional viewport-specific skips, 0 failed |
| Convex Cloud | Cloud CLI push, seed, public queries, and contact E2E | Functions are active, three journal records are available, contact mutations persist, and the public Member query returns the valid empty array that activates showcase mode |
| R2 connection | `npm run r2:check` | `HeadBucket` returned `{ "ok": true }` from the internal Convex Node action |
| R2 upload path | Operator helper plus `HeadObject` | Six cleared generated derivatives uploaded; MIME and byte size verified; existing keys rejected |
| Custom media domain | Direct HTTPS reads plus two desktop visual browser tests without local fallback | Home hero, Members hero, and portrait sheet returned HTTP 200 through `r2.mukhtada.my.id`; Next Image accepted the new remote host and both visual tests passed |
| Route contract | Playwright | Home, About, Activities, Members, Journal, story detail, Contact, and 404 exposed the expected primary heading or recovery state |
| Responsive contract | Playwright plus screenshot inspection | No document overflow at 1440 px, Pixel 7, or 320 px; header geometry passed at 880, 900, 1024, and 1440 px; roster resolves to 5 columns on desktop and 2 columns on both narrow projects |
| Member selector and showcase | Radio, fixture, keyboard, and pointer tests | Fifteen unique profiles cover all five roles and every supplied assignment; Coordinator filters to five; state never depends on scroll position |
| Journal reading line | Two-step wheel test and paired screenshots | Companion images changed deterministically without pointer hover |
| Mobile navigation | Native dialog E2E | Focus contained, Escape closed, body lock cleared, and focus returned to the opener |
| Theme | Reload test and screenshots | Bright default and saved dark selection passed without hydration mismatch |
| Contact | Real Convex Cloud submission | A valid consented enquiry persisted and the success state was announced |
| Accessibility | Axe WCAG A/AA checks | No detectable violations on Home, Members, Journal, story detail, or Contact in all three projects |
| Reduced motion | Playwright media emulation | Transition duration collapse and preserved meaning passed in all three projects |
| Icon audit | Source search and dependency inspection | Heroicons 2.2.0 supplies interface symbols; no ASCII or Unicode glyph is used as an icon |

Environment recorded by the project: Next.js 16.3.2, React 19.2.8, Convex 1.45.0, Vitest 4.1.11, Playwright 1.62.1.

Next development, production start, SEO fallback, R2 local CORS example, and Playwright all use port `3987`.

## Browser matrix

| Project | Viewport or device | Main coverage |
| --- | --- | --- |
| `desktop-chromium` | 1440 x 1000 | All routes, Axe, skip link, relays, Member selector, Journal reading line, contact persistence, theme, reduced motion, and light/dark evidence |
| `mobile-chromium` | Pixel 7 | All routes, Axe, native-dialog focus containment, Member composition, contact persistence, theme, reduced motion, and mobile evidence |
| `narrow-chromium` | 320 x 800 | All routes, heading bounds, zero horizontal overflow, Member composition, Axe, contact persistence, theme, reduced motion, and full-page evidence |

Six skips are intentional: mobile navigation runs only on the Pixel 7 project, while intermediate desktop header geometry and the Journal reading-line companion each run only on desktop. The skipped layouts still retain complete source content and normal links.

## Reproduced defects and final repairs

| Defect | Reproduction | Repair | Verification |
| --- | --- | --- | --- |
| `Exchange` split onto a stray final letter | User screenshot and desktop state selection | Restored normal word breaking, used container-relative sizing, and rebalanced the companion grid | Route and interaction tests plus selected-state screenshot |
| Activity companion alignment drift | Manual 1440 px crop | Top-aligned media, widened text space, and stacked below 880 px | Desktop, Pixel 7, and 320 px inspection |
| Journal picture changed inconsistently | Stationary pointer plus two wheel steps | Removed hover selection; a reading-line observer now controls the desktop preview | Dedicated first/second screenshots and deterministic E2E |
| Journal preview caption started lower than its list | Measured sticky geometry | Anchored the preview to the header height and aligned its grid columns | Desktop inspection |
| Mobile focus escaped the dialog | Initial mobile E2E | Added explicit focus wrapping, synchronous initial focus, Escape handling, and focus return | Mobile focus test passed |
| Contact copy contrast measured 4.23:1 | Axe in three projects | Replaced translucent signal ink with the full semantic color | Axe passed in all projects |
| Member radio label intercepted pointer clicks | First Member E2E run | Expanded the transparent native radio input over its complete label | Pointer, keyboard, selected-state, and Axe tests passed |
| Server adapters missed the current cloud variable name | Contact and Journal calls after switching from local development | Centralized URL resolution on `CONVEX_URL` with a compatibility fallback | Cloud Journal, Member, and contact paths passed |
| Cloud Journal had no records | First full cloud browser run | Ran the idempotent seed against the selected development deployment | Journal route, preview, detail, sitemap, and full browser suite passed |
| Reduced-motion test assumed two transition entries | First Member motion assertion | Asserted the effective computed duration instead of a list shape | Reduced-motion checks passed in all projects |
| Upload network failure could expose a URL through an unhandled exception | Security review of the operator helper | Wrapped direct PUT in a generic failure branch that never includes the signed URL | Lint, type, tests, and source inspection passed |
| Staggered roster opacity weakened text contrast during entry | Axe caught intermediate blended colors in the former roster list | Kept the transform stagger but removed text opacity animation and reset delay for reduced motion | Axe passed on Members in all three projects |
| A stale `next dev` process made visual tests wait on the R2 development host | Targeted screenshot run reused the previous app port | Stopped the stale process and ran final evidence against `next start` with byte-identical local derivatives | Complete browser suite and serial visual retakes passed |

## Manual visual audit

| Dimension | Result | Note |
| --- | --- | --- |
| Direction | Pass | Language remains the primary identity; the generated scene supplies atmosphere and fades into the page |
| Hierarchy | Pass | The hero, role atlas, companion panel, member contact sheet, and join close have distinct jobs |
| Alignment | Pass | Five role channels, copy columns, sticky companion, shared card rules, roster heading, and shell align at the inspected widths |
| Mobile | Pass | The 320 px H1 stays at two lines, the role rows retain labels and support copy, the roster remains a readable two-column grid, and no horizontal overflow appears |
| Theme | Pass | Light remains bright without becoming blank; dark preserves emphasis and text contrast |
| Motion | Pass | Selection motion is deterministic and limited to transform/opacity; reduced motion removes spatial movement |
| Iconography | Pass | Heroicons supply controls and role symbols; punctuation remains text only |
| Privacy | Pass with documented showcase boundary | The 15 names, biographies, and portrait cells are fictional source-only presentation data, never enter Convex, and disappear when a real reviewed profile publishes; real profile and portrait consent gates remain unchanged |
| Accessibility | Pass with boundary | Automated Axe and keyboard paths pass; no manual VoiceOver, NVDA, Safari, or 200 percent zoom session was available |
| Performance | Pass with boundary | Routes are server-first and derivatives are compact; no field Core Web Vitals or production Lighthouse result exists yet |

## Screenshot evidence

| File | What it proves |
| --- | --- |
| `members-desktop-light.png` | Bright hero fade, five aligned channels, complete consent state, and full page rhythm |
| `members-desktop-roster-light.png` | Five-column member contact sheet, portrait crops, shared rules, role icons, names, and assignments at viewport scale |
| `members-coordinator-desktop-light.png` | Deterministic selected Coordinator state and five verified division labels |
| `members-desktop-dark.png` | Dark semantic mapping, selected role visibility, and roster contrast |
| `members-mobile-light.png` | Pixel 7 stacking, role detail density, touch layout, and footer composition |
| `members-320-light.png` | Narrowest supported heading, controls, roster state, and zero horizontal overflow |
| `members-mobile-roster-light.png` | Pixel 7 two-column roster, portrait crops, role icons, and readable card hierarchy at viewport scale |
| `members-320-roster-light.png` | 320 px two-column roster, complete names, assignments, and biography rhythm at viewport scale |
| `redesign-home-desktop-light.png` | Bright homepage, faded generated hero, Sentence Playground, and page rhythm |
| `redesign-home-desktop-dark.png` | Persistent dark mapping and hierarchy |
| `redesign-activities-selected-dark.png` | `Exchange` fits one line and its companion placement aligns |
| `redesign-home-mobile-light.png` | Pixel 7 homepage composition and stacked media |
| `redesign-mobile-menu-light.png` | Heroicon close control and full-screen navigation dialog |
| `redesign-home-320-light.png` | Narrow homepage composition and overflow boundary |
| `redesign-journal-preview-first.png` | First story selected at the desktop reading line |
| `redesign-journal-preview-second.png` | Later wheel step selects the next story image |

All evidence lives under `docs/evidence/`. Full-page files prove document hierarchy. The two viewport Journal captures are authoritative for sticky state because stitched full-page capture does not represent one sticky viewport.

## Cloud and storage boundary

- The selected Convex development deployment is cloud-hosted. Playwright starts only the Next.js production server.
- The empty public Member result remains the database truth. The 15 visible showcase profiles are code-owned fictional presentation data and never cross into Convex.
- Six generated derivatives, including the AVIF/WebP portrait sheet, are verified in R2. Documentary images remain local because participant consent is pending.
- The custom media domain `https://r2.mukhtada.my.id` resolves over IPv4 and IPv6, serves valid TLS, and returns the verified portrait object with HTTP 200 and Cloudflare cache `HIT`.
- `NEXT_PUBLIC_MEDIA_BASE_URL` now selects that custom domain. The former `r2.dev` origin is no longer an active project route.

## Release boundary

Before public production release:

- obtain written consent for each public participant profile and photograph;
- supply the canonical site domain and custom R2 media domain;
- configure and verify the production Convex deployment and its five R2 environment values;
- upload only newly cleared, stripped derivatives with immutable versioned keys;
- supply any legal organisation, retention, contact, and social facts intended for publication;
- run the same accessibility, form, media, metadata, cache, and responsive smoke tests against the deployed domains.

No public production deployment was performed during this QA pass.
