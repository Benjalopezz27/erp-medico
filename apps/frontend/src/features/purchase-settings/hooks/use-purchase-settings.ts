import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPurchaseSettingsApi, updatePurchaseSettingsApi } from '../api/purchase-settings.api';
import { purchaseSettingsKeys } from './purchase-settings-keys';

export function usePurchaseSettingsQuery() {
  return useQuery({
    queryKey: purchaseSettingsKeys.detail(),
    queryFn: ({ signal }) => getPurchaseSettingsApi({ signal }),
    staleTime: 60_000,
  });
}

export function useUpdatePurchaseSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePurchaseSettingsApi,
    onSuccess: (settings) => {
      queryClient.setQueryData(purchaseSettingsKeys.detail(), settings);
    },
  });
}
