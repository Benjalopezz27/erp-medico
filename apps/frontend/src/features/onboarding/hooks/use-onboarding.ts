import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dismissHintApi,
  dismissOnboardingApi,
  getOnboardingStatusApi,
} from '../api/onboarding.api';

export const ONBOARDING_KEY = ['onboarding-status'] as const;

/** Solo administradores: el endpoint es de rol admin. */
export function useOnboardingStatusQuery(enabled: boolean) {
  return useQuery({
    queryKey: ONBOARDING_KEY,
    queryFn: ({ signal }) => getOnboardingStatusApi({ signal }),
    enabled,
    meta: { skipGlobalErrorToast: true },
  });
}

function useStatusMutation<T>(fn: (arg: T) => ReturnType<typeof dismissOnboardingApi>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (status) => queryClient.setQueryData(ONBOARDING_KEY, status),
  });
}

export const useDismissOnboardingMutation = () => useStatusMutation(dismissOnboardingApi);
export const useDismissHintMutation = () => useStatusMutation(dismissHintApi);
