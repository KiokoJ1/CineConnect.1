import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';

export interface FollowStatus {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function queryKey(userId: string) {
  return ['follow-status', userId];
}

/** GET /api/follows/:userId — am I following them + their follower/following counts. */
export function useFollowStatus(userId: string) {
  return useQuery({
    queryKey: queryKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<FollowStatus>>(`/api/follows/${userId}`);
      return data.data;
    },
  });
}

/**
 * POST/DELETE /api/follows/:userId. Updates the cached follow-status
 * instantly (optimistic) so the button and follower count flip the moment
 * you tap — the request confirms it in Oracle in the background, and rolls
 * back on failure.
 */
export function useFollowActions(userId: string) {
  const qc = useQueryClient();
  const key = queryKey(userId);

  const applyOptimistic = (isFollowing: boolean) => {
    const previous = qc.getQueryData<FollowStatus>(key);
    qc.setQueryData<FollowStatus>(key, (current) => {
      const base = current ?? { isFollowing: !isFollowing, followerCount: 0, followingCount: 0 };
      return {
        ...base,
        isFollowing,
        followerCount: Math.max(0, base.followerCount + (isFollowing ? 1 : -1)),
      };
    });
    return previous;
  };

  const follow = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<BackendEnvelope<FollowStatus>>(`/api/follows/${userId}`);
      return data.data;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const previous = applyOptimistic(true);
      return { previous };
    },
    onError: (_err, _vars, context) => qc.setQueryData(key, context?.previous),
    onSuccess: (status) => qc.setQueryData(key, status),
  });

  const unfollow = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<BackendEnvelope<FollowStatus>>(`/api/follows/${userId}`);
      return data.data;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const previous = applyOptimistic(false);
      return { previous };
    },
    onError: (_err, _vars, context) => qc.setQueryData(key, context?.previous),
    onSuccess: (status) => qc.setQueryData(key, status),
  });

  return { follow, unfollow };
}

/**
 * Listens for the backend's `follow:changed` push (see
 * backend/routes/followRoutes.js) so a follower count updates live for the
 * person being followed too — not just the follower who tapped the button.
 * Mount once at the app root, alongside useNotificationSocket/useMessagingSocket.
 */
export function useFollowSocket() {
  const qc = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!myId) return;
    const socket = getSocket();
    if (!socket) return;

    const onChanged = (payload: { followedId: number; followerCount: number; followingCount: number }) => {
      const targetId = String(payload.followedId);
      if (targetId !== myId) return; // only relevant if it's *my* counts that changed
      qc.setQueryData<FollowStatus>(queryKey(targetId), (current) => ({
        isFollowing: current?.isFollowing ?? false,
        followerCount: payload.followerCount,
        followingCount: payload.followingCount,
      }));
      qc.invalidateQueries({ queryKey: ['my-analytics'] });
    };

    socket.on('follow:changed', onChanged);
    return () => {
      socket.off('follow:changed', onChanged);
    };
  }, [myId, qc]);
}
