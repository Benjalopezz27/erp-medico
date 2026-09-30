import type {
  IReceiptDetail,
  IRegisterPaymentRequest,
  IRegisterPaymentResponse,
} from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export async function registerPaymentApi(
  payload: IRegisterPaymentRequest,
): Promise<IRegisterPaymentResponse> {
  return (await apiClient.post<IRegisterPaymentResponse>('/payments', payload)).data;
}

export async function getReceiptApi(id: string): Promise<IReceiptDetail> {
  return (await apiClient.get<IReceiptDetail>(`/receipts/${id}`)).data;
}

export async function downloadReceiptPdfApi(id: string): Promise<Blob> {
  return (await apiClient.get(`/receipts/${id}/pdf`, { responseType: 'blob' })).data;
}
