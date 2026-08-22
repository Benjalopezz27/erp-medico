import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as productsApi from '../api/products.api';
import type { IProductUnitConversion } from '../types/products.types';
import { useReconcileProductEditMutation } from './use-product-mutations';

vi.mock('../api/products.api');

describe('useReconcileProductEditMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('deletes conflicts before updating the product and recreating conversions', async () => {
    const invocationOrder: string[] = [];
    vi.mocked(productsApi.deleteProductConversionApi).mockImplementation(
      async (_productId, conversionId) => {
        invocationOrder.push(`delete:${conversionId}`);
      },
    );
    vi.mocked(productsApi.updateProductApi).mockImplementation(async () => {
      invocationOrder.push('update:product');
      return {} as never;
    });
    vi.mocked(productsApi.updateProductConversionApi).mockImplementation(
      async (_productId, conversionId) => {
        invocationOrder.push(`update:${conversionId}`);
        return {} as never;
      },
    );
    vi.mocked(productsApi.createProductConversionApi).mockImplementation(
      async (_productId, payload) => {
        invocationOrder.push(`create:${payload.presentationUnitId}`);
        return {} as never;
      },
    );

    const initialConversions: IProductUnitConversion[] = [
      {
        id: 'conversion-changed-unit',
        productId: 'product-1',
        presentationUnitId: 'unit-box',
        conversionFactor: 10,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'conversion-retained',
        productId: 'product-1',
        presentationUnitId: 'unit-pack',
        conversionFactor: 20,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'conversion-removed',
        productId: 'product-1',
        presentationUnitId: 'unit-case',
        conversionFactor: 30,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useReconcileProductEditMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        productId: 'product-1',
        productDelta: { name: 'Producto actualizado' },
        initialConversions,
        currentConversions: [
          {
            id: 'conversion-changed-unit',
            presentationUnitId: 'unit-bottle',
            conversionFactor: 11,
          },
          {
            id: 'conversion-retained',
            presentationUnitId: 'unit-pack',
            conversionFactor: 25,
          },
          { presentationUnitId: 'unit-pallet', conversionFactor: 40 },
        ],
      });
    });

    expect(invocationOrder).toEqual([
      'delete:conversion-changed-unit',
      'delete:conversion-removed',
      'update:product',
      'update:conversion-retained',
      'create:unit-bottle',
      'create:unit-pallet',
    ]);
  });
});
