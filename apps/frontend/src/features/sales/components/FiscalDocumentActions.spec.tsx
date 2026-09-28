import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import {
  ArcaStatus,
  FiscalDocumentType,
  PdfArtifactStatus,
  type IFiscalDocument,
  type IFiscalDocumentPreview,
} from '@erp/shared-types';
import { renderWithProviders } from '@/test/test-utils';
import * as api from '../api/sales.api';
import { FiscalDocumentActions } from './FiscalDocumentActions';

vi.mock('../api/sales.api');

function makePreview(overrides: Partial<IFiscalDocumentPreview> = {}): IFiscalDocumentPreview {
  return {
    saleId: 'sale-1',
    isEmitted: false,
    invoiceType: FiscalDocumentType.FACTURA_B,
    pointOfSale: null,
    documentNumber: null,
    cae: null,
    receiver: { businessName: 'Consumidor Final', documentType: 99, documentNumber: '0' },
    items: [],
    totals: {
      totalNet: '100.00',
      taxableNet: '100.00',
      exemptAmount: '0.00',
      nonTaxedAmount: '0.00',
      ivaTotal: '21.00',
      totalGross: '121.00',
    },
    ...overrides,
  };
}

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

  it('renders nothing while the comprobante is not EMITIDO yet, when scoped to a return', () => {
    const { container } = renderWithProviders(
      <FiscalDocumentActions
        saleId="sale-1"
        returnId="return-1"
        document={makeDocument({ arcaStatus: ArcaStatus.PENDIENTE_FACTURACION })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the preview modal on "Emitir factura" and emits only after confirming', async () => {
    vi.mocked(api.getFiscalDocumentPreviewApi).mockResolvedValue(makePreview());
    vi.mocked(api.emitFiscalDocumentApi).mockResolvedValue({
      fiscalDocumentId: 'doc-1',
      arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
      jobId: 'wsfe-emit-doc-1',
      created: true,
    });

    const { user } = renderWithProviders(
      <FiscalDocumentActions
        saleId="sale-1"
        document={makeDocument({ arcaStatus: ArcaStatus.PENDIENTE_FACTURACION })}
      />,
    );

    expect(api.getFiscalDocumentPreviewApi).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Emitir factura/i }));

    expect(await screen.findByText(/Factura B a Consumidor Final/i)).toBeInTheDocument();
    expect(screen.getByText(/Total: 121\.00/)).toBeInTheDocument();
    expect(api.emitFiscalDocumentApi).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Confirmar emisión/i }));
    await waitFor(() => expect(api.emitFiscalDocumentApi).toHaveBeenCalledWith('sale-1'));
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
