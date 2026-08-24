import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockMovementsTable } from './StockMovementsTable';
import { StockMovementType } from '../types/stock.types';

describe('StockMovementsTable Component', () => {
  const mockMovements = [
    {
      id: 'mov-1',
      movementType: StockMovementType.ENTRADA_COMPRA,
      quantityBase: 50,
      previousStock: 10,
      subsequentStock: 60,
      reason: 'Compra de reposición',
      documentReference: 'REM-12345',
      user: { id: 'usr-1', name: 'Admin General' },
      createdAt: '2026-08-24T12:00:00.000Z',
    },
    {
      id: 'mov-2',
      movementType: StockMovementType.SALIDA_VENTA,
      quantityBase: 20,
      previousStock: 60,
      subsequentStock: 40,
      reason: 'Venta por mostrador',
      documentReference: 'FAC-9999',
      user: { id: 'usr-2', name: 'Vendedor Juan' },
      createdAt: '2026-08-24T14:30:00.000Z',
    },
  ];

  it('renders loading state when isLoading is true', () => {
    render(
      <StockMovementsTable
        items={[]}
        baseUnitSymbol="u"
        isLoading={true}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByTestId('stock-movements-loading')).toBeInTheDocument();
  });

  it('renders movements rows with formatted quantities, signs, and reasons', () => {
    render(
      <StockMovementsTable
        items={mockMovements}
        baseUnitSymbol="u"
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('Entrada Compra')).toBeInTheDocument();
    expect(screen.getByText('Salida Venta')).toBeInTheDocument();
    expect(screen.getByText(/Compra de reposición/i)).toBeInTheDocument();
    expect(screen.getByText(/Venta por mostrador/i)).toBeInTheDocument();
    expect(screen.getByText('REM-12345')).toBeInTheDocument();
    expect(screen.getByText('Admin General')).toBeInTheDocument();
    expect(screen.getByText('Vendedor Juan')).toBeInTheDocument();
  });
});
