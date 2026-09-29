import { DebtorStatus } from '@erp/shared-types';
import type { DebtorSearchParams } from '../api/receivables.api';

export function validateReceivablesSearchParams(
  search: Record<string, unknown>,
): DebtorSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);
  const text = typeof search.search === 'string' ? search.search.trim() : '';
  const status = Object.values(DebtorStatus).includes(search.status as DebtorStatus)
    ? (search.status as DebtorStatus)
    : undefined;
  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: [10, 20, 50, 100].includes(limit) ? limit : 20,
    search: text ? text.slice(0, 100) : undefined,
    status,
  };
}
