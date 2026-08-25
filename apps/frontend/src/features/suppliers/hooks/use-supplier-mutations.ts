import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createSupplierApi,
  updateSupplierApi,
  deactivateSupplierApi,
  reactivateSupplierApi,
} from '../api/suppliers.api';
import { supplierKeys } from './suppliers-keys';
import type { CreateSupplierPayload, UpdateSupplierPayload } from '../types/suppliers.types';

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) => createSupplierApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSupplierPayload }) =>
      updateSupplierApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useDeactivateSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateSupplierApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useReactivateSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reactivateSupplierApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}
