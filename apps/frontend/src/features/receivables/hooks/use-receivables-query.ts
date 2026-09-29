import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import {
  downloadAccountStatementPdfApi,
  getCustomerAccountApi,
  getDebtorsApi,
  type DebtorSearchParams,
} from '../api/receivables.api';
import { buildStatementFilename } from '../utils/receivables.format';
import { receivablesKeys } from './receivables-keys';

export function useDebtorsQuery(params: DebtorSearchParams) {
  return useQuery({
    queryKey: receivablesKeys.debtors(params),
    queryFn: () => getDebtorsApi(params),
    placeholderData: keepPreviousData,
  });
}

export function useCustomerAccountQuery(customerId: string, page: number, limit: number) {
  return useQuery({
    queryKey: receivablesKeys.account(customerId, page, limit),
    queryFn: () => getCustomerAccountApi(customerId, page, limit),
    enabled: Boolean(customerId),
    placeholderData: keepPreviousData,
  });
}

export function useDownloadAccountStatement() {
  return useMutation<void, Error, { customerId: string; customerDocument: string }>({
    mutationFn: async ({ customerId, customerDocument }) => {
      const blob = await downloadAccountStatementPdfApi(customerId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildStatementFilename(customerDocument, new Date());
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
