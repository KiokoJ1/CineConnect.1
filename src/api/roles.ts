import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Role, User } from '@/types';
import { getAvatarColor } from '@/utils/avatar';

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface RolesResponse {
  roles: Role[];
  activeRole: Role;
}

/** Backend user shape (see backend/services/authService.js#sanitizeUser). */
interface BackendUser {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  status: 'active' | 'suspended';
  createdAt: string;
}

/** GET /api/auth/roles — every role the signed-in account holds, plus which is active. */
export function useMyRoles() {
  const myId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['my-roles'],
    enabled: !!myId,
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<RolesResponse>>('/api/auth/roles');
      return data.data;
    },
  });
}

/** POST /api/auth/roles — grants an additional role without switching to it. */
export function useAddRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (role: Role) => {
      const { data } = await api.post<BackendEnvelope<RolesResponse>>('/api/auth/roles', { role });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-roles'] }),
  });
}

/**
 * PATCH /api/auth/active-role — switches which role is active.
 *
 * The backend re-derives permissions from Oracle on every request (see
 * MULTI_ROLE_SYSTEM.md), so no new token is needed — only the stored user
 * object needs updating. Every cached query is cleared so nothing from the
 * previous role's view (dashboard stats, job lists, applications, etc.)
 * lingers under the new one; the destination screen fetches fresh.
 */
export function useSwitchActiveRole() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: async (role: Role) => {
      const { data } = await api.patch<BackendEnvelope<{ user: BackendUser }>>('/api/auth/active-role', {
        role,
      });
      return data.data.user;
    },
    onSuccess: async (backendUser) => {
      const user: User = {
        id: String(backendUser.id),
        name: backendUser.fullName,
        email: backendUser.email,
        role: backendUser.role,
        status: backendUser.status,
        avatarColor: getAvatarColor(backendUser.fullName),
        availability: 'available',
        skills: [],
        credits: [],
      };
      if (token) await setAuth({ user, token });
      qc.clear();
    },
  });
}
