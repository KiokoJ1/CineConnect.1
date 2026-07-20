# CineConnectKE

A React Native (Expo) mobile app connecting Kenyan film-industry freelancers with producers, backed by a Node.js + Express + Oracle API.

> The original UI/UX design reference (Figma export, 18 screens) lives in
> [`CineConnect-main/Design`](./CineConnect-main/Design).

## Tech stack

**Frontend**
- **Expo SDK 52** + **expo-router** (file-based navigation)
- **Zustand** for auth + theme state (persisted via AsyncStorage)
- **React Query + Axios** for data fetching
- **Socket.io-client** for real-time chat and notifications
- TypeScript throughout, `StyleSheet.create` only, theming via `useTheme()` (light/dark, `src/hooks/useTheme.ts`)

**Backend** (`backend/`)
- **Node.js + Express**, **Oracle** (`oracledb`) — no ORM, hand-written SQL
- **Socket.IO**, JWT-authenticated, one room per user (`user:{id}`)
- **JWT** auth (`jsonwebtoken` + `bcryptjs`)

## Getting started

```bash
# 1. Backend
cd backend
cp .env.example .env        # fill in DB_USER, DB_PASSWORD, DB_CONNECT_STRING, JWT_SECRET
npm install
npm run migrate             # creates notifications + multi-role + profile-photo + follows schema (idempotent)
npm run seed:admin          # creates the admin/admin login (idempotent)
npm run dev                 # http://localhost:5000

# 2. Frontend
cd ..
npm install
npm start                   # then press i (iOS), a (Android), or scan the QR with Expo Go
```

### Environment

