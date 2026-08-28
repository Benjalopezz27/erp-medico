import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api.client';
import {
  createSupplierInvoiceApi,
  confirmSupplierInvoiceApi,
  authorizeSupplierInvoiceApi,
  rejectSupplierInvoiceApi,
  getPendingInvoiceReceiptsApi,
  getSupplierInvoiceApi,
  getSupplierInvoicesApi,
} from './supplier-invoices.api';

vi.mock('@/services/api.client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe('supplier invoices API', () => {
  beforeEach(() => vi.clearAllMocks());
  it('serializes list filters and forwards abort signal', async () => {
    const signal = new AbortController().signal;
    (apiClient.get as any).mockResolvedValue({ data: { data: [], meta: {} } });
    await getSupplierInvoicesApi(
      { page: 2, limit: 20, search: '', status: 'OBSERVADA' as any },
      { signal },
    );
    expect(apiClient.get).toHaveBeenCalledWith('/supplier-invoices', {
      params: { page: 2, limit: 20, status: 'OBSERVADA' },
      signal,
    });
  });
  it('loads detail and pending receipts', async () => {
    (apiClient.get as any).mockResolvedValue({ data: {} });
    await getSupplierInvoiceApi('invoice');
    await getPendingInvoiceReceiptsApi({ page: 1, limit: 10, search: 'REC-1' });
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/supplier-invoices/invoice', {
      signal: undefined,
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/supplier-invoices/pending-receipts', {
      params: { page: 1, limit: 10, search: 'REC-1' },
      signal: undefined,
    });
  });
  it('posts decimal strings unchanged', async () => {
    const payload = {
      goodsReceiptId: 'receipt',
      invoiceNumber: 'A-1',
      invoiceDate: '2026-08-27',
      taxTotal: '21.0000',
      items: [
        { goodsReceiptItemId: 'item', invoicedQtyPurchaseUnit: '1.0000', unitPriceNet: '10.0000' },
      ],
    };
    (apiClient.post as any).mockResolvedValue({ data: { id: 'invoice' } });
    await createSupplierInvoiceApi(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/supplier-invoices', payload);
  });

  it('authorizes and rejects through the decision endpoints', async () => {
    (apiClient.patch as any).mockResolvedValue({ data: { id: 'invoice' } });
    await authorizeSupplierInvoiceApi('invoice');
    await rejectSupplierInvoiceApi('invoice', { reason: 'Costo incorrecto' });
    expect(apiClient.patch).toHaveBeenNthCalledWith(1, '/supplier-invoices/invoice/authorize');
    expect(apiClient.patch).toHaveBeenNthCalledWith(2, '/supplier-invoices/invoice/reject', {
      reason: 'Costo incorrecto',
    });
  });

  it('confirms through the idempotent cost adjustment endpoint', async () => {
    (apiClient.patch as any).mockResolvedValue({ data: { id: 'invoice', confirmation: {} } });
    await confirmSupplierInvoiceApi('invoice');
    expect(apiClient.patch).toHaveBeenCalledWith('/supplier-invoices/invoice/confirm');
  });
});
