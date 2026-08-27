import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { SupplierInvoiceErrorCode } from '../types/supplier-invoices.types';
import { parseSupplierInvoiceError } from './supplier-invoices.errors';

vi.mock('axios', () => ({ default: { isAxiosError: vi.fn(() => true) } }));

describe('parseSupplierInvoiceError decisions', () => {
  it.each([
    [SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_STATUS, 'DECISION_CONFLICT'],
    [SupplierInvoiceErrorCode.SUPPLIER_INVOICE_DECISION_CONFLICT, 'DECISION_CONFLICT'],
    [SupplierInvoiceErrorCode.SUPPLIER_INVOICE_CONCURRENCY_CONFLICT, 'CONCURRENCY'],
    [SupplierInvoiceErrorCode.SUPPLIER_INVOICE_REJECTION_REASON_INVALID, 'REJECTION_REASON'],
    [SupplierInvoiceErrorCode.SUPPLIER_INVOICE_NOT_FOUND, 'NOT_FOUND'],
  ])('maps %s to %s', (code, kind) => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    expect(
      parseSupplierInvoiceError({ response: { data: { code, requestId: 'req-1' } } }),
    ).toMatchObject({ kind, code, requestId: 'req-1' });
  });
});
