import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  createCustomerApi,
  deactivateCustomerApi,
  reactivateCustomerApi,
  updateCustomerApi,
} from '../api/customers.api';
import type {
  CreateCustomerPayload,
  ICustomer,
  UpdateCustomerPayload,
} from '../types/customers.types';
import { parseCustomerError } from '../utils/customers.errors';
import { customerKeys } from './customer-keys';
import { customerPricingKeys } from '@/features/customer-pricing/hooks/customer-pricing-keys';

async function reconcileCustomer(queryClient: QueryClient, customer: ICustomer) {
  queryClient.setQueryData(customerKeys.detail(customer.id), customer);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: customerKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: customerPricingKeys.customer(customer.id) }),
  ]);
}

function conflictLifecycle(queryClient: QueryClient, id?: string) {
  return async (error: unknown) => {
    const parsed = parseCustomerError(error);
    if (!parsed.shouldRefresh) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() }),
      ...(id ? [queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) })] : []),
    ]);
  };
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => createCustomerApi(payload),
    retry: false,
    onSuccess: (customer) => reconcileCustomer(queryClient, customer),
    onError: conflictLifecycle(queryClient),
  });
}

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerPayload }) =>
      updateCustomerApi(id, payload),
    retry: false,
    onSuccess: (customer) => reconcileCustomer(queryClient, customer),
    onError: (error, variables) => conflictLifecycle(queryClient, variables.id)(error),
  });
}

export function useDeactivateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateCustomerApi(id),
    retry: false,
    onSuccess: (customer) => reconcileCustomer(queryClient, customer),
    onError: (error, id) => conflictLifecycle(queryClient, id)(error),
  });
}

export function useReactivateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reactivateCustomerApi(id),
    retry: false,
    onSuccess: (customer) => reconcileCustomer(queryClient, customer),
    onError: (error, id) => conflictLifecycle(queryClient, id)(error),
  });
}
