import type { ISaleSearchParams } from '@erp/shared-types';

export const salesKeys = {
  all: ['sales'] as const,
  lists: () => [...salesKeys.all, 'list'] as const,
  list: (params: ISaleSearchParams) => [...salesKeys.lists(), params] as const,
  details: () => [...salesKeys.all, 'detail'] as const,
  detail: (id: string) => [...salesKeys.details(), id] as const,
};
