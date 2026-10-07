import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeOnboardingApi,
  getArcaCertificateApi,
  getOnboardingStatusApi,
  skipOnboardingStepApi,
} from '../api/onboarding.api';

export const ONBOARDING_KEY = ['onboarding-status'] as const;

export function useOnboardingStatusQuery() {
  return useQuery({
    queryKey: ONBOARDING_KEY,
    queryFn: ({ signal }) => getOnboardingStatusApi({ signal }),
    // Se vuelve a consultar al volver de un módulo donde se cargaron datos.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
}

function useStatusMutation<T>(fn: (arg: T) => ReturnType<typeof completeOnboardingApi>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (status) => queryClient.setQueryData(ONBOARDING_KEY, status),
  });
}

export const useSkipStepMutation = () => useStatusMutation(skipOnboardingStepApi);
export const useCompleteOnboardingMutation = () => useStatusMutation(completeOnboardingApi);

export function useArcaCertificateQuery() {
  return useQuery({
    queryKey: ['arca-certificate'],
    queryFn: ({ signal }) => getArcaCertificateApi({ signal }),
    meta: { skipGlobalErrorToast: true },
    retry: false,
  });
}
