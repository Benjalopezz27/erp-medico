import type { IQuarantineSearchParams } from '../types/quarantine.types';

export const quarantineKeys = {
  all: ['quarantine'] as const,
  lists: () => [...quarantineKeys.all, 'list'] as const,
  list: (params?: IQuarantineSearchParams) => [...quarantineKeys.lists(), params] as const,
  details: () => [...quarantineKeys.all, 'detail'] as const,
  detail: (id: string) => [...quarantineKeys.details(), id] as const,
};
