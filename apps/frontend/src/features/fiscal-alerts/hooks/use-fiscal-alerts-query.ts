import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getFiscalAlertsApi, getFiscalAlertsCountApi } from '../api/fiscal-alerts.api';
import type { IFiscalAlertsSearchParams } from '../types/fiscal-alerts.types';
import { fiscalAlertsKeys } from './fiscal-alerts-keys';

export function useFiscalAlertsQuery(params: IFiscalAlertsSearchParams) {
  return useQuery({
    queryKey: fiscalAlertsKeys.list(params),
    queryFn: () => getFiscalAlertsApi(params),
    placeholderData: keepPreviousData,
  });
}

export function useFiscalAlertsCountQuery(enabled = true) {
  return useQuery({
    queryKey: fiscalAlertsKeys.count(),
    queryFn: () => getFiscalAlertsCountApi(),
    enabled,
    select: (data) => data.total,
    staleTime: 60_000,
  });
}
