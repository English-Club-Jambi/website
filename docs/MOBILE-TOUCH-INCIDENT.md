# Physical-phone touch incident

Status: resolved on 26 August 2026
Scope: Next.js development access from a phone on the same LAN

## What failed

The public HTML returned `200` at the machine's LAN address, but the phone couldn't use the menu, theme control, or page interactions. Desktop mouse input and phone-sized desktop emulation still worked.

The first LAN trace separated delivery from hit testing:

- the document loaded, while two `/_next` JavaScript chunks returned `403`;
- `html[data-hydrated]` never appeared;
- a touch on the theme control left `data-theme` unchanged;
- the HMR WebSocket request came from the same blocked LAN host.

No page overlay caused the fault. Without the client chunks, React had no event handlers to attach.

## Cause and repair

`next.config.ts` allowed only `127.0.0.1` as an added development origin. A phone reached the server through a non-loopback IPv4 address, so Next.js 16.3's development-origin check rejected its internal assets even though the route HTML remained available.

The development allowlist now contains exact hosts only:

- `localhost` and `127.0.0.1`;
- every current non-internal IPv4 interface address reported when Next.js starts;
- optional exact values from `NEXT_ALLOWED_DEV_ORIGINS`.

The optional value accepts comma- or newline-separated HTTP(S) origins and hostnames. Wildcards, credentials, paths, query strings, fragments, and malformed entries don't enter the allowlist. A network-interface change requires a development-server restart so the exact host set can be read again.

## Touch proof

The LAN regression opens the site through the detected IPv4 address in Playwright's Pixel 7 context. Before each tap, it checks the target centre with `document.elementFromPoint`. It records `pointerdown`, `touchstart`, `pointerup`, `touchend`, and `click`, including `pointerType` and the first six nodes from `composedPath()`.

The passing trace proves all of the following:

- no `/_next` response returned `400` or higher;
- hydration reached `html[data-hydrated="true"]`;
- the theme tap changed the document to dark mode;
- the menu opened, received a touch path containing its button, and navigated to About;
- the next route hydrated on the LAN origin as well.

The public route matrix uses `page.touchscreen.tap`, not Playwright's mouse-backed `locator.click`. Pixel 7 and 320 px contexts cover Home, About, Activities, Members, Practice, Journal, and Contact. Target centres must resolve inside the intended control, and practical targets must measure at least 44 by 44 CSS pixels.

## Verification record

| Check | Result |
| --- | --- |
| `npx vitest run tests/unit/dev-origins.test.ts` | 2 passed |
| Focused ESLint for config, origin helper, and touch tests | passed |
| Pixel 7 LAN hydration, composed-path trace, theme, menu, and navigation | 1 passed |
| Pixel 7 plus 320 px public route touch matrix | 7 passed, 1 expected project skip |
| Screenshot inspection | menu open in dark mode; controls aligned and unobstructed |

Visual evidence: [Pixel 7 LAN menu](evidence/mobile-lan-touch-pixel7.png).
