# User Profile — Statistics

Completes the profile screen with real **ratings, reviews, completed jobs,
and applications** — sourced from Oracle, shown on both a freelancer's own
profile and when a producer views one via `talent/[id].tsx`.

## What was already there vs. what was missing

The rating average/count had a working query (`ratingModel.getAverageScore`)
and individual reviews had a working query (`ratingModel.findByReviewee`) —
both already reachable via `GET /api/ratings/user/:userId`. But **nothing
on the frontend ever called that endpoint from a profile screen.** The
`StarRating` shown on `FreelancerProfileView` was always rendering `0`,
because `user.rating` was never populated by anything upstream — a real,
silent gap: the UI slot existed, the backend query existed, they were
never connected. Same story for "reviews" — the list of individual reviews
(reviewer name, score, comment, which project) had no UI anywhere at all.

"Completed jobs" and "applications" had no per-user endpoint at all —
`GET /api/analytics/me` computes these, but only for the signed-in user,
which doesn't help a producer viewing someone else's profile.

## New backend surface

| Method & path | Purpose | New or existing |
|---|---|---|
| `GET /api/ratings/user/:userId` | Individual reviews + avg/count | Existing — just never called from a profile screen |
| `GET /api/profiles/:userId/stats` | `{ avgRating, totalReviews, completedJobs, totalApplications }` for **any** user | **New** |

`GET /api/profiles/:userId/stats` doesn't introduce a new data source — it
composes three existing model functions
(`ratingModel.getAverageScore`, and two calls to a new
`applicationModel.countByFreelancer(freelancerId, status?)`) into one
response, the same aggregation `/api/analytics/me` already does, just made
available for any `userId` instead of only `req.user.id`.

### "Completed jobs" — what it actually means

There's no `completed` status anywhere in the schema — applications go
`applied → shortlisted/declined → hired`. "Completed Jobs" is the count of
applications with status `hired`. This is the same number the freelancer's
own dashboard already calls "Accepted" (`APPLICATION_WORKFLOW.md`) — same
underlying data, different, more outcome-oriented label appropriate for a
public-facing profile stat. Not a new concept, not a fabricated one.

## Files added/modified

**Backend**
- `backend/models/applicationModel.js` — added `countByFreelancer(freelancerId, status?)`.
- `backend/services/profileService.js`, `backend/controllers/profileController.js`, `backend/routes/profileRoutes.js` — new `getProfileStats` composing the counts above.

**Frontend**
- `src/api/reviews.ts` — added `useReviews(userId)`, the first frontend caller of `GET /api/ratings/user/:userId`.
- `src/api/profile.ts` — added `useProfileStats(userId)`.
- `src/types/index.ts` — `User` gained `completedJobs`/`totalApplications` (`rating`/`reviewCount` already existed on the type — they just had nothing populating them, see above).
- `src/components/FreelancerProfileView.tsx` — new Completed Jobs/Applications stat cards, new Reviews section (reviewer, star count, comment, project, relative date); accepts a `reviews` prop.
- `src/screens/FreelancerProfileScreen.tsx`, `app/talent/[id].tsx` — both now fetch and merge in real `rating`, `reviewCount`, `completedJobs`, `totalApplications`, and the reviews list, for own-profile and viewed-profile respectively.

## Known gaps (documented, not fabricated)

- **Producer's profile stats weren't built.** Same scope boundary as
  `MULTI_ROLE_SYSTEM.md`/the editable-profile pass — `ProducerProfileScreen`
  has a different, simpler layout with no equivalent section yet. The
  backend endpoint isn't role-restricted (it'll return `0`s for a producer,
  not an error), so wiring it into a future producer profile UI is a
  frontend-only addition, not a backend one.
- **Reviews aren't paginated.** `findByReviewee` returns every review with
  no limit — fine at this app's current scale, would need a
  `FETCH FIRST n ROWS` + cursor if someone accumulates a very large review
  history.
