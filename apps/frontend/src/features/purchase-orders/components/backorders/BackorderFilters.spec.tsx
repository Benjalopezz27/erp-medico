import { act, fireEvent, render, screen } from '@testing-library/react';
import { BackorderFilters } from './BackorderFilters';
import * as suppliersHook from '@/features/suppliers/hooks/use-suppliers-query';

vi.mock('@/features/suppliers/hooks/use-suppliers-query');

describe('BackorderFilters', () => {
  beforeEach(() => {
    vi.spyOn(suppliersHook, 'useSuppliersQuery').mockReturnValue({
      data: {
        data: [
          { id: 'supplier-active', businessName: 'Proveedor Activo', isActive: true },
          { id: 'supplier-inactive', businessName: 'Proveedor Histórico', isActive: false },
        ],
      },
    } as any);
  });

  it('includes inactive suppliers, debounces search and toggles urgent filter', () => {
    vi.useFakeTimers();
    const onSearchChange = vi.fn();
    const onUrgentOnlyChange = vi.fn();
    render(
      <BackorderFilters
        onSearchChange={onSearchChange}
        onSupplierChange={vi.fn()}
        onUrgentOnlyChange={onUrgentOnlyChange}
        onReset={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('option', { name: 'Proveedor Histórico (inactivo)' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar mercadería pendiente' }), {
      target: { value: 'gasa' },
    });
    act(() => vi.advanceTimersByTime(300));
    expect(onSearchChange).toHaveBeenCalledWith('gasa');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Solo urgentes' }));
    expect(onUrgentOnlyChange).toHaveBeenCalledWith(true);
  });
});
