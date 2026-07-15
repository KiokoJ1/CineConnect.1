# Editable Profile

Adds a real Edit Profile screen — photo, cover photo, bio, location,
experience level, skills, and "experience" (film credits) — on top of the
existing `profiles`/`film_credits` tables and their already-built backend
(only the photo columns and the frontend write path were actually missing;
`GET /api/profiles/me`, the upsert endpoint, and full film-credit CRUD
already existed and are reused as-is).

## What was actually missing

- **Backend**: no `avatar_url`/`cover_url` columns — nowhere to save a photo.
  Also, Express's default 100kb JSON body limit would have rejected any
  real image payload outright.
- **Frontend**: `useMyProfile()` existed but was read-only — there was no
  upsert hook, no film-credit add/delete hooks, and no Edit Profile screen
  at all. The profile *view* screens also never merged the fetched
  profile/credits into what they displayed — `user.skills`/`user.credits`
  were always empty placeholders regardless of what was saved.

## Workflow implemented

1. **Profile photo & cover photo.** Tapping either on Edit Profile opens the
   device photo library (`expo-image-picker`), lets the person crop
   (1:1 for the avatar, 16:9 for the cover), and compresses it
   (`quality: 0.5`) before turning it into a `data:image/...;base64,...`
   URI. There's no object storage/CDN configured for this project, so — like
   every other profile field — it's saved directly as a value in Oracle
   rather than uploaded elsewhere and referenced by URL.
2. **Bio, location, experience level, skills.** Plain form fields; skills is
   a chip input (add/remove) that joins back to the backend's
   comma-separated `skills` column on save.
3. **Experience (film credits).** A list of past project credits
   (title/role/year) with add and remove, using the film-credits CRUD that
   already existed (`POST /api/credits`, `DELETE /api/credits/:id`) — each
   change there is saved immediately, independent of the main "Save
   Changes" button.
4. **Save changes to Oracle.** "Save Changes" calls
   `POST /api/profiles/me` with the *entire* profile row — this endpoint
   upserts (not patches), so the save merges the edited fields over
   whatever the fetched profile already had (rate, portfolio URL,
   availability, payment modes) rather than sending only what changed —
   otherwise editing your bio would silently null out your day rate.
5. **Shows up where it should.** Both profile *view* screens
   (`FreelancerProfileScreen`, `ProducerProfileScreen`) now read
   `useMyProfile()`/`useMyCredits()` and render the real photo, cover, bio,
   location, experience level, skills, and credits — previously these
   screens only showed the auth user's placeholder fields, which were
   always empty.
6. **Responsive.** Cover photo scales to the screen width at a fixed
   16:9-ish band height; the avatar overlaps it Instagram-style; the form
   uses the same `Input`/`Select`/`Card` components (and their existing
   responsive behavior) as the rest of the app — no fixed-width elements.

## Backend endpoints

| Method & path | Purpose | Status |
|---|---|---|
| `GET /api/profiles/me` | Fetch the signed-in user's profile | Unchanged, now includes `avatarUrl`/`coverUrl` |
| `POST /api/profiles/me` (or `PUT`) | Create/update the signed-in user's profile | Unchanged route, `avatarUrl`/`coverUrl` added to what it accepts/validates |
| `POST /api/credits` | Add a film credit ("experience" entry) | Unchanged, already existed |
| `GET /api/credits/mine` | List the signed-in user's film credits | Unchanged, already existed |
| `DELETE /api/credits/:creditId` | Remove a film credit | Unchanged, already existed |

## Database tables

| Table | Change |
|---|---|
| `profiles` | New `avatar_url CLOB` and `cover_url CLOB` columns (migration is additive/idempotent, same pattern as the multi-role migration — catches ORA-01430 "column exists"). CLOB rather than VARCHAR2 because these hold base64 `data:` URIs, which can be tens of thousands of characters. |
| `film_credits` | Unchanged — already supported everything "experience" needed. |

## Files modified

**Backend**
- `backend/scripts/migrate.js` — adds `profiles.avatar_url`/`cover_url`.
- `backend/config/db.js` — `oracledb.fetchAsString = [oracledb.CLOB]` so the
  new CLOB columns come back as plain JS strings, not Lob stream objects
  (would otherwise break every existing `row.SOME_COLUMN` access pattern).
- `backend/models/profileModel.js` — `avatar_url`/`cover_url` added to the
  shared `SELECT_COLS`, `mapProfile()`, `createProfile()`, `updateProfile()`
  (bound explicitly as `oracledb.CLOB` given their size).
- `backend/services/profileService.js` — `normalize()`/`validate()` handle
  `avatarUrl`/`coverUrl`: must be a `data:image/...;base64,` URI or an
  `http(s)://` URL, capped at ~2MB of encoded data.
- `backend/app.js` — raised the JSON body limit from Express's 100kb default
  to 6mb (comfortably above the 2MB-per-image cap) — otherwise saving a real
  photo would 413.

**Frontend**
- `src/api/profile.ts` — `FreelancerProfile` gained `avatarUrl`/`coverUrl`;
  added `useUpsertProfile()`, `useAddCredit()`, `useDeleteCredit()`, and
  `joinSkills()` (the inverse of the existing `parseSkills()`).
- `src/components/Avatar.tsx` — added an optional `imageUri` prop; renders
  the real photo when set, falls back to the initials circle otherwise.
- `src/components/FreelancerProfileView.tsx` — added `avatarUri`/`coverUri`/
  `bio`/`location`/`experienceLevel` props and renders them (cover photo as
  the header band's background, a Bio section, an experience pill, and
  empty-state text for Skills/Credits instead of silently rendering
  nothing).
- `src/screens/EditProfileScreen.tsx` **(new)** + `app/edit-profile.tsx`
  **(new)** — the form described above.
- `src/screens/FreelancerProfileScreen.tsx` — merges `useMyProfile()`/
  `useMyCredits()` into what's displayed; added an "Edit Profile" button.
- `src/screens/ProducerProfileScreen.tsx` — same merge for photo/cover/bio/
  location; added an "Edit Profile" button.
- `src/constants/categories.ts` — added `EXPERIENCE_LEVELS`.
- `package.json` — added `expo-image-picker`.

## Setup note (dependency)

This feature adds `expo-image-picker` as a new dependency. Since it wasn't
already installed, run one of these after pulling this change:

```
npx expo install expo-image-picker
```

(`expo install` rather than plain `npm install` so it resolves the version
that actually matches your installed Expo SDK.)

## Known gaps / notes

- **No object storage** — photos are stored as base64 in Oracle rather than
  uploaded to something like S3/Cloudinary and referenced by URL. This is
  the simplest option with zero new infrastructure, but it does mean profile
  rows get noticeably heavier, and there's no automatic resizing beyond the
  picker's `quality: 0.5` JPEG compression — a very high-resolution photo
  can still hit the ~2MB cap and get a clear "Profile photo is too large"
  error rather than silently failing.
- **Producer skills/credits**: the Edit Profile screen is shared across
  roles, so a producer can add skills/film-credits too even though their
  profile view doesn't currently surface a Credits section the way the
  Freelancer one does — harmless, just unused for that role today.
- **Other people's profiles** (`app/talent/[id].tsx`) still don't show
  photos/bio/experience — that screen reads a different, publicly-facing
  user object and merging in `GET /api/profiles/:userId` there is a
  reasonable next step but wasn't part of this pass (this pass covers
  *editing your own* profile).
