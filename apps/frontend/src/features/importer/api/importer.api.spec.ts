import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api.client';
import { postImporterUploadApi } from './importer.api';

vi.mock('@/services/api.client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
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

describe('Supplier import template APIs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls getSupplierImportTemplatesApi with supplierId and query params', async () => {
    const mockList = [{ id: 't1', name: 'Plantilla 1' }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockList });

    const res = await (
      await import('./importer.api')
    ).getSupplierImportTemplatesApi('sup-1', {
      search: 'plantilla',
    });
    expect(res).toBe(mockList);
    expect(apiClient.get).toHaveBeenCalledWith('/suppliers/sup-1/import-templates', {
      params: { search: 'plantilla' },
    });
  });

  it('calls createSupplierImportTemplateApi with payload', async () => {
    const mockCreated = { id: 't1', name: 'Nueva' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockCreated });

    const payload = {
      name: 'Nueva',
      headerFingerprint: 'fprint',
      headers: ['col1', 'col2'],
      mapping: { supplierSku: 'col1', usualCostNet: 'col2' },
    };

    const res = await (
      await import('./importer.api')
    ).createSupplierImportTemplateApi('sup-1', payload);
    expect(res).toBe(mockCreated);
    expect(apiClient.post).toHaveBeenCalledWith('/suppliers/sup-1/import-templates', payload);
  });

  it('calls updateSupplierImportTemplateApi with payload', async () => {
    const mockUpdated = { id: 't1', name: 'Renombrada' };
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockUpdated });

    const res = await (
      await import('./importer.api')
    ).updateSupplierImportTemplateApi('sup-1', 't1', {
      name: 'Renombrada',
    });
    expect(res).toBe(mockUpdated);
    expect(apiClient.patch).toHaveBeenCalledWith('/suppliers/sup-1/import-templates/t1', {
      name: 'Renombrada',
    });
  });

  it('calls deleteSupplierImportTemplateApi', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await (await import('./importer.api')).deleteSupplierImportTemplateApi('sup-1', 't1');
    expect(apiClient.delete).toHaveBeenCalledWith('/suppliers/sup-1/import-templates/t1');
  });
});
