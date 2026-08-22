import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductConversionsGrid } from './ProductConversionsGrid';
import type { IUnit } from '../types/products.types';

describe('ProductConversionsGrid', () => {
  const mockUnits: IUnit[] = [
    { id: 'u-base', name: 'Unidad', symbol: 'u', createdAt: '', updatedAt: '' },
    { id: 'u-box', name: 'Caja', symbol: 'cj', createdAt: '', updatedAt: '' },
    { id: 'u-master', name: 'Caja Master', symbol: 'cjm', createdAt: '', updatedAt: '' },
  ];

  it('renders prompt when no base unit is selected', () => {
    render(
      <ProductConversionsGrid
        conversions={[]}
        availableUnits={mockUnits}
        baseUnitId=""
        onAddRow={vi.fn()}
        onRemoveRow={vi.fn()}
        onUpdateRow={vi.fn()}
      />,
    );

    expect(screen.getByText('Unidad Base', { selector: 'strong' })).toBeInTheDocument();
  });

  it('renders dynamic equivalence text when valid unit and factor are set', () => {
    render(
      <ProductConversionsGrid
        conversions={[{ presentationUnitId: 'u-box', conversionFactor: 100 }]}
        availableUnits={mockUnits}
        baseUnitId="u-base"
        onAddRow={vi.fn()}
        onRemoveRow={vi.fn()}
        onUpdateRow={vi.fn()}
      />,
    );

    expect(screen.getByText('1 Caja = 100 Unidad')).toBeInTheDocument();
  });

  it('triggers onAddRow when clicking Agregar Conversión', async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();

    render(
      <ProductConversionsGrid
        conversions={[]}
        availableUnits={mockUnits}
        baseUnitId="u-base"
        onAddRow={handleAdd}
        onRemoveRow={vi.fn()}
        onUpdateRow={vi.fn()}
      />,
    );

    const addBtn = screen.getByText('Agregar Conversión');
    await user.click(addBtn);
    expect(handleAdd).toHaveBeenCalled();
  });

  it('triggers onRemoveRow when clicking trash icon', async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn();

    render(
      <ProductConversionsGrid
        conversions={[{ presentationUnitId: 'u-box', conversionFactor: 100 }]}
        availableUnits={mockUnits}
        baseUnitId="u-base"
        onAddRow={vi.fn()}
        onRemoveRow={handleRemove}
        onUpdateRow={vi.fn()}
      />,
    );

    const removeBtn = screen.getByLabelText('Eliminar conversión fila 1');
    await user.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledWith(0);
  });
});
