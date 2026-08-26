import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api.client';
import { postImporterUploadApi } from './importer.api';

vi.mock('@/services/api.client', () => ({
  apiClient: { post: vi.fn() },
}));

describe('postImporterUploadApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears the JSON default so the browser can set the multipart boundary', async () => {
    const response = { fileChecksum: 'checksum' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: response });
    const file = new File(['SKU,Costo\n001,10'], 'lista.csv', { type: 'text/csv' });
    const controller = new AbortController();

    await expect(postImporterUploadApi('supplier-id', file, controller.signal)).resolves.toBe(
      response,
    );
    const [url, body, config] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe('/importer/upload');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('supplierId')).toBe('supplier-id');
    const uploadedFile = (body as FormData).get('file') as File;
    expect(uploadedFile.name).toBe(file.name);
    expect(uploadedFile.type).toBe(file.type);
    expect(config).toEqual({
      signal: controller.signal,
      headers: { 'Content-Type': undefined },
    });
  });
});
