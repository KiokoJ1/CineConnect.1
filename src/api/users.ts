import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';
import { mockUsers } from '@/services/mock';
import { User } from '@/types';
import { mockDelay, USE_MOCK } from './helpers';

const TALENT_SKILL_MAP: Record<string, string[]> = {
  Camera: ['Cinematographer', 'Camera Op', 'DOP'],
  Sound: ['Sound Engineer', 'Sound Recordist'],
  Editing: ['Video Editor', 'Offline Editor'],
};

/** GET /api/users?role=freelancer&skill=&page= */
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
      const { data } = await api.get<User[]>('/api/users', {
        params: { role: 'freelancer', skill: category === 'All' ? undefined : category, search },
      });
      return data;
    },
  });
}

/** GET /api/users/:id */
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      if (USE_MOCK) {
        const user = Object.values(mockUsers).find((u) => u.id === id);
        return mockDelay(user ?? null);
      }
      const { data } = await api.get<User>(`/api/users/${id}`);
      return data;
    },
  });
}

/** POST /api/message-requests — send a message request to a freelancer. */
export function useSendMessageRequest() {
  return useMutation({
    mutationFn: async (toUserId: string) => {
      if (USE_MOCK) return mockDelay({ ok: true });
      const { data } = await api.post('/api/message-requests', { toUserId });
      return data;
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
