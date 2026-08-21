import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getUsersApi, getUserByIdApi } from '../api/users.api';
import type { UserSearchParams } from '../types/users.types';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserSearchParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export function useUsersQuery(params: UserSearchParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getUsersApi(params),
    placeholderData: keepPreviousData,
  });
}

export function useUserDetailQuery(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUserByIdApi(id),
    enabled: Boolean(id),
  });
}
