# Technical Research

Research date: 25 August 2026
Scope: public company profile, landing page, journal, and a Convex content backend

## Version snapshot

Registry versions observed during research:

| Package | Version |
| --- | ---: |
| `next` | 16.3.2 |
| `convex` | 1.45.0 |
| `convex-test` | 0.0.56 |
| `@playwright/test` | 1.62.1 |
| `vitest` | 4.1.11 |
| `typescript` | 6.0.3 |
| `eslint` | 9.39.5 |

Sources: [Next.js npm](https://www.npmjs.com/package/next), [Convex npm](https://www.npmjs.com/package/convex), [convex-test npm](https://www.npmjs.com/package/convex-test), [Playwright npm](https://www.npmjs.com/package/@playwright/test), [Vitest npm](https://www.npmjs.com/package/vitest).

Pin exact dependency versions in the lockfile. Do not infer a framework API from an older tutorial.

Implementation note: TypeScript 7.0.2 was current in the registry, but the `typescript-eslint` release bundled with Next.js 16.3.2 rejected the TS 7 API. The project therefore pins the latest TS 6 release, 6.0.3, so lint and type analysis can both run.

The same compatibility pass pins ESLint 9.39.5. Next.js 16.3.2 declares ESLint 9 support, while its bundled import, React, and accessibility plugins do not yet accept ESLint 10.

## Architecture decision

### Facts from primary documentation

- Next.js App Router uses Server Components, Suspense, and Server Functions. Pages and layouts are Server Components unless marked otherwise. [App Router](https://nextjs.org/docs/app), [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- Next.js can prerender public output that does not rely on request-time data. [Public static pages](https://nextjs.org/docs/app/guides/public-static-pages)
- Next.js 16 requires Node.js 20.9 or newer. `next build` no longer runs lint automatically. [Installation](https://nextjs.org/docs/app/getting-started/installation)
- Convex supports `fetchQuery` and `preloadQuery` from Next.js. App Router SSR support is documented as beta. `preloadQuery` uses `cache: 'no-store'`, so the calling Server Component cannot remain statically rendered. [Convex Next.js server rendering](https://docs.convex.dev/client/nextjs/app-router/server-rendering)
- Next.js static export has limits around Server Actions, revalidation, and default image optimisation. [Next.js deployment modes](https://nextjs.org/docs/app/getting-started/deploying), [static export limitations](https://nextjs.org/docs/pages/guides/static-exports)

### Project decision

- Use Next.js 16 App Router with TypeScript.
- Keep Server Components as the default. Limit Client Components to the mobile menu, theme control if retained, motion leaves, form state, and any interactive journal filter added later.
- Prerender `/`, `/about`, and `/activities` from code-owned content.
- Use Convex for published posts, events when dates exist, media metadata for future uploads, and contact submissions.
- Query public blog data from a server helper using `fetchQuery` plus Next.js cache directives when a Convex deployment URL is present.
- Do not place a `ConvexReactClient` provider around the whole public site; there is no need to turn static company-profile pages into reactive clients.
- Use a Next Server Action or a small client Convex call for contact submission. The chosen implementation must expose loading, success, error, and retry states.
- Deploy the frontend to a Node-capable host and Convex to its own production deployment. Do not configure `output: 'export'`.

## Proposed source tree

```text
src/
  app/
    layout.tsx
    page.tsx
    about/page.tsx
    activities/page.tsx
    journal/page.tsx
    journal/[slug]/page.tsx
    contact/page.tsx
    sitemap.ts
    robots.ts
    not-found.tsx
    error.tsx
  components/
    chrome/
    marketing/
    journal/
    forms/
    motion/
  lib/
    content.ts
    convex-public.ts
    image-manifest.ts
    seo.ts
    structured-data.ts
    validation.ts

convex/
  schema.ts
  posts.ts
  events.ts
  submissions.ts
  seed.ts
  seedData.ts
```

Marketing copy that rarely changes should remain versioned in code for the first release. Move it into `siteSettings` only when an actual editor needs to change it without a deployment.

## Rendering and cache model

### Static company profile

`/`, `/about`, and `/activities` use local content and statically imported image derivatives. Client-side code stays in small leaves so the HTML, headings, navigation, and images appear without JavaScript.

### Journal

Facts:

- The `'use cache'` directive can cache an async function or component. `cacheLife` sets lifetime and `cacheTag` names invalidation groups. [use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- `revalidateTag(tag, 'max')` applies stale-while-revalidate behaviour. `updateTag` expires data immediately but only runs from a Server Action. [Revalidation](https://nextjs.org/docs/app/getting-started/revalidating)
- `generateStaticParams` builds known dynamic routes. New slugs may still render on demand when `dynamicParams` stays enabled. [generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)

Recommended helper contract:

```text
getPublishedPosts()
  use cache
  cacheLife('hours')
  cacheTag('posts')

getPublishedPost(slug)
  use cache
  cacheLife('days')
  cacheTag('posts')
  cacheTag(`post:${slug}`)
```

Seed at least one published article before a build that uses Cache Components with `generateStaticParams`. Leave `dynamicParams` enabled. An editor path that publishes a post should expire `posts` and `post:<slug>`.

Direct changes made in the Convex dashboard do not notify the Next.js cache automatically. Accept the TTL for the first release, rebuild, or add a secret-protected route that revalidates. Avoid several unrelated `fetchQuery` calls for one page; Convex documents that separate server-side requests use stateless HTTP clients and do not promise one database snapshot. Return the joined public page shape in one query.

## Convex data rules

### Facts

- `convex/schema.ts` validates stored documents and produces TypeScript types. [Schemas](https://docs.convex.dev/database/schemas)
- Indexed reads use `.withIndex()`. `.filter()` still scans the underlying range; bound a result with `.unique()`, `.take()`, or `.paginate()`. [Indexes](https://docs.convex.dev/database/reading-data/indexes/), [Reading data](https://docs.convex.dev/database/reading-data/)
- Convex pagination uses cursors. [Pagination](https://docs.convex.dev/database/pagination)
- Mutations are atomic and serialisable. [OCC and atomicity](https://docs.convex.dev/database/advanced/occ)
- Registered functions accept object-form `args`, `returns`, and `handler`. Runtime validators are required for public and internal functions. [Function validation](https://docs.convex.dev/functions/validation)

### Project model

The first release can keep author and category fields directly on a post because the archive is small. A later CMS may normalise them. The durable contract is:

```text
posts
  slug: string
  title: string
  excerpt: string
  bodyMarkdown: string
  status: "draft" | "published" | "archived"
  authorName: string
  category: string
  coverImage: string
  coverAlt: string
  featured: boolean
  publishedAt: optional number
  updatedAt: number
  tags: array<string>

  by_slug ["slug"]
  by_status_and_publishedAt ["status", "publishedAt"]
  by_featured_and_status_and_publishedAt ["featured", "status", "publishedAt"]

events
  slug: string
  title: string
  summary: string
  status: "draft" | "published" | "cancelled"
  startAt: number
  endAt: optional number
  venue: optional string
  registrationUrl: optional string
  coverImage: optional string
  coverAlt: optional string
  updatedAt: number

  by_slug ["slug"]
  by_status_and_startAt ["status", "startAt"]

contactSubmissions
  name: string
  email: string
  interest: "join" | "partner" | "ask"
  message: string
  consentAt: number
  status: "new" | "read" | "closed"
  createdAt: number

  by_status_and_createdAt ["status", "createdAt"]
  by_email_and_createdAt ["email", "createdAt"]
```

The public query surface:

```text
posts.listPublished({ paginationOpts })
posts.getPublishedBySlug({ slug })
posts.listPublishedSlugs()
posts.listFeatured({ limit })
events.listUpcoming({ now, limit })
submissions.create({ name, email, interest, message, consent, honeypot })
```

Rules:

- Public queries return only published records.
- Every query and mutation has argument and return validators.
- A list query omits `bodyMarkdown`; it returns only the fields needed by archive rows.
- `listPublished` uses cursor pagination on `by_status_and_publishedAt`.
- Slugs are lower-case and unique. A mutation checks `by_slug` with `.unique()` before insert.
- Body content is Markdown. Raw HTML stays disabled in the renderer.
- `publishedAt` and `updatedAt` are editorial dates. Do not substitute `_creationTime`.
- The submission mutation validates length, consent, and the honeypot, then rate-limits repeated email submissions through `by_email_and_createdAt`.

## Seed policy

- Write an idempotent internal seed mutation keyed by stable slugs.
- Keep sample copy labelled as seed or demonstration content in source comments and documentation.
- Run the seed from CLI during development or with a preview deployment hook. Internal functions cannot be called by a browser client. [Internal functions](https://docs.convex.dev/functions/internal-functions)
- Convex supports `--preview-run` for preview setup. [Convex on Vercel](https://docs.convex.dev/production/hosting/vercel)
- Import may help with bulk fixtures but remains a poor default deployment routine. [Data import](https://docs.convex.dev/database/import-export/import)

## Image delivery

### Local archive

Use privacy-safe derivatives as local static imports. Next.js can infer dimensions and blur placeholders for local images. Only the first LCP candidate receives high loading priority; all other images load lazily. [Next.js images](https://nextjs.org/docs/app/getting-started/images)

### Cloudflare R2 decision

The earlier Convex File Storage option is superseded by the user's 25 August 2026 storage decision. Convex remains the application database; Cloudflare R2 Standard stores media bytes.

- The current R2 free tier applies only to Standard and includes 10 GB-month storage, 1 million Class A operations, 10 million Class B operations per month, and free direct egress. It is included usage, not a hard cap. [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- Production reads use an R2 custom domain. Cloudflare labels `r2.dev` development-only and rate-limited. [Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- The fixed first-release manifest keeps alt, width, height, MIME extension, focal point, rights, consent, and capture-date verification; R2 stores only the derivative bytes.
- `NEXT_PUBLIC_MEDIA_BASE_URL` selects the exact custom-domain prefix, while `next.config.ts` restricts `next/image` to that host and path.
- The public read path needs no R2 token. The implemented private operator helper asks an internal Convex Node action for a 300-second presigned PUT URL, uploads directly to the S3 endpoint, and verifies MIME and byte size with `HeadObject`. Because this is a Node-to-R2 path, browser CORS is not required. [Authentication](https://developers.cloudflare.com/r2/api/tokens/), [presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- Full evidence and rejected options are recorded in `docs/R2-RESEARCH.md`; operational steps are in `R2-SETUP.md`.

## Metadata and structured data

Facts:

- `metadata` and `generateMetadata` work in Server Components. Next.js supplies conventions for icon, Open Graph image, robots, and sitemap. [Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- Next.js recommends JSON-LD in a script element and escaping `<` as `\u003c` when serialising editor-controlled data. [Next.js JSON-LD](https://nextjs.org/docs/app/guides/json-ld)
- Google recommends JSON-LD for maintained structured data and asks authors to provide fewer accurate properties rather than fill optional fields with weak data. [Structured data introduction](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- Organisation data belongs on the homepage or a single organisation page. There are no required Organisation properties; use only relevant facts. [Google Organisation data](https://developers.google.com/search/docs/appearance/structured-data/organization)

Project rules:

- Root metadata defines `metadataBase`, a title template, description, canonical base, Open Graph, and Twitter defaults.
- Journal detail metadata exposes unique title, description, canonical, publication and modification dates, author, category, and cover image.
- Homepage may output `WebSite` plus a conservative `Organization` object containing only known fields.
- Journal detail outputs `BlogPosting` and `BreadcrumbList`.
- Do not use `EducationalOrganization` until legal or operating material proves the subtype.
- JSON-LD and visible content must agree.
- `sitemap.ts` contains canonical published URLs; article `lastModified` comes from `updatedAt`.
- Draft or admin routes use `noindex`. Robots rules are not authentication.
- Do not generate `hreflang` until complete translated routes exist.
- Validate structured data with Google Rich Results Test and Schema.org Validator before launch.

## Accessibility baseline

Target WCAG 2.2 AA. W3C recommends WCAG 2.2 as the current conformance target. Its additions include focus visibility, focus not obscured, dragging alternatives, and a 24 x 24 CSS pixel minimum target with documented exceptions. [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [What changed in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)

Implementation checklist:

- One route-level `h1`, logical heading order, and semantic `header`, `nav`, `main`, and `footer`.
- A skip link and a visible focus indicator that a sticky header cannot cover.
- Informative images receive factual alt text; decorative images use empty alt.
- Menu, accordion, form, and pagination work with a keyboard.
- Text contrast reaches 4.5:1; large text reaches 3:1. The visual design targets 7:1 for body copy.
- Controls use a practical 44-48 px hit area even though WCAG AA starts at 24 px.
- Motion follows `prefers-reduced-motion` and content remains visible without animation.
- Root language reflects the main copy. Mark passages in the other language with `lang`.
- Forms expose explicit labels, instructions, inline errors, and an announced submit status.
- Status never relies on colour alone.

Sources: [WAI page structure](https://www.w3.org/WAI/tutorials/page-structure/), [WAI headings](https://www.w3.org/WAI/tutorials/page-structure/headings/).

## Test strategy

The local and CI order:

```text
eslint
tsc --noEmit
vitest run
convex-test suite
next build
playwright test
```

Next.js 16 does not fold lint into `next build`, so lint remains a separate gate.

### Unit and component tests

- Slug validation and date formatting.
- Public content mapping and draft exclusion.
- JSON-LD escaping.
- Contact validation.
- Synchronous UI components.

Next.js recommends end-to-end coverage for async Server Components rather than treating Vitest as the only proof. [Next.js testing](https://nextjs.org/docs/app/guides/testing), [Next.js and Vitest](https://nextjs.org/docs/app/guides/testing/vitest)

### Convex tests

- Schema and return validation.
- Draft records never appear in public queries.
- Slug uniqueness.
- Publication ordering and pagination.
- Seed idempotency.
- Submission length, consent, honeypot, and rate limit.

`convex-test` runs against a mock and does not reproduce every backend limit. Add one smoke run against a local or anonymous development backend. [Convex test overview](https://docs.convex.dev/testing/overview), [convex-test limits](https://docs.convex.dev/testing/convex-test), [local backend tests](https://docs.convex.dev/testing/convex-backend)

### Browser tests

- Navigation and every public route.
- Mobile menu and keyboard path.
- Journal index, detail, and unknown slug.
- Contact success and validation errors.
- Horizontal overflow at representative viewports.
- Reduced-motion behaviour.
- Chromium, Firefox, WebKit, and mobile emulation where installed.
- Desktop and mobile screenshot comparison.
- `@axe-core/playwright` scan plus manual keyboard and zoom checks.

Sources: [Playwright accessibility](https://playwright.dev/docs/accessibility-testing), [device emulation](https://playwright.dev/docs/next/emulation), [visual comparison](https://playwright.dev/docs/next/test-snapshots).

Finish with `next build && next start`, a clean browser-console pass, Rich Results validation, and a screenshot review. Lighthouse is a laboratory simulation; use field Web Vitals after launch. [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)

## Cloud development and deployment constraints

- This project selects an existing Convex Cloud development deployment with `npx convex dev --configure existing --dev-deployment cloud --once`; Playwright does not start a local backend.
- Gitignore `.env.local`; never print its values in logs or reports.
- `npm run convex:dev` may watch and push functions to the selected cloud deployment while `npm run dev` serves Next.js. A persistent Convex process is not required for `next start` or browser QA after functions are pushed.
- CI and production use a target-specific `CONVEX_DEPLOY_KEY`.
- Vercel build can run `npx convex deploy --cmd 'npm run build'`.
- Preview backends stay separate from development and production.
- A self-hosted Next.js server may use `output: 'standalone'`; copy `public` and `.next/static` into the deployable bundle. [Standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- Keep development, preview, and production deployments separate; never reuse development data as production data.
