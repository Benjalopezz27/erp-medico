import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductPagination } from './ProductPagination';

describe('ProductPagination', () => {
  const meta = {
    total: 45,
    page: 2,
    limit: 10,
    totalPages: 5,
    hasNextPage: true,
    hasPreviousPage: true,
  };

  it('renders pagination details correctly', () => {
    render(<ProductPagination meta={meta} onPageChange={vi.fn()} onLimitChange={vi.fn()} />);

    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('triggers onPageChange on next and previous button clicks', async () => {
    const user = userEvent.setup();
    const handlePageChange = vi.fn();

    render(
      <ProductPagination meta={meta} onPageChange={handlePageChange} onLimitChange={vi.fn()} />,
    );

    const prevBtn = screen.getByLabelText('Página anterior');
    const nextBtn = screen.getByLabelText('Página siguiente');

    await user.click(prevBtn);
    expect(handlePageChange).toHaveBeenCalledWith(1);

    await user.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it('disables previous button on first page and next button on last page', () => {
    const { rerender } = render(
      <ProductPagination
        meta={{ ...meta, page: 1, hasPreviousPage: false }}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Página anterior')).toBeDisabled();
    expect(screen.getByLabelText('Página siguiente')).not.toBeDisabled();

    rerender(
      <ProductPagination
        meta={{ ...meta, page: 5, hasNextPage: false }}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Página siguiente')).toBeDisabled();
  });

  it('triggers onLimitChange when selecting another page size', async () => {
    const user = userEvent.setup();
    const handleLimitChange = vi.fn();

    render(
      <ProductPagination meta={meta} onPageChange={vi.fn()} onLimitChange={handleLimitChange} />,
    );

    const select = screen.getByLabelText('Productos por página');
    await user.selectOptions(select, '25');

    expect(handleLimitChange).toHaveBeenCalledWith(25);
  });
});
