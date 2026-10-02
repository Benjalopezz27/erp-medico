import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useProductBulkPreviewMutation,
  useProductBulkConfirmMutation,
} from './use-product-bulk-load';
import * as productBulkApi from '../api/product-bulk-load.api';
import { productKeys } from './use-products-query';

vi.mock('../api/product-bulk-load.api', () => ({
  postProductBulkPreviewApi: vi.fn(),
  postProductBulkConfirmApi: vi.fn(),
  downloadProductTemplateApi: vi.fn(),
}));

describe('use-product-bulk-load Hooks', () => {
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

  describe('useProductBulkPreviewMutation', () => {
    it('calls postProductBulkPreviewApi and returns validation preview data', async () => {
      const mockFile = new File(['name,category,baseUnit\nProd1,Cat1,cmp\n'], 'productos.csv', {
        type: 'text/csv',
      });
      const mockPreviewRes = {
        fileChecksum: 'file-checksum-123',
        contentChecksum: 'content-checksum-123',
        valid: true,
        summary: { totalRows: 1, validRows: 1, invalidRows: 0, totalInitialStock: 0 },
        rows: [],
      };

      vi.mocked(productBulkApi.postProductBulkPreviewApi).mockResolvedValueOnce(
        mockPreviewRes as any,
      );

      const { result } = renderHook(() => useProductBulkPreviewMutation(), { wrapper });

      result.current.mutate(mockFile);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(productBulkApi.postProductBulkPreviewApi).toHaveBeenCalledWith(mockFile);
      expect(result.current.data).toEqual(mockPreviewRes);
    });
  });

  describe('useProductBulkConfirmMutation', () => {
    it('calls postProductBulkConfirmApi and invalidates products and stock queries on success', async () => {
      const mockFile = new File(['test'], 'productos.csv', { type: 'text/csv' });
      const mockConfirmRes = {
        batchId: 'batch-uuid-1',
        fileChecksum: 'file-checksum-123',
        contentChecksum: 'content-checksum-123',
        rowCount: 1,
        movementCount: 1,
        totalQuantityBase: 10,
        confirmedAt: '2026-10-02T12:00:00.000Z',
      };

      vi.mocked(productBulkApi.postProductBulkConfirmApi).mockResolvedValueOnce(
        mockConfirmRes as any,
      );
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useProductBulkConfirmMutation(), { wrapper });

      result.current.mutate({
        file: mockFile,
        previewFileChecksum: 'file-checksum-123',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(productBulkApi.postProductBulkConfirmApi).toHaveBeenCalledWith(
        mockFile,
        'file-checksum-123',
      );
      expect(result.current.data).toEqual(mockConfirmRes);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: productKeys.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['stock'] });
    });
  });
});
