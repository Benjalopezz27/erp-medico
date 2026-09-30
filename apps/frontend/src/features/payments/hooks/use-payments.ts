import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IRegisterPaymentRequest } from '@erp/shared-types';
import { receivablesKeys } from '@/features/receivables/hooks/receivables-keys';
import { downloadReceiptPdfApi, getReceiptApi, registerPaymentApi } from '../api/payments.api';
import { paymentsKeys } from './payments-keys';

export function useRegisterPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: IRegisterPaymentRequest) => registerPaymentApi(payload),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: receivablesKeys.all }),
  });
}

export function useReceiptQuery(id: string) {
  return useQuery({
    queryKey: paymentsKeys.receipt(id),
    queryFn: () => getReceiptApi(id),
    enabled: Boolean(id),
  });
}

export function useDownloadReceiptPdf() {
  return useMutation<void, Error, { id: string; receiptNumber: string }>({
    mutationFn: async ({ id, receiptNumber }) => {
      const blob = await downloadReceiptPdfApi(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recibo-${receiptNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
