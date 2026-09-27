import { apiClient } from '@/services/api.client';
import type {
  IFiscalAlertsCount,
  IFiscalAlertsSearchParams,
  IFiscalRetryResult,
  IPaginatedFiscalAlertsResponse,
} from '../types/fiscal-alerts.types';

export async function getFiscalAlertsApi(
  params: IFiscalAlertsSearchParams,
): Promise<IPaginatedFiscalAlertsResponse> {
  return (
    await apiClient.get<IPaginatedFiscalAlertsResponse>('/sales/pending-fiscal', {
      params: {
        status: params.tab,
        page: params.page,
        limit: params.limit,
        ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
        ...(params.dateTo ? { dateTo: params.dateTo } : {}),
        ...(params.documentType ? { documentType: params.documentType } : {}),
        ...(params.search ? { search: params.search } : {}),
      },
    })
  ).data;
}

export async function getFiscalAlertsCountApi(): Promise<IFiscalAlertsCount> {
  return (await apiClient.get<IFiscalAlertsCount>('/sales/pending-fiscal/count')).data;
}

export async function retryFiscalDocumentApi(
  fiscalDocumentId: string,
  idempotencyKey: string,
): Promise<IFiscalRetryResult> {
  return (
    await apiClient.post<IFiscalRetryResult>(
      `/sales/pending-fiscal/${fiscalDocumentId}/retry`,
      {},
      { headers: { 'Idempotency-Key': idempotencyKey } },
    )
  ).data;
}
