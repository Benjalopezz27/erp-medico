import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCustomerSpecialPriceApi,
  deleteCustomerSpecialPriceApi,
  resolveCustomerPriceApi,
  updateCustomerSpecialPriceApi,
} from '../api/customer-pricing.api';
import type {
  ICreateCustomerSpecialPricePayload,
  IResolvedCustomerPrice,
  IUpdateCustomerSpecialPricePayload,
} from '../types/customer-pricing.types';
import { parseCustomerPricingError } from '../utils/customer-pricing.errors';
import { customerPricingKeys } from './customer-pricing-keys';

export function useCreateCustomerSpecialPriceMutation(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ICreateCustomerSpecialPricePayload) =>
      createCustomerSpecialPriceApi(customerId, payload),
    retry: false,
    onSuccess: async (rule) => {
      queryClient.setQueryData(customerPricingKeys.detail(customerId, rule.id), rule);
      await queryClient.invalidateQueries({ queryKey: customerPricingKeys.customer(customerId) });
    },
    onError: async (error) => {
      if (parseCustomerPricingError(error).shouldRefresh)
        await queryClient.invalidateQueries({ queryKey: customerPricingKeys.customer(customerId) });
    },
  });
}

export function useUpdateCustomerSpecialPriceMutation(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IUpdateCustomerSpecialPricePayload }) =>
      updateCustomerSpecialPriceApi(customerId, id, payload),
    retry: false,
    onSuccess: async (rule) => {
      queryClient.setQueryData(customerPricingKeys.detail(customerId, rule.id), rule);
      await queryClient.invalidateQueries({ queryKey: customerPricingKeys.customer(customerId) });
    },
    onError: async (error, variables) => {
      const parsed = parseCustomerPricingError(error);
      if (parsed.currentRule)
        queryClient.setQueryData(
          customerPricingKeys.detail(customerId, variables.id),
          parsed.currentRule,
        );
      if (parsed.shouldRefresh)
        await queryClient.invalidateQueries({ queryKey: customerPricingKeys.customer(customerId) });
    },
  });
}

export function useDeleteCustomerSpecialPriceMutation(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      await deleteCustomerSpecialPriceApi(customerId, id);
      let fallback: IResolvedCustomerPrice | undefined;
      try {
        fallback = await resolveCustomerPriceApi(customerId, productId);
      } catch {
        // The deletion succeeded; a failed explanatory refresh must not report it as failed.
      }
      return { id, productId, fallback };
    },
    retry: false,
    onSuccess: async ({ id }) => {
      queryClient.removeQueries({ queryKey: customerPricingKeys.detail(customerId, id) });
      await queryClient.invalidateQueries({ queryKey: customerPricingKeys.customer(customerId) });
    },
    onError: async (error) => {
      if (parseCustomerPricingError(error).shouldRefresh)
        await queryClient.invalidateQueries({ queryKey: customerPricingKeys.customer(customerId) });
    },
  });
}
