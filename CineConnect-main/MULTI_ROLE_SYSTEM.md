# Multi-Role User System

Implements switchable roles (Producer / Freelancer / Client) on top of the
new `USERS.ACTIVE_ROLE` column and `USER_ROLES` table, without touching how
login itself works.

## Design

`users.role` is left untouched — it stays the role chosen at registration.
`users.active_role` is the role currently "switched on"; `user_roles` is the
many-to-many list of every role that account is allowed to switch into
(seeded from `role` for every existing/new user).

The key decision: **`sanitizeUser()` now returns `role: activeRole`** (plus
a new `roles: string[]` array). Every existing permission check in the
codebase — `requireRole()`, `user.role !== 'admin'`, `OWNER_ROLES.includes(user.role)`,
the frontend's `user.role` reads — already reads that one field, and
`authMiddleware` re-derives it fresh from Oracle on *every* request. So
switching roles takes effect instantly, everywhere, with no other file
needing to know the multi-role system exists at all.

`client` behaves as a producer-equivalent (the backend's `OWNER_ROLES` for
project management already included it) and has no separate route group —
it reuses `(producer)`'s screens.

## Workflow implemented

1. **Load roles.** `GET /api/auth/me` (and login/register) now return
   `roles: string[]` alongside `role` (the active one), sourced from
   `USER_ROLES`.
2. **Switch Role UI.** `RoleSwitcher` (new) is a toggle button shown at the
   **very top** of every role's own profile/settings screen — first thing
   inside the scroll body on Producer (above the avatar) and Admin (right
   under the "Admin Panel" heading), and on Freelancer it renders in a new
   `header` slot on `FreelancerProfileView` immediately below the fixed
   purple header band — so it's visible the instant the screen opens, no
   scrolling required on any of the three. Tapping it opens a dropdown
   listing every granted role (checkmark on the active one) plus, below a
   divider, a **"+ Add … role"** entry for any role the account doesn't
   have yet.
3. **Switching.** Tapping another *already-granted* role calls
   `PATCH /api/auth/active-role { role }`. The backend re-verifies that
   role is actually granted to the caller (fresh DB check, not trusting the
   token), updates `users.active_role`, and returns the updated user.
3b. **Adding a role (self-service).** Tapping "+ Add … role" calls
   `POST /api/auth/roles { role }`, which grants that role (`user_roles`
   insert, idempotent) and switches to it in one step — restricted to
   `producer` / `freelancer` / `client`; `admin` is still only ever granted
   directly in Oracle.
4. **No re-login.** The JWT only ever encodes `userId` — nothing role-related
   is embedded that would go stale, so there's nothing to refresh.
5. **Persisted in Oracle.** `UPDATE users SET active_role = :role`, so the
   choice survives logout/login and other devices.
6. **Instant update everywhere.** On a successful switch, the frontend:
   - updates the Zustand auth store's `user`/`role` in place (and
     `AsyncStorage`, so it survives an app restart too),
   - `router.replace()`s straight to the new role's home
     (`homeRouteForRole()`),
   - every screen reading `useAuthStore((s) => s.user/role)` re-renders
     immediately — Dashboard, Profile, and all permission-gated actions
     (Post a Job, Accept/Reject applications, etc.) reflect the new role on
     the very next render, no polling or refetch needed.
7. **Hiding features not in the active role.** The `(producer)` and
   `(freelancer)` tab-group layouts now guard themselves the same way
   `(admin)` already did (see `ADMIN_FIX_REPORT.md`): if the active role no
   longer matches the group — including if it changes while that group is
   already on screen — they redirect out immediately. Producer-only /
   freelancer-only actions were already gated by which tab group they live
   in, so this closes the loop rather than requiring per-button role checks
   throughout the app.
8. **Responsive.** `RoleSwitcher` is a plain `Card` using the same
   design-token spacing/typography as the rest of Profile — no fixed
   dimensions, so it reflows the same as everything else on phone/tablet.

## Backend endpoints

| Method & path | Purpose | Status |
|---|---|---|
| `GET /api/auth/me` | Current user, now includes `roles` | Changed (via `sanitizeUser`) |
| `POST /api/auth/login` / `/register` | Unchanged flow, response now includes `roles` | Changed (via `sanitizeUser`) |
| `PATCH /api/auth/active-role` | Switch active role | **New** |
| `POST /api/auth/roles` | Self-service: grant caller a new role, then switch to it | **New** |

## Database tables

