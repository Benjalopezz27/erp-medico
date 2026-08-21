import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUnitApi, updateUnitApi, deleteUnitApi } from '../api/units.api';
import { unitKeys } from './use-units-query';
import type { CreateUnitPayload, UpdateUnitPayload } from '../types/units.types';

export function useCreateUnitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUnitPayload) => createUnitApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}

export function useUpdateUnitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUnitPayload }) =>
      updateUnitApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}

export function useDeleteUnitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUnitApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}
