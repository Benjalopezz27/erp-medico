import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { StockOverviewPage } from './StockOverviewPage';
import { renderWithProviders } from '@/test/test-utils';
import * as routerModule from '@tanstack/react-router';
import * as stockHook from '@/features/stock/hooks/use-stock-query';
import * as categoriesHook from '@/features/categories/hooks/use-categories-query';
import { StockStatus, ProductStatus } from '@/features/stock/types/stock.types';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
  useSearch: vi.fn(),
}));

vi.mock('@/features/stock/hooks/use-stock-query', () => ({
  useStockQuery: vi.fn(),
}));

vi.mock('@/features/categories/hooks/use-categories-query', () => ({
  useCategoriesQuery: vi.fn(),
}));

describe('StockOverviewPage Component', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(routerModule.useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(routerModule.useSearch).mockReturnValue({ page: 1, limit: 10 });
    vi.mocked(categoriesHook.useCategoriesQuery).mockReturnValue({
      data: [{ id: 'cat-1', name: 'Descartables' }],
      isLoading: false,
    } as any);
  });

  it('renders overview header and table with items', () => {
    vi.mocked(stockHook.useStockQuery).mockReturnValue({
      data: {
        items: [
          {
            productId: 'prod-1',
            internalCode: 'P0001',
            productName: 'Catéter IV 20G',
            category: { id: 'cat-1', name: 'Descartables' },
            baseUnit: { id: 'unit-1', name: 'Unidad', symbol: 'u' },
            currentBaseStock: 0,
            minStock: 50,
            stockStatus: StockStatus.CRITICAL,
            status: ProductStatus.ACTIVE,
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

    renderWithProviders(<StockOverviewPage />);

    expect(screen.getByText('Control de Stock')).toBeInTheDocument();
    expect(screen.getByText('P0001')).toBeInTheDocument();
    expect(screen.getByText('Catéter IV 20G')).toBeInTheDocument();
    expect(screen.getByText('Crítico')).toBeInTheDocument();
  });

  it('navigates to product ledger detail on button click', () => {
    vi.mocked(stockHook.useStockQuery).mockReturnValue({
      data: {
        items: [
          {
            productId: 'prod-1',
            internalCode: 'P0001',
            productName: 'Catéter IV 20G',
            category: { id: 'cat-1', name: 'Descartables' },
            baseUnit: { id: 'unit-1', name: 'Unidad', symbol: 'u' },
            currentBaseStock: 0,
            minStock: 50,
            stockStatus: StockStatus.CRITICAL,
            status: ProductStatus.ACTIVE,
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

    renderWithProviders(<StockOverviewPage />);

    const ledgerBtn = screen.getByRole('button', {
      name: /ver ledger de catéter iv 20g/i,
    });
    fireEvent.click(ledgerBtn);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/stock/$productId',
      params: { productId: 'prod-1' },
      search: { page: 1, limit: 10 },
    });
  });
});
