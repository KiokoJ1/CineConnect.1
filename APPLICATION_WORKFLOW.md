# Job Application Workflow

## Workflow implemented

1. **Freelancer taps Apply** (job feed card or job detail screen) →
   `POST /api/applications/projects/:projectId` → Oracle `applications` row
   created. Duplicate applications are rejected server-side with a 409
   (pre-existing check in `applicationService.js`, confirmed and reused,
   not rewritten).
2. On success, the backend **persists two notifications** (`notifications`
   table) — one for the project owner ("New Application"), one for the
   freelancer ("Application Submitted") — and **pushes both live** over a
   new Socket.IO connection to whichever of the two users are currently
   connected.
3. The frontend's Apply button reflects the freelancer's *real* application
   state, not local-only state: it's derived from `useAppliedJobIds()`
   (built on `GET /api/applications/mine`), so **any** screen showing that
   job — the feed card or the detail screen — shows "Applied" in solid
   green and disabled, and would automatically revert if the application
   were ever removed (see "Known gap: withdrawing" below).
4. **Producer side**: opening a job's Applications screen calls
   `GET /api/applications/projects/:projectId`. Tapping Accept/Reject calls
   the existing `PATCH /api/applications/:id/status` with
   `{ status: 'shortlisted' | 'declined' }` — same status values the app
   already used internally, only the *button/tag wording* changed to
   "Accept"/"Reject"/"Accepted"/"Rejected" per this task's spec. This in
   turn persists + pushes a notification to the freelancer.
   `GET /api/projects/mine` (My Jobs) now returns real, live
   `applicationCount`/`shortlistedCount` per job (previously these fields
   existed on the type but nothing populated them).
5. **Freelancer side**: a new **My Applications** screen
   (`app/my-applications.tsx`, reachable by tapping the Dashboard's
   "Applications" stat card) lists every application via
   `GET /api/applications/mine` with a Pending / Accepted / Rejected tag.
6. A socket listener (`useNotificationSocket`, mounted once at the app
   root) invalidates the relevant React Query caches the instant a
   `notification` event arrives — the producer's job/application counts and
   the freelancer's application list update **without a manual refresh**,
   on top of the always-persisted notification record.

## Backend endpoints used

| Method & path | Purpose | New or existing |
|---|---|---|
| `POST /api/applications/projects/:projectId` | Apply to a job | Existing — was unreachable from the frontend (wrong path called), now wired correctly |
| `GET /api/applications/projects/:projectId` | Producer: list applicants | Existing — same fix |
| `GET /api/applications/mine` | Freelancer: My Applications | Existing — wasn't called by the frontend at all before this |
| `PATCH /api/applications/:applicationId/status` | Accept / Reject | Existing — frontend was calling two nonexistent endpoints (`/shortlist`, `/decline`); fixed to call the real one |
| `GET /api/projects` | Job feed | Existing — frontend was calling a nonexistent `/api/jobs` |
| `GET /api/projects/:id` | Job detail | Existing — same fix |
| `GET /api/projects/mine` | Producer's own jobs | Existing — same fix |
| `POST /api/projects` | Post a job | Existing — same fix |
| `GET /api/notifications` | Notification list / bell badge | Existing route path, but **backend implementation didn't exist at all** — built this pass |
| `POST /api/notifications/read-all` | Mark all read | Same — built this pass |
| Socket.IO `connection` (JWT-authenticated) + `notification` event | Real-time push | **New** — no Socket.IO server existed on the backend at all before this pass, even though the frontend already had a socket client written and waiting for one |

Per the "reuse existing APIs, only build what's genuinely missing" instruction: every *application/project* endpoint already existed and only needed correct wiring from the frontend. The only genuinely new backend surface is **notifications** (table + model + routes) and **Socket.IO** (had zero prior implementation) — both required for the notification requirement to be real rather than mocked.

## Oracle tables used

| Table | How |
|---|---|
| `applications` | Insert on apply; read for producer's applicant list, freelancer's My Applications, and duplicate-check; update on Accept/Reject |
| `projects` | Read for the job feed/detail; `COUNT(*)` for producer's `jobsPosted` |
| `users` | Joined into the applications query for the applicant's name/email |
| `profiles` | Left-joined into the applications query — `skills` used as a stand-in "title" on the applicant card (no separate profession field exists) |
| `ratings` | Subquery for the applicant's average rating on the applicant card, and the job-poster's average rating on the job detail screen |
| `notifications` **(new table)** | Insert on apply (×2) and on Accept/Reject (×1); read for the notification list; update (`is_read`) on mark-all-read |

### New table: `notifications`
No migration tooling existed in the repo, so a Node script was added
(matching the existing `seedAdmin.js` idiom) rather than a raw `.sql` file
the person would have to run manually through separate tooling:

```bash
cd backend
npm install   # pulls in the new socket.io dependency
npm run migrate
```

