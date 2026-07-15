import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';
import { mockRequests } from '@/services/mock';
import { Conversation, Message, MessageRequest } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { getAvatarColor } from '@/utils/avatar';
import { formatRelativeTime } from '@/utils/format';
import { mockDelay, USE_MOCK } from './helpers';

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

function mapBackendMessage(m: BackendMessage): Message {
  return {
    id: String(m.messageId),
    conversationId: String(m.senderId), // overwritten by the caller with the *other* participant's id where relevant
    senderId: String(m.senderId),
    text: m.body,
    createdAt: m.sentAt,
    isRead: m.isRead,
  };
}

/** Matches messageModel.getConversations()'s return shape. */
interface BackendConversation {
  otherUserId: number;
  otherUserName: string;
  lastMessageId: number;
  lastMessageBody: string;
  lastMessageSentAt: string;
  lastMessageSenderId: number;
  lastMessageIsRead: boolean;
  unreadCount: number;
}

function mapBackendConversation(c: BackendConversation, myId: string): Conversation {
  const mine = String(c.lastMessageSenderId) === myId;
  return {
    id: String(c.otherUserId),
    participantId: String(c.otherUserId),
    participantName: c.otherUserName,
    avatarColor: getAvatarColor(c.otherUserName),
    lastMessage: mine ? `You: ${c.lastMessageBody}` : c.lastMessageBody,
    timestamp: formatRelativeTime(c.lastMessageSentAt),
    unread: !mine && c.unreadCount > 0,
    online: false, // live-updated client-side via the 'presence:changed' socket event, not fetched
  };
}

/** GET /api/messages/conversations — the Chats list: one row per DM thread, latest message + unread count, most-recent first. */
export function useConversations() {
  const myId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['conversations'],
    enabled: !!myId,
    refetchInterval: 30000, // light poll as a safety net alongside the socket push
    queryFn: async (): Promise<Conversation[]> => {
      const { data } = await api.get<BackendEnvelope<{ conversations: BackendConversation[] }>>(
        '/api/messages/conversations',
      );
      return data.data.conversations.map((c) => mapBackendConversation(c, myId!));
    },
  });
}

/**
 * Chat-header metadata for one conversation. There's no dedicated
 * "GET conversation by id" endpoint — a conversation is just the set of
 * messages with that user — so this reads it straight out of the
 * `['conversations']` cache (already fetched for the Chats list) rather
 * than making a second network call the backend has no route for.
 * Returns undefined for a brand-new thread with no messages yet; the chat
 * screen falls back to route params (name/avatar passed in from wherever
 * the "Message" action was tapped) in that case.
 */
export function useConversation(conversationId: string) {
  const qc = useQueryClient();
  const conversations = qc.getQueryData<Conversation[]>(['conversations']);
  return conversations?.find((c) => c.id === conversationId);
}

/** GET /api/messages/thread/:userId — full chronological history with one other user, oldest first. */
export function useMessages(conversationId: string) {
  const myId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['messages', conversationId],
    enabled: !!conversationId && !!myId,
    queryFn: async (): Promise<Message[]> => {
      const { data } = await api.get<BackendEnvelope<{ messages: BackendMessage[] }>>(
        `/api/messages/thread/${conversationId}`,
      );
      return data.data.messages.map((m) => ({ ...mapBackendMessage(m), conversationId }));
    },
  });
}

/** POST /api/messages — send a message. The very first send between two users is what creates the "conversation" (there's no separate conversations table to pre-create one in). */
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<BackendEnvelope<{ message: BackendMessage }>>('/api/messages', {
        recipientId: Number(conversationId),
        body: text,
      });
      return { ...mapBackendMessage(data.data.message), conversationId };
    },
    onSuccess: () => {
      // The socket push (message:new) updates the open chat screen instantly
      // in the common case; these invalidations are the fallback so sending
      // still shows up immediately even if the socket connection is down.
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });
}

/** PATCH /api/messages/thread/:userId/read — marks the whole thread as read; call when a chat screen opens/gains focus. */
export function useMarkThreadRead(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/api/messages/thread/${conversationId}/read`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

/** GET /api/message-requests */
export function useMessageRequests() {
  return useQuery({
    queryKey: ['message-requests'],
    queryFn: async () => {
      if (USE_MOCK) return mockDelay(mockRequests);
      const { data } = await api.get<MessageRequest[]>('/api/message-requests');
      return data;
    },
  });
}

/** POST /api/message-requests/:id/accept | /decline */
export function useRequestActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['message-requests'] });

  const accept = useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) return mockDelay({ ok: true });
      const { data } = await api.post(`/api/message-requests/${id}/accept`);
      return data;
    },
    onSuccess: invalidate,
  });

  const decline = useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) return mockDelay({ ok: true });
      const { data } = await api.post(`/api/message-requests/${id}/decline`);
      return data;
    },
    onSuccess: invalidate,
  });

  return { accept, decline };
}
