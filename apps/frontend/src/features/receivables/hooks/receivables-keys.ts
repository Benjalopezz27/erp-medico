import type { DebtorSearchParams } from '../api/receivables.api';

export const receivablesKeys = {
  all: ['receivables'] as const,
  debtors: (params: DebtorSearchParams) => [...receivablesKeys.all, 'debtors', params] as const,
  account: (customerId: string, page: number, limit: number) =>
    [...receivablesKeys.all, 'account', customerId, { page, limit }] as const,
};
