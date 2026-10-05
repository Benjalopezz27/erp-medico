import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSystemConfigApi, updateSystemConfigApi } from '../api/system-config.api';

const KEY = ['system-config'] as const;

export function useSystemConfigQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => getSystemConfigApi({ signal }),
    staleTime: 60_000,
  });
}

export function useUpdateSystemConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSystemConfigApi,
    onSuccess: (config) => queryClient.setQueryData(KEY, config),
  });
}
