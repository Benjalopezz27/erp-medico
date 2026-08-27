import { render, screen, fireEvent } from '@testing-library/react';
import { PurchaseOrderPagination } from './PurchaseOrderPagination';

describe('PurchaseOrderPagination', () => {
  const defaultProps = {
    page: 2,
    limit: 10,
    total: 25,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: true,
    onPageChange: vi.fn(),
    onLimitChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pagination details correctly', () => {
    render(<PurchaseOrderPagination {...defaultProps} />);

    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getAllByText('20').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText(/Página 2 de 3/)).toBeInTheDocument();
  });

  it('calls onPageChange when clicking next or previous buttons', () => {
    render(<PurchaseOrderPagination {...defaultProps} />);

    const prevBtn = screen.getByLabelText('Página anterior');
    const nextBtn = screen.getByLabelText('Página siguiente');

    fireEvent.click(prevBtn);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextBtn);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables previous button on first page and next button on last page', () => {
    render(
      <PurchaseOrderPagination
        {...defaultProps}
        page={1}
        hasPreviousPage={false}
        hasNextPage={false}
      />,
    );

    expect(screen.getByLabelText('Página anterior')).toBeDisabled();
    expect(screen.getByLabelText('Página siguiente')).toBeDisabled();
  });

  it('triggers onLimitChange when selecting new limit', () => {
    render(<PurchaseOrderPagination {...defaultProps} />);

    const select = screen.getByLabelText('Filas por página');
    fireEvent.change(select, { target: { value: '20' } });

    expect(defaultProps.onLimitChange).toHaveBeenCalledWith(20);
  });
});
