import type { CheckSearchParams } from '../api/checks.api';

export const checksKeys = {
  all: ['checks'] as const,
  list: (params: CheckSearchParams) => [...checksKeys.all, 'list', params] as const,
  detail: (id: string) => [...checksKeys.all, 'detail', id] as const,
};
