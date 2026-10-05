import { useQuery } from '@tanstack/react-query';
import { cleanFilters, getReportApi } from '../api/get-report';
import type { ReportFilters } from '../api/download-report';

export function useReportQuery(type: string, filters: ReportFilters) {
  const applied = cleanFilters(filters);
  return useQuery({
    queryKey: ['reports', type, applied],
    queryFn: () => getReportApi(type, applied),
    enabled: Boolean(type),
  });
}
