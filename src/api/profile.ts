import { useQuery } from '@tanstack/react-query';

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
