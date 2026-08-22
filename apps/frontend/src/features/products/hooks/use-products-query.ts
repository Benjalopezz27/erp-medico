import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getProductsApi } from '../api/products.api';
import type {
  PaginatedProductsResponse,
  PaginationMeta,
  ProductListItem,
  ProductSearchParams,
} from '../types/products.types';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductSearchParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export interface UseProductsQueryResult {
  data?: {
    items: ProductListItem[];
    meta: PaginationMeta;
  };
  isLoading: boolean;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  isPlaceholderData: boolean;
  refetch: () => void;
}

export function useProductsQuery(params: ProductSearchParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: async () => {
      const response: PaginatedProductsResponse<ProductListItem> = await getProductsApi(params);

      const limit = params.limit || 10;
      const page = params.page || 1;
      const totalPages = Math.max(1, Math.ceil(response.total / limit));

      return {
        items: response.items,
        meta: {
          total: response.total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
