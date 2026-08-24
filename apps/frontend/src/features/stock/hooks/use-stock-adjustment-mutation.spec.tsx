import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStockAdjustmentMutation } from './use-stock-adjustment-mutation';
import * as stockApi from '../api/stock.api';
import { stockKeys } from './stock-keys';
import { StockMovementType } from '@erp/shared-types';

describe('useStockAdjustmentMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('calls postStockAdjustmentApi and invalidates related query keys', async () => {
    const mockMovement = {
      id: 'mov-1',
      productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      movementType: StockMovementType.AJUSTE_ENTRADA,
      quantityBase: 10,
      previousStock: 50,
      subsequentStock: 60,
      reason: 'Ajuste test',
      userId: 'user-1',
      createdAt: '2026-08-24T12:00:00.000Z',
    };

    vi.spyOn(stockApi, 'postStockAdjustmentApi').mockResolvedValueOnce(mockMovement);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useStockAdjustmentMutation(), { wrapper });

    const dto = {
      productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      movementType: StockMovementType.AJUSTE_ENTRADA as const,
      quantityBase: 10,
      reason: 'Ajuste test',
    };

    result.current.mutate(dto);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(stockApi.postStockAdjustmentApi).toHaveBeenCalledWith(dto);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: stockKeys.overviews() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: stockKeys.alerts() });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: stockKeys.movementLists('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: stockKeys.evolutions('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['products', 'search'] });
  });
});
