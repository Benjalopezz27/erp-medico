import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductStatus } from '@erp/shared-types';
import { ProductForm } from './ProductForm';
import type { ICategory, IProduct, IUnit } from '../types/products.types';

describe('ProductForm', () => {
  const mockCategories: ICategory[] = [
    { id: 'c-1', name: 'Medicamentos', createdAt: '', updatedAt: '' },
  ];

  const mockUnits: IUnit[] = [
    { id: 'u-base', name: 'Unidad', symbol: 'u', createdAt: '', updatedAt: '' },
    { id: 'u-box', name: 'Caja', symbol: 'cj', createdAt: '', updatedAt: '' },
  ];

  const mockInitialProduct: IProduct = {
    id: 'prod-1',
    internalCode: 'MED-001',
    name: 'Ibuprofeno 400mg',
    description: 'Analgésico',
    categoryId: 'c-1',
    baseUnitId: 'u-base',
    minStock: 50,
    costNet: 1000,
    markupPercentage: 35.5,
    suggestedPriceNet: 1355,
    activePriceNet: 1355,
    status: ProductStatus.ACTIVE,
    conversions: [
      {
        id: 'conv-1',
        productId: 'prod-1',
        presentationUnitId: 'u-box',
        conversionFactor: 100,
        createdAt: '',
        updatedAt: '',
      },
    ],
    createdAt: '',
    updatedAt: '',
  };

  it('renders create mode with internalCode enabled and reactive suggested price', async () => {
    const user = userEvent.setup();
    render(
      <ProductForm
        mode="create"
        categories={mockCategories}
        units={mockUnits}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={false}
      />,
    );

    const internalCodeInput = screen.getByLabelText(/Código Interno/i);
    expect(internalCodeInput).toBeEnabled();

    const costInput = screen.getByLabelText(/Costo Neto/i);
    const markupInput = screen.getByLabelText(/Markup/i);

    await user.clear(costInput);
    await user.type(costInput, '2000');
    await user.clear(markupInput);
    await user.type(markupInput, '50');

    // 2000 * 1.5 = 3000.00
    await waitFor(() => {
      expect(screen.getByText(/3\.000,00/i)).toBeInTheDocument();
    });
  });

  it('locks internalCode and baseUnitId in edit mode when product has conversions', () => {
    render(
      <ProductForm
        mode="edit"
        initialProduct={mockInitialProduct}
        categories={mockCategories}
        units={mockUnits}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={false}
      />,
    );

    const internalCodeInput = screen.getByLabelText(/Código Interno/i);
    expect(internalCodeInput).toBeDisabled();

    const baseUnitSelect = screen.getByLabelText(/Unidad Base/i);
    expect(baseUnitSelect).toBeDisabled();
    expect(
      screen.getByText(/Para modificar la unidad base, primero elimina todas las conversiones/i),
    ).toBeInTheDocument();
  });

  it('triggers onCancel when clicking Cancelar', async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();

    render(
      <ProductForm
        mode="create"
        categories={mockCategories}
        units={mockUnits}
        onSubmit={vi.fn()}
        onCancel={handleCancel}
        isSubmitting={false}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    await user.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalled();
  });
});
