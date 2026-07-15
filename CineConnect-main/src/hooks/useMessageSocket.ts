import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';

interface SocketMessage {
  senderId: number;
  recipientId: number;
}

interface SocketConversationUpdate {
  otherUserId: number;
}

interface SocketSeenReceipt {
  readerId: number;
}

/**
 * Mounted once at the app root (alongside useNotificationSocket) so the
 * Chats list — a brand-new conversation appearing, a preview/timestamp
 * changing, an unread badge updating — stays correct in real time even
 * when no chat screen is open. The open chat screen itself (app/chat/[id])
 * additionally listens directly for instant bubble append / tick flips,
 * which needs its own local message state rather than a cache refetch.
 */
export function useMessageSocket() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    if (!socket) return;

    const refreshConversations = () => qc.invalidateQueries({ queryKey: ['conversations'] });

    const onNewMessage = (message: SocketMessage) => {
      refreshConversations();
      qc.invalidateQueries({ queryKey: ['messages', String(message.senderId)] });
      qc.invalidateQueries({ queryKey: ['message-unread-count'] });
    };

    const onConversationUpdate = (payload: SocketConversationUpdate) => {
      refreshConversations();
      qc.invalidateQueries({ queryKey: ['messages', String(payload.otherUserId)] });
    };

    const onSeen = (payload: SocketSeenReceipt) => {
      qc.invalidateQueries({ queryKey: ['messages', String(payload.readerId)] });
    };

    socket.on('message:new', onNewMessage);
    socket.on('conversation:update', onConversationUpdate);
    socket.on('message:seen', onSeen);
    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('conversation:update', onConversationUpdate);
      socket.off('message:seen', onSeen);
    };
  }, [token, qc]);
}
