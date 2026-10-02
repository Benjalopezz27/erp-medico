import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  downloadProductTemplateApi,
  postProductBulkPreviewApi,
  postProductBulkConfirmApi,
} from './product-bulk-load.api';
import { apiClient } from '@/services/api.client';

vi.mock('@/services/api.client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('product-bulk-load.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('downloadProductTemplateApi', () => {
    it('downloads blob template successfully', async () => {
      const mockBlob = new Blob(['name,category,baseUnit\n'], { type: 'text/csv' });
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBlob });

      const result = await downloadProductTemplateApi('csv');
      expect(result).toBe(mockBlob);
      expect(apiClient.get).toHaveBeenCalledWith('/products/bulk-load/template', {
        params: { format: 'csv' },
        responseType: 'blob',
      });
    });

    it('decodes Blob error JSON when download fails with Blob response', async () => {
      const errorJson = {
        code: 'BULK_LOAD_INVALID_FILE',
        message: 'Invalid template request',
      };
      const errorBlob = new Blob([JSON.stringify(errorJson)], {
        type: 'application/json',
      });

      const axiosError = {
        response: {
          status: 400,
          data: errorBlob,
        },
      };

      vi.mocked(apiClient.get).mockRejectedValueOnce(axiosError);

      try {
        await downloadProductTemplateApi('xlsx');
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err.response.data).toEqual(errorJson);
      }
    });
  });

  describe('postProductBulkPreviewApi', () => {
    it('sends file via multipart/form-data to preview endpoint', async () => {
      const mockFile = new File(['content'], 'test.csv', { type: 'text/csv' });
      const mockResponse = {
        fileChecksum: 'chk-1',
        contentChecksum: 'chk-2',
        valid: true,
        summary: { totalRows: 1, validRows: 1, invalidRows: 0, totalInitialStock: 5 },
        rows: [],
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await postProductBulkPreviewApi(mockFile);

      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/products/bulk-load/preview',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
    });
  });

  describe('postProductBulkConfirmApi', () => {
    it('sends file and preview checksum to confirm endpoint', async () => {
      const mockFile = new File(['content'], 'test.csv', { type: 'text/csv' });
      const mockResponse = {
        batchId: 'batch-123',
        fileChecksum: 'chk-1',
        contentChecksum: 'chk-2',
        rowCount: 1,
        movementCount: 1,
        totalQuantityBase: 10,
        confirmedAt: '2026-10-02T12:00:00.000Z',
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await postProductBulkConfirmApi(mockFile, 'chk-1');

      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/products/bulk-load/confirm',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
    });
  });
});
