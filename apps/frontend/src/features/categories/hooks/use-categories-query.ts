import { useQuery } from '@tanstack/react-query';
import { getCategoriesApi } from '../api/categories.api';

export const categoryKeys = {
  all: ['categories'] as const,
};

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: getCategoriesApi,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}
