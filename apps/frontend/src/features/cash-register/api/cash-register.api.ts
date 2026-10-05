import type {
  ICashRegisterState,
  ICloseCashRegisterPayload,
  IOpenCashRegisterPayload,
} from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export async function getCashRegisterApi(): Promise<ICashRegisterState> {
  return (await apiClient.get<ICashRegisterState>('/cash-register/current')).data;
}

export async function openCashRegisterApi(payload: IOpenCashRegisterPayload) {
  return (await apiClient.post<{ id: string }>('/cash-register/open', payload)).data;
}

export async function closeCashRegisterApi(payload: ICloseCashRegisterPayload) {
  return (await apiClient.post<{ id: string; difference: string }>('/cash-register/close', payload))
    .data;
}
