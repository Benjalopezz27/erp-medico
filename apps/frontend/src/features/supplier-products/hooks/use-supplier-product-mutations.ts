import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createSupplierProductApi,
  updateSupplierProductApi,
  deleteSupplierProductApi,
} from '../api/supplier-products.api';
import { supplierProductsKeys } from './supplier-products-keys';
import type {
  CreateSupplierProductPayload,
  UpdateSupplierProductPayload,
} from '../types/supplier-products.types';

export function useCreateSupplierProductMutation(supplierId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSupplierProductPayload) =>
      createSupplierProductApi(supplierId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supplierProductsKeys.lists(),
      });
    },
  });
}

export function useUpdateSupplierProductMutation(supplierId: string, associationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSupplierProductPayload) =>
      updateSupplierProductApi(supplierId, associationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supplierProductsKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: supplierProductsKeys.detail(supplierId, associationId),
      });
    },
  });
}

export function useDeleteSupplierProductMutation(supplierId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (associationId: string) => deleteSupplierProductApi(supplierId, associationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supplierProductsKeys.lists(),
      });
    },
  });
}
