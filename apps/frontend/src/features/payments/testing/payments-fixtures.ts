import {
  PaymentMethod,
  PaymentStatus,
  type IReceiptDetail,
  type IRegisterPaymentResponse,
} from '@erp/shared-types';

export const RECEIPT_ID = '20000000-0000-4000-8000-000000000001';

export function buildReceipt(overrides: Partial<IReceiptDetail> = {}): IReceiptDetail {
  return {
    id: RECEIPT_ID,
    receiptNumber: '0001-00000050',
    paymentId: 'p-1',
    createdAt: '2026-08-14T15:00:00.000Z',
    customerId: '10000000-0000-4000-8000-000000000001',
    customerName: 'Farmacia Central',
    customerDocument: '30500010912',
    paymentMethod: PaymentMethod.EFECTIVO,
    paymentStatus: PaymentStatus.REGISTRADO,
    check: null,
    notes: null,
    totalAmount: '250.00',
    applied: [
      {
        accountReceivableId: 'ar-1',
        documentReference: 'V-00000001',
        invoiceDate: '2026-06-10T15:00:00.000Z',
        originalAmount: '150.00',
        amountApplied: '150.00',
      },
      {
        accountReceivableId: 'ar-2',
        documentReference: 'V-00000002',
        invoiceDate: '2026-07-05T15:00:00.000Z',
        originalAmount: '200.00',
        amountApplied: '100.00',
      },
    ],
    ...overrides,
  };
}

export function buildRegisterResponse(): IRegisterPaymentResponse {
  return {
    payment: {
      id: 'p-1',
      customerId: '10000000-0000-4000-8000-000000000001',
      totalAmount: '250.00',
      paymentMethod: PaymentMethod.EFECTIVO,
      status: PaymentStatus.REGISTRADO,
      userId: 'u-1',
      createdAt: '2026-08-14T15:00:00.000Z',
    },
    receipt: {
      id: RECEIPT_ID,
      receiptNumber: '0001-00000050',
      paymentId: 'p-1',
      customerId: '10000000-0000-4000-8000-000000000001',
      totalAmount: '250.00',
      userId: 'u-1',
      createdAt: '2026-08-14T15:00:00.000Z',
    },
  };
}
