import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArcaStatus } from '@erp/shared-types';
import { salesKeys } from '@/features/sales/hooks/sales-keys';
import * as api from '../api/fiscal-alerts.api';
import { fiscalAlertsKeys } from './fiscal-alerts-keys';
import { useRetryFiscalDocumentMutation } from './use-retry-fiscal-document-mutation';

vi.mock('../api/fiscal-alerts.api');

const saleId = '40000000-0000-4000-8000-000000000001';
const fiscalDocumentId = '70000000-0000-4000-8000-000000000001';

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useRetryFiscalDocumentMutation', () => {
  it('does not retry on failure and invalidates lists, count and sale detail on success', async () => {
    vi.mocked(api.retryFiscalDocumentApi).mockResolvedValue({
      fiscalDocumentId,
      arcaStatus: ArcaStatus.EMITIDO,
    });
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const { result } = renderHook(() => useRetryFiscalDocumentMutation(saleId), {
      wrapper: wrapperFor(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ fiscalDocumentId, idempotencyKey: 'key-1' });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: fiscalAlertsKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: fiscalAlertsKeys.count() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: salesKeys.detail(saleId) });
  });

  it('invalidates the same caches even when the retry request fails', async () => {
    vi.mocked(api.retryFiscalDocumentApi).mockRejectedValue(new Error('conflict'));
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const { result } = renderHook(() => useRetryFiscalDocumentMutation(saleId), {
      wrapper: wrapperFor(queryClient),
    });

    await act(async () => {
      await result.current
        .mutateAsync({ fiscalDocumentId, idempotencyKey: 'key-1' })
        .catch(() => {});
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: fiscalAlertsKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: fiscalAlertsKeys.count() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: salesKeys.detail(saleId) });
  });
});
