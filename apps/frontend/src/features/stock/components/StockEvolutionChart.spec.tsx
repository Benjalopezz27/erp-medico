import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockEvolutionChart } from './StockEvolutionChart';
import { StockMovementType } from '../types/stock.types';

// Mock Recharts ResponsiveContainer to have non-zero dimensions in jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual<any>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

describe('StockEvolutionChart Component', () => {
  it('renders loading state when isLoading is true', () => {
    render(
      <StockEvolutionChart
        points={[]}
        minStock={50}
        truncated={false}
        baseUnitSymbol="u"
        currentStock={0}
        isLoading={true}
      />,
    );

    expect(screen.getByTestId('stock-evolution-loading')).toBeInTheDocument();
  });

  it('renders empty state when points array is empty with calculated balance', () => {
    render(
      <StockEvolutionChart
        points={[]}
        minStock={50}
        truncated={false}
        baseUnitSymbol="Bot."
        currentStock={45}
        isLoading={false}
      />,
    );

    expect(screen.getByTestId('stock-evolution-empty')).toBeInTheDocument();
    expect(screen.getByText(/sin movimientos registrados/i)).toBeInTheDocument();
    expect(screen.getByText(/45,00 Bot./i)).toBeInTheDocument();
  });

  it('renders chart with data and shows truncated badge when truncated is true', () => {
    const mockPoints = [
      {
        timestamp: '2026-08-20T10:00:00.000Z',
        balance: 0,
        event: 'BASELINE' as const,
        quantity: 0,
      },
      {
        timestamp: '2026-08-20T10:00:00.000Z',
        balance: 50,
        event: StockMovementType.ENTRADA_COMPRA,
        quantity: 50,
      },
      {
        timestamp: '2026-08-22T12:00:00.000Z',
        balance: 40,
        event: StockMovementType.SALIDA_VENTA,
        quantity: 10,
      },
    ];

    render(
      <StockEvolutionChart
        points={mockPoints}
        minStock={50}
        truncated={true}
        baseUnitSymbol="u"
        currentStock={40}
      />,
    );

    expect(screen.getByTestId('stock-evolution-chart')).toBeInTheDocument();
    expect(screen.getByTestId('stock-evolution-truncated-badge')).toBeInTheDocument();
    expect(screen.getByText(/mostrando últimos 2 movimientos/i)).toBeInTheDocument();
  });
});
