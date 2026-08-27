import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PurchaseOrderCreatePage } from './PurchaseOrderCreatePage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as mutationsHook from '@/features/purchase-orders/hooks/use-purchase-order-mutations';
import * as api from '@/features/purchase-orders/api/purchase-orders.api';
import * as suppliersHook from '@/features/suppliers/hooks/use-suppliers-query';
import * as purchaseOrdersHook from '@/features/purchase-orders/hooks/use-purchase-orders-query';

const mockNavigate = vi.fn();
const mockHistoryBack = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useRouter: () => ({
    history: { back: mockHistoryBack },
  }),
}));

vi.mock('@/features/purchase-orders/hooks/use-purchase-order-mutations');
vi.mock('@/features/purchase-orders/api/purchase-orders.api');
vi.mock('@/features/suppliers/hooks/use-suppliers-query');
vi.mock('@/features/purchase-orders/hooks/use-purchase-orders-query');

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PurchaseOrderCreatePage', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(mutationsHook, 'useCreatePurchaseOrderMutation').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);

    vi.spyOn(suppliersHook, 'useSuppliersQuery').mockReturnValue({
      data: {
        data: [
          {
            id: '11111111-1111-4111-a111-111111111111',
            businessName: 'Proveedor 3M',
            cuit: '30-12345678-9',
            isActive: true,
          },
        ],
      },
    } as any);

    vi.spyOn(purchaseOrdersHook, 'useSupplierProductsInfiniteQuery').mockReturnValue({
      data: {
        pages: [
          {
            data: [
              {
                id: '22222222-2222-4222-a222-222222222222',
                productId: '33333333-3333-4333-a333-333333333333',
                supplierExternalCode: '3M-MIC-01',
                purchaseUnitId: '44444444-4444-4444-a444-444444444444',
                conversionFactorToBase: 12,
                usualCostNet: 1500,
                product: {
                  id: '33333333-3333-4333-a333-333333333333',
                  internalCode: 'P0001',
                  name: 'Cinta 3M',
                  baseUnit: { symbol: 'UN' },
                },
                purchaseUnit: { name: 'Caja x 12', symbol: 'CJA' },
              },
            ],
            meta: { total: 1, hasNextPage: false },
          },
        ],
      },
    } as any);
  });

  it('handles Save Draft successfully and navigates to detail', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'new-po-1', orderNumber: 'OC-000010' });

    renderWithClient(<PurchaseOrderCreatePage />);

    // 1. Select supplier
    fireEvent.focus(screen.getByPlaceholderText(/Buscar proveedor activo/));
    await waitFor(() => expect(screen.getByText('Proveedor 3M')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Proveedor 3M'));

    // 2. Add item
    fireEvent.focus(screen.getByPlaceholderText(/Buscar en catálogo del proveedor/));
    await waitFor(() => expect(screen.getByText('Cinta 3M')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cinta 3M'));

    // 3. Click Guardar Borrador
    fireEvent.click(screen.getByRole('button', { name: /Guardar Borrador/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/purchases/orders/$id',
        params: { id: 'new-po-1' },
      });
    });
  });

  it('handles composite Save and Emit: navigates to detail even if emit fails after creation', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'new-po-2', orderNumber: 'OC-000011' });
    vi.spyOn(api, 'emitPurchaseOrderApi').mockRejectedValueOnce({
      response: { status: 409, data: { message: 'Stock conflict' } },
    });
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithClient(<PurchaseOrderCreatePage />);

    // Select supplier & add product
    fireEvent.focus(screen.getByPlaceholderText(/Buscar proveedor activo/));
    await waitFor(() => expect(screen.getByText('Proveedor 3M')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Proveedor 3M'));

    fireEvent.focus(screen.getByPlaceholderText(/Buscar en catálogo del proveedor/));
    await waitFor(() => expect(screen.getByText('Cinta 3M')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cinta 3M'));

    // Click Guardar y Emitir
    fireEvent.click(screen.getByRole('button', { name: /Guardar y Emitir/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/purchases/orders/$id',
        params: { id: 'new-po-2' },
      });
    });
  });
});
