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
  paymentModes?: string | null;
  /** data: URI (base64) or http(s) URL — see PROFILE_EDITING.md. */
  avatarUrl: string | null;
  coverUrl: string | null;
}

/** Editable subset — everything upsertMyProfile() actually accepts. */
export type ProfileEditPayload = Pick<
  FreelancerProfile,
  | 'bio'
  | 'location'
  | 'skills'
  | 'experienceLevel'
  | 'portfolioUrl'
  | 'availabilityStatus'
  | 'rateAmount'
  | 'rateCurrency'
  | 'paymentModes'
  | 'avatarUrl'
  | 'coverUrl'
>;

export interface FilmCredit {
  creditId: number;
  title: string;
  role: string;
  year: number | null;
  creditType?: string | null;
  description?: string | null;
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

/**
 * POST /api/profiles/me — the backend upserts the *entire* row (it's not a
 * partial PATCH), so every call here sends every field. The edit screen is
 * responsible for merging its edits over the existing profile (see
 * EditProfileScreen) rather than sending only the fields the user touched —
 * otherwise saving a new bio would silently null out someone's day rate.
 */
export function useUpsertProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProfileEditPayload) => {
      const { data } = await api.post<BackendEnvelope<{ profile: FreelancerProfile }>>(
        '/api/profiles/me',
        payload,
      );
      return data.data.profile;
    },
    onSuccess: (profile) => {
      qc.setQueryData(['my-profile'], profile);
      qc.invalidateQueries({ queryKey: ['my-analytics'] }); // profile-completeness card reads skills/bio too
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

/** POST /api/credits — add one "experience" entry (a past film credit). */
export function useAddCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (credit: { title: string; role: string; year?: number | null }) => {
      const { data } = await api.post<BackendEnvelope<{ credit: FilmCredit }>>('/api/credits', credit);
      return data.data.credit;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-credits'] }),
  });
}

/** DELETE /api/credits/:creditId */
export function useDeleteCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (creditId: number) => {
      await api.delete(`/api/credits/${creditId}`);
      return creditId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-credits'] }),
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

/** Inverse of parseSkills — joins a clean list back into the backend's comma-separated string. */
export function joinSkills(skills: string[]): string {
  return skills.map((s) => s.trim()).filter(Boolean).join(', ');
}
