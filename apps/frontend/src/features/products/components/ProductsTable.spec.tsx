import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductStatus } from '@erp/shared-types';
import { ProductsTable } from './ProductsTable';
import type { IProduct, IProductSellerView } from '../types/products.types';

describe('ProductsTable', () => {
  const mockAdminProduct: IProduct = {
    id: 'prod-1',
    internalCode: 'MED-001',
    name: 'Ibuprofeno 400mg',
    description: 'Analgésico',
    categoryId: 'c-1',
    baseUnitId: 'u-1',
    minStock: 50,
    costNet: 1000,
    markupPercentage: 35.5,
    suggestedPriceNet: 1355,
    activePriceNet: 1355,
    status: ProductStatus.ACTIVE,
    category: { id: 'c-1', name: 'Medicamentos', createdAt: '', updatedAt: '' },
    baseUnit: { id: 'u-1', name: 'Unidad', symbol: 'u', createdAt: '', updatedAt: '' },
    conversions: [],
    createdAt: '',
    updatedAt: '',
  };

  const mockSellerProduct: IProductSellerView = {
    id: 'prod-2',
    internalCode: 'MED-002',
    name: 'Paracetamol 500mg',
    categoryId: 'c-1',
    baseUnitId: 'u-1',
    minStock: 20,
    activePriceNet: 800,
    status: ProductStatus.INACTIVE,
    category: { id: 'c-1', name: 'Medicamentos', createdAt: '', updatedAt: '' },
    baseUnit: { id: 'u-1', name: 'Unidad', symbol: 'u', createdAt: '', updatedAt: '' },
    conversions: [],
    createdAt: '',
    updatedAt: '',
  };

  it('renders products with all columns for Administrator', () => {
    render(
      <ProductsTable
        products={[mockAdminProduct]}
        isLoading={false}
        isAdmin={true}
        onEdit={vi.fn()}
        onDeactivate={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );

    expect(screen.getByText('MED-001')).toBeInTheDocument();
    expect(screen.getByText('Ibuprofeno 400mg')).toBeInTheDocument();
    expect(screen.getByText('Medicamentos')).toBeInTheDocument();
    expect(screen.getByText('Costo Neto')).toBeInTheDocument();
    expect(screen.getByText('Markup')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
    expect(screen.getByLabelText('Editar Ibuprofeno 400mg')).toBeInTheDocument();
    expect(screen.getByLabelText('Desactivar Ibuprofeno 400mg')).toBeInTheDocument();
  });

  it('strictly omits cost, markup, and actions columns for Seller', () => {
    render(
      <ProductsTable
        products={[mockSellerProduct]}
        isLoading={false}
        isAdmin={false}
        onEdit={vi.fn()}
        onDeactivate={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );

    expect(screen.getByText('MED-002')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    expect(screen.queryByText('Costo Neto')).not.toBeInTheDocument();
    expect(screen.queryByText('Markup')).not.toBeInTheDocument();
    expect(screen.queryByText('Acciones')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Editar Paracetamol 500mg')).not.toBeInTheDocument();
  });

  it('shows reactivate button for inactive products when Admin', async () => {
    const user = userEvent.setup();
    const handleReactivate = vi.fn();

    render(
      <ProductsTable
        products={[{ ...mockAdminProduct, status: ProductStatus.INACTIVE }]}
        isLoading={false}
        isAdmin={true}
        onEdit={vi.fn()}
        onDeactivate={vi.fn()}
        onReactivate={handleReactivate}
      />,
    );

    const reactivateBtn = screen.getByLabelText('Reactivar Ibuprofeno 400mg');
    expect(reactivateBtn).toBeInTheDocument();

    await user.click(reactivateBtn);
    expect(handleReactivate).toHaveBeenCalled();
  });

  it('renders empty state when products array is empty', () => {
    render(
      <ProductsTable
        products={[]}
        isLoading={false}
        isAdmin={true}
        onEdit={vi.fn()}
        onDeactivate={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );

    expect(screen.getByText('No se encontraron productos')).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    render(
      <ProductsTable
        products={[]}
        isLoading={true}
        isAdmin={true}
        onEdit={vi.fn()}
        onDeactivate={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );

    expect(screen.getByText('Cargando catálogo de productos...')).toBeInTheDocument();
  });
});
