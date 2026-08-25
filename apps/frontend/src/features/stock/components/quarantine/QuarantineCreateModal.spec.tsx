import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuarantineCreateModal } from './QuarantineCreateModal';
import * as productHooks from '@/features/products/hooks/use-product-search-query';
import * as quarantineHooks from '../../hooks/use-quarantine';

vi.mock('@/features/products/hooks/use-product-search-query', () => ({
  useProductSearchQuery: vi.fn(),
}));

vi.mock('../../hooks/use-quarantine', () => ({
  useCreateQuarantineMutation: vi.fn(),
}));

describe('QuarantineCreateModal Component', () => {
  const mockMutate = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(quarantineHooks.useCreateQuarantineMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);

    vi.mocked(productHooks.useProductSearchQuery).mockReturnValue({
      data: [
        {
          id: 'p1',
          name: 'Amoxicilina 500mg',
          internalCode: 'P-001',
          baseUnit: { id: 'u1', name: 'Comprimido', symbol: 'cmp' },
        },
      ],
      isLoading: false,
    } as any);
  });

  it('renders nothing when closed', () => {
    const { container } = render(<QuarantineCreateModal isOpen={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('validates product selection, quantity, and reason', async () => {
    render(<QuarantineCreateModal isOpen={true} onClose={onClose} />);

    // Try submit empty
    fireEvent.submit(screen.getByTestId('quarantine-create-form'));
    expect(screen.getByText('Debes seleccionar un producto del catálogo.')).toBeInTheDocument();

    // Select product
    const option = screen.getByTestId('quarantine-product-option-p1');
    fireEvent.click(option);

    // Try submit without quantity
    fireEvent.submit(screen.getByTestId('quarantine-create-form'));
    expect(screen.getByText('Ingresa una cantidad válida mayor a 0.')).toBeInTheDocument();

    // Enter valid quantity but no reason
    fireEvent.change(screen.getByTestId('quarantine-quantity-input'), {
      target: { value: '10' },
    });
    fireEvent.submit(screen.getByTestId('quarantine-create-form'));
    expect(
      screen.getByText('El motivo de ingreso a cuarentena es obligatorio.'),
    ).toBeInTheDocument();

    // Enter reason and submit
    fireEvent.change(screen.getByTestId('quarantine-reason-input'), {
      target: { value: 'Cajas deterioradas por transporte' },
    });
    fireEvent.submit(screen.getByTestId('quarantine-create-form'));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        productId: 'p1',
        quantityBase: 10,
        reason: 'Cajas deterioradas por transporte',
      },
      expect.anything(),
    );
  });
});
