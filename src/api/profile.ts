import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';

/** Matches backend/models/profileModel.js's mapProfile() output. */
export interface FreelancerProfile {
  profileId: number;
  userId: number;
  bio: string | null;
  location: string | null;
  /** Free-text, comma-separated (Oracle VARCHAR2 column — not a JSON array). */
  skills: string | null;
  experienceLevel: string | null;
  portfolioUrl: string | null;
  availabilityStatus: string | null;
  rateAmount: number | null;
  rateCurrency: string;
  paymentModes: string | null;
  /** Base64 data URI ("data:image/jpeg;base64,...") or null — stored directly in Oracle (see README.md). */
  profilePhoto: string | null;
  coverPhoto: string | null;
}

export interface FilmCredit {
  creditId: number;
  title: string;
  role: string;
  year: number | null;
}

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** GET /api/profiles/me — returns null for a user who hasn't filled in a profile yet. */
export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ profile: FreelancerProfile | null }>>(
        '/api/profiles/me',
      );
      return data.data.profile;
    },
  });
}

/** GET /api/profiles/:userId — viewing someone else's profile (e.g. a producer looking at a freelancer). */
export function useProfileByUserId(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    retry: false, // a 404 (no profile yet) is an expected, not a transient, failure
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ profile: FreelancerProfile }>>(
        `/api/profiles/${userId}`,
      );
      return data.data.profile;
    },
  });
}

export interface ProfileFormValues {
  bio: string;
  location: string;
  skills: string;
  experienceLevel: string;
  /** data URI or null to clear */
  profilePhoto: string | null;
  coverPhoto: string | null;
  // Not edited by the current Edit Profile screen, but the backend's PUT is
  // a full replace — round-trip these so saving bio/skills/etc doesn't wipe
  // out rate/availability/portfolio a person set some other way.
  portfolioUrl?: string;
  availabilityStatus?: string;
  rateAmount?: number | null;
  rateCurrency?: string;
  paymentModes?: string;
}

/** POST/PUT /api/profiles/me — full upsert, matching the backend's "send the whole profile" contract. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { data } = await api.put<BackendEnvelope<{ profile: FreelancerProfile }>>(
        '/api/profiles/me',
        values,
      );
      return data.data.profile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

/** GET /api/credits/mine */
export function useMyCredits() {
  return useQuery({
    queryKey: ['my-credits'],
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ credits: FilmCredit[] }>>('/api/credits/mine');
      return data.data.credits;
    },
  });
}

/** Splits the backend's comma-separated skills string into a clean list. */
export function parseSkills(skills: string | null | undefined): string[] {
  if (!skills) return [];
  return skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface ProfileStats {
  avgRating: number;
  totalReviews: number;
  /** Applications with status 'hired' — the closest real signal to "completed jobs" the schema supports. */
  completedJobs: number;
  totalApplications: number;
}

/**
 * GET /api/profiles/:userId/stats — ratings, reviews, completed jobs, and
 * applications for any user's profile. Works the same for the signed-in
 * user's own profile and for a producer viewing a freelancer's profile —
 * unlike GET /api/analytics/me, this isn't limited to "me".
 */
export function useProfileStats(userId: string) {
  return useQuery({
    queryKey: ['profile-stats', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<ProfileStats>>(`/api/profiles/${userId}/stats`);
      return data.data;
    },
  });
}
