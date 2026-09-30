import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { PaymentAllocationType, PaymentMethod } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { receivablesKeys } from '@/features/receivables/hooks/receivables-keys';
import { useReceiptQuery, useRegisterPaymentMutation } from './use-payments';
import { RECEIPT_ID, buildReceipt, buildRegisterResponse } from '../testing/payments-fixtures';

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('payments hooks', () => {
  it('invalidates the receivables cache after registering a payment', async () => {
    server.use(
      http.post('*/api/v1/payments', () =>
        HttpResponse.json(buildRegisterResponse(), { status: 201 }),
      ),
    );
    const { client, wrapper } = setup();
    client.setQueryData(receivablesKeys.account('c-1', 1, 25), { stale: true });
    const { result } = renderHook(() => useRegisterPaymentMutation(), { wrapper });

    result.current.mutate({
      customerId: 'c-1',
      paymentMethod: PaymentMethod.EFECTIVO,
      mode: PaymentAllocationType.GLOBAL_AGE,
      totalAmount: '250.00',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryState(receivablesKeys.account('c-1', 1, 25))?.isInvalidated).toBe(true);
  });

  it('loads a receipt', async () => {
    server.use(
      http.get(`*/api/v1/receipts/${RECEIPT_ID}`, () => HttpResponse.json(buildReceipt())),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useReceiptQuery(RECEIPT_ID), { wrapper });
    await waitFor(() => expect(result.current.data?.receiptNumber).toBe('0001-00000050'));
  });
});
