import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';
import { mockUsers } from '@/services/mock';
import { Role, User } from '@/types';
import { getAvatarColor } from '@/utils/avatar';
import { mockDelay, USE_MOCK } from './helpers';

const TALENT_SKILL_MAP: Record<string, string[]> = {
  Camera: ['Cinematographer', 'Camera Op', 'DOP'],
  Sound: ['Sound Engineer', 'Sound Recordist'],
  Editing: ['Video Editor', 'Offline Editor'],
};

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Matches backend/models/profileModel.js's mapProfile() output — a profile row joined with its user. */
interface BackendProfile {
  profileId: number;
  userId: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  bio: string | null;
  location: string | null;
  skills: string | null;
  experienceLevel: string | null;
  portfolioUrl: string | null;
  availabilityStatus: string | null;
  rateAmount: number | null;
  rateCurrency: string;
  avatarUrl: string | null;
  coverUrl: string | null;
}

interface RatingStats {
  avgScore: number | null;
  total: number;
}

function mapBackendProfile(p: BackendProfile, ratingStats?: RatingStats): User {
  return {
    id: String(p.userId),
    name: p.fullName,
    email: p.email,
    role: p.role,
    roles: [p.role],
    title: p.experienceLevel ?? undefined,
    city: p.location ?? undefined,
    bio: p.bio ?? undefined,
    avatarColor: getAvatarColor(p.fullName),
    availability: (p.availabilityStatus as User['availability']) ?? 'available',
    skills: p.skills ? p.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
    credits: [],
    dayRate: p.rateAmount ?? undefined,
    rating: ratingStats?.avgScore ?? undefined,
    reviewCount: ratingStats?.total ?? undefined,
  };
}

/** GET /api/profiles/freelancers — browse talent. */
export function useTalent(search: string, category: string) {
  return useQuery({
    queryKey: ['talent', search, category],
    queryFn: async () => {
      if (USE_MOCK) {
        let list = Object.values(mockUsers).filter((u) => u.role === 'freelancer');
        if (category !== 'All') {
          const titles = TALENT_SKILL_MAP[category] ?? [];
          list = list.filter((u) => titles.includes(u.title ?? ''));
        }
        if (search.trim()) {
          const q = search.toLowerCase();
          list = list.filter(
            (u) =>
              u.name.toLowerCase().includes(q) ||
              (u.skills ?? []).some((s) => s.toLowerCase().includes(q)) ||
              (u.title ?? '').toLowerCase().includes(q),
          );
        }
        return mockDelay(list);
      }

      const { data } = await api.get<BackendEnvelope<{ freelancers: BackendProfile[] }>>(
        '/api/profiles/freelancers',
      );
      let list = data.data.freelancers.map((p) => mapBackendProfile(p));
      if (category !== 'All') {
        const titles = TALENT_SKILL_MAP[category] ?? [];
        list = list.filter((u) => titles.includes(u.title ?? ''));
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            (u.skills ?? []).some((s) => s.toLowerCase().includes(q)) ||
            (u.title ?? '').toLowerCase().includes(q),
        );
      }
      return list;
    },
  });
}

/**
 * GET /api/profiles/:userId + GET /api/ratings/user/:userId — a public
 * profile page. Returns null both for "no such user" and for "this user
 * hasn't filled in a profile yet" (the backend 404s in the latter case too,
 * since profiles are created lazily on first save — see PROFILE_EDITING.md).
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      if (USE_MOCK) {
        const user = Object.values(mockUsers).find((u) => u.id === id);
        return mockDelay(user ?? null);
      }
      try {
        const [profileRes, ratingRes] = await Promise.all([
          api.get<BackendEnvelope<{ profile: BackendProfile }>>(`/api/profiles/${id}`),
          api.get<BackendEnvelope<{ stats: RatingStats }>>(`/api/ratings/user/${id}`).catch(() => null),
        ]);
        return mapBackendProfile(profileRes.data.data.profile, ratingRes?.data.data.stats);
      } catch {
        return null;
      }
    },
  });
}

/** Mutations used by the admin Manage Users screen — always live (admin-only feature, no mock mode). */
export function useUserModeration() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const suspend = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/admin/users/${id}/suspend`);
      return data;
    },
    onSuccess: invalidate,
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/admin/users/${id}/restore`);
      return data;
    },
    onSuccess: invalidate,
  });

  return { suspend, restore };
}
