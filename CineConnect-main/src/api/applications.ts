import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';
import { Application, ApplicationStatus } from '@/types';
import { getAvatarColor } from '@/utils/avatar';
import { parseSkills } from './profile';

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Matches backend/models/applicationModel.js's mapApplication(). */
interface BackendApplication {
  applicationId: number;
  projectId: number;
  projectTitle: string;
  projectOwnerId: number;
  freelancerId: number;
  freelancerName: string;
  freelancerEmail: string;
  freelancerSkills: string | null;
  freelancerRating: number | null;
  pitchText: string | null;
  status: 'applied' | 'shortlisted' | 'declined' | 'hired';
  appliedAt: string;
  updatedAt: string;
}

/** Backend has one more status ('hired') than the frontend currently renders; folded into 'shortlisted' (=Accepted). */
function mapBackendStatus(status: BackendApplication['status']): ApplicationStatus {
  if (status === 'shortlisted' || status === 'hired') return 'shortlisted';
  if (status === 'declined') return 'declined';
  return 'pending';
}

function mapBackendApplication(a: BackendApplication): Application {
  const skills = parseSkills(a.freelancerSkills);
  return {
    id: String(a.applicationId),
    jobId: String(a.projectId),
    status: mapBackendStatus(a.status),
    coverLetter: a.pitchText ?? '',
    applicant: {
      id: String(a.freelancerId),
      name: a.freelancerName,
      title: skills[0] ?? 'Freelancer',
      rating: a.freelancerRating ?? 0,
      avatarColor: getAvatarColor(a.freelancerName),
    },
  };
}

/** GET /api/applications/projects/:jobId — producer's view of who applied. */
export function useApplications(jobId: string) {
  return useQuery({
    queryKey: ['applications', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ applications: BackendApplication[] }>>(
        `/api/applications/projects/${jobId}`,
      );
      return data.data.applications.map(mapBackendApplication);
    },
  });
}

export interface MyApplication extends Application {
  jobTitle: string;
}

/** GET /api/applications/mine — freelancer's own applications, for the "My Applications" screen. */
export function useMyApplications() {
  return useQuery({
    queryKey: ['my-applications'],
    queryFn: async (): Promise<MyApplication[]> => {
      const { data } = await api.get<BackendEnvelope<{ applications: BackendApplication[] }>>(
        '/api/applications/mine',
      );
      return data.data.applications.map((a) => ({ ...mapBackendApplication(a), jobTitle: a.projectTitle }));
    },
  });
}

/** Derived from useMyApplications — which job IDs has the signed-in freelancer already applied to. Drives the Apply -> Applied button state everywhere a job is shown. */
export function useAppliedJobIds() {
  const { data } = useMyApplications();
  return new Set((data ?? []).map((a) => a.jobId));
}

export interface ApplicationStats {
  applications: number;
  accepted: number;
}

/**
 * Freelancer dashboard tallies. There is no dedicated `/api/applications/my-stats`
 * route on the backend — the counts are derived from GET /api/analytics/me, which
 * already aggregates them from Oracle (see routes/analyticsRoutes.js). Always hits
 * the live backend; the Dashboard needs real numbers regardless of the mock flag.
 */
export function useMyApplicationStats() {
  return useQuery({
    queryKey: ['my-application-stats'],
    queryFn: async (): Promise<ApplicationStats> => {
      const { data } = await api.get<{ data: FreelancerAnalyticsSummary }>('/api/analytics/me');
      const summary = data.data.summary;
      return { applications: summary.totalApplications, accepted: summary.hired };
    },
  });
}

interface FreelancerAnalyticsSummary {
  summary: { totalApplications: number; hired: number };
}

interface ApplicationActionVars {
  id: string;
  /**
   * The backend rejects (409) any status change once a decision is already
   * final ('shortlisted'/'declined') unless `force` is explicitly set — this
   * is what backs requirement #4: a producer can't accidentally flip a
   * decision by double-tapping, only via the UI's explicit "Edit decision"
   * action, which passes force: true.
   */
  force?: boolean;
}

/**
 * PATCH /api/applications/:id/status — the backend exposes one generic
 * status-update route, not separate /shortlist and /decline endpoints.
 * UI-facing label is "Accept" / "Reject" (this task's wording); the
 * underlying status values ('shortlisted' / 'declined') are unchanged so
 * every existing consumer (ApplicantCard, this hook's callers) keeps working.
 */
export function useApplicationActions(jobId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['applications', jobId] });
    qc.invalidateQueries({ queryKey: ['my-jobs'] });
  };

  const mutate = (action: Extract<ApplicationStatus, 'shortlisted' | 'declined'>) =>
    useMutation({
      mutationFn: async ({ id, force }: ApplicationActionVars) => {
        const { data } = await api.patch(`/api/applications/${id}/status`, { status: action, force: !!force });
        return data;
      },
      onSuccess: invalidate,
    });

  return { shortlist: mutate('shortlisted'), decline: mutate('declined') };
}
