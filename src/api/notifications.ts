import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';
import { AppNotification, NotificationType } from '@/types';
import { formatRelativeTime, relativeGroup } from '@/utils/format';

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Matches backend/models/notificationModel.js's mapNotification(). */
interface BackendNotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  body: string | null;
  /** JSON-encoded extra context, e.g. '{"projectId":4,"applicationId":9}' */
  data: string | null;
  isRead: boolean;
  createdAt: string;
}

function targetForNotification(n: BackendNotification): string | undefined {
  try {
    const data = n.data ? JSON.parse(n.data) : null;
    if (!data?.projectId) return undefined;
    // Producer-facing types go to the applicants list; freelancer-facing
    // types go to the job the notification is about.
    if (n.type === 'new_application') return `/applications/${data.projectId}`;
    return `/job/${data.projectId}`;
  } catch {
    return undefined;
  }
}

function mapBackendNotification(n: BackendNotification): AppNotification {
  return {
    id: String(n.id),
    type: n.type,
    title: n.title,
    subtitle: n.body ?? '',
    timestamp: formatRelativeTime(n.createdAt),
    group: relativeGroup(n.createdAt),
    read: n.isRead,
    target: targetForNotification(n),
  };
}

/** GET /api/notifications */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    // Real-time push (see src/hooks/useNotificationSocket.ts) covers the
    // live case; this poll is just a safety net for missed/offline events.
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ notifications: BackendNotification[] }>>(
        '/api/notifications',
      );
      return data.data.notifications.map(mapBackendNotification);
    },
  });
}

/** Count of unread notifications for the bell badge. */
export function useUnreadCount() {
  const { data } = useNotifications();
  return (data ?? []).filter((n: AppNotification) => !n.read).length;
}

/** POST /api/notifications/read-all */
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/notifications/read-all');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
