# Reusable custom select

Date: 25 August 2026
Surface: member directory filters
Status: implemented and checked against the existing server on port 3987

## Result

The three browser-native menus in the member filter panel now use one shared `SelectField` component. Role, position or division, and joined year still draw their values from the member data and filter helpers; the page doesn't contain hand-written menu rows.

The menu keeps the public site's crisp indigo signal-panel character. Its corners use the same restrained radius as the filter controls, selected items use the club primary colour, and Heroicons supply every check and chevron. Long labels such as “Media, Information, and Communication (MIC)” wrap instead of widening the page.

## Why Radix Select

I checked current primary sources before adding a dependency.

| Requirement | Evidence | Decision |
| --- | --- | --- |
| Keyboard navigation, managed focus, typeahead, controlled state, groups | [Radix Select documentation](https://www.radix-ui.com/primitives/docs/components/select) lists each behavior and documents the WAI-ARIA listbox pattern | Use Radix for interaction semantics |
| Portal and collision handling | The same documentation exposes `Portal`, popper positioning, `collisionPadding`, available height, and trigger-width variables | Render the menu under `document.body`; let it flip when the viewport has no room below |
| React 19 and RSC compatibility | [Radix release notes](https://www.radix-ui.com/primitives/docs/overview/releases) record React 19 fixes and missing `use client` directive fixes | Pin the app to `@radix-ui/react-select` 2.3.7 through the package lock |
| Current package contract | [npm package record](https://www.npmjs.com/package/@radix-ui/react-select) lists the maintained package and TypeScript declarations | Add the focused package instead of the full primitive bundle |

A hand-built ARIA listbox would duplicate focus movement, selection, typeahead, outside-click, escape, touch-scroll, and portal work. The native `select` couldn't meet the requested visual treatment because its option popup remains browser-owned.

## Component contract

File: `src/components/forms/select-field.tsx`

`SelectField` accepts flat options or labelled groups. Each option carries a string value, visible label, and optional disabled state. The field also supports controlled and uncontrolled values, a custom placeholder, a visible label, field name, required and disabled states, an explicit id, help-text linkage, and a caller class.

The component owns the repeated markup:

- labelled trigger with a 48px minimum height;
- portal-mounted listbox with a viewport-bound width and height;
- 44px minimum option and scroll controls;
- selected-item check plus opening, closing, and scroll chevrons from Heroicons;
- popper collision padding of 12px;
- light and dark colours inherited from the existing site tokens;
- a short opacity and transform entrance, reduced to 0.01ms when reduced motion is requested.

Callers only pass data and a value-change handler.

## Member filter wiring

The member directory builds three option arrays:

| Field | Source | Value mapping |
| --- | --- | --- |
| Role | `memberRoleDefinitions` | `all` or role codes `0` through `4` |
| Position / division | `getMemberAssignmentOptions` for the current role | existing `division:*` and `position:*` keys |
| Joined year | `getMemberJoinedYearOptions` | `all`, a four-digit year, or `unknown` when present |

Changing the role through the custom menu still updates the role atlas radio group. Filter normalisation, empty results, counts, and live announcements continue through the existing helper functions.

## Accessibility notes

Radix handles arrow keys, Enter, Space, Escape, focus return, disabled items, and typeahead. Focus rings use the site's `--focus` token with a 3px outline. Labels stay visible above each trigger; placeholder text isn't used as a label.

The open-state Axe check targets the portalled listbox. Radix temporarily applies `aria-hidden` to the page outside its modal select while the menu is open, which makes a full-document Axe scan report those deliberately isolated controls. Axe also treats the scroll viewport as unreachable because its rule only recognises tab stops, while Radix moves programmatic focus across `role="option"` items. The test disables that single generic viewport rule and proves the real behavior separately: type “coo,” focus Coordinator, press Enter, then verify focus returns to the trigger. The normal full-page `/members` Axe test remains unchanged.

## Verification

Commands run without stopping or restarting port 3987:

```text
npm run typecheck
npm run lint
npm test
npx vitest run tests/unit/select-field.test.tsx tests/unit/members.test.ts --reporter=verbose
npx playwright test tests/e2e/site.spec.ts --grep 'member filters combine|member filter controls stay touchable' --reporter=list
npx playwright test tests/e2e/site.spec.ts --grep '/members has no detectable' --reporter=list
npx playwright test tests/e2e/site.spec.ts --grep 'member page visual evidence captures' --reporter=list
```

Recorded results:

- TypeScript: pass.
- ESLint: pass.
- Full Vitest set: 32 passed across 7 files.
- Unit tests: 8 passed across the select and member helper files.
- Focused filter E2E: 5 passed, 1 expected desktop skip. It ran in desktop Chromium, Pixel 7, and the 320px project.
- Closed-state member Axe checks: 3 passed.
- Screenshot E2E: 3 passed.
- Dependency audit after install: 0 vulnerabilities reported by npm.

## Visual evidence

- [Desktop, light, responsibility menu open](evidence/members-custom-select-open-desktop-light.png)
- [Desktop, dark, role menu open](evidence/members-custom-select-open-desktop-dark.png)
- [Pixel 7, light, responsibility menu open](evidence/members-custom-select-open-mobile-light.png)
- [320px, light, responsibility menu open](evidence/members-custom-select-open-320-light.png)

The narrow screenshots confirm that the menu remains inside the viewport, flips above the trigger when needed, and wraps long labels. The desktop dark capture confirms that a body portal still receives the active theme variables.

## Files changed in this lane

- `package.json`
- `package-lock.json`
- `src/components/forms/select-field.tsx`
- `src/components/forms/select-field.module.css`
- `src/components/members/member-relay.tsx`
- `src/components/members/member-relay.module.css`
- `tests/unit/select-field.test.tsx`
- `tests/e2e/site.spec.ts`
- four screenshot files under `docs/evidence/`

## Remaining risk

Radix is now a runtime dependency, so a future major upgrade needs the same keyboard, portal, React, and screenshot checks. The current member filters use flat arrays, while grouped rendering has component-level coverage and is ready for later admin forms. No other page has been migrated in this change.
