import { apiClient } from '@/services/api.client';
import {
  getPurchaseOrdersApi,
  getPurchaseOrderByIdApi,
  createPurchaseOrderApi,
  updatePurchaseOrderApi,
  emitPurchaseOrderApi,
  cancelPurchaseOrderApi,
} from './purchase-orders.api';
import { PurchaseOrderStatus } from '../types/purchase-orders.types';

vi.mock('@/services/api.client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Purchase Orders API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPurchaseOrdersApi', () => {
    it('sends correct query parameters to /purchase-orders', async () => {
      const mockResponse = { data: { data: [], meta: { total: 0 } } };
      (apiClient.get as any).mockResolvedValueOnce(mockResponse);

      const params = {
        page: 2,
        limit: 20,
        search: 'OC-001',
        supplierId: 'supplier-uuid',
        status: PurchaseOrderStatus.BORRADOR,
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      };

      const result = await getPurchaseOrdersApi(params);

      expect(apiClient.get).toHaveBeenCalledWith('/purchase-orders', {
        params: {
          page: 2,
          limit: 20,
          search: 'OC-001',
          supplierId: 'supplier-uuid',
          status: PurchaseOrderStatus.BORRADOR,
          dateFrom: '2026-08-01',
          dateTo: '2026-08-31',
        },
        signal: undefined,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getPurchaseOrderByIdApi', () => {
    it('fetches purchase order detail by ID', async () => {
      const mockPO = { id: 'po-123', orderNumber: 'OC-000001' };
      (apiClient.get as any).mockResolvedValueOnce({ data: mockPO });

      const result = await getPurchaseOrderByIdApi('po-123');

      expect(apiClient.get).toHaveBeenCalledWith('/purchase-orders/po-123', {
        signal: undefined,
      });
      expect(result).toEqual(mockPO);
    });
  });

  describe('createPurchaseOrderApi', () => {
    it('posts create payload to /purchase-orders', async () => {
      const mockCreated = { id: 'po-123', orderNumber: 'OC-000001' };
      (apiClient.post as any).mockResolvedValueOnce({ data: mockCreated });

      const payload = {
        supplierId: 'supplier-123',
        items: [{ supplierProductId: 'sp-1', orderedQty: 10, expectedCostUnitNet: 50 }],
      };

      const result = await createPurchaseOrderApi(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/purchase-orders', payload);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('updatePurchaseOrderApi', () => {
    it('patches draft purchase order', async () => {
      const mockUpdated = { id: 'po-123', notes: 'Updated notes' };
      (apiClient.patch as any).mockResolvedValueOnce({ data: mockUpdated });

      const payload = { notes: 'Updated notes' };
      const result = await updatePurchaseOrderApi('po-123', payload);

      expect(apiClient.patch).toHaveBeenCalledWith('/purchase-orders/po-123', payload);
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('emitPurchaseOrderApi', () => {
    it('calls emit endpoint', async () => {
      const mockEmitted = { id: 'po-123', status: PurchaseOrderStatus.EMITIDA };
      (apiClient.patch as any).mockResolvedValueOnce({ data: mockEmitted });

      const result = await emitPurchaseOrderApi('po-123');

      expect(apiClient.patch).toHaveBeenCalledWith('/purchase-orders/po-123/emit');
      expect(result).toEqual(mockEmitted);
    });
  });

  describe('cancelPurchaseOrderApi', () => {
    it('calls cancel endpoint with cancelReason', async () => {
      const mockCancelled = { id: 'po-123', status: PurchaseOrderStatus.CANCELADA };
      (apiClient.patch as any).mockResolvedValueOnce({ data: mockCancelled });

      const result = await cancelPurchaseOrderApi('po-123', { cancelReason: 'Error de compra' });

      expect(apiClient.patch).toHaveBeenCalledWith('/purchase-orders/po-123/cancel', {
        cancelReason: 'Error de compra',
      });
      expect(result).toEqual(mockCancelled);
    });
  });
});
