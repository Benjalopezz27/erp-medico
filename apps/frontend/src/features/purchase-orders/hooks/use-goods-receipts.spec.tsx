import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as api from '../api/purchase-orders.api';
import { useGoodsReceiptsQuery } from './use-goods-receipts-query';
import { useCreateGoodsReceiptMutation } from './use-goods-receipt-mutation';
import { purchaseOrdersKeys } from './purchase-orders-keys';
import { stockKeys } from '@/features/stock/hooks/stock-keys';

vi.mock('../api/purchase-orders.api');

describe('goods receipts query hooks', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it('loads receipt history with the stable receipt-list key', async () => {
    const response = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    vi.mocked(api.getGoodsReceiptsByPurchaseOrderApi).mockResolvedValueOnce(response as any);

    const { result } = renderHook(() => useGoodsReceiptsQuery('po-1', { page: 1, limit: 10 }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(response);
    expect(api.getGoodsReceiptsByPurchaseOrderApi).toHaveBeenCalledWith(
      'po-1',
      { page: 1, limit: 10 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('invalidates purchase orders and stock after creation without writing partial detail data', async () => {
    const response = { receipt: { id: 'receipt-1' }, resultingPurchaseOrder: { id: 'po-1' } };
    vi.mocked(api.createGoodsReceiptApi).mockResolvedValueOnce(response as any);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setDataSpy = vi.spyOn(queryClient, 'setQueryData');

    const { result } = renderHook(() => useCreateGoodsReceiptMutation('po-1'), { wrapper });
    act(() => {
      result.current.mutate({
        deliveryNoteNumber: 'REM-1',
        items: [{ purchaseOrderItemId: 'item-1', receivedQtyPurchaseUnit: 1 }],
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: purchaseOrdersKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: stockKeys.all });
    expect(setDataSpy).not.toHaveBeenCalled();
  });
});