Configuration is read from `.env` (`EXPO_PUBLIC_*` variables):

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Base URL for the REST API. **Leave unset in dev** — `src/services/api.ts` auto-detects your computer's LAN IP from the Expo bundler host (needed for a physical phone, which can't reach `localhost`). Set explicitly only for a non-local server. |
| `EXPO_PUBLIC_SOCKET_URL` | Socket.io server. Leave unset to reuse the same auto-detected host as the API. |
| `EXPO_PUBLIC_USE_MOCK` | **Legacy, no longer read anywhere.** Every screen now always calls the live backend — see [Project progress](#project-progress). |

There are no canned demo logins anymore (other than the fixed `admin`/`admin`
account — see `npm run seed:admin` above). Sign in with an account that
actually exists in the `users` table: register one through the app, or
insert one directly in Oracle.

## Project progress

Roughly chronological; each entry links the doc written for that pass with
the full endpoint/table/file breakdown.

| Area | Status | Details |
| --- | --- | --- |
| Freelancer Dashboard | ✅ Live backend | [`DASHBOARD_UPDATE.md`](./DASHBOARD_UPDATE.md) |
| Auth (login/register) | ✅ Live backend | fixed alongside the Dashboard — see above |
| Admin panel (stats, manage users) | ✅ Live backend | [`ADMIN_FIX_REPORT.md`](./ADMIN_FIX_REPORT.md), [`ADMIN_BACKEND_INTEGRATION.md`](./ADMIN_BACKEND_INTEGRATION.md) |
| Light/dark theme, base responsiveness | ✅ Fully done — every screen (including auth/onboarding), toggle on Freelancer/Producer/Admin profile screens | see inline `useTheme()`/`useResponsive()` usage |
| Job feed, job detail, apply flow | ✅ Live backend | [`APPLICATION_WORKFLOW.md`](./APPLICATION_WORKFLOW.md) |
| Notifications (persisted + real-time) | ✅ Live backend, new `notifications` table | same doc |
| Producer Accept/Reject, My Applications | ✅ Live backend | same doc |
| Messaging (chat) | ✅ Live backend, real-time | [`MESSAGING_DISCOVERY.md`](./MESSAGING_DISCOVERY.md) |
| Messaging UI (bubbles, grouping, timestamps, seen/delivered, smooth scroll) | ✅ Done | [`MESSAGING_UI.md`](./MESSAGING_UI.md) |
| User discovery (Message button, Discover tab) | ✅ Live backend | [`MESSAGING_DISCOVERY.md`](./MESSAGING_DISCOVERY.md) |
| Multi-role user system | ✅ Backend + frontend done | [`MULTI_ROLE_SYSTEM.md`](./MULTI_ROLE_SYSTEM.md) |
| Editable profile (photo, cover photo, bio, skills, experience, location) | ✅ Backend + frontend done | see [Editable profile](#editable-profile) below |
| Social profile actions (Follow/Unfollow/Message/Hire, real-time counts) | ✅ Backend + frontend done | see [Social profile actions](#social-profile-actions) below |
| Profile statistics (ratings, reviews, completed jobs, applications) | ✅ Backend + frontend done | [`USER_PROFILE.md`](./USER_PROFILE.md) |
| Backend search & filtering (users, jobs) | ✅ Backend done, frontend still client-side | see [Backend search & filtering](#backend-search--filtering) below |
| Application status "final decision lock" | ⏳ Not yet built | requested, not completed in this session — see note below |
| Job category/production-type taxonomy | ⚠️ Known gap | Oracle schema has no fixed taxonomy; documented in `APPLICATION_WORKFLOW.md` |
| Content moderation / reports | ⚠️ Known gap | no table exists; admin "Flagged" stat is honestly `0`, not fabricated |

**As of the messaging pass, `EXPO_PUBLIC_USE_MOCK` is no longer read by any
file in `src/api/`** — every domain (auth, dashboard, jobs, applications,
notifications, admin, messaging, user discovery) always calls the live
backend now. `src/services/mock.ts` still exists but nothing imports it
anymore; it wasn't deleted, just superseded.

**Note on the status-lock task:** a request to prevent changing an
application's status once a final decision has been made (unless explicitly
edited) was started but not completed/delivered in this session — flagging
so it isn't assumed done.

## Multi-role user system

Backend + frontend support for an account holding more than one role (e.g.
someone who is both a freelancer and a producer) and switching which one is
"active" — a **Switch Role** control in Profile/Settings on every role's
profile screen. Full details, including the frontend's cache-clearing and
navigation behavior on switch, are in
**[`MULTI_ROLE_SYSTEM.md`](./MULTI_ROLE_SYSTEM.md)**. Summary of the
backend piece (unchanged since it was built):

### Schema

- `users.active_role` (new column) — which of the account's roles is
  currently in effect. Every existing route that checks `req.user.role`
  (route guards, admin checks, `sanitizeUser()` — the shape returned to the
  frontend on login/register/`/me`) now reads this value, **not** the
  original `users.role` column. `users.role` is left untouched as the
  historical "role at signup" record.
- `user_roles` (new table) — one row per role an account holds:
  `(user_role_id, user_id, role, created_at)`, unique on `(user_id, role)`.

Both are created by `npm run migrate` (see Getting Started above), which
also **backfills every existing account**: a `user_roles` row matching
their current `role`, and `active_role` set to that same value — so nothing
that worked before this migration changes behavior unless a role is
explicitly added/switched afterward.

### Why `req.user.role` didn't need to change everywhere

`authMiddleware.js`'s `authenticate` re-fetches the user from Oracle on
**every request** (it was never trusting a role baked into the JWT). Since
`sanitizeUser()` now sources `role` from `active_role`, every existing
route guard (`requireRole('admin')`, project-ownership checks, etc.) and
every frontend consumer of `user.role` automatically reflects whichever
role is currently active — with zero changes needed to any of those call
sites, and no token refresh required when switching (the *next* request
just sees the new value).

### Endpoints

| Method & path | Purpose |
|---|---|
| `GET /api/auth/roles` | `{ roles: string[], activeRole: string }` — every role this account holds |
| `POST /api/auth/roles` | `{ role }` — grants an additional role to the signed-in account (same vocabulary as registration: `producer`/`freelancer`/`client`; doesn't switch to it) |
| `PATCH /api/auth/active-role` | `{ role }` — switches the active role to one the account already has (403 if it doesn't have that role); returns the updated user |

Trying it against a locally running backend:

```bash
TOKEN="<a real JWT from POST /api/auth/login>"

curl -s http://localhost:5000/api/auth/roles \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST http://localhost:5000/api/auth/roles \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"role":"producer"}'

curl -s -X PATCH http://localhost:5000/api/auth/active-role \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"role":"producer"}'
```

### Frontend

Built — see [`MULTI_ROLE_SYSTEM.md`](./MULTI_ROLE_SYSTEM.md) for the
**Switch Role** control, the "add another role" picker, and exactly what
happens (auth state, cache, navigation) the instant a switch succeeds.

## Editable profile

Freelancer profile screen now shows — and can edit — **profile photo, cover
photo, bio, skills, experience level, and location**. Reachable via the
pencil (✎) button on the profile screen's header band, which opens
`app/edit-profile.tsx`.

### What was already there vs. what was added

Most of this had real backend support already (`bio`, `location`, `skills`,
`experienceLevel` all existed in the `profiles` table and were already
saveable via `PUT /api/profiles/me`) — they just had **no edit screen** to
reach them, and the profile *view* itself never displayed `bio` or
`experienceLevel` at all (no UI slot existed for either). Genuinely new
this pass:
- `profiles.profile_photo` / `profiles.cover_photo` (new `CLOB` columns).
- The Edit Profile screen itself.
- Bio and Experience sections on `FreelancerProfileView` (previously only
  Skills/Credits/Day Rate were shown — a bio existed nowhere in the UI even
  though the field was already in the schema).
- Real photos replacing the initials circle wherever a photo has been set
  (`Avatar` component gained an optional `photoUri`).

### Why photos are stored directly in Oracle, not an external file store

No cloud storage (S3-equivalent, CDN, etc.) is part of this stack, and
adding one wasn't part of the ask. Photos are captured via
`expo-image-picker`, compressed to a JPEG (quality 0.5, resolved on-device),
base64-encoded, and sent as a `data:image/jpeg;base64,...` string straight
into a `CLOB` column — genuinely persisted in Oracle, exactly as asked,
with no new infrastructure. The backend's JSON body limit was raised from
Express's 100kb default to 8MB to accommodate this, and `oracledb.fetchAsString`
is configured for `CLOB` so the model code reads them back as plain strings.

### Backend

| Change | Detail |
|---|---|
| `profiles.profile_photo`, `profiles.cover_photo` | New `CLOB` columns, added by `npm run migrate` |
| `PUT /api/profiles/me` | Unchanged route, extended payload — same "send the whole profile" upsert contract as every other field |
| Validation | Must be a `data:image/(jpeg\|png\|webp);base64,...` string under ~4.5MB decoded, or the request 400s with a clear message |

**Full-replace semantics, same as every other field on this endpoint:**
`PUT /api/profiles/me` was already a blunt full-replace before this pass
(omit `bio` and it was already set to `null`) — the frontend form now
round-trips whatever it isn't editing (rate, availability, portfolio URL)
so saving a bio doesn't silently erase them. This is a frontend
responsibility, not a backend change, and matches the pattern the rate
fields already relied on.

### Frontend

- `app/edit-profile.tsx` **(new)** — photo/cover pickers, bio (textarea),
  skills (comma-separated, matching the existing convention elsewhere),
  experience (a `Select` with four preset levels), location, Save.
- `src/api/profile.ts` — `useUpdateProfile()`, `useProfileByUserId()` (for
  viewing *someone else's* profile with real data too — the producer
  viewing a freelancer's profile page had the exact same "no bio/photo
  ever shown" gap as the freelancer's own profile screen did).
- `src/components/Avatar.tsx` — optional `photoUri` renders a real image
  instead of the initials circle; every existing caller is unaffected
  (backward compatible, nothing else changed).
- `src/components/FreelancerProfileView.tsx` — cover photo banner, real
  avatar photo, new Bio and Experience sections, optional edit button.
- `src/screens/FreelancerProfileScreen.tsx`, `app/talent/[id].tsx` — both
  now merge the auth/identity user object with the real `profiles` row
  before rendering, instead of showing an always-empty bio/skills/photo
  shell.

### Known gaps (documented, not fabricated)

- **Producer's profile screen wasn't extended.** `ProducerProfileScreen`
  has a fundamentally different, simpler layout (City/Email only, no
  bio/skills concept in its UI at all) — the backend's `profiles` table is
  generic enough to support a producer profile too, but building that UI
  wasn't done this pass. The task's fields (skills, experience) are
  freelancer-oriented concepts in this app's existing design anyway.
- **No image cropping/resizing beyond what `expo-image-picker`'s built-in
  editor does.** No dedicated compression library — quality is fixed at
  0.5, not adaptive to the source image's size.
- **Every other small avatar in the app** (chat bubbles, cards, admin
  lists, conversation rows) still shows initials, not the real photo —
  only the full profile screens (own profile, viewed-by-producer) show it.
  Propagating a real photo into every list-item avatar across the app
  would need `photoUrl` added to several more backend responses
  (`GET /api/users`, `GET /api/applications/...`, etc.) and wasn't part of
  "complete the editable profile."

## Social profile actions

**Follow, Unfollow, Message, and Hire** buttons on a freelancer's profile
screen (`app/talent/[id].tsx`), with follower/following counts that update
in real time — both for the person doing the following (instant, no round
trip) and for the person being followed (live push, if their own profile
screen happens to be open).

### New table

```sql
CREATE TABLE follows (
  follow_id   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  follower_id NUMBER NOT NULL REFERENCES users(user_id),
  followee_id NUMBER NOT NULL REFERENCES users(user_id),
  created_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT uq_follows UNIQUE (follower_id, followee_id),
  CONSTRAINT chk_follows_not_self CHECK (follower_id != followee_id)
);
```
Created by `npm run migrate` (see below), along with indexes on both
`follower_id` and `followee_id` — every count query filters by one of those.

### Endpoints

| Method & path | Purpose |
|---|---|
| `GET /api/follows/:userId` | `{ isFollowing, followerCount, followingCount }` for a profile screen |
| `POST /api/follows/:userId` | Follow — idempotent (following someone twice is a no-op, not an error) |
| `DELETE /api/follows/:userId` | Unfollow |

Following someone does two things beyond the database row: pushes a
`follow_update` socket event to the person being followed (same
`emitToUser()` used by notifications/messages), and leaves a durable
"New Follower" notification via the existing `notify()` helper — reusing
both pieces of real-time infrastructure exactly as they were, no new
plumbing needed.

### Two different kinds of "real time" here

- **The person clicking Follow** sees the button flip and the count change
  instantly — this is a React Query optimistic update (`onMutate`), not a
  socket round trip. It's their own action; there's no reason to wait on
  the network to show it.
- **The person being followed** only finds out via the socket. If they
  happen to have their own profile screen open when it happens, the count
  updates live; if not, the notification is sitting there (persisted) next
  time they check, and the count itself is correct on next fetch regardless
  since it's computed fresh from the `follows` table every time, never
  cached server-side.

### "Hire" — a deliberate scope decision, not a new workflow

There's no direct-hire-without-a-job-posting concept anywhere in this
app's data model — hiring happens through the existing Job Application
workflow (`APPLICATION_WORKFLOW.md`: apply → Accept). Building a parallel
hiring system for this button would have meant inventing project/contract
state that doesn't exist in the schema. Instead, **Hire opens a chat with
a pre-filled message** ("Hi, I'd like to hire you for a project...") —
100% reuse of the existing messaging feature, zero new backend surface for
the button itself. The button only shows when the viewer's *active* role
(see Multi-role above) is `producer`, since hiring is a producer action.

### Files added/modified

**Backend**
- `backend/models/followModel.js`, `backend/routes/followRoutes.js` **(new)**.
- `backend/app.js` — mounted at `/api/follows`.
- `backend/scripts/migrate.js` — the `follows` table + two indexes.

**Frontend**
- `src/api/follows.ts` **(new)** — `useFollowStatus()`, `useFollowActions()` (optimistic follow/unfollow).
- `src/hooks/useNotificationSocket.ts` — new `follow_update` listener.
- `src/types/index.ts` — `User` gained `followerCount`/`followingCount`; `NotificationType` gained `new_follower`.
- `src/components/NotificationRow.tsx` — icon for the new notification type.
- `src/components/FreelancerProfileView.tsx` — follower/following counts displayed under the rating row.
- `app/talent/[id].tsx` — Follow/Unfollow, Message, and (producer-only) Hire buttons.
- `src/screens/FreelancerProfileScreen.tsx` — fetches and displays the signed-in user's own counts (also what the `follow_update` socket push updates when someone follows *you*).
- `app/chat/[id].tsx` — accepts an optional `draft` route param, used by the Hire flow to pre-fill the message.

### Known gaps (documented, not fabricated)

- **No followers/following list screen** — counts are real and live, but
  there's nowhere to tap through and see *who* follows you. Would reuse the
  existing Discover-tab user-list pattern from `MESSAGING_DISCOVERY.md` if
  built.
- **No unfollow confirmation** — follow/unfollow are both single-tap,
  matching how most social apps treat this specific action (unlike, say,
  deleting an application). Worth a product decision if that's wrong.

## Profile statistics

Real **ratings, reviews, completed jobs, and applications** on the profile
screen — the star rating and review list were UI slots that existed but
had nothing populating them (`user.rating` was always `0`); no schema
changes needed, just a new `GET /api/profiles/:userId/stats` endpoint
composing existing rating/application queries for *any* user, not only
"me". Full breakdown in **[`USER_PROFILE.md`](./USER_PROFILE.md)**.

## Backend search & filtering

Real search, filtering, and pagination for **users** and **jobs**, all
against Oracle — no schema changes, and every existing caller keeps working
exactly as before (see "Backward compatibility" below).

### `GET /api/users`

Powers Browse Talent, the Messages "Discover" tab, and `GET /api/admin/users`
internally (same query builder, admin route just doesn't drop admin
accounts/self from the results).

| Param | Matches |
|---|---|
| `search` | Name, skills, **or** location (broad OR match) |
| `role` | Exact role (`freelancer`/`producer`/`client`/`admin`) |
| `skills` | Just the skills field, narrower than `search` |
| `location` | Just the location field, narrower than `search` |
| `page`, `limit` | Real pagination (`limit` capped at 100) |

`skills`/`location` needed a join that didn't exist before — those fields
live on `profiles`, not `users`, and the old query only ever touched
`users`. The join is `LEFT JOIN` (not `INNER`), so an account with no
profile row yet still matches on name — it just won't match a skills/
location search, which is correct, not a bug.

### `GET /api/projects`

The open-jobs feed.

| Param | Matches |
|---|---|
| `search` | Title, description, **or** role needed |
| `role` | Role needed (jobs have no separate "skills" field — `role_needed` is the closest equivalent, same free-text-not-a-taxonomy caveat as `APPLICATION_WORKFLOW.md` already documents) |
| `location` | Job location |
| `minBudget`, `maxBudget` | Budget range |
| `page`, `limit` | Real pagination (`limit` capped at 100, defaults to 20 once paginating) |

### Pagination response shape

Every paginated endpoint adds a `pagination` object **alongside** its
existing array key — additive, not a breaking change to the response shape:

```json
{
  "success": true,
  "message": "...",
  "data": {
    "users": [ /* unchanged shape */ ],
    "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
  }
}
```

### Backward compatibility — how "don't break existing endpoints" was kept literal

Both endpoints had real, working callers before this pass
(`useAllUsers`/`useTalent`/`useAdminUsers` on the frontend; `useJobsFeed`,
which fetches the **entire** open-jobs list and paginates client-side —
see `APPLICATION_WORKFLOW.md`'s known gap about this). Changing the
defaults would have silently broken both:

- `GET /api/users` called with no `page`/`limit` still returns up to 200
  rows unpaginated — the exact cap it always had. Pagination only kicks in
  if a caller explicitly passes `page` or `limit`.
- `GET /api/projects` called with no filters/pagination still returns
  **every** open project unbounded, exactly as before — required, since
  the frontend's client-side pagination logic assumes it's slicing the
  complete list. Real server-side pagination only activates if a caller
  explicitly passes `page`/`limit`.

Neither model function's old call sites (`projectService.listMyProjects`,
`applicationModel` counts, etc.) were touched — only `findAll` and
`findAllOpen` changed, and only their *callers* were updated to handle the
new (additive) return shape.

### Known gaps (documented, not fabricated)

- **Frontend still does client-side filtering/pagination** for jobs
  (`src/api/jobs.ts`) and hasn't been switched to the new server-side
  `page`/`limit`/filter params — this pass was scoped to the backend only,
  per the request. Wiring the frontend to use real pagination instead of
  fetching the full list is a natural next step.
- **No full-text search index** — every match is a `LIKE '%...%'` scan, not
  Oracle Text or a trigram index. Fine at this app's current scale; would
  need revisiting if the `users`/`projects` tables grow large.

## Backend setup scripts

| Command (run from `backend/`) | What it does |
| --- | --- |
| `npm run migrate` | Creates the `notifications` table, the multi-role schema (`users.active_role`, `user_roles`), the profile-photo columns (`profiles.profile_photo`, `profiles.cover_photo`), and the `follows` table if missing, with backfill for existing accounts (idempotent) |
| `npm run seed:admin` | Creates or repairs the `admin`/`admin` login (idempotent) — public registration deliberately can't create an admin account |

## Project structure

```
app/                       expo-router routes
  _layout.tsx              providers, auth guard, theme, global socket listener
  index.tsx                splash
  onboarding / login / register / forgot-password
  (freelancer)/            freelancer tab group (home, search, chat, notifs, profile)
  (producer)/              producer tab group
  (admin)/                 admin stack (panel + manage users), role-guarded
  job/[id], talent/[id], post-job, applications/[jobId], chat/[id], my-applications
backend/                   Node.js + Express + Oracle API
  routes/, controllers/, services/, models/   REST layer, by resource
  scripts/                 one-off/idempotent setup scripts (migrate, seed:admin)
src/
  api/                     React Query hooks + REST calls — all live backend, no mock path
  components/              shared UI (Button, Input, Card, cards, chat, …) — all theme-aware
  constants/               design tokens (colors: light+dark palettes, typography, layout)
  hooks/                   useTheme, useResponsive, useNotificationSocket
  screens/                 screen bodies shared across route files
  services/                axios client (LAN-IP auto-detect, JWT refresh interceptor), socket, query client
  store/                   Zustand auth + theme stores
  types/                   domain models
  utils/                   avatar, formatting, routing helpers
```

## Verifying

```bash
npm run typecheck           # tsc --noEmit
node --check <file>.js      # backend syntax check (no test suite configured yet)
npx expo-doctor             # dependency / config checks
```

