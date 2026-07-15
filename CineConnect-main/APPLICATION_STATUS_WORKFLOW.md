# Application Management Workflow

This documents the Producer-facing Accept/Reject workflow built on top of the
existing application architecture (see `APPLICATION_WORKFLOW.md` for how
applying/notifications/sockets were originally wired — this pass reuses all
of it and adds the "final decision" guard rail plus the dashboard status
breakdown).

## Workflow implemented

1. **Producer views applicants.** `app/applications/[jobId].tsx` calls
   `GET /api/applications/projects/:projectId` and renders one
   `ApplicantCard` per applicant, filterable by All / Accepted / Rejected.
2. **Accept / Reject.** Tapping Accept or Reject calls
   `PATCH /api/applications/:applicationId/status` with
   `{ status: 'shortlisted' | 'declined', force: false }`. On success the
   row's status is updated in Oracle and the freelancer is notified
   (persisted + pushed live over Socket.IO, existing `notificationService`).
3. **Decision lock.** Once an application's status is `shortlisted` or
   `declined`, the backend treats it as a **final decision**. Any further
   status-change request for that application is rejected with `409` unless
   the caller explicitly sets `force: true`. The `ApplicantCard` reflects
   this: once decided, the Accept/Reject buttons are replaced by a status
   tag and a small **"Edit decision"** link. Tapping it reveals the
   Accept/Reject buttons again; tapping either then asks for confirmation
   (`Alert.alert`) before it re-fires the mutation with `force: true`. This
   is what satisfies "prevent changing the status once a final decision has
   been made unless explicitly edited" — the lock is enforced server-side
   (so no client can bypass it) and the client only ever sends `force: true`
   from that one explicit, confirmed UI path.
4. **Immediate UI update — Producer.** `useApplicationActions`'s mutations
   invalidate `['applications', jobId]` and `['my-jobs']` in their
   `onSuccess`, so the producer's own applicant list and job stat counts
   re-render immediately, no manual refresh.
5. **Immediate UI update — Freelancer.** The freelancer is on a different
   client/session, so it can't be updated via the producer's local cache.
   The existing `useNotificationSocket` hook (mounted at the app root)
   listens for the `notification` socket event the backend pushes on every
   Accept/Reject (including edits) and invalidates
   `['my-applications']` + `['my-application-stats']` + `['my-analytics']`
   the instant it arrives, so the Freelancer dashboard and My Applications
   list update live without polling.
6. **Freelancer dashboard.** `src/screens/DashboardView.tsx` now shows four
   stat cards fed by `GET /api/analytics/me`: **Applications**, **Pending**,
   **Accepted**, **Rejected** (previously only Applications + Accepted were
   shown, and Accepted incorrectly counted only `hired` — fixed to count
   `shortlisted + hired`, matching the same Accepted definition used
   everywhere else in the app). `app/my-applications.tsx` (unchanged, already
   built) lists every application with its own Pending/Accepted/Rejected tag.

## Backend endpoints

| Method & path | Purpose | Change this pass |
|---|---|---|
| `GET /api/applications/projects/:projectId` | Producer: list applicants for a job | Unchanged, reused |
| `PATCH /api/applications/:applicationId/status` | Accept / Reject / edit a decision | **Changed** — now accepts an optional `force` boolean in the body; enforces the final-decision lock described above |
| `GET /api/applications/mine` | Freelancer: My Applications list | Unchanged, reused |
| `GET /api/analytics/me` | Freelancer dashboard stats (already returned `pending`/`shortlisted`/`declined`/`hired` counts) | Unchanged on the backend — the frontend just wasn't reading `pending`/`declined` before |
| Socket.IO `notification` event | Live push to the freelancer on Accept/Reject | Unchanged, reused (already fires on every status change, so it also covers edits) |

## Database tables

| Table | How it's used here |
|---|---|
| `applications` | `status` column read to determine whether a decision is already final, then updated via the existing `UPDATE ... SET status = :status` in `applicationModel.updateStatus()`. No schema change — `shortlisted`/`declined`/`applied`/`hired` are the same four values the column already held. |
| `projects` | Read to confirm the requesting producer owns the job (`project_owner_id` check), unchanged. |
| `notifications` | Insert on every Accept/Reject/edit (pre-existing `notify()` call site, unchanged), read for the freelancer's notification list. |
| `users`, `profiles`, `ratings` | Joined into the applicants query for name/skills/rating on the `ApplicantCard`, unchanged. |

No migration was needed — every column used already existed.

## Files modified

**Backend**
- `backend/services/applicationService.js` — `updateApplicationStatus()` now takes a `force` parameter; added the `FINAL_STATUSES` lock: a second status change on an already-`shortlisted`/`declined` application throws a `409` unless `force` is `true` or the new status is a no-op repeat of the current one.
- `backend/controllers/applicationController.js` — passes `req.body.force === true` through to the service.

**Frontend**
- `src/api/applications.ts` — `useApplicationActions()`'s mutation now takes `{ id, force }` instead of a bare `id`, and sends `force` in the request body.
- `src/components/ApplicantCard.tsx` — added the locked/"Edit decision" UI: buttons hide behind a status tag once decided, an "Edit decision" link reveals them again (with a Cancel affordance), and both action callbacks now receive a `force` flag.
- `app/applications/[jobId].tsx` — wires the new `force`-aware callbacks: a normal Accept/Reject fires immediately, an edit (`force === true`) is confirmed via `Alert.alert` first and surfaces any `409`/error via the existing `extractErrorMessage` util.
- `src/screens/DashboardView.tsx` — added **Pending** and **Rejected** stat cards alongside the existing **Applications**/**Accepted**; fixed **Accepted** to count `shortlisted + hired` (was only counting `hired`, which is never set by this Accept flow and made the card always read 0); stat row wraps responsively (`flexWrap`, `minWidth` per card) for narrow screens.

## Known gaps / notes

- "Edit decision" has no separate audit trail — the `applications` table only stores the current `status` and `updated_at`, not a history of prior decisions. If a full audit log is needed later, that's a new table, not a change to this workflow.
- The lock only applies to the *same* status transition family (`shortlisted`/`declined`); re-submitting the exact same status the row already has is treated as a no-op and always succeeds without requiring `force`, since it changes nothing.
