import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadStockTemplateApi } from './stock.api';
import { apiClient } from '@/services/api.client';

vi.mock('@/services/api.client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('stock.api downloadStockTemplateApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads blob template successfully', async () => {
    const mockBlob = new Blob(['sample data'], { type: 'text/csv' });
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBlob });

    const result = await downloadStockTemplateApi('csv');
    expect(result).toBe(mockBlob);
    expect(apiClient.get).toHaveBeenCalledWith('/stock/bulk-load/template', {
      params: { format: 'csv' },
      responseType: 'blob',
    });
  });

  it('decodes Blob error JSON when download fails with Blob response', async () => {
    const errorJson = {
      code: 'BULK_LOAD_TEMPLATE_ROW_LIMIT_EXCEEDED',
      message: 'Catalog limit exceeded',
    };
    const errorBlob = new Blob([JSON.stringify(errorJson)], {
      type: 'application/json',
    });

    const axiosError = {
      response: {
        status: 422,
        data: errorBlob,
      },
    };

    vi.mocked(apiClient.get).mockRejectedValueOnce(axiosError);

    try {
      await downloadStockTemplateApi('xlsx');
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err.response.data).toEqual(errorJson);
    }
  });
});
