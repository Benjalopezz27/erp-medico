import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/sonner', () => ({
  toast: { error: vi.fn() },
}));

import { toast } from '@/components/ui/sonner';
import { queryClient } from './query-client';

describe('queryClient global error handling', () => {
  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('shows a toast for a failed query without an explicit opt-out', async () => {
    await queryClient
      .fetchQuery({
        queryKey: ['boom'],
        queryFn: () => Promise.reject(new Error('boom')),
        retry: false,
      })
      .catch(() => {});

    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('skips the toast when meta.skipGlobalErrorToast is set', async () => {
    await queryClient
      .fetchQuery({
        queryKey: ['boom-quiet'],
        queryFn: () => Promise.reject(new Error('boom')),
        retry: false,
        meta: { skipGlobalErrorToast: true },
      })
      .catch(() => {});

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('never toasts for a failed mutation (every mutation already handles its own error inline)', async () => {
    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationFn: () => Promise.reject(new Error('boom')),
      })
      .execute(undefined)
      .catch(() => {});

    expect(toast.error).not.toHaveBeenCalled();
  });
});
