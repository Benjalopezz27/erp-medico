import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StockOverviewFilters } from './StockOverviewFilters';
import { StockStatus } from '../types/stock.types';
import * as categoriesHook from '@/features/categories/hooks/use-categories-query';

vi.mock('@/features/categories/hooks/use-categories-query', () => ({
  useCategoriesQuery: vi.fn(),
}));

describe('StockOverviewFilters Component', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Descartables' },
    { id: 'cat-2', name: 'Soluciones' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(categoriesHook.useCategoriesQuery).mockReturnValue({
      data: mockCategories,
      isLoading: false,
    } as any);
  });

  it('renders search input, category select, status select, and alertsOnly checkbox', () => {
    render(
      <StockOverviewFilters
        filters={{ page: 1, limit: 10 }}
        onFilterChange={vi.fn()}
        onResetFilters={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText(/buscar por código o nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por categoría/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por estado de stock/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar solo productos bajo mínimo/i)).toBeInTheDocument();
  });

  it('calls onFilterChange when category or stockStatus is selected', () => {
    const handleFilterChange = vi.fn();
    render(
      <StockOverviewFilters
        filters={{ page: 1, limit: 10 }}
        onFilterChange={handleFilterChange}
        onResetFilters={vi.fn()}
      />,
    );

    const categorySelect = screen.getByLabelText(/filtrar por categoría/i);
    fireEvent.change(categorySelect, { target: { value: 'cat-2' } });
    expect(handleFilterChange).toHaveBeenCalledWith({ category: 'cat-2', page: 1 });

    const statusSelect = screen.getByLabelText(/filtrar por estado de stock/i);
    fireEvent.change(statusSelect, { target: { value: StockStatus.CRITICAL } });
    expect(handleFilterChange).toHaveBeenCalledWith({
      stockStatus: StockStatus.CRITICAL,
      alertsOnly: undefined,
      page: 1,
    });
  });

  it('toggles alertsOnly and clears stockStatus', () => {
    const handleFilterChange = vi.fn();
    render(
      <StockOverviewFilters
        filters={{ page: 1, limit: 10, stockStatus: StockStatus.NORMAL }}
        onFilterChange={handleFilterChange}
        onResetFilters={vi.fn()}
      />,
    );

    const checkbox = screen.getByLabelText(/filtrar solo productos bajo mínimo/i);
    fireEvent.click(checkbox);

    expect(handleFilterChange).toHaveBeenCalledWith({
      alertsOnly: true,
      stockStatus: undefined,
      page: 1,
    });
  });

  it('displays reset filters button when filters are active and calls onResetFilters', () => {
    const handleReset = vi.fn();
    render(
      <StockOverviewFilters
        filters={{ page: 1, limit: 10, search: 'Paracetamol' }}
        onFilterChange={vi.fn()}
        onResetFilters={handleReset}
      />,
    );

    const resetButton = screen.getByRole('button', { name: /limpiar filtros/i });
    expect(resetButton).toBeInTheDocument();
    fireEvent.click(resetButton);
    expect(handleReset).toHaveBeenCalled();
  });
});
