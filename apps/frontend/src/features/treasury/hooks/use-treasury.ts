import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTreasuryMovementApi,
  getTreasuryMovementsApi,
  getTreasurySummaryApi,
  type TreasuryMovementParams,
} from '../api/treasury.api';

export const treasuryKeys = {
  all: ['treasury'] as const,
  summary: () => [...treasuryKeys.all, 'summary'] as const,
  movements: (params: TreasuryMovementParams) =>
    [...treasuryKeys.all, 'movements', params] as const,
};

export function useTreasurySummaryQuery() {
  return useQuery({ queryKey: treasuryKeys.summary(), queryFn: getTreasurySummaryApi });
}

export function useTreasuryMovementsQuery(params: TreasuryMovementParams) {
  return useQuery({
    queryKey: treasuryKeys.movements(params),
    queryFn: () => getTreasuryMovementsApi(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateTreasuryMovementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTreasuryMovementApi,
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: treasuryKeys.all }),
  });
}
