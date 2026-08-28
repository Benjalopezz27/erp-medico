import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkupLevel } from '@erp/shared-types';
import { apiClient } from '@/services/api.client';
import {
  createMarkupApi,
  deleteMarkupApi,
  getMarkupsApi,
  simulateMarkupApi,
  updateMarkupApi,
} from './markups.api';

vi.mock('@/services/api.client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('markups API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the administrative endpoints and preserves decimal strings', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.delete).mockResolvedValue({});
    const signal = new AbortController().signal;

    await getMarkupsApi(signal);
    await createMarkupApi({
      level: MarkupLevel.CATEGORY,
      percentage: '25.1250',
      categoryId: 'category-1',
    });
    await updateMarkupApi('markup-1', { percentage: '30.0000' });
    await deleteMarkupApi('markup-1');
    await simulateMarkupApi('product-1', signal);

    expect(apiClient.get).toHaveBeenCalledWith('/prices/markups', { signal });
    expect(apiClient.post).toHaveBeenCalledWith('/prices/markups', {
      level: MarkupLevel.CATEGORY,
      percentage: '25.1250',
      categoryId: 'category-1',
    });
    expect(apiClient.patch).toHaveBeenCalledWith('/prices/markups/markup-1', {
      percentage: '30.0000',
    });
    expect(apiClient.delete).toHaveBeenCalledWith('/prices/markups/markup-1');
    expect(apiClient.get).toHaveBeenCalledWith('/prices/markups/simulate/product-1', { signal });
  });
});
