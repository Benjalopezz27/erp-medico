import {
  AccountReceivableStatus,
  CheckStatus,
  type ICheckDetail,
  type ICheckListItem,
  type ICheckListResponse,
} from '@erp/shared-types';

export const CHECK_ID = '30000000-0000-4000-8000-000000000001';

export function buildCheck(overrides: Partial<ICheckListItem> = {}): ICheckListItem {
  return {
    id: CHECK_ID,
    paymentId: 'p-1',
    customerId: '10000000-0000-4000-8000-000000000001',
    customerName: 'Farmacia Central',
    bankName: 'Galicia',
    checkNumber: '12345678',
    drawerName: 'Juan Paz',
    amount: '200.00',
    issueDate: null,
    dueDate: '2026-12-15',
    receivedDate: '2026-09-30',
    status: CheckStatus.EN_CARTERA,
    endorsedToSupplierId: null,
    rejectedAt: null,
    rejectionReason: null,
    updatedAt: '2026-09-30T15:00:00.000Z',
    ...overrides,
  };
}

export function buildCheckList(
  data: ICheckListItem[] = [buildCheck()],
  dueSoonCount = 0,
): ICheckListResponse {
  return {
    data,
    dueSoonCount,
    meta: { page: 1, limit: 20, total: data.length, totalPages: 1 },
  };
}

export function buildCheckDetail(overrides: Partial<ICheckDetail> = {}): ICheckDetail {
  return {
    ...buildCheck(),
    rejectionBlockedReason: null,
    rejectionImpact: {
      totalIncrease: '200.00',
      lines: [
        {
          accountReceivableId: 'ar-1',
          documentReference: 'V-00000001',
          amountToRestore: '150.00',
          resultingBalance: '150.00',
          resultingStatus: AccountReceivableStatus.PENDIENTE,
        },
        {
          accountReceivableId: 'ar-2',
          documentReference: 'V-00000002',
          amountToRestore: '50.00',
          resultingBalance: '200.00',
          resultingStatus: AccountReceivableStatus.PARCIAL,
        },
      ],
    },
    ...overrides,
  };
}
