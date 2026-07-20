import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface FollowStatus {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

function queryKey(userId: string) {
  return ['follow-status', userId];
}

/** GET /api/follows/:userId — follow state + counts for a profile screen. */
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
 * Follow/unfollow, both wired for an instant UI flip (button label/color and
 * the follower count) rather than waiting on a round trip — reconciled with
 * the server's real counts once the response lands, and again live if the
 * other person's own screen pushes a `follow_update` socket event (see
 * useNotificationSocket.ts).
 */
export function useFollowActions(userId: string) {
  const qc = useQueryClient();

  const applyOptimistic = (isFollowing: boolean) => {
    qc.setQueryData<FollowStatus>(queryKey(userId), (prev) =>
      prev
        ? { ...prev, isFollowing, followerCount: Math.max(0, prev.followerCount + (isFollowing ? 1 : -1)) }
        : prev,
    );
  };

  const follow = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<BackendEnvelope<FollowStatus>>(`/api/follows/${userId}`);
      return data.data;
    },
    onMutate: () => applyOptimistic(true),
    onSuccess: (result) => qc.setQueryData(queryKey(userId), result),
    onError: () => qc.invalidateQueries({ queryKey: queryKey(userId) }),
  });

  const unfollow = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<BackendEnvelope<FollowStatus>>(`/api/follows/${userId}`);
      return data.data;
    },
    onMutate: () => applyOptimistic(false),
    onSuccess: (result) => qc.setQueryData(queryKey(userId), result),
    onError: () => qc.invalidateQueries({ queryKey: queryKey(userId) }),
  });

  return { follow, unfollow };
}
