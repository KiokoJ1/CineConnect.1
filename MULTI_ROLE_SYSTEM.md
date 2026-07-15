# Multi-Role User System

Backend piece was built first (see git history / README's "Multi-role user
system" section) — this pass adds the frontend: a **Switch Role** control in
Profile/Settings, and making navigation, dashboards, and permissions update
the instant a switch happens, not after a manual refresh or re-login.

## What it looks like

A **Switch Role** section (pills, one per role the account holds, active
one highlighted) sits in Profile/Settings on all three profile screens —
Freelancer, Producer, and Admin — right next to the theme toggle. If the
account doesn't hold every available role yet, a compact **Add another
role** picker sits underneath it (reuses the existing `Select` component,
no new modal/picker UI was built).

Tapping a role that isn't currently active asks for confirmation, then:
1. Calls `PATCH /api/auth/active-role`.
2. Updates the stored `user` object (same auth session, no re-login).
3. Clears every cached query.
4. Navigates to that role's home (`/(producer)/home`, `/(freelancer)/home`,
   or `/(admin)`).

All four happen from one `onSuccess` chain — there's no intermediate state
where the old dashboard is still showing stale data or the nav bar hasn't
caught up.

## Why "instantly" was straightforward

Two decisions from the backend pass did most of the work here:

1. **No new token needed.** `authMiddleware.js` re-fetches the user from
   Oracle on every single request rather than trusting a role baked into
   the JWT, and `sanitizeUser()` already sources its `role` field from
   `active_role`. So the frontend just needs to update the *stored user
   object* (`useAuthStore`'s existing `setAuth()` — reused as-is, not a new
   store method) and keep using the same token. The very next API call
   already reflects the new role server-side.
2. **The rest is React Query's job.** `switchRole.mutate()`'s success
   handler calls `queryClient.clear()` — every cached query (dashboard
   stats, job lists, applications, admin stats, anything) is dropped, so
   whatever screen mounts next fetches fresh under the new role rather than
   showing a stale mix of the old role's cached data. This is a blunt
   instrument (clears things that aren't even role-scoped, like
   notifications) but correct and simple; role switching is rare enough
   that the extra refetches are a non-issue.

Navigation is the one piece that needed an explicit call:
`router.replace(homeRouteForRole(role))` right after the mutation succeeds.
Nothing else in the app auto-redirects on a role change *except* the
existing Admin route guard (`app/(admin)/_layout.tsx`, built two passes
ago) — if someone switches away from 'admin' while sitting in the admin
section, that guard's existing `useEffect` (it already watches `role`
reactively) boots them out on its own, on top of the explicit navigate.
Redundant in the one case where both fire, but not a bug — same
destination either way.

## Files added/modified

**Frontend**
- `src/api/roles.ts` **(new)** — `useMyRoles()`, `useAddRole()`,
  `useSwitchActiveRole()`. The switch hook is where the
  auth-update/cache-clear logic above lives.
- `src/components/RoleSwitcher.tsx` **(new)** — the pills + add-role
  picker. Self-contained; the profile screens wrap it in the same `Card`
  pattern already used for `ThemeToggle`, right next to it.
- `src/screens/FreelancerProfileScreen.tsx`, `src/screens/ProducerProfileScreen.tsx`,
  `app/(admin)/index.tsx` — added a `RoleSwitcher` card alongside the
  existing `ThemeToggle` card.
- `src/types/index.ts` — `Role` widened to include `'client'` (the backend
  already accepted/returned it; the frontend type just hadn't caught up —
  `InboxScreen.tsx`'s role filter was already using the string informally).
- `src/utils/routing.ts` — `homeRouteForRole` given an explicit `'client'`
  case (falls back to the freelancer home, same as before, just documented
  instead of silently hitting the `default` branch).

**Backend**: none this pass — the three endpoints
(`GET`/`POST /api/auth/roles`, `PATCH /api/auth/active-role`) already
existed and needed no changes to support this UI.

## Known gaps (documented, not fabricated)

- **No dedicated 'client' experience.** The app has no `(client)` route
  group — if an account's active role is `client`, it lands on the
  freelancer home like any other unrecognized role. Adding roles to an
  account and switching to `client` works end-to-end at the data layer;
  there's just no purpose-built UI for that role yet. This was true before
  this pass too (noted in `MESSAGING_DISCOVERY.md`'s Discover-tab role
  filter) — surfacing it again here since the role switcher makes it
  directly reachable now instead of theoretical.
- **`queryClient.clear()` is coarse.** It drops caches that aren't actually
  role-scoped (notifications, conversations) along with the ones that are.
  Correct, just not maximally efficient — acceptable given how infrequently
  someone switches roles.
- **No audit trail** of role switches (who switched, when) — not part of
  the schema; would need a table if that's ever wanted (same shape of gap
  as the admin panel's missing moderation-report table).
