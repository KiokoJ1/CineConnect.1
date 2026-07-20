import { useQuery } from '@tanstack/react-query';

import { api } from '@/services/api';

export interface ReviewSummary {
  rating: number;
  reviewCount: number;
}

/**
 * There is no dedicated `/api/reviews/my-summary` route — the rating average
 * is computed from GET /api/analytics/me, which already joins the Oracle
 * `ratings` table (AVG(score), COUNT(*)) for the signed-in user. Always hits
 * the live backend.
 */
export function useMyReviewSummary() {
  return useQuery({
    queryKey: ['my-review-summary'],
    queryFn: async (): Promise<ReviewSummary> => {
      const { data } = await api.get<{ data: { summary: { avgRating: number | null; totalRatings: number } } }>(
        '/api/analytics/me',
      );
      const { avgRating, totalRatings } = data.data.summary;
      return { rating: avgRating ?? 0, reviewCount: totalRatings };
    },
  });
}

/** Matches backend/models/ratingModel.js's mapRating(). */
interface BackendRating {
  ratingId: number;
  projectId: number;
  projectTitle: string;
  reviewerId: number;
  reviewerName: string;
  revieweeId: number;
  score: number;
  reviewText: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  reviewerName: string;
  score: number;
  reviewText: string | null;
  projectTitle: string;
  createdAt: string;
}

function mapReview(r: BackendRating): Review {
  return {
    id: String(r.ratingId),
    reviewerName: r.reviewerName,
    score: r.score,
    reviewText: r.reviewText,
    projectTitle: r.projectTitle,
    createdAt: r.createdAt,
  };
}

/**
 * GET /api/ratings/user/:userId — every individual review a user has
 * received (reviewer name, score, comment, which project) plus the
 * avg/total the same endpoint already computes. Works for any userId, not
 * just the signed-in user — this is what powers the "Reviews" list on a
 * profile screen, own or viewed.
 */
export function useReviews(userId: string) {
  return useQuery({
    queryKey: ['reviews', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await api.get<{
        data: { ratings: BackendRating[]; stats: { avgScore: number | null; total: number } };
      }>(`/api/ratings/user/${userId}`);
      return {
        reviews: data.data.ratings.map(mapReview),
        avgRating: data.data.stats.avgScore ?? 0,
        totalReviews: data.data.stats.total,
      };
    },
  });
}
