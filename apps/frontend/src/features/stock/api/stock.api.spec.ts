import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStockOverviewApi, postStockAdjustmentApi } from './stock.api';
import { apiClient } from '@/services/api.client';
import { StockMovementType } from '@erp/shared-types';

vi.mock('@/services/api.client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('stock.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches stock overview with query parameters', async () => {
    const mockData = { items: [], meta: { total: 0 } };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

    const result = await getStockOverviewApi({ page: 1, limit: 10, search: 'Paracetamol' });

    expect(result).toBe(mockData);
    expect(apiClient.get).toHaveBeenCalledWith('/stock', {
      params: { page: 1, limit: 10, search: 'Paracetamol' },
    });
  });

  it('submits manual stock adjustment', async () => {
    const mockMovement = { id: 'mov-1' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockMovement });

    const dto = {
      productId: 'prod-1',
      movementType: StockMovementType.AJUSTE_ENTRADA as const,
      quantityBase: 10,
      reason: 'Ajuste inicial',
      documentReference: 'DOC-001',
    };

    const result = await postStockAdjustmentApi(dto);

    expect(result).toBe(mockMovement);
    expect(apiClient.post).toHaveBeenCalledWith('/stock/adjustments', dto);
  });
});
