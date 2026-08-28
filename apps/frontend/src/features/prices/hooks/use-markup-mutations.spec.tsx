import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkupLevel } from '@erp/shared-types';
import { productKeys } from '@/features/products/hooks/use-products-query';
import * as api from '../api/markups.api';
import { markupKeys } from './markup-keys';
import { useCreateMarkupMutation } from './use-markup-mutations';

describe('markup mutations', () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    vi.restoreAllMocks();
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('invalidates configurations, all simulations and product prices', async () => {
    vi.spyOn(api, 'createMarkupApi').mockResolvedValue({ id: 'markup-1' } as never);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateMarkupMutation(), { wrapper });
    result.current.mutate({ level: MarkupLevel.GLOBAL, percentage: '10.0000' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: markupKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: markupKeys.simulations() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: productKeys.all });
  });
});
