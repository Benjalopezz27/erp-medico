import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesKeys } from '@/features/sales/hooks/sales-keys';
import { retryFiscalDocumentApi } from '../api/fiscal-alerts.api';
import { fiscalAlertsKeys } from './fiscal-alerts-keys';

export function useRetryFiscalDocumentMutation(saleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      fiscalDocumentId,
      idempotencyKey,
    }: {
      fiscalDocumentId: string;
      idempotencyKey: string;
    }) => retryFiscalDocumentApi(fiscalDocumentId, idempotencyKey),
    retry: false,
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: fiscalAlertsKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: fiscalAlertsKeys.count() }),
        queryClient.invalidateQueries({ queryKey: salesKeys.detail(saleId) }),
      ]);
    },
  });
}
