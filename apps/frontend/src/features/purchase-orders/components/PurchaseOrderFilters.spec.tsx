import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PurchaseOrderFilters } from './PurchaseOrderFilters';
import { PurchaseOrderStatus } from '../types/purchase-orders.types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/features/suppliers/hooks/use-suppliers-query', () => ({
  useSuppliersQuery: () => ({
    data: {
      data: [
        { id: 'sup-1', businessName: 'Proveedor 3M' },
        { id: 'sup-2', businessName: 'Droguería Central' },
      ],
    },
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PurchaseOrderFilters', () => {
  const defaultProps = {
    search: '',
    onSearchChange: vi.fn(),
    onSupplierChange: vi.fn(),
    onStatusChange: vi.fn(),
    onDateFromChange: vi.fn(),
    onDateToChange: vi.fn(),
    onResetFilters: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debounces search input changes', async () => {
    renderWithClient(<PurchaseOrderFilters {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar por N° OC o proveedor...');
    fireEvent.change(searchInput, { target: { value: 'OC-0001' } });

    await waitFor(() => {
      expect(defaultProps.onSearchChange).toHaveBeenCalledWith('OC-0001');
    });
  });

  it('triggers onSupplierChange on select', () => {
    renderWithClient(<PurchaseOrderFilters {...defaultProps} />);

    const select = screen.getByLabelText('Filtrar por proveedor');
    fireEvent.change(select, { target: { value: 'sup-1' } });

    expect(defaultProps.onSupplierChange).toHaveBeenCalledWith('sup-1');
  });

  it('triggers onStatusChange on select', () => {
    renderWithClient(<PurchaseOrderFilters {...defaultProps} />);

    const select = screen.getByLabelText('Filtrar por estado');
    fireEvent.change(select, { target: { value: PurchaseOrderStatus.EMITIDA } });

    expect(defaultProps.onStatusChange).toHaveBeenCalledWith(PurchaseOrderStatus.EMITIDA);
  });

  it('triggers onDateFromChange and onDateToChange', () => {
    renderWithClient(<PurchaseOrderFilters {...defaultProps} />);

    const fromInput = screen.getByLabelText('Fecha de creación desde');
    fireEvent.change(fromInput, { target: { value: '2026-08-01' } });
    expect(defaultProps.onDateFromChange).toHaveBeenCalledWith('2026-08-01');

    const toInput = screen.getByLabelText('Fecha de creación hasta');
    fireEvent.change(toInput, { target: { value: '2026-08-31' } });
    expect(defaultProps.onDateToChange).toHaveBeenCalledWith('2026-08-31');
  });

  it('renders reset button when filters are active', () => {
    renderWithClient(
      <PurchaseOrderFilters
        {...defaultProps}
        search="OC-0001"
        status={PurchaseOrderStatus.BORRADOR}
      />,
    );

    const resetBtn = screen.getByRole('button', { name: /restablecer/i });
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);
    expect(defaultProps.onResetFilters).toHaveBeenCalled();
  });
});
