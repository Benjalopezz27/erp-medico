import { useQuery } from '@tanstack/react-query';
import { getProductByIdApi } from '../api/products.api';
import { productKeys } from './use-products-query';

export function useProductDetailQuery(id?: string) {
  return useQuery({
    queryKey: productKeys.detail(id || ''),
    queryFn: () => getProductByIdApi(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
