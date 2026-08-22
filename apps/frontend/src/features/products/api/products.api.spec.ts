import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/services/api.client';
import { ProductStatus } from '@erp/shared-types';
import {
  getProductsApi,
  getProductByIdApi,
  createProductApi,
  updateProductApi,
  deactivateProductApi,
  reactivateProductApi,
  createProductConversionApi,
  updateProductConversionApi,
  deleteProductConversionApi,
} from './products.api';

vi.mock('@/services/api.client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('products.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getProductsApi translates page/limit to offset/limit', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: { items: [], total: 0, offset: 20, limit: 10 },
    });

    const res = await getProductsApi({ page: 3, limit: 10, status: ProductStatus.ACTIVE });
    expect(apiClient.get).toHaveBeenCalledWith('/products', {
      params: { offset: 20, limit: 10, status: ProductStatus.ACTIVE },
    });
    expect(res.offset).toBe(20);
  });

  it('getProductByIdApi calls GET /products/:id', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ data: { id: 'p-1' } });
    const res = await getProductByIdApi('p-1');
    expect(apiClient.get).toHaveBeenCalledWith('/products/p-1');
    expect(res.id).toBe('p-1');
  });

  it('createProductApi calls POST /products', async () => {
    const payload = {
      name: 'Product',
      categoryId: 'c1',
      baseUnitId: 'u1',
      costNet: 100,
      activePriceNet: 150,
    };
    (apiClient.post as any).mockResolvedValueOnce({ data: { id: 'p-new', ...payload } });
    const res = await createProductApi(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/products', payload);
    expect(res.id).toBe('p-new');
  });

  it('updateProductApi calls PATCH /products/:id', async () => {
    const payload = { name: 'Updated' };
    (apiClient.patch as any).mockResolvedValueOnce({ data: { id: 'p-1', ...payload } });
    const res = await updateProductApi('p-1', payload);
    expect(apiClient.patch).toHaveBeenCalledWith('/products/p-1', payload);
    expect(res.name).toBe('Updated');
  });

  it('deactivateProductApi calls DELETE /products/:id', async () => {
    (apiClient.delete as any).mockResolvedValueOnce({ data: undefined });
    await deactivateProductApi('p-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/products/p-1');
  });

  it('reactivateProductApi calls PATCH /products/:id with ACTIVE status', async () => {
    (apiClient.patch as any).mockResolvedValueOnce({
      data: { id: 'p-1', status: ProductStatus.ACTIVE },
    });
    const res = await reactivateProductApi('p-1');
    expect(apiClient.patch).toHaveBeenCalledWith('/products/p-1', { status: ProductStatus.ACTIVE });
    expect(res.status).toBe(ProductStatus.ACTIVE);
  });

  it('conversions API functions call respective endpoints', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ data: { id: 'conv-1' } });
    await createProductConversionApi('p-1', { presentationUnitId: 'u-box', conversionFactor: 10 });
    expect(apiClient.post).toHaveBeenCalledWith('/products/p-1/conversions', {
      presentationUnitId: 'u-box',
      conversionFactor: 10,
    });

    (apiClient.patch as any).mockResolvedValueOnce({
      data: { id: 'conv-1', conversionFactor: 20 },
    });
    await updateProductConversionApi('p-1', 'conv-1', { conversionFactor: 20 });
    expect(apiClient.patch).toHaveBeenCalledWith('/products/p-1/conversions/conv-1', {
      conversionFactor: 20,
    });

    (apiClient.delete as any).mockResolvedValueOnce({ data: undefined });
    await deleteProductConversionApi('p-1', 'conv-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/products/p-1/conversions/conv-1');
  });
});
