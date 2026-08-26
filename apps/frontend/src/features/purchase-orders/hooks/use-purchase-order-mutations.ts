import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createPurchaseOrderApi,
  updatePurchaseOrderApi,
  emitPurchaseOrderApi,
  cancelPurchaseOrderApi,
} from '../api/purchase-orders.api';
import { purchaseOrdersKeys } from './purchase-orders-keys';
import type {
  ICreatePurchaseOrderPayload,
  IUpdatePurchaseOrderPayload,
  ICancelPurchaseOrderPayload,
  IPurchaseOrderDetail,
} from '../types/purchase-orders.types';

export function useCreatePurchaseOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ICreatePurchaseOrderPayload) => createPurchaseOrderApi(payload),
    onSuccess: (data: IPurchaseOrderDetail) => {
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.lists(),
      });
      queryClient.setQueryData(purchaseOrdersKeys.detail(data.id), data);
    },
  });
}

export function useUpdatePurchaseOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IUpdatePurchaseOrderPayload }) =>
      updatePurchaseOrderApi(id, payload),
    onSuccess: (data: IPurchaseOrderDetail) => {
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.lists(),
      });
      queryClient.setQueryData(purchaseOrdersKeys.detail(data.id), data);
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.detail(data.id),
      });
    },
  });
}

export function useEmitPurchaseOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => emitPurchaseOrderApi(id),
    onSuccess: (data: IPurchaseOrderDetail) => {
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.lists(),
      });
      queryClient.setQueryData(purchaseOrdersKeys.detail(data.id), data);
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.detail(data.id),
      });
    },
  });
}

export function useCancelPurchaseOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: ICancelPurchaseOrderPayload }) =>
      cancelPurchaseOrderApi(id, payload),
    onSuccess: (data: IPurchaseOrderDetail) => {
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.lists(),
      });
      queryClient.setQueryData(purchaseOrdersKeys.detail(data.id), data);
      queryClient.invalidateQueries({
        queryKey: purchaseOrdersKeys.detail(data.id),
      });
    },
  });
}
