import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../api/fiscal-alerts.api';
import { useFiscalAlertsCountQuery, useFiscalAlertsQuery } from './use-fiscal-alerts-query';
import {
  buildFiscalAlertRow,
  buildPaginatedFiscalAlertsResponse,
} from '../testing/fiscal-alerts-fixtures';

vi.mock('../api/fiscal-alerts.api');

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useFiscalAlertsQuery', () => {
  it('fetches the list for the given params', async () => {
    vi.mocked(api.getFiscalAlertsApi).mockResolvedValue(
      buildPaginatedFiscalAlertsResponse([buildFiscalAlertRow()]),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useFiscalAlertsQuery({ tab: 'PENDIENTE_FACTURACION', page: 1, limit: 20 }),
      { wrapper: wrapperFor(queryClient) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe('useFiscalAlertsCountQuery', () => {
  it('does not fetch when disabled', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useFiscalAlertsCountQuery(false), { wrapper: wrapperFor(queryClient) });
    expect(api.getFiscalAlertsCountApi).not.toHaveBeenCalled();
  });

  it('selects the total from the count response when enabled', async () => {
    vi.mocked(api.getFiscalAlertsCountApi).mockResolvedValue({ pending: 2, rejected: 1, total: 3 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useFiscalAlertsCountQuery(true), {
      wrapper: wrapperFor(queryClient),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(3);
  });
});
