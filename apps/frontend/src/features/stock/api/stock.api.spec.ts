import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/services/api.client';
import { getStockOverviewApi, getProductMovementsApi, getStockEvolutionApi } from './stock.api';
import { StockMovementType, StockStatus } from '../types/stock.types';

vi.mock('@/services/api.client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('Stock API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStockOverviewApi', () => {
    it('sends correct query parameters including category and search', async () => {
      const mockResponse = { data: { items: [], meta: { total: 0 } } };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const params = {
        page: 2,
        limit: 25,
        search: ' Paracetamol ',
        category: 'cat-123',
        stockStatus: StockStatus.CRITICAL,
      };

      const result = await getStockOverviewApi(params);

      expect(apiClient.get).toHaveBeenCalledWith('/stock', {
        params: {
          page: 2,
          limit: 25,
          search: 'Paracetamol',
          categoryId: 'cat-123',
          stockStatus: StockStatus.CRITICAL,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('ignores ALL category and stockStatus filters', async () => {
      const mockResponse = { data: { items: [], meta: { total: 0 } } };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      await getStockOverviewApi({
        page: 1,
        limit: 10,
        category: 'ALL',
        stockStatus: 'ALL' as any,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/stock', {
        params: {
          page: 1,
          limit: 10,
        },
      });
    });
  });

  describe('getProductMovementsApi', () => {
    it('requests movements with correct path and parameters', async () => {
      const mockResponse = { data: { product: {}, items: [], meta: {} } };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await getProductMovementsApi('prod-1', {
        page: 1,
        limit: 10,
        movementType: StockMovementType.ENTRADA_COMPRA,
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T23:59:59.999Z',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/stock/prod-1/movements', {
        params: {
          page: 1,
          limit: 10,
          movementType: StockMovementType.ENTRADA_COMPRA,
          from: '2026-08-01T00:00:00.000Z',
          to: '2026-08-31T23:59:59.999Z',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getStockEvolutionApi', () => {
    it('requests evolution points with bounds', async () => {
      const mockResponse = { data: { productId: 'prod-1', points: [] } };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await getStockEvolutionApi('prod-1', {
        limit: 50,
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T23:59:59.999Z',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/stock/prod-1/evolution', {
        params: {
          limit: 50,
          from: '2026-08-01T00:00:00.000Z',
          to: '2026-08-31T23:59:59.999Z',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
});
