import { useQuery } from '@tanstack/react-query';
import { getMarkupsApi, simulateMarkupApi } from '../api/markups.api';
import { markupKeys } from './markup-keys';

export function useMarkupsQuery() {
  return useQuery({
    queryKey: markupKeys.lists(),
    queryFn: ({ signal }) => getMarkupsApi(signal),
    staleTime: 30_000,
  });
}

export function useMarkupSimulationQuery(productId?: string) {
  return useQuery({
    queryKey: markupKeys.simulation(productId ?? ''),
    queryFn: ({ signal }) => simulateMarkupApi(productId!, signal),
    enabled: Boolean(productId),
    staleTime: 30_000,
  });
}
