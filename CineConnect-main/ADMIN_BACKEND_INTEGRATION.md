# Admin Module — Backend Integration

## Backend endpoints used

All routes require `Authorization: Bearer <token>` and are gated by the new
`requireRole('admin')` middleware — a non-admin token gets a 403, not data.

| Method & path | Purpose | New or existing |
|---|---|---|
| `GET /api/admin/stats` | Dashboard stat cards | Existing route (added in the previous fix), **expanded** this pass with role breakdown + applications |
| `GET /api/admin/users?role=&search=` | Manage Users list | Existing (previous fix) |
| `PATCH /api/admin/users/:id/suspend` | Suspend a user | Existing (previous fix) |
| `PATCH /api/admin/users/:id/restore` | Restore a suspended user | Existing (previous fix) |
| `POST /api/auth/login` | Admin sign-in (same endpoint every role uses) | Existing — reused, not duplicated |

No new routes were created this pass — the route surface from the last fix
already covered everything the Admin screens need. What was missing was the
**data behind `/stats`** (role breakdown, applications count) and the
**admin account itself** existing in Oracle, both addressed below.

## Oracle tables queried

| Table | Query | Used for |
|---|---|---|
| `users` | `COUNT(*)` | Total Users |
| `users` | `SELECT role, COUNT(*) GROUP BY role` | Producers / Freelancers / Clients |
| `users` | `SELECT ... WHERE role=? AND full_name LIKE ?` | Manage Users list + filters |
| `users` | `UPDATE users SET status=?` | Suspend / Restore |
| `projects` | `COUNT(*) WHERE status='open'` | Active Jobs |
| `applications` | `COUNT(*)` | Applications |
| `messages` | `COUNT(*)` | Messages |
| *(none)* | — | Flagged — see "Reports" below |

### Reports / "Flagged"
There is no content-moderation or report table in the Oracle schema
(`reports`, `flags`, or similar don't exist). Per the "reuse existing APIs,
don't fabricate" principle followed throughout this project, `flagged` is
returned as a real `0`, not an invented number. If this becomes a real
feature, it needs a table such as:
```sql
reports(report_id, target_type, target_id, reporter_id, reason, status, created_at)
```
and a corresponding `COUNT(*) WHERE status='open'` in `adminRoutes.js`.

## Files modified

**Backend**
- `backend/models/userModel.js` — added `countsByRole()` (grouped query for the role breakdown).
- `backend/models/applicationModel.js` — added `countAll()`.
- `backend/routes/adminRoutes.js` — `/stats` now returns `producers`, `freelancers`, `clients`, `applications` alongside the existing `totalUsers`, `activeJobs`, `messages`, `flagged`.
- `backend/scripts/seedAdmin.js` **(new)** — idempotent script that creates (or repairs) the fixed `admin`/`admin` account directly in Oracle. Public registration intentionally refuses `role="admin"` (see `authService.js`), so this account can't come from the Register screen — it has to be seeded once. Run with `npm run seed:admin` from `backend/`.
- `backend/package.json` — added the `seed:admin` script.

**Frontend**
- `src/api/admin.ts` — removed the mock-data path entirely (`useAdminStats`, `useAdminUsers` now always call the live backend; no `USE_MOCK` branch left in this file).
- `src/api/users.ts` — same for `useUserModeration` (suspend/restore) — admin-only feature, no mock mode.
- `src/services/mock.ts` — deleted `mockAdminStats` and `mockAdminUsers` (now-unused mock data) and the now-unused `AdminStats` import.
- `src/types/index.ts` — `AdminStats` expanded with `producers`, `freelancers`, `clients`, `applications`.
- `app/(admin)/index.tsx` — renders all 8 real stats; stat grid is now responsive (`useResponsive()` — 4-across on tablet/web-wide, 2-across on phone, percentage-based so it reflows on resize rather than locking to one device width).
- `app/(admin)/users.tsx` — converted to the shared `useTheme()` pattern (was still on the static light-only palette); list is responsive (1 column on phone, 2 on tablet/web via `FlatList numColumns`); added a "Client" filter to match the roles that actually exist; added a Retry button on error instead of a dead-end error message.
- `src/components/Card.tsx` — widened `style` prop from `ViewStyle` to `StyleProp<ViewStyle>` so callers can pass style arrays (needed for the responsive column-width overrides above); this is a general-purpose fix, not admin-specific, but was required to build the responsive grid without hacks.
- `src/utils/validation.ts` — added `isValidLoginIdentifier()`, which accepts a real email **or** the literal `"admin"` username, without loosening the real-email requirement on Register.
- `app/login.tsx` — uses `isValidLoginIdentifier()` instead of `isValidEmail()`, so typing `admin` / `admin` isn't rejected by client-side validation before it ever reaches the backend.

## Authentication: keeping `admin` / `admin` working

Two separate things had to line up:

1. **Backend**: `authService.js`'s `login()` never validated email *format* —
   it just looks up `LOWER(email) = LOWER(:email)` — so a user row with
   `email = 'admin'` logs in exactly like a real email would. No backend
   change was needed here; it already worked once the row exists.
2. **The row has to exist.** Since public registration deliberately blocks
   `role="admin"`, there was no way to create this account through the app.
   `backend/scripts/seedAdmin.js` creates it once (idempotent — running it
   again just verifies/repairs the password hash rather than erroring).
3. **Frontend**: the Login screen's client-side check required a real
   email shape before it would even submit, which would have blocked
   `admin` from ever reaching the network request. Fixed via
   `isValidLoginIdentifier()`.

**To get the admin login working against a fresh backend:**
```bash
cd backend
npm run seed:admin
```
Then sign in with email `admin`, password `admin` as before.

## Remaining Admin tasks

- **Reports/flagging**: no schema support exists yet (see above) — needs a
  new table and write path (e.g. a "report user/job" action somewhere in
  the freelancer/producer UI) before "Flagged" can be a real, actionable
  number instead of `0`.
- **Quick Actions are still placeholders**: "Post Announcement" and "System
  Statistics" open an `Alert.alert(...)` rather than a real screen — they
  were already stubs before this pass and weren't part of "connect to
  backend," but worth flagging as unfinished.
- **No admin audit log**: suspend/restore actions aren't recorded anywhere
  (who suspended whom, when). Not part of the current schema.
- **Web/tablet layout was verified logically (percentage-based grid, no
  fixed pixel widths, `numColumns` switch)**, but hasn't been visually
  checked on an actual tablet or a browser window — worth a manual pass on
  real devices before shipping.
