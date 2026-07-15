# Portfolio — Images, Videos, Featured Work

A dedicated portfolio for images and videos, with a "Featured Work" rail,
backed by a new `portfolio_items` table and loaded live from Oracle.

## Workflow implemented

1. **Add images.** Picked from the device photo library (`expo-image-picker`,
   the same dependency added for profile/cover photos — see
   `PROFILE_EDITING.md`), compressed, and stored as a `data:` base64 URI —
   same reasoning as the profile/cover photo: no object storage configured
   for this project, so the image lives directly in Oracle.
2. **Add videos.** Always a link (YouTube, Vimeo, or any other hosted URL) —
   raw video bytes are never stored in Oracle; that's not practical at any
   reasonable size. Tapping a video thumbnail opens the link externally
   (`Linking.openURL`).
3. **Featured work.** Any item can be starred on the manage screen
   (`app/portfolio.tsx`). Starred items show in a separate "Featured Work"
   rail above the full grid, both on the manage screen and on the read-only
   profile view.
4. **Load from Oracle.** `GET /api/portfolio/mine` returns everything for
   the signed-in user, featured items first, then newest first. The
   Freelancer profile screen renders this as a read-only `PortfolioGrid`
   section.
5. **Responsive grid.** 3 columns on phone, 5 on tablet
   (`useResponsive().isTablet`), percentage-based widths so it reflows
   rather than assuming a fixed screen size.

## Backend endpoints

| Method & path | Purpose |
|---|---|
| `GET /api/portfolio/mine` | List the signed-in user's portfolio (featured first) |
| `GET /api/portfolio/:userId` | Another user's portfolio (public view) |
| `POST /api/portfolio` | Add an image or video item (capped at 30 items/account) |
| `PATCH /api/portfolio/:itemId/featured` | Toggle Featured Work |
| `DELETE /api/portfolio/:itemId` | Remove an item |

## Database tables

| Table | Purpose |
|---|---|
| `portfolio_items` **(new)** | One row per media item: `media_type` ('image'/'video'), `media_url` (CLOB — data URI or link), `thumbnail_url`, `title`, `description`, `is_featured`, `sort_order`, `created_at`. Indexed on `(user_id, is_featured, created_at)` for the featured-first/newest-first ordering. |

Migration is additive/idempotent, same pattern as every other migration in
this project (catches ORA-00955 "name in use").

## Files modified

**Backend**
- `backend/scripts/migrate.js` — creates `portfolio_items` + index.
- `backend/models/portfolioModel.js` **(new)**.
- `backend/services/portfolioService.js` **(new)** — validation: media type,
  image size cap (~2MB base64, same cap as profile/cover photos), video
  must be an `http(s)://` URL, 30-item cap per account.
- `backend/controllers/portfolioController.js` **(new)**.
- `backend/routes/portfolioRoutes.js` **(new)**.
- `backend/app.js` — mounts `/api/portfolio`.

**Frontend**
- `src/api/portfolio.ts` **(new)** — `useMyPortfolio`, `usePortfolio(userId)`,
  `useAddPortfolioItem`, `useSetPortfolioFeatured`, `useDeletePortfolioItem`.
- `src/components/PortfolioGrid.tsx` **(new)** — the grid + Featured Work
  rail, shared between the read-only profile view and the manage screen
  (an `editable` prop toggles the star/remove controls).
- `src/screens/PortfolioScreen.tsx` **(new)** + `app/portfolio.tsx` **(new)**
  — add/feature/remove items.
- `src/components/FreelancerProfileView.tsx` — added a `portfolioItems`
  prop; renders the read-only Portfolio section when provided.
- `src/screens/FreelancerProfileScreen.tsx` — fetches `useMyPortfolio()` and
  passes it through; added a "Manage Portfolio" button.

## Known gaps / notes

- **No lightbox/full-screen viewer for images** — tapping an image
  thumbnail doesn't currently open it larger; only video links open
  (externally). A proper in-app image viewer is a reasonable follow-up.
- **No drag-to-reorder** — `sort_order` exists in the schema for future use,
  but items are currently ordered by featured-then-newest only; there's no
  UI to manually reorder.
