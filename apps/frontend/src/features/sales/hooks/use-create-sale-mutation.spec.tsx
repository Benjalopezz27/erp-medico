import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentMethod, SaleStatus, type ISale } from '@erp/shared-types';
import { productKeys } from '@/features/products/hooks/use-products-query';
import { stockKeys } from '@/features/stock/hooks/stock-keys';
import { customerPricingKeys } from '@/features/customer-pricing/hooks/customer-pricing-keys';
import * as api from '../api/sales.api';
import { salesKeys } from './sales-keys';
import { useCreateSaleMutation } from './use-create-sale-mutation';

vi.mock('../api/sales.api');

const sale = {
  id: '40000000-0000-4000-8000-000000000001',
  saleNumber: 'V-00000001',
  customerId: null,
  customer: null,
  user: { id: '50000000-0000-4000-8000-000000000001', name: 'Vendedor' },
  status: SaleStatus.CONFIRMADA,
  isCreditSale: false,
  requiresFiscalInvoice: false,
  paymentMethod: PaymentMethod.EFECTIVO,
  totalNet: '100.00',
  taxableNet: '100.00',
  exemptAmount: '0.00',
  nonTaxedAmount: '0.00',
  ivaTotal: '21.00',
  totalGross: '121.00',
  userId: '50000000-0000-4000-8000-000000000001',
  items: [],
  fiscalDocument: null,
  accountReceivable: null,
  createdAt: '2026-08-31T12:00:00Z',
  updatedAt: '2026-08-31T12:00:00Z',
} satisfies ISale;

describe('useCreateSaleMutation', () => {
  beforeEach(() => vi.mocked(api.createSaleApi).mockResolvedValue(sale));

  it('does not retry and refreshes the authoritative affected caches', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateSaleMutation(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        isCreditSale: false,
        requiresFiscalInvoice: false,
        paymentMethod: PaymentMethod.EFECTIVO,
        items: [{ productId: '30000000-0000-4000-8000-000000000001', quantityBase: 1 }],
      });
    });
    expect(queryClient.getQueryData(salesKeys.detail(sale.id))).toEqual(sale);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: salesKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: productKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockKeys.all });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: customerPricingKeys.all });
  });
});
