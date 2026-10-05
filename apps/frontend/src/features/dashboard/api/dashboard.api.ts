import type { IDashboardActivity, IDashboardKpis } from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export async function getDashboardKpisApi(): Promise<IDashboardKpis> {
  return (await apiClient.get<IDashboardKpis>('/dashboard/kpis')).data;
}

export async function getDashboardActivityApi(limit?: number): Promise<IDashboardActivity> {
  return (await apiClient.get<IDashboardActivity>('/dashboard/activity', { params: { limit } }))
    .data;
}
