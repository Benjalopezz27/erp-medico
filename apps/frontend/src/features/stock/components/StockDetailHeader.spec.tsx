import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { StockDetailHeader } from './StockDetailHeader';
import { StockStatus, ProductStatus } from '../types/stock.types';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@erp/shared-types';

async function render(ui: React.ReactElement) {
  const router = createTestRouter([{ path: '/', component: () => ui }] as never, '/');
  renderWithRouter({ router });
  await screen.findByText('P0001');
}

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

  beforeEach(() => {
    useAuthStore.setState(useAuthStore.getInitialState(), true);
  });

  it('renders product details and balance numbers correctly', async () => {
    await render(<StockDetailHeader product={mockProduct} />);

    expect(screen.getByText('P0001')).toBeInTheDocument();
    expect(screen.getByText('Suero Fisiológico 1L')).toBeInTheDocument();
    expect(screen.getByText('Soluciones')).toBeInTheDocument();
    expect(screen.getByText('Bajo')).toBeInTheDocument();
    expect(screen.getByText(/45,00/i)).toBeInTheDocument();
    expect(screen.getByText(/100,00/i)).toBeInTheDocument();
  });

  it('links back to the stock list', async () => {
    await render(<StockDetailHeader product={mockProduct} />);

    expect(screen.getByRole('link', { name: /volver a stock/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/stock'),
    );
  });

  it('displays inactive warning banner when product status is INACTIVE and hides adjustment button', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'token',
      user: {
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@erp.com',
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      },
    });

    await render(
      <StockDetailHeader
        product={{ ...mockProduct, status: ProductStatus.INACTIVE }}

        onOpenAdjustment={vi.fn()}
      />,
    );

    expect(screen.getByTestId('stock-inactive-banner')).toBeInTheDocument();
    expect(screen.getByText(/este producto está/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar ajuste/i })).not.toBeInTheDocument();
  });

  it('shows adjustment button for administrators on active product', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'token',
      user: {
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@erp.com',
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      },
    });

    const handleOpenAdjustment = vi.fn();
    await render(
      <StockDetailHeader
        product={mockProduct}

        onOpenAdjustment={handleOpenAdjustment}
      />,
    );

    const adjustBtn = screen.getByRole('button', {
      name: /registrar ajuste de stock/i,
    });
    expect(adjustBtn).toBeInTheDocument();
    fireEvent.click(adjustBtn);
    expect(handleOpenAdjustment).toHaveBeenCalled();
  });

  it('hides adjustment button for sellers', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'token',
      user: {
        id: 'seller-1',
        name: 'Seller',
        email: 'seller@erp.com',
        role: UserRole.VENDEDOR,
        isActive: true,
      },
    });

    await render(<StockDetailHeader product={mockProduct} onOpenAdjustment={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: /registrar ajuste de stock/i }),
    ).not.toBeInTheDocument();
  });
});
