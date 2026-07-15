import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';

export type PortfolioMediaType = 'image' | 'video';

/** Matches backend/models/portfolioModel.js's mapItem() output. */
export interface PortfolioItem {
  portfolioItemId: number;
  userId: number;
  mediaType: PortfolioMediaType;
  /** data: URI or http(s) URL for images; always an http(s) URL for videos. */
  mediaUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  isFeatured: boolean;
  createdAt: string;
}

export interface AddPortfolioItemPayload {
  mediaType: PortfolioMediaType;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  title?: string | null;
  description?: string | null;
  isFeatured?: boolean;
}

interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** GET /api/portfolio/mine — featured items first, then newest first. */
export function useMyPortfolio() {
  return useQuery({
    queryKey: ['my-portfolio'],
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ items: PortfolioItem[] }>>('/api/portfolio/mine');
      return data.data.items;
    },
  });
}

/** GET /api/portfolio/:userId — another user's portfolio (public view). */
export function usePortfolio(userId: string | undefined) {
  return useQuery({
    queryKey: ['portfolio', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await api.get<BackendEnvelope<{ items: PortfolioItem[] }>>(`/api/portfolio/${userId}`);
      return data.data.items;
    },
  });
}

/** POST /api/portfolio — add an image or video (up to 30 items per account). */
export function useAddPortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddPortfolioItemPayload) => {
      const { data } = await api.post<BackendEnvelope<{ item: PortfolioItem }>>('/api/portfolio', payload);
      return data.data.item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-portfolio'] }),
  });
}

/** PATCH /api/portfolio/:itemId/featured — toggle whether an item shows in "Featured Work". */
export function useSetPortfolioFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ portfolioItemId, isFeatured }: { portfolioItemId: number; isFeatured: boolean }) => {
      const { data } = await api.patch<BackendEnvelope<{ item: PortfolioItem }>>(
        `/api/portfolio/${portfolioItemId}/featured`,
        { isFeatured },
      );
      return data.data.item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-portfolio'] }),
  });
}

/** DELETE /api/portfolio/:itemId */
export function useDeletePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (portfolioItemId: number) => {
      await api.delete(`/api/portfolio/${portfolioItemId}`);
      return portfolioItemId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-portfolio'] }),
  });
}
