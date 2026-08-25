# Mobile Home Responsiveness Fix

Date: 25 August 2026
Scope: `/` hero, global phone header geometry, the sentence controls, and the home-only activity selector.

## Reported failure

The supplied 518 × 965 screenshot showed two distinct clipping failures in the first viewport:

- `English grows` continued past the right edge.
- The four-state sentence rail extended beyond the viewport, so `Try again` was only partly visible.

The page-level overflow check did not catch this because the hero section clipped its children. The document could report the correct width while visible content was still cut off.

## Measured cause

The hero uses a CSS grid. Its mobile title lines had `white-space: nowrap`, a minimum font size of `3.15rem`, and `letter-spacing: -0.058em`. The title's min-content width enlarged the grid track beyond the `.page-container`.

The sentence rail then inherited that enlarged track. It also required four columns of at least `7.25rem`, making its intrinsic width 464 px.

Before the fix:

| Viewport | First title line right edge | Sentence rail scroll width | Result |
| --- | ---: | ---: | --- |
| 320 px | 334.92 px | 464 px | Heading and fourth control clipped |
| 412 px (Pixel 7 CSS width) | 426.69 px | 464 px | Heading and fourth control clipped |

The nearby home activity selector used a horizontal scroller. At 320 px, its `Exchange` control needed 165 px inside a 144 px cell because it contained a leading icon, label, and trailing arrow. That leaked 5 px into the document and kept later choices out of sight.

## Implemented adaptation

- Constrained every direct hero grid child with `min-width: 0` so content cannot redefine the container track.
- Kept the authored two-line sentence but changed the phone type scale to `clamp(2.75rem, 13.85vw, 4.5rem)` with the design-system letter-spacing floor of `-0.04em`.
- Replaced fixed-minimum sentence columns with four equal `minmax(0, 1fr)` columns.
- Made all four state controls simultaneously visible. At widths up to 439 px, icons sit above labels so every label remains legible without shrinking its touch target.
- Kept the relay marker proportional at `25%` of the visible rail width.
- Reflowed the home instance of the activity selector to a 2 × 2 grid below 640 px. Its redundant trailing arrows are removed on that surface; the distinct Heroicon and full label remain.
- Suppressed hover translation on non-hover devices. Existing bounded transitions and the global reduced-motion rule remain intact.

The header required no structural change. Its logo, theme button, and menu button were already inside the container and the two controls remained at least 44 × 44 px.

## Verified geometry

After the fix:

| Viewport | Longest title line | Sentence rail | Sentence targets | Activity rail | Document width |
| --- | ---: | --- | --- | --- | --- |
| 320 px | 16–298.97 px | 0–320 px; no internal overflow | 80 × 68 px each | 2 columns; 288/288 px client/scroll width | 320/320 px |
| 412 px | 16–385.33 px | 0–412 px; no internal overflow | 103 × 68 px each | 2 columns; 380/380 px client/scroll width | 412/412 px |
| 518 px | 16–475.70 px | 0–518 px; no internal overflow | 129.5 × 58 px each | 2 columns; 486/486 px client/scroll width | 518/518 px |

The geometry test measures rendered text with a DOM `Range`, not only the `h1` box. This prevents a clipped child from passing behind an `overflow: clip` ancestor again.

## Automated evidence

Targeted Playwright result:

```text
4 passed
mobile-chromium (Pixel 7): hero/header/rail geometry + activity reflow
narrow-chromium (320 × 800): hero/header/rail geometry + activity reflow
```

Captured states:

- `docs/evidence/home-mobile-responsive-320-light.png`
- `docs/evidence/home-mobile-responsive-pixel7-light.png`
- `docs/evidence/home-mobile-responsive-320-activity-light.png`
- `docs/evidence/home-mobile-responsive-pixel7-activity-light.png`

The screenshot helper hides only the Next.js development portal so it cannot cover a control in evidence. It does not alter the application layout.

## Regression coverage

`tests/e2e/mobile-home.spec.ts` now asserts:

- the document, header, frame, two rendered title lines, and sentence rail stay inside the viewport;
- the sentence rail has no hidden horizontal overflow;
- all four sentence actions are visible and at least 44 × 44 px;
- both header controls stay inside the viewport and meet the touch target minimum;
- the home activity selector becomes two columns, has no hidden horizontal overflow, and keeps every choice touchable;
- separate screenshots are produced for 320 px and Pixel 7.

## Remaining risk

Verification used Chromium device emulation against the already-running Next.js server. A physical Android browser and Mobile Safari may render the variable font a fraction differently. The fluid scale retains at least 5 px of right-side text clearance at 320 px, and the DOM regression test will catch Chromium-side font or CSS changes. A final real-device pass is still appropriate before public launch.

Port 3987 was reused throughout. No server process was stopped or restarted.
