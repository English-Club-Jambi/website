# Admin Contact Desk

Status: implemented and verified on the development cloud deployment
Date: 26 August 2026

## Purpose

The public Contact form already records one of three intentions: `join`, `partner`, or `ask`. The Contact desk makes those records usable without collapsing them into an ambiguous generic inbox.

The administration route is `/admin/contacts`. It uses the same public labels:

| Stored intent | Admin queue | Meaning |
| --- | --- | --- |
| `join` | Join the club | A person is asking about membership or participation |
| `partner` | Propose something together | A person or group is proposing shared work |
| `ask` | Ask a question | A question that is not a membership or partnership request |

## Working model

The page is a contact desk, not a lead-scoring dashboard. It has four intent controls, one status filter, a bounded message rail, and a reading pane. Desktop keeps the rail and reading pane independently scrollable. Touch layouts stack them and move the selected message into view.

Work status is internal:

- `new`: Needs review
- `reviewing`: In progress
- `replied`: Reply sent
- `closed`: Complete
- `spam`: Spam

“Write email” opens the administrator's mail client. Changing status never claims to send a message. “Reply sent” is chosen only after a real reply has left the administrator's account.

## Convex contract

- `adminSubmissions.listPage` requires `contact:read`, accepts optional intent/status, requires 20-row cursor pages, and selects one exact index path.
- The admin projection returns the name, reply address, message, intent, consent time, status, and timestamps. It omits normalized email and the source path.
- `adminSubmissions.setStatus` requires `contact:manage` and an `expectedUpdatedAt` value. A stale write returns a conflict instead of overwriting another administrator.
- Successful status changes append a `contact` audit event. Its summary names only the intent and new status.
- Editor, publisher, and owner roles may read and manage the queue. Anonymous, disabled, or unlisted identities receive no contact data.

## Privacy boundary

Contact messages are private organization correspondence. They do not enter public routes, analytics, URLs, local storage, evidence screenshots, or audit summaries. Browser evidence masks every element marked `data-contact-pii`. Production retention remains an organization policy decision; the application does not invent an automatic deletion period.

## Verification contract

- Convex tests cover unauthenticated reads, exact queue filters, page-size enforcement, projection fields, status conflicts, and PII-free audit events.
- Component tests cover all three labels, selection, `mailto:` handoff, status recording, and the honest empty state.
- Browser checks cover desktop, Pixel 7, and 320 px layouts, real touch activation, 44 px targets, custom selects, zero document overflow, serious/critical Axe findings, and masked screenshots.

Final evidence: 7 focused Convex/component/navigation tests passed; the full Vitest run passed 59 files and 261 tests; the three-project Contact desk Playwright gate passed with zero serious/critical Axe findings and no client errors. Screenshots live under `docs/evidence/admin/contact-desk-*-chromium.png` and mask every personal field.
