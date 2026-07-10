# Admin Panel — Infinite Loading Fix

## Root cause

Two independent bugs combined to produce "stuck on loading forever":

**1. Missing backend — the actual failure.** `src/api/admin.ts` called
`GET /api/admin/stats`, `GET /api/admin/users`, and
`PATCH /api/admin/users/:id/(suspend|restore)`, but **none of these routes
existed anywhere in `backend/`** — no `adminRoutes.js`, no admin logic in
`userModel.js`, nothing mounted in `app.js`. With `EXPO_PUBLIC_USE_MOCK=false`
(or whenever mock is off), every one of these calls hit Express's catch-all
`notFoundHandler` and came back as a 404 — the request *did* complete, just
with an error.

**2. The UI never showed that error — the visible symptom.**
`app/(admin)/index.tsx` gated its content with:

```tsx
if (isLoading || !stats) {
  return <LoadingState />;
}
```

`isLoading` is only true during the *initial* fetch attempt; once a React
Query request settles — success **or** failure — `isLoading` becomes
`false`. But on failure, `stats` (the query's `data`) stays `undefined`
forever, so `!stats` stayed `true` and the screen kept rendering the loading
spinner indefinitely. There was no `isError` branch at all (contrast with
`app/(admin)/users.tsx`, which already did this correctly). So the network
request finished quickly with a 404, but the screen had no way to express
that and just sat on the spinner — indistinguishable from "hanging" to
anyone using the app.

**Contributing gap found during the trace:** there was also no role check
anywhere. The backend had no `requireRole`-style middleware, and
`app/(admin)/_layout.tsx` didn't check the signed-in user's role — only the
root layout's generic "is there a token" guard applied. A non-admin user who
navigated to `/(admin)` by URL or back-button would have hit the same broken
screen instead of being redirected.

## How to reproduce (as it was)

1. Set `EXPO_PUBLIC_USE_MOCK=false` (or otherwise reach a state where the
   admin API calls go to the real backend).
2. Sign in as a user with `role = 'admin'` in the `users` table.
3. Land on the Admin Panel tab.
4. `GET /api/admin/stats` 404s (route doesn't exist) → React Query settles
   into an error state → `isLoading` is `false`, `stats` is still
   `undefined` → `isLoading || !stats` stays `true` forever → spinner never
   goes away.

## Flow traced (per the investigation checklist)

| Layer | Finding |
|---|---|
| Route protection / role checks | **Gap.** No backend role middleware; no frontend role guard on `(admin)`. Fixed. |
| Frontend API request | Called the right paths, but assumed a raw JSON body — the live backend wraps every response as `{ success, message, data }`, so even a successful call would have handed `data.data` shaped payload where a flat one was expected. Fixed. |
| Backend controller and routes | **Missing entirely.** No `adminRoutes.js`, nothing mounted in `app.js`. Fixed. |
| Oracle database query | No admin-facing queries existed (`userModel.js` had no `findAll`/`countAll`/`updateStatus`; no active-jobs or message counts). Fixed. |
| API response | N/A until routes existed — now returns the standard `{ success, message, data }` envelope like every other endpoint. |
| React Query / state management | Query hooks themselves were fine; the **consuming screen's** loading/error branching was the actual bug. Fixed. |

## Files modified

**Backend**
- `backend/middleware/authMiddleware.js` — added `requireRole(...roles)`.
- `backend/models/userModel.js` — added `countAll()`, `findAll({role, search})`, `updateStatus(id, status)`.
- `backend/models/projectModel.js` — added `countByStatus(status)`.
- `backend/models/messageModel.js` — added `countAll()`.
- `backend/routes/adminRoutes.js` **(new)** — `GET /stats`, `GET /users`, `PATCH /users/:id/suspend`, `PATCH /users/:id/restore`, all behind `authenticate` + `requireRole('admin')`.
- `backend/app.js` — mounted the new router at `/api/admin`.

**Frontend**
- `app/(admin)/index.tsx` — fixed the loading-gate bug: now branches `isLoading` → `isError` (with a Retry button, calling `refetch()`) → content, so it can never get stuck. Also switched to `useTheme()` for consistency with the rest of the app.
- `app/(admin)/_layout.tsx` — added a role guard; a non-admin who reaches this route group is redirected to their own home instead of hitting a broken/inappropriate screen.
- `src/api/admin.ts` — unwrap the backend's `{ success, message, data }` envelope; map the backend's `fullName`/user shape onto the frontend `User` type (same class of bug fixed in auth.ts earlier).

## Fix applied

1. Built the missing Admin backend (routes + model functions + role middleware), matching the existing architecture (same file layout, same `sendSuccess`/`sendError` helpers, same Oracle connection-per-call pattern already used everywhere else in `backend/`).
2. Fixed the frontend response-envelope mismatch so a successful call actually populates `stats`/`data`.
3. Fixed the actual reported bug: the Admin Panel screen now has three distinct, terminal states — loading, error (with retry), and content — so it is structurally impossible for it to stay on the spinner once the request has settled, regardless of whether the backend call succeeds or fails.
4. Added the missing role check so this whole feature is only reachable by an admin in the first place.

## Known gap (documented, not fabricated)

The "Flagged" stat has no backing data — there is no content-moderation/report
table in the Oracle schema. It's returned as `0` rather than invented. If
moderation/reporting becomes a real feature, it needs a table (e.g.
`reports(report_id, target_type, target_id, reporter_id, reason, status, created_at)`)
and the corresponding query in `adminRoutes.js`.
