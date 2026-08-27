import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api.client';
import { getPurchaseSettingsApi, updatePurchaseSettingsApi } from './purchase-settings.api';

vi.mock('@/services/api.client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

describe('purchase settings API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads settings with an abort signal', async () => {
    const signal = new AbortController().signal;
    vi.mocked(apiClient.get).mockResolvedValue({ data: { costTolerancePercentage: '5.0000' } });
    await getPurchaseSettingsApi({ signal });
    expect(apiClient.get).toHaveBeenCalledWith('/config/purchases', { signal });
  });

  it('patches the canonical decimal string unchanged', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { costTolerancePercentage: '4.2500' } });
    await updatePurchaseSettingsApi({ costTolerancePercentage: '4.2500' });
    expect(apiClient.patch).toHaveBeenCalledWith('/config/purchases', {
      costTolerancePercentage: '4.2500',
    });
  });
});
