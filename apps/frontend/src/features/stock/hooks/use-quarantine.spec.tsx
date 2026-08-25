import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useQuarantineListQuery,
  useCreateQuarantineMutation,
  useResolveQuarantineMutation,
} from './use-quarantine';
import * as quarantineApi from '../api/quarantine.api';
import { quarantineKeys } from './quarantine-keys';
import { stockKeys } from './stock-keys';
import { QuarantineStatus, QuarantineResolution } from '@erp/shared-types';

vi.mock('../api/quarantine.api', () => ({
  getQuarantineListApi: vi.fn(),
  createQuarantineEntryApi: vi.fn(),
  resolveQuarantineApi: vi.fn(),
}));

describe('use-quarantine Hooks', () => {
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

  describe('useQuarantineListQuery', () => {
    it('fetches quarantine entries with query params', async () => {
      const mockResult = {
        items: [{ id: 'q1', status: QuarantineStatus.EN_CUARENTENA }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      };
      vi.mocked(quarantineApi.getQuarantineListApi).mockResolvedValueOnce(mockResult as any);

      const { result } = renderHook(() => useQuarantineListQuery({ page: 1 }), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(quarantineApi.getQuarantineListApi).toHaveBeenCalledWith(
        { page: 1 },
        expect.anything(),
      );
      expect(result.current.data).toEqual(mockResult);
    });
  });

  describe('useCreateQuarantineMutation', () => {
    it('calls createQuarantineEntryApi and invalidates quarantine and stock queries', async () => {
      const payload = { productId: 'p1', quantityBase: 10, reason: 'Dañado' };
      const mockResult = { id: 'q1', ...payload, status: QuarantineStatus.EN_CUARENTENA };

      vi.mocked(quarantineApi.createQuarantineEntryApi).mockResolvedValueOnce(mockResult as any);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateQuarantineMutation(), {
        wrapper,
      });

      result.current.mutate(payload);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(quarantineApi.createQuarantineEntryApi).toHaveBeenCalledWith(payload);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: quarantineKeys.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: stockKeys.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['products', 'search'] });
    });
  });

  describe('useResolveQuarantineMutation', () => {
    it('invalidates stock queries on REINGRESO resolution', async () => {
      const payload = { resolution: QuarantineResolution.REINGRESO, resolutionNotes: 'Apto' };
      const mockResult = { id: 'q1', status: QuarantineStatus.REINGRESADO_STOCK };

      vi.mocked(quarantineApi.resolveQuarantineApi).mockResolvedValueOnce(mockResult as any);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useResolveQuarantineMutation(), {
        wrapper,
      });

      result.current.mutate({ id: 'q1', payload });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(quarantineApi.resolveQuarantineApi).toHaveBeenCalledWith('q1', payload);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: quarantineKeys.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: stockKeys.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['products', 'search'] });
    });

    it('invalidates only quarantine list on MERMA resolution', async () => {
      const payload = { resolution: QuarantineResolution.MERMA, resolutionNotes: 'Vencido' };
      const mockResult = { id: 'q1', status: QuarantineStatus.MERMA_CONFIRMADA };

      vi.mocked(quarantineApi.resolveQuarantineApi).mockResolvedValueOnce(mockResult as any);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useResolveQuarantineMutation(), {
        wrapper,
      });

      result.current.mutate({ id: 'q1', payload });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: quarantineKeys.all });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: stockKeys.all });
    });
  });
});
