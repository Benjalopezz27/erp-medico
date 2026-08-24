import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StockOverviewTable } from './StockOverviewTable';
import { StockStatus, ProductStatus } from '../types/stock.types';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@erp/shared-types';

describe('StockOverviewTable Component', () => {
  const mockItems = [
    {
      productId: 'prod-1',
      internalCode: 'P0001',
      productName: 'Paracetamol 500mg',
      category: { id: 'cat-1', name: 'Farmacia' },
      baseUnit: { id: 'unit-1', name: 'Unidad', symbol: 'u' },
      currentBaseStock: 100,
      minStock: 50,
      stockStatus: StockStatus.NORMAL,
      status: ProductStatus.ACTIVE,
    },
  ];

  beforeEach(() => {
    useAuthStore.setState(useAuthStore.getInitialState(), true);
  });

  it('renders loading state when isLoading is true', () => {
    render(
      <StockOverviewTable
        items={[]}
        isLoading={true}
        isError={false}
        onRetry={vi.fn()}
        onViewLedger={vi.fn()}
      />,
    );

    expect(screen.getByTestId('stock-overview-loading')).toBeInTheDocument();
  });

  it('renders error state when isError is true', () => {
    const handleRetry = vi.fn();
    render(
      <StockOverviewTable
        items={[]}
        isLoading={false}
        isError={true}
        errorMessage="Error de red"
        onRetry={handleRetry}
        onViewLedger={vi.fn()}
      />,
    );

    expect(screen.getByTestId('stock-overview-error')).toBeInTheDocument();
    expect(screen.getByText('Error de red')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /reintentar/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalled();
  });

  it('renders empty state when items is empty', () => {
    render(
      <StockOverviewTable
        items={[]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        onViewLedger={vi.fn()}
      />,
    );

    expect(screen.getByTestId('stock-overview-empty')).toBeInTheDocument();
    expect(screen.getByText(/no se encontraron productos/i)).toBeInTheDocument();
  });

  it('renders items list and navigates on ledger button click', () => {
    const handleViewLedger = vi.fn();
    render(
      <StockOverviewTable
        items={mockItems}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        onViewLedger={handleViewLedger}
      />,
    );

    expect(screen.getByText('P0001')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    expect(screen.getByText('Farmacia')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();

    const ledgerBtn = screen.getByRole('button', {
      name: /ver ledger de paracetamol 500mg/i,
    });
    fireEvent.click(ledgerBtn);
    expect(handleViewLedger).toHaveBeenCalledWith('prod-1');
  });

  it('shows adjustment button for administrators and triggers onOpenAdjustment', () => {
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
    render(
      <StockOverviewTable
        items={mockItems}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        onViewLedger={vi.fn()}
        onOpenAdjustment={handleOpenAdjustment}
      />,
    );

    const adjustBtn = screen.getByRole('button', {
      name: /ajustar stock de paracetamol 500mg/i,
    });
    expect(adjustBtn).toBeInTheDocument();
    fireEvent.click(adjustBtn);
    expect(handleOpenAdjustment).toHaveBeenCalledWith(mockItems[0]);
  });

  it('hides adjustment button for sellers', () => {
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

    const handleOpenAdjustment = vi.fn();
    render(
      <StockOverviewTable
        items={mockItems}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        onViewLedger={vi.fn()}
        onOpenAdjustment={handleOpenAdjustment}
      />,
    );

    expect(
      screen.queryByRole('button', {
        name: /ajustar stock de paracetamol 500mg/i,
      }),
    ).not.toBeInTheDocument();
  });
});
