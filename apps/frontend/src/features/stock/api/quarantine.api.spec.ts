import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getQuarantineListApi,
  createQuarantineEntryApi,
  resolveQuarantineApi,
} from './quarantine.api';
import { apiClient } from '@/services/api.client';
import { QuarantineStatus, QuarantineResolution } from '@erp/shared-types';

vi.mock('@/services/api.client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('quarantine.api Client Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getQuarantineListApi calls GET /quarantine with query parameters', async () => {
    const mockResponse = {
      data: {
        items: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

    const result = await getQuarantineListApi({
      page: 1,
      limit: 10,
      status: QuarantineStatus.EN_CUARENTENA,
    });

    expect(apiClient.get).toHaveBeenCalledWith('/quarantine', {
      params: { page: 1, limit: 10, status: QuarantineStatus.EN_CUARENTENA },
      signal: undefined,
    });
    expect(result).toEqual(mockResponse.data);
  });

  it('createQuarantineEntryApi calls POST /quarantine with payload', async () => {
    const payload = {
      productId: 'prod-uuid-1',
      quantityBase: 15,
      reason: 'Cajas rotas',
    };
    const mockResponse = {
      data: { id: 'quar-uuid-1', ...payload, status: QuarantineStatus.EN_CUARENTENA },
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

    const result = await createQuarantineEntryApi(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/quarantine', payload);
    expect(result).toEqual(mockResponse.data);
  });

  it('resolveQuarantineApi calls PATCH /quarantine/:id/resolve with payload', async () => {
    const payload = {
      resolution: QuarantineResolution.REINGRESO,
      resolutionNotes: 'Apto para stock general',
    };
    const mockResponse = {
      data: {
        id: 'quar-uuid-1',
        status: QuarantineStatus.REINGRESADO_STOCK,
        resolutionNotes: payload.resolutionNotes,
      },
    };
    vi.mocked(apiClient.patch).mockResolvedValueOnce(mockResponse);

    const result = await resolveQuarantineApi('quar-uuid-1', payload);

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/quarantine/quar-uuid-1/resolve',
      payload,
    );
    expect(result).toEqual(mockResponse.data);
  });
});