```sql
CREATE TABLE notifications (
  notification_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          NUMBER NOT NULL REFERENCES users(user_id),
  type              VARCHAR2(50) NOT NULL,
  title             VARCHAR2(200) NOT NULL,
  body              VARCHAR2(500),
  data              VARCHAR2(1000),  -- JSON: { projectId, applicationId }
  is_read           NUMBER(1) DEFAULT 0 NOT NULL,
  created_at        TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at);
```
The script is idempotent — safe to run again on an existing database (it
detects Oracle's "already exists" error and skips).

## Files modified

**Backend**
- `backend/package.json` — added `socket.io` dependency, `migrate` script.
- `backend/server.js` — wraps the Express app in `http.createServer` so Socket.IO can attach (was a bare `app.listen()`).
- `backend/services/socketService.js` **(new)** — JWT-authenticated Socket.IO server; joins each connection to a `user:{id}` room; exposes `emitToUser()`.
- `backend/services/notificationService.js` **(new)** — `notify()`: persist to Oracle, then push live if connected. Single call site for both.
- `backend/models/notificationModel.js` **(new)** — CRUD for the new table.
- `backend/routes/notificationRoutes.js` **(new)** — `GET /`, `POST /read-all`.
- `backend/scripts/migrate.js` **(new)** — creates the `notifications` table.
- `backend/services/applicationService.js` — `applyToProject` now sends the two notifications after a successful insert; `updateApplicationStatus` now notifies the freelancer on Accept/Reject.
- `backend/models/applicationModel.js` — added `countByProject()` (for live counts); enriched the applications SELECT with the applicant's `skills` and average `rating` (previously only name/email).
- `backend/models/projectModel.js` — added `countByOwner()` (producer's `jobsPosted`).
- `backend/services/projectService.js` — `getProject`/`listMyProjects` now attach real `applicationCount`/`shortlistedCount`/`ownerJobsPosted`/`ownerRating` instead of leaving those fields unpopulated.
- `backend/app.js` — mounted `notificationRoutes`.

**Frontend**
- `src/api/jobs.ts` — rewritten: was calling a nonexistent `/api/jobs/*`; now calls the real `/api/projects/*`, with a `mapBackendJob()` translator and client-side pagination/category-filter (the backend has no server-side paging, so this preserves the existing `useInfiniteQuery` screen contract rather than rewriting `FreelancerHomeScreen`).
- `src/api/applications.ts` — `useApplications`/`useApplicationActions` fixed to call the real endpoints; added `useMyApplications()` and `useAppliedJobIds()`.
- `src/api/notifications.ts` — rewritten with zero mock path; maps the backend's row shape, computes relative timestamps/grouping.
- `src/services/socket.ts` — no longer gated by the mock flag (notifications need it live regardless of which other domains are still mock-driven).
- `src/hooks/useNotificationSocket.ts` **(new)** — subscribes to the `notification` event; invalidates notifications, and, based on the event's type, the producer's `my-jobs`/`applications` or the freelancer's `my-applications` caches.
- `app/_layout.tsx` — mounts `useNotificationSocket()` (inside the query-client boundary via a small `AppShell` wrapper).
- `src/components/Button.tsx` — added a solid `success` variant (filled green) alongside the existing `success-outline`, for the "Applied" state.
- `src/components/JobCard.tsx` — new `applied` prop swaps label/color/disabled state.
- `src/screens/FreelancerHomeScreen.tsx` — wires `useAppliedJobIds()` into each `JobCard`; clearer duplicate-application (409) handling.
- `app/job/[id].tsx` — same Applied-state wiring on the detail screen's button; also converted to the shared `useTheme()` pattern (was still static-light).
- `app/my-applications.tsx` **(new)** — freelancer's application list with Pending/Accepted/Rejected tags, responsive (1 column phone / 2 tablet+web).
- `src/screens/DashboardView.tsx` — the "Applications" stat card now navigates to My Applications.
- `app/applications/[jobId].tsx` — tab/button wording updated to Accept/Reject/Accepted/Rejected; added a retry-on-error state; converted to `useTheme()`.
- `src/components/ApplicantCard.tsx` — button/tag labels updated to Accept/Reject/Accepted/Rejected (status values unchanged).
- `src/components/NotificationRow.tsx` — icon mapping extended for the three new notification types.
- `src/types/index.ts` — `NotificationType` extended with `new_application`, `application_accepted`, `application_declined`.
- `src/components/Card.tsx` — `style` prop widened to accept style arrays (needed by the new responsive screens; a small general-purpose fix, not application-specific).
- `src/utils/format.ts` — added `formatRelativeTime()` / `relativeGroup()` (notification timestamps).

## Known gaps (documented, not fabricated)

- **Withdrawing an application**: there is no `DELETE`/withdraw endpoint on
  the backend, so this wasn't built — task item 2 only asked that the
  button correctly *revert* if a withdrawal happens in the future, which it
  will, structurally: the "Applied" state is derived live from
  `GET /api/applications/mine`, not local component state, so removing the
  underlying row (once such an endpoint exists) reverts the button
  automatically on the next fetch/socket event, with zero UI changes needed.
- **Job category/production-type**: the Oracle schema has no fixed
  category taxonomy — `roleNeeded` is free text. Category pill filtering is
  therefore a substring match against that free text, not an exact
  taxonomy match. `productionType` has no backend field at all and is
  currently blank.
- **Applicant "title"** on the producer's applicant card is approximated as
  the freelancer's first listed skill (real data, just not a perfect
  semantic match for "profession") since no dedicated title/profession
  field exists on `profiles`.
- **Socket reconnection/offline queueing** wasn't built out beyond the
  default socket.io-client reconnection — a notification created while a
  user is offline is still durably in Oracle and will appear on their next
  `GET /api/notifications` fetch, just not instantly.
