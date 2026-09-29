import {
  AccountReceivableMovementType,
  AccountReceivableStatus,
  DebtorStatus,
  type ICustomerAccountResponse,
  type IReceivableDebtorRow,
  type IReceivableDebtorsResponse,
} from '@erp/shared-types';

export const CUSTOMER_ID = '10000000-0000-4000-8000-000000000001';

export function buildAccountResponse(
  overrides: Partial<ICustomerAccountResponse> = {},
): ICustomerAccountResponse {
  return {
    summary: {
      customerId: CUSTOMER_ID,
      customerName: 'Farmacia Central',
      customerDocument: '30500010912',
      totalBalance: '484.00',
      pendingCount: 1,
      partialCount: 2,
      creditLimit: '2500.00',
      exceedsCreditLimit: false,
      aging: { days0to30: '121.00', days31to60: '121.00', days61plus: '242.00' },
    },
    pendingInvoices: [
      {
        id: 'ar-1',
        customerId: CUSTOMER_ID,
        documentReference: 'V-00000001',
        originalAmount: '121.00',
        currentBalance: '121.00',
        status: AccountReceivableStatus.PENDIENTE,
        createdAt: '2026-09-18T12:00:00.000Z',
        updatedAt: '2026-09-18T12:00:00.000Z',
      },
    ],
    ledger: {
      data: [
        {
          id: 'm-1',
          createdAt: '2026-09-18T12:00:00.000Z',
          movementType: AccountReceivableMovementType.FACTURA,
          documentReference: 'V-00000001',
          signedAmount: '121.00',
          runningBalance: '121.00',
        },
        {
          id: 'm-2',
          createdAt: '2026-09-19T12:00:00.000Z',
          movementType: AccountReceivableMovementType.NOTA_CREDITO,
          documentReference: 'V-00000001',
          signedAmount: '-121.00',
          runningBalance: '0.00',
        },
      ],
      meta: { page: 1, limit: 25, total: 2, totalPages: 1 },
    },
    ...overrides,
  };
}

export function buildDebtorRow(
  overrides: Partial<IReceivableDebtorRow> = {},
): IReceivableDebtorRow {
  return {
    customerId: CUSTOMER_ID,
    customerName: 'Farmacia Central',
    customerDocument: '30500010912',
    pendingCount: 2,
    totalBalance: '363.00',
    oldestDebtDate: '2026-08-10T12:00:00.000Z',
    aging: { days0to30: '0.00', days31to60: '363.00', days61plus: '0.00' },
    status: DebtorStatus.MOROSO,
    ...overrides,
  };
}

export function buildDebtorsResponse(
  rows: IReceivableDebtorRow[] = [buildDebtorRow()],
): IReceivableDebtorsResponse {
  return {
    data: rows,
    meta: { page: 1, limit: 20, total: rows.length, totalPages: rows.length ? 1 : 0 },
  };
}
