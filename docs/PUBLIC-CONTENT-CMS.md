# Public content CMS integration

## Outcome

The public site now reads published page copy from Convex while retaining the complete checked-in English Club copy as its fallback. The database can replace text and metadata, but it cannot add markup, change links, move sections, or alter interaction logic.

The integration covers:

- the shared header, mobile menu, and footer;
- Home, including the conversation relay, prompt mixer, activity relay handoff, journal introduction, and closing actions;
- About and its four principles;
- Activities and the four interactive activity records;
- Members page introductions, directory states, filters, and closing action;
- Journal archive introduction, empty states, unavailable state, and pagination wording;
- Contact page introductions, guidance, field labels, consent copy, and the successful-submission view;
- browser titles and meta descriptions for all six public index pages.

Journal article titles, bodies, covers, authors, and dates remain under the journal publishing workflow. Member names, biographies, portraits, roles, and join years remain under the member publishing workflow. They are not duplicated as page-copy keys.

## Source of truth

[`content/public-content.ts`](../content/public-content.ts) is the framework-neutral contract. Each page contains named fields with:

- a kebab-case `contentKey` stored in Convex;
- an editor label;
- the only supported kind, `plain-text`;
- real checked-in organization wording;
- a field-specific maximum length.

The manifest is safe to import from an admin Client Component because it has no Next.js, Convex, filesystem, or environment imports. Admin Pages should use the manifest instead of maintaining a second page and key list.

## Read path

1. A Server Component requests one known page through `getPublicPageContent(pageKey)`.
2. [`src/lib/public-content.ts`](../src/lib/public-content.ts) reads `CONVEX_URL` through the existing server configuration helper.
3. `api.siteContent.getPublishedPage` returns at most 120 published rows for the known page and `en` locale.
4. The adapter compares every row with the checked-in manifest.
5. It accepts only a known key with the expected kind, a positive safe revision, a valid publication time, and text within that field's length limit.
6. It normalizes whitespace and rejects control characters and HTML-like tags.
7. Valid values replace their defaults. Missing or rejected fields keep the checked-in wording.

React renders every value as text. No CMS value reaches `dangerouslySetInnerHTML`, a Markdown renderer, an image URL, a route, an ARIA relationship ID, or a CSS property.

## Cache and fallback behavior

Published page queries use `fetchQuery`, which explicitly sets `cache: "no-store"` in the installed Convex package. The adapter adds React request-level memoization keyed by deployment URL, page key, and locale so duplicate reads during one render share the same result. It does not retain published copy across requests. A public refresh therefore does not wait for a Next.js TTL or a separate invalidation webhook.

If the server has no Convex URL, Convex is unreachable, or the response cannot pass the contract, the request still renders the complete checked-in copy. The warning shown in development reports only the page key and error class. It does not print environment values.

`CONVEX_URL` is enough for both this public Server Component read path and the admin workspace. The admin server layout resolves that value and passes the deployment URL into the client provider as a controlled prop, so the same URL does not need to be duplicated as `NEXT_PUBLIC_CONVEX_URL`.

## Publishing example

To replace the first line of the Home hero, the published Convex entry must use:

```text
pageKey: home
locale: en
contentKey: hero-title-line-one
kind: plain-text
```

The public site ignores a key such as `hero-html`, even if an admin creates and publishes it. This lets the content table hold future fields without granting those fields an accidental rendering path.

## Admin Pages follow-up

The current admin Pages screen needs two integration changes outside this work:

1. Add the manifest's `global` page so editors can reach header and footer wording.
2. Build its page and field selectors from `publicContentManifest`. When a manifest field has no Convex row, show its `defaultValue` and offer an explicit action to create the first draft. The current query returns stored rows only, so an empty workspace cannot reveal available keys by itself.

The backend contract does not need a schema or query change for this integration. Unknown stored keys can remain in the database because the public adapter ignores them.

## Verification

Focused automated coverage lives in:

- `tests/unit/public-content.test.tsx` for manifest integrity, safe merging, detached defaults, and client hydration with published wording;
- `tests/e2e/public-content.spec.ts` for all six index routes, metadata, honest copy, 320 px overflow, and post-hydration interaction;
- the existing journal archive, mobile navigation, member directory, contact validation, and public route suites.

Before release, run the full lint, typecheck, Vitest, and three-project Playwright suites. Inspect Home, Members, and Contact at 320 px after publishing maximum-length headings because the manifest prevents unbounded input but cannot guarantee that every editorial choice has good rhythm.
