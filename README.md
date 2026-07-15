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
npm run migrate             # creates notifications + multi-role + profile-photo schema (idempotent)
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

## Backend setup scripts

| Command (run from `backend/`) | What it does |
| --- | --- |
| `npm run migrate` | Creates the `notifications` table, the multi-role schema (`users.active_role`, `user_roles`), and the profile-photo columns (`profiles.profile_photo`, `profiles.cover_photo`) if missing, with backfill for existing accounts (idempotent) |
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

