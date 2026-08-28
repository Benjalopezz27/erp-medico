import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api/supplier-invoices.api';
import { supplierInvoicesKeys } from './supplier-invoices-keys';
import {
  useAuthorizeSupplierInvoiceMutation,
  useCreateSupplierInvoiceMutation,
  useRejectSupplierInvoiceMutation,
  useConfirmSupplierInvoiceMutation,
} from './use-supplier-invoices';
import { productKeys } from '@/features/products/hooks/use-products-query';
import { stockKeys } from '@/features/stock/hooks/stock-keys';
import { priceReviewKeys } from '@/features/price-reviews/hooks/price-review-keys';

vi.mock('../api/supplier-invoices.api');

describe('supplier invoice hooks', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });
  it('stores created detail and invalidates lists and pending receipts', async () => {
    const invoice = { id: 'invoice-1' } as any;
    vi.mocked(api.createSupplierInvoiceApi).mockResolvedValue(invoice);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateSupplierInvoiceMutation(), { wrapper });
    act(() =>
      result.current.mutate({
        goodsReceiptId: 'receipt',
        invoiceNumber: 'A-1',
        invoiceDate: '2026-08-27',
        taxTotal: '0.0000',
        items: [],
      }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(supplierInvoicesKeys.detail('invoice-1'))).toEqual(invoice);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: supplierInvoicesKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: supplierInvoicesKeys.pendingReceipts() });
  });

  it.each([
    ['authorize', useAuthorizeSupplierInvoiceMutation],
    ['reject', useRejectSupplierInvoiceMutation],
  ] as const)('updates detail and invalidates derived data after %s', async (action, useHook) => {
    const invoice = { id: 'invoice-1', status: action } as any;
    if (action === 'authorize')
      vi.mocked(api.authorizeSupplierInvoiceApi).mockResolvedValue(invoice);
    else vi.mocked(api.rejectSupplierInvoiceApi).mockResolvedValue(invoice);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useHook(), { wrapper });
    act(() => {
      if (action === 'authorize') (result.current.mutate as any)('invoice-1');
      else
        (result.current.mutate as any)({
          id: 'invoice-1',
          payload: { reason: 'Costo incorrecto' },
        });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(supplierInvoicesKeys.detail('invoice-1'))).toEqual(invoice);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: supplierInvoicesKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: supplierInvoicesKeys.pendingReceipts(),
    });
  });

  it('stores confirmed detail and invalidates every affected read model', async () => {
    const invoice = { id: 'invoice-1', status: 'CONFIRMADA', confirmation: {} } as any;
    vi.mocked(api.confirmSupplierInvoiceApi).mockResolvedValue(invoice);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useConfirmSupplierInvoiceMutation(), { wrapper });

    act(() => result.current.mutate('invoice-1'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData(supplierInvoicesKeys.detail('invoice-1'))).toEqual(invoice);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: supplierInvoicesKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: productKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: priceReviewKeys.all });
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: supplierInvoicesKeys.pendingReceipts(),
    });
  });
});
