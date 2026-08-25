# Mobile interaction fix

Date: 25 August 2026
Status: fixed and verified on the Pixel 7 and 320 px Playwright touch profiles

## Report

On a narrow mobile viewport, some controls looked ready but a tap did not always reach the React handler. The clearest case was the first hero control, **Speak**, at the bottom-left of the viewport.

## Reproduction evidence

The audit used `page.touchscreen.tap()` at the rendered centre of each target. It did not use forced clicks. A capture-phase trace recorded `pointerdown`, `touchstart`, and `click`, while `document.elementFromPoint()` identified the element receiving the tap.

| Profile | Target centre | Element at the point before the fix | Result after selecting Listen, then tapping Speak |
| --- | ---: | --- | --- |
| Pixel 7, 412 × 839 CSS px | 51.5, 785 | `nextjs-portal` | Speak stayed unselected |
| Narrow phone, 320 × 800 CSS px | 40, 746 | `nextjs-portal` | Speak stayed unselected |
| Touch viewport, 518 × 967 CSS px | 64.75, 918 | a span inside Speak | The control changed normally |

Hydration was not the failure. `html[data-hydrated="true"]` was present, the theme button changed `data-theme`, the menu opened, and unobstructed controls produced the expected touch and click events.

## Root cause

The Next.js development indicator sits at the bottom-left of the viewport. At the two narrow breakpoints its circular hit area covered the centre of the first full-width-edge control. The visible `N` badge in the reported screenshot is the same overlay. Because it lives in a shadow-root portal above the application, raising the application control's z-index would not solve the problem cleanly.

The local Next.js 16 documentation at `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/devIndicators.md` provides the supported fix: `devIndicators: false`. Compile and runtime errors remain available; only the floating route indicator is removed.

## Changes

- `next.config.ts`
  - Disabled the development indicator so it cannot steal a mobile touch from application UI.
- `src/app/globals.css`
  - Added `touch-action: manipulation` to shared buttons and links. This keeps taps responsive while retaining pan and pinch-zoom behaviour.
- `tests/e2e/mobile-interactions.spec.ts`
  - Added reusable, real-touch assertions that fail when `elementFromPoint()` resolves outside the intended target.
  - Added capture-phase event tracing for `pointerdown`, `touchstart`, and `click`.
  - Covered theme switching, menu open/close, modal focus, scroll-lock cleanup, navigation from the drawer, all home relays, the primary CTA, the member filter button, activity selection, and contact controls.

No per-button touch handler or z-index patch was added. The React `onClick` handlers already receive touch-generated click events once the development overlay is out of the way.

## Verification

| Check | Result |
| --- | --- |
| Mobile interaction suite, Pixel 7 + 320 px | 6 passed |
| Existing menu disclosure/focus/scroll-lock test | 1 passed |
| ESLint on changed TypeScript/config files | passed |
| `tsc --noEmit` | passed |
| Port 3987 after the change | listening and returning HTTP 200 |

The first test pass caught two errors in the new assertions. They were reviewed rather than ignored:

- Next keeps an empty `nextjs-portal` host for other development tooling even when the route indicator is disabled. The meaningful contract is that the portal is not the hit-tested element, so the test now checks the target at the actual touch point.
- Tapping a contact intent label produces the normal label click and a second click on its radio input. The trace assertion now accepts that standards-based extra click while still requiring `pointerdown`, `touchstart`, and `click`.

The corrected suite then passed in both mobile profiles.

## Evidence

- [320 px screenshot](evidence/mobile-touch-320.png)
- [Pixel 7 screenshot](evidence/mobile-touch-pixel7.png)
- Playwright traces: `docs/evidence/mobile-touch-traces/`

The screenshots show the touch rail without the development badge covering Speak. The trace archives preserve target geometry, event order, state changes, navigation, and screenshots for the shared-shell and home-control runs.

## Residual risk

The automated pass uses Chromium touch emulation. A final physical-device check on Android Chrome and Mobile Safari remains useful before launch, especially for native dialog focus behaviour and browser chrome resizing. No application-side touch obstruction remains in the tested routes.
