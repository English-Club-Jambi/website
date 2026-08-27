# Journal detail runtime fix

Date: 27 August 2026

## Symptom

The Journal archive loaded on Vercel, but every `/journal/{slug}` request
returned HTTP 500. Existing, missing, and malformed slugs failed in the same
way.

## Evidence

The production log reported:

```text
Page changed from static to dynamic at runtime
reason: no-store fetch ... /journal/[slug]
```

A local production build classified the route as SSG because
`generateStaticParams()` returned an empty array. The first request then ran a
Convex server query through `fetchQuery`, which uses a `no-store` request. Next
rejected that runtime change and returned 500.

## Fix

- Remove the empty `generateStaticParams()` export.
- Declare `dynamic = "force-dynamic"` on the Journal story route.
- Keep valid slugs server-rendered against the current published Convex row.
- Keep missing slugs on the existing `notFound()` path.

## Acceptance checks

- Production build classifies `/journal/[slug]` as dynamic (`ƒ`), not SSG
  (`●`).
- A published slug returns HTTP 200 under `next start`.
- An unknown slug renders the existing not-found response with `noindex`, not
  the static-to-dynamic 500. The Journal loading boundary means Next may commit
  HTTP 200 before the missing row resolves.
- The archive remains HTTP 200.
- The route contract test rejects a return to empty static parameters.
