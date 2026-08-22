import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductStatus } from '@erp/shared-types';
import { ProductFilters } from './ProductFilters';

describe('ProductFilters', () => {
  it('renders filter controls correctly', () => {
    render(<ProductFilters onStatusChange={vi.fn()} onResetFilters={vi.fn()} />);

    expect(screen.getByLabelText('Filtrar por estado')).toBeInTheDocument();
    expect(screen.queryByText('Limpiar filtros')).not.toBeInTheDocument();
  });

  it('triggers onStatusChange when selecting a status', async () => {
    const user = userEvent.setup();
    const handleStatusChange = vi.fn();

    render(<ProductFilters onStatusChange={handleStatusChange} onResetFilters={vi.fn()} />);

    const select = screen.getByLabelText('Filtrar por estado');
    await user.selectOptions(select, ProductStatus.ACTIVE);

    expect(handleStatusChange).toHaveBeenCalledWith(ProductStatus.ACTIVE);
  });

  it('shows reset button when status is filtered and triggers onResetFilters', async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();

    render(
      <ProductFilters
        status={ProductStatus.ACTIVE}
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
