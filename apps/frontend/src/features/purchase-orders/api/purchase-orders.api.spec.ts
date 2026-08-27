import { apiClient } from '@/services/api.client';
import {
  getPurchaseOrdersApi,
  getPurchaseOrderByIdApi,
  createPurchaseOrderApi,
  updatePurchaseOrderApi,
  emitPurchaseOrderApi,
  cancelPurchaseOrderApi,
  createGoodsReceiptApi,
  getGoodsReceiptsByPurchaseOrderApi,
  getBackordersApi,
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

  describe('goods receipts endpoints', () => {
    it('posts a receipt against the selected purchase order', async () => {
      const response = { receipt: { id: 'receipt-1' }, resultingPurchaseOrder: { id: 'po-123' } };
      (apiClient.post as any).mockResolvedValueOnce({ data: response });
      const payload = {
        deliveryNoteNumber: '0001-00001234',
        items: [{ purchaseOrderItemId: 'item-1', receivedQtyPurchaseUnit: 2 }],
      };

      await expect(createGoodsReceiptApi('po-123', payload)).resolves.toEqual(response);
      expect(apiClient.post).toHaveBeenCalledWith('/purchase-orders/po-123/receipts', payload);
    });

    it('gets paginated receipt history and forwards AbortSignal', async () => {
      const response = { data: [], meta: { total: 0 } };
      const controller = new AbortController();
      (apiClient.get as any).mockResolvedValueOnce({ data: response });

      await expect(
        getGoodsReceiptsByPurchaseOrderApi(
          'po-123',
          { page: 2, limit: 10 },
          { signal: controller.signal },
        ),
      ).resolves.toEqual(response);
      expect(apiClient.get).toHaveBeenCalledWith('/purchase-orders/po-123/receipts', {
        params: { page: 2, limit: 10 },
        signal: controller.signal,
      });
    });
  });

  describe('getBackordersApi', () => {
    it('sends only normalized active filters and forwards AbortSignal', async () => {
      const response = { generatedAt: '2026-08-27T15:00:00.000Z', summary: {}, groups: [] };
      const controller = new AbortController();
      (apiClient.get as any).mockResolvedValueOnce({ data: response });

      await expect(
        getBackordersApi(
          {
            search: '  gasa  ',
            supplierId: 'supplier-uuid',
            urgentOnly: true,
          },
          { signal: controller.signal },
        ),
      ).resolves.toEqual(response);

      expect(apiClient.get).toHaveBeenCalledWith('/purchase-orders/pending', {
        params: {
          search: 'gasa',
          supplierId: 'supplier-uuid',
          urgentOnly: true,
        },
        signal: controller.signal,
      });
    });

    it('omits empty and false filters', async () => {
      (apiClient.get as any).mockResolvedValueOnce({ data: { groups: [] } });

      await getBackordersApi({ search: ' ', urgentOnly: false });

      expect(apiClient.get).toHaveBeenCalledWith('/purchase-orders/pending', {
        params: {},
        signal: undefined,
      });
    });
  });
});
