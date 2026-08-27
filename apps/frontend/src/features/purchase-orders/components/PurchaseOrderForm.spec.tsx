import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as suppliersHook from '@/features/suppliers/hooks/use-suppliers-query';
import * as purchaseOrdersHook from '../hooks/use-purchase-orders-query';

vi.mock('@/features/suppliers/hooks/use-suppliers-query');
vi.mock('../hooks/use-purchase-orders-query');

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PurchaseOrderForm', () => {
  const mockSuppliers = [
    {
      id: '11111111-1111-4111-a111-111111111111',
      businessName: 'Proveedor 3M',
      cuit: '30-12345678-9',
      isActive: true,
    },
    {
      id: '22222222-2222-4222-a222-222222222222',
      businessName: 'Droguería Central',
      cuit: '30-98765432-1',
      isActive: true,
    },
  ];

  const mockSupplierProduct = {
    id: '33333333-3333-4333-a333-333333333333',
    productId: '44444444-4444-4444-a444-444444444444',
    supplierExternalCode: '3M-MIC-01',
    purchaseUnitId: '55555555-5555-4555-a555-555555555555',
    conversionFactorToBase: 12,
    usualCostNet: 1500,
    product: {
      id: '44444444-4444-4444-a444-444444444444',
      internalCode: 'P0001',
      name: 'Cinta Micropore 3M',
      baseUnit: { id: '66666666-6666-4666-a666-666666666666', name: 'Unidad', symbol: 'UN' },
    },
    purchaseUnit: { id: '55555555-5555-4555-a555-555555555555', name: 'Caja x 12', symbol: 'CJA' },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(suppliersHook, 'useSuppliersQuery').mockReturnValue({
      data: { data: mockSuppliers, meta: { total: 2 } },
      isLoading: false,
      isFetching: false,
      isError: false,
    } as any);

    vi.spyOn(purchaseOrdersHook, 'useSupplierProductsInfiniteQuery').mockReturnValue({
      data: {
        pages: [{ data: [mockSupplierProduct], meta: { total: 1, hasNextPage: false } }],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isError: false,
    } as any);
  });

  it('renders form and adds item from catalog', async () => {
    const onSaveDraft = vi.fn();
    renderWithClient(<PurchaseOrderForm onSaveDraft={onSaveDraft} />);

    // 1. Select supplier
    const supplierInput = screen.getByPlaceholderText(/Buscar proveedor activo/);
    fireEvent.focus(supplierInput);

    await waitFor(() => {
      expect(screen.getByText('Proveedor 3M')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Proveedor 3M'));

    // 2. Search & add product
    const productInput = screen.getByPlaceholderText(/Buscar en catálogo del proveedor/);
    fireEvent.focus(productInput);

    await waitFor(() => {
      expect(screen.getByText('Cinta Micropore 3M')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cinta Micropore 3M'));

    // 3. Verify item is in table with pre-filled usual cost
    expect(screen.getByDisplayValue('1500')).toBeInTheDocument();
  });

  it('prompts confirmation when changing supplier with existing items', async () => {
    const initialItem = {
      supplierProductId: '33333333-3333-4333-a333-333333333333',
      productId: '44444444-4444-4444-a444-444444444444',
      productInternalCode: 'P0001',
      productName: 'Cinta Micropore 3M',
      supplierSku: '3M-MIC-01',
      purchaseUnitName: 'Caja x 12',
      purchaseUnitSymbol: 'CJA',
      conversionFactorToBase: 12,
      baseUnitSymbol: 'UN',
      orderedQty: '10',
      expectedCostUnitNet: '1500',
    };

    renderWithClient(
      <PurchaseOrderForm
        initialData={{
          supplierId: '11111111-1111-4111-a111-111111111111',
          items: [initialItem],
        }}
        currentSupplier={mockSuppliers[0]}
        onSaveDraft={vi.fn()}
      />,
    );

    // Click to change supplier
    const supplierInput = screen.getByRole('combobox', {
      name: /seleccionar proveedor/i,
    });
    fireEvent.focus(supplierInput);

    await waitFor(() => {
      expect(screen.getByText('Droguería Central')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Droguería Central'));

    // Confirmation modal should appear
    expect(screen.getByText('¿Cambiar proveedor de la orden?')).toBeInTheDocument();

    // Confirm change -> items table should be cleared
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y limpiar líneas' }));

    expect(screen.getByText('No hay ítems en la orden de compra')).toBeInTheDocument();
  });
});
