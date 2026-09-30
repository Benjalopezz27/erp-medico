import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { PaymentAllocationType, PaymentMethod } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { downloadReceiptPdfApi, getReceiptApi, registerPaymentApi } from './payments.api';
import { RECEIPT_ID, buildReceipt, buildRegisterResponse } from '../testing/payments-fixtures';

describe('payments API', () => {
  it('posts the payment payload as-is', async () => {
    const payload = {
      customerId: 'c-1',
      paymentMethod: PaymentMethod.EFECTIVO as const,
      mode: PaymentAllocationType.GLOBAL_AGE as const,
      totalAmount: '250.00',
    };
    server.use(
      http.post('*/api/v1/payments', async ({ request }) => {
        expect(await request.json()).toEqual(payload);
        return HttpResponse.json(buildRegisterResponse(), { status: 201 });
      }),
    );
    const res = await registerPaymentApi(payload);
    expect(res.receipt.receiptNumber).toBe('0001-00000050');
  });

  it('gets the receipt detail', async () => {
    server.use(
      http.get(`*/api/v1/receipts/${RECEIPT_ID}`, () => HttpResponse.json(buildReceipt())),
    );
    expect((await getReceiptApi(RECEIPT_ID)).applied).toHaveLength(2);
  });

  it('downloads the receipt as a blob', async () => {
    server.use(
      http.get(
        `*/api/v1/receipts/${RECEIPT_ID}/pdf`,
        () => new HttpResponse('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } }),
      ),
    );
    expect((await downloadReceiptPdfApi(RECEIPT_ID)).size).toBeGreaterThan(0);
  });
});
