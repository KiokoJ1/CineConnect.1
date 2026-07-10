import { useQuery } from '@tanstack/react-query';

import { api } from '@/services/api';

/** Matches the shape returned by GET /api/analytics/me for role='freelancer'. */
export interface FreelancerAnalytics {
  role: 'freelancer';
  summary: {
    totalApplications: number;
    hired: number;
    shortlisted: number;
    declined: number;
    pending: number;
    avgRating: number | null;
    totalRatings: number;
  };
  applicationsByMonth: { month: string; total: number }[];
  statusBreakdown: Record<string, number>;
  recentActivity: { projectTitle: string; status: string; appliedAt: string }[];
}

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * GET /api/analytics/me — freelancer dashboard analytics (applications trend,
 * status breakdown, rating average). Backend aggregates this directly from
 * Oracle (applications, ratings tables), so this always hits the live API
 * regardless of the app-wide mock flag — the Dashboard's whole point is to
 * show real numbers.
 *
 * Note: the backend does not track profile-view events (no such table exists
 * in the schema), so there's no "profile views" metric here — the Dashboard
 * chart uses `applicationsByMonth` instead. See DASHBOARD_UPDATE.md.
 */
export function useMyAnalytics() {
  return useQuery({
    queryKey: ['my-analytics'],
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<FreelancerAnalytics>>('/api/analytics/me');
      return data.data;
    },
  });
}
