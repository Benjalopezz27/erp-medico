import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { treasuryKeys } from '@/features/treasury/hooks/use-treasury';
import {
  closeCashRegisterApi,
  getCashRegisterApi,
  openCashRegisterApi,
} from '../api/cash-register.api';

export const cashRegisterKey = ['cash-register'] as const;

export function useCashRegisterQuery() {
  return useQuery({ queryKey: cashRegisterKey, queryFn: getCashRegisterApi });
}

function useRefreshOnSuccess() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: cashRegisterKey }),
      queryClient.invalidateQueries({ queryKey: treasuryKeys.all }),
    ]);
}

export function useOpenCashRegisterMutation() {
  return useMutation({
    mutationFn: openCashRegisterApi,
    retry: false,
    onSuccess: useRefreshOnSuccess(),
  });
}

export function useCloseCashRegisterMutation() {
  return useMutation({
    mutationFn: closeCashRegisterApi,
    retry: false,
    onSuccess: useRefreshOnSuccess(),
  });
}
