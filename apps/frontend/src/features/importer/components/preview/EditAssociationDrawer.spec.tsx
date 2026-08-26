import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditAssociationDrawer } from './EditAssociationDrawer';
import type { IImporterErrorRow } from '../../types/importer.types';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock('../../../units/hooks/use-units-query', () => ({
  useUnitsQuery: () => ({
    data: [
      { id: 'unit-each', name: 'Unidad', symbol: 'UN' },
      { id: 'unit-box', name: 'Caja', symbol: 'CJA' },
      { id: 'unit-pack', name: 'Pack', symbol: 'PACK' },
    ],
    isLoading: false,
  }),
}));

vi.mock('../../../supplier-products/hooks/use-supplier-product-mutations', () => ({
  useUpdateSupplierProductMutation: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}));

const row: IImporterErrorRow = {
  rowNumber: 2,
  rawSku: 'MED-001',
  rawPurchaseUnit: 'Pack',
  association: {
    id: 'sp-1',
    supplierExternalCode: 'MED-001',
    purchaseUnit: { id: 'unit-box', name: 'Caja', symbol: 'CJA' },
    conversionFactorToBase: '20.0000',
    product: {
      id: 'product-1',
      internalCode: 'P001',
      name: 'Producto médico',
      baseUnit: { id: 'unit-each', name: 'Unidad', symbol: 'UN' },
    },
  },
  errors: [],
};

describe('EditAssociationDrawer', () => {
  beforeEach(() => {
    mocks.mutateAsync.mockReset().mockResolvedValue(undefined);
  });

  it('updates the purchase unit and factor before requesting a new preview', async () => {
    const onClose = vi.fn();
    const onUpdated = vi.fn().mockResolvedValue(undefined);

    render(
      <EditAssociationDrawer
        isOpen
        supplierId="supplier-1"
        supplierName="Droguería Médica"
        row={row}
        onClose={onClose}
        onUpdated={onUpdated}
      />,
    );

    fireEvent.change(screen.getByLabelText('Unidad de compra'), {
      target: { value: 'unit-pack' },
    });
    fireEvent.change(screen.getByLabelText('Factor de conversión a unidad base'), {
      target: { value: '12.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar y volver a validar/i }));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        purchaseUnitId: 'unit-pack',
        conversionFactorToBase: 12.5,
      });
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(onUpdated).toHaveBeenCalledWith('MED-001');
  });
});
