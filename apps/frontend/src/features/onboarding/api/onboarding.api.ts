import type { IOnboardingStatus, OnboardingStepId } from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export async function getOnboardingStatusApi(options?: { signal?: AbortSignal }) {
  return (await apiClient.get<IOnboardingStatus>('/config/onboarding-status', options)).data;
}

export async function skipOnboardingStepApi(id: OnboardingStepId) {
  return (await apiClient.post<IOnboardingStatus>(`/config/onboarding/steps/${id}/skip`)).data;
}

export async function completeOnboardingApi() {
  return (await apiClient.post<IOnboardingStatus>('/config/onboarding/complete')).data;
}

/** Solo lectura: el certificado se configura por entorno, nunca se sube. */
export async function getArcaCertificateApi(options?: { signal?: AbortSignal }) {
  const { data } = await apiClient.get<{ certificate: { hasCertificate: boolean } }>(
    '/arca/probe',
    options,
  );
  return data.certificate;
}
