import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useEmitPurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
} from './use-purchase-order-mutations';
import * as api from '../api/purchase-orders.api';
import { purchaseOrdersKeys } from './purchase-orders-keys';

vi.mock('../api/purchase-orders.api');

describe('Purchase Orders Mutation Hooks', () => {
  let queryClient: QueryClient;

  function createWrapper() {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCreatePurchaseOrderMutation', () => {
    it('creates purchase order, invalidates list, and populates detail query cache', async () => {
      const mockCreated = { id: 'po-100', orderNumber: 'OC-000100' };
      vi.spyOn(api, 'createPurchaseOrderApi').mockResolvedValueOnce(mockCreated as any);

      const wrapper = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreatePurchaseOrderMutation(), { wrapper });

      act(() => {
        result.current.mutate({
          supplierId: 'sup-1',
          items: [{ supplierProductId: 'sp-1', orderedQty: 10, expectedCostUnitNet: 100 }],
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: purchaseOrdersKeys.lists() });
      expect(queryClient.getQueryData(purchaseOrdersKeys.detail('po-100'))).toEqual(mockCreated);
    });
  });

  describe('useUpdatePurchaseOrderMutation', () => {
    it('updates draft purchase order and invalidates list and detail cache', async () => {
      const mockUpdated = { id: 'po-100', notes: 'Updated notes' };
      vi.spyOn(api, 'updatePurchaseOrderApi').mockResolvedValueOnce(mockUpdated as any);

      const wrapper = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdatePurchaseOrderMutation(), { wrapper });

      act(() => {
        result.current.mutate({
          id: 'po-100',
          payload: { notes: 'Updated notes' },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: purchaseOrdersKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: purchaseOrdersKeys.detail('po-100') });
    });
  });

  describe('useEmitPurchaseOrderMutation', () => {
    it('emits purchase order and invalidates list and detail cache', async () => {
      const mockEmitted = { id: 'po-100', status: 'EMITIDA' };
      vi.spyOn(api, 'emitPurchaseOrderApi').mockResolvedValueOnce(mockEmitted as any);

      const wrapper = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useEmitPurchaseOrderMutation(), { wrapper });

      act(() => {
        result.current.mutate('po-100');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: purchaseOrdersKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: purchaseOrdersKeys.detail('po-100') });
    });
  });

  describe('useCancelPurchaseOrderMutation', () => {
    it('cancels purchase order and invalidates list and detail cache', async () => {
      const mockCancelled = { id: 'po-100', status: 'CANCELADA' };
      vi.spyOn(api, 'cancelPurchaseOrderApi').mockResolvedValueOnce(mockCancelled as any);

      const wrapper = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCancelPurchaseOrderMutation(), { wrapper });

      act(() => {
        result.current.mutate({ id: 'po-100', payload: { cancelReason: 'Error' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: purchaseOrdersKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: purchaseOrdersKeys.detail('po-100') });
    });
  });
});
