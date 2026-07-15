import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';
import { Role, User } from '@/types';
import { getAvatarColor } from '@/utils/avatar';

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Shape returned by GET /api/users and /api/users/:id (see backend/services/authService.js#sanitizeUser). */
interface BackendUser {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  status: 'active' | 'suspended';
  createdAt: string;
}

function mapBackendUser(u: BackendUser): User {
  return {
    id: String(u.id),
    name: u.fullName,
    email: u.email,
    role: u.role,
    avatarColor: getAvatarColor(u.fullName),
    availability: 'available',
    skills: [],
    credits: [],
    status: u.status,
  };
}

/** GET /api/users?role=freelancer&search= — Browse Talent screen. */
export function useTalent(search: string, category: string) {
  return useQuery({
    // category isn't sent to the backend (see comment below) but is kept in
    // the key so callers that expect a refetch on category change still work.
    queryKey: ['talent', search, category],
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ users: BackendUser[] }>>('/api/users', {
        params: { role: 'freelancer', search: search || undefined },
      });
      // Category pills (Camera/Sound/Editing/...) have no backend-side
      // taxonomy to filter against — GET /api/users doesn't return profile
      // skills — so category filtering is a no-op here rather than silently
      // hiding every result. Same underlying schema gap noted in
      // APPLICATION_WORKFLOW.md for job categories.
      return data.data.users.map(mapBackendUser);
    },
  });
}

/** GET /api/users/:id */
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ user: BackendUser }>>(`/api/users/${id}`);
      return mapBackendUser(data.data.user);
    },
  });
}

/**
 * GET /api/users?search=&role= — user directory for starting a new
 * conversation (Messages tab "Discover"). role is one of
 * 'All' | 'freelancer' | 'producer' | 'client'.
 */
export function useAllUsers(search: string, role: string) {
  return useQuery({
    queryKey: ['all-users', search, role],
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ users: BackendUser[] }>>('/api/users', {
        params: { role: role === 'All' ? undefined : role.toLowerCase(), search: search || undefined },
      });
      return data.data.users.map(mapBackendUser);
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
