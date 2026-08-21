import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createUserApi,
  updateUserApi,
  deactivateUserApi,
  reactivateUserApi,
} from '../api/users.api';
import { userKeys } from './use-users-query';
import type { CreateUserPayload, UpdateUserPayload } from '../types/users.types';

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUserApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUserApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useDeactivateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateUserApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useReactivateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reactivateUserApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
