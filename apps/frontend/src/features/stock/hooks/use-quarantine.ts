import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QuarantineResolution } from '@erp/shared-types';
import {
  getQuarantineListApi,
  createQuarantineEntryApi,
  resolveQuarantineApi,
} from '../api/quarantine.api';
import { quarantineKeys } from './quarantine-keys';
import { stockKeys } from './stock-keys';
import type {
  IQuarantineSearchParams,
  CreateQuarantinePayload,
  ResolveQuarantinePayload,
} from '../types/quarantine.types';

/**
 * Hook to query paginated quarantine list with filters.
 */
export function useQuarantineListQuery(params?: IQuarantineSearchParams) {
  return useQuery({
    queryKey: quarantineKeys.list(params),
    queryFn: ({ signal }) => getQuarantineListApi(params, signal),
  });
}

/**
 * Hook to transfer available stock to quarantine.
 * On success, invalidates quarantine list, stock overview, and product search queries.
 */
export function useCreateQuarantineMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateQuarantinePayload) =>
      createQuarantineEntryApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quarantineKeys.all });
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      queryClient.invalidateQueries({ queryKey: ['products', 'search'] });
    },
  });
}

/**
 * Hook to resolve a quarantine entry.
 * For REINGRESO: invalidates quarantine, stock overview/ledger, and product search.
 * For MERMA / DEVOLUCION_PROVEEDOR: invalidates quarantine list.
 */
export function useResolveQuarantineMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ResolveQuarantinePayload;
    }) => resolveQuarantineApi(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: quarantineKeys.all });
      if (variables.payload.resolution === QuarantineResolution.REINGRESO) {
        queryClient.invalidateQueries({ queryKey: stockKeys.all });
        queryClient.invalidateQueries({ queryKey: ['products', 'search'] });
      }
    },
  });
}
