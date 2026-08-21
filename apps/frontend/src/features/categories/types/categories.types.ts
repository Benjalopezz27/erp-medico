import type { ICategory } from '@erp/shared-types';

export type { ICategory };

export interface CreateCategoryPayload {
  name: string;
  description?: string | null;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string | null;
}
