import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ColumnMappingForm } from './ColumnMappingForm';
import type { IImporterUploadResponse, ISupplierImportMapping } from '../../types/importer.types';

const mockUploadResponse: IImporterUploadResponse = {
  supplier: {
    id: 'sup-1',
    businessName: 'Droguería Médica Central',
    cuit: '30712345678',
  },
  fileName: 'lista.csv',
  fileSize: 1024,
  clientMimeType: 'text/csv',
  detectedFormat: 'csv',
  fileChecksum: 'abc123checksum',
  headerFingerprint: 'fingerprint123',
  headers: ['Cod Prov', 'Descripcion Prod', 'Costo Unit', 'Bulto', 'Unidad'],
  normalizedHeaders: ['cod prov', 'descripcion prod', 'costo unit', 'bulto', 'unidad'],
  totalRows: 10,
  totalColumns: 5,
  sampleRows: [
    { rowNumber: 2, cells: ['PROV-001', 'Ibuprofeno 400', '1250.00', '10', 'Caja'] },
    { rowNumber: 3, cells: ['PROV-002', 'Paracetamol 500', '980.50', null, 'Frasco'] },
  ],
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ColumnMappingForm', () => {
  it('renders all semantic fields and disables continue button when required fields are missing', () => {
    const onMappingChange = vi.fn();
    const onAppliedTemplateChange = vi.fn();
    const onBack = vi.fn();
    const onContinue = vi.fn();

    const emptyMapping: ISupplierImportMapping = {
      supplierSku: '',
      usualCostNet: '',
      supplierDescription: null,
      rawQuantity: null,
      purchaseUnit: null,
    };

    renderWithClient(
      <ColumnMappingForm
        supplierId="sup-1"
        uploadResponse={mockUploadResponse}
        mapping={emptyMapping}
        appliedTemplate={null}
        onMappingChange={onMappingChange}
        onAppliedTemplateChange={onAppliedTemplateChange}
        onBack={onBack}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByText('Paso 2: Mapeo de Columnas')).toBeInTheDocument();
    expect(screen.getByText('SKU de Proveedor')).toBeInTheDocument();
    expect(screen.getByText('Costo Neto Catálogo')).toBeInTheDocument();
    expect(screen.getByText('Descripción del Producto')).toBeInTheDocument();
    expect(screen.getByText('Cantidad del Bulto')).toBeInTheDocument();
    expect(screen.getByText('Unidad de Compra')).toBeInTheDocument();

    const continueBtn = screen.getByRole('button', { name: /Continuar a Vista Previa/i });
    expect(continueBtn).toBeDisabled();
  });

  it('enables continue button when required fields are mapped', () => {
    const onMappingChange = vi.fn();
    const onAppliedTemplateChange = vi.fn();
    const onBack = vi.fn();
    const onContinue = vi.fn();

    const validMapping: ISupplierImportMapping = {
      supplierSku: 'cod prov',
      usualCostNet: 'costo unit',
      supplierDescription: 'descripcion prod',
      rawQuantity: 'bulto',
      purchaseUnit: 'unidad',
    };

    renderWithClient(
      <ColumnMappingForm
        supplierId="sup-1"
        uploadResponse={mockUploadResponse}
        mapping={validMapping}
        appliedTemplate={null}
        onMappingChange={onMappingChange}
        onAppliedTemplateChange={onAppliedTemplateChange}
        onBack={onBack}
        onContinue={onContinue}
      />,
    );

    const continueBtn = screen.getByRole('button', { name: /Continuar a Vista Previa/i });
    expect(continueBtn).toBeEnabled();

    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('triggers onMappingChange when a dropdown changes', () => {
    const onMappingChange = vi.fn();
    const onAppliedTemplateChange = vi.fn();
    const onBack = vi.fn();
    const onContinue = vi.fn();

    const mapping: ISupplierImportMapping = {
      supplierSku: '',
      usualCostNet: '',
    };

    renderWithClient(
      <ColumnMappingForm
        supplierId="sup-1"
        uploadResponse={mockUploadResponse}
        mapping={mapping}
        appliedTemplate={null}
        onMappingChange={onMappingChange}
        onAppliedTemplateChange={onAppliedTemplateChange}
        onBack={onBack}
        onContinue={onContinue}
      />,
    );

    const select = screen.getByLabelText(/Mapeo para SKU de Proveedor/i);
    fireEvent.change(select, { target: { value: 'cod prov' } });

    expect(onMappingChange).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierSku: 'cod prov',
      }),
    );
  });

  it('unlinks template on clicking Desvincular', () => {
    const onMappingChange = vi.fn();
    const onAppliedTemplateChange = vi.fn();
    const onBack = vi.fn();
    const onContinue = vi.fn();

    const mapping: ISupplierImportMapping = {
      supplierSku: 'cod prov',
      usualCostNet: 'costo unit',
    };

    renderWithClient(
      <ColumnMappingForm
        supplierId="sup-1"
        uploadResponse={mockUploadResponse}
        mapping={mapping}
        appliedTemplate={{
          id: 'template-1',
          name: 'Plantilla Guardada',
          headerFingerprint: 'fingerprint123',
          mapping,
        }}
        onMappingChange={onMappingChange}
        onAppliedTemplateChange={onAppliedTemplateChange}
        onBack={onBack}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByText('Plantilla Guardada')).toBeInTheDocument();
    const unlinkBtn = screen.getByRole('button', { name: /Desvincular/i });
    fireEvent.click(unlinkBtn);

    expect(onAppliedTemplateChange).toHaveBeenCalledWith(null);
  });
});
