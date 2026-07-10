import { useQuery } from '@tanstack/react-query';

import { api } from '@/services/api';
import { AdminStats, User } from '@/types';

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Admin data always comes from the live backend — there is no mock path
 * here. The Admin panel is only reachable by a real admin account (see
 * app/(admin)/_layout.tsx's role guard), so there's no "demo mode" case to
 * support the way there is for freelancer/producer browsing screens.
 */

/** GET /api/admin/stats */
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Backend wraps every response as { success, message, data }.
      const { data } = await api.get<BackendEnvelope<AdminStats>>('/api/admin/stats');
      return data.data;
    },
  });
}

/** GET /api/admin/users?role=&search= */
export function useAdminUsers(search: string, role: string) {
  return useQuery({
    queryKey: ['admin-users', search, role],
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ users: BackendAdminUser[] }>>('/api/admin/users', {
        params: { role: role === 'All' ? undefined : role.toLowerCase(), search: search || undefined },
      });
      return data.data.users.map(mapBackendAdminUser);
    },
  });
}

/** Shape returned per-user by GET /api/admin/users (see backend/services/authService.js#sanitizeUser). */
interface BackendAdminUser {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: User['role'];
  status: 'active' | 'suspended';
  createdAt: string;
}

function mapBackendAdminUser(u: BackendAdminUser): User {
  return {
    id: String(u.id),
    name: u.fullName,
    email: u.email,
    role: u.role,
    availability: 'available',
    skills: [],
    credits: [],
    status: u.status,
  };
}
