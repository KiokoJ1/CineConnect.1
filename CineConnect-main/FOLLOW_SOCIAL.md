# Social Profile Actions — Follow, Unfollow, Message, Hire

Adds Follow/Unfollow with live follower counts, plus Message and Hire
buttons, to the talent profile screen (`app/talent/[id].tsx`).

## What was actually missing (and fixed as a foundation)

Building this exposed that **viewing another person's profile didn't
actually work against the live backend at all** — `useUser()`/`useTalent()`
called `GET /api/users/:id` and `GET /api/users`, which don't exist
anywhere on the backend (there's no `usersRoutes.js`). The real endpoints
were already built and unused: `GET /api/profiles/:userId` and
`GET /api/profiles/freelancers`. Both hooks now call those instead, mapped
into the frontend `User` shape (including the photo/bio/skills/location
fields from the recent profile-editing work), plus `GET /api/ratings/user/:userId`
merged in for the star rating. Without this fix, Follow/Message/Hire would
have had no real profile to attach to outside of mock mode.

## Workflow implemented

1. **Follow / Unfollow.** A single toggle button on the talent profile:
   "Follow" (filled) when not following, "Following" (green outline) when
   you are. Tapping it calls `POST` or `DELETE /api/follows/:userId`.
2. **Real-time follower counts.**
   - **For the person tapping the button**: the count and button state
     update *instantly* — before the network request even resolves
     (optimistic React Query cache update), and roll back automatically if
     the request fails.
   - **For the person being followed**: if they have their own
     profile/dashboard open, their follower count updates live too — the
     backend pushes a `follow:changed` Socket.IO event to them the moment
     someone follows/unfollows, the same pattern as messaging's
     `message:new`/`message:seen` (see `MESSAGING_UI.md`).
   - Both your own profile screens (Producer/Freelancer) and the talent
     profile screen now show follower/following counts, all backed by the
     same `GET /api/follows/:userId` status endpoint.
3. **Message.** Unchanged from the messaging feature — opens the real chat
   thread with this person.
4. **Hire.** Shown only when the viewer is currently a Producer or Client
   looking at a Freelancer's profile (checked against the active role from
   the multi-role system — see `MULTI_ROLE_SYSTEM.md`). Opens the same chat
   thread with a pre-filled starter message ("Hi X, I'd like to hire you for
   a project...") that the person can edit before sending — there's no
   separate formal offer/contract flow yet (see Known gaps).

## Backend endpoints

| Method & path | Purpose | Status |
|---|---|---|
| `GET /api/follows/:userId` | Am I following them + their follower/following counts | **New** |
| `POST /api/follows/:userId` | Follow | **New** — pushes `follow:changed` to the followed user |
| `DELETE /api/follows/:userId` | Unfollow | **New** — pushes `follow:changed` to the followed user |
| `GET /api/profiles/:userId` | Public profile lookup | Already existed, now actually wired to the frontend (`useUser`) |
| `GET /api/profiles/freelancers` | Browse talent | Already existed, now actually wired to the frontend (`useTalent`) |
| `GET /api/ratings/user/:userId` | Rating average + count | Already existed, now merged into `useUser` |

## Database tables

| Table | Change |
|---|---|
| `follows` | **New**: `(follower_id, followed_id)` composite primary key, both referencing `users`, a check constraint preventing self-follows, and an index on `followed_id` for fast follower-count/list lookups. |

## Files modified

**Backend**
- `backend/scripts/migrate.js` — creates `follows` (additive/idempotent, same pattern as every other migration in this project).
- `backend/models/followModel.js` **(new)** — `follow`, `unfollow`, `isFollowing`, `getCounts`.
- `backend/routes/followRoutes.js` **(new)** — the three endpoints above, with the `follow:changed` socket push.
- `backend/app.js` — mounts `/api/follows`.

**Frontend**
- `src/api/follows.ts` **(new)** — `useFollowStatus`, `useFollowActions` (optimistic follow/unfollow), `useFollowSocket` (live count sync, mounted once at the app root next to `useNotificationSocket`/`useMessagingSocket`).
- `src/api/users.ts` — `useUser`/`useTalent` rewired to the real `/api/profiles/*` endpoints described above (was previously mock-only / hitting a nonexistent endpoint). Also removed `useSendMessageRequest`, which had no remaining callers after the messaging feature replaced it with opening a real chat directly.
- `app/talent/[id].tsx` — Follow/Unfollow, Message, and (conditionally) Hire buttons, plus a follower/following count line, and now also passes `usePortfolio(id)` through so the viewed user's portfolio shows on their profile (closing a known gap noted in `PORTFOLIO.md`).
- `app/chat/[id].tsx` — accepts an optional `draft` route param to pre-fill the composer (used by Hire).
- `src/screens/FreelancerProfileScreen.tsx` / `ProducerProfileScreen.tsx` — show your own follower/following counts.
- `app/_layout.tsx` — mounts `useFollowSocket()`.

## Known gaps / notes

- **Real-time is per-account, not per-viewer.** If two different people are
  both looking at the *same* freelancer's profile at the same time, only
  the freelancer's own screen (if open) gets a live push when someone
  follows them — a bystander's already-open copy of that same profile page
  won't tick up live without a refetch. True "anyone watching this exact
  profile sees it live" would need a per-profile Socket.IO room (viewers
  join/leave it as they open/close that screen); this pass keeps the
  simpler per-account push, which covers what "real time" most commonly
  means here (your own counts, and the person you just followed/unfollowed,
  update immediately).
- **Hire is a conversation starter, not a formal offer.** There's no
  contract/rate-agreement/accept-decline flow behind it — it just opens
  chat with a suggested first message. A real hiring flow (with terms, a
  formal accept, maybe tying into `applications`) would be a separate,
  larger feature.
- **Browsing talent still misses freelancers with no saved profile.**
  `GET /api/profiles/freelancers` inner-joins `profiles`, so a freelancer
  who registered but never saved anything in Edit Profile won't appear in
  Browse Talent, and `useUser()` will show "This profile is unavailable"
  for them. This is a pre-existing backend design (profiles are created
  lazily on first save), not something introduced here, but it's the
  reason a brand-new test account might not show up in these flows until
  it saves a profile once.
- **No follower/following list screens** — just the counts. Tapping the
  numbers doesn't currently open a list of who's following whom.
