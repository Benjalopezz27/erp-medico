import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStockBulkPreviewMutation, useStockBulkConfirmMutation } from './use-stock-bulk-load';
import * as stockApi from '../api/stock.api';
import { stockKeys } from './stock-keys';

vi.mock('../api/stock.api', () => ({
  postStockBulkPreviewApi: vi.fn(),
  postStockBulkConfirmApi: vi.fn(),
  downloadStockTemplateApi: vi.fn(),
}));

describe('use-stock-bulk-load Hooks', () => {
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

  describe('useStockBulkPreviewMutation', () => {
    it('calls postStockBulkPreviewApi and returns validation preview data', async () => {
      const mockFile = new File(['internalCode,quantityBase\nP0001,10\n'], 'carga.csv', {
        type: 'text/csv',
      });
      const mockPreviewRes = {
        fileChecksum: 'file-checksum-123',
        contentChecksum: 'content-checksum-123',
        valid: true,
        summary: { totalRows: 1, validRows: 1, invalidRows: 0, totalQuantityBase: 10 },
        rows: [],
      };

      vi.mocked(stockApi.postStockBulkPreviewApi).mockResolvedValueOnce(mockPreviewRes as any);

      const { result } = renderHook(() => useStockBulkPreviewMutation(), { wrapper });

      result.current.mutate(mockFile);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(stockApi.postStockBulkPreviewApi).toHaveBeenCalledWith(mockFile);
      expect(result.current.data).toEqual(mockPreviewRes);
    });
  });

  describe('useStockBulkConfirmMutation', () => {
    it('calls postStockBulkConfirmApi and invalidates stock and product queries on success', async () => {
      const mockFile = new File(['test'], 'carga.csv', { type: 'text/csv' });
      const mockConfirmRes = {
        batchId: 'batch-uuid-1',
        fileChecksum: 'file-checksum-123',
        contentChecksum: 'content-checksum-123',
        rowCount: 1,
        movementCount: 1,
        totalQuantityBase: 10,
        confirmedAt: '2026-08-24T12:00:00.000Z',
      };

      vi.mocked(stockApi.postStockBulkConfirmApi).mockResolvedValueOnce(mockConfirmRes as any);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useStockBulkConfirmMutation(), { wrapper });

      result.current.mutate({
        file: mockFile,
        previewFileChecksum: 'file-checksum-123',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(stockApi.postStockBulkConfirmApi).toHaveBeenCalledWith(mockFile, 'file-checksum-123');
      expect(result.current.data).toEqual(mockConfirmRes);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: stockKeys.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['products', 'search'] });
    });
  });
});
