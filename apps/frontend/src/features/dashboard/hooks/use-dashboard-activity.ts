import { useQuery } from '@tanstack/react-query';
import { getDashboardActivityApi } from '../api/dashboard.api';

const POLL_INTERVAL_MS = 30_000;
// ponytail: paging is client-side over the latest 50 events (API max); server-side paging if older history is needed
const FETCH_LIMIT = 50;

export function useDashboardActivityQuery() {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => getDashboardActivityApi(FETCH_LIMIT),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
    // The card shows its own error; avoid a toast every polling tick.
    meta: { skipGlobalErrorToast: true },
  });
}
