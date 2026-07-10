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
| `EXPO_PUBLIC_USE_MOCK` | `true` (default) serves the bundled demo dataset for **jobs, chat, notifications, admin, and browse-talent**. Set to `false` once those screens' backend routes exist too. **Does not affect login/register or the Freelancer Dashboard — those always call the live backend regardless of this flag** (see below). |

### Backend integration

This app talks to the companion Node.js + Express + Oracle API in
[`backend/`](./backend). As of this update:

- **Auth (login/register) and the Freelancer Dashboard always hit the live
  backend** — there is no mock fallback for these anymore. You need the
  backend running (and a reachable Oracle DB) to sign in or view the
  Dashboard at all.
- **Everything else** (jobs, chat, notifications, admin, browse-talent)
  still runs on the bundled mock dataset via `EXPO_PUBLIC_USE_MOCK`, since
  those screens' backend routes aren't wired up yet.

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
