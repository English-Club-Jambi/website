# Search visibility runbook

Status: implemented source contract, with post-deploy search-console steps still operator-owned.

## What the application guarantees

- Every indexable public route emits one absolute HTTPS canonical URL on `englishclub.mukhtada.my.id` unless an explicit non-local HTTPS origin is configured.
- Titles, descriptions, Open Graph, Twitter cards, and crawler preview directives come from one metadata builder. Public CMS wording remains the visible source of truth.
- Journal detail pages emit `BlogPosting` and breadcrumb data that matches the visible title, standfirst, author, category, dates, and featured image.
- `/sitemap.xml` contains canonical public pages, the full and quick Practice entry points, and published Journal URLs. Only Home, Journal, and stories receive a modification date when the rendered content actually changed.
- `/robots.txt` advertises that sitemap and keeps Admin, admin upload endpoints, and learner-owned attempt/result routes out of crawler paths.
- Cursor pages in the Journal archive stay `noindex, follow`; owned Practice attempt and result pages stay `noindex, nofollow`.

These signals improve discovery and interpretation. They do not guarantee that a search engine will crawl, index, show a rich result, or rank a page.

## Production configuration

Set these in the Vercel production environment:

```dotenv
NEXT_PUBLIC_SITE_URL=https://englishclub.mukhtada.my.id
NEXT_PUBLIC_MEDIA_BASE_URL=https://r2.mukhtada.my.id
GOOGLE_SITE_VERIFICATION=token-from-google
BING_SITE_VERIFICATION=token-from-bing
```

The application rejects HTTP and local origins for canonical generation and falls back to the verified public domain. Fix an incorrect Vercel value anyway so build logs and operator expectations remain clear.

## Launch sequence

1. Deploy the final commit and inspect the rendered source of Home, Journal, one story with a cover, Programs, Members, Practice, and Contact.
2. Confirm that canonical, `og:url`, `og:image`, and JSON-LD contain only the public HTTPS domains.
3. Open `/robots.txt` and `/sitemap.xml` from the production domain. Confirm they return `200` and no URL contains localhost, a Vercel preview host, an Admin path, or a learner attempt ID.
4. Verify the site in Google Search Console and Bing Webmaster Tools with the environment tokens above.
5. Submit `https://englishclub.mukhtada.my.id/sitemap.xml` to both tools. The sitemap is a discovery hint, not an indexing command.
6. Test one published story in Google's Rich Results Test. Check that its cover can be fetched without authentication and that the structured data matches the page.
7. Use URL Inspection for Home, Journal, Programs, Practice, and a representative story after a meaningful publication. Request recrawling only after the deployed content or metadata changed.
8. Review coverage, crawl, and enhancement reports monthly. Correct broken internal links, accidental `noindex`, unavailable media, or inaccurate publication dates before adding more markup.

## Editorial guardrails

- Write for prospective members and readers first. Put the phrase a reader would naturally use in the title, main heading, opening paragraph, image alternative text, and internal link only where it describes the content.
- Keep every title specific to its page. Avoid repeated generic titles, keyword lists, location stuffing, hidden text, doorway pages, and copied summaries.
- Publish a useful standfirst and descriptive cover alternative text for every Journal story. The cover must represent the story and remain available at a stable public URL.
- Change `dateModified` only when the public story changes. Private draft saves must not change public dates or sitemap values.
- Use descriptive links such as “Browse English Club programs,” not chains of identical “click here” links.
- Archive or redirect withdrawn stories deliberately. Do not leave soft-404 pages that return `200` with an empty article.

## Evidence sources

- Google Search Essentials: <https://developers.google.com/search/docs/essentials>
- Google Article structured data: <https://developers.google.com/search/docs/appearance/structured-data/article>
- Google sitemap guidance: <https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap>
- Bing Webmaster Guidelines: <https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a>
- Bing sitemap guidance for search and AI discovery: <https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search>
