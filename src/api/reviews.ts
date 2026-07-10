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
