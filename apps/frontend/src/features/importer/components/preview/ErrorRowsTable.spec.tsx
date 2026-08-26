import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImporterRowErrorCode } from '@erp/shared-types';
import { ErrorRowsTable } from './ErrorRowsTable';
import type { IImporterErrorRow } from '../../types/importer.types';

const association = {
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
};

describe('ErrorRowsTable', () => {
  it('allows editing an existing association when the unit is incompatible', () => {
    const onEditAssociation = vi.fn();
    const row: IImporterErrorRow = {
      rowNumber: 2,
      rawSku: 'MED-001',
      rawCost: '100',
      rawPurchaseUnit: 'Pack',
      association,
      errors: [
        {
          rowNumber: 2,
          field: 'purchaseUnit',
          code: ImporterRowErrorCode.ROW_UNIT_INCOMPATIBLE,
          message: 'La unidad del archivo no coincide con la asociación.',
        },
      ],
    };

    render(<ErrorRowsTable rows={[row]} onEditAssociation={onEditAssociation} />);
    fireEvent.click(screen.getByRole('button', { name: /corregir asociación/i }));

    expect(onEditAssociation).toHaveBeenCalledWith(row);
  });

  it('does not offer association editing for errors unrelated to the unit', () => {
    const row: IImporterErrorRow = {
      rowNumber: 3,
      rawSku: 'MED-002',
      rawCost: '-1',
      association,
      errors: [
        {
          rowNumber: 3,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_NEGATIVE,
          message: 'El costo no puede ser negativo.',
        },
      ],
    };

    render(<ErrorRowsTable rows={[row]} />);

    expect(screen.queryByRole('button', { name: /corregir asociación/i })).not.toBeInTheDocument();
  });
});