| Table | Change |
|---|---|
| `users` | New `active_role VARCHAR2(20)` column, backfilled from `role`. `role` itself is untouched. |
| `user_roles` | **New** table: `user_role_id` PK, `user_id` FK, `role`, unique on `(user_id, role)`. Backfilled with one row per existing user from their current `role`. |

Migration (`backend/scripts/migrate.js`) is additive and idempotent — safe
to run against a database that already has these objects (catches
ORA-01430 "column exists" / ORA-00955 "name in use" the same way the
existing `notifications` migration does), and the backfill queries use
`WHERE active_role IS NULL` / `WHERE NOT EXISTS (...)` so re-running never
duplicates anything.

## Files modified

**Backend**
- `backend/scripts/migrate.js` — adds `users.active_role`, creates
  `user_roles`, backfills both.
- `backend/models/userModel.js` — `mapUser()`/`findByEmail`/`findById` read
  `active_role`; added `getRoles()`, `addRole()`, `setActiveRole()`;
  `createUser()` now also seeds `active_role` and a `user_roles` row.
- `backend/services/authService.js` — `sanitizeUser()` is now async and
  returns `role: activeRole` + `roles: string[]`; added `switchActiveRole()`
  (re-validates the role is actually granted before switching).
- `backend/middleware/authMiddleware.js` — awaits the now-async
  `sanitizeUser()`.
- `backend/controllers/authController.js` / `routes/authRoutes.js` — added
  `switchActiveRole` controller + `PATCH /active-role` route.

**Frontend**
- `src/types/index.ts` — `Role` gained `'client'`; `User` gained
  `roles: Role[]`.
- `src/api/auth.ts` — `mapBackendUser` carries `roles`; added
  `switchActiveRole()`.
- `src/store/authStore.ts` — added `setActiveRole()` (updates + persists the
  active role without a re-login).
- `src/utils/routing.ts` — `homeRouteForRole()` routes `'client'` to the
  producer group; added `roleLabel()`.
- `src/components/RoleSwitcher.tsx` **(new)** — the Switch Role UI.
- `src/components/FreelancerProfileView.tsx` — added a `header` slot
  rendered right below the fixed purple header band, above the rating row.
- `src/screens/ProducerProfileScreen.tsx` / `FreelancerProfileScreen.tsx` /
  `app/(admin)/index.tsx` — render `<RoleSwitcher />` at the very top of
  the screen (Freelancer via the new `header` slot).
- `app/(producer)/_layout.tsx` / `app/(freelancer)/_layout.tsx` — added the
  role guard described in step 7 above.
- `src/api/admin.ts` — `mapBackendAdminUser` defaults `roles: [role]` (the
  admin user-listing endpoint doesn't join `user_roles`; not needed there).
- `src/services/mock.ts` — mock `User` fixtures gained `roles` to satisfy
  the extended type (mock data itself unaffected).

## If you don't see the Switch Role button

- **Location**: it's now the **first thing on the screen** on all three —
  Producer (above the avatar), Freelancer (right below the purple header
  band, above the star rating), Admin (right below "Admin Panel"). No
  scrolling needed on any of them as of this pass.
- It's a small button reading your current role (e.g. "Producer ▾") under
  a **"Switch Role" heading** — not a button labelled "Switch Role" itself.
- If you still don't see it after pulling this update, it's almost
  certainly a stale Metro/Expo bundle — restart with the cache cleared:
  `npx expo start -c`. Also double-check the actual files on disk match
  this delivery (`src/components/RoleSwitcher.tsx` should exist, and
  `ProducerProfileScreen.tsx`/`FreelancerProfileScreen.tsx`/
  `app/(admin)/index.tsx` should import and render it) — if you're syncing
  changes into a separate repo/build pipeline rather than unzipping this
  delivery directly, it's easy for one file to not make it across.
- Confirm `backend/scripts/migrate.js` has been run against your Oracle
  instance. Without the `user_roles` table existing, `sanitizeUser()`
  would throw on every authenticated request — you'd see broad auth/API
  errors, not just a missing button, but it's worth ruling out.

## Known gaps / notes

- **Granting a new role** now has a self-service path — `POST /api/auth/roles`
  + the dropdown's "+ Add … role" entries — limited to `producer`/
  `freelancer`/`client`. There's no way to *remove* a granted role yet,
  and `userModel.addRole()` is reused as-is for both this and the
  registration/migration backfill paths.
- **Admin** is a valid role in `VALID_ROLES` server-side (so an account that
  somehow holds it can switch into it), but there's no self-serve path to
  ever be granted `admin` via this feature — consistent with registration
  already excluding it.
