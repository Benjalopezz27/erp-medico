import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { createTestQueryClient } from '@/test/test-utils';
import { useDashboardActivityQuery } from './use-dashboard-activity';

describe('useDashboardActivityQuery', () => {
  it('uses the dashboard/activity key and polls while the tab is visible', async () => {
    server.use(http.get('*/api/v1/dashboard/activity', () => HttpResponse.json([])));
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDashboardActivityQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: ['dashboard', 'activity'] });
    expect(query).toBeDefined();
    const options = query!.options as {
      refetchInterval?: number;
      refetchIntervalInBackground?: boolean;
    };
    expect(options.refetchInterval).toBe(30_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });
});
