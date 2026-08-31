import type {
  ICreateSalePayload,
  ICreateSaleReturnPayload,
  IPaginatedSalesResponse,
  ISale,
  ISaleReturn,
  ISaleSearchParams,
} from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

function dayBoundaryToIso(value: string, endOfDay: boolean) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return date.toISOString();
}

export async function getSalesApi(params: ISaleSearchParams): Promise<IPaginatedSalesResponse> {
  return (
    await apiClient.get<IPaginatedSalesResponse>('/sales', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...(params.from ? { from: dayBoundaryToIso(params.from, false) } : {}),
        ...(params.to ? { to: dayBoundaryToIso(params.to, true) } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    })
  ).data;
}

export async function getSaleByIdApi(id: string): Promise<ISale> {
  return (await apiClient.get<ISale>(`/sales/${id}`)).data;
}

export async function createSaleApi(payload: ICreateSalePayload): Promise<ISale> {
  const body: ICreateSalePayload = {
    customerId: payload.customerId || null,
    isCreditSale: payload.isCreditSale,
    requiresFiscalInvoice: payload.requiresFiscalInvoice,
    paymentMethod: payload.paymentMethod,
    items: payload.items.map(({ productId, quantityBase }) => ({ productId, quantityBase })),
  };
  return (await apiClient.post<ISale>('/sales', body)).data;
}

export async function getSaleReturnsApi(saleId: string): Promise<ISaleReturn[]> {
  return (await apiClient.get<ISaleReturn[]>(`/sales/${saleId}/returns`)).data;
}

export async function createSaleReturnApi(
  saleId: string,
  payload: ICreateSaleReturnPayload,
): Promise<ISaleReturn> {
  return (await apiClient.post<ISaleReturn>(`/sales/${saleId}/returns`, payload)).data;
}
