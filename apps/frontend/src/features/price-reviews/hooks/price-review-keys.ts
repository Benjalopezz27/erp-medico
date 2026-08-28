import type { PriceReviewSearchParams } from '../types/price-reviews.types';

export const priceReviewKeys = {
  all: ['price-reviews'] as const,
  lists: () => [...priceReviewKeys.all, 'list'] as const,
  list: (params: PriceReviewSearchParams) => [...priceReviewKeys.lists(), params] as const,
  details: () => [...priceReviewKeys.all, 'detail'] as const,
  detail: (id: string) => [...priceReviewKeys.details(), id] as const,
  pendingCount: () => [...priceReviewKeys.all, 'pending-count'] as const,
};
