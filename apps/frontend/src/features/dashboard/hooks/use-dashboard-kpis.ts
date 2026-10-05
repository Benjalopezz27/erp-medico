import { useQuery } from '@tanstack/react-query';
import { getDashboardKpisApi } from '../api/dashboard.api';

export function useDashboardKpisQuery() {
  return useQuery({ queryKey: ['dashboard', 'kpis'], queryFn: getDashboardKpisApi });
}
