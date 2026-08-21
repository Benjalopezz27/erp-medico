import type { IUnit } from '@erp/shared-types';

export type { IUnit };

export interface CreateUnitPayload {
  name: string;
  symbol: string;
}

export interface UpdateUnitPayload {
  name?: string;
  symbol?: string;
}
