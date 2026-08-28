import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/features/products/hooks/use-products-query';
import { createMarkupApi, deleteMarkupApi, updateMarkupApi } from '../api/markups.api';
import type { CreateMarkupPayload, UpdateMarkupPayload } from '../types/markups.types';
import { markupKeys } from './markup-keys';

function useInvalidateMarkupState() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: markupKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: markupKeys.simulations() }),
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
    ]);
  };
}

export function useCreateMarkupMutation() {
  const invalidate = useInvalidateMarkupState();
  return useMutation({
    mutationFn: (payload: CreateMarkupPayload) => createMarkupApi(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateMarkupMutation() {
  const invalidate = useInvalidateMarkupState();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMarkupPayload }) =>
      updateMarkupApi(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteMarkupMutation() {
  const invalidate = useInvalidateMarkupState();
  return useMutation({
    mutationFn: deleteMarkupApi,
    onSuccess: invalidate,
  });
}
