import { useQuery } from '@tanstack/react-query';
import { searchProductsTypeaheadApi } from '../api/products.api';
import type { IProductSummary } from '../types/products.types';

export interface UseProductSearchQueryOptions {
  limit?: number;
  enabled?: boolean;
}

export function useProductSearchQuery(searchTerm: string, options?: UseProductSearchQueryOptions) {
  const trimmed = searchTerm ? searchTerm.trim() : '';
  const limit = options?.limit || 10;
  const isEnabled = Boolean((options?.enabled ?? true) && trimmed.length >= 2);

  return useQuery<IProductSummary[]>({
    queryKey: ['products', 'search', trimmed, limit],
    queryFn: ({ signal }) => searchProductsTypeaheadApi({ q: trimmed, limit }, signal),
    enabled: isEnabled,
    staleTime: 30_000,
  });
}
