# Mobile touch system audit

Date: 26 August 2026
Status: P0 root cause fixed and independently verified
Scope: public routes, administrator entry and authenticated shell, narrow layout, touch event delivery, development overlays, hydration, viewport delivery, and LAN access to the existing server on port 3987

## Conclusion

The phone was receiving touch events correctly. The application did not respond because the phone opened the development server through its LAN address while Next.js was configured to allow development assets only from `127.0.0.1`.

The document request returned `200`, so the server-rendered page and CSS looked complete. Client JavaScript chunks returned `403`, however, so React never hydrated. This made every JavaScript control inert at once: the theme switch, public menu, relays, filters, dialogs, form behavior, and administrator controls. A desktop browser using `127.0.0.1:3987`, including its mobile viewport mode, did not cross that origin boundary and therefore worked.

The LAN allowlist now includes loopback hosts, detected non-internal IPv4 hosts, and optional exact hostnames from `NEXT_ALLOWED_DEV_ORIGINS`. The repaired LAN path hydrates and responds to real emulated touchscreen taps at both tested phone widths. No remaining systemic overlay, z-index, `pointer-events`, listener, or hydration defect was found in the bounded whole-app audit.

## Evidence before the fix

The failing origin was `http://192.168.1.7:3987`, which matches how a phone on the same network reaches the workstation.

| Observation | LAN result before the fix | Loopback control result |
| --- | --- | --- |
| HTML document | `200`, 79,719 bytes | `200` |
| First Next.js JavaScript chunk | `403`, 12-byte rejection | `200` |
| React hydration sentinel | `html[data-hydrated]` absent | `true` |
| Browser console | two chunk `403` errors and rejected HMR WebSocket | no error |
| Theme touchscreen tap | `pointerdown`, `touchstart`, and `click` reached the theme button; theme stayed light | same event sequence; theme changed to dark |
| Menu touchscreen tap | event path reached `path > svg > button.menu-trigger > nav`; dialog stayed closed | same event path; dialog opened |
| Hit testing | `elementFromPoint()` resolved inside each intended control | resolved inside each intended control |

The event trace is decisive: a transparent overlay was not swallowing the tap. Native touch and click events reached the right button, but there was no hydrated React handler to change state.

## Causal chain

1. The phone requested the page using a LAN hostname.
2. The old `allowedDevOrigins` value contained only `127.0.0.1`.
3. Next.js served the server-rendered document but blocked development-only client assets and HMR for the unapproved hostname.
4. The small inline theme boot script still ran, which explains why `html[data-js="true"]` was present even while React's hydration sentinel was absent.
5. The DOM continued to generate native touch events, but React event handlers, state, navigation enhancements, and dialogs were unavailable.

This behavior follows the local Next.js 16.3.2 guide at `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/allowedDevOrigins.md`: origins other than the hostname used to initialize the development server must be allowed explicitly.

## Fix assessment

The active configuration now delegates to `getAllowedDevOrigins()` in `next.config.ts`. The helper in `src/config/dev-origins.ts`:

- always permits `localhost` and `127.0.0.1`;
- discovers non-internal IPv4 interface addresses, including the current LAN host;
- accepts comma- or newline-separated exact hosts from `NEXT_ALLOWED_DEV_ORIGINS`;
- rejects wildcard input, credentials, paths, queries, fragments, and non-HTTP(S) values;
- de-duplicates the final list.

This is narrower than a wildcard and appropriate for local device testing. It affects the Next.js development server; it is not an application authorization mechanism and is not needed by `next start` in the same way.

## Evidence after the fix

### Network and hydration

The same LAN JavaScript chunk that returned `403` returned `200` after the allowlist update. A route sweep then loaded all of the following over the LAN origin at both Pixel 7 (`412 x 839` CSS px) and narrow (`320 x 800` CSS px) profiles:

- `/`
- `/about`
- `/activities`
- `/members`
- `/practice`
- `/journal`
- `/contact`
- `/admin`

Across the 16 route/profile combinations:

- no response had status `400` or higher;
- no console or page error was recorded;
- every public route reached `html[data-hydrated="true"]`.

The admin route does not use the public theme component's hydration sentinel, so its result was established through authenticated state changes instead of that attribute.

### Public controls

On the LAN origin, both phone profiles produced a touch pointer with this event order on the public theme and menu controls:

```text
pointerdown (pointerType: touch)
touchstart
click (pointerType: touch)
```

The composed paths contained the intended button. In both profiles:

- the theme changed from light to dark;
- the public navigation dialog opened;
- the Next.js portal host measured `0 x 0` and computed to `pointer-events: none`;
- no failed request or console error appeared.

The existing focused interaction suite also passed six real-touch cases across Pixel 7 and 320 px. It covers the public menu lifecycle, focus and scroll-lock release, theme switching, home relays, prompt refresh, CTA navigation, Members filter disclosure, Activities selection, Contact intent selection, and text-field focus.

### Authenticated administrator controls

The provisioned owner account was used without printing or storing its password in the report. On the LAN origin at Pixel 7 and 320 px:

