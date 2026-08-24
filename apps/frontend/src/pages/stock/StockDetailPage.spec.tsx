import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockDetailPage } from './StockDetailPage';
import * as routerModule from '@tanstack/react-router';
import * as movementsHook from '@/features/stock/hooks/use-stock-movements-query';
import * as evolutionHook from '@/features/stock/hooks/use-stock-evolution-query';
import { StockStatus, ProductStatus, StockMovementType } from '@/features/stock/types/stock.types';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
  useParams: vi.fn(),
  useSearch: vi.fn(),
}));

vi.mock('@/features/stock/hooks/use-stock-movements-query', () => ({
  useStockMovementsQuery: vi.fn(),
}));

vi.mock('@/features/stock/hooks/use-stock-evolution-query', () => ({
  useStockEvolutionQuery: vi.fn(),
}));

vi.mock('recharts', async () => {
  const original = await vi.importActual<any>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

describe('StockDetailPage Component', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(routerModule.useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(routerModule.useParams).mockReturnValue({ productId: 'prod-1' });
    vi.mocked(routerModule.useSearch).mockReturnValue({ page: 1, limit: 10 });
  });

  it('renders product header, chart, and movements table', () => {
    vi.mocked(movementsHook.useStockMovementsQuery).mockReturnValue({
      data: {
        product: {
          productId: 'prod-1',
          internalCode: 'P0001',
          productName: 'Suero Fisiológico 1L',
          status: ProductStatus.ACTIVE,
          category: { id: 'cat-1', name: 'Soluciones' },
          baseUnit: { id: 'unit-1', name: 'Botella', symbol: 'Bot.' },
          currentBaseStock: 45,
          minStock: 100,
          stockStatus: StockStatus.LOW,
        },
        items: [
          {
            id: 'mov-1',
            movementType: StockMovementType.ENTRADA_COMPRA,
            quantityBase: 50,
            previousStock: 0,
            subsequentStock: 50,
            reason: 'Compra inicial',
            documentReference: 'REM-100',
            user: { id: 'usr-1', name: 'Admin' },
            createdAt: '2026-08-24T12:00:00.000Z',
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.mocked(evolutionHook.useStockEvolutionQuery).mockReturnValue({
      data: {
        productId: 'prod-1',
        minStock: 100,
        truncated: false,
        points: [
          {
            timestamp: '2026-08-24T12:00:00.000Z',
            balance: 0,
            event: 'BASELINE',
            quantity: 0,
          },
          {
            timestamp: '2026-08-24T12:00:00.000Z',
            balance: 50,
            event: StockMovementType.ENTRADA_COMPRA,
            quantity: 50,
          },
        ],
      },
      isLoading: false,
    } as any);

    render(<StockDetailPage />);

    expect(screen.getByText('Suero Fisiológico 1L')).toBeInTheDocument();
    expect(screen.getByText('Bajo')).toBeInTheDocument();
    expect(screen.getByText('Evolución Histórica de Stock')).toBeInTheDocument();
    expect(screen.getByText('Entrada Compra')).toBeInTheDocument();
  });
});
