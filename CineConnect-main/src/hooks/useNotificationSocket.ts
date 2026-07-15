import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';

interface SocketNotification {
  type: string;
  data?: string | null;
}

/**
 * Listens for the backend's `notify()`-pushed 'notification' socket event
 * (see backend/services/notificationService.js) and invalidates the
 * relevant query caches so screens update immediately — not just the
 * notifications list, but the producer's job/application counts and the
 * freelancer's application status too, without waiting for the next manual
 * refresh or the 30s notifications poll.
 */
export function useNotificationSocket() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    if (!socket) return;

    const onNotification = (notification: SocketNotification) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });

      let projectId: string | undefined;
      try {
        const parsed = notification.data ? JSON.parse(notification.data) : null;
        projectId = parsed?.projectId ? String(parsed.projectId) : undefined;
      } catch {
        // Malformed data payload — still refresh the notification list above, just skip the targeted invalidation.
      }

      if (notification.type === 'new_application') {
        // Producer side: application just landed on one of their jobs.
        qc.invalidateQueries({ queryKey: ['my-jobs'] });
        if (projectId) qc.invalidateQueries({ queryKey: ['applications', projectId] });
      } else if (notification.type === 'application_accepted' || notification.type === 'application_declined') {
        // Freelancer side: one of their applications changed status.
        qc.invalidateQueries({ queryKey: ['my-applications'] });
        qc.invalidateQueries({ queryKey: ['my-application-stats'] });
      }
    };

    socket.on('notification', onNotification);
    return () => {
      socket.off('notification', onNotification);
    };
  }, [token, qc]);
}
