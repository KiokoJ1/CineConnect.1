import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';
import { mockConversations, mockMessages, mockRequests } from '@/services/mock';
import { Conversation, Message, MessageRequest } from '@/types';
import { mockDelay, USE_MOCK } from './helpers';

/** GET /api/conversations */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      if (USE_MOCK) return mockDelay(mockConversations);
      const { data } = await api.get<Conversation[]>('/api/conversations');
      return data;
    },
  });
}

/** GET /api/conversations/:id — header metadata for the chat screen. */
export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (USE_MOCK) {
        return mockDelay(mockConversations.find((c) => c.id === conversationId) ?? null, 0);
      }
      const { data } = await api.get<Conversation>(`/api/conversations/${conversationId}`);
      return data;
    },
  });
}

/** GET /api/messages/:conversationId */
export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (USE_MOCK) return mockDelay(mockMessages[conversationId] ?? [], 250);
      const { data } = await api.get<Message[]>(`/api/messages/${conversationId}`);
      return data;
    },
  });
}

/** POST /api/messages — send a message (fallback when no live socket). */
export function useSendMessage(conversationId: string) {
  return useMutation({
    mutationFn: async (text: string) => {
      if (USE_MOCK) return mockDelay({ ok: true }, 150);
      const { data } = await api.post('/api/messages', { conversationId, text });
      return data;
    },
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
