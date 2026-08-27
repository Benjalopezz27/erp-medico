import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ActiveSupplierSelector } from './ActiveSupplierSelector';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as suppliersHook from '@/features/suppliers/hooks/use-suppliers-query';

vi.mock('@/features/suppliers/hooks/use-suppliers-query');

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ActiveSupplierSelector', () => {
  const mockSuppliers = [
    {
      id: 'sup-1',
      businessName: 'Proveedor 3M',
      cuit: '30-12345678-9',
      taxCondition: 'RESPONSABLE_INSCRIPTO',
      isActive: true,
    },
    {
      id: 'sup-2',
      businessName: 'Droguería Central',
      cuit: '30-98765432-1',
      taxCondition: 'RESPONSABLE_INSCRIPTO',
      isActive: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(suppliersHook, 'useSuppliersQuery').mockReturnValue({
      data: { data: mockSuppliers, meta: { total: 2 } },
      isLoading: false,
      isFetching: false,
      isError: false,
    } as any);
  });

  it('renders active suppliers list on focus and selects one', async () => {
    const onChange = vi.fn();
    renderWithClient(<ActiveSupplierSelector onChange={onChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Proveedor 3M')).toBeInTheDocument();
      expect(screen.getByText('Droguería Central')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Proveedor 3M'));
    expect(onChange).toHaveBeenCalledWith('sup-1', mockSuppliers[0]);
  });

  it('displays inactive badge when currentSupplier is inactive in edit mode', () => {
    const inactiveSupplier = {
      id: 'sup-inactive',
      businessName: 'Proveedor Viejo Inactivo',
      cuit: '30-00000000-1',
      isActive: false,
    };

    renderWithClient(
      <ActiveSupplierSelector
        value="sup-inactive"
        currentSupplier={inactiveSupplier}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Inactivo')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Proveedor Viejo Inactivo (30-00000000-1)'),
    ).toBeInTheDocument();
  });
});
