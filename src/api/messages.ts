import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Conversation, Message } from '@/types';
import { getAvatarColor } from '@/utils/avatar';
import { formatRelativeTime } from '@/utils/format';

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Matches backend/models/messageModel.js's mapMessage(). */
interface BackendMessage {
  messageId: number;
  projectId: number | null;
  projectTitle: string | null;
  senderId: number;
  senderName: string;
  recipientId: number;
  recipientName: string;
  body: string;
  isRead: boolean;
  sentAt: string;
}

function mapBackendMessage(m: BackendMessage, otherUserId: string): Message {
  return {
    id: String(m.messageId),
    conversationId: otherUserId,
    senderId: String(m.senderId),
    text: m.body,
    createdAt: m.sentAt,
    isRead: m.isRead,
  };
}

/**
 * There is no `conversations` table — a "conversation" is just every
 * message between the signed-in user and one other person. The inbox
 * endpoint returns a flat, mixed list of sent + received messages; this
 * groups it into one row per counterpart (most recent message, unread
 * count) so it can drive the existing ConversationRow UI unchanged.
 */
function deriveConversations(messages: BackendMessage[], myId: number): Conversation[] {
  const byCounterpart = new Map<number, { name: string; messages: BackendMessage[] }>();

  for (const m of messages) {
    const otherId = m.senderId === myId ? m.recipientId : m.senderId;
    const otherName = m.senderId === myId ? m.recipientName : m.senderName;
    if (!byCounterpart.has(otherId)) byCounterpart.set(otherId, { name: otherName, messages: [] });
    byCounterpart.get(otherId)!.messages.push(m);
  }

  return Array.from(byCounterpart.entries())
    .map(([otherId, { name, messages: msgs }]) => {
      msgs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      const last = msgs[0];
      const unread = msgs.some((m) => m.recipientId === myId && !m.isRead);
      return {
        id: String(otherId),
        participantId: String(otherId),
        participantName: name,
        avatarColor: getAvatarColor(name),
        lastMessage: last.body,
        timestamp: formatRelativeTime(last.sentAt),
        unread,
        online: false, // no presence tracking on the backend yet
        _sortTime: new Date(last.sentAt).getTime(),
      };
    })
    .sort((a, b) => b._sortTime - a._sortTime)
    .map(({ _sortTime, ...c }) => c);
}

/** GET /api/messages/inbox — every message involving the signed-in user, grouped into conversations. */
export function useConversations() {
  const myId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['conversations'],
    enabled: !!myId,
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ messages: BackendMessage[] }>>('/api/messages/inbox');
      return deriveConversations(data.data.messages, Number(myId));
    },
  });
}

/** GET /api/messages/thread/:userId */
export function useMessages(otherUserId: string) {
  return useQuery({
    queryKey: ['messages', otherUserId],
    enabled: !!otherUserId,
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ messages: BackendMessage[] }>>(
        `/api/messages/thread/${otherUserId}`,
      );
      return data.data.messages.map((m) => mapBackendMessage(m, otherUserId));
    },
  });
}

/** POST /api/messages — REST fallback for sending (primary path is the socket; see chat/[id].tsx). */
export function useSendMessage(otherUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<BackendEnvelope<{ message: BackendMessage }>>('/api/messages', {
        recipientId: Number(otherUserId),
        body: text,
      });
      return data.data.message;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['messages', otherUserId] });
    },
  });
}

/** PATCH /api/messages/thread/:userId/read — called when a thread is opened. */
export function useMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data } = await api.patch(`/api/messages/thread/${otherUserId}/read`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

/** GET /api/messages/unread-count — badge count for the Messages tab. */
export function useUnreadMessageCount() {
  return useQuery({
    queryKey: ['unread-message-count'],
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ count: number }>>('/api/messages/unread-count');
      return data.data.count;
    },
  });
}
