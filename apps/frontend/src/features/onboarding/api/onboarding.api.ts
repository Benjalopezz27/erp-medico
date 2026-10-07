import type { ContextHintId, IOnboardingStatus } from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export async function getOnboardingStatusApi(options?: { signal?: AbortSignal }) {
  return (await apiClient.get<IOnboardingStatus>('/config/onboarding-status', options)).data;
}

export async function dismissOnboardingApi() {
  return (await apiClient.post<IOnboardingStatus>('/config/onboarding/dismiss')).data;
}

export async function dismissHintApi(id: ContextHintId) {
  return (await apiClient.post<IOnboardingStatus>(`/config/hints/${id}/dismiss`)).data;
}

/** Solo lectura: el certificado se configura por entorno, nunca se sube. */
export async function getArcaCertificateApi(options?: { signal?: AbortSignal }) {
  const { data } = await apiClient.get<{ certificate: { hasCertificate: boolean } }>(
    '/arca/probe',
    options,
  );
  return data.certificate;
}
