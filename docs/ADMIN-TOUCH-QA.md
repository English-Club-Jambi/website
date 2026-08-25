# Admin touchscreen investigation

Date: 26 August 2026

## Scope

This pass covers the authenticated `/admin` surface on a Pixel 7 profile and a
320 × 800 touch viewport. It exercises the same LAN origin used by a physical
phone rather than the desktop-only `127.0.0.1` origin. No content, theme,
member, journal, assessment, or media mutation is executed by the smoke test.

## Root cause

The phone was not receiving a hydrated application. The development server was
configured with `allowedDevOrigins: ["127.0.0.1"]`, while the phone opened
`http://192.168.1.7:3987`. Next.js 16 blocks dev-only assets and endpoints from
origins outside that list. The server-rendered HTML therefore remained visible,
but React never attached its event handlers. Mouse testing on the PC did not
reproduce the defect because it used an allowed local origin.

The shared fix now derives exact, non-internal IPv4 hosts for
`allowedDevOrigins` in `src/config/dev-origins.ts`. It does not use a wildcard.
After hot reload, the LAN touchscreen run recorded no failed `/_next/` response.

## Admin-specific defect found

The real touch run also exposed invalid nested forms in the journal editor.
`JournalWorkspace` owns the story form, while each Link, Image, and Map insert
panel previously rendered another `<form>` inside it. React reported a
hydration error, and browser HTML correction could move controls away from the
component tree that owns their handlers.

The insert panels are now labelled interactive groups. Their action buttons are
explicit `type="button"` controls, and Enter in a one-line panel field is
contained and routed to that panel action. It cannot submit the parent story
form. IME composition Enter is ignored. Image upload also uses a function-level
lock, so repeated Enter events cannot start duplicate R2 uploads while the first
request is pending. Unit regressions cover the parent-form shape, IME handling,
and the upload lock.

The Appearance light/dark segmented buttons and OKLCH channel inputs were also
raised from 38/40 px to the 44 px minimum touch target.

## Touch evidence

The private Playwright gate uses `locator.tap()`, not `click()`. Before each
action it verifies the target is the topmost element at its centre and is at
least 44 × 44 px. It then requires the complete browser event set:
`touchstart`, `touchend`, `pointerdown`, `pointerup`, and `click`. At least one
pointer event must report `pointerType: "touch"`. The gate does not assert a
browser-specific order for those events.

The authenticated path covers:

- email and password fields plus Sign in;
- mobile navigation dialog and client-side route links;
- the portalled Radix Page select and an option selection;
- the Appearance dark-mode control;
- Journal navigation and New story;
- the Tiptap Link toolbar button, insert panel, and close control;
- zero failed Next assets and zero browser console/page errors.

| Gate | LAN origin | Result |
| --- | --- | --- |
| Pixel 7 Chromium touchscreen | `192.168.1.7:3987` | Pass |
| 320 × 800 Chromium touchscreen | `192.168.1.7:3987` | Pass |
| Journal editor parent-form regression | jsdom + React | Pass |
| Shared confirmation dialog touch contract | Pixel 7 + 320 px | Pass |

Screenshots:

- [Pixel 7 editor touch state](./evidence/admin/admin-owner-touch-mobile-chromium.png)
- [320 px editor touch state](./evidence/admin/admin-owner-touch-narrow-chromium.png)

## Re-run

The authenticated smoke is intentionally private and skips when its two
environment variables are absent:

```bash
ADMIN_TOUCH_CREDENTIALS_PATH=/private/path/admin.json \
ADMIN_TOUCH_BASE_URL=http://LAN_IP:3987 \
npx playwright test tests/e2e/admin-touch.spec.ts \
  --project=mobile-chromium --project=narrow-chromium --workers=1
```

This browser gate complements, but does not replace, a final tap-through on the
physical Android or iOS device and browser used for acceptance.
