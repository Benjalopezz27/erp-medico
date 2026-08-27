import { render, screen } from '@testing-library/react';
import React from 'react';
import { PurchaseOrdersListPage } from './PurchaseOrdersListPage';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as queryHook from '@/features/purchase-orders/hooks/use-purchase-orders-query';
import * as suppliersHook from '@/features/suppliers/hooks/use-suppliers-query';
import { PurchaseOrderStatus } from '@/features/purchase-orders/types/purchase-orders.types';

const mockNavigate = vi.fn();
const mockSearch = { page: 1, limit: 10, search: '' };

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}));

vi.mock('@/features/purchase-orders/hooks/use-purchase-orders-query');
vi.mock('@/features/suppliers/hooks/use-suppliers-query');

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PurchaseOrdersListPage', () => {
  const mockOrders = [
    {
      id: 'po-1',
      orderNumber: 'OC-000001',
      supplier: { id: 'sup-1', businessName: 'Proveedor 3M', cuit: '30-12345678-9' },
      status: PurchaseOrderStatus.BORRADOR,
      expectedDeliveryDate: null,
      notes: null,
      totalNet: '15000.0000',
      itemsCount: 3,
      user: { id: 'u-1', name: 'Admin', email: 'admin@erp.com' },
      emittedAt: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: '2026-08-20T10:00:00Z',
      updatedAt: '2026-08-20T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(suppliersHook, 'useSuppliersQuery').mockReturnValue({
      data: { data: [] },
    } as any);
    vi.spyOn(queryHook, 'usePurchaseOrdersListQuery').mockReturnValue({
      data: {
        data: mockOrders,
        meta: {
          total: 1,
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
    } as any);
  });

  it('renders title, create button, filters and orders table', () => {
    renderWithClient(<PurchaseOrdersListPage />);

    expect(screen.getByRole('heading', { name: 'Órdenes de Compra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nueva Orden de Compra/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mercadería pendiente/ })).toHaveAttribute(
      'href',
      '/purchases/backorders',
    );
    expect(screen.getByText('OC-000001')).toBeInTheDocument();
    expect(screen.getByText('Proveedor 3M')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    vi.spyOn(queryHook, 'usePurchaseOrdersListQuery').mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: { response: { status: 500, data: { message: 'DB error' } } },
      refetch: vi.fn(),
    } as any);

    renderWithClient(<PurchaseOrdersListPage />);

    expect(screen.getByText('Error al cargar las órdenes de compra')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
