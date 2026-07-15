import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';

interface IncomingMessagePayload {
  message: {
    messageId: number;
    senderId: number;
    recipientId: number;
  };
}

interface SeenPayload {
  seenBy: number;
}

/**
 * Mirrors useNotificationSocket's pattern (see APPLICATION_WORKFLOW.md) but
 * for the messaging domain: listens for the backend's `message:new` /
 * `message:seen` socket pushes (see backend/routes/messageRoutes.js) and
 * invalidates the Chats list + whichever thread changed, so both the
 * Producer and Freelancer see new messages and read receipts the instant
 * they arrive — no polling, no manual refresh.
 */
export function useMessagingSocket() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const myId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    if (!socket) return;

    const onMessage = ({ message }: IncomingMessagePayload) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      const otherUserId =
        String(message.senderId) === myId ? String(message.recipientId) : String(message.senderId);
      qc.invalidateQueries({ queryKey: ['messages', otherUserId] });
    };

    const onSeen = ({ seenBy }: SeenPayload) => {
      qc.invalidateQueries({ queryKey: ['messages', String(seenBy)] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    };

    socket.on('message:new', onMessage);
    socket.on('message:seen', onSeen);
    return () => {
      socket.off('message:new', onMessage);
      socket.off('message:seen', onSeen);
    };
  }, [token, myId, qc]);
}
