import type { IFiscalAlertsSearchParams } from '../types/fiscal-alerts.types';

export const fiscalAlertsKeys = {
  all: ['fiscal-alerts'] as const,
  lists: () => [...fiscalAlertsKeys.all, 'list'] as const,
  list: (params: IFiscalAlertsSearchParams) => [...fiscalAlertsKeys.lists(), params] as const,
  count: () => [...fiscalAlertsKeys.all, 'count'] as const,
};
