import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StockMovementsFilters } from './StockMovementsFilters';
import { StockMovementType } from '../types/stock.types';

describe('StockMovementsFilters Component', () => {
  it('renders movement type select, from date, and to date inputs', () => {
    render(
      <StockMovementsFilters
        filters={{ page: 1, limit: 10 }}
        onFilterChange={vi.fn()}
        onResetFilters={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/filtrar por tipo de movimiento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha desde/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha hasta/i)).toBeInTheDocument();
  });

  it('calls onFilterChange when movement type is changed', () => {
    const handleFilterChange = vi.fn();
    render(
      <StockMovementsFilters
        filters={{ page: 1, limit: 10 }}
        onFilterChange={handleFilterChange}
        onResetFilters={vi.fn()}
      />,
    );

    const typeSelect = screen.getByLabelText(/filtrar por tipo de movimiento/i);
    fireEvent.change(typeSelect, {
      target: { value: StockMovementType.SALIDA_VENTA },
    });

    expect(handleFilterChange).toHaveBeenCalledWith({
      movementType: StockMovementType.SALIDA_VENTA,
      page: 1,
    });
  });

  it('converts local dates to ISO strings when from and to date inputs are changed', () => {
    const handleFilterChange = vi.fn();
    render(
      <StockMovementsFilters
        filters={{ page: 1, limit: 10 }}
        onFilterChange={handleFilterChange}
        onResetFilters={vi.fn()}
      />,
    );

    const fromInput = screen.getByLabelText(/fecha desde/i);
    fireEvent.change(fromInput, { target: { value: '2026-08-15' } });

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        from: expect.any(String),
      }),
    );
  });
});
