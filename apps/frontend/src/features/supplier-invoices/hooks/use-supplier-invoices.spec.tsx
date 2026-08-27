import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api/supplier-invoices.api';
import { supplierInvoicesKeys } from './supplier-invoices-keys';
import { useCreateSupplierInvoiceMutation } from './use-supplier-invoices';

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
});
