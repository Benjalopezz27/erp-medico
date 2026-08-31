import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductStatus, ProductTaxTreatment } from '@erp/shared-types';
import { ProductDeactivateModal } from './ProductDeactivateModal';

describe('ProductDeactivateModal', () => {
  const mockProduct = {
    id: 'p-1',
    internalCode: 'MED-001',
    name: 'Ibuprofeno 400mg',
    categoryId: 'c-1',
    baseUnitId: 'u-1',
    minStock: 10,
    activePriceNet: 100,
    taxTreatment: ProductTaxTreatment.GRAVADO,
    ivaPercentage: 21,
    status: ProductStatus.ACTIVE,
    createdAt: '',
    updatedAt: '',
  };

  it('renders confirmation text with product code and name', () => {
    render(
      <ProductDeactivateModal
        isOpen={true}
        onClose={vi.fn()}
        product={mockProduct}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Desactivar Producto' })).toBeInTheDocument();
    expect(screen.getByText('Ibuprofeno 400mg')).toBeInTheDocument();
    expect(screen.getByText('MED-001')).toBeInTheDocument();
  });

  it('triggers onConfirm when clicking confirm button', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn().mockResolvedValue(undefined);
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <ProductDeactivateModal
        isOpen={true}
        onClose={handleClose}
        product={mockProduct}
        onConfirm={handleConfirm}
        onSuccessNotice={handleSuccess}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /Desactivar Producto/i });
    await user.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledWith(mockProduct);
    expect(handleSuccess).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });
});