- a touchscreen tap submitted the sign-in form successfully;
- the mobile admin navigation trigger was the hit-tested target;
- the admin dialog opened;
- a touchscreen tap on Activity navigated to `/admin/activity`;
- no failed response, console error, or page error was recorded.

## Secondary overlay and listener audit

| Area | Evidence | Result |
| --- | --- | --- |
| Next.js development chrome | `devIndicators: false`; narrow CSS also gives the remaining `nextjs-portal` host `pointer-events: none`; runtime host was `0 x 0` | Pass |
| Public theme and menu | `elementFromPoint()` and `composedPath()` both resolved through the intended buttons; state changed after hydration | Pass |
| Public modal top layer | Closed `<dialog>` is not displayed; when opened, the modal intentionally owns the top layer; close restores body overflow and trigger focus | Pass |
| Admin modal top layer | Authenticated touch opened the dialog and its link completed client navigation | Pass |
| Decorative images and fades | Full-cover decorative layers inspected in source use `pointer-events: none`; runtime target stacks did not place them over tested controls | Pass |
| Shared tap behavior | Public buttons and links use `touch-action: manipulation`; no global touch `preventDefault()` or touch-capture interceptor was found | Pass |
| Sticky elements | Public header and admin mobile top bar use bounded sticky layers; representative hit tests still resolved to their controls | Pass |
| Hydration | All public LAN routes hydrated at both widths after the fix | Pass |
| Viewport | Next emitted `width=device-width, initial-scale=1`; `innerWidth` equalled `documentElement.clientWidth` at 412 and 320 px | Pass |
| PWA cache | No service worker registration or application manifest was found, so a stale service-worker shell was not the cause | Pass |

Source landmarks:

- `next.config.ts:15-17` — LAN origin delivery and disabled development indicator.
- `src/config/dev-origins.ts:59-90` — bounded LAN discovery and exact-origin normalization.
- `src/app/globals.css:100-104` — shared tap action.
- `src/app/globals.css:1702-1710` — narrow development portal protection.
- `src/components/mobile-nav.tsx:39-64` and `:122-147` — public dialog lifecycle and click handler.
- `src/components/play/theme-toggle.tsx:11-38` — public hydration sentinel and theme handler.
- `src/components/admin/admin-session.tsx:330-424` — admin mobile dialog lifecycle.

## Acceptance matrix

| Contract | Pixel 7 / loopback | 320 px / loopback | Pixel 7 / LAN | 320 px / LAN | Release status |
| --- | --- | --- | --- | --- | --- |
| Core Next.js chunks return `200` | Pass | Pass | Pass after fix | Pass after fix | Accepted |
| Public route hydrates | Pass | Pass | Pass after fix | Pass after fix | Accepted |
| Theme tap changes state | Pass | Pass | Pass after fix | Pass after fix | Accepted |
| Public menu tap opens dialog | Pass | Pass | Pass after fix | Pass after fix | Accepted |
| Touch composed path contains target | Pass | Pass | Pass after fix | Pass after fix | Accepted |
| Home relay and prompt controls | Pass | Pass | Same hydrated handlers; route sweep clean | Same hydrated handlers; route sweep clean | Accepted |
| Members filter | Pass | Pass | Route chunks and hydration clean | Route chunks and hydration clean | Accepted |
| Activities relay | Pass | Pass | Route chunks and hydration clean | Route chunks and hydration clean | Accepted |
| Contact intent and field focus | Pass | Pass | Route chunks and hydration clean | Route chunks and hydration clean | Accepted |
| Practice and Journal route assets | Pass | Pass | No failed response or console error | No failed response or console error | Accepted |
| Admin sign-in by touch | Pass | Pass | Pass | Pass | Accepted |
| Admin menu and route navigation by touch | Pass | Pass | Pass | Pass | Accepted |
| Development portal does not intercept | Pass | Pass | Pass | Pass | Accepted |
| Android Chrome physical-device smoke test | Not an emulation target | Not an emulation target | User should recheck after a hard reload | User should recheck after a hard reload | Manual confirmation |
| Mobile Safari physical-device smoke test | WebKit binary unavailable locally | WebKit binary unavailable locally | Not executed | Not executed | Pre-release manual gate |

## Real-device follow-up

The automated evidence reproduces the phone's critical network condition by using the actual LAN origin and uses Chromium's touchscreen input rather than mouse clicks. It cannot reproduce every browser-chrome resize, OS gesture, or Mobile Safari detail.

On the physical phone, close the old tab or perform a hard reload before retesting so it does not reuse a previously rejected development chunk. Confirm the visible URL uses the current LAN address. The minimum manual pass is: switch theme, open and close the public menu, change one home relay, open Members filters, focus a Contact field, sign in to Admin, and open its mobile menu.

## Audit boundary

This audit changed only this report. It did not modify application source, restart or terminate the development server, or stop port 3987. The conclusion is systemic: the origin/hydration failure is repaired and no second whole-page touch interceptor was found. A future page-specific control can still regress, so the LAN-origin and touchscreen contracts should remain in the browser suite.
