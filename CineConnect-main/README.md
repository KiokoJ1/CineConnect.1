# CineConnectKE

A React Native (Expo) mobile app connecting Kenyan film-industry freelancers with producers.

> The original UI/UX design reference (Figma export, 18 screens) lives in
> [`CineConnect-main/Design`](./CineConnect-main/Design).

## Tech stack

- **Expo SDK 52** + **expo-router** (file-based navigation)
- **Zustand** for global auth state
- **React Query + Axios** for data fetching (2-minute `staleTime`)
- **AsyncStorage** for JWT persistence
- **Socket.io-client** for real-time chat
- TypeScript throughout, `StyleSheet.create` only (all colour via `src/constants/colors.ts`)

## Getting started

```bash
npm install
npm start          # then press i (iOS), a (Android), or scan the QR with Expo Go
```

### Environment

Configuration is read from `.env` (`EXPO_PUBLIC_*` variables):

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Base URL for the REST API (defaults to `http://localhost:5000`, the backend's default port — see [Backend integration](#backend-integration)) |
| `EXPO_PUBLIC_SOCKET_URL` | Socket.io server for chat |
| `EXPO_PUBLIC_USE_MOCK` | `true` (default) serves the bundled demo dataset for the screens that still have no backend route: **admin extras, browse-talent, and message requests**. Jobs, applications, notifications, and chat/messaging now always call the live backend regardless of this flag — see below. |

### Backend integration

This app talks to the companion Node.js + Express + Oracle API in
[`backend/`](./backend). As of this update:

- **Auth (login/register), the Freelancer Dashboard, Jobs, Applications,
  Notifications, and Chat/Messaging always hit the live backend** — there
  is no mock fallback for these. You need the backend running (and a
  reachable Oracle DB) to use the app at all in practice.
- **Admin extras, browse-talent, and message requests** still run on the
  bundled mock dataset via `EXPO_PUBLIC_USE_MOCK`, since those screens'
  backend routes aren't wired up yet.

For how messaging specifically works — conversation list, chat bubbles,
Seen/Delivered receipts, typing indicators, presence, and the Socket.IO
wiring — see **[`MESSAGING_UI.md`](./MESSAGING_UI.md)**.

Accounts can now hold more than one role (Producer / Freelancer / Client)
and switch between them from Profile without logging out — see
**[`MULTI_ROLE_SYSTEM.md`](./MULTI_ROLE_SYSTEM.md)**.

Profiles are now fully editable — profile photo, cover photo, bio,
location, experience level, skills, and film-credit experience entries, all
saved to Oracle — see **[`PROFILE_EDITING.md`](./PROFILE_EDITING.md)**. This
adds `expo-image-picker` as a new dependency; run
`npx expo install expo-image-picker` after pulling this change.

Portfolios support images, videos, and a Featured Work section, loaded from
Oracle — see **[`PORTFOLIO.md`](./PORTFOLIO.md)**.

Talent profiles now have Follow/Unfollow (with live follower counts),
Message, and Hire actions — see **[`FOLLOW_SOCIAL.md`](./FOLLOW_SOCIAL.md)**.
This also fixed `useUser`/`useTalent`, which were previously calling a
`/api/users` endpoint that doesn't exist — they now call the real
`/api/profiles/*` endpoints, so viewing a talent profile / browsing talent
against the live backend actually works now.

To run against the live backend:

```bash
# 1. Backend — configure Oracle + JWT, then start it
cd backend
cp .env.example .env        # fill in DB_USER, DB_PASSWORD, DB_CONNECT_STRING, JWT_SECRET
npm install
npm run dev                  # http://localhost:5000

# 2. Frontend — point at it (already the default in .env)
cd ..
npm start
```

There are no more canned demo logins — since auth is real now, you sign in
with an account that actually exists in the `users` table (register one via
the app, or insert one directly in Oracle).

For the full list of what changed, which endpoints power which screen, which
Oracle tables are queried, and known gaps, see
**[`DASHBOARD_UPDATE.md`](./DASHBOARD_UPDATE.md)**.

## Project structure

```
app/                       expo-router routes
  _layout.tsx              providers + auth route guard
  index.tsx                splash
  onboarding / login / register
  (freelancer)/            freelancer tab group (home, search, chat, notifs, profile)
  (producer)/              producer tab group
  (admin)/                 admin stack (panel + manage users)
  job/[id], talent/[id], post-job, applications/[jobId], chat/[id], requests
backend/                   Node.js + Express + Oracle API (see backend/README or DASHBOARD_UPDATE.md)
src/
  api/                     React Query hooks + REST calls (with mock fallback)
  components/              shared UI (Button, Input, Card, cards, chat, …)
  constants/               design tokens (colors, typography, layout, categories)
  screens/                 screen bodies shared across route files
  services/                axios client (+ JWT refresh interceptor), socket, query client, mock data
  store/                   Zustand auth store
  types/                   domain models
  utils/                   avatar, formatting, routing helpers
```

## Verifying

```bash
npm run typecheck          # tsc --noEmit
npx expo-doctor            # dependency / config checks
```
