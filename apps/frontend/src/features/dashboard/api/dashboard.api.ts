import type { IDashboardKpis } from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export async function getDashboardKpisApi(): Promise<IDashboardKpis> {
  return (await apiClient.get<IDashboardKpis>('/dashboard/kpis')).data;
}
