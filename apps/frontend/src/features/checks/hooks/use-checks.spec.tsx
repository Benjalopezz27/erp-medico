import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { CheckStatus } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { receivablesKeys } from '@/features/receivables/hooks/receivables-keys';
import { useCheckActionMutation, useChecksQuery } from './use-checks';
import { CHECK_ID, buildCheck, buildCheckList } from '../testing/checks-fixtures';

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('check hooks', () => {
  it('loads the list', async () => {
    server.use(http.get('*/api/v1/checks', () => HttpResponse.json(buildCheckList())));
    const { wrapper } = setup();
    const { result } = renderHook(() => useChecksQuery({ page: 1, limit: 20 }), { wrapper });
    await waitFor(() => expect(result.current.data?.data).toHaveLength(1));
  });

  it('invalidates receivables only when a check is rejected', async () => {
    server.use(
      http.patch(`*/api/v1/checks/${CHECK_ID}/deposit`, () =>
        HttpResponse.json(buildCheck({ status: CheckStatus.DEPOSITADO })),
      ),
      http.patch(`*/api/v1/checks/${CHECK_ID}/reject`, () =>
        HttpResponse.json(buildCheck({ status: CheckStatus.RECHAZADO })),
      ),
    );
    const { client, wrapper } = setup();
    client.setQueryData(receivablesKeys.all, 'stale');
    const { result } = renderHook(() => useCheckActionMutation(), { wrapper });

    await result.current.mutateAsync({ id: CHECK_ID, action: 'deposit' });
    expect(client.getQueryState(receivablesKeys.all)?.isInvalidated).toBe(false);

    await result.current.mutateAsync({ id: CHECK_ID, action: 'reject' });
    await waitFor(() =>
      expect(client.getQueryState(receivablesKeys.all)?.isInvalidated).toBe(true),
    );
  });
});
