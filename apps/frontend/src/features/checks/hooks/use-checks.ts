import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentsKeys } from '@/features/payments/hooks/payments-keys';
import { treasuryKeys } from '@/features/treasury/hooks/use-treasury';
import { receivablesKeys } from '@/features/receivables/hooks/receivables-keys';
import {
  getCheckApi,
  getChecksApi,
  transitionCheckApi,
  type CheckAction,
  type CheckSearchParams,
} from '../api/checks.api';
import { checksKeys } from './checks-keys';

export function useChecksQuery(params: CheckSearchParams) {
  return useQuery({
    queryKey: checksKeys.list(params),
    queryFn: () => getChecksApi(params),
    placeholderData: keepPreviousData,
  });
}

export function useCheckDetailQuery(id: string | null) {
  return useQuery({
    queryKey: checksKeys.detail(id ?? ''),
    queryFn: () => getCheckApi(id as string),
    enabled: Boolean(id),
  });
}

export function useCheckActionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      action: CheckAction;
      supplierId?: string;
      reason?: string;
    }) =>
      transitionCheckApi(input.id, input.action, {
        supplierId: input.supplierId,
        reason: input.reason,
      }),
    retry: false,
    onSuccess: (_data, { action }) => {
      void queryClient.invalidateQueries({ queryKey: checksKeys.all });
      // Depósito, endoso y rechazo mueven saldos entre cuentas.
      void queryClient.invalidateQueries({ queryKey: treasuryKeys.all });
      if (action === 'reject') {
        // El rechazo cambia saldos, ledger y estado de recibos.
        void queryClient.invalidateQueries({ queryKey: receivablesKeys.all });
        void queryClient.invalidateQueries({ queryKey: paymentsKeys.all });
      }
    },
  });
}
