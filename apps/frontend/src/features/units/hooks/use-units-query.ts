import { useQuery } from '@tanstack/react-query';
import { getUnitsApi } from '../api/units.api';

export const unitKeys = {
  all: ['units'] as const,
};

export function useUnitsQuery() {
  return useQuery({
    queryKey: unitKeys.all,
    queryFn: getUnitsApi,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}
