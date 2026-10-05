import { apiClient } from '@/services/api.client';
import type { ReportFilters } from './download-report';

export interface ReportColumn {
  key: string;
  header: string;
  type?: 'text' | 'money' | 'number' | 'date';
}
export interface ReportResult {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
}

export const cleanFilters = (filters: ReportFilters): Record<string, string> =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Record<string, string>;

export async function getReportApi(type: string, filters: ReportFilters): Promise<ReportResult> {
  return (await apiClient.get<ReportResult>(`/reports/${type}`, { params: cleanFilters(filters) }))
    .data;
}
