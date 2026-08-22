import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductStatus } from '@erp/shared-types';
import { ProductFilters } from './ProductFilters';
import type { ICategory } from '../types/products.types';

describe('ProductFilters', () => {
  const mockCategories: ICategory[] = [
    { id: 'cat-1', name: 'Medicamentos', createdAt: '', updatedAt: '' },
    { id: 'cat-2', name: 'Descartables', createdAt: '', updatedAt: '' },
  ];

  it('renders filter controls correctly', () => {
    render(
      <ProductFilters
        onSearchChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onStatusChange={vi.fn()}
        onResetFilters={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.getByLabelText('Buscar en el catálogo')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por categoría')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por estado')).toBeInTheDocument();
    expect(screen.queryByText('Limpiar filtros')).not.toBeInTheDocument();
  });

  it('triggers onSearchChange when typing search text after debounce', async () => {
    const user = userEvent.setup();
    const handleSearchChange = vi.fn();

    render(
      <ProductFilters
        onSearchChange={handleSearchChange}
        onCategoryChange={vi.fn()}
        onStatusChange={vi.fn()}
        onResetFilters={vi.fn()}
      />,
    );

    const searchInput = screen.getByLabelText('Buscar en el catálogo');
    await user.type(searchInput, 'Amoxi');

    await waitFor(() => {
      expect(handleSearchChange).toHaveBeenCalledWith('Amoxi');
    });
  });

  it('triggers onCategoryChange when selecting a category', async () => {
    const user = userEvent.setup();
    const handleCategoryChange = vi.fn();

    render(
      <ProductFilters
        onSearchChange={vi.fn()}
        onCategoryChange={handleCategoryChange}
        onStatusChange={vi.fn()}
        onResetFilters={vi.fn()}
        categories={mockCategories}
      />,
    );

    const categorySelect = screen.getByLabelText('Filtrar por categoría');
    await user.selectOptions(categorySelect, 'cat-1');

    expect(handleCategoryChange).toHaveBeenCalledWith('cat-1');
  });

  it('triggers onStatusChange when selecting a status', async () => {
    const user = userEvent.setup();
    const handleStatusChange = vi.fn();

    render(
      <ProductFilters
        onSearchChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onStatusChange={handleStatusChange}
        onResetFilters={vi.fn()}
      />,
    );

    const select = screen.getByLabelText('Filtrar por estado');
    await user.selectOptions(select, ProductStatus.ACTIVE);

    expect(handleStatusChange).toHaveBeenCalledWith(ProductStatus.ACTIVE);
  });

  it('shows reset button when any filter is active and triggers onResetFilters', async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();

    render(
      <ProductFilters
        search="Ibu"
        onSearchChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onStatusChange={vi.fn()}
        onResetFilters={handleReset}
      />,
    );

    const resetBtn = screen.getByText('Limpiar filtros');
    expect(resetBtn).toBeInTheDocument();

    await user.click(resetBtn);
    expect(handleReset).toHaveBeenCalled();
  });
});
