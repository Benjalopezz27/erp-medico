import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { StockBulkLoadPage } from './StockBulkLoadPage';
import { renderWithProviders } from '@/test/test-utils';
import * as routerModule from '@tanstack/react-router';
import * as stockApi from '@/features/stock/api/stock.api';
import { StockBulkRowErrorCode, StockBulkFileErrorCode } from '@/features/stock/types/stock.types';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/features/stock/api/stock.api', () => ({
  postStockBulkPreviewApi: vi.fn(),
  postStockBulkConfirmApi: vi.fn(),
  downloadStockTemplateApi: vi.fn(),
}));

describe('StockBulkLoadPage Wizard Flow', () => {
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
      totalQuantityBase: 75.5,
    },
    rows: [
      {
        rowNumber: 2,
        internalCode: 'P0001',
        quantityBase: 50,
        product: {
          id: 'prod-1',
          internalCode: 'P0001',
          name: 'Amoxicilina 500mg',
          currentBaseStock: 10,
          projectedStock: 60,
          baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' },
        },
        errors: [],
        isValid: true,
      },
      {
        rowNumber: 3,
        internalCode: 'P0002',
        quantityBase: 25.5,
        product: {
          id: 'prod-2',
          internalCode: 'P0002',
          name: 'Ibuprofeno 600mg',
          currentBaseStock: 0,
          projectedStock: 25.5,
          baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' },
        },
        errors: [],
        isValid: true,
      },
    ],
  };

  it('renders Step 1 (Upload) initially with dropzone and template buttons', () => {
    renderWithProviders(<StockBulkLoadPage />);

    expect(screen.getByText('Carga Inicial de Inventario')).toBeInTheDocument();
    expect(screen.getByText('Cargar Archivo')).toBeInTheDocument();
    expect(screen.getByText(/plantilla excel/i)).toBeInTheDocument();
    expect(screen.getByText(/plantilla csv/i)).toBeInTheDocument();
    expect(screen.getByText(/arrastra y suelta tu archivo aquí/i)).toBeInTheDocument();
  });

  it('transitions from Step 1 to Step 2 (Preview) upon successful file upload', async () => {
    vi.mocked(stockApi.postStockBulkPreviewApi).mockResolvedValueOnce(validPreviewResponse as any);

    renderWithProviders(<StockBulkLoadPage />);

    const file = new File(['internalCode,quantityBase\nP0001,50\n'], 'carga.csv', {
      type: 'text/csv',
    });

    const dropzone = screen.getByLabelText(/zona de carga de archivo/i);
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText('Detalle de Filas (2)')).toBeInTheDocument();
    });

    expect(screen.getByText('Amoxicilina 500mg')).toBeInTheDocument();
    expect(screen.getByText('Ibuprofeno 600mg')).toBeInTheDocument();
    expect(screen.getByText('Paso 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente: confirmación/i })).toBeEnabled();
  });

  it('disables Siguiente button when preview has validation errors', async () => {
    const invalidPreviewResponse = {
      fileChecksum: 'file-checksum-123',
      contentChecksum: null,
      valid: false,
      summary: {
        totalRows: 1,
        validRows: 0,
        invalidRows: 1,
        totalQuantityBase: 0,
      },
      rows: [
        {
          rowNumber: 2,
          internalCode: 'UNKNOWN01',
          quantityBase: 10,
          product: null,
          errors: [
            {
              code: StockBulkRowErrorCode.PRODUCT_NOT_FOUND,
              message: 'El producto con código "UNKNOWN01" no existe en el catálogo.',
            },
          ],
          isValid: false,
        },
      ],
    };

    vi.mocked(stockApi.postStockBulkPreviewApi).mockResolvedValueOnce(
      invalidPreviewResponse as any,
    );

    renderWithProviders(<StockBulkLoadPage />);

    const file = new File(['internalCode,quantityBase\nUNKNOWN01,10\n'], 'carga.csv', {
      type: 'text/csv',
    });

    const dropzone = screen.getByLabelText(/zona de carga de archivo/i);
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText('El archivo contiene errores de validación')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /siguiente: confirmación/i })).toBeDisabled();
  });

  it('allows clicking Cambiar Archivo to return to Step 1', async () => {
    vi.mocked(stockApi.postStockBulkPreviewApi).mockResolvedValueOnce(validPreviewResponse as any);

    renderWithProviders(<StockBulkLoadPage />);

    const file = new File(['test'], 'carga.csv', { type: 'text/csv' });
    const dropzone = screen.getByLabelText(/zona de carga de archivo/i);
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Detalle de Filas (2)')).toBeInTheDocument();
    });

    const changeBtn = screen.getByRole('button', { name: /cambiar archivo/i });
    fireEvent.click(changeBtn);

    expect(screen.getByText(/arrastra y suelta tu archivo aquí/i)).toBeInTheDocument();
  });

  it('completes the full wizard flow: Step 1 -> Step 2 -> Step 3 -> Success', async () => {
    vi.mocked(stockApi.postStockBulkPreviewApi).mockResolvedValueOnce(validPreviewResponse as any);

    const confirmResponse = {
      batchId: 'batch-uuid-7777',
      fileChecksum: 'file-checksum-123',
      contentChecksum: 'content-checksum-123',
      rowCount: 2,
      movementCount: 2,
      totalQuantityBase: 75.5,
      confirmedAt: '2026-08-24T14:30:00.000Z',
    };

    vi.mocked(stockApi.postStockBulkConfirmApi).mockResolvedValueOnce(confirmResponse as any);

    renderWithProviders(<StockBulkLoadPage />);

    const file = new File(['valid'], 'carga.csv', { type: 'text/csv' });
    const dropzone = screen.getByLabelText(/zona de carga de archivo/i);
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    // Step 2
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /siguiente: confirmación/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /siguiente: confirmación/i }));

    // Step 3
    expect(screen.getByText('Confirmación de Carga Masiva')).toBeInTheDocument();
    expect(screen.getByText('2 productos')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /confirmar y aplicar carga/i });
    fireEvent.click(confirmBtn);

    // Terminal State: Success
    await waitFor(() => {
      expect(screen.getByText('¡Carga Inicial de Inventario Completada!')).toBeInTheDocument();
    });

    expect(screen.getByText('batch-uuid-7777')).toBeInTheDocument();
    expect(screen.getByText('2 (Tipo: AJUSTE_ENTRADA)')).toBeInTheDocument();

    const overviewBtn = screen.getByRole('button', { name: /ir al control de stock/i });
    fireEvent.click(overviewBtn);

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/stock' });
  });

  it('displays error banner when preview API fails', async () => {
    vi.mocked(stockApi.postStockBulkPreviewApi).mockRejectedValueOnce({
      response: {
        data: {
          code: StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
        },
      },
    });

    renderWithProviders(<StockBulkLoadPage />);

    const file = new File(['corrupt'], 'carga.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const dropzone = screen.getByLabelText(/zona de carga de archivo/i);
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(
          'El archivo seleccionado está vacío, corrupto o contiene fórmulas no permitidas.',
        ),
      ).toBeInTheDocument();
    });
  });
});
