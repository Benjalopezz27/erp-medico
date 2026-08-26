import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmStepContainer } from './ConfirmStepContainer';
import * as importerApi from '../../api/importer.api';
import type {
  IImporterPreviewResponse,
  IImporterSupplierSummary,
  ISupplierImportMapping,
  IImporterConfirmResponse,
} from '../../types/importer.types';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

const mockSupplier: IImporterSupplierSummary = {
  id: 'supp-1',
  businessName: 'Droguería Central',
  cuit: '30712345678',
};

const mockFile = new File(['content'], 'test.csv', { type: 'text/csv' });

const mockMapping: ISupplierImportMapping = {
  supplierSku: 'cod prov',
  usualCostNet: 'costo',
  supplierDescription: 'descripcion',
  rawQuantity: 'bulto',
  purchaseUnit: 'unidad',
};

const mockPreview: IImporterPreviewResponse = {
  supplier: mockSupplier,
  fileChecksum: 'a'.repeat(64),
  headerFingerprint: 'b'.repeat(64),
  mappingChecksum: 'c'.repeat(64),
  contentChecksum: 'd'.repeat(64),
  summary: {
    totalRows: 1,
    validRows: 1,
    unknownRows: 0,
    errorRows: 0,
    canContinue: true,
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
  unknownRows: [],
  errorRows: [],
};

const mockConfirmResponse: IImporterConfirmResponse = {
  batchId: 'batch-uuid-123',
  supplier: mockSupplier,
  fileName: 'test.csv',
  fileChecksum: 'a'.repeat(64),
  mappingChecksum: 'c'.repeat(64),
  contentChecksum: 'd'.repeat(64),
  totalRows: 2,
  appliedRows: 2,
  changedRows: 1,
  unchangedRows: 1,
  confirmedAt: '2026-08-26T14:00:00.000Z',
  templateId: null,
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ConfirmStepContainer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders preflight summary cards and amber warning notice', () => {
    renderWithClient(
      <ConfirmStepContainer
        supplier={mockSupplier}
        file={mockFile}
        mapping={mockMapping}
        template={null}
        preview={mockPreview}
        onBack={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText('Paso 4: Confirmación Transaccional')).toBeDefined();
    expect(screen.getByText('Droguería Central')).toBeDefined();
    expect(screen.getByText('test.csv')).toBeDefined();
    expect(screen.getByText('Mapeo Manual')).toBeDefined();
    expect(screen.getByText('1 de 1 listas')).toBeDefined();
    expect(
      screen.getByText(/Esta acción actualizará atómicamente los costos habituales/),
    ).toBeDefined();
  });

  it('opens confirmation modal when clicking Confirmar Importación and confirms successfully', async () => {
    vi.spyOn(importerApi, 'postImporterConfirmApi').mockResolvedValue(mockConfirmResponse);

    renderWithClient(
      <ConfirmStepContainer
        supplier={mockSupplier}
        file={mockFile}
        mapping={mockMapping}
        template={null}
        preview={mockPreview}
        onBack={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    // Click confirm button to open dialog
    const confirmBtn = screen.getByRole('button', {
      name: /Confirmar Importación/i,
    });
    fireEvent.click(confirmBtn);

    // Modal dialog appears
    expect(screen.getByText('¿Confirmar importación de precios?')).toBeDefined();

    // Click modal confirm button
    const modalConfirmBtn = screen.getByRole('button', {
      name: /Sí, Confirmar/i,
    });
    fireEvent.click(modalConfirmBtn);

    await waitFor(() => {
      expect(screen.getByText('Importación Confirmada con Éxito')).toBeDefined();
    });

    expect(screen.getByText('batch-uuid-123')).toBeDefined();
    expect(screen.getByText('Precios/Desc. Modificados')).toBeDefined();
  });

  it('calls onBack when clicking Volver a Vista Previa', () => {
    const onBackMock = vi.fn();
    renderWithClient(
      <ConfirmStepContainer
        supplier={mockSupplier}
        file={mockFile}
        mapping={mockMapping}
        template={null}
        preview={mockPreview}
        onBack={onBackMock}
        onReset={vi.fn()}
      />,
    );

    const backBtn = screen.getByRole('button', {
      name: /Volver a Vista Previa/i,
    });
    fireEvent.click(backBtn);

    expect(onBackMock).toHaveBeenCalledTimes(1);
  });
});
