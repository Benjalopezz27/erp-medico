import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { ArcaStatus, PdfArtifactStatus, type IFiscalDocument } from '@erp/shared-types';
import { renderWithProviders } from '@/test/test-utils';
import * as api from '../api/sales.api';
import { FiscalDocumentActions } from './FiscalDocumentActions';

vi.mock('../api/sales.api');

function makeDocument(overrides: Partial<IFiscalDocument> = {}): IFiscalDocument {
  return {
    id: 'doc-1',
    saleId: 'sale-1',
    documentType: 'FACTURA_B' as IFiscalDocument['documentType'],
    pointOfSale: 3,
    documentNumber: 102,
    arcaStatus: ArcaStatus.EMITIDO,
    cae: '73000012345678',
    caeExpirationDate: '2026-09-03',
    pdfStatus: PdfArtifactStatus.DISPONIBLE,
    qrAvailable: true,
    ...overrides,
  };
}

describe('FiscalDocumentActions', () => {
  beforeEach(() => {
    vi.mocked(api.downloadFiscalDocumentPdfApi).mockResolvedValue(new Blob(['%PDF-1.7']));
    vi.mocked(api.fetchFiscalDocumentQrApi).mockResolvedValue(new Blob(['fake-png']));
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders nothing when there is no fiscal document', () => {
    const { container } = renderWithProviders(
      <FiscalDocumentActions saleId="sale-1" document={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the comprobante is not EMITIDO yet', () => {
    const { container } = renderWithProviders(
      <FiscalDocumentActions
        saleId="sale-1"
        document={makeDocument({ arcaStatus: ArcaStatus.PENDIENTE_FACTURACION })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('disables actions and shows a generating message while the artifact is pending', () => {
    renderWithProviders(
      <FiscalDocumentActions
        saleId="sale-1"
        document={makeDocument({ pdfStatus: PdfArtifactStatus.PENDIENTE })}
      />,
    );
    expect(screen.getByRole('button', { name: /Descargar PDF/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Ver QR/i })).toBeDisabled();
    expect(screen.getByText(/Generando documento/i)).toBeInTheDocument();
  });

  it('enables both actions and downloads the PDF when the artifact is available', async () => {
    const { user } = renderWithProviders(
      <FiscalDocumentActions saleId="sale-1" document={makeDocument()} />,
    );
    const downloadButton = screen.getByRole('button', { name: /Descargar PDF/i });
    expect(downloadButton).toBeEnabled();
    await user.click(downloadButton);
    await waitFor(() =>
      expect(api.downloadFiscalDocumentPdfApi).toHaveBeenCalledWith('sale-1', undefined),
    );
  });

  it('shows a retry affordance without an error badge when the artifact failed', () => {
    renderWithProviders(
      <FiscalDocumentActions
        saleId="sale-1"
        document={makeDocument({ pdfStatus: PdfArtifactStatus.ERROR })}
      />,
    );
    expect(screen.getByRole('button', { name: /Reintentar descarga de PDF/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Ver QR/i })).toBeDisabled();
    expect(screen.getByText(/No se pudo generar el documento/i)).toBeInTheDocument();
  });

  it('opens an accessible QR modal, fetches the QR and closes on Escape', async () => {
    const { user } = renderWithProviders(
      <FiscalDocumentActions saleId="sale-1" document={makeDocument()} />,
    );
    await user.click(screen.getByRole('button', { name: /Ver QR/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    await waitFor(() =>
      expect(api.fetchFiscalDocumentQrApi).toHaveBeenCalledWith('sale-1', undefined),
    );
    expect(await screen.findByAltText(/QR fiscal del comprobante/i)).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('scopes both actions to the Nota de Crédito when a returnId is provided', async () => {
    const { user } = renderWithProviders(
      <FiscalDocumentActions saleId="sale-1" returnId="return-1" document={makeDocument()} />,
    );
    await user.click(screen.getByRole('button', { name: /Descargar PDF/i }));
    await waitFor(() =>
      expect(api.downloadFiscalDocumentPdfApi).toHaveBeenCalledWith('sale-1', 'return-1'),
    );
  });
});
