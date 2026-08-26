import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PreviewStepContainer } from './PreviewStepContainer';
import { ImporterRowErrorCode } from '@erp/shared-types';
import type { IImporterPreviewResponse } from '../../types/importer.types';

const mockPreviewResponse: IImporterPreviewResponse = {
  supplier: {
    id: 'supp-1',
    businessName: 'Droguería Médica',
    cuit: '30712345678',
  },
  fileChecksum: 'a'.repeat(64),
  headerFingerprint: 'b'.repeat(64),
  mappingChecksum: 'c'.repeat(64),
  contentChecksum: 'd'.repeat(64),
  summary: {
    totalRows: 3,
    validRows: 1,
    unknownRows: 1,
    errorRows: 1,
    canContinue: false,
  },
  validRows: [
    {
      rowNumber: 2,
      rawSku: 'MED-001',
      normalizedSku: 'MED-001',
      supplierDescription: 'Ibuprofeno 400mg',
      usualCostNet: '1250.5000',
      rawQuantity: '10',
      quantityCanonical: '10.0000',
      rawPurchaseUnit: 'Caja',
      normalizedUnit: 'caja',
      supplierProduct: {
        id: 'sp-1',
        isPrimarySupplier: true,
        purchaseUnit: { id: 'u-1', name: 'Caja', symbol: 'CJA' },
        conversionFactorToBase: '100.0000',
      },
      product: {
        id: 'p-1',
        internalCode: 'P0001',
        name: 'Ibuprofeno 400mg',
        baseUnit: { id: 'u-base', name: 'Comprimido', symbol: 'COMP' },
      },
    },
  ],
  unknownRows: [
    {
      rowNumber: 3,
      rawSku: 'PAR-500',
      normalizedSku: 'PAR-500',
      supplierDescription: 'Paracetamol 500mg',
      usualCostNet: '890.0000',
      rawQuantity: '50',
      quantityCanonical: '50.0000',
      rawPurchaseUnit: 'Frasco',
      normalizedUnit: 'frasco',
    },
  ],
  errorRows: [
    {
      rowNumber: 4,
      rawSku: 'DIP-ERR',
      normalizedSku: 'DIP-ERR',
      rawCost: '-50.00',
      rawDescription: 'Dipirona Invalida',
      rawQuantity: '0',
      rawPurchaseUnit: 'Caja',
      errors: [
        {
          rowNumber: 4,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_NEGATIVE,
          message: 'El costo neto no puede ser negativo.',
          rawValue: '-50.00',
        },
      ],
    },
  ],
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PreviewStepContainer', () => {
  it('renders summary cards, tab navigation, and disables continue button when canContinue is false', () => {
    const onBack = vi.fn();
    const onContinue = vi.fn();
    const onRefreshPreview = vi.fn();

    renderWithClient(
      <PreviewStepContainer
        supplierId="supp-1"
        supplierName="Droguería Médica"
        previewData={mockPreviewResponse}
        isLoading={false}
        error={null}
        onBack={onBack}
        onContinue={onContinue}
        onRefreshPreview={onRefreshPreview}
      />,
    );

    // Summary cards
    expect(screen.getByText('Total de Filas')).toBeInTheDocument();
    expect(screen.getByText('Filas Válidas')).toBeInTheDocument();
    expect(screen.getByText('SKUs Desconocidos')).toBeInTheDocument();
    expect(screen.getByText('Filas con Error')).toBeInTheDocument();

    // Verify error tab is initially selected since errorRows > 0
    expect(screen.getByText('DIP-ERR')).toBeInTheDocument();
    expect(screen.getByText('El costo neto no puede ser negativo.')).toBeInTheDocument();

    // Verify Continue button is disabled
    const continueBtn = screen.getByRole('button', {
      name: /continuar a confirmación/i,
    });
    expect(continueBtn).toBeDisabled();

    // Switch to Valid rows tab
    fireEvent.click(screen.getByRole('button', { name: /válidas \(1\)/i }));
    expect(screen.getByText('MED-001')).toBeInTheDocument();
    expect(screen.getByText(/P0001/)).toBeInTheDocument();

    // Switch to Unknown rows tab
    fireEvent.click(screen.getByRole('button', { name: /skus desconocidos \(1\)/i }));
    expect(screen.getByText('PAR-500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /asociar/i })).toBeInTheDocument();

    // Click back button
    fireEvent.click(screen.getByRole('button', { name: /volver al mapeo/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('enables continue button when all rows are valid and canContinue is true', () => {
    const validOnlyPreview: IImporterPreviewResponse = {
      ...mockPreviewResponse,
      summary: {
        totalRows: 1,
        validRows: 1,
        unknownRows: 0,
        errorRows: 0,
        canContinue: true,
      },
      unknownRows: [],
      errorRows: [],
    };

    const onContinue = vi.fn();

    renderWithClient(
      <PreviewStepContainer
        supplierId="supp-1"
        supplierName="Droguería Médica"
        previewData={validOnlyPreview}
        isLoading={false}
        error={null}
        onBack={vi.fn()}
        onContinue={onContinue}
        onRefreshPreview={vi.fn()}
      />,
    );

    const continueBtn = screen.getByRole('button', {
      name: /continuar a confirmación/i,
    });
    expect(continueBtn).toBeEnabled();
    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalledWith(validOnlyPreview);
  });
});
