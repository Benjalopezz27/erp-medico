import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StockDetailHeader } from './StockDetailHeader';
import { StockStatus, ProductStatus } from '../types/stock.types';

describe('StockDetailHeader Component', () => {
  const mockProduct = {
    productId: 'prod-1',
    internalCode: 'P0001',
    productName: 'Suero Fisiológico 1L',
    status: ProductStatus.ACTIVE,
    category: { id: 'cat-1', name: 'Soluciones' },
    baseUnit: { id: 'unit-1', name: 'Botella', symbol: 'Bot.' },
    currentBaseStock: 45,
    minStock: 100,
    stockStatus: StockStatus.LOW,
  };

  it('renders product details and balance numbers correctly', () => {
    render(<StockDetailHeader product={mockProduct} onBack={vi.fn()} />);

    expect(screen.getByText('P0001')).toBeInTheDocument();
    expect(screen.getByText('Suero Fisiológico 1L')).toBeInTheDocument();
    expect(screen.getByText('Soluciones')).toBeInTheDocument();
    expect(screen.getByText('Bajo')).toBeInTheDocument();
    expect(screen.getByText(/45,00/i)).toBeInTheDocument();
    expect(screen.getByText(/100,00/i)).toBeInTheDocument();
  });

  it('handles onBack click', () => {
    const handleBack = vi.fn();
    render(<StockDetailHeader product={mockProduct} onBack={handleBack} />);

    const backBtn = screen.getByRole('button', {
      name: /volver al inventario de stock/i,
    });
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalled();
  });

  it('displays inactive warning banner when product status is INACTIVE', () => {
    render(
      <StockDetailHeader
        product={{ ...mockProduct, status: ProductStatus.INACTIVE }}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByTestId('stock-inactive-banner')).toBeInTheDocument();
    expect(screen.getByText(/este producto está/i)).toBeInTheDocument();
  });
});
