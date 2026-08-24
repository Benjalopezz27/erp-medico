import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StockPagination } from './StockPagination';

describe('StockPagination Component', () => {
  const mockMeta = {
    total: 45,
    page: 2,
    limit: 10,
    totalPages: 5,
    hasNextPage: true,
    hasPreviousPage: true,
  };

  it('renders page information and range correctly', () => {
    render(
      <StockPagination
        meta={mockMeta}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
        entityName="productos"
      />,
    );

    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText(/Página 2 de 5/i)).toBeInTheDocument();
  });

  it('handles page navigation buttons', () => {
    const handlePageChange = vi.fn();
    render(
      <StockPagination meta={mockMeta} onPageChange={handlePageChange} onLimitChange={vi.fn()} />,
    );

    const prevButton = screen.getByRole('button', { name: /página anterior/i });
    const nextButton = screen.getByRole('button', { name: /página siguiente/i });

    fireEvent.click(prevButton);
    expect(handlePageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextButton);
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it('disables buttons at boundaries', () => {
    const boundaryMeta = {
      total: 5,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    render(<StockPagination meta={boundaryMeta} onPageChange={vi.fn()} onLimitChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /página anterior/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /página siguiente/i })).toBeDisabled();
  });
});
