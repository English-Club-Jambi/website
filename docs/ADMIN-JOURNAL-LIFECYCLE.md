# Admin journal lifecycle

## Management contract

Every journal row has an `Edit` action. Publishers and owners also have one lifecycle action:

| Current state | Action | Result |
| --- | --- | --- |
| Draft | Archive | The story stays private and moves to the archive. |
| Published | Archive | The public story disappears immediately and moves to the archive. |
| Archived, never published | Restore | The story returns as a private draft. |
| Archived, previously published | Restore | The last valid published revision returns at the same URL. |

Editors can create and revise stories. Only publishers and owners can change public availability. Convex enforces this with the `journal:publish` permission; hiding the button in the interface is only a usability measure.

## Why there is no permanent delete

A post owns an open-ended set of immutable `postRevisions`. It can also point to draft and published revisions, reference reviewed R2 media, and appear in CMS audit events. Removing one post would therefore require a cascading, potentially multi-transaction cleanup and would erase editorial history.

Archive is the safe removal operation. It removes a story from every public journal query while keeping revisions, media references, and audit history available for review. Restore reverses that operation. If a previously published revision is missing or no longer belongs to the post, restore fails closed to `draft` instead of exposing an unverifiable public version.

## Backend guarantees

- `adminPosts.archive` and `adminPosts.restore` derive the actor from Convex authentication.
- Both mutations require `journal:publish`; client-provided identities are never accepted.
- Missing posts, duplicate archives, and restores of active stories are rejected.
- Archive and restore are single Convex transactions: the state change and audit event commit together.
- Every state change writes the actor, timestamp, prior or restored state, and post identifier to `cmsAuditEvents`.
- Admin lists use indexed pagination and public reads only select `status: "published"`.

## Verification

The lifecycle tests cover unauthenticated, editor, publisher, and owner access; public removal and restoration; duplicate transitions; audit records; private draft restoration; and the missing-revision fail-closed path.

```bash
npx vitest run tests/convex/admin-post-lifecycle.test.ts
npx vitest run tests/unit/journal-manager.test.tsx
npm run typecheck
```
