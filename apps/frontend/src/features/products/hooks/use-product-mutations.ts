import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createProductApi,
  updateProductApi,
  deactivateProductApi,
  reactivateProductApi,
  createProductConversionApi,
  updateProductConversionApi,
  deleteProductConversionApi,
} from '../api/products.api';
import { productKeys } from './use-products-query';
import type {
  CreateProductPayload,
  IProductUnitConversion,
  ProductConversionRow,
  UpdateProductPayload,
} from '../types/products.types';

export function useCreateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductPayload) => createProductApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      updateProductApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeactivateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateProductApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useReactivateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reactivateProductApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export interface ReconcileEditInput {
  productId: string;
  productDelta: UpdateProductPayload | null;
  initialConversions: IProductUnitConversion[];
  currentConversions: ProductConversionRow[];
}

export function useReconcileProductEditMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      productDelta,
      initialConversions,
      currentConversions,
    }: ReconcileEditInput) => {
      // 1. Identify conversions to delete:
      // - Conversions in initial list whose ID is missing in current list
      // - Conversions in initial list where presentationUnitId changed in current list (treated as delete + create)
      const toDelete: string[] = [];
      const retainedMap = new Map<string, ProductConversionRow>();

      for (const current of currentConversions) {
        if (current.id) {
          retainedMap.set(current.id, current);
        }
      }

      for (const initial of initialConversions) {
        const currentMatch = retainedMap.get(initial.id);
        if (!currentMatch || currentMatch.presentationUnitId !== initial.presentationUnitId) {
          toDelete.push(initial.id);
        }
      }

      // Step 2: Delete removed/modified-unit conversions sequentially to release unique constraints
      for (const conversionId of toDelete) {
        await deleteProductConversionApi(productId, conversionId);
      }

      // Step 3: Apply product base delta if changes exist
      if (productDelta && Object.keys(productDelta).length > 0) {
        await updateProductApi(productId, productDelta);
      }

      // Step 4: Update conversion factors for retained conversions
      for (const initial of initialConversions) {
        const currentMatch = retainedMap.get(initial.id);
        if (
          currentMatch &&
          currentMatch.presentationUnitId === initial.presentationUnitId &&
          Number(currentMatch.conversionFactor) !== Number(initial.conversionFactor)
        ) {
          await updateProductConversionApi(productId, initial.id, {
            conversionFactor: currentMatch.conversionFactor,
          });
        }
      }

      // Step 5: Create new conversions (or replacement conversions with modified unit)
      for (const current of currentConversions) {
        // New conversion if no id, or if id was previously marked to delete due to unit change
        if (!current.id || toDelete.includes(current.id)) {
          await createProductConversionApi(productId, {
            presentationUnitId: current.presentationUnitId,
            conversionFactor: current.conversionFactor,
          });
        }
      }
    },
    onSettled: (_data, _error, variables) => {
      // Invalidate queries so UI reflects actual state even on partial failure
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      if (variables?.productId) {
        queryClient.invalidateQueries({
          queryKey: productKeys.detail(variables.productId),
        });
      }
    },
  });
}
