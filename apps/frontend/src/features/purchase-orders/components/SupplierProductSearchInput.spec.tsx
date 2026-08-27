import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SupplierProductSearchInput } from './SupplierProductSearchInput';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as queryHook from '../hooks/use-purchase-orders-query';

vi.mock('../hooks/use-purchase-orders-query');

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('SupplierProductSearchInput', () => {
  const mockProducts = [
    {
      id: 'sp-1',
      supplierExternalCode: '3M-MIC-01',
      purchaseUnitId: 'u-1',
      conversionFactorToBase: 12,
      usualCostNet: 1500,
      product: {
        id: 'p-1',
        internalCode: 'P0001',
        name: 'Cinta Micropore 3M',
        baseUnit: { id: 'bu-1', name: 'Unidad', symbol: 'UN' },
      },
      purchaseUnit: { id: 'u-1', name: 'Caja x 12', symbol: 'CJA' },
    },
    {
      id: 'sp-2',
      supplierExternalCode: '3M-MASK-02',
      purchaseUnitId: 'u-2',
      conversionFactorToBase: 20,
      usualCostNet: null, // Null usual cost
      product: {
        id: 'p-2',
        internalCode: 'P0002',
        name: 'Mascarilla N95 3M',
        baseUnit: { id: 'bu-1', name: 'Unidad', symbol: 'UN' },
      },
      purchaseUnit: { id: 'u-2', name: 'Caja x 20', symbol: 'CJA' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(queryHook, 'useSupplierProductsInfiniteQuery').mockReturnValue({
      data: {
        pages: [{ data: mockProducts, meta: { total: 2, hasNextPage: false } }],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isError: false,
    } as any);
  });

  it('renders products in dropdown on focus and triggers onSelect', async () => {
    const onSelect = vi.fn();
    renderWithClient(<SupplierProductSearchInput supplierId="sup-1" onSelect={onSelect} />);

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Cinta Micropore 3M')).toBeInTheDocument();
      expect(screen.getByText('Mascarilla N95 3M')).toBeInTheDocument();
    });

    expect(screen.getByText('Sin costo habitual')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cinta Micropore 3M'));
    expect(onSelect).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('disables item and shows "Ya agregado" if in disabledSupplierProductIds', async () => {
    renderWithClient(
      <SupplierProductSearchInput
        supplierId="sup-1"
        disabledSupplierProductIds={['sp-1']}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Ya agregado')).toBeInTheDocument();
    });
  });

  it('renders "Cargar más productos" when hasNextPage is true', async () => {
    const fetchNextPage = vi.fn();
    vi.spyOn(queryHook, 'useSupplierProductsInfiniteQuery').mockReturnValue({
      data: {
        pages: [{ data: mockProducts, meta: { total: 25, hasNextPage: true } }],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      fetchNextPage,
      isError: false,
    } as any);

    renderWithClient(<SupplierProductSearchInput supplierId="sup-1" onSelect={vi.fn()} />);

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Cargar más productos del catálogo...')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cargar más productos del catálogo...'));
    expect(fetchNextPage).toHaveBeenCalled();
  });
});
