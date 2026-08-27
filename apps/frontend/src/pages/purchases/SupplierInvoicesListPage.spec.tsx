import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { SupplierInvoiceStatus } from '@/features/supplier-invoices/types/supplier-invoices.types';
import { SupplierInvoicesListPage } from './SupplierInvoicesListPage';

vi.mock('@/features/supplier-invoices/hooks/use-supplier-invoices', () => ({
  useSupplierInvoicesQuery: (filters: { status?: SupplierInvoiceStatus }) => ({
    data: {
      data: [],
      meta: {
        total: filters.status === SupplierInvoiceStatus.OBSERVADA ? 3 : 0,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/features/purchase-orders/components/PurchasesNavigationTabs', () => ({
  PurchasesNavigationTabs: () => null,
}));
vi.mock('@/features/supplier-invoices/components/SupplierInvoiceFilters', () => ({
  SupplierInvoiceFilters: () => null,
}));
vi.mock('@/features/supplier-invoices/components/SupplierInvoicesTable', () => ({
  SupplierInvoicesTable: () => null,
}));

describe('SupplierInvoicesListPage observed summary', () => {
  it('shows the global count and applies the canonical observed filter', async () => {
    const router = createTestRouter(
      [{ path: '/purchases/supplier-invoices', component: SupplierInvoicesListPage }],
      '/purchases/supplier-invoices',
      'app',
    );
    const { user } = renderWithRouter({ router });
    const summary = await screen.findByRole('button', { name: /Facturas observadas/ });
    expect(summary).toHaveTextContent('3');
    await user.click(summary);
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        status: SupplierInvoiceStatus.OBSERVADA,
      }),
    );
  });
});
