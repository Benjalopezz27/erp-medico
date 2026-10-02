import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductBulkLoadPage } from './ProductBulkLoadPage';
import { renderWithProviders } from '@/test/test-utils';
import * as routerModule from '@tanstack/react-router';
import * as productBulkApi from '@/features/products/api/product-bulk-load.api';
import { ProductBulkLoadRowStatus, ProductTaxTreatment } from '@erp/shared-types';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/features/products/api/product-bulk-load.api', () => ({
  postProductBulkPreviewApi: vi.fn(),
  postProductBulkConfirmApi: vi.fn(),
  downloadProductTemplateApi: vi.fn(),
}));

describe('ProductBulkLoadPage Wizard Flow', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(routerModule.useNavigate).mockReturnValue(mockNavigate);
  });

  const validPreviewResponse = {
    fileChecksum: 'file-checksum-123',
    contentChecksum: 'content-checksum-123',
    valid: true,
    summary: {
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      totalInitialStock: 50,
    },
    rows: [
      {
        rowNumber: 2,
        status: ProductBulkLoadRowStatus.VALID,
        raw: {
          rowNumber: 2,
          rawName: 'Amoxicilina 500mg',
          rawCategory: 'Medicamentos',
          rawBaseUnit: 'cmp',
          rawCostNet: '100',
          rawActivePriceNet: '150',
          rawInitialStock: '50',
        },
        product: {
          name: 'Amoxicilina 500mg',
          categoryId: 'cat-1',
          categoryName: 'Medicamentos',
          baseUnitId: 'unit-1',
          baseUnitSymbol: 'cmp',
          costNet: 100,
          activePriceNet: 150,
          initialStock: 50,
          minStock: 10,
          taxTreatment: ProductTaxTreatment.GRAVADO,
          ivaPercentage: 21,
          conversions: [],
        },
        errors: [],
      },
      {
        rowNumber: 3,
        status: ProductBulkLoadRowStatus.VALID,
        raw: {
          rowNumber: 3,
          rawName: 'Ibuprofeno 400mg',
          rawCategory: 'Medicamentos',
          rawBaseUnit: 'cmp',
          rawCostNet: '50',
          rawActivePriceNet: '75',
          rawInitialStock: '0',
        },
        product: {
          name: 'Ibuprofeno 400mg',
          categoryId: 'cat-1',
          categoryName: 'Medicamentos',
          baseUnitId: 'unit-1',
          baseUnitSymbol: 'cmp',
          costNet: 50,
          activePriceNet: 75,
          initialStock: 0,
          minStock: 5,
          taxTreatment: ProductTaxTreatment.GRAVADO,
          ivaPercentage: 21,
          conversions: [],
        },
        errors: [],
      },
    ],
  };

  it('renders Step 1 (Upload) initially with dropzone and template buttons', () => {
    renderWithProviders(<ProductBulkLoadPage />);

    expect(screen.getByText('Carga Masiva de Productos')).toBeInTheDocument();
    expect(screen.getByText('Cargar Archivo')).toBeInTheDocument();
    expect(screen.getByText(/plantilla excel/i)).toBeInTheDocument();
    expect(screen.getByText(/plantilla csv/i)).toBeInTheDocument();
  });

  it('uploads valid file and advances to Step 2 (Preview)', async () => {
    vi.mocked(productBulkApi.postProductBulkPreviewApi).mockResolvedValueOnce(
      validPreviewResponse as any,
    );

    renderWithProviders(<ProductBulkLoadPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], 'catalogo.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Validación satisfactoria')).toBeInTheDocument();
    });

    expect(screen.getByText('Amoxicilina 500mg')).toBeInTheDocument();
    expect(screen.getByText('Ibuprofeno 400mg')).toBeInTheDocument();
    expect(screen.getByText(/Confirmar y Crear 2 Productos/i)).not.toBeDisabled();
  });

  it('disables confirm button when file contains validation errors', async () => {
    const invalidPreview = {
      fileChecksum: 'file-checksum-err',
      contentChecksum: null,
      valid: false,
      summary: {
        totalRows: 1,
        validRows: 0,
        invalidRows: 1,
        totalInitialStock: 0,
      },
      rows: [
        {
          rowNumber: 2,
          status: ProductBulkLoadRowStatus.INVALID,
          raw: {
            rowNumber: 2,
            rawName: 'Producto Invalido',
            rawCategory: 'NoExiste',
          },
          errors: [
            {
              field: 'category',
              code: 'CATEGORY_NOT_FOUND',
              message: 'La categoría NoExiste no existe',
            },
          ],
        },
      ],
    };

    vi.mocked(productBulkApi.postProductBulkPreviewApi).mockResolvedValueOnce(
      invalidPreview as any,
    );

    renderWithProviders(<ProductBulkLoadPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], 'invalid.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('El archivo contiene errores de validación')).toBeInTheDocument();
    });

    expect(screen.getByText('La categoría NoExiste no existe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar y Crear 0 Productos/i })).toBeDisabled();
  });

  it('confirms preview and transitions to Step 3 (Success)', async () => {
    vi.mocked(productBulkApi.postProductBulkPreviewApi).mockResolvedValueOnce(
      validPreviewResponse as any,
    );

    const confirmResponse = {
      batchId: 'batch-product-uuid-1',
      fileChecksum: 'file-checksum-123',
      contentChecksum: 'content-checksum-123',
      rowCount: 2,
      movementCount: 1,
      totalQuantityBase: 50,
      confirmedAt: '2026-10-02T12:00:00.000Z',
    };

    vi.mocked(productBulkApi.postProductBulkConfirmApi).mockResolvedValueOnce(
      confirmResponse as any,
    );

    renderWithProviders(<ProductBulkLoadPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], 'catalogo.xlsx', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Validación satisfactoria')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', {
      name: /Confirmar y Crear 2 Productos/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('¡Carga Masiva de Productos Completada!')).toBeInTheDocument();
    });

    expect(screen.getByText('batch-product-uuid-1')).toBeInTheDocument();
    expect(screen.getByText('2 productos')).toBeInTheDocument();

    const goToCatalogBtn = screen.getByRole('button', {
      name: /Ir al Catálogo de Productos/i,
    });
    fireEvent.click(goToCatalogBtn);
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/products' });
  });

  it('resets back to upload step when clicking reset button', async () => {
    vi.mocked(productBulkApi.postProductBulkPreviewApi).mockResolvedValueOnce(
      validPreviewResponse as any,
    );

    renderWithProviders(<ProductBulkLoadPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], 'catalogo.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Validación satisfactoria')).toBeInTheDocument();
    });

    const resetBtn = screen.getByRole('button', {
      name: /Cancelar y Subir Otro Archivo/i,
    });
    fireEvent.click(resetBtn);

    expect(screen.getByText('Cargar Archivo')).toBeInTheDocument();
    expect(screen.queryByText('Validación satisfactoria')).not.toBeInTheDocument();
  });
});
