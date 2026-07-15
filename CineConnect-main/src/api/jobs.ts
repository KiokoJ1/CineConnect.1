import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';
import { Job } from '@/types';
import { getAvatarColor } from '@/utils/avatar';

const PAGE_SIZE = 4;

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Matches backend/models/projectModel.js's mapProject(), plus the counts projectService.js attaches. */
interface BackendProject {
  projectId: number;
  ownerId: number;
  ownerName: string;
  title: string;
  description: string;
  roleNeeded: string;
  location: string;
  budget: number | null;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'cancelled';
  createdAt: string;
  applicationCount?: number;
  shortlistedCount?: number;
  ownerJobsPosted?: number;
  ownerRating?: number;
}

/**
 * Maps a backend project row onto the frontend `Job` shape.
 *
 * Known gap: the Oracle schema has no production-type/category taxonomy —
 * `roleNeeded` is a free-text field (e.g. "Cinematographer"), not one of the
 * fixed JOB_CATEGORIES pills. It's reused for both `category` and
 * `department` since that's the closest real data available; category-pill
 * filtering is therefore a substring match rather than an exact taxonomy
 * match. See APPLICATION_WORKFLOW.md.
 */
function mapBackendJob(p: BackendProject): Job {
  return {
    id: String(p.projectId),
    title: p.title,
    category: p.roleNeeded,
    department: p.roleNeeded,
    productionType: '',
    location: p.location,
    startDate: p.startDate,
    endDate: p.endDate,
    dayRate: p.budget ?? 0,
    description: p.description,
    status: p.status === 'open' ? 'open' : 'closed',
    applicationCount: p.applicationCount ?? 0,
    shortlistedCount: p.shortlistedCount ?? 0,
    producer: {
      id: String(p.ownerId),
      name: p.ownerName,
      jobsPosted: p.ownerJobsPosted ?? 0,
      rating: p.ownerRating ?? 0,
      avatarColor: getAvatarColor(p.ownerName),
    },
    postedAt: p.createdAt,
  };
}

export interface JobPage {
  jobs: Job[];
  nextPage: number | null;
}

/**
 * GET /api/projects returns every open project in one shot (no server-side
 * pagination or category filter on the backend). Category filtering and
 * pagination are therefore done client-side here, preserving the existing
 * useInfiniteQuery/PAGE_SIZE UI contract that FreelancerHomeScreen already
 * relies on rather than rewriting that screen.
 */
async function fetchJobs(category: string, page: number): Promise<JobPage> {
  const { data } = await api.get<BackendEnvelope<{ projects: BackendProject[] }>>('/api/projects');
  const allJobs = data.data.projects.map(mapBackendJob);
  const filtered =
    category === 'All' ? allJobs : allJobs.filter((j) => j.category.toLowerCase().includes(category.toLowerCase()));
  const start = (page - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  const nextPage = start + PAGE_SIZE < filtered.length ? page + 1 : null;
  return { jobs: slice, nextPage };
}

export function useJobsFeed(category: string) {
  return useInfiniteQuery({
    queryKey: ['jobs', category],
    queryFn: ({ pageParam }) => fetchJobs(category, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}

/** GET /api/projects/:id */
export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ project: BackendProject }>>(`/api/projects/${id}`);
      return mapBackendJob(data.data.project);
    },
  });
}

/** Producer's own jobs — GET /api/projects/mine */
export function useMyJobs() {
  return useQuery({
    queryKey: ['my-jobs'],
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ projects: BackendProject[] }>>('/api/projects/mine');
      return data.data.projects.map(mapBackendJob);
    },
  });
}

export interface CreateJobPayload {
  title: string;
  department: string;
  location: string;
  startDate: string;
  endDate: string;
  dayRate: number;
  description: string;
}

/** POST /api/projects */
export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateJobPayload) => {
      const { data } = await api.post<BackendEnvelope<{ project: BackendProject }>>('/api/projects', {
        title: payload.title,
        description: payload.description,
        roleNeeded: payload.department,
        location: payload.location,
        budget: payload.dayRate,
        startDate: payload.startDate,
        endDate: payload.endDate,
      });
      return mapBackendJob(data.data.project);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-jobs'] }),
  });
}

/** POST /api/applications/projects/:projectId — creates a real application row (with server-side duplicate prevention). */
export function useApplyToJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.post(`/api/applications/projects/${jobId}`, {});
      return data;
    },
    onSuccess: (_data, jobId) => {
      // Refresh anything that shows "have I applied" or a live count.
      qc.invalidateQueries({ queryKey: ['my-applications'] });
      qc.invalidateQueries({ queryKey: ['job', jobId] });
      qc.invalidateQueries({ queryKey: ['my-application-stats'] });
    },
  });
}
