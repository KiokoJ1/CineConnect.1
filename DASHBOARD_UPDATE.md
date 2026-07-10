# Freelancer Dashboard — Backend Integration

## Context

The project ships as one repo now: the Expo/React Native frontend at the
root, and a Node.js + Express + Oracle (`oracledb`) backend in
[`backend/`](./backend). The frontend originally had a `USE_MOCK` flag that
serves bundled demo data for every screen; this update wires the Freelancer
Dashboard, and the auth flow it depends on, to the real backend instead.

**Scope note:** only the Freelancer Dashboard and the auth calls it depends
on (login/register, so there's a real user + JWT to call the backend with)
were switched to always use the live API. Other screens (jobs, chat,
notifications, admin, browse-talent) still run on `EXPO_PUBLIC_USE_MOCK`
as before — their backend routes weren't part of this pass and some
(notifications, admin, jobs-as-`/api/jobs/*`) don't exist yet on the
backend as-is. Happy to extend to those next if wanted.

## Files changed

**Backend (`backend/`)**
- `app.js` — mounted `analyticsRoutes` (was written but never registered,
  so `GET /api/analytics/me` was unreachable — a 404 for any caller) and
  the new `creditRoutes`.
- `routes/creditRoutes.js` **(new)** — `GET /api/credits/mine`,
  `POST /api/credits`, `DELETE /api/credits/:creditId`, using the
  already-existing `filmCreditModel` (which had no routes exposing it at
  all before this).

**Frontend (`CineConnect-main`)**
- `.env` — `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SOCKET_URL` now point at
  `http://localhost:5000` (the backend's default port) instead of the
  placeholder `https://api.cineconnect.ke`.
- `src/services/api.ts` — fallback base URL corrected from `:4000` to
  `:5000` to match the backend's actual default port.
- `src/api/auth.ts` — `login`/`register` now always call the real backend
  (`POST /api/auth/login`, `/register`) and map its response
  (`{success,message,data:{user,token}}`, `user.fullName`) onto the
  frontend `User` shape. Previously these were mock-only in the default
  config and, even with mock off, didn't unwrap the backend's response
  envelope.
- `src/api/analytics.ts` — rewritten. Old version called a
  `/api/analytics/profile-views?period=` endpoint that doesn't exist on
  the backend. New `useMyAnalytics()` calls the real `GET /api/analytics/me`.
- `src/api/applications.ts` — `useMyApplicationStats` no longer calls the
  nonexistent `/api/applications/my-stats`; derives the same numbers from
  `/api/analytics/me`. (`useApplications`/`useApplicationActions`, used by
  the producer applicant screen, untouched.)
- `src/api/reviews.ts` — `useMyReviewSummary` no longer calls the
  nonexistent `/api/reviews/my-summary`; derives rating/review count from
  `/api/analytics/me`.
- `src/api/profile.ts` **(new)** — `useMyProfile()` (`GET /api/profiles/me`)
  and `useMyCredits()` (`GET /api/credits/mine`), plus a `parseSkills()`
  helper (backend `skills` is a comma-separated Oracle VARCHAR2, not an
  array).
- `src/components/BarChart.tsx` — bug fixes (see below).
- `src/screens/DashboardView.tsx` — rewritten to source every number from
  the hooks above instead of mock data; removed the 7d/30d toggle (see
  "Known limitation" below).

## Bugs fixed

1. **Duplicate React key warning.** `BarChart` used `key={d.label}` — the
   7-day mock dataset had labels `M, T, W, T, F, S, S`, so `T` and `S` each
   collided. Now keyed as `` `${label}-${index}` ``.
2. **Unmounted analytics route.** `routes/analyticsRoutes.js` existed on
   the backend but was never `app.use()`'d in `app.js` — `GET /api/analytics/me`
   404'd for everyone. Fixed by mounting it.
3. **Chart crash/blowup on empty or bad data.** `BarChart` did
   `Math.max(...data.map(...))` with no guard for `data` being `undefined`/
   `null`/empty (which throws or divides by zero). It now filters out
   non-numeric entries and renders a proper empty state instead of a
   broken chart.
4. **Response-envelope mismatch.** The frontend's Axios calls expected raw
   JSON bodies, but the backend wraps everything in
   `{ success, message, data }` (`utils/apiResponse.js`). Any real API call
   from the old `auth.ts`/`analytics.ts`/etc. would have silently received
   the wrong shape. All rewritten hooks now unwrap `response.data.data`.
5. **Field-name mismatch on login/register.** Backend returns
   `user.fullName`; frontend `User` type uses `name`. Old code, when
   pointed at a real backend, would have shown `undefined` everywhere a
   name is displayed. Now mapped explicitly in `auth.ts`.

## APIs used

| Frontend hook | Backend route | Oracle tables queried |
|---|---|---|
| `login`, `register` (`src/api/auth.ts`) | `POST /api/auth/login`, `POST /api/auth/register` | `users` |
| `useMyAnalytics` (`src/api/analytics.ts`) | `GET /api/analytics/me` | `applications`, `ratings` (freelancer branch) |
| `useMyApplicationStats` (`src/api/applications.ts`) | `GET /api/analytics/me` | `applications` |
| `useMyReviewSummary` (`src/api/reviews.ts`) | `GET /api/analytics/me` | `ratings` |
| `useMyProfile` (`src/api/profile.ts`) | `GET /api/profiles/me` | `profiles` joined to `users` |
| `useMyCredits` (`src/api/profile.ts`) | `GET /api/credits/mine` **(new route)** | `film_credits` |

## Known limitation / design deviation

The original mock design had a "Profile Views" chart with a 7-day/30-day
toggle. The Oracle schema has no table tracking profile-view events, and
the backend doesn't compute anything like it — inventing that data would
mean fabricating numbers, so I didn't. The chart now shows real
**"Applications by Month"** (last 6 months, from `GET /api/analytics/me`),
and the 7d/30d toggle was removed since the backend only buckets by month.
If profile-view tracking is wanted, it needs a new table (e.g.
`profile_views(user_id, viewer_id, viewed_at)`) and a write path (e.g. on
`GET /api/profiles/:userId`) before the frontend can show it honestly.

## Remaining work for the Dashboard

- **Refresh tokens:** the Axios interceptor calls `POST /api/auth/refresh`
  on a 401, but the backend has no such route (JWTs just expire after
  `JWT_EXPIRES_IN`, default 1 day). Currently this fails closed (user gets
  signed out), which is safe but not ideal — either add a refresh endpoint
  or extend token lifetime / add silent re-login.
- **Registration roles:** backend accepts `producer | freelancer | client`;
  frontend only ever sends `producer | freelancer`. Not a bug today, just
  worth knowing if a "client" role is ever added to the app.
- **Profile-view tracking:** see above — needs a new table + write path if
  this metric is wanted for real.
- **Film credits UI:** the new `GET/POST/DELETE /api/credits` routes are
  only consumed by the Dashboard's completeness calculation right now —
  there's no screen yet to actually add/edit credits, so that part of the
  completeness score is unreachable for a new user (real data, just no UI
  to change it).
- **Everything outside the Dashboard** (jobs, chat, notifications, admin,
  browse-talent) is still mock-driven via `EXPO_PUBLIC_USE_MOCK`. Several
  of the backend routes those screens expect (`/api/jobs/*`,
  `/api/message-requests`, `/api/admin/*`) don't exist in this backend zip
  — that's a separate integration pass.
