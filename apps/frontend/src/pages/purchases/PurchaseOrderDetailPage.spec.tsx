import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PurchaseOrderDetailPage } from './PurchaseOrderDetailPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as queryHook from '@/features/purchase-orders/hooks/use-purchase-orders-query';
import * as mutationsHook from '@/features/purchase-orders/hooks/use-purchase-order-mutations';
import * as suppliersHook from '@/features/suppliers/hooks/use-suppliers-query';
import * as receiptsHook from '@/features/purchase-orders/hooks/use-goods-receipts-query';
import { PurchaseOrderStatus } from '@/features/purchase-orders/types/purchase-orders.types';

const mockNavigate = vi.fn();
const mockHistoryBack = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useParams: () => ({ id: '11111111-1111-4111-a111-111111111111' }),
  useNavigate: () => mockNavigate,

  useRouter: () => ({
    history: { back: mockHistoryBack },
  }),
  useSearch: () => ({ edit: false }),
}));

vi.mock('@/features/purchase-orders/hooks/use-purchase-orders-query');
vi.mock('@/features/purchase-orders/hooks/use-purchase-order-mutations');
vi.mock('@/features/suppliers/hooks/use-suppliers-query');
vi.mock('@/features/purchase-orders/hooks/use-goods-receipts-query');

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PurchaseOrderDetailPage', () => {
  const mockOrder: any = {
    id: '11111111-1111-4111-a111-111111111111',
    orderNumber: 'OC-000001',
    supplier: {
      id: '22222222-2222-4222-a222-222222222222',
      businessName: 'Proveedor 3M',
      cuit: '30-12345678-9',
    },
    status: PurchaseOrderStatus.BORRADOR,
    expectedDeliveryDate: '2026-09-01',
    notes: 'Entregar por la tarde',
    totalNet: '15000.0000',
    itemsCount: 1,
    user: { id: 'u-1', name: 'Admin Master', email: 'admin@erp.com' },
    emittedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
    items: [
      {
        id: '33333333-3333-4333-a333-333333333333',
        itemIndex: 0,
        supplierProductId: '44444444-4444-4444-a444-444444444444',
        productId: '55555555-5555-4555-a555-555555555555',
        productCode: 'MED-001',
        productName: 'Jeringa Descartable 5ml',
        supplierSku: 'JER-5ML',
        purchaseUnitId: '66666666-6666-4666-a666-666666666666',
        purchaseUnitName: 'Caja x 100',
        purchaseUnitSymbol: 'CJA',
        conversionFactor: '100.0000',
        orderedQty: '10.0000',
        receivedQty: '0.0000',
        pendingQty: '10.0000',
        expectedCostUnitNet: '1500.0000',
        subtotalNet: '15000.0000',
      },
    ],
  };

  const mockEmitMutateAsync = vi.fn();
  const mockCancelMutateAsync = vi.fn();
  const mockUpdateMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(queryHook, 'usePurchaseOrderDetailQuery').mockReturnValue({
      data: mockOrder,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(mutationsHook, 'useEmitPurchaseOrderMutation').mockReturnValue({
      mutateAsync: mockEmitMutateAsync,
      isPending: false,
    } as any);

    vi.spyOn(mutationsHook, 'useCancelPurchaseOrderMutation').mockReturnValue({
      mutateAsync: mockCancelMutateAsync,
      isPending: false,
    } as any);

    vi.spyOn(mutationsHook, 'useUpdatePurchaseOrderMutation').mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    } as any);

    vi.spyOn(suppliersHook, 'useSuppliersQuery').mockReturnValue({
      data: { data: [mockOrder.supplier] },
    } as any);

    vi.spyOn(queryHook, 'useSupplierProductsInfiniteQuery').mockReturnValue({
      data: { pages: [{ data: [] }] },
    } as any);

    vi.spyOn(receiptsHook, 'useGoodsReceiptsQuery').mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);
  });

  it('renders order detail with snapshots, supplier info, and draft actions', () => {
    renderWithClient(<PurchaseOrderDetailPage />);

    expect(screen.getByRole('heading', { name: 'OC-000001' })).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(screen.getByText('Proveedor 3M')).toBeInTheDocument();
    expect(screen.getByText('Admin Master')).toBeInTheDocument();
    expect(screen.getByText('Jeringa Descartable 5ml')).toBeInTheDocument();
    expect(screen.getAllByText('$ 15.000,00').length).toBeGreaterThanOrEqual(1);

    // Draft actions
    expect(screen.getByRole('button', { name: /Editar Borrador/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Emitir Orden/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar Orden/i })).toBeInTheDocument();
  });

  it('opens emit modal and emits order', async () => {
    renderWithClient(<PurchaseOrderDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: /Emitir Orden/i }));
    expect(screen.getByText('¿Emitir Orden de Compra OC-000001?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Emisión' }));

    await waitFor(() => {
      expect(mockEmitMutateAsync).toHaveBeenCalledWith('11111111-1111-4111-a111-111111111111');
    });
  });

  it('opens cancel modal and cancels order with reason', async () => {
    renderWithClient(<PurchaseOrderDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: /Cancelar Orden/i }));
    expect(screen.getByText('¿Cancelar Orden de Compra OC-000001?')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Ej: Pedido duplicado/);
    fireEvent.change(textarea, { target: { value: 'Cancelada por error' } });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Cancelación' }));

    await waitFor(() => {
      expect(mockCancelMutateAsync).toHaveBeenCalledWith({
        id: '11111111-1111-4111-a111-111111111111',
        payload: { cancelReason: 'Cancelada por error' },
      });
    });
  });

  it('toggles in-place edit mode and saves draft changes', async () => {
    renderWithClient(<PurchaseOrderDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: /Editar Borrador/i }));

    expect(screen.getByText(/Está editando el borrador/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar Cambios/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalled();
    });
  });

  it('enables goods receipt navigation for emitted orders', () => {
    vi.spyOn(queryHook, 'usePurchaseOrderDetailQuery').mockReturnValue({
      data: { ...mockOrder, status: PurchaseOrderStatus.EMITIDA },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    renderWithClient(<PurchaseOrderDetailPage />);
    expect(screen.getByRole('link', { name: /Registrar Recepción/i })).toHaveAttribute(
      'href',
      '/purchases/orders/$id/receive',
    );
    expect(screen.getByRole('heading', { name: 'Historial de recepciones' })).toBeInTheDocument();
  });
});
